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
  kind,
  onDone,
}: {
  title: string;
  description: string;
  linkLabel: string;
  linkUrl: string;
  analyzeLabel: string;
  demoLabel: string;
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
    const result = await analyzeTest(kind, text, file);
    setBusy(false);
    setMessage(result.message ?? (result.source === "mock" ? "AI analüüsi ei saanud hetkel teha. Kasutasime demoandmeid, et prototüübi teekonda saaks edasi vaadata." : ""));
    onDone(result);
  }

  function useDemo() {
    onDone(mockTestAnalysis(kind));
  }

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">Tulemuse import</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <Notice>
        Selles prototüübis saadetakse üles laaditud või kleebitud testi tulemus AI analüüsiks lokaalse serveri kaudu OpenAI API-sse. Ära laadi siia
        tundlikke isikuandmeid. Demo seis salvestub ainult sinu brauseri localStorage'isse.
      </Notice>
      {message && <Notice tone="warn">{message}</Notice>}

      <div className="card">
        <a className="buttonLink" href={linkUrl} target="_blank" rel="noreferrer">
          {linkLabel}
        </a>
      </div>

      <div className="grid two">
        <label>
          Laadi tulemus üles
          <input accept=".txt,.pdf,.png,.jpg,.jpeg,text/plain,application/pdf,image/png,image/jpeg" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>
          Kleebi tulemuse tekst
          <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Kleebi siia testi tulemuse tekst või kokkuvõte." />
        </label>
      </div>

      <div className="buttonRow">
        <button className="primary" disabled={busy} onClick={analyze}>
          {busy ? "Analüüsin..." : analyzeLabel}
        </button>
        <button className="secondary" onClick={useDemo}>
          {demoLabel}
        </button>
      </div>
    </section>
  );
}
