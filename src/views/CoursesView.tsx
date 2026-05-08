import { useMemo, useState } from "react";
import { PlanButtons } from "../components/PlanButtons";
import { courses } from "../data/demoData";
import { filterTagsFor, matchesFilter, profileTags, rankByProfile, scoreCourse, weakSkillLabels } from "../utils/scoring";
import type { ActivePlanFilter, AppState, Course, PlanId } from "../types";

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
  addCourseToPlan: (planId: PlanId, courseId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const weakSkills = weakSkillLabels(state);
  const activeTags = filterTagsFor(state, state.activePlanFilter);
  const planIsEmpty = ["A", "B", "C"].includes(state.activePlanFilter) && activeTags.length === 0;
  const ranked = useMemo(() => {
    const tags = profileTags(state);
    return rankByProfile(courses, (course) => scoreCourse(course, tags, weakSkills));
  }, [state, weakSkills.join("|")]);
  const visible = ranked.filter((course) => {
    const haystack = `${course.title} ${course.description} ${course.tags.join(" ")}`.toLocaleLowerCase("et-EE");
    return haystack.includes(query.toLocaleLowerCase("et-EE")) && matchesFilter([...course.tags, ...course.domains, ...course.develops], activeTags, state.activePlanFilter);
  });

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V07</p>
        <h1>Kursused</h1>
        <p>Siin on kursused ja valikained, mis võivad sinu profiili või valitud plaani toetada.</p>
      </div>
      <Filters query={query} setQuery={setQuery} filter={state.activePlanFilter} setFilter={setFilter} />
      {planIsEmpty && <p className="notice notice-warn">Selles plaanis pole veel eriala ega ameteid. Lisa kõigepealt plaani edasiõppimisvõimalus või amet.</p>}
      <div className="grid two">
        {visible.map((course) => (
          <CourseCard course={course} addCourseToPlan={addCourseToPlan} key={course.id} />
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

function CourseCard({ course, addCourseToPlan }: { course: Course; addCourseToPlan: (planId: PlanId, courseId: string) => void }) {
  return (
    <article className="card">
      <p className="eyebrow">{course.type}</p>
      <h2>{course.title}</h2>
      <p>{course.description}</p>
      <p>
        <strong>Miks seda näen?</strong> {course.why}
      </p>
      <p>
        <strong>Arendab:</strong> {course.develops.join(", ")}
      </p>
      <ChipRow items={course.domains} />
      <PlanButtons onAdd={(planId) => addCourseToPlan(planId, course.id)} />
    </article>
  );
}

function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="chipRow">
      {items.map((item) => (
        <span className="chip" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}
