import type { AppState, Plan, PlanId, UserProfile } from "../types";

export const storageKey = "targalt-teele-state";

export const blankUser: UserProfile = {
  id: "current-user",
  name: "Kasutaja",
  grade: "Õpilane",
  school: "Targalt teele",
  interestScores: [],
  skillScores: [],
  interestTags: [],
  skillTags: [],
  freeText: "",
  freeTextTags: [],
  freeTextGoals: [],
  freeTextConcerns: [],
  selectedDomains: [],
  aiSummary: "",
  possibleJobDirections: [],
  possibleEducationDirections: [],
};

export function createBlankUser(): UserProfile {
  return {
    ...blankUser,
    interestScores: [...blankUser.interestScores],
    skillScores: [...blankUser.skillScores],
    interestTags: [...blankUser.interestTags],
    skillTags: [...blankUser.skillTags],
    freeTextTags: [...blankUser.freeTextTags],
    freeTextGoals: [...blankUser.freeTextGoals],
    freeTextConcerns: [...blankUser.freeTextConcerns],
    selectedDomains: [...blankUser.selectedDomains],
    possibleJobDirections: [...blankUser.possibleJobDirections],
    possibleEducationDirections: [...blankUser.possibleEducationDirections],
  };
}

export const domains = [
  "IT ja digitehnoloogia",
  "Tervis ja heaolu",
  "Haridus ja noorsootöö",
  "Sotsiaaltöö ja kogukond",
  "Meedia ja kommunikatsioon",
  "Ettevõtlus ja juhtimine",
  "Õigus ja avalik sektor",
  "Loodus ja keskkond",
  "Kunst, disain ja loovtöö",
  "Tehnika ja inseneeria",
  "Majandus ja finants",
  "Turism, teenindus ja üritused",
];

export function createPlans(): Record<PlanId, Plan> {
  return {
    A: {
      id: "A",
      title: "Plaan A",
      note: "Esimene eelistus või suund, mida tahaksid kõige rohkem uurida.",
      education: null,
      jobs: [],
      courses: [],
    },
    B: {
      id: "B",
      title: "Plaan B",
      note: "Realistlik alternatiiv, kui esimene valik vajab muutmist.",
      education: null,
      jobs: [],
      courses: [],
    },
    C: {
      id: "C",
      title: "Plaan C",
      note: "Varuplaan või katsetamise suund.",
      education: null,
      jobs: [],
      courses: [],
    },
  };
}

export function createInitialState(): AppState {
  return {
    currentView: "login",
    user: null,
    plans: createPlans(),
    activePlanFilter: "profile",
  };
}
