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
  const hasText = Boolean(text.trim());
  return {
    tags: hasText ? ["huvi täpsustamine", "paindlikkus", "praktiline katsetamine"] : [],
    goals: hasText ? ["leida suund, mida saab enne lõplikku valikut katsetada"] : [],
    concerns: hasText ? ["vajab lisainfot, milline roll päriselt sobib"] : [],
    interestScores: hasText ? demoInterestScores.slice(0, 4).map((item) => ({ ...item, score: Math.max(45, item.score - 10) })) : [],
    skillScores: hasText ? demoSkillScores.slice(0, 4).map((item) => ({ ...item, score: Math.max(45, item.score - 8) })) : [],
    summary: hasText
      ? "Sinu kirjeldus viitab soovile võrrelda mitut võimalikku suunda ja teha valik praktilise katsetamise kaudu."
      : "Vaba teksti sammu jätsid praegu vahele. Soovitused põhinevad testitulemustel ja valitud valdkondadel.",
    source: "mock",
    message,
  };
}

export function mockProfileSummary(message?: string): ProfileSummary {
  return {
    summary: `Minu praegune arusaam sinust on, et sulle võib sobida suund, kus saab **inimestega suhelda**, infot mõtestada ja päriselulist mõju luua. Sa ei otsi ilmselt ainult ühte ametinimetust, vaid kohta, kus huvid, õppimisviis ja tugevused omavahel kokku sobivad.\n\nHuvide poolelt paistab välja **sotsiaalne huvi** ja **uuriv huvi**: küsimuste esitamine, inimeste mõistmine ja soov aru saada, mis päriselt sobib. Oskuste poolelt toetavad seda **suhtlemine**, **koostöö** ja **info mõtestamine**.\n\nSee ei ole lõplik otsus, vaid kontrollitav hüpotees. Kui mõni oluline asi jäi puudu, näiteks **IT**, **bioloogia**, loomad, loovus või praktiline tehniline töö, saad seda enne soovituste avamist parandada.`,
    possibleJobDirections: ["noorsootöötaja", "personalispetsialist", "kommunikatsioonispetsialist", "sotsiaaltöötaja", "karjäärinõustaja"],
    possibleEducationDirections: ["noorsootöö", "sotsiaaltöö", "kommunikatsioon", "haridusteadused", "personalijuhtimine"],
    source: "mock",
    message,
  };
}
