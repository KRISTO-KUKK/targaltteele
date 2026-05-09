import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { InlineRichText } from "../components/RichText";
import { analyzeProfileSummary } from "../utils/api";
import type { ProfileSummary, UserProfile } from "../types";

function splitIntoPhrases(paragraph: string) {
  return paragraph.match(/[^,.!?;:]+[,.!?;:]?\s*/g) ?? [paragraph];
}

const inFlightProfileSummaries = new Map<string, Promise<ProfileSummary>>();

function getProfileSummary(payload: unknown) {
  const key = JSON.stringify(payload);
  const existing = inFlightProfileSummaries.get(key);
  if (existing) return existing;
  const request = analyzeProfileSummary(payload).finally(() => {
    inFlightProfileSummaries.delete(key);
  });
  inFlightProfileSummaries.set(key, request);
  return request;
}

export function AIReviewView({
  user,
  onConfirm,
  onMessage,
}: {
  user: UserProfile;
  onConfirm: (summary: ProfileSummary) => void;
  onMessage: (message: string) => void;
}) {
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCorrection, setShowCorrection] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [correction, setCorrection] = useState("");
  const [showQuestion, setShowQuestion] = useState(false);

  const summaryParagraphs = useMemo(
    () =>
      summary?.summary
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean) ?? [],
    [summary],
  );

  useEffect(() => {
    let alive = true;
    async function run() {
      setLoading(true);
      setShowQuestion(false);
      const started = Date.now();
      const result = await getProfileSummary({
        profile: user,
        mode: "first_reflection",
        instruction: "Kirjuta keskmise pikkusega kasutajale suunatud arusaam sellest, millisena süsteem teda huvide, oskuste ja kirjelduste põhjal mõistis. Tõsta olulisemad märksõnad **boldina** esile.",
      });
      const remaining = Math.max(0, 950 - (Date.now() - started));
      window.setTimeout(() => {
        if (!alive) return;
        setSummary(result);
        setLoading(false);
        if (result.message) onMessage(result.message);
      }, remaining);
    }
    run();
    return () => {
      alive = false;
    };
  }, [user, onMessage]);

  useEffect(() => {
    if (!summary) return;
    setShowQuestion(false);
    const timer = window.setTimeout(() => setShowQuestion(true), 1900);
    return () => window.clearTimeout(timer);
  }, [summary]);

  async function submitCorrection() {
    const trimmedCorrection = correction.trim();
    if (!trimmedCorrection) return;
    setSubmittingCorrection(true);
    setShowQuestion(false);
    const result = await getProfileSummary({
      profile: user,
      previousSummary: summary?.summary,
      userCorrection: trimmedCorrection,
      mode: "corrected_reflection",
      instruction: "Kirjuta uus parandatud keskmise pikkusega arusaam. Võta kasutaja parandus tõsiselt, ära vaidle temaga ja tõsta olulisemad märksõnad **boldina** esile.",
    });
    setSummary(result);
    setCorrection("");
    setSubmittingCorrection(false);
    setShowCorrection(false);
    if (result.message) onMessage(result.message);
  }

  return (
    <section className="aiReviewShell">
      <div className="aiReviewIntro">
        <p className="eyebrow">AI peegeldus</p>
        <h1>Panen sinu profiili kokku</h1>
        <p>Enne protsentide ja soovituste avamist kontrollime, kas sain sinu suunast õigesti aru.</p>
      </div>

      {loading && (
        <div className="aiThinking card">
          <span />
          <span />
          <span />
          <p>Loen kokku sinu valdkonnad, mõtted ja testisignaalid...</p>
        </div>
      )}

      {!loading && summary && (
        <div className="aiReveal card">
          <h2>Nii sain ma sinust praegu aru</h2>
          <div className="aiLongText" aria-label={summary.summary}>
            {summaryParagraphs.map((paragraph, paragraphIndex) => {
              const phraseOffset = summaryParagraphs.slice(0, paragraphIndex).reduce((total, item) => total + splitIntoPhrases(item).length, 0);
              return (
                <p key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}>
                  {splitIntoPhrases(paragraph).map((phrase, phraseIndex) => (
                    <span
                      aria-hidden="true"
                      className="aiPhrase"
                      key={`${paragraphIndex}-${phraseIndex}-${phrase}`}
                      style={{ animationDelay: `${Math.min((phraseOffset + phraseIndex) * 44, 2600)}ms` }}
                    >
                      <InlineRichText text={phrase} />
                    </span>
                  ))}
                </p>
              );
            })}
          </div>

          {showQuestion && (
            <div className="aiQuestion">
              <Notice>Kas see kirjeldus tundub sinu kohta õige? Kui midagi läks mööda, paranda mind enne, kui soovitused avan.</Notice>
              <div className="buttonRow">
                <button className="primary" onClick={() => onConfirm(summary)}>
                  Jah, said
                </button>
                <button className="secondary" onClick={() => setShowCorrection(true)}>
                  Ei saanud
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCorrection && (
        <div className="card aiCorrection">
          <label>
            Mis jäi valesti või puudu?
            <textarea
              value={correction}
              onChange={(event) => setCorrection(event.target.value)}
              placeholder="Näiteks: Mind ei huvita tegelikult IT, pigem loomad ja bioloogia. Ma tahan praktilist tööd, mitte kontoritööd."
            />
          </label>
          <div className="buttonRow">
            <button className="primary" disabled={!correction.trim() || submittingCorrection} onClick={submitCorrection}>
              {submittingCorrection ? "Koostan uut ülevaadet..." : "Koosta uus ülevaade"}
            </button>
            <button className="ghost" disabled={submittingCorrection} onClick={() => setShowCorrection(false)}>
              Tühista
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
