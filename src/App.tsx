import { useEffect, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import { Notice } from "./components/Notice";
import { createBlankUser, createInitialState } from "./data/appData";
import { clearState, loadState, saveState } from "./utils/storage";
import type {
  ActivePlanFilter,
  AppState,
  AppView,
  FreeTextAnalysis,
  Plan,
  PlanCourse,
  PlanEducation,
  PlanId,
  PlanJob,
  TestAnalysis,
} from "./types";
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
import { RecommendationsView } from "./views/RecommendationsView";

function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [toast, setToast] = useState("");
  const activeRunId = useRef(0);

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
    activeRunId.current += 1;
    const freshState = createInitialState();
    setToast("");
    setState(freshState);
    try {
      localStorage.clear();
    } catch {
      clearState();
    }
    try {
      sessionStorage.clear();
    } catch {
      // ignore — sessionStorage may be blocked in some browsers
    }
    try {
      if (typeof indexedDB !== "undefined" && indexedDB.databases) {
        indexedDB.databases().then((databases) => {
          for (const database of databases) {
            if (database.name) indexedDB.deleteDatabase(database.name);
          }
        }).catch(() => {});
      }
    } catch {
      // ignore — older browsers without indexedDB.databases()
    }
    try {
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))).catch(() => {});
      }
    } catch {
      // ignore — Cache API not available
    }
    if (typeof window !== "undefined") {
      const resetUrl = new URL(window.location.href);
      resetUrl.searchParams.set("reset", Date.now().toString());
      window.location.replace(resetUrl.toString());
      return;
    }
  }

  function mergeScores(base: ScoreItem[], incoming: ScoreItem[]) {
    const byKey = new Map(base.map((item) => [item.key, item]));
    for (const item of incoming) {
      byKey.set(item.key, item);
    }
    return Array.from(byKey.values()).sort((a, b) => b.score - a.score);
  }

  function startProfile() {
    activeRunId.current += 1;
    setToast("");
    setState({ ...createInitialState(), user: createBlankUser(), currentView: "domains" });
  }

  function scopedAction<T extends unknown[]>(handler: (...args: T) => void) {
    const runId = activeRunId.current;
    return (...args: T) => {
      if (runId === activeRunId.current) handler(...args);
    };
  }

  function applyInterestAnalysis(analysis: TestAnalysis) {
    const normalizedScores = normalizeInterestScores(analysis.scores);
    if (analysis.message || analysis.extractedTextFile) {
      setToast([analysis.message, analysis.extractedTextFile ? `Failist loetud tekst salvestati: ${analysis.extractedTextFile}` : ""].filter(Boolean).join(" "));
    }
    update((current) => {
      if (!current.user) return current;
      return {
        ...current,
        currentView: "skills-test",
        user: {
          ...current.user,
          interestScores: mergeScores(current.user.interestScores, normalizedScores),
          interestTags: Array.from(new Set([...current.user.interestTags, ...normalizedScores.flatMap((score) => score.tags)])),
          aiSummary: analysis.summary,
        },
      };
    });
  }

  function applySkillAnalysis(analysis: TestAnalysis) {
    const normalizedScores = normalizeSkillScores(analysis.scores);
    if (analysis.message || analysis.extractedTextFile) {
      setToast([analysis.message, analysis.extractedTextFile ? `Failist loetud tekst salvestati: ${analysis.extractedTextFile}` : ""].filter(Boolean).join(" "));
    }
    update((current) => {
      if (!current.user) return current;
      const nextUser = {
        ...current.user,
        skillScores: mergeScores(current.user.skillScores, normalizedScores),
        skillTags: Array.from(new Set([...current.user.skillTags, ...normalizedScores.flatMap((score) => score.tags)])),
        aiSummary: [current.user.aiSummary, analysis.summary].filter(Boolean).join(" "),
      };
      return {
        ...current,
        currentView: "ai-review",
        user: nextUser,
      };
    });
  }

  function confirmAIReview(summary: ProfileSummary) {
    update((current) => {
      if (!current.user) return current;
      return {
        ...current,
        currentView: "profile",
        user: {
          ...current.user,
          aiSummary: summary.summary,
          possibleJobDirections: summary.possibleJobDirections,
          possibleEducationDirections: summary.possibleEducationDirections,
        },
      };
    });
  }

  function applyFreeText(text: string, analysis: FreeTextAnalysis) {
    const interestScores = normalizeInterestScores(analysis.interestScores ?? []);
    const skillScores = normalizeSkillScores(analysis.skillScores ?? []);
    if (analysis.message) setToast(analysis.message);
    update((current) => {
      if (!current.user) return current;
      return {
        ...current,
        currentView: "interest-test",
        user: {
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
      };
    });
  }

  function applyDomains(selectedDomains: string[]) {
    update((current) => {
      if (!current.user) return current;
      return {
        ...current,
        currentView: "free-text",
        user: {
          ...current.user,
          selectedDomains,
        },
      };
    });
  }

  function setFilter(filter: ActivePlanFilter) {
    update((current) => ({ ...current, activePlanFilter: filter }));
  }

  function addCourseToPlan(planId: PlanId, course: PlanCourse) {
    update((current) => {
      const existing = current.plans[planId].courses;
      if (existing.some((item) => item.link === course.link)) return current;
      return {
        ...current,
        plans: {
          ...current.plans,
          [planId]: { ...current.plans[planId], courses: [...existing, course] },
        },
      };
    });
    setToast(`Kursus lisatud plaani ${planId}.`);
  }

  function addJobToPlan(planId: PlanId, job: PlanJob) {
    update((current) => {
      const existing = current.plans[planId].jobs;
      if (existing.some((item) => item.id === job.id)) return current;
      return {
        ...current,
        plans: {
          ...current.plans,
          [planId]: { ...current.plans[planId], jobs: [...existing, job] },
        },
      };
    });
    setToast(`Amet lisatud plaani ${planId}.`);
  }

  function setEducationForPlan(planId: PlanId, education: PlanEducation) {
    const hadEducation = Boolean(state.plans[planId].education);
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: { ...current.plans[planId], education },
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
    updatePlan(planId, { education: null });
  }

  function removeJob(planId: PlanId, jobId: string) {
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: { ...current.plans[planId], jobs: current.plans[planId].jobs.filter((item) => item.id !== jobId) },
      },
    }));
  }

  function removeCourse(planId: PlanId, courseLink: string) {
    update((current) => ({
      ...current,
      plans: {
        ...current.plans,
        [planId]: { ...current.plans[planId], courses: current.plans[planId].courses.filter((item) => item.link !== courseLink) },
      },
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
      {state.currentView === "login" && <LoginView start={startProfile} />}
      {state.currentView === "interest-test" && <InterestTestView onDone={scopedAction(applyInterestAnalysis)} />}
      {state.currentView === "skills-test" && <SkillsTestView onDone={scopedAction(applySkillAnalysis)} />}
      {state.currentView === "ai-review" && state.user && <AIReviewView user={state.user} onConfirm={scopedAction(confirmAIReview)} onMessage={setToast} />}
      {state.currentView === "free-text" && <FreeTextView onDone={scopedAction(applyFreeText)} />}
      {state.currentView === "domains" && <DomainSelectionView selected={state.user?.selectedDomains ?? []} onDone={scopedAction(applyDomains)} />}
      {state.currentView === "profile" && <ProfileView state={state} setView={setView} />}
      {state.currentView === "recommendations" && <RecommendationsView state={state} setView={setView} />}
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
