import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Notice } from "./components/Notice";
import { createInitialState, demoUser } from "./data/demoData";
import { clearState, loadState, saveState } from "./utils/storage";
import type { ActivePlanFilter, AppState, AppView, FreeTextAnalysis, Plan, PlanId, TestAnalysis } from "./types";
import type { ProfileSummary } from "./types";
import type { ScoreItem } from "./types";
import { normalizeInterestScores, normalizeSkillScores } from "./data/taxonomy";
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
import { AIReviewView } from "./views/AIReviewView";

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

  function mergeScores(base: ScoreItem[], incoming: ScoreItem[]) {
    const byKey = new Map(base.map((item) => [item.key, item]));
    for (const item of incoming) {
      byKey.set(item.key, item);
    }
    return Array.from(byKey.values()).sort((a, b) => b.score - a.score);
  }

  function startDemo() {
    update((current) => ({ ...current, user: { ...demoUser }, currentView: "domains" }));
  }

  function applyInterestAnalysis(analysis: TestAnalysis) {
    const normalizedScores = normalizeInterestScores(analysis.scores);
    if (analysis.message || analysis.extractedTextFile) {
      setToast([analysis.message, analysis.extractedTextFile ? `Failist loetud tekst salvestati: ${analysis.extractedTextFile}` : ""].filter(Boolean).join(" "));
    }
    update((current) => ({
      ...current,
      currentView: "skills-test",
      user: current.user && {
        ...current.user,
        interestScores: mergeScores(current.user.interestScores, normalizedScores),
        interestTags: Array.from(new Set([...current.user.interestTags, ...normalizedScores.flatMap((score) => score.tags)])),
        aiSummary: analysis.summary,
      },
    }));
  }

  function applySkillAnalysis(analysis: TestAnalysis) {
    const normalizedScores = normalizeSkillScores(analysis.scores);
    if (analysis.message || analysis.extractedTextFile) {
      setToast([analysis.message, analysis.extractedTextFile ? `Failist loetud tekst salvestati: ${analysis.extractedTextFile}` : ""].filter(Boolean).join(" "));
    }
    if (!state.user) return;
    const nextUser = {
      ...state.user,
      skillScores: mergeScores(state.user.skillScores, normalizedScores),
      skillTags: Array.from(new Set([...state.user.skillTags, ...normalizedScores.flatMap((score) => score.tags)])),
      aiSummary: [state.user.aiSummary, analysis.summary].filter(Boolean).join(" "),
    };
    update((current) => ({
      ...current,
      currentView: "ai-review",
      user: nextUser,
    }));
  }

  function confirmAIReview(summary: ProfileSummary) {
    update((current) => ({
      ...current,
      currentView: "profile",
      user: current.user && {
        ...current.user,
        aiSummary: summary.summary,
        possibleJobDirections: summary.possibleJobDirections,
        possibleEducationDirections: summary.possibleEducationDirections,
      },
    }));
  }

  function applyFreeText(text: string, analysis: FreeTextAnalysis) {
    const interestScores = normalizeInterestScores(analysis.interestScores ?? []);
    const skillScores = normalizeSkillScores(analysis.skillScores ?? []);
    if (analysis.message) setToast(analysis.message);
    update((current) => ({
      ...current,
      currentView: "interest-test",
      user: current.user && {
        ...current.user,
        freeText: text,
        freeTextTags: analysis.tags,
        freeTextGoals: analysis.goals,
        freeTextConcerns: analysis.concerns,
        interestScores: mergeScores(current.user.interestScores, interestScores),
        skillScores: mergeScores(current.user.skillScores, skillScores),
        interestTags: Array.from(new Set([...current.user.interestTags, ...interestScores.flatMap((score) => score.tags)])),
        skillTags: Array.from(new Set([...current.user.skillTags, ...skillScores.flatMap((score) => score.tags)])),
        aiSummary: [current.user.aiSummary, analysis.summary].filter(Boolean).join(" "),
      },
    }));
  }

  function applyDomains(selectedDomains: string[]) {
    update((current) => ({
      ...current,
      currentView: "free-text",
      user: current.user && {
        ...current.user,
        selectedDomains,
      },
    }));
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
    setToast(`Kursus lisatud plaani ${planId}.`);
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
    setToast(`Amet lisatud plaani ${planId}.`);
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
    setToast(hadEducation ? "Selles plaanis oli juba üks edasiõppimisvõimalus. See asendati uuega." : `Edasiõppimisvõimalus lisatud plaani ${planId}.`);
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
      {state.currentView === "ai-review" && state.user && <AIReviewView user={state.user} onConfirm={confirmAIReview} onMessage={setToast} />}
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
