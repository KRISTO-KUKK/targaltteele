import { createOpenAIClient, getModel } from "./openaiClient";
import {
  curricula,
  extraCourses,
  fields,
  getAmetidForField,
  type Amet,
  type Curriculum,
  type ExtraCourse,
  type Profile12d,
} from "./dataset";
import { buildProfile, collectUserKeywords, distanceToScore, weightedDistance } from "./profileMath";

export type RecommendInput = {
  interestScores?: Array<{ key: string; score: number }>;
  skillScores?: Array<{ key: string; score: number }>;
  freeText?: string;
  freeTextGoals?: string[];
  freeTextConcerns?: string[];
  tags?: string[];
  selectedDomains?: string[];
  aiSummary?: string;
};

export type CurriculumMatch = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  sisu: string;
  url: string | null;
  matchScore: number;
};

export type FieldMatch = {
  id: string;
  nimi: string;
  kirjeldus: string;
  tags: string[];
  matchScore: number;
  sampleAmetid: Amet[];
};

export type CourseSuggestion = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
};

export type RecommendationResponse = {
  topCurricula: CurriculumMatch[];
  topFields: FieldMatch[];
  refinedCurricula: CurriculumMatch[];
  suggestedCourses: CourseSuggestion[];
  explanation: string;
  source: "ai" | "math-only";
  message?: string;
};

export function matchTopCurricula(profile: Profile12d, limit = 15): CurriculumMatch[] {
  const scored = curricula
    .filter((curriculum): curriculum is Curriculum & { profile: Profile12d } => curriculum.profile !== null)
    .map((curriculum) => {
      const distance = weightedDistance(profile, curriculum.profile);
      return {
        kood: curriculum.kood,
        pealkiri: curriculum.pealkiri,
        oppeaste: curriculum.oppeaste,
        sisu: curriculum.sisu,
        url: curriculum.url,
        matchScore: distanceToScore(distance),
        _distance: distance,
      };
    })
    .sort((a, b) => a._distance - b._distance)
    .slice(0, limit)
    .map(({ _distance, ...rest }) => rest);
  return scored;
}

export function matchTopFields(profile: Profile12d, limit = 6): FieldMatch[] {
  return fields
    .map((field) => {
      const distance = weightedDistance(profile, field.profile);
      return { field, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ field, distance }) => ({
      id: field.id,
      nimi: field.nimi,
      kirjeldus: field.kirjeldus,
      tags: field.tags,
      matchScore: distanceToScore(distance),
      sampleAmetid: getAmetidForField(field.id, 5),
    }));
}

