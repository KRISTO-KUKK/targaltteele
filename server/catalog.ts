import {
  curricula,
  extraCourses,
  fields,
  getAllAmetid,
  getFieldIdsForAmet,
  type Amet,
  type Curriculum,
  type ExtraCourse,
  type Field,
} from "./dataset";
import {
  buildProfile,
  collectUserKeywords,
  distanceToScore,
  weightedDistance,
  type ProfileInput,
} from "./profileMath";

export type CatalogInput = ProfileInput & {
  freeText?: string;
  freeTextGoals?: string[];
  freeTextConcerns?: string[];
  tags?: string[];
  selectedDomains?: string[];
};

export type CatalogCurriculum = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  sisu: string;
  url: string | null;
  matchScore: number;
};

export type CatalogCourse = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
  matchScore: number;
};

export type CatalogAmetField = {
  id: string;
  nimi: string;
  matchScore: number;
};

export type CatalogAmet = {
  id: string;
  nimi: string;
  kirjeldus: string;
  fields: CatalogAmetField[];
  matchScore: number;
};

function fieldDistanceScore(profile: ReturnType<typeof buildProfile>, field: Field): number {
  return distanceToScore(weightedDistance(profile, field.profile));
}

export function rankCurricula(input: CatalogInput): CatalogCurriculum[] {
  const profile = buildProfile(input);
  const userKeywords = collectUserKeywords(input);
  const ranked = curricula
    .filter((curriculum): curriculum is Curriculum & { profile: NonNullable<Curriculum["profile"]> } => curriculum.profile !== null)
    .map((curriculum) => {
      const distance = weightedDistance(profile, curriculum.profile);
      const profileScore = distanceToScore(distance);
      const lowerHaystack = `${curriculum.pealkiri} ${curriculum.sisu}`.toLocaleLowerCase("et-EE");
      let keywordBoost = 0;
      for (const keyword of userKeywords) {
        if (lowerHaystack.includes(keyword)) keywordBoost += 2;
      }
      const finalScore = Math.min(100, profileScore + keywordBoost);
      return {
        kood: curriculum.kood,
        pealkiri: curriculum.pealkiri,
        oppeaste: curriculum.oppeaste,
        sisu: curriculum.sisu,
        url: curriculum.url,
        matchScore: finalScore,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
  return ranked;
}

export function rankCourses(input: CatalogInput): CatalogCourse[] {
  const userKeywords = collectUserKeywords(input);
  const ranked = extraCourses
    .map((course) => {
      const lowerTags = course.tags.map((tag) => tag.toLocaleLowerCase("et-EE"));
      const lowerHaystack = `${course.pealkiri} ${course.sisu}`.toLocaleLowerCase("et-EE");
      let overlap = 0;
      for (const keyword of userKeywords) {
        if (lowerTags.includes(keyword)) overlap += 3;
        else if (lowerHaystack.includes(keyword)) overlap += 1;
      }
      const matchScore = userKeywords.size === 0 ? 50 : Math.min(100, overlap * 10);
      return {
        link: course.link,
        pealkiri: course.pealkiri,
        sisu: course.sisu,
        tags: course.tags,
        matchScore,
      } satisfies CatalogCourse;
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.pealkiri.localeCompare(b.pealkiri, "et-EE"));
  return ranked;
}

export function rankAmetid(input: CatalogInput): CatalogAmet[] {
  const profile = buildProfile(input);
  const fieldScoreById = new Map<string, { nimi: string; matchScore: number }>();
  for (const field of fields) {
    fieldScoreById.set(field.id, { nimi: field.nimi, matchScore: fieldDistanceScore(profile, field) });
  }
  const userKeywords = collectUserKeywords(input);

  const ranked = getAllAmetid()
    .map((amet) => {
      const fieldIds = getFieldIdsForAmet(amet.id);
      const fieldEntries: CatalogAmetField[] = fieldIds
        .map((fieldId) => {
          const meta = fieldScoreById.get(fieldId);
          if (!meta) return null;
          return { id: fieldId, nimi: meta.nimi, matchScore: meta.matchScore };
        })
        .filter((value): value is CatalogAmetField => value !== null)
        .sort((a, b) => b.matchScore - a.matchScore);

      const baseScore = fieldEntries.length > 0 ? fieldEntries[0].matchScore : 0;
      const lowerHaystack = `${amet.nimi} ${amet.kirjeldus}`.toLocaleLowerCase("et-EE");
      let keywordBoost = 0;
      for (const keyword of userKeywords) {
        if (lowerHaystack.includes(keyword)) keywordBoost += 2;
      }
      const matchScore = Math.min(100, baseScore + keywordBoost);
      return {
        id: amet.id,
        nimi: amet.nimi,
        kirjeldus: amet.kirjeldus,
        fields: fieldEntries.slice(0, 4),
        matchScore,
      } satisfies CatalogAmet;
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.nimi.localeCompare(b.nimi, "et-EE"));

  return ranked;
}
