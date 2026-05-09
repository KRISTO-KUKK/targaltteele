import { useState } from "react";
import { Notice } from "../components/Notice";
import { analyzeTest } from "../utils/api";
import { mockTestAnalysis } from "../utils/mockAnalyzer";
import type { TestAnalysis } from "../types";

export function TestResultView({
  title,
  description,
  linkLabel,
  linkUrl,
  analyzeLabel,
  demoLabel,
  skipLabel,
  kind,
  onDone,
}: {
  title: string;
  description: string;
  linkLabel: string;
  linkUrl: string;
  analyzeLabel: string;
  demoLabel: string;
  skipLabel: string;
  kind: "interests" | "skills";
  onDone: (analysis: TestAnalysis) => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function analyze() {
    setBusy(true);
    setMessage("");
    try {
      const result = await analyzeTest(kind, text, file);
      setMessage(result.message ?? (result.source === "mock" ? "AI analüüsi ei saanud hetkel teha. Kasutasime demoandmeid, et prototüübi teekonda saaks edasi vaadata." : ""));
      onDone(result);
    } finally {
      setBusy(false);
    }
  }

  function useDemo() {
    if (busy) return;
    onDone(mockTestAnalysis(kind));
  }

  function skip() {
    if (busy) return;
    onDone({
      scores: [],
      tags: [],
      summary: kind === "interests" ? "Huvide test jäeti praegu vahele." : "Oskuste test jäeti praegu vahele.",
      source: "mock",
    });
  }

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">Tulemuse import</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <Notice>
        See samm on väga soovitatav, sest annab AI-le parema aluse sind suunata, aga prototüüpi saab jätkata ka ilma testita.
      </Notice>

      <Notice>
        Selles prototüübis saadetakse üles laaditud või kleebitud testi tulemus AI analüüsiks lokaalse serveri kaudu OpenAI API-sse. Ära laadi siia
        tundlikke isikuandmeid. Demo seis salvestub ainult sinu brauseri localStorage'isse.
      </Notice>
      {message && <Notice tone="warn">{message}</Notice>}

      <div className="card">
        <a className={`buttonLink ${busy ? "disabledLink" : ""}`} href={busy ? undefined : linkUrl} aria-disabled={busy} tabIndex={busy ? -1 : 0} target="_blank" rel="noreferrer">
          {linkLabel}
        </a>
      </div>

      {busy && (
        <div className="progressPanel" role="status" aria-live="polite">
          <div className="progressRing" aria-hidden="true" />
          <div>
            <strong>Palun oota, võib minut võtta.</strong>
            <p>Loen faili teksti välja ja lasen AI-l tulemuse huvideks või oskusteks koondada. Selle ajal on teised valikud lukus.</p>
            <div className="progressTrack">
              <span />
            </div>
          </div>
        </div>
      )}

      <div className="grid two">
        <label>
          Laadi tulemus üles
          <input disabled={busy} accept=".txt,.pdf,.png,.jpg,.jpeg,text/plain,application/pdf,image/png,image/jpeg" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>
          Kleebi tulemuse tekst
          <textarea disabled={busy} value={text} onChange={(event) => setText(event.target.value)} placeholder="Kleebi siia testi tulemuse tekst või kokkuvõte." />
        </label>
      </div>

      <div className="buttonRow">
        <button className="primary" disabled={busy} onClick={analyze}>
          {busy ? "Analüüsin..." : analyzeLabel}
        </button>
        <button className="secondary" disabled={busy} onClick={useDemo}>
          {demoLabel}
        </button>
        <button className="ghost" disabled={busy} onClick={skip}>
          {skipLabel}
        </button>
      </div>
    </section>
  );
}
