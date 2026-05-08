import { useMemo, useState } from "react";
import { Notice } from "../components/Notice";
import { PlanButtons } from "../components/PlanButtons";
import { educationOptions, jobs } from "../data/demoData";
import { filterTagsFor, matchesFilter, profileTags, rankByProfile, scoreJob } from "../utils/scoring";
import type { ActivePlanFilter, AppState, Job, PlanId } from "../types";

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
  addJobToPlan: (planId: PlanId, jobId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const activeTags = filterTagsFor(state, state.activePlanFilter);
  const ranked = useMemo(() => {
    const tags = profileTags(state);
    return rankByProfile(jobs, (job) => scoreJob(job, tags));
  }, [state]);
  const visible = ranked.filter((job) => {
    const haystack = `${job.title} ${job.description} ${job.tags.join(" ")} ${job.skills.join(" ")}`.toLocaleLowerCase("et-EE");
    return haystack.includes(query.toLocaleLowerCase("et-EE")) && matchesFilter([...job.tags, ...job.skills, ...job.domains], activeTags, state.activePlanFilter);
  });

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V09</p>
        <h1>Ametid</h1>
        <p>Need ametid võivad sinu profiili või valitud plaani põhjal olla uurimist väärt. Kontrolli alati, millist haridust ja ettevalmistust konkreetne amet päriselus vajab.</p>
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
      <div className="grid two">
        {visible.map((job) => (
          <JobCard job={job} addJobToPlan={addJobToPlan} key={job.id} />
        ))}
      </div>
    </section>
  );
}

function JobCard({ job, addJobToPlan }: { job: Job; addJobToPlan: (planId: PlanId, jobId: string) => void }) {
  return (
    <article className="card">
      <h2>{job.title}</h2>
      <p>{job.description}</p>
      <p>
        <strong>Miks seda näen?</strong> {job.why}
      </p>
      <p>
        <strong>Vajalik või tavapärane haridustee:</strong> {job.requiredEducation}
      </p>
      <p>
        <strong>Seotud oskused:</strong> {job.skills.join(", ")}
      </p>
      <p>
        <strong>Võimalikud edasiõppimise suunad:</strong>{" "}
        {job.relatedEducationIds.map((id) => educationOptions.find((education) => education.id === id)?.title ?? id).join(", ")}
      </p>
      <div className="chipRow">
        {job.domains.map((domain) => (
          <span className="chip" key={domain}>
            {domain}
          </span>
        ))}
      </div>
      <PlanButtons onAdd={(planId) => addJobToPlan(planId, job.id)} />
    </article>
  );
}
