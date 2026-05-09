import { useEffect, useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { PlanButtons } from "../components/PlanButtons";
import { getCatalogCourses } from "../utils/api";
import { buildCatalogQuery } from "../utils/catalogQuery";
import { filterTagsFor } from "../utils/scoring";
import type { ActivePlanFilter, AppState, CatalogCourse, PlanCourse, PlanId } from "../types";

const filters: { value: ActivePlanFilter; label: string }[] = [
  { value: "all", label: "Kõik soovitused" },
  { value: "profile", label: "Profiili järgi" },
  { value: "A", label: "Plaan A järgi" },
  { value: "B", label: "Plaan B järgi" },
  { value: "C", label: "Plaan C järgi" },
];

export function CoursesView({
  state,
  setFilter,
  addCourseToPlan,
}: {
  state: AppState;
  setFilter: (filter: ActivePlanFilter) => void;
  addCourseToPlan: (planId: PlanId, course: PlanCourse) => void;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<CatalogCourse[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);
    getCatalogCourses(buildCatalogQuery(state))
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
  }, [state.user]);

  const activeTags = useMemo(() => filterTagsFor(state, state.activePlanFilter).map((tag) => tag.toLocaleLowerCase("et-EE")), [state]);
  const planIsEmpty = ["A", "B", "C"].includes(state.activePlanFilter) && activeTags.length === 0;

  const visible = useMemo(() => {
    const lowerQuery = query.toLocaleLowerCase("et-EE");
    return items.filter((course) => {
      const haystack = `${course.pealkiri} ${course.sisu} ${course.tags.join(" ")}`.toLocaleLowerCase("et-EE");
      if (lowerQuery && !haystack.includes(lowerQuery)) return false;
      if (state.activePlanFilter === "all" || state.activePlanFilter === "profile") return true;
      if (activeTags.length === 0) return false;
      return activeTags.some((tag) => haystack.includes(tag));
    });
  }, [items, query, activeTags, state.activePlanFilter]);

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V07</p>
        <h1>Kursused</h1>
        <p>Päris lisakursused Eesti ülikoolide ja õppekeskuste andmestikust. Järjestus tugineb sinu sisestatud huvidele, oskustele, vabale tekstile ja siltidele.</p>
      </div>
      <Filters query={query} setQuery={setQuery} filter={state.activePlanFilter} setFilter={setFilter} />
      {status === "loading" && <Notice>Laeme lisakursuste andmebaasi...</Notice>}
      {status === "error" && <Notice tone="warn">Kursuste laadimine ebaõnnestus: {error}</Notice>}
      {planIsEmpty && <Notice tone="warn">Selles plaanis pole veel eriala ega ameteid. Lisa kõigepealt plaani edasiõppimisvõimalus või amet.</Notice>}
      {status === "ready" && (
        <p className="muted">Näitan {visible.length} kursust kokku {items.length} seast.</p>
      )}
      <div className="grid two">
        {visible.map((course) => (
          <CourseCard course={course} addCourseToPlan={addCourseToPlan} key={course.link} />
        ))}
      </div>
    </section>
  );
}

function Filters({
  query,
  setQuery,
  filter,
  setFilter,
}: {
  query: string;
  setQuery: (query: string) => void;
  filter: ActivePlanFilter;
  setFilter: (filter: ActivePlanFilter) => void;
}) {
  return (
    <div className="filters">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Otsi kursust" />
      <select value={filter} onChange={(event) => setFilter(event.target.value as ActivePlanFilter)}>
        {filters.map((item) => (
          <option value={item.value} key={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CourseCard({ course, addCourseToPlan }: { course: CatalogCourse; addCourseToPlan: (planId: PlanId, course: PlanCourse) => void }) {
  const snapshot: PlanCourse = {
    link: course.link,
    pealkiri: course.pealkiri,
    sisu: course.sisu,
    tags: course.tags,
  };
  return (
    <article className="card">
      <p className="eyebrow">Lisakursus · sobivus {course.matchScore}</p>
      <h2>{course.pealkiri}</h2>
      {course.sisu && (
        <p>
          {course.sisu.slice(0, 280)}
          {course.sisu.length > 280 ? "…" : ""}
        </p>
      )}
      {course.tags.length > 0 && (
        <div className="chipRow">
          {course.tags.slice(0, 8).map((tag) => (
            <span className="chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {course.link && (
        <p>
          <a href={course.link} target="_blank" rel="noreferrer">
            Vaata kursust →
          </a>
        </p>
      )}
      <PlanButtons onAdd={(planId) => addCourseToPlan(planId, snapshot)} />
    </article>
  );
}
