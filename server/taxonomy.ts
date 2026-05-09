export const interestDimensions = [
  { key: "sotsiaalne", label: "Sotsiaalne huvi", tags: ["inimesed", "aitamine", "nõustamine", "haridus", "kogukond"] },
  { key: "uuriv", label: "Uuriv huvi", tags: ["analüüs", "teadus", "info", "uurimine", "loodusteadused"] },
  { key: "ettevotlik", label: "Ettevõtlik huvi", tags: ["juhtimine", "algatamine", "projektid", "äri", "müük"] },
  { key: "loominguline", label: "Loominguline huvi", tags: ["loovus", "disain", "meedia", "kirjutamine", "kunst"] },
  { key: "susteemne", label: "Süsteemne huvi", tags: ["struktuur", "täpsus", "andmed", "reeglid", "planeerimine"] },
  { key: "praktiline", label: "Praktiline huvi", tags: ["praktiline töö", "tehnika", "käeline tegevus", "katsetamine"] },
];

export const skillDimensions = [
  { key: "suhtlemine_koostoo", label: "Suhtlemine ja koostöö", tags: ["suhtlemine", "koostöö", "kuulamine", "empaatia"] },
  { key: "loovus_uldistamine", label: "Loovus ja üldistamine", tags: ["loovus", "seostamine", "ideed", "üldistamine"] },
  { key: "analuus_info", label: "Analüüs ja info mõtestamine", tags: ["analüüs", "infootsing", "kriitiline mõtlemine", "andmed"] },
  { key: "ettevotlikkus_organiseerimine", label: "Ettevõtlikkus ja organiseerimine", tags: ["organiseerimine", "algatamine", "projektijuhtimine"] },
  { key: "kohanemine_toimetulek", label: "Kohanemine ja toimetulek", tags: ["enesejuhtimine", "paindlikkus", "õppimine"] },
  { key: "juhtimine_eestvedamine", label: "Juhtimine ja eestvedamine", tags: ["juhtimine", "vastutus", "eestvedamine"] },
];

const interestByKey = new Map(interestDimensions.map((item) => [item.key, item]));
const skillByKey = new Map(skillDimensions.map((item) => [item.key, item]));

export function taxonomyPrompt(kind: "interest" | "skill" | "combined") {
  const interests = interestDimensions.map((item) => `${item.key}: ${item.label}`).join("; ");
  const skills = skillDimensions.map((item) => `${item.key}: ${item.label}`).join("; ");
  if (kind === "interest") return `Kasuta ainult neid huvikategooriaid: ${interests}.`;
  if (kind === "skill") return `Kasuta ainult neid oskusekategooriaid: ${skills}.`;
  return `Kasuta ainult neid huvikategooriaid: ${interests}. Kasuta ainult neid oskusekategooriaid: ${skills}.`;
}

export function normalizeScores(raw: any[], kind: "interest" | "skill") {
  const dictionary = kind === "interest" ? interestByKey : skillByKey;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const dimension = dictionary.get(String(item?.key ?? ""));
      if (!dimension) return null;
      const score = Math.max(0, Math.min(100, Math.round(Number(item?.score ?? 0))));
      return { ...dimension, score };
    })
    .filter(Boolean);
}
