import curriculaRaw from "../../erialad/curricula_all_enriched.json";
import evalRaw from "../../erialad/eval.json";
import type { EducationOption } from "../types";
import { interestScore, skillScore } from "./taxonomy";

type Localized = {
  et?: string;
  en?: string;
};

type CurriculumRecord = {
  curriculum?: {
    id?: number;
    code?: string;
    title?: Localized;
    credits?: number;
    study_level?: Localized & { code?: string };
  };
  details?: {
    general?: {
      duration_years?: number;
    };
    classification?: {
      domain?: Localized;
      direction?: Localized;
      study_group?: Localized;
      group?: Localized;
    };
    overview?: {
      objectives?: Localized | string;
      learning_outcomes?: Localized | string;
      reception_criteria?: Localized | string;
    };
  };
  website_curriculum_url?: string;
};

type EvalRecord = {
  kood: string;
  huvid?: Record<string, number>;
  oskused?: Record<string, number>;
};

const curricula = curriculaRaw as CurriculumRecord[];
const evals = evalRaw as EvalRecord[];

const evalByCode = new Map(evals.map((item) => [item.kood, item]));

function text(value: Localized | string | undefined, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.et || value.en || fallback;
}

function shortText(value: string, max = 240) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function topWeightedTags(values: Record<string, number> | undefined) {
  if (!values) return [];
  return Object.entries(values)
    .filter(([, score]) => score >= 60)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => key);
}

function scoresFrom(values: Record<string, number> | undefined, kind: "interest" | "skill") {
  if (!values) return [];
  return Object.entries(values)
    .map(([key, score]) => (kind === "interest" ? interestScore(key, score) : skillScore(key, score)))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => b.score - a.score);
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

export const catalogEducationOptions: EducationOption[] = curricula
  .map((item) => {
    const code = item.curriculum?.code ?? "";
    const details = item.details;
    const classification = details?.classification;
    const overview = details?.overview;
    const evaluation = evalByCode.get(code);
    const domain = text(classification?.domain);
    const direction = text(classification?.direction);
    const studyGroup = text(classification?.study_group);
    const group = text(classification?.group);
    const objectives = text(overview?.objectives);
    const outcomes = text(overview?.learning_outcomes);
    const criteria = text(overview?.reception_criteria);
    const description = shortText(objectives || outcomes || criteria || "Õppekava kirjeldus vajab täpsustamist õppeasutuse kodulehel.");
    const interestScores = scoresFrom(evaluation?.huvid, "interest");
    const skillScores = scoresFrom(evaluation?.oskused, "skill");
    const relatedSkills = topWeightedTags(evaluation?.oskused);
    const interestTags = topWeightedTags(evaluation?.huvid);
    const tags = unique([
      domain,
      direction,
      studyGroup,
      group,
      ...interestTags,
      ...relatedSkills,
      ...interestScores.flatMap((score) => score.tags),
      ...skillScores.flatMap((score) => score.tags),
    ]);

    return {
      id: `curriculum-${code || item.curriculum?.id}`,
      code,
      title: text(item.curriculum?.title, "Nimetu õppekava"),
      school: "Tartu Ülikool",
      level: text(item.curriculum?.study_level, "tase täpsustamisel"),
      credits: item.curriculum?.credits,
      durationYears: details?.general?.duration_years,
      domain,
      direction,
      url: item.website_curriculum_url || "",
      description,
      why: evaluation
        ? "Selle õppekava juures on olemas huvide ja oskuste profiil, mida saab sinu sisendiga võrrelda."
        : "See õppekava kattub valdkonna, taseme või otsingusõnade kaudu sinu uuritavate suundadega.",
      tags,
      relatedJobIds: [],
      relatedSkills,
      interestScores,
      skillScores,
    } satisfies EducationOption;
  })
  .filter((item) => item.code && item.title);

export const educationLevels = ["Kõik", ...Array.from(new Set(catalogEducationOptions.map((item) => item.level))).sort()];
export const educationDomains = ["Kõik", ...Array.from(new Set(catalogEducationOptions.map((item) => item.domain).filter(Boolean) as string[])).sort()];
