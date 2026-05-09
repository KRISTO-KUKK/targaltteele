import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { PlanButtons } from "../components/PlanButtons";
import { getCatalogCurricula, peekCatalogCurricula } from "../utils/api";
import { buildCatalogQuery } from "../utils/catalogQuery";
import type { AppState, CatalogCurriculum, PlanEducation, PlanId } from "../types";

export function EducationView({
  state,
  setEducationForPlan,
}: {
  state: AppState;
  setEducationForPlan: (planId: PlanId, education: PlanEducation) => void;
}) {
  const payload = useMemo(() => buildCatalogQuery(state), [state.user]);
  const cached = peekCatalogCurricula(payload);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("Kõik");
  const [items, setItems] = useState<CatalogCurriculum[]>(cached ?? []);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(cached ? "ready" : "loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hot = peekCatalogCurricula(payload);
    if (hot) {
      setItems(hot);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
    setError(null);
    getCatalogCurricula(payload)
      .then((response) => {
        if (cancelled) return;
        setItems(response);
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

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const curriculum of items) if (curriculum.oppeaste) set.add(curriculum.oppeaste);
    return ["Kõik", ...Array.from(set).sort((a, b) => a.localeCompare(b, "et-EE"))];
  }, [items]);

  const visible = useMemo(() => {
    const lowerQuery = query.toLocaleLowerCase("et-EE");
    return items.filter((curriculum) => {
      const haystack = `${curriculum.pealkiri} ${curriculum.sisu} ${curriculum.oppeaste}`.toLocaleLowerCase("et-EE");
      if (lowerQuery && !haystack.includes(lowerQuery)) return false;
      if (level !== "Kõik" && curriculum.oppeaste !== level) return false;
      return true;
    });
  }, [items, query, level]);

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V08</p>
        <h1>Edasiõppimisvõimalused</h1>
        <p>Päris õppekavad EHIS-e andmestikust on järjestatud sinu 12-punktise huvi- ja oskuseprofiili järgi (kaalutud Eukleidiline kaugus). Vabateksti märksõnad annavad lisapunkte.</p>
      </div>
      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Otsing" />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          {levels.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {status === "loading" && <Notice>Laeme õppekavasid...</Notice>}
      {status === "error" && <Notice tone="warn">Õppekavade laadimine ebaõnnestus: {error}</Notice>}
      {status === "ready" && <p className="muted">Näitan {visible.length} õppekava kokku {items.length} seast.</p>}
      <div className="grid two">
        {visible.map((curriculum) => (
          <EducationCard curriculum={curriculum} setEducationForPlan={setEducationForPlan} key={curriculum.kood} />
        ))}
      </div>
    </section>
  );
}

function EducationCard({
  curriculum,
  setEducationForPlan,
}: {
  curriculum: CatalogCurriculum;
  setEducationForPlan: (planId: PlanId, education: PlanEducation) => void;
}) {
  const snapshot: PlanEducation = {
    kood: curriculum.kood,
    pealkiri: curriculum.pealkiri,
    oppeaste: curriculum.oppeaste,
    url: curriculum.url,
  };
  return (
    <article className="card">
      <p className="eyebrow">{curriculum.oppeaste || "Õppekava"} · sobivus {curriculum.matchScore}</p>
      <h2>{curriculum.pealkiri}</h2>
      <p className="metaLine">
        <span>Kood {curriculum.kood}</span>
      </p>
      {curriculum.sisu && (
        <p>
          {curriculum.sisu.slice(0, 320)}
          {curriculum.sisu.length > 320 ? "…" : ""}
        </p>
      )}
      {curriculum.url && (
        <p>
          <a href={curriculum.url} target="_blank" rel="noreferrer">
            Vaata õppekava →
          </a>
        </p>
      )}
      <PlanButtons onAdd={(planId) => setEducationForPlan(planId, snapshot)} />
    </article>
  );
}
