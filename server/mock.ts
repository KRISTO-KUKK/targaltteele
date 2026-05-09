import { interestDimensions, skillDimensions } from "./taxonomy";

const demoInterestScores = [
  { ...interestDimensions[0], score: 86 },
  { ...interestDimensions[1], score: 78 },
  { ...interestDimensions[3], score: 72 },
  { ...interestDimensions[4], score: 64 },
  { ...interestDimensions[2], score: 48 },
  { ...interestDimensions[5], score: 32 },
];

const demoSkillScores = [
  { ...skillDimensions[0], score: 84 },
  { ...skillDimensions[1], score: 76 },
  { ...skillDimensions[2], score: 68 },
  { ...skillDimensions[4], score: 62 },
  { ...skillDimensions[3], score: 55 },
  { ...skillDimensions[5], score: 42 },
];

export function mockTest(kind: "interests" | "skills", message?: string) {
  const scores = kind === "interests" ? demoInterestScores : demoSkillScores;
  return {
    scores,
    tags: Array.from(new Set(scores.flatMap((score) => score.tags))),
    summary:
      kind === "interests"
        ? "Demoanalüüsi põhjal paistavad esile sotsiaalne, uuriv ja loominguline huvisuund."
        : "Demoanalüüsi põhjal on tugevamad oskused suhtlemine, koostöö ja info mõtestamine.",
    source: "mock",
    message,
  };
}

export function mockFreeText(text = "", message?: string) {
  const hasText = Boolean(text.trim());
  return {
    tags: hasText ? ["huvi täpsustamine", "praktiline katsetamine"] : [],
    goals: hasText ? ["võrrelda mitut võimalikku suunda"] : [],
    concerns: hasText ? ["vajab lisainfot rollide igapäevatöö kohta"] : [],
    interestScores: hasText ? demoInterestScores.slice(0, 4).map((item) => ({ ...item, score: Math.max(45, item.score - 10) })) : [],
    skillScores: hasText ? demoSkillScores.slice(0, 4).map((item) => ({ ...item, score: Math.max(45, item.score - 8) })) : [],
    summary: hasText ? "Kasutaja soovib suunda täpsustada ja valikuid praktiliselt võrrelda." : "Vaba teksti sammu ei täidetud.",
    source: "mock",
    message,
  };
}

export function mockProfile(message?: string) {
  return {
    summary:
      "Minu praegune arusaam sinust on, et sind võivad kõnetada suunad, kus saab korraga **mõelda**, inimestega suhelda ja midagi päriselt ära teha. Sinu profiilis paistab olevat vajadus tähenduse järele: ainult teooria või ainult rutiinne töö ei pruugi olla kõige tugevam sobivus.\n\nHuvide poolelt tulevad esile **sotsiaalne huvi** ja **uuriv huvi**. Oskuste poolelt toetavad seda **suhtlemine**, **koostöö** ja **info mõtestamine**, mis võib sobida valdkondadesse, kus on vaja kuulata, küsida ja teha praktilisi järeldusi.\n\nSamas ei ole see lõplik hinnang. Seda tasub võtta kui esimest hüpoteesi, mida sina saad kohe parandada: võib-olla peaks rohkem arvestama **tehnoloogia**, looduse, loomade, bioloogia või mõne muu konkreetse huviga.",
    possibleJobDirections: ["noorsootöötaja", "personalispetsialist", "kommunikatsioonispetsialist", "sotsiaaltöötaja", "karjäärinõustaja"],
    possibleEducationDirections: ["noorsootöö", "sotsiaaltöö", "kommunikatsioon", "haridusteadused", "personalijuhtimine"],
    source: "mock",
    message,
  };
}
