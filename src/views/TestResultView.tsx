import { useEffect, useRef, useState } from "react";
import { Notice } from "../components/Notice";
import { analyzeTest } from "../utils/api";
import type { TestAnalysis } from "../types";

export function TestResultView({
  title,
  description,
  linkLabel,
  linkUrl,
  analyzeLabel,
  skipLabel,
  kind,
  onDone,
}: {
  title: string;
  description: string;
  linkLabel: string;
  linkUrl: string;
  analyzeLabel: string;
  skipLabel: string;
  kind: "interests" | "skills";
  onDone: (analysis: TestAnalysis) => void;
}) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const isMounted = useRef(true);
  const requestId = useRef(0);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      requestId.current += 1;
    };
  }, []);

  async function analyze() {
    const activeRequestId = requestId.current + 1;
    requestId.current = activeRequestId;
    setBusy(true);
    setMessage("");
    try {
      const result = await analyzeTest(kind, text, file);
      if (!isMounted.current || requestId.current !== activeRequestId) return;
      setMessage(result.message ?? (result.source === "local" ? "AI analüüsi ei saanud hetkel teha. Näidisandmeid ei kasutata; palun proovi uuesti või kleebi testi protsendid tekstina." : ""));
      if (result.scores.length === 0 && result.message) {
        return;
      }
      onDone(result);
    } finally {
      if (isMounted.current && requestId.current === activeRequestId) {
        setBusy(false);
      }
    }
  }

  function skip() {
    if (busy) return;
    onDone({
      scores: [],
      tags: [],
      summary: kind === "interests" ? "Huvide test jäeti praegu vahele." : "Oskuste test jäeti praegu vahele.",
      source: "local",
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
        tundlikke isikuandmeid. Seis salvestub ainult sinu brauseri localStorage'isse.
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
        <button className="ghost" disabled={busy} onClick={skip}>
          {skipLabel}
        </button>
      </div>
    </section>
  );
}
