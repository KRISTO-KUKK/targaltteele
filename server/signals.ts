export type SignalInput = {
  freeText?: string;
  freeTextGoals?: string[];
  freeTextConcerns?: string[];
  tags?: string[];
  selectedDomains?: string[];
  aiSummary?: string;
};

export type SignalHit = {
  key: string;
  label: string;
  weight: number;
  sources: string[];
};

export type SignalExtraction = {
  signals: SignalHit[];
  buzzwords: string[];
  keywordSet: Set<string>;
};

export type SignalScore = {
  score: number;
  matchedSignals: string[];
  matchedBuzzwords: string[];
};

type SignalDefinition = {
  key: string;
  label: string;
  aliases: string[];
};

const SIGNAL_DEFINITIONS: SignalDefinition[] = [
  { key: "programmeerimine", label: "programmeerimine", aliases: ["programmeerimine", "koodimine", "kood", "python", "javascript", "tarkvara", "tarkvaraarendus", "app", "rakendus", "veebiarendus"] },
  { key: "tehisintellekt", label: "tehisintellekt ja AI", aliases: ["tehisintellekt", "tehisaru", "ai", "masinope", "machine learning", "chatgpt", "andmemudel", "neurovork"] },
  { key: "andmeanaluus", label: "andmeanaluus", aliases: ["andmeanaluus", "andmed", "statistika", "data", "analytics", "analuus", "analyytik", "analuutik", "analyst", "excel", "bi", "andmebaas"] },
  { key: "kuberturvalisus", label: "kuberturvalisus", aliases: ["kuberturvalisus", "cyber", "hakkimine", "hacker", "infoturve", "turvatest", "võrguturve", "vorguturve"] },
  { key: "robootika", label: "robootika", aliases: ["robootika", "robot", "automaatika", "mehhatroonika", "arduino", "sensor", "droon"] },
  { key: "mangud", label: "mangud ja interaktiivne meedia", aliases: ["mang", "mangud", "game", "gaming", "unity", "unreal", "3d", "animatsioon", "interaktiivne"] },
  { key: "disain", label: "disain", aliases: ["disain", "ux", "ui", "kasutajakogemus", "graafiline", "visuaal", "kujundus", "tootedisain"] },
  { key: "kunst", label: "kunst ja loovtood", aliases: ["kunst", "joonistamine", "maalimine", "illustratsioon", "loovtoo", "loovus", "fotograafia", "video"] },
  { key: "kirjutamine", label: "kirjutamine", aliases: ["kirjutamine", "tekst", "lugemine", "toimetamine", "sisuloome", "copywriting", "ajakirjandus", "stsenaarium"] },
  { key: "meedia", label: "meedia ja kommunikatsioon", aliases: ["meedia", "kommunikatsioon", "turundus", "marketing", "sotsiaalmeedia", "pr", "reklaam", "avalik esinemine", "podcast"] },
  { key: "ettevotlus", label: "ettevotlus", aliases: ["ettevotlus", "ettevotja", "startup", "ari", "bisnes", "müük", "muuk", "klient", "e-kaubandus"] },
  { key: "juhtimine", label: "juhtimine", aliases: ["juhtimine", "juht", "projektijuht", "eestvedamine", "meeskond", "organiseerimine", "koordineerimine"] },
  { key: "rahandus", label: "rahandus ja majandus", aliases: ["rahandus", "finants", "majandus", "investeerimine", "raha", "palk", "trader", "trading", "kauplemine", "aktsiad", "börs", "bours", "raamatupidamine", "pank", "maks", "eelarve"] },
  { key: "oigus", label: "oigus", aliases: ["oigus", "juura", "jurist", "advokaat", "seadus", "riigioigus", "kriminoloogia", "notar"] },
  { key: "avalik_sektor", label: "avalik sektor ja poliitika", aliases: ["avalik sektor", "riik", "omavalitsus", "poliitika", "diplomaatia", "valitsemine", "administratsioon"] },
  { key: "opetamine", label: "opetamine ja haridus", aliases: ["opetamine", "opetaja", "haridus", "juhendamine", "kool", "õpetamine", "õpetaja", "pedagoogika", "didaktika"] },
  { key: "noortetoo", label: "noortetoo", aliases: ["noorsootoo", "noortetoo", "noored", "huvijuht", "laager", "noorteprojekt", "mentor"] },
  { key: "psuhholoogia", label: "psuhholoogia", aliases: ["psuhholoogia", "psühholoogia", "inimkäitumine", "inimkaitumine", "teraapia", "noustamine", "nõustamine", "vaimne tervis"] },
  { key: "sotsiaaltoo", label: "sotsiaaltoo ja aitamine", aliases: ["sotsiaaltoo", "sotsiaaltöö", "aitamine", "vabatahtlik", "kogukond", "tugiisik", "hoolekanne", "sotsiaalne"] },
  { key: "meditsiin", label: "meditsiin ja tervishoid", aliases: ["meditsiin", "arst", "tervishoid", "haigla", "ravi", "ode", "õde", "kiirabi", "patsient"] },
  { key: "farmaatsia", label: "farmaatsia", aliases: ["farmaatsia", "ravim", "proviisor", "apteek", "farmakoloogia", "biokeemia"] },
  { key: "bioloogia", label: "bioloogia", aliases: ["bioloogia", "geneetika", "bioinformaatika", "molekulaar", "loodusteadus", "rakubioloogia", "evolutsioon"] },
  { key: "loomad", label: "loomad", aliases: ["loomad", "loom", "veterinaaria", "veterinaar", "lemmikloom", "zooloogia", "elusloodus"] },
  { key: "keskkond", label: "keskkond ja loodus", aliases: ["keskkond", "loodus", "kliima", "taastuvenergia", "ökoloogia", "okoloogia", "mets", "meri", "geograafia"] },
  { key: "keemia", label: "keemia", aliases: ["keemia", "labor", "laboritoo", "orgaaniline", "anorgaaniline", "katse", "eksperiment"] },
  { key: "fuusika", label: "fuusika", aliases: ["fuusika", "füüsika", "mehaanika", "elekter", "elektroonika", "optika", "kosmos", "astronoomia"] },
  { key: "matemaatika", label: "matemaatika", aliases: ["matemaatika", "matem", "arvutus", "loogika", "algoritm", "valem", "olumpiaad"] },
  { key: "inseneeria", label: "inseneeria", aliases: ["inseneeria", "insener", "tehnika", "tootmine", "masin", "projekteerimine", "cad", "materjal"] },
  { key: "ehitus", label: "ehitus ja arhitektuur", aliases: ["ehitus", "arhitektuur", "hoone", "renoveerimine", "sisearhitektuur", "planeerimine"] },
  { key: "transport", label: "transport ja logistika", aliases: ["transport", "logistika", "tarneahel", "lennundus", "auto", "raudtee", "laevandus"] },
  { key: "põllumajandus", label: "põllumajandus ja toit", aliases: ["põllumajandus", "pollumajandus", "toit", "kokandus", "toiduainetööstus", "aiandus", "taimed"] },
  { key: "keeled", label: "keeled", aliases: ["keel", "keeled", "inglise", "saksa", "prantsuse", "hispaania", "tõlkimine", "tolkimine", "lingvistika"] },
  { key: "ajalugu", label: "ajalugu ja kultuur", aliases: ["ajalugu", "kultuur", "muuseum", "arheoloogia", "pärand", "parand", "religioon", "antiik"] },
  { key: "muusika", label: "muusika", aliases: ["muusika", "pill", "laulmine", "helitehnika", "produtseerimine", "bänd", "band", "tants"] },
  { key: "sport", label: "sport ja liikumine", aliases: ["sport", "treener", "liikumine", "fitness", "füsioteraapia", "fusioteraapia", "kehaline"] },
  { key: "turism", label: "turism ja teenindus", aliases: ["turism", "reis", "hotell", "teenindus", "üritus", "uritus", "event", "restoran"] },
  { key: "kaitse", label: "kaitse ja turvalisus", aliases: ["kaitse", "politsei", "paaste", "pääste", "militaar", "julgeolek", "turvalisus"] },
  { key: "praktiline", label: "praktiline too", aliases: ["praktiline", "käeline", "kaeline", "remont", "tööriist", "tooriist", "meisterdamine", "valmistamine"] },
  { key: "inimesed", label: "inimestega suhtlemine", aliases: ["inimesed", "suhtlemine", "koostoo", "koostöö", "meeskonnatoo", "kuulamine", "esinemine"] },
];