function safeJsonParse(text: string): any {
  if (!text) return null;
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const candidate = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function buildLlmPayload(
  input: RecommendInput,
  topCurricula: CurriculumMatch[],
  candidateCourses: ExtraCourse[],
) {
  const tags = Array.from(new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 30);
  const goals = (input.freeTextGoals ?? []).map((goal) => goal.trim()).filter(Boolean).slice(0, 8);
  const concerns = (input.freeTextConcerns ?? []).map((concern) => concern.trim()).filter(Boolean).slice(0, 8);
  const selectedDomains = (input.selectedDomains ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 12);

  return {
    user: {
      freeText: (input.freeText ?? "").slice(0, 4000),
      goals,
      concerns,
      tags,
      selectedDomains,
      previousAiSummary: (input.aiSummary ?? "").slice(0, 1200),
    },
    curricula: topCurricula.slice(0, 10).map((curriculum) => ({
      kood: curriculum.kood,
      pealkiri: curriculum.pealkiri,
      oppeaste: curriculum.oppeaste,
      sisu: curriculum.sisu.slice(0, 600),
    })),
    extraCourses: candidateCourses.slice(0, 40).map((course) => ({
      link: course.link,
      pealkiri: course.pealkiri,
      tags: course.tags,
      sisu: course.sisu.slice(0, 280),
    })),
  };
}

const REFINER_SYSTEM_PROMPT = `Oled karjäärinõustaja, kes aitab Eesti gümnaasiumiõpilasel valida edasiõppimise suunda.
Sulle on antud kasutaja vaba tekst (freeText), tema sõnastatud eesmärgid (goals), kahtlused (concerns), sildid (tags), valitud valdkonnad (selectedDomains) ja varasem AI peegeldus (previousAiSummary). Need kõik kirjeldavad sama inimest — võta neid tervikuna.
Lisaks on sulle ette antud matemaatilise sobitamise põhjal eelvalitud õppekavade nimekiri (curricula) ja võimalike lisakursuste komplekt (extraCourses).

OLULINE KAALUMINE — ARVESTA MÕLEMA POOLEGA:
- Testide 0-100 PROTSENDID on usaldusväärne signaal selle kohta, kuhu kasutaja huvid ja oskused laias plaanis kalduvad. Curricula-nimekiri on nende põhjal juba eelvalitud, nii et need on heaks lähtekohaks.
- Kasutaja FREE TEXT, goals, tags ja selectedDomains kirjeldavad teda KONKREETSEMALT — milliste teemade vastu ta tegelikult huvi tunneb. Need on tähtsamad konkreetse õppekava valikul kui pelk numbriline tipp.
- Lõpliku järjestuse otsustad nii: kasuta numbrilist eelvalikut kui taustsignaali ja vali sealt välja ned, mille sisu kattub kõige paremini kasutaja vabateksti, eesmärkide ja valitud valdkondadega. Kui tipus olev õppekava ei sobi tema sõnastatud huvidega üldse, eelista madalamal järjekohal olevat, mis sobib.
- Testitulemustega kaasnevaid tüüpkirjeldusi ("Sa oskad inimesi tegevustesse haarata..." jms) ÄRA tsiteeri otse — need on testi üldised lõigud, mitte selle konkreetse õpilase tekst. Kasuta neid taustaks, aga argumenteeri valikut õpilase enda sõnade põhjal.

Sinu ülesanne:
1) Järjesta õppekavad ümber, kombineerides numbrilist eelvalikut kasutaja vabateksti, eesmärkide, siltide ja valitud valdkondadega. Vabateksti ja valdkondade konkreetne kattuvus on tähtsam kui matemaatiline järjestus, kuid numbrid annavad usaldusväärse laia suuna. Eemalda need, mis kasutaja sõnastatud huvidega selgelt ei sobi. Vali maksimaalselt 5 parimat.
2) Vali extraCourses-listist 1-3 lisakursust, mis toetavad valitud õppekavasid ja kasutaja konkreetseid huve (eelistatult vabateksti ja siltide kattuvuse põhjal).
3) Kirjuta kasutajale lühike (kuni 4 lauset), soe ja konkreetne põhjendus, miks just need valikud talle sobivad. Maini 1-2 konkreetset teemat tema vabast tekstist või eesmärkidest, et kasutaja tunneks et tema sisendit on loetud. Ära nimeta skoore ega protsente. Kasuta sõnu "võib sobida", "tasub uurida", "paistab", väldi lõplikke väiteid.
Vasta AINULT JSON-ina kujuga:
{"curriculaOrder":["kood1","kood2"],"courseLinks":["link1"],"explanation":"..."}.
Eesti keeles. Kasuta ainult koode, mis on eelvaliku nimekirjas. Kasuta ainult linke, mis on extraCourses-listist.`;

async function callRefiner(payload: ReturnType<typeof buildLlmPayload>) {
  const client = createOpenAIClient();
  if (!client) throw new Error("Missing OPENAI_API_KEY");

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: REFINER_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
    ],
    response_format: { type: "json_object" },
  });
  return safeJsonParse(response.choices[0]?.message?.content ?? "");
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

function pickRefinedCurricula(order: unknown, candidates: CurriculumMatch[]): CurriculumMatch[] {
  if (!Array.isArray(order)) return candidates.slice(0, 5);
  const byKood = new Map(candidates.map((curriculum) => [curriculum.kood, curriculum]));
  const seen = new Set<string>();
  const picked: CurriculumMatch[] = [];
  for (const koodValue of order) {
    const kood = String(koodValue ?? "").trim();
    if (!kood || seen.has(kood)) continue;
    const match = byKood.get(kood);
    if (match) {
      picked.push(match);
      seen.add(kood);
    }
    if (picked.length >= 5) break;
  }
  return picked.length > 0 ? picked : candidates.slice(0, 5);
}

