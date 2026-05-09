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
  workload: string;
  description: string;
  why: string;
  develops: string[];
  tags: string[];
  domains: string[];
  interestScores?: ScoreItem[];
  skillScores?: ScoreItem[];
};

export type EducationOption = {
  id: string;
  code?: string;
  title: string;
  school: string;
  level: string;
  credits?: number;
  durationYears?: number;
  domain?: string;
  direction?: string;
  url?: string;
  description: string;
  why: string;
  tags: string[];
  relatedJobIds: string[];
  relatedSkills: string[];
  interestScores?: ScoreItem[];
  skillScores?: ScoreItem[];
};

export type Job = {
  id: string;
  title: string;
  description: string;
  why: string;
  requiredEducation: string;
  salaryRange: string;
  skills: string[];
  tags: string[];
  domains: string[];
  relatedEducationIds: string[];
  interestScores?: ScoreItem[];
  skillScores?: ScoreItem[];
};

export type PlanId = "A" | "B" | "C";

export type PlanEducation = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  url: string | null;
};

export type PlanJob = {
  id: string;
  nimi: string;
  kirjeldus: string;
};

export type PlanCourse = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
};

export type Plan = {
  id: PlanId;
  title: string;
  note: string;
  education: PlanEducation | null;
  jobs: PlanJob[];
  courses: PlanCourse[];
};

export type AppView =
  | "login"
  | "interest-test"
  | "skills-test"
  | "free-text"
  | "domains"
  | "ai-review"
  | "profile"
  | "courses"
  | "education"
  | "jobs"
  | "plans"
  | "recommendations";

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
  extractedTextFile?: string | null;
  extractedTextMethod?: string;
};

export type FreeTextAnalysis = {
  tags: string[];
  goals: string[];
  concerns: string[];
  interestScores: ScoreItem[];
  skillScores: ScoreItem[];
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

export type CurriculumMatch = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  sisu: string;
  url: string | null;
  matchScore: number;
  testScore?: number;
  signalScore?: number;
  tier?: string;
  matchedSignals?: string[];
  reason?: string;
};

export type AmetSample = {
  id: string;
  nimi: string;
  kirjeldus: string;
};

export type FieldMatch = {
  id: string;
  nimi: string;
  kirjeldus: string;
  tags: string[];
  matchScore: number;
  testScore?: number;
  signalScore?: number;
  sampleAmetid: AmetSample[];
};

export type CourseSuggestion = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
  signalScore?: number;
  matchedSignals?: string[];
  reason?: string;
};

export type RecommendationResponse = {
  topCurricula: CurriculumMatch[];
  topFields: FieldMatch[];
  refinedCurricula: CurriculumMatch[];
  suggestedCourses: CourseSuggestion[];
  explanation: string;
  source: "ai" | "math-only";
  message?: string;
};

export type CatalogCurriculum = {
  kood: string;
  pealkiri: string;
  oppeaste: string;
  sisu: string;
  url: string | null;
  matchScore: number;
};

export type CatalogCourse = {
  link: string;
  pealkiri: string;
  sisu: string;
  tags: string[];
  matchScore: number;
};

export type CatalogAmetField = {
  id: string;
  nimi: string;
  matchScore: number;
};

export type CatalogAmet = {
  id: string;
  nimi: string;
  kirjeldus: string;
  fields: CatalogAmetField[];
  matchScore: number;
};
