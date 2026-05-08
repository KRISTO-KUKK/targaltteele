const demoInterestScores = [
  { key: "people", label: "Inimestega töötamine", score: 86, tags: ["inimesed", "nõustamine", "haridus"] },
  { key: "society", label: "Ühiskond ja kogukond", score: 78, tags: ["ühiskond", "kogukond", "avalik sektor"] },
  { key: "communication", label: "Kirjutamine ja kommunikatsioon", score: 72, tags: ["meedia", "kirjutamine", "kommunikatsioon"] },
  { key: "creative", label: "Loov probleemilahendus", score: 64, tags: ["loovus", "probleemilahendus"] },
  { key: "digital", label: "Digilahendused", score: 48, tags: ["IT", "digioskused"] },
  { key: "practical", label: "Praktiline tehniline töö", score: 32, tags: ["tehnika", "praktiline"] },
];

const demoSkillScores = [
  { key: "communication", label: "Suhtlemine", score: 84, tags: ["suhtlemine", "nõustamine"] },
  { key: "teamwork", label: "Koostöö", score: 80, tags: ["koostöö", "meeskond"] },
  { key: "writing", label: "Kirjalik eneseväljendus", score: 76, tags: ["kirjutamine", "kommunikatsioon"] },
  { key: "analysis", label: "Analüütiline mõtlemine", score: 68, tags: ["analüüs", "probleemilahendus"] },
  { key: "selfManagement", label: "Enesejuhtimine", score: 62, tags: ["iseseisvus", "planeerimine"] },
  { key: "digital", label: "Digioskused", score: 50, tags: ["IT", "digioskused"] },
];

export function mockTest(kind: "interests" | "skills", message?: string) {
  const scores = kind === "interests" ? demoInterestScores : demoSkillScores;
  return {
    scores,
    tags: Array.from(new Set(scores.flatMap((score) => score.tags))),
    summary:
      kind === "interests"
        ? "Demoanalüüsi põhjal paistavad esile inimestega töötamine, kogukond ja kommunikatsioon."
        : "Demoanalüüsi põhjal on tugevamad üldoskused suhtlemine, koostöö ja kirjalik eneseväljendus.",
    source: "mock",
    message,
  };
}

export function mockFreeText(text = "", message?: string) {
  return {
    tags: text.trim() ? ["huvi täpsustamine", "praktiline katsetamine"] : [],
    goals: text.trim() ? ["võrrelda mitut võimalikku suunda"] : [],
    concerns: text.trim() ? ["vajab lisainfot rollide igapäevatöö kohta"] : [],
    summary: text.trim() ? "Kasutaja soovib suunda täpsustada ja valikuid praktiliselt võrrelda." : "Vaba teksti sammu ei täidetud.",
    source: "mock",
    message,
  };
}

export function mockProfile(message?: string) {
  return {
    summary:
      "Sinu sisestatud andmete põhjal paistab, et sind huvitavad eelkõige inimesed, ühiskondlikud teemad ja eneseväljendus. Selle põhjal võiksid edasi uurida suundi, kus on ühendatud inimeste toetamine, info mõtestamine ja suhtlemine.",
    possibleJobDirections: ["noorsootöötaja", "personalispetsialist", "kommunikatsioonispetsialist", "sotsiaaltöötaja", "karjäärinõustaja"],
    possibleEducationDirections: ["noorsootöö", "sotsiaaltöö", "kommunikatsioon", "haridusteadused", "personalijuhtimine"],
    source: "mock",
    message,
  };
}
