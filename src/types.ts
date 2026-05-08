export type ScoreItem = {
  key: string;
  label: string;
  score: number;
  tags: string[];
};

export type UserProfile = {
  id: string;
  name: string;
  grade: string;
  school: string;
  interestScores: ScoreItem[];
  skillScores: ScoreItem[];
  interestTags: string[];
  skillTags: string[];
  freeText: string;
  freeTextTags: string[];
  freeTextGoals: string[];
  freeTextConcerns: string[];
  selectedDomains: string[];
  aiSummary: string;
  possibleJobDirections: string[];
  possibleEducationDirections: string[];
};

export type Course = {
  id: string;
  title: string;
  type: "valikaine" | "lisakursus" | "veebikursus" | "praktiline tegevus";
  description: string;
  why: string;
  develops: string[];
  tags: string[];
  domains: string[];
};

export type EducationOption = {
  id: string;
  title: string;
  school: string;
  level: "kutseõpe" | "rakenduskõrgharidus" | "bakalaureus" | "muu";
  description: string;
  why: string;
  tags: string[];
  relatedJobIds: string[];
  relatedSkills: string[];
};

export type Job = {
  id: string;
  title: string;
  description: string;
  why: string;
  requiredEducation: string;
  skills: string[];
  tags: string[];
  domains: string[];
  relatedEducationIds: string[];
};

export type PlanId = "A" | "B" | "C";

export type Plan = {
  id: PlanId;
  title: string;
  note: string;
  educationId: string | null;
  jobIds: string[];
  courseIds: string[];
};

export type AppView =
  | "login"
  | "interest-test"
  | "skills-test"
  | "free-text"
  | "domains"
  | "profile"
  | "courses"
  | "education"
  | "jobs"
  | "plans";

export type ActivePlanFilter = "all" | "profile" | PlanId;

export type AppState = {
  currentView: AppView;
  user: UserProfile | null;
  plans: Record<PlanId, Plan>;
  activePlanFilter: ActivePlanFilter;
};

export type TestAnalysis = {
  scores: ScoreItem[];
  tags: string[];
  summary: string;
  source: "ai" | "mock";
  message?: string;
};

export type FreeTextAnalysis = {
  tags: string[];
  goals: string[];
  concerns: string[];
  summary: string;
  source: "ai" | "mock";
  message?: string;
};

export type ProfileSummary = {
  summary: string;
  possibleJobDirections: string[];
  possibleEducationDirections: string[];
  source: "ai" | "mock";
  message?: string;
};
