import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Notice } from "./components/Notice";
import { createInitialState, demoUser } from "./data/demoData";
import { clearState, loadState, saveState } from "./utils/storage";
import { analyzeProfileSummary } from "./utils/api";
import type { ActivePlanFilter, AppState, AppView, FreeTextAnalysis, Plan, PlanId, TestAnalysis } from "./types";
import { LoginView } from "./views/LoginView";
import { InterestTestView } from "./views/InterestTestView";
import { SkillsTestView } from "./views/SkillsTestView";
import { FreeTextView } from "./views/FreeTextView";
import { DomainSelectionView } from "./views/DomainSelectionView";
import { ProfileView } from "./views/ProfileView";
import { CoursesView } from "./views/CoursesView";
import { EducationView } from "./views/EducationView";
import { JobsView } from "./views/JobsView";
import { PlansView } from "./views/PlansView";

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toast, setToast] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  function update(mutator: (current: AppState) => AppState) {
    setState((current) => mutator(current));
  }

  function setView(view: AppView) {
    update((current) => ({ ...current, currentView: view }));
  }

  function reset() {
    clearState();
    setToast("");
    setState(createInitialState());
  }

  function startDemo() {
    update((current) => ({ ...current, user: { ...demoUser }, currentView: "interest-test" }));
  }

  function applyInterestAnalysis(analysis: TestAnalysis) {
    if (analysis.message) setToast(analysis.message);
    update((current) => ({
      ...current,
      currentView: "skills-test",
      user: current.user && {
        ...current.user,
        interestScores: analysis.scores,
        interestTags: analysis.tags,
        aiSummary: analysis.summary,
      },
    }));
  }

  function applySkillAnalysis(analysis: TestAnalysis) {
    if (analysis.message) setToast(analysis.message);
    update((current) => ({
      ...current,
      currentView: "free-text",
      user: current.user && {
        ...current.user,
        skillScores: analysis.scores,
        skillTags: analysis.tags,
        aiSummary: [current.user.aiSummary, analysis.summary].filter(Boolean).join(" "),
      },
    }));
  }

  function applyFreeText(text: string, analysis: FreeTextAnalysis) {
    if (analysis.message) setToast(analysis.message);
    update((current) => ({
      ...current,
      currentView: "domains",
      user: current.user && {
        ...current.user,
        freeText: text,
        freeTextTags: analysis.tags,
        freeTextGoals: analysis.goals,
        freeTextConcerns: analysis.concerns,
        aiSummary: [current.user.aiSummary, analysis.summary].filter(Boolean).join(" "),
      },
    }));
  }

  async function applyDomains(selectedDomains: string[]) {
    const summary = await analyzeProfileSummary({ ...state.user, selectedDomains });
    update((current) => ({
      ...current,
      currentView: "profile",
      user: current.user && {
        ...current.user,
        selectedDomains,
        aiSummary: summary.summary,
        possibleJobDirections: summary.possibleJobDirections,
        possibleEducationDirections: summary.possibleEducationDirections,
      },
    }));
    if (summary.message) setToast(summary.message);
  }

  function setFilter(filter: ActivePlanFilter) {
    update((current) => ({ ...current, activePlanFilter: filter }));
  }

  function addCourseToPlan(planId: PlanId, courseId: string) {
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: {
          ...current.plans[planId],
          courseIds: Array.from(new Set([...current.plans[planId].courseIds, courseId])),
        },
      },
    }));
  }

  function addJobToPlan(planId: PlanId, jobId: string) {
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: {
          ...current.plans[planId],
          jobIds: Array.from(new Set([...current.plans[planId].jobIds, jobId])),
        },
      },
    }));
  }

  function setEducationForPlan(planId: PlanId, educationId: string) {
    const hadEducation = Boolean(state.plans[planId].educationId);
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: { ...current.plans[planId], educationId },
      },
    }));
    if (hadEducation) setToast("Selles plaanis oli juba üks edasiõppimisvõimalus. See asendati uuega.");
  }

  function updatePlan(planId: PlanId, patch: Partial<Plan>) {
    update((current) => ({
      ...current,
      plans: { ...current.plans, [planId]: { ...current.plans[planId], ...patch } },
    }));
  }

  function removeEducation(planId: PlanId) {
    updatePlan(planId, { educationId: null });
  }

  function removeJob(planId: PlanId, jobId: string) {
    update((current) => ({
      ...current,
      plans: { ...current.plans, [planId]: { ...current.plans[planId], jobIds: current.plans[planId].jobIds.filter((id) => id !== jobId) } },
    }));
  }

  function removeCourse(planId: PlanId, courseId: string) {
    update((current) => ({
      ...current,
      plans: { ...current.plans, [planId]: { ...current.plans[planId], courseIds: current.plans[planId].courseIds.filter((id) => id !== courseId) } },
    }));
  }

  function showPlanCourses(planId: PlanId) {
    update((current) => ({ ...current, currentView: "courses", activePlanFilter: planId }));
  }

  function showPlanJobs(planId: PlanId) {
    update((current) => ({ ...current, currentView: "jobs", activePlanFilter: planId }));
  }

  return (
    <Layout state={state} setView={setView} reset={reset}>
      {toast && (
        <div className="toast">
          <Notice tone="warn">{toast}</Notice>
          <button className="ghost" onClick={() => setToast("")}>
            Sulge
          </button>
        </div>
      )}
      {state.currentView === "login" && <LoginView start={startDemo} />}
      {state.currentView === "interest-test" && <InterestTestView onDone={applyInterestAnalysis} />}
      {state.currentView === "skills-test" && <SkillsTestView onDone={applySkillAnalysis} />}
      {state.currentView === "free-text" && <FreeTextView onDone={applyFreeText} />}
      {state.currentView === "domains" && <DomainSelectionView selected={state.user?.selectedDomains ?? []} onDone={applyDomains} />}
      {state.currentView === "profile" && <ProfileView state={state} setView={setView} />}
      {state.currentView === "courses" && <CoursesView state={state} setFilter={setFilter} addCourseToPlan={addCourseToPlan} />}
      {state.currentView === "education" && <EducationView state={state} setEducationForPlan={setEducationForPlan} />}
      {state.currentView === "jobs" && <JobsView state={state} setFilter={setFilter} addJobToPlan={addJobToPlan} />}
      {state.currentView === "plans" && (
        <PlansView
          state={state}
          updatePlan={updatePlan}
          removeEducation={removeEducation}
          removeJob={removeJob}
          removeCourse={removeCourse}
          showPlanCourses={showPlanCourses}
          showPlanJobs={showPlanJobs}
        />
      )}
    </Layout>
  );
}

export default App;
