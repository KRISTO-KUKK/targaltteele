import { createOpenAIClient, getModel } from "./openaiClient";
import { mockFreeText, mockProfile, mockTest } from "./mock";
import { normalizeScores, taxonomyPrompt } from "./taxonomy";

const fallbackMessage = "AI analüüs ei olnud hetkel saadaval. Kasutame demoanalüüsi, et saaksid prototüüpi edasi vaadata.";
const quotaMessage =
  "OpenAI API võti on olemas, aga konto kvoot või billing ei luba hetkel päringut teha. Kasutame demoanalüüsi, et prototüüpi saaks edasi vaadata.";

type UserContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

function parseJson(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(json);
}

async function askJson(system: string, user: UserContent) {
  const client = createOpenAIClient();
  if (!client) throw new Error("Missing OPENAI_API_KEY");

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user as any },
    ],
    response_format: { type: "json_object" },
  });

  return parseJson(response.choices[0]?.message?.content ?? "{}");
}

async function withTimeout<T>(task: Promise<T>, ms = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI request timed out")), ms);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function fallbackFor(error: unknown) {
  const maybeError = error as { code?: string; status?: number; message?: string };
  if (maybeError.code === "insufficient_quota" || maybeError.status === 429 || maybeError.message?.includes("quota")) {
    return quotaMessage;
  }
  return fallbackMessage;
}

function normalizeCombinedAnalysis(result: any) {
  return {
    tags: Array.isArray(result.tags) ? result.tags : [],
    goals: Array.isArray(result.goals) ? result.goals : [],
    concerns: Array.isArray(result.concerns) ? result.concerns : [],
    interestScores: normalizeScores(result.interestScores, "interest"),
    skillScores: normalizeScores(result.skillScores, "skill"),
    summary: typeof result.summary === "string" ? result.summary : "Sisendi põhjal tekkisid esimesed ettevaatlikud huvi- ja oskusesignaalid.",
  };
}

function normalizeTestAnalysis(result: any, kind: "interests" | "skills") {
  const scoreKind = kind === "interests" ? "interest" : "skill";
  const scores = normalizeScores(result.scores, scoreKind);
  return {
    scores,
    tags: Array.from(new Set(scores.flatMap((score: any) => score.tags))),
    summary: typeof result.summary === "string" ? result.summary : "Testi tekst teisendati ettevaatlikeks profiilisignaalideks.",
  };
}

const baseInstruction =
  "Analüüsi kasutaja minukarjäär.ee testi tulemust. Ära diagnoosi. Ära tee lõplikke järeldusi. Tõlgenda tulemust karjääri- ja õpitee planeerimise abivahendina. Vasta ainult JSON-ina. Tekstid peavad olema eesti keeles. Kasuta 0-100 skoore ainult indikatiivse tugevusena.";

const interestShape =
  '{"scores":[{"key":"sotsiaalne","label":"Sotsiaalne huvi","score":86,"tags":["inimesed"]}],"tags":["inimesed"],"summary":"Lühike kokkuvõte."}';
const skillShape =
  '{"scores":[{"key":"suhtlemine_koostoo","label":"Suhtlemine ja koostöö","score":84,"tags":["suhtlemine"]}],"tags":["suhtlemine"],"summary":"Lühike kokkuvõte."}';
const combinedShape =
  '{"tags":["tervis"],"goals":["leida sobiv suund"],"concerns":["vajab rohkem infot"],"interestScores":[{"key":"sotsiaalne","label":"Sotsiaalne huvi","score":70,"tags":["inimesed"]}],"skillScores":[{"key":"analuus_info","label":"Analüüs ja info mõtestamine","score":68,"tags":["analüüs"]}],"summary":"Lühike kokkuvõte."}';

export async function analyzeTest(kind: "interests" | "skills", text: string) {
  if (!text.trim()) return mockTest(kind, "Teksti ei olnud piisavalt. Kasutasime demoandmeid, et prototüübi teekonda saaks edasi vaadata.");
  return analyzeTestContent(kind, text);
}

export async function analyzeImageTest(kind: "interests" | "skills", text: string, mimeType: string, base64: string) {
  const prompt =
    "Loe pildilt välja karjääritesti tulemus ja teisenda see struktureeritud JSON-iks. Kui tulemust pole võimalik kindlalt lugeda, tagasta JSON väljadega, aga lisa summary'sse, et tulemus vajab käsitsi ülevaatamist.";

  return analyzeTestContent(kind, [
    { type: "text", text: [prompt, text].filter(Boolean).join("\n\n") },
    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
  ]);
}

