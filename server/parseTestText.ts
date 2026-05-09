import { interestDimensions, skillDimensions } from "./taxonomy";

type LabelMatcher = { key: string; pattern: RegExp };

const interestMatchers: LabelMatcher[] = [
  { key: "sotsiaalne", pattern: /\bsotsiaalne\b/i },
  { key: "uuriv", pattern: /\buuriv?\b/i },
  { key: "ettevotlik", pattern: /\bettev[oõ]tlik\b(?!kus)/i },
  { key: "loominguline", pattern: /\bloominguline\b/i },
  { key: "susteemne", pattern: /\bs[üu]steemne\b/i },
  { key: "praktiline", pattern: /\bpraktiline\b/i },
];

const skillMatchers: LabelMatcher[] = [
  { key: "juhtimine_eestvedamine", pattern: /juhtimine.*eestvedami|eestvedami.*juhtimine/i },
  { key: "analuus_info", pattern: /anal[üu][üu]s.*info|info.*anal[üu][üu]s/i },
  { key: "loovus_uldistamine", pattern: /loovus.*[üu]ldistami|[üu]ldistami.*loovus/i },
  { key: "kohanemine_toimetulek", pattern: /kohanemine.*toimetulek|toimetulek.*kohanemine/i },
  { key: "ettevotlikkus_organiseerimine", pattern: /ettev[oõ]tlikkus.*organiseerimi|organiseerimi.*ettev[oõ]tlikkus/i },
  { key: "suhtlemine_koostoo", pattern: /suhtlemine.*koost[öo][öo]|koost[öo][öo].*suhtlemine/i },
];

const PERCENT_LINE = /^(\d{1,3})(?:\s*[%9])?\s*$/;
const INLINE_PERCENT = /(?:^|\s)(\d{1,3})(?:\s*(?:%|9))?\s*$/;
const POINTS_LINE = /^\d{1,2}\s*\/\s*\d{1,2}\s*punkti/i;

type LabelHit = { key: string; index: number };
type PercentHit = { value: number; index: number };

function classifyLine(line: string, matchers: LabelMatcher[]): { kind: "label"; key: string } | { kind: "inline"; key: string; value: number } | { kind: "percent"; value: number } | { kind: "skip" } {
  if (!line) return { kind: "skip" };
  if (POINTS_LINE.test(line)) return { kind: "skip" };

  const percent = line.match(PERCENT_LINE);
  if (percent) {
    const value = Number(percent[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 100) {
      return { kind: "percent", value };
    }
  }

  for (const matcher of matchers) {
    if (matcher.pattern.test(line)) {
      const inlinePercent = line.match(INLINE_PERCENT);
      if (inlinePercent) {
        const value = Number(inlinePercent[1]);
        if (Number.isFinite(value) && value >= 0 && value <= 100) {
          return { kind: "inline", key: matcher.key, value };
        }
      }
      return { kind: "label", key: matcher.key };
    }
  }
  return { kind: "skip" };
}

function pairLabelsWithPercents(labels: LabelHit[], percents: PercentHit[]): Map<string, number> {
  const found = new Map<string, number>();
  let percentCursor = 0;
  for (const label of labels) {
    if (found.has(label.key)) continue;
    while (percentCursor < percents.length && percents[percentCursor].index <= label.index) {
      percentCursor++;
    }
    if (percentCursor >= percents.length) break;
    found.set(label.key, percents[percentCursor].value);
    percentCursor++;
  }
  return found;
}

export type ParsedTestResult = {
  scores: Array<{ key: string; label: string; score: number; tags: string[] }>;
  matchedCount: number;
};

export function parseTestText(kind: "interests" | "skills", text: string): ParsedTestResult {
  const matchers = kind === "interests" ? interestMatchers : skillMatchers;
  const dictionary = kind === "interests" ? interestDimensions : skillDimensions;

  if (!text || !text.trim()) return { scores: [], matchedCount: 0 };

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const labels: LabelHit[] = [];
  const percents: PercentHit[] = [];
  const seenLabels = new Set<string>();
  const found = new Map<string, number>();

  for (let index = 0; index < lines.length; index++) {
    const classified = classifyLine(lines[index], matchers);
    if (classified.kind === "inline" && !seenLabels.has(classified.key)) {
      found.set(classified.key, classified.value);
      seenLabels.add(classified.key);
    } else if (classified.kind === "label" && !seenLabels.has(classified.key)) {
      labels.push({ key: classified.key, index });
      seenLabels.add(classified.key);
    } else if (classified.kind === "percent") {
      percents.push({ value: classified.value, index });
    }
  }

  for (const [key, value] of pairLabelsWithPercents(labels, percents)) {
    if (!found.has(key)) found.set(key, value);
  }

  const scores = dictionary
    .map((dimension) => {
      const score = found.get(dimension.key);
      if (score === undefined) return null;
      return { key: dimension.key, label: dimension.label, score, tags: dimension.tags };
    })
    .filter((item): item is { key: string; label: string; score: number; tags: string[] } => item !== null);

  return { scores, matchedCount: scores.length };
}
