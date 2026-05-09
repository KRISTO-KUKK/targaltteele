import type { FreeTextAnalysis, ProfileSummary, TestAnalysis } from "../types";

export function mockTestAnalysis(kind: "interests" | "skills", message?: string): TestAnalysis {
  return {
    scores: [],
    tags: [],
    summary: kind === "interests" ? "Huvide testi tulemust ei saanud automaatselt tõlgendada." : "Oskuste testi tulemust ei saanud automaatselt tõlgendada.",
    source: "mock",
    message,
  };
}

export function mockFreeTextAnalysis(text: string, message?: string): FreeTextAnalysis {
  const trimmed = text.trim();
  return {
    tags: extractKeywords(trimmed),
    goals: [],
    concerns: [],
    interestScores: [],
    skillScores: [],
    summary: trimmed
      ? `Vaba tekst salvestati. AI kokkuvõtet ei loodud, seega jätkame ainult sinu sisestatud tekstiga: "${trimmed.slice(0, 220)}${trimmed.length > 220 ? "..." : ""}"`
      : "Vaba teksti sammu ei täidetud.",
    source: "mock",
    message,
  };
}

export function mockProfileSummary(payload?: unknown, message?: string): ProfileSummary {
  const profile = readProfile(payload);
  const selectedDomains = Array.isArray(profile?.selectedDomains) ? profile.selectedDomains.filter(Boolean).join(", ") : "";
  const freeText = typeof profile?.freeText === "string" ? profile.freeText.trim() : "";

  const parts: string[] = ["AI peegeldust ei saanud praegu luua."];
  if (selectedDomains) parts.push(`Valisid valdkonnad **${selectedDomains}**.`);
  if (freeText) parts.push(`Sinu enda sõnadest: "${freeText.slice(0, 200)}${freeText.length > 200 ? "…" : ""}"`);
  parts.push("Kasutan neid soovituste alusena; testitulemused jäävad ainult taustaks.");

  return {
    summary: parts.join(" "),
    possibleJobDirections: [],
    possibleEducationDirections: [],
    source: "mock",
    message,
  };
}

function readProfile(payload: unknown): any {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { profile?: unknown };
  return record.profile && typeof record.profile === "object" ? record.profile : null;
}

function extractKeywords(text: string) {
  const lowered = text.toLocaleLowerCase("et-EE");
  function containsTerm(textValue: string, term: string) {
    const normalizedTerm = term.toLocaleLowerCase("et-EE");
    const tokens = textValue.split(/[^a-z0-9õäöüšž]+/i).filter(Boolean);
    if (normalizedTerm.length <= 3) return tokens.includes(normalizedTerm);
    return tokens.some((token) => token === normalizedTerm || token.startsWith(normalizedTerm));
  }
  const keywords = [
    "bioloogia",
    "loomad",
    "ai",
    "it",
    "tervis",
    "muusika",
    "ettevõtlus",
    "ettevotlus",
    "loovus",
    "tehnoloogia",
    "inimesed",
    "loodus",
    "rahandus",
    "investeerimine",
    "marketing",
    "turundus",
    "analyst",
    "trader",
  ];
  return keywords.filter((keyword) => containsTerm(lowered, keyword));
}
