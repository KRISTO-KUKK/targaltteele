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
  const interestText = formatTopScores(profile?.interestScores);
  const skillText = formatTopScores(profile?.skillScores);
  const selectedDomains = Array.isArray(profile?.selectedDomains) ? profile.selectedDomains.filter(Boolean).join(", ") : "";
  const freeText = typeof profile?.freeText === "string" ? profile.freeText.trim() : "";
  const tags = [
    ...(Array.isArray(profile?.freeTextTags) ? profile.freeTextTags : []),
    ...(Array.isArray(profile?.interestTags) ? profile.interestTags : []),
    ...(Array.isArray(profile?.skillTags) ? profile.skillTags : []),
  ].filter(Boolean);

  return {
    summary: [
      "AI peegeldust ei saanud praegu luua, seega näidisandmeid ei kasutata. See kokkuvõte põhineb ainult sinu sisestatud profiiliandmetel.",
      interestText ? `Huvide testi põhjal on praegu tugevamad suunad: **${interestText}**.` : "Huvide testi skoore ei ole profiilis.",
      skillText ? `Oskuste testi põhjal on praegu tugevamad tugevused: **${skillText}**.` : "Oskuste testi skoore ei ole profiilis.",
      selectedDomains ? `Valitud valdkonnad: **${selectedDomains}**.` : "",
      freeText ? `Sinu enda tekstist jäi alles järgmine sisend: "${freeText.slice(0, 260)}${freeText.length > 260 ? "..." : ""}"` : "",
      tags.length ? `Märksõnad profiilis: **${Array.from(new Set(tags)).slice(0, 10).join(", ")}**.` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
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

function formatTopScores(scores: unknown) {
  if (!Array.isArray(scores)) return "";
  return scores
    .filter((score): score is { label?: string; key: string; score: number } => Boolean(score) && typeof score === "object" && typeof (score as any).score === "number")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((score) => `${score.label || score.key} ${score.score}%`)
    .join(", ");
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