function pickSuggestedCourses(links: unknown, pool: ExtraCourse[]): CourseSuggestion[] {
  if (!Array.isArray(links)) return [];
  const byLink = new Map(pool.map((course) => [course.link, course]));
  const out: CourseSuggestion[] = [];
  const seen = new Set<string>();
  for (const linkValue of links) {
    const link = String(linkValue ?? "").trim();
    if (!link || seen.has(link)) continue;
    const course = byLink.get(link);
    if (course) {
      out.push({ link: course.link, pealkiri: course.pealkiri, sisu: course.sisu, tags: course.tags });
      seen.add(link);
    }
    if (out.length >= 3) break;
  }
  return out;
}

function fallbackCourses(input: RecommendInput, pool: ExtraCourse[]): CourseSuggestion[] {
  const userTags = collectUserKeywords(input);
  if (userTags.size === 0) return pool.slice(0, 2).map(({ link, pealkiri, sisu, tags }) => ({ link, pealkiri, sisu, tags }));
  const scored = pool
    .map((course) => {
      const overlap = course.tags.reduce(
        (count, tag) => count + (userTags.has(tag.toLocaleLowerCase("et-EE")) ? 1 : 0),
        0,
      );
      return { course, overlap };
    })
    .filter((item) => item.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 2);
  return scored.map(({ course }) => ({
    link: course.link,
    pealkiri: course.pealkiri,
    sisu: course.sisu,
    tags: course.tags,
  }));
}

export async function getRecommendations(input: RecommendInput): Promise<RecommendationResponse> {
  const profile = buildProfile(input);
  const topCurricula = matchTopCurricula(profile, 15);
  const topFields = matchTopFields(profile, 6);

  const candidateCourses = filterCandidateCourses(input, extraCourses);

  if (!topCurricula.length) {
    return {
      topCurricula,
      topFields,
      refinedCurricula: [],
      suggestedCourses: fallbackCourses(input, candidateCourses),
      explanation: "Profiili põhjal ei õnnestunud õppekavasid sobitada. Proovi täpsustada huve või oskusi.",
      source: "math-only",
      message: "Eval-andmed puuduvad või on profiil tühi.",
    };
  }

  const payload = buildLlmPayload(input, topCurricula, candidateCourses);

  try {
    const refined = await withTimeout(callRefiner(payload));
    const refinedCurricula = pickRefinedCurricula(refined?.curriculaOrder, topCurricula);
    const suggestedCourses = pickSuggestedCourses(refined?.courseLinks, candidateCourses);
    const explanation =
      typeof refined?.explanation === "string" && refined.explanation.trim()
        ? refined.explanation.trim()
        : "AI selgitust ei saadud, aga matemaatiline sobitus jäi alles.";
    return {
      topCurricula,
      topFields,
      refinedCurricula,
      suggestedCourses: suggestedCourses.length ? suggestedCourses : fallbackCourses(input, candidateCourses),
      explanation,
      source: "ai",
    };
  } catch (error) {
    return {
      topCurricula,
      topFields,
      refinedCurricula: topCurricula.slice(0, 5),
      suggestedCourses: fallbackCourses(input, candidateCourses),
      explanation:
        "AI peenhäälestus polnud saadaval. Näitame matemaatilise sobitamise tulemust ja siltide järgi valitud kursuseid, et saaksid edasi vaadata.",
      source: "math-only",
      message: (error as Error).message,
    };
  }
}

function filterCandidateCourses(input: RecommendInput, pool: ExtraCourse[]): ExtraCourse[] {
  const tags = collectUserKeywords(input);
  if (tags.size === 0) return pool;
  const ranked = pool
    .map((course) => ({
      course,
      overlap: course.tags.reduce(
        (count, tag) => count + (tags.has(tag.toLocaleLowerCase("et-EE")) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.overlap - a.overlap);
  const overlapping = ranked.filter((item) => item.overlap > 0).map((item) => item.course);
  if (overlapping.length >= 8) return overlapping.slice(0, 40);
  // Always include some baseline so the LLM can still pick something.
  const baseline = ranked.slice(0, 12).map((item) => item.course);
  return Array.from(new Set([...overlapping, ...baseline])).slice(0, 40);
}
