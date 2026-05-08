import { createInitialState, storageKey } from "../data/demoData";
import type { AppState } from "../types";

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createInitialState();
    return { ...createInitialState(), ...JSON.parse(raw) };
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