async function analyzeTestContent(kind: "interests" | "skills", content: UserContent) {
  try {
    const shape = kind === "interests" ? interestShape : skillShape;
    const taxonomy = kind === "interests" ? taxonomyPrompt("interest") : taxonomyPrompt("skill");
    const result = await withTimeout(
      askJson(
        `${baseInstruction} ${taxonomy} Kui tekstis on mitu erinevat sõnastust, paiguta need kõige lähemasse olemasolevasse kategooriasse. Ära loo uusi key väärtusi. Tagasta täpselt kujuga ${shape}`,
        content,
      ),
    );
    return { ...normalizeTestAnalysis(result, kind), source: "ai" };
  } catch (error) {
    return mockTest(kind, fallbackFor(error));
  }
}

export async function analyzeFreeText(text: string) {
  if (!text.trim()) return mockFreeText(text);
  try {
    const result = await withTimeout(
      askJson(
        `Analüüsi õpilase vaba teksti karjääri- ja õpitee planeerimise vaatest. Ära diagnoosi. Ära tee lõplikke järeldusi. Lisaks kokkuvõttele tuleta tekstist indikatiivsed huvid ja oskused, et süsteem saaks soovitusi teha ka siis, kui teste ei täideta. ${taxonomyPrompt("combined")} Paiguta kasutaja tekst alati kõige lähemasse olemasolevasse kategooriasse ja ära loo uusi key väärtusi. Kasuta 0-100 skoore ettevaatliku signaalina, mitte testitulemusena. Vasta ainult JSON-ina kujuga ${combinedShape}. Eesti keeles.`,
        text,
      ),
    );
    return { ...normalizeCombinedAnalysis(result), source: "ai" };
  } catch (error) {
    return mockFreeText(text, fallbackFor(error));
  }
}

export async function analyzeProfileSummary(payload: unknown) {
  try {
    const result = await withTimeout(
      askJson(
        `Koosta kasutajale suunatud AI peegeldus sellest, kuidas süsteem tema huvidest, oskustest, tekstist, valdkonnavalikust ja testitulemustest aru sai.
Ära diagnoosi, ära anna lõplikku hinnangut ja ära väida, et tead kasutajat kindlalt. Kirjuta soojalt ja täpselt stiilis "Minu praegune arusaam sinust on...".
Kui payload sisaldab userCorrection välja, võta seda parandust kõige olulisema sisendina, korrigeeri varasemat arusaama ja ära vaidle kasutajaga.
Tee summary keskmise pikkusega: 3 sisukat lõiku, igas lõigus 2-3 lauset, kokku umbes 130-190 sõna. Esimene lõik räägib üldisest muljest inimesena. Teine seob kokku tugevamad olemasolevad huvi- ja oskusekategooriad ning teemahuvid. Kolmas kirjeldab sobivat õppimis- või töökeskkonda ja ütleb, millised oletused vajavad kasutaja kinnitust.
Kui kasutaja tekstist või valdkondadest paistavad välja konkreetsed teemad nagu IT, bioloogia, loomad, inimesed, ettevõtlus, loovus, tehnika, tervis või loodus, nimeta neid ettevaatlikult. Kui neid ei paista, ära leiuta.
Tõsta summary sees 4-7 olulisemat märksõna või fraasi Markdowni boldiga esile, näiteks **uuriv huvi**, **IT**, **bioloogia**, **analüüs**. Ära tee terveid lauseid boldiks.
Kirjuta nii, et kasutaja tunneks, et süsteem päriselt koondas tema sisendi enne soovituste avamist, aga hoia tekst kompaktne. Väldi üldist karjäärinõustamise juttu ja ära korda ainult skoore.
Kasuta ainult ettevaatlikke sõnastusi: "paistab", "võib viidata", "tasub uurida". Võimalikud ametid ja edasiõppimise suunad pane eraldi massiividesse ning hoia need lühikesed.
Vasta ainult JSON-ina kujuga {"summary":"","possibleJobDirections":[],"possibleEducationDirections":[]}. Eesti keeles.`,
        JSON.stringify(payload),
      ),
    );
    return { ...result, source: "ai" };
  } catch (error) {
    return mockProfile(fallbackFor(error));
  }
}
