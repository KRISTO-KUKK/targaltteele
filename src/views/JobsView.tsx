import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { PlanButtons } from "../components/PlanButtons";
import { getCatalogJobs, peekCatalogJobs } from "../utils/api";
import { buildCatalogQuery } from "../utils/catalogQuery";
import { filterTagsFor } from "../utils/scoring";
import type { ActivePlanFilter, AppState, CatalogAmet, PlanId, PlanJob } from "../types";

const filters: { value: ActivePlanFilter; label: string }[] = [
  { value: "all", label: "Kõik" },
  { value: "profile", label: "Profiili järgi" },
  { value: "A", label: "Plaan A järgi" },
  { value: "B", label: "Plaan B järgi" },
  { value: "C", label: "Plaan C järgi" },
];

export function JobsView({
  state,
  setFilter,
  addJobToPlan,
}: {
  state: AppState;
  setFilter: (filter: ActivePlanFilter) => void;
  addJobToPlan: (planId: PlanId, job: PlanJob) => void;
}) {
  const payload = useMemo(() => buildCatalogQuery(state), [state.user]);
  const cached = peekCatalogJobs(payload);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogAmet[]>(cached ?? []);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(cached ? "ready" : "loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const hot = peekCatalogJobs(payload);
    if (hot) {
      setItems(hot);
      setStatus("ready");
    } else {
      setStatus("loading");
    }
    setError(null);
    getCatalogJobs(payload)
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

  const activeTags = useMemo(() => filterTagsFor(state, state.activePlanFilter).map((tag) => tag.toLocaleLowerCase("et-EE")), [state]);

  const visible = useMemo(() => {
    const lowerQuery = query.toLocaleLowerCase("et-EE");
    return items.filter((amet) => {
      const haystack = `${amet.nimi} ${amet.kirjeldus} ${amet.fields.map((field) => field.nimi).join(" ")}`.toLocaleLowerCase("et-EE");
      if (lowerQuery && !haystack.includes(lowerQuery)) return false;
      if (state.activePlanFilter === "all" || state.activePlanFilter === "profile") return true;
      if (activeTags.length === 0) return false;
      return activeTags.some((tag) => haystack.includes(tag));
    });
  }, [items, query, activeTags, state.activePlanFilter]);

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V09</p>
        <h1>Ametid</h1>
        <p>Päris ametid oskused.ee andmebaasist on järjestatud nende töövaldkondade järgi, mis sinu profiilile lähemal on. Iga ametiga on näha valdkonnad, mis seda kõige rohkem kannavad.</p>
      </div>
      <Notice>Ametite soovitused on uurimiseks. Kontrolli alati, milline haridustee ja ettevalmistus on päriselt vajalik.</Notice>
      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Otsing" />
        <select value={state.activePlanFilter} onChange={(event) => setFilter(event.target.value as ActivePlanFilter)}>
          {filters.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {status === "loading" && <Notice>Laeme ametite andmebaasi...</Notice>}
      {status === "error" && <Notice tone="warn">Ametite laadimine ebaõnnestus: {error}</Notice>}
      {status === "ready" && <p className="muted">Näitan {visible.length} ametit kokku {items.length} seast.</p>}
      <div className="grid two">
        {visible.map((amet) => (
          <JobCard amet={amet} addJobToPlan={addJobToPlan} key={amet.id} />
        ))}
      </div>
    </section>
  );
}

function JobCard({ amet, addJobToPlan }: { amet: CatalogAmet; addJobToPlan: (planId: PlanId, job: PlanJob) => void }) {
  const snapshot: PlanJob = {
    id: amet.id,
    nimi: amet.nimi,
    kirjeldus: amet.kirjeldus,
  };
  return (
    <article className="card">
      <p className="eyebrow">Amet · sobivus {amet.matchScore}</p>
      <h2>{amet.nimi}</h2>
      {amet.kirjeldus && (
        <p>
          {amet.kirjeldus.slice(0, 320)}
          {amet.kirjeldus.length > 320 ? "…" : ""}
        </p>
      )}
      {amet.fields.length > 0 && (
        <p>
          <strong>Töövaldkonnad:</strong> {amet.fields.map((field) => field.nimi).join(", ")}
        </p>
      )}
      <PlanButtons onAdd={(planId) => addJobToPlan(planId, snapshot)} />
    </article>
  );
}
