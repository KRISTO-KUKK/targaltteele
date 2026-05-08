import { useMemo, useState } from "react";
import { PlanButtons } from "../components/PlanButtons";
import { educationOptions } from "../data/demoData";
import { profileTags, rankByProfile, scoreEducation } from "../utils/scoring";
import type { AppState, EducationOption, PlanId } from "../types";

export function EducationView({
  state,
  setEducationForPlan,
}: {
  state: AppState;
  setEducationForPlan: (planId: PlanId, educationId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("Kõik");
  const [domain, setDomain] = useState("Kõik");
  const ranked = useMemo(() => {
    const tags = profileTags(state);
    return rankByProfile(educationOptions, (education) => scoreEducation(education, tags));
  }, [state]);
  const visible = ranked.filter((education) => {
    const haystack = `${education.title} ${education.school} ${education.description} ${education.tags.join(" ")}`.toLocaleLowerCase("et-EE");
    const matchesQuery = haystack.includes(query.toLocaleLowerCase("et-EE"));
    const matchesLevel = level === "Kõik" || education.level === level;
    const matchesDomain = domain === "Kõik" || education.tags.some((tag) => tag.toLocaleLowerCase("et-EE").includes(domain.toLocaleLowerCase("et-EE")));
    return matchesQuery && matchesLevel && matchesDomain;
  });

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V08</p>
        <h1>Edasiõppimisvõimalused</h1>
        <p>Need on näidisandmetel põhinevad õpiteed, mida võiksid oma profiili põhjal edasi uurida. Hiljem saab need andmed laadida JSON-failist.</p>
      </div>
      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Otsing" />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          {["Kõik", "kutseõpe", "rakenduskõrgharidus", "bakalaureus", "muu"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={domain} onChange={(event) => setDomain(event.target.value)}>
          {["Kõik", "Haridus", "Sotsiaaltöö", "Kommunikatsioon", "IT", "Ettevõtlus"].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div className="grid two">
        {visible.map((education) => (
          <EducationCard education={education} setEducationForPlan={setEducationForPlan} key={education.id} />
        ))}
      </div>
    </section>
  );
}

function EducationCard({
  education,
  setEducationForPlan,
}: {
  education: EducationOption;
  setEducationForPlan: (planId: PlanId, educationId: string) => void;
}) {
  return (
    <article className="card">
      <p className="eyebrow">
        {education.school} · {education.level}
      </p>
      <h2>{education.title}</h2>
      <p>{education.description}</p>
      <p>
        <strong>Miks seda näen?</strong> {education.why}
      </p>
      <p>
        <strong>Seotud oskused:</strong> {education.relatedSkills.join(", ")}
      </p>
      <PlanButtons onAdd={(planId) => setEducationForPlan(planId, education.id)} />
    </article>
  );
}
