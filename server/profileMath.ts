import { taxonomy, type Profile12d } from "./dataset";
import { normalizeForMatch } from "./signals";

export const INTEREST_WEIGHT = 1.2;
export const SKILL_WEIGHT = 1.0;
export const MAX_DISTANCE = Math.sqrt(
  taxonomy.interestKeys.length * 100 * 100 * INTEREST_WEIGHT + taxonomy.skillKeys.length * 100 * 100 * SKILL_WEIGHT,
);

export type ProfileInput = {
  interestScores?: Array<{ key: string; score: number }>;
  skillScores?: Array<{ key: string; score: number }>;
};

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function buildProfile(input: ProfileInput): Profile12d {
  const huvid = Object.fromEntries(taxonomy.interestKeys.map((key) => [key, 50])) as Profile12d["huvid"];
  const oskused = Object.fromEntries(taxonomy.skillKeys.map((key) => [key, 50])) as Profile12d["oskused"];
  for (const item of input.interestScores ?? []) {
    if ((taxonomy.interestKeys as readonly string[]).includes(item.key)) {
      huvid[item.key as keyof typeof huvid] = clamp(Number(item.score) || 0, 0, 100);
    }
  }
  for (const item of input.skillScores ?? []) {
    if ((taxonomy.skillKeys as readonly string[]).includes(item.key)) {
      oskused[item.key as keyof typeof oskused] = clamp(Number(item.score) || 0, 0, 100);
    }
  }
  return { huvid, oskused };
}

export function weightedDistance(a: Profile12d, b: Profile12d): number {
  let sum = 0;
  for (const key of taxonomy.interestKeys) {
    const diff = a.huvid[key] - b.huvid[key];
    sum += INTEREST_WEIGHT * diff * diff;
  }
  for (const key of taxonomy.skillKeys) {
    const diff = a.oskused[key] - b.oskused[key];
    sum += SKILL_WEIGHT * diff * diff;
  }
  return Math.sqrt(sum);
}

export function distanceToScore(distance: number): number {
  const normalized = clamp(1 - distance / MAX_DISTANCE, 0, 1);
  return Math.round(normalized * 100);
}

export function collectUserKeywords(input: {
  freeText?: string;
  tags?: string[];
  selectedDomains?: string[];
  freeTextGoals?: string[];
  freeTextConcerns?: string[];
  aiSummary?: string;
}): Set<string> {
  const out = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeForMatch(value);
    if (normalized.length >= 3) out.add(normalized);
  };
  for (const tag of input.tags ?? []) add(tag);
  for (const domain of input.selectedDomains ?? []) add(domain);
  for (const word of (input.freeText ?? "").split(/[\s,;.?!:()"/]+/)) add(word);
  for (const word of (input.aiSummary ?? "").split(/[\s,;.?!:()"/]+/)) add(word);
  for (const goal of input.freeTextGoals ?? []) {
    for (const word of goal.split(/[\s,;]+/)) add(word);
  }
  for (const concern of input.freeTextConcerns ?? []) {
    for (const word of concern.split(/[\s,;]+/)) add(word);
  }
  return out;
}
