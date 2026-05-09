import { createOpenAIClient, getModel } from "./openaiClient";
import {
  curricula,
  extraCourses,
  fields,
  getAmetidForField,
  type Amet,
  type Curriculum,
  type ExtraCourse,
  type Field,
  type Profile12d,
} from "./dataset";
import { buildProfile, collectUserKeywords, distanceToScore, weightedDistance } from "./profileMath";
import {
  extractUserSignals,
  scoreTextAgainstSignals,
  summarizeSignals,
  type SignalExtraction,
} from "./signals";

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
  testScore: number;
  signalScore: number;
  tier: string;
  matchedSignals: string[];
  reason?: string;
};

export type FieldMatch = {
  id: string;
  nimi: string;
  kirjeldus: string;
  tags: string[];
  matchScore: number;
  testScore: number;
  signalScore: number;
  sampleAmetid: Amet[];
};

export type CourseSuggestion = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
  signalScore: number;
  matchedSignals: string[];
  reason?: string;
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

type CourseCandidate = ExtraCourse & {
  signalScore: number;
  matchedSignals: string[];
  matchedBuzzwords: string[];
};

function hasSpecificSignals(extraction: SignalExtraction) {
  return extraction.signals.length > 0 || extraction.buzzwords.length > 0;
}

function tierFor(signalScore: number, testScore: number, hasSignals: boolean) {
  if (!hasSignals) {
    if (testScore >= 78) return "A: testipõhine varusuund";
    if (testScore >= 66) return "B: mõõdukas testipõhine varusuund";
    return "C: varuvariant";
  }
  if (signalScore >= 65) return "A: otsene kattuvus õpilase sõnade ja valikutega";
  if (signalScore >= 32) return "B: osaline kattuvus õpilase sõnade ja valikutega";
  return "C: ainult pehme testisignaal, tekstis nõrgem seos";
}

function buildCurriculumMatch(profile: Profile12d, curriculum: Curriculum & { profile: Profile12d }, extraction: SignalExtraction): CurriculumMatch {
  const testScore = distanceToScore(weightedDistance(profile, curriculum.profile));
  const signalMatch = scoreTextAgainstSignals(
    `${curriculum.pealkiri} ${curriculum.oppeaste} ${curriculum.sisu}`,
    extraction,
  );
  const hasSignals = hasSpecificSignals(extraction);
  const matchScore = hasSignals
    ? Math.round(signalMatch.score * 0.88 + testScore * 0.12)
    : testScore;

  return {
    kood: curriculum.kood,
    pealkiri: curriculum.pealkiri,
    oppeaste: curriculum.oppeaste,
    sisu: curriculum.sisu,
    url: curriculum.url,
    matchScore,
    testScore,
    signalScore: signalMatch.score,
    tier: tierFor(signalMatch.score, testScore, hasSignals),
    matchedSignals: signalMatch.matchedSignals,
  };
}

export function matchTopCurricula(profile: Profile12d, extraction: SignalExtraction, limit = 24): CurriculumMatch[] {
  const scored = curricula
    .filter((curriculum): curriculum is Curriculum & { profile: Profile12d } => curriculum.profile !== null)
    .map((curriculum) => buildCurriculumMatch(profile, curriculum, extraction));

  if (!hasSpecificSignals(extraction)) {
    return scored.sort((a, b) => b.testScore - a.testScore).slice(0, limit);
  }

  const signalFirst = scored
    .filter((candidate) => candidate.signalScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.signalScore - a.signalScore || b.testScore - a.testScore);

  const mathBackups = scored
    .sort((a, b) => b.testScore - a.testScore)
    .slice(0, 8);

  return uniqueByKood([...signalFirst, ...mathBackups])
    .sort((a, b) => b.matchScore - a.matchScore || b.signalScore - a.signalScore || b.testScore - a.testScore)
    .slice(0, limit);
}