const DOMAIN_SIGNAL_MAP: Array<{ patterns: string[]; keys: string[] }> = [
  { patterns: ["it", "digitehnoloogia"], keys: ["programmeerimine", "tehisintellekt", "andmeanaluus", "kuberturvalisus", "robootika", "disain"] },
  { patterns: ["tervis", "heaolu"], keys: ["meditsiin", "psuhholoogia", "sport", "farmaatsia", "bioloogia"] },
  { patterns: ["haridus", "noorsoo"], keys: ["opetamine", "noortetoo", "psuhholoogia", "sotsiaaltoo"] },
  { patterns: ["sotsiaal", "kogukond"], keys: ["sotsiaaltoo", "psuhholoogia", "inimesed", "noortetoo"] },
  { patterns: ["meedia", "kommunikatsioon"], keys: ["meedia", "kirjutamine", "disain", "kunst"] },
  { patterns: ["ettevotlus", "juhtimine"], keys: ["ettevotlus", "juhtimine", "rahandus", "meedia"] },
  { patterns: ["oigus", "avalik"], keys: ["oigus", "avalik_sektor", "juhtimine"] },
  { patterns: ["loodus", "keskkond"], keys: ["keskkond", "bioloogia", "loomad", "keemia", "fuusika"] },
  { patterns: ["kunst", "disain", "loov"], keys: ["kunst", "disain", "meedia", "muusika", "mangud"] },
  { patterns: ["tehnika", "inseneeria"], keys: ["inseneeria", "robootika", "fuusika", "ehitus", "transport"] },
  { patterns: ["majandus", "finants"], keys: ["rahandus", "andmeanaluus", "ettevotlus"] },
  { patterns: ["turism", "teenindus", "uritus"], keys: ["turism", "inimesed", "meedia", "keeled"] },
];

