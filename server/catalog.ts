import {
  curricula,
  extraCourses,
  fields,
  getAllAmetid,
  getFieldIdsForAmet,
  type Curriculum,
  type Field,
} from "./dataset";
import {
  buildProfile,
  collectUserKeywords,
  distanceToScore,
  weightedDistance,
  type ProfileInput,
} from "./profileMath";
import { extractUserSignals, scoreTextAgainstSignals, type SignalExtraction } from "./signals";

export type CatalogInput = ProfileInput & {
  freeText?: string;
  freeTextGoals?: string[];
  freeTextConcerns?: string[];
  tags?: string[];
  selectedDomains?: string[];
  aiSummary?: string;
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

function hasSignals(extraction: SignalExtraction) {
  return extraction.signals.length > 0 || extraction.buzzwords.length > 0;
}

function blendScore(signalScore: number, testScore: number, signalsPresent: boolean) {
  if (!signalsPresent) return testScore;
  return Math.round(signalScore * 0.88 + testScore * 0.12);
}

function fieldSignalAndTest(
  profile: ReturnType<typeof buildProfile>,
  field: Field,
  extraction: SignalExtraction,
) {
  const testScore = distanceToScore(weightedDistance(profile, field.profile));
  const signalScore = scoreTextAgainstSignals(
    `${field.nimi} ${field.kirjeldus} ${field.tags.join(" ")}`,
    extraction,
  ).score;
  return { testScore, signalScore };
}

export function rankCurricula(input: CatalogInput): CatalogCurriculum[] {
  const profile = buildProfile(input);
  const extraction = extractUserSignals(input);
  const signalsPresent = hasSignals(extraction);

  const scored = curricula
    .filter((curriculum): curriculum is Curriculum & { profile: NonNullable<Curriculum["profile"]> } => curriculum.profile !== null)
    .map((curriculum) => {
      const testScore = distanceToScore(weightedDistance(profile, curriculum.profile));
      const signalScore = scoreTextAgainstSignals(
        `${curriculum.pealkiri} ${curriculum.oppeaste} ${curriculum.sisu}`,
        extraction,
      ).score;
      const matchScore = blendScore(signalScore, testScore, signalsPresent);
      return {
        kood: curriculum.kood,
        pealkiri: curriculum.pealkiri,
        oppeaste: curriculum.oppeaste,
        sisu: curriculum.sisu,
        url: curriculum.url,
        matchScore,
        signalScore,
        testScore,
      };
    });

  const sorted = signalsPresent
    ? sortSignalsFirst(
        scored,
        (item) => item.signalScore,
        (item) => item.matchScore,
        (item) => item.testScore,
        (a, b) => a.pealkiri.localeCompare(b.pealkiri, "et-EE"),
      )
    : scored.sort(
        (a, b) =>
          b.testScore - a.testScore ||
          a.pealkiri.localeCompare(b.pealkiri, "et-EE"),
      );

  return sorted.map(({ signalScore, testScore, ...rest }) => {
    void signalScore;
    void testScore;
    return rest;
  });
}

export function rankCourses(input: CatalogInput): CatalogCourse[] {
  const extraction = extractUserSignals(input);
  const signalsPresent = hasSignals(extraction);
  const userKeywords = collectUserKeywords(input);

  const scored = extraCourses.map((course) => {
    const signalMatch = scoreTextAgainstSignals(
      `${course.pealkiri} ${course.sisu} ${course.tags.join(" ")}`,
      extraction,
    );
    const tagOverlap = course.tags.reduce(
      (count, tag) => count + (userKeywords.has(tag.toLocaleLowerCase("et-EE")) ? 1 : 0),
      0,
    );
    const signalScore = Math.min(100, signalMatch.score + tagOverlap * 8);
    const matchScore = signalsPresent ? signalScore : 50;
    return {
      link: course.link,
      pealkiri: course.pealkiri,
      sisu: course.sisu,
      tags: course.tags,
      matchScore,
      signalScore,
    };
  });

  const sorted = signalsPresent
    ? sortSignalsFirst(
        scored,
        (item) => item.signalScore,
        (item) => item.matchScore,
        () => 0,
        (a, b) => a.pealkiri.localeCompare(b.pealkiri, "et-EE"),
      )
    : scored.sort((a, b) => a.pealkiri.localeCompare(b.pealkiri, "et-EE"));

  return sorted.map(({ signalScore, ...rest }) => {
    void signalScore;
    return rest;
  });
}

export function rankAmetid(input: CatalogInput): CatalogAmet[] {
  const profile = buildProfile(input);
  const extraction = extractUserSignals(input);
  const signalsPresent = hasSignals(extraction);

  const fieldScoreById = new Map<string, { nimi: string; testScore: number; signalScore: number; matchScore: number }>();
  for (const field of fields) {
    const { testScore, signalScore } = fieldSignalAndTest(profile, field, extraction);
    fieldScoreById.set(field.id, {
      nimi: field.nimi,
      testScore,
      signalScore,
      matchScore: blendScore(signalScore, testScore, signalsPresent),
    });
  }

  const scored = getAllAmetid().map((amet) => {
    const fieldIds = getFieldIdsForAmet(amet.id);
    const fieldEntries: CatalogAmetField[] = fieldIds
      .map((fieldId) => {
        const meta = fieldScoreById.get(fieldId);
        if (!meta) return null;
        return { id: fieldId, nimi: meta.nimi, matchScore: meta.matchScore };
      })
      .filter((value): value is CatalogAmetField => value !== null)
      .sort((a, b) => b.matchScore - a.matchScore);

    let bestFieldSignal = 0;
    let bestFieldTest = 0;
    for (const fieldId of fieldIds) {
      const meta = fieldScoreById.get(fieldId);
      if (!meta) continue;
      if (meta.signalScore > bestFieldSignal) bestFieldSignal = meta.signalScore;
      if (meta.testScore > bestFieldTest) bestFieldTest = meta.testScore;
    }

    const fieldMatchScore = fieldEntries.length > 0 ? fieldEntries[0].matchScore : 0;
    const ametSignalMatch = scoreTextAgainstSignals(`${amet.nimi} ${amet.kirjeldus}`, extraction);
    const ametSignalScore = signalsPresent ? ametSignalMatch.score : 0;
    const signalScore = Math.max(ametSignalScore, bestFieldSignal);

    const matchScore = signalsPresent
      ? Math.min(
          100,
          Math.round(Math.max(fieldMatchScore, ametSignalScore) * 0.7 + Math.min(fieldMatchScore, ametSignalScore) * 0.3),
        )
      : fieldMatchScore;

    return {
      id: amet.id,
      nimi: amet.nimi,
      kirjeldus: amet.kirjeldus,
      fields: fieldEntries.slice(0, 4),
      matchScore,
      signalScore,
      testScore: bestFieldTest,
    };
  });

  const sorted = signalsPresent
    ? sortSignalsFirst(
        scored,
        (item) => item.signalScore,
        (item) => item.matchScore,
        (item) => item.testScore,
        (a, b) => a.nimi.localeCompare(b.nimi, "et-EE"),
      )
    : scored.sort(
        (a, b) => b.matchScore - a.matchScore || a.nimi.localeCompare(b.nimi, "et-EE"),
      );

  return sorted.map(({ signalScore, testScore, ...rest }) => {
    void signalScore;
    void testScore;
    return rest;
  });
}

function sortSignalsFirst<T>(
  items: T[],
  signalScore: (item: T) => number,
  matchScore: (item: T) => number,
  testScore: (item: T) => number,
  fallback: (a: T, b: T) => number,
): T[] {
  const matched: T[] = [];
  const unmatched: T[] = [];
  for (const item of items) {
    if (signalScore(item) > 0) matched.push(item);
    else unmatched.push(item);
  }
  matched.sort(
    (a, b) =>
      signalScore(b) - signalScore(a) ||
      matchScore(b) - matchScore(a) ||
      testScore(b) - testScore(a) ||
      fallback(a, b),
  );
  unmatched.sort((a, b) => testScore(b) - testScore(a) || fallback(a, b));
  return [...matched, ...unmatched];
}
