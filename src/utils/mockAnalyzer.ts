import { demoInterestScores, demoSkillScores, mockSummary } from "../data/demoData";
import type { FreeTextAnalysis, ProfileSummary, TestAnalysis } from "../types";

export function mockTestAnalysis(kind: "interests" | "skills", message?: string): TestAnalysis {
  const scores = kind === "interests" ? demoInterestScores : demoSkillScores;
  return {
    scores,
    tags: Array.from(new Set(scores.flatMap((score) => score.tags))),
    summary:
      kind === "interests"
        ? "Demoanalüüsi põhjal paistavad esile inimestega töötamine, kogukond ja kommunikatsioon. Neid suundi tasub edasi uurida rahulikult ja võrdlevalt."
        : "Demoanalüüsi põhjal on tugevamad üldoskused suhtlemine, koostöö ja kirjalik eneseväljendus. Digioskusi saab soovi korral praktiliste kursustega juurde arendada.",
    source: "mock",
    message,
  };
}

export function mockFreeTextAnalysis(text: string, message?: string): FreeTextAnalysis {
  return {
    tags: text.trim() ? ["huvi täpsustamine", "paindlikkus", "praktiline katsetamine"] : [],
    goals: text.trim() ? ["leida suund, mida saab enne lõplikku valikut katsetada"] : [],
    concerns: text.trim() ? ["vajab lisainfot, milline roll päriselt sobib"] : [],
    summary: text.trim()
      ? "Sinu kirjeldus viitab soovile võrrelda mitut võimalikku suunda ja teha valik praktilise katsetamise kaudu."
      : "Vaba teksti sammu jätsid praegu vahele. Soovitused põhinevad testitulemustel ja valitud valdkondadel.",
    source: "mock",
    message,
  };
}

export function mockProfileSummary(message?: string): ProfileSummary {
  return {
    summary: mockSummary,
    possibleJobDirections: ["noorsootöötaja", "personalispetsialist", "kommunikatsioonispetsialist", "sotsiaaltöötaja", "karjäärinõustaja"],
    possibleEducationDirections: ["noorsootöö", "sotsiaaltöö", "kommunikatsioon", "haridusteadused", "personalijuhtimine"],
    source: "mock",
    message,
  };
}
