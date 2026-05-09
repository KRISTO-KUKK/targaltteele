import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { getRecommendations, peekRecommendations, type RecommendationInput } from "../utils/api";
import type { AppState, AppView, CurriculumMatch, FieldMatch, RecommendationResponse } from "../types";

type Status = "idle" | "loading" | "ready" | "error";

export function RecommendationsView({ state, setView }: { state: AppState; setView: (view: AppView) => void }) {
  const payload = useMemo<RecommendationInput | null>(() => {
    const user = state.user;
    if (!user) return null;
    return {
      interestScores: user.interestScores.map(({ key, score }) => ({ key, score })),
      skillScores: user.skillScores.map(({ key, score }) => ({ key, score })),
      freeText: user.freeText,
      freeTextGoals: user.freeTextGoals,
      freeTextConcerns: user.freeTextConcerns,
      tags: Array.from(
        new Set([
          ...user.interestTags,
          ...user.skillTags,
          ...user.freeTextTags,
        ]),
      ),
      selectedDomains: user.selectedDomains,
      aiSummary: user.aiSummary,
    };
  }, [state.user]);
  const cached = payload ? peekRecommendations(payload) : undefined;
  const [data, setData] = useState<RecommendationResponse | null>(cached ?? null);
  const [status, setStatus] = useState<Status>(cached ? "ready" : "loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) return;
    let cancelled = false;
    const hot = peekRecommendations(payload);
    if (hot) {
      setData(hot);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
    setError(null);
    getRecommendations(payload)
      .then((response) => {
        if (cancelled) return;
        setData(response);
        setStatus("ready");
      })
      .catch((cause: Error) => {
        if (cancelled) return;
        setError(cause.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  if (!state.user) return null;

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">Soovitused</p>
        <h1>Sulle sobivad suunad</h1>
        <p>Alustame sinu enda tekstist, valitud valdkondadest ja märksõnadest. Testitulemused jäävad taustasignaaliks, mille põhjal kontrollime, kas suund toetub ka profiilile.</p>
      </div>

      {status === "loading" && <Notice>Arvutame ja koostame soovitusi...</Notice>}
      {status === "error" && <Notice tone="warn">Soovitusi ei õnnestunud laadida: {error}</Notice>}

      {data && (
        <>
          <div className="card">
            <p className="eyebrow">{data.source === "ai" ? "AI peenhäälestus" : "Matemaatiline sobitus"}</p>
            <h2>Selgitus</h2>
            <p>{data.explanation}</p>
            {data.message && <p className="muted">{data.message}</p>}
          </div>

          <div className="card">
            <h2>Soovitatud õppekavad</h2>
            <div className="grid two">
              {data.refinedCurricula.map((curriculum) => (
                <CurriculumCard key={curriculum.kood} curriculum={curriculum} />
              ))}
            </div>
            {data.refinedCurricula.length === 0 && <p className="muted">AI ei leidnud sobivat õppekava sinu profiilist.</p>}
          </div>

          <div className="card">
            <h2>Soovitatud lisakursused</h2>
            {data.suggestedCourses.length > 0 ? (
              <ul className="courseList">
                {data.suggestedCourses.map((course) => (
                  <li key={course.link}>
                    <a href={course.link} target="_blank" rel="noreferrer">
                      <strong>{course.pealkiri}</strong>
                    </a>
                    {course.reason && <p className="recommendReason">{course.reason}</p>}
                    {course.tags.length > 0 && (
                      <div className="chipRow">
                        {course.tags.slice(0, 6).map((tag) => (
                          <span className="chip" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Sobivaid lisakursusi ei leitud.</p>
            )}
          </div>

          <div className="card">
            <h2>Sobivaimad valdkonnad</h2>
            <p className="muted">Iga valdkonna juures näed paari näiteametit, et saaksid arusaama, mis tööd selles vallas tehakse.</p>
            <div className="grid two">
              {data.topFields.map((field) => (
                <FieldCard key={field.id} field={field} />
              ))}
            </div>
          </div>

          <div className="buttonRow">
            <button className="primary" onClick={() => setView("education")}>
              Vaata kõiki õppekavasid
            </button>
            <button className="secondary" onClick={() => setView("jobs")}>
              Vaata ameteid
            </button>
            <button className="ghost" onClick={() => setView("profile")}>
              Tagasi profiili
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function CurriculumCard({ curriculum }: { curriculum: CurriculumMatch }) {
  return (
    <article className="card">
      <p className="eyebrow">{curriculum.oppeaste || "Õppekava"}</p>
      <h3>{curriculum.pealkiri}</h3>
      <div className="metaLine">
        <span>Sobivusskoor {curriculum.matchScore}</span>
        {typeof curriculum.signalScore === "number" && <span>Sisukattuvus {curriculum.signalScore}</span>}
        <span>Kood {curriculum.kood}</span>
      </div>
      {curriculum.reason && <p className="recommendReason">{curriculum.reason}</p>}
      {curriculum.matchedSignals && curriculum.matchedSignals.length > 0 && (
        <div className="chipRow">
          {curriculum.matchedSignals.slice(0, 5).map((signal) => (
            <span className="chip" key={signal}>
              {signal}
            </span>
          ))}
        </div>
      )}
      {curriculum.sisu && <p>{curriculum.sisu.slice(0, 280)}{curriculum.sisu.length > 280 ? "…" : ""}</p>}
      {curriculum.url && (
        <p>
          <a href={curriculum.url} target="_blank" rel="noreferrer">
            Loe õppekava kodulehel →
          </a>
        </p>
      )}
    </article>
  );
}

function FieldCard({ field }: { field: FieldMatch }) {
  return (
    <article className="card">
      <p className="eyebrow">Valdkond · sobivus {field.matchScore}</p>
      <h3>{field.nimi}</h3>
      {typeof field.signalScore === "number" && field.signalScore > 0 && <p className="muted">Sisukattuvus sinu tekstiga: {field.signalScore}</p>}
      {field.kirjeldus && <p>{field.kirjeldus.slice(0, 240)}{field.kirjeldus.length > 240 ? "…" : ""}</p>}
      {field.sampleAmetid.length > 0 && (
        <>
          <p>
            <strong>Näiteametid:</strong> <span className="muted">(klõpsa, et lugeda kirjeldust)</span>
          </p>
          <div className="ametList">
            {field.sampleAmetid.slice(0, 5).map((amet) => (
              <details key={amet.id} className="ametItem">
                <summary>{amet.nimi}</summary>
                {amet.kirjeldus ? (
                  <p>
                    {amet.kirjeldus.slice(0, 600)}
                    {amet.kirjeldus.length > 600 ? "…" : ""}
                  </p>
                ) : (
                  <p className="muted">Selle ameti kirjeldus puudub.</p>
                )}
              </details>
            ))}
          </div>
        </>
      )}
      {field.tags.length > 0 && (
        <div className="chipRow">
          {field.tags.slice(0, 6).map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