export function matchTopFields(profile: Profile12d, extraction: SignalExtraction, limit = 6): FieldMatch[] {
  const hasSignals = hasSpecificSignals(extraction);
  return fields
    .map((field) => {
      const testScore = distanceToScore(weightedDistance(profile, field.profile));
      const signalMatch = scoreTextAgainstSignals(`${field.nimi} ${field.kirjeldus} ${field.tags.join(" ")}`, extraction);
      const matchScore = hasSignals ? Math.round(signalMatch.score * 0.88 + testScore * 0.12) : testScore;
      return { field, testScore, signalScore: signalMatch.score, matchScore };
    })
    .sort((a, b) => b.matchScore - a.matchScore || b.signalScore - a.signalScore || b.testScore - a.testScore)
    .slice(0, limit)
    .map(({ field, testScore, signalScore, matchScore }) => ({
      id: field.id,
      nimi: field.nimi,
      kirjeldus: field.kirjeldus,
      tags: field.tags,
      testScore,
      signalScore,
      matchScore,
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
  extraction: SignalExtraction,
  topCurricula: CurriculumMatch[],
  candidateCourses: CourseCandidate[],
) {
  const tags = Array.from(new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))).slice(0, 40);
  const goals = (input.freeTextGoals ?? []).map((goal) => goal.trim()).filter(Boolean).slice(0, 10);
  const concerns = (input.freeTextConcerns ?? []).map((concern) => concern.trim()).filter(Boolean).slice(0, 10);
  const selectedDomains = (input.selectedDomains ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 12);

  return {
    evaluationPolicy:
      "Primary: freeText, selectedDomains, tags, detectedSignals, detectedBuzzwords. Secondary soft background: testScore. If these conflict, follow the student's own text and marked interests.",
    user: {
      freeText: (input.freeText ?? "").slice(0, 5000),
      goals,
      concerns,
      tags,
      selectedDomains,
      detectedSignals: summarizeSignals(extraction),
      detectedBuzzwords: extraction.buzzwords.slice(0, 16),
      previousAiSummary: (input.aiSummary ?? "").slice(0, 1200),
    },
    tieredCurricula: topCurricula.slice(0, 18).map((curriculum) => ({
      tier: curriculum.tier,
      kood: curriculum.kood,
      pealkiri: curriculum.pealkiri,
      oppeaste: curriculum.oppeaste,
      signalScore: curriculum.signalScore,
      testScore: curriculum.testScore,
      combinedScore: curriculum.matchScore,
      matchedSignals: curriculum.matchedSignals,
      sisu: curriculum.sisu.slice(0, 700),
    })),
    extraCourses: candidateCourses.slice(0, 35).map((course) => ({
      link: course.link,
      pealkiri: course.pealkiri,
      signalScore: course.signalScore,
      matchedSignals: course.matchedSignals,
      tags: course.tags,
      sisu: course.sisu.slice(0, 320),
    })),
  };
}

const REFINER_SYSTEM_PROMPT = `Oled karjäärinõustaja, kes aitab Eesti gümnaasiumiõpilasel valida edasiõppimise suunda.
Sinu esimene ja kõige tähtsam allikas on õpilase enda freeText, goals, selectedDomains, tags, detectedSignals ja detectedBuzzwords. Need kirjeldavad, mida õpilane ise ütles ja mida ta ise märkis huvipakkuvaks.
Testitulemused on ainult pehme suunav taustsignaal: need aitavad kontrollida, kas soovitusel on üldine profiilitoetus, aga ei tohi üksi lõplikku valikut juhtida ega õpilase enda sõnu üle kirjutada.

Sulle antakse tieredCurricula nimekiri:
- A-tier tähendab tugevat kattuvust õpilase sõnade, valitud valdkondade või märksõnadega.
- B-tier tähendab osalist kattuvust.
- C-tier tähendab, et testiprofiil võib suunda pehmelt toetada, aga õpilase enda sõnades on nõrgem seos.

Tee lõplik valik nii:
1) Eelista õppekavasid, mille sisu kattub otseselt õpilase enda sõnade ja valitud valdkondadega.
2) Kasuta testScore väärtust ainult nõrga tie-breakerina, taustakontrollina või siis, kui õpilase tekst ja huvivalikud on väga napid.
3) Kui õpilane nimetab konkreetseid teemasid, siis ära lükka neid kõrvale lihtsalt seetõttu, et mõni testiskaala on madalam või teine testiskaala on kõrgem.
4) Kui A-tier kandidaat ei sobi sisuliselt õpilase freeTextiga, võid valida B-tier kandidaadi, aga põhjenda seda.
5) Ära tsiteeri testi tüüpkirjeldusi. Põhjenda õpilase enda sõnade, valitud valdkondade, detectedSignals väärtuste ja õppekava sisuga.
6) Kui testScore ja signalScore lähevad vastuollu, järgi signalScore'i ning maini vajadusel, et testi tulemus on ainult taust.

Tagasta maksimaalselt 5 õppekava ja 1-3 lisakursust. Iga õppekava ja kursuse juurde kirjuta lühike konkreetne põhjus, miks just see sobib.
Vasta AINULT JSON-ina kujuga:
{
  "curricula":[{"kood":"12345","reason":"Üks konkreetne lause, mis seob õpilase huvi ja õppekava sisu."}],
  "courseLinks":[{"link":"https://...","reason":"Üks konkreetne lause, miks kursus on hea järgmine katsetus."}],
  "explanation":"2-4 lauset üldist loogikat: mis signaalidest alustasid ja kuidas teste taustana kasutasid."
}
Eesti keeles. Kasuta ainult koode, mis on tieredCurricula nimekirjas. Kasuta ainult linke, mis on extraCourses nimekirjas.`;

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

async function withTimeout<T>(task: Promise<T>, ms = 60000): Promise<T> {
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

function pickRefinedCurricula(refined: any, candidates: CurriculumMatch[]): CurriculumMatch[] {
  const rawList = Array.isArray(refined?.curricula)
    ? refined.curricula
    : Array.isArray(refined?.curriculaOrder)
      ? refined.curriculaOrder
      : [];
  const byKood = new Map(candidates.map((curriculum) => [curriculum.kood, curriculum]));
  const seen = new Set<string>();
  const picked: CurriculumMatch[] = [];

  for (const item of rawList) {
    const kood = typeof item === "string" ? item.trim() : String(item?.kood ?? "").trim();
    if (!kood || seen.has(kood)) continue;
    const match = byKood.get(kood);
    if (!match) continue;
    const reason = typeof item?.reason === "string" && item.reason.trim() ? item.reason.trim() : fallbackCurriculumReason(match);
    picked.push({ ...match, reason });
    seen.add(kood);
    if (picked.length >= 5) break;
  }

  return picked.length > 0
    ? picked
    : candidates.slice(0, 5).map((candidate) => ({ ...candidate, reason: fallbackCurriculumReason(candidate) }));
}

function pickSuggestedCourses(refined: any, pool: CourseCandidate[]): CourseSuggestion[] {
  const rawList = Array.isArray(refined?.courseLinks) ? refined.courseLinks : [];
  const byLink = new Map(pool.map((course) => [course.link, course]));
  const out: CourseSuggestion[] = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const link = typeof item === "string" ? item.trim() : String(item?.link ?? "").trim();
    if (!link || seen.has(link)) continue;
    const course = byLink.get(link);
    if (!course) continue;
    const reason = typeof item?.reason === "string" && item.reason.trim() ? item.reason.trim() : fallbackCourseReason(course);
    out.push(courseToSuggestion(course, reason));
    seen.add(link);
    if (out.length >= 3) break;
  }
  return out;
}

function fallbackCurriculumReason(candidate: CurriculumMatch) {
  if (candidate.matchedSignals.length) {
    return `Sobib, sest õppekava kattub õpilase märksõnadega ${candidate.matchedSignals.slice(0, 3).join(", ")}; testiprofiil on ainult pehme taustakontroll.`;
  }
  return "See on varusoovitus pehme testisignaali põhjal; seda tasub võrrelda õpilase enda täpsemate huvidega.";
}

function fallbackCourseReason(course: CourseCandidate) {
  if (course.matchedSignals.length) {
    return `Hea väike katsetus, sest kursus haakub märksõnadega ${course.matchedSignals.slice(0, 3).join(", ")}.`;
  }
  return "Hea katsetus, et valdkonda väiksema sammuga proovida.";
}

function courseToSuggestion(course: CourseCandidate, reason?: string): CourseSuggestion {
  return {
    link: course.link,
    pealkiri: course.pealkiri,
    sisu: course.sisu,
    tags: course.tags,
    signalScore: course.signalScore,
    matchedSignals: course.matchedSignals,
    reason,
  };
}

function fallbackCourses(input: RecommendInput, pool: CourseCandidate[]): CourseSuggestion[] {
  const userTags = collectUserKeywords(input);
  const sorted = [...pool].sort((a, b) => b.signalScore - a.signalScore || a.pealkiri.localeCompare(b.pealkiri, "et-EE"));
  if (userTags.size === 0) return sorted.slice(0, 2).map((course) => courseToSuggestion(course, fallbackCourseReason(course)));

  const overlapping = sorted
    .map((course) => {
      const overlap = course.tags.reduce(
        (count, tag) => count + (userTags.has(tag.toLocaleLowerCase("et-EE")) ? 1 : 0),
        0,
      );
      return { course, overlap };
    })
    .filter((item) => item.overlap > 0 || item.course.signalScore > 0)
    .sort((a, b) => b.course.signalScore - a.course.signalScore || b.overlap - a.overlap)
    .slice(0, 2);

  return (overlapping.length ? overlapping.map((item) => item.course) : sorted.slice(0, 2))
    .map((course) => courseToSuggestion(course, fallbackCourseReason(course)));
}

export async function getRecommendations(input: RecommendInput): Promise<RecommendationResponse> {
  const profile = buildProfile(input);
  const extraction = extractUserSignals(input);
  const topCurricula = matchTopCurricula(profile, extraction, 24);
  const topFields = matchTopFields(profile, extraction, 6);
  const candidateCourses = filterCandidateCourses(input, extraCourses, extraction);

  if (!topCurricula.length) {
    return {
      topCurricula,
      topFields,
      refinedCurricula: [],
      suggestedCourses: fallbackCourses(input, candidateCourses),
      explanation: "Profiili põhjal ei õnnestunud õppekavasid sobitada. Proovi täpsustada vabas tekstis, mis teemad päriselt huvitavad.",
      source: "math-only",
      message: "Eval-andmed puuduvad või profiil on liiga tühi.",
    };
  }

  const payload = buildLlmPayload(input, extraction, topCurricula, candidateCourses);
  const started = Date.now();

  try {
    console.log("[api] recommend:refiner-start", {
      at: new Date().toISOString(),
      curriculumCandidates: topCurricula.length,
      courseCandidates: candidateCourses.length,
      detectedSignals: extraction.signals.length,
    });
    const refined = await withTimeout(callRefiner(payload));
    console.log("[api] recommend:refiner-done", {
      at: new Date().toISOString(),
      durationMs: Date.now() - started,
    });
    const refinedCurricula = pickRefinedCurricula(refined, topCurricula);
    const suggestedCourses = pickSuggestedCourses(refined, candidateCourses);
    const explanation =
      typeof refined?.explanation === "string" && refined.explanation.trim()
        ? refined.explanation.trim()
        : "Valik algas õpilase enda tekstist, valitud valdkondadest ja märksõnadest; testitulemusi kasutati ainult pehme taustasobivuse kontrolliks.";
    return {
      topCurricula,
      topFields,
      refinedCurricula,
      suggestedCourses: suggestedCourses.length ? suggestedCourses : fallbackCourses(input, candidateCourses),
      explanation,
      source: "ai",
    };
  } catch (error) {
    console.log("[api] recommend:refiner-fallback", {
      at: new Date().toISOString(),
      durationMs: Date.now() - started,
      message: error instanceof Error ? error.message : String(error),
    });
    return {
      topCurricula,
      topFields,
      refinedCurricula: topCurricula.slice(0, 5).map((candidate) => ({ ...candidate, reason: fallbackCurriculumReason(candidate) })),
      suggestedCourses: fallbackCourses(input, candidateCourses),
      explanation: "Näitame signaalipõhist shortlisti sinu teksti, valdkondade ja märksõnade põhjal.",
      source: "math-only",
    };
  }
}

function filterCandidateCourses(input: RecommendInput, pool: ExtraCourse[], extraction: SignalExtraction): CourseCandidate[] {
  const tags = collectUserKeywords(input);
  const ranked = pool
    .map((course) => {
      const signalMatch = scoreTextAgainstSignals(`${course.pealkiri} ${course.sisu} ${course.tags.join(" ")}`, extraction);
      const tagOverlap = course.tags.reduce(
        (count, tag) => count + (tags.has(tag.toLocaleLowerCase("et-EE")) ? 1 : 0),
        0,
      );
      return {
        ...course,
        signalScore: Math.min(100, signalMatch.score + tagOverlap * 8),
        matchedSignals: signalMatch.matchedSignals,
        matchedBuzzwords: signalMatch.matchedBuzzwords,
      } satisfies CourseCandidate;
    })
    .sort((a, b) => b.signalScore - a.signalScore || a.pealkiri.localeCompare(b.pealkiri, "et-EE"));

  const strong = ranked.filter((course) => course.signalScore > 0);
  if (strong.length >= 8) return strong.slice(0, 40);
  return uniqueByLink([...strong, ...ranked.slice(0, 14)]).slice(0, 40);
}

function uniqueByKood(items: CurriculumMatch[]) {
  const seen = new Set<string>();
  const out: CurriculumMatch[] = [];
  for (const item of items) {
    if (seen.has(item.kood)) continue;
    seen.add(item.kood);
    out.push(item);
  }
  return out;
}

function uniqueByLink(items: CourseCandidate[]) {
  const seen = new Set<string>();
  const out: CourseCandidate[] = [];
  for (const item of items) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    out.push(item);
  }
  return out;
}
