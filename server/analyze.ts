import { createOpenAIClient, getModel } from "./openaiClient";
import { mockFreeText, mockProfile, mockTest } from "./mock";
import { normalizeScores, taxonomyPrompt } from "./taxonomy";
import { parseTestText } from "./parseTestText";

const fallbackMessage = "AI analüüs ei olnud hetkel saadaval. Näidisandmeid ei kasutata; jätkame ainult sinu sisestatud andmetega.";
const quotaMessage =
  "OpenAI API võti on olemas, aga konto kvoot või billing ei luba hetkel päringut teha. Näidisandmeid ei kasutata; jätkame ainult sinu sisestatud andmetega.";

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
  console.log("[api] analyze-test:start", { at: new Date().toISOString(), kind, textLength: text.length });
  if (!text.trim()) return mockTest(kind, "Teksti ei olnud piisavalt. Näidisandmeid ei kasutata; palun kleebi testi protsendid tekstina või laadi loetav fail.");

  const deterministic = parseTestText(kind, text);
  console.log("[api] analyze-test:parsed", { at: new Date().toISOString(), kind, matchedCount: deterministic.matchedCount });
  if (deterministic.matchedCount >= 4) {
    const summary =
      kind === "interests"
        ? "Lugesime tekstist välja huvide protsendid ja kandsime need profiilile, et soovituste arvutus saaks neid kohe kasutada."
        : "Lugesime tekstist välja oskuste protsendid ja kandsime need profiilile, et soovituste arvutus saaks neid kohe kasutada.";
    return {
      scores: deterministic.scores,
      tags: Array.from(new Set(deterministic.scores.flatMap((score) => score.tags))),
      summary,
      source: "ai" as const,
      message: deterministic.matchedCount < 6 ? "Mõnda kategooriat tekstist ei leitud, kasutame leitud osa." : undefined,
    };
  }

  const otherKind = kind === "interests" ? "skills" : "interests";
  const wrongTest = parseTestText(otherKind, text);
  console.log("[api] analyze-test:wrong-kind-check", { at: new Date().toISOString(), kind, otherKind, matchedCount: wrongTest.matchedCount });
  if (wrongTest.matchedCount >= 4) {
    const expected = kind === "interests" ? "huvide" : "oskuste";
    const received = kind === "interests" ? "oskuste" : "huvide";
    return {
      scores: [],
      tags: [],
      summary: `Sisestatud tekst paistab olevat ${received} testi tulemus, mitte ${expected} testi tulemus.`,
      source: "mock" as const,
      message: `See paistab olevat ${received} testi tulemus. Palun kleebi see ${received} sammus või kasuta siin ${expected} testi tulemust.`,
    };
  }

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
    const started = Date.now();
    console.log("[api] analyze-test-content:ai-start", { at: new Date().toISOString(), kind });
    const shape = kind === "interests" ? interestShape : skillShape;
    const taxonomy = kind === "interests" ? taxonomyPrompt("interest") : taxonomyPrompt("skill");
    const result = await withTimeout(
      askJson(
        `${baseInstruction} ${taxonomy} Kui tekstis on mitu erinevat sõnastust, paiguta need kõige lähemasse olemasolevasse kategooriasse. Ära loo uusi key väärtusi. Tagasta täpselt kujuga ${shape}`,
        content,
      ),
    );
    console.log("[api] analyze-test-content:ai-done", { at: new Date().toISOString(), kind, durationMs: Date.now() - started });
    return { ...normalizeTestAnalysis(result, kind), source: "ai" };
  } catch (error) {
    console.log("[api] analyze-test-content:fallback", { at: new Date().toISOString(), kind, message: error instanceof Error ? error.message : String(error) });
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

OLULINE KAALUMINE — ÄRA IGNOREERI ÜHTKI ALLIKAT, ARVESTA NEID ERINEVALT:
- Testide 0-100 NUMBRID on usaldusväärsed kvantitatiivsed signaalid kuue huvi- ja kuue oskusekategooria tugevuse kohta. Need näitavad selgeid suundumusi ja peavad kokkuvõttes esinema (näiteks "tugevamad huvid paistavad olevat uuriv ja sotsiaalne, oskuste poolelt analüüs ja info mõtestamine"). Kasuta neid suunaandvalt.
- Testide pikem KIRJELDAV TEKST (need lõigud nagu "Sa oskad inimesi tegevustesse haarata..." või "Sotsiaalse tüübi inimesi iseloomustatakse...") on testi enda ÜLDINE tüüpkirjeldus, mitte konkreetselt selle õpilase kohta käiv tekst. Võta seda ettevaatlikult: ära tsiteeri seda otseselt ega esita seda õpilase enda omadusena. See toetab numbrilist suunda, kuid ei asenda õpilase enda häält.
- Kasutaja VABA TEKST, valitud valdkonnad, eesmärgid ja sildid kirjeldavad teda ISIKLIKULT — sealt tulevad konkreetsed teemad. Need peavad olema märksõnade ja konkreetsete viidete peamine allikas. Maini sealt 1-3 konkreetset teemat (nt bioloogia, AI, loomad, muusika, ettevõtlus, IT, tervis, loovus), kui need esinevad.
- Kui vaba tekst või valdkonnad lähevad numbrite suunaga vastuollu, too see vastuolu välja ettevaatlikult ja jäta tõlgendus kasutajale lahtiseks.

Tee summary keskmise pikkusega: 3 sisukat lõiku, igas lõigus 2-3 lauset, kokku umbes 130-190 sõna. Esimene lõik räägib üldisest muljest inimesena, sidudes vaba teksti, valdkonnad ja test­ide tugevama suuna. Teine lõik seob kokku konkreetsed teemahuvid (peamiselt vabast tekstist ja siltidest) ning toetab neid testikategooriate numbritega ("uuriv 85%, analüüs 80% — paistab, et..."). Kolmas lõik kirjeldab sobivat õppimis- või töökeskkonda ja nimetab, millised oletused vajavad kasutaja kinnitust.
Tõsta summary sees 4-7 olulisemat märksõna või fraasi Markdowni boldiga esile. Konkreetsed teemad (**bioloogia**, **AI**, **loomad**) tulgu peamiselt vabast tekstist; testikategooriate nimed (**uuriv huvi**, **analüüs**) sobivad samuti, kui numbrid neid selgelt esile toovad. Ära tee terveid lauseid boldiks.
Kirjuta nii, et kasutaja tunneks, et süsteem päriselt luges tema teksti JA arvestas testitulemusi. Väldi üldist karjäärinõustamise juttu.
Kasuta ainult ettevaatlikke sõnastusi: "paistab", "võib viidata", "tasub uurida". Võimalikud ametid ja edasiõppimise suunad pane eraldi massiividesse ning hoia need lühikesed.
Vasta ainult JSON-ina kujuga {"summary":"","possibleJobDirections":[],"possibleEducationDirections":[]}. Eesti keeles.`,
        JSON.stringify(payload),
      ),
    );
    return { ...result, source: "ai" };
  } catch (error) {
    return mockProfile(payload, fallbackFor(error));
  }
}