const STOPWORDS = new Set([
  "ning",
  "sest",
  "olen",
  "tahan",
  "tahaks",
  "mulle",
  "meeldib",
  "huvitab",
  "huvitavad",
  "kuidas",
  "mida",
  "vaid",
  "vaga",
  "väga",
  "pigem",
  "natuke",
  "rohkem",
  "praegu",
  "tulevikus",
  "eriala",
  "erialad",
  "tood",
  "tööd",
  "tootada",
  "töötada",
  "oppida",
  "õppida",
]);

const definitionByKey = new Map(SIGNAL_DEFINITIONS.map((definition) => [definition.key, definition]));

export function normalizeForMatch(value: string): string {
  return value
    .toLocaleLowerCase("et-EE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[õ]/g, "o")
    .replace(/[ä]/g, "a")
    .replace(/[ö]/g, "o")
    .replace(/[ü]/g, "u")
    .replace(/[š]/g, "s")
    .replace(/[ž]/g, "z")
    .replace(/[_/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractUserSignals(input: SignalInput): SignalExtraction {
  const hits = new Map<string, SignalHit>();
  const sourceChunks: Array<{ source: string; text: string; weight: number }> = [
    { source: "vaba tekst", text: input.freeText ?? "", weight: 6 },
    { source: "eesmärgid", text: (input.freeTextGoals ?? []).join(" "), weight: 5 },
    { source: "valitud valdkonnad", text: (input.selectedDomains ?? []).join(" "), weight: 5 },
    { source: "märksõnad", text: (input.tags ?? []).join(" "), weight: 3 },
    { source: "AI peegeldus", text: input.aiSummary ?? "", weight: 1.5 },
  ];

  for (const chunk of sourceChunks) {
    const normalizedText = normalizeForMatch(chunk.text);
    if (!normalizedText) continue;
    for (const definition of SIGNAL_DEFINITIONS) {
      if (definition.aliases.some((alias) => containsTerm(normalizedText, normalizeForMatch(alias)))) {
        addHit(hits, definition, chunk.weight, chunk.source);
      }
    }
  }

  for (const domain of input.selectedDomains ?? []) {
    const normalizedDomain = normalizeForMatch(domain);
    for (const mapping of DOMAIN_SIGNAL_MAP) {
      if (mapping.patterns.some((pattern) => normalizedDomain.includes(normalizeForMatch(pattern)))) {
        for (const key of mapping.keys) {
          const definition = definitionByKey.get(key);
          if (definition) addHit(hits, definition, 4, "valitud valdkonnad");
        }
      }
    }
  }

  const buzzwords = extractBuzzwords(input);
  const signals = Array.from(hits.values()).sort((a, b) => b.weight - a.weight || a.label.localeCompare(b.label, "et-EE"));
  const keywordSet = new Set<string>([
    ...signals.flatMap((signal) => {
      const definition = definitionByKey.get(signal.key);
      return [signal.key, signal.label, ...(definition?.aliases ?? [])].map(normalizeForMatch);
    }),
    ...buzzwords,
  ]);

  return { signals, buzzwords, keywordSet };
}

export function scoreTextAgainstSignals(text: string, extraction: SignalExtraction): SignalScore {
  const haystack = normalizeForMatch(text);
  const matchedSignals: string[] = [];
  const matchedBuzzwords: string[] = [];
  let raw = 0;

  for (const signal of extraction.signals) {
    const definition = definitionByKey.get(signal.key);
    const terms = [signal.key, signal.label, ...(definition?.aliases ?? [])].map(normalizeForMatch);
    const matchCount = terms.reduce((count, term) => count + (containsTerm(haystack, term) ? 1 : 0), 0);
    if (matchCount > 0) {
      matchedSignals.push(signal.label);
      raw += Math.min(10, signal.weight) * Math.min(2, matchCount);
    }
  }

  for (const buzzword of extraction.buzzwords) {
    if (containsTerm(haystack, buzzword)) {
      matchedBuzzwords.push(buzzword);
      raw += 2;
    }
  }

  return {
    score: Math.min(100, Math.round(raw * 3)),
    matchedSignals: Array.from(new Set(matchedSignals)).slice(0, 8),
    matchedBuzzwords: Array.from(new Set(matchedBuzzwords)).slice(0, 8),
  };
}

export function summarizeSignals(extraction: SignalExtraction): string[] {
  return extraction.signals.slice(0, 14).map((signal) => `${signal.label} (${signal.sources.join(", ")})`);
}

function addHit(hits: Map<string, SignalHit>, definition: SignalDefinition, weight: number, source: string) {
  const existing = hits.get(definition.key);
  if (existing) {
    existing.weight += weight;
    if (!existing.sources.includes(source)) existing.sources.push(source);
    return;
  }
  hits.set(definition.key, {
    key: definition.key,
    label: definition.label,
    weight,
    sources: [source],
  });
}

function containsTerm(haystack: string, term: string) {
  if (!term) return false;
  if (term.length <= 4 && !term.includes(" ")) {
    return haystack.split(/\s+/).includes(term);
  }
  if (!term.includes(" ")) {
    return haystack.split(/\s+/).some((token) => token === term || token.startsWith(term));
  }
  return haystack.includes(term);
}

function extractBuzzwords(input: SignalInput): string[] {
  const text = normalizeForMatch(
    [
      input.freeText ?? "",
      ...(input.freeTextGoals ?? []),
      ...(input.tags ?? []),
      ...(input.selectedDomains ?? []),
    ].join(" "),
  );
  const counts = new Map<string, number>();
  for (const word of text.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (word.length < 5 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "et-EE"))
    .slice(0, 18)
    .map(([word]) => word);
}
