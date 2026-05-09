import { useState } from "react";
import { Notice } from "../components/Notice";
import { analyzeFreeText } from "../utils/api";
import type { FreeTextAnalysis } from "../types";

export function FreeTextView({ onDone }: { onDone: (text: string, analysis: FreeTextAnalysis) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(nextText = text) {
    setBusy(true);
    const analysis = await analyzeFreeText(nextText);
    setBusy(false);
    setMessage(analysis.message ?? "");
    onDone(nextText, analysis);
  }

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">2. samm</p>
        <h1>Lisa oma mõtted</h1>
        <p>Kirjuta vabas vormis, mis sind praegu huvitab, mida tulevikus kaalud või mille osas kahtled. See samm on vabatahtlik.</p>
      </div>
      {message && <Notice tone="warn">{message}</Notice>}
      <label>
        Sinu mõtted
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Näiteks: Mind huvitab IT, aga ma ei tea, kas mulle sobiks programmeerimine või pigem disain. Tahaksin teha tööd, kus on paindlikkus ja hea palk."
        />
      </label>
      <div className="buttonRow">
        <button className="primary" disabled={busy} onClick={() => submit()}>
          {busy ? "Analüüsin..." : "Jätka"}
        </button>
        <button className="secondary" onClick={() => submit("")}>
          Jäta vahele
        </button>
      </div>
    </section>
  );
}
