import { useMemo, useState } from "react";
import { PlanButtons } from "../components/PlanButtons";
import { catalogEducationOptions, educationDomains, educationLevels } from "../data/educationCatalog";
import { rankByProfile, scoreEducationForState } from "../utils/scoring";
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
    return rankByProfile(
      catalogEducationOptions.map((education) => ({ education, score: scoreEducationForState(education, state) })),
      (item) => item.score,
    );
  }, [state]);
  const visible = ranked.filter(({ education, score }) => {
    const haystack = `${education.title} ${education.school} ${education.description} ${education.tags.join(" ")}`.toLocaleLowerCase("et-EE");
    const hasQuery = Boolean(query.trim());
    const matchesQuery = haystack.includes(query.toLocaleLowerCase("et-EE"));
    const matchesLevel = level === "Kõik" || education.level === level;
    const matchesDomain = domain === "Kõik" || education.domain === domain;
    const matchesProfile = hasQuery || score > 0 || !state.user?.selectedDomains.length;
    return matchesQuery && matchesLevel && matchesDomain && matchesProfile;
  });

  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V08</p>
        <h1>Edasiõppimisvõimalused</h1>
        <p>Need õpiteed tulevad nüüd repo erialade andmefailist. AI ja skooriloogika aitavad neid sinu sisendi järgi järjestada, aga lõplikke valikuid see ei tee.</p>
      </div>
      <div className="filters">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Otsing" />
        <select value={level} onChange={(event) => setLevel(event.target.value)}>
          {educationLevels.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select value={domain} onChange={(event) => setDomain(event.target.value)}>
          {educationDomains.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <p className="muted">Näitan {visible.length} profiiliga seotud õppekava kokku {catalogEducationOptions.length} seast. Otsinguga saad kataloogist laiemalt otsida.</p>
      <div className="grid two">
        {visible.map(({ education, score }) => (
          <EducationCard education={education} matchScore={score} setEducationForPlan={setEducationForPlan} key={education.id} />
        ))}
      </div>
    </section>
  );
}

function EducationCard({
  education,
  matchScore,
  setEducationForPlan,
}: {
  education: EducationOption;
  matchScore: number;
  setEducationForPlan: (planId: PlanId, educationId: string) => void;
}) {
  return (
    <article className="card">
      <p className="eyebrow">
        {education.school} · {education.level}
      </p>
      <h2>{education.title}</h2>
      <div className="metaLine">
        <span>Sobivusskoor {Math.round(matchScore)}</span>
        {education.credits ? <span>{education.credits} EAP</span> : null}
        {education.durationYears ? <span>{education.durationYears} aastat</span> : null}
        {education.domain ? <span>{education.domain}</span> : null}
      </div>
      <p>{education.description}</p>
      <p>
        <strong>Miks seda näen?</strong> {education.why}
      </p>
      {education.relatedSkills.length > 0 && (
        <p>
          <strong>Seotud oskused:</strong> {education.relatedSkills.join(", ")}
        </p>
      )}
      <PlanButtons onAdd={(planId) => setEducationForPlan(planId, education.id)} />
    </article>
  );
}
