import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

const INTEREST_KEYS = ["sotsiaalne", "uuriv", "ettevotlik", "loominguline", "susteemne", "praktiline"] as const;
const SKILL_KEYS = ["suhtlemine_koostoo", "loovus_uldistamine", "analuus_info", "ettevotlikkus_organiseerimine", "kohanemine_toimetulek", "juhtimine_eestvedamine"] as const;

export type InterestKey = (typeof INTEREST_KEYS)[number];
export type SkillKey = (typeof SKILL_KEYS)[number];

export type Profile12d = {
  huvid: Record<InterestKey, number>;
  oskused: Record<SkillKey, number>;
};

export type Curriculum = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  sisu: string;
  url: string | null;
  profile: Profile12d | null;
};

export type Field = {
  id: string;
  nimi: string;
  kirjeldus: string;
  tags: string[];
  profile: Profile12d;
};

export type Amet = {
  id: string;
  nimi: string;
  kirjeldus: string;
};

export type ExtraCourse = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
};

function safeReadJson<T>(relativePath: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(path.resolve(projectRoot, relativePath), "utf8");
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (error) {
    console.warn(`[dataset] Failed to read ${relativePath}: ${(error as Error).message}`);
    return fallback;
  }
}

function asNumber(value: unknown, fallback = 50) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(100, number));
}

function buildProfile(huvid: any, oskused: any): Profile12d {
  const interests = {} as Record<InterestKey, number>;
  for (const key of INTEREST_KEYS) interests[key] = asNumber(huvid?.[key]);
  const skills = {} as Record<SkillKey, number>;
  for (const key of SKILL_KEYS) skills[key] = asNumber(oskused?.[key]);
  return { huvid: interests, oskused: skills };
}

function pickEstonianText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (typeof value.et === "string") return value.et;
    if (typeof value.en === "string") return value.en;
  }
  return "";
}

function joinSentences(parts: Array<string | undefined | null>): string {
  return parts
    .map((part) => (part ?? "").toString().trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveCurriculumSisu(entry: any): string {
  const overview = entry?.details_augmented?.overview ?? entry?.details?.overview ?? {};
  const objectives = Array.isArray(overview.objectives) ? overview.objectives.map(pickEstonianText) : [];
  const outcomes = Array.isArray(overview.learning_outcomes) ? overview.learning_outcomes.map(pickEstonianText) : [];
  const reception = pickEstonianText(overview.reception_criteria);
  const notes = pickEstonianText(overview.notes);
  return joinSentences([...objectives, ...outcomes, reception, notes]).slice(0, 1200);
}

const evalRaw = safeReadJson<any[]>("erialad/eval.json", []);
const evalByKood = new Map<string, Profile12d>();
for (const item of evalRaw) {
  const kood = String(item?.kood ?? "").trim();
  if (!kood) continue;
  evalByKood.set(kood, buildProfile(item?.huvid, item?.oskused));
}

const curriculaRaw = safeReadJson<any[]>("erialad/curricula_all_enriched.json", []);
export const curricula: Curriculum[] = curriculaRaw
  .map((entry) => {
    const code = String(entry?.curriculum?.code ?? entry?.details?.code ?? "").trim();
    if (!code) return null;
    const titleEt = pickEstonianText(entry?.curriculum?.title) || pickEstonianText(entry?.details?.title);
    const oppeaste = pickEstonianText(entry?.curriculum?.study_level) || pickEstonianText(entry?.details?.classification?.study_level);
    const sisu = deriveCurriculumSisu(entry);
    const profile = evalByKood.get(code) ?? null;
    return {
      kood: code,
      pealkiri: titleEt || `Õppekava ${code}`,
      oppeaste: oppeaste || "",
      sisu,
      url: typeof entry?.website_curriculum_url === "string" ? entry.website_curriculum_url : null,
      profile,
    } satisfies Curriculum;
  })
  .filter((item): item is Curriculum => Boolean(item));

const fieldsRaw = safeReadJson<any[]>("valdkonnad/valdkonnad.json", []);
export const fields: Field[] = fieldsRaw
  .map((entry) => {
    const id = String(entry?.id ?? "").trim();
    if (!id) return null;
    return {
      id,
      nimi: String(entry?.nimi ?? ""),
      kirjeldus: String(entry?.kirjeldus ?? ""),
      tags: Array.isArray(entry?.tags) ? entry.tags.map((tag: unknown) => String(tag)) : [],
      profile: buildProfile(entry?.huvid, entry?.oskused),
    } satisfies Field;
  })
  .filter((item): item is Field => Boolean(item));

const seosedRaw = safeReadJson<any[]>("valdkonnad/seosed.json", []);
const ametIdsByField = new Map<string, string[]>();
const fieldIdsByAmetId = new Map<string, string[]>();
for (const link of seosedRaw) {
  const fieldId = String(link?.valdkond_id ?? "").trim();
  const ids = Array.isArray(link?.ametid_ids) ? link.ametid_ids.map((id: unknown) => String(id)) : [];
  if (!fieldId) continue;
  ametIdsByField.set(fieldId, ids);
  for (const ametId of ids) {
    const existing = fieldIdsByAmetId.get(ametId) ?? [];
    existing.push(fieldId);
    fieldIdsByAmetId.set(ametId, existing);
  }
}

const ametidRaw = safeReadJson<any[]>("valdkonnad/ametid.json", []);
const ametidById = new Map<string, Amet>();
for (const entry of ametidRaw) {
  const id = String(entry?.id ?? "").trim();
  if (!id) continue;
  ametidById.set(id, {
    id,
    nimi: String(entry?.nimi ?? ""),
    kirjeldus: String(entry?.kirjeldus ?? ""),
  });
}

export function getAmetidForField(fieldId: string, limit = 5): Amet[] {
  const ids = ametIdsByField.get(fieldId) ?? [];
  const out: Amet[] = [];
  for (const id of ids) {
    const amet = ametidById.get(id);
    if (amet) out.push(amet);
    if (out.length >= limit) break;
  }
  return out;
}

export function getFieldIdsForAmet(ametId: string): string[] {
  return fieldIdsByAmetId.get(ametId) ?? [];
}

export function getAllAmetid(): Amet[] {
  return Array.from(ametidById.values());
}

export function getFieldById(fieldId: string): Field | undefined {
  return fields.find((field) => field.id === fieldId);
}

const lisakursusedRaw = safeReadJson<any[]>("erialad/lisakursused.json", []);
const kursusteTagidRaw = safeReadJson<any[]>("erialad/kursuste_tagid.json", []);
const tagsByCourseLink = new Map<string, string[]>();
for (const entry of kursusteTagidRaw) {
  const link = String(entry?.link ?? "").trim();
  const tags = Array.isArray(entry?.tags) ? entry.tags.map((tag: unknown) => String(tag)) : [];
  if (link) tagsByCourseLink.set(link, tags);
}

export const extraCourses: ExtraCourse[] = lisakursusedRaw.map((entry) => {
  const link = String(entry?.link ?? "");
  return {
    link,
    pealkiri: String(entry?.pealkiri ?? ""),
    sisu: String(entry?.sisu ?? ""),
    tags: tagsByCourseLink.get(link) ?? [],
  };
});

export const taxonomy = {
  interestKeys: INTEREST_KEYS,
  skillKeys: SKILL_KEYS,
};
