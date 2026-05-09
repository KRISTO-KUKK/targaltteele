import type { AppState, Plan, PlanId } from "../types";
import { Notice } from "../components/Notice";
import type { ReactNode } from "react";

const planDescriptions: Record<PlanId, string> = {
  A: "Ideaalne või esimene eelistus.",
  B: "Realistlik alternatiiv, kui plaan A ei tööta.",
  C: "Varuplaan või katsetamise suund.",
};

export function PlansView({
  state,
  updatePlan,
  removeEducation,
  removeJob,
  removeCourse,
  showPlanCourses,
  showPlanJobs,
}: {
  state: AppState;
  updatePlan: (planId: PlanId, patch: Partial<Plan>) => void;
  removeEducation: (planId: PlanId) => void;
  removeJob: (planId: PlanId, jobId: string) => void;
  removeCourse: (planId: PlanId, courseLink: string) => void;
  showPlanCourses: (planId: PlanId) => void;
  showPlanJobs: (planId: PlanId) => void;
}) {
  return (
    <section className="stack">
      <div className="sectionTitle">
        <p className="eyebrow">V10</p>
        <h1>Plaanid A, B ja C</h1>
        <p>Plaanid täituvad jooksvalt sinu valitud kursustest, edasiõppimisvõimalustest ja ametitest.</p>
      </div>
      <Notice>Plaanid A, B ja C ei ole paremusjärjestus. Need aitavad sul näha erinevaid realistlikke teid.</Notice>
      <div className="planStack">
        {(["A", "B", "C"] as PlanId[]).map((planId) => (
          <PlanCard
            key={planId}
            plan={state.plans[planId]}
            updatePlan={updatePlan}
            removeEducation={removeEducation}
            removeJob={removeJob}
            removeCourse={removeCourse}
            showPlanCourses={showPlanCourses}
            showPlanJobs={showPlanJobs}
          />
        ))}
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  updatePlan,
  removeEducation,
  removeJob,
  removeCourse,
  showPlanCourses,
  showPlanJobs,
}: {
  plan: Plan;
  updatePlan: (planId: PlanId, patch: Partial<Plan>) => void;
  removeEducation: (planId: PlanId) => void;
  removeJob: (planId: PlanId, jobId: string) => void;
  removeCourse: (planId: PlanId, courseLink: string) => void;
  showPlanCourses: (planId: PlanId) => void;
  showPlanJobs: (planId: PlanId) => void;
}) {
  const empty = !plan.education && plan.jobs.length === 0 && plan.courses.length === 0;

  return (
    <article className="card planCard">
      <input value={plan.title} onChange={(event) => updatePlan(plan.id, { title: event.target.value })} aria-label={`${plan.id} plaani nimi`} />
      <p className="muted">{planDescriptions[plan.id]}</p>
      <label>
        Märkus
        <textarea value={plan.note} onChange={(event) => updatePlan(plan.id, { note: event.target.value })} />
      </label>
      {empty && <p className="empty">Selles plaanis pole veel valikuid. Lisa edasiõppimisvõimalus, amet või kursus.</p>}
      {plan.education && (
        <PlanBlock title="Valitud edasiõppimisvõimalus">
          <SelectedItem
            title={`${plan.education.pealkiri}${plan.education.oppeaste ? ` · ${plan.education.oppeaste}` : ""}`}
            remove={() => removeEducation(plan.id)}
          />
        </PlanBlock>
      )}
      {plan.jobs.length > 0 && (
        <PlanBlock title="Valitud ametid">
          {plan.jobs.map((job) => (
            <SelectedItem title={job.nimi} remove={() => removeJob(plan.id, job.id)} key={job.id} />
          ))}
        </PlanBlock>
      )}
      {plan.courses.length > 0 && (
        <PlanBlock title="Valitud kursused">
          {plan.courses.map((course) => (
            <SelectedItem title={course.pealkiri} remove={() => removeCourse(plan.id, course.link)} key={course.link} />
          ))}
        </PlanBlock>
      )}
      <PlanBlock title="AI / süsteemi kokkuvõte">
        <p>{buildSummary(plan.education?.pealkiri, plan.jobs.map((job) => job.nimi), plan.courses.map((course) => course.pealkiri))}</p>
      </PlanBlock>
      <PlanBlock title="Riskid">
        <ul>
          <li>Kontrolli sisseastumistingimusi ja päriselus nõutud haridust.</li>
          <li>Võrdle, kas valitud kursused toetavad sama suunda või lähevad liiga laiali.</li>
        </ul>
      </PlanBlock>
      <PlanBlock title="Järgmised sammud">
        <ul>
          <li>Uuri õppekava ja kandideerimise tähtaegu.</li>
          <li>Räägi kooli karjäärikoordinaatori või valdkonnas töötava inimesega.</li>
        </ul>
      </PlanBlock>
      <div className="buttonRow">
        <button className="secondary" onClick={() => showPlanCourses(plan.id)}>
          Näita sobivaid kursuseid
        </button>
        <button className="secondary" onClick={() => showPlanJobs(plan.id)}>
          Näita sobivaid ameteid
        </button>
      </div>
    </article>
  );
}

function PlanBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="planBlock">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function SelectedItem({ title, remove }: { title: string; remove: () => void }) {
  return (
    <div className="selectedItem">
      <span>{title}</span>
      <button className="ghost danger" onClick={remove}>
        Eemalda
      </button>
    </div>
  );
}

function buildSummary(education: string | undefined, jobTitles: string[], courseTitles: string[]) {
  if (!education && !jobTitles.length && !courseTitles.length) return "Lisa siia mõni valik, et plaani kokkuvõte tekiks.";
  return `See plaan uurib suunda${education ? ` "${education}"` : ""}${jobTitles.length ? ` koos ametitega ${jobTitles.join(", ")}` : ""}. Kursused ${courseTitles.length ? courseTitles.join(", ") : "saab valida järgmise sammuna"}.`;
}
