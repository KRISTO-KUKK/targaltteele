import type { ScoreItem } from "../types";

export const interestDimensions: ScoreItem[] = [
  { key: "sotsiaalne", label: "Sotsiaalne huvi", score: 0, tags: ["inimesed", "aitamine", "nõustamine", "haridus", "kogukond"] },
  { key: "uuriv", label: "Uuriv huvi", score: 0, tags: ["analüüs", "teadus", "info", "uurimine", "loodusteadused"] },
  { key: "ettevotlik", label: "Ettevõtlik huvi", score: 0, tags: ["juhtimine", "algatamine", "projektid", "äri", "müük"] },
  { key: "loominguline", label: "Loominguline huvi", score: 0, tags: ["loovus", "disain", "meedia", "kirjutamine", "kunst"] },
  { key: "susteemne", label: "Süsteemne huvi", score: 0, tags: ["struktuur", "täpsus", "andmed", "reeglid", "planeerimine"] },
  { key: "praktiline", label: "Praktiline huvi", score: 0, tags: ["praktiline töö", "tehnika", "käeline tegevus", "katsetamine"] },
];

export const skillDimensions: ScoreItem[] = [
  { key: "suhtlemine_koostoo", label: "Suhtlemine ja koostöö", score: 0, tags: ["suhtlemine", "koostöö", "kuulamine", "empaatia"] },
  { key: "loovus_uldistamine", label: "Loovus ja üldistamine", score: 0, tags: ["loovus", "seostamine", "ideed", "üldistamine"] },
  { key: "analuus_info", label: "Analüüs ja info mõtestamine", score: 0, tags: ["analüüs", "infootsing", "kriitiline mõtlemine", "andmed"] },
  { key: "ettevotlikkus_organiseerimine", label: "Ettevõtlikkus ja organiseerimine", score: 0, tags: ["organiseerimine", "algatamine", "projektijuhtimine"] },
  { key: "kohanemine_toimetulek", label: "Kohanemine ja toimetulek", score: 0, tags: ["enesejuhtimine", "paindlikkus", "õppimine"] },
  { key: "juhtimine_eestvedamine", label: "Juhtimine ja eestvedamine", score: 0, tags: ["juhtimine", "vastutus", "eestvedamine"] },
];

const interestByKey = new Map(interestDimensions.map((item) => [item.key, item]));
const skillByKey = new Map(skillDimensions.map((item) => [item.key, item]));

export function interestScore(key: string, score: number): ScoreItem | null {
  const dimension = interestByKey.get(key);
  if (!dimension) return null;
  return { ...dimension, score: clampScore(score) };
}

export function skillScore(key: string, score: number): ScoreItem | null {
  const dimension = skillByKey.get(key);
  if (!dimension) return null;
  return { ...dimension, score: clampScore(score) };
}

export function normalizeInterestScores(scores: ScoreItem[]) {
  return scores
    .map((item) => interestScore(item.key, item.score))
    .filter((item): item is ScoreItem => Boolean(item))
    .sort((a, b) => b.score - a.score);
}

export function normalizeSkillScores(scores: ScoreItem[]) {
  return scores
    .map((item) => skillScore(item.key, item.score))
    .filter((item): item is ScoreItem => Boolean(item))
    .sort((a, b) => b.score - a.score);
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
