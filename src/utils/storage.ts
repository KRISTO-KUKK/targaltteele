import { createInitialState, createPlans, storageKey } from "../data/appData";
import type { AppState, Plan, PlanId } from "../types";

function planFromStored(planId: PlanId, fallback: Plan, raw: any): Plan {
  if (!raw || typeof raw !== "object") return fallback;
  const usesNewShape =
    Object.prototype.hasOwnProperty.call(raw, "education") ||
    Object.prototype.hasOwnProperty.call(raw, "jobs") ||
    Object.prototype.hasOwnProperty.call(raw, "courses");
  if (!usesNewShape) {
    return { ...fallback, id: planId, title: typeof raw.title === "string" ? raw.title : fallback.title, note: typeof raw.note === "string" ? raw.note : fallback.note };
  }
  return {
    id: planId,
    title: typeof raw.title === "string" ? raw.title : fallback.title,
    note: typeof raw.note === "string" ? raw.note : fallback.note,
    education: raw.education && typeof raw.education === "object" ? raw.education : null,
    jobs: Array.isArray(raw.jobs) ? raw.jobs : [],
    courses: Array.isArray(raw.courses) ? raw.courses : [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createInitialState();
    const parsed = JSON.parse(raw);
    const fallback = createInitialState();
    const fallbackPlans = createPlans();
    const plans: Record<PlanId, Plan> = {
      A: planFromStored("A", fallbackPlans.A, parsed.plans?.A),
      B: planFromStored("B", fallbackPlans.B, parsed.plans?.B),
      C: planFromStored("C", fallbackPlans.C, parsed.plans?.C),
    };
    return { ...fallback, ...parsed, plans };
  } catch {
    return createInitialState();
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function clearState(): void {
  localStorage.removeItem(storageKey);
}
