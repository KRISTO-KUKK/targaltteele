import { courses, jobs } from "../data/demoData";
import { catalogEducationOptions } from "../data/educationCatalog";
import type { AppState, Course, EducationOption, Job, Plan, ScoreItem } from "../types";

function normalize(value: string) {
  return value.toLocaleLowerCase("et-EE");
}

function overlapScore(source: string[], target: string[], weight: number) {
  const normalizedTarget = new Set(target.map(normalize));
  return source.reduce((sum, item) => sum + (normalizedTarget.has(normalize(item)) ? weight : 0), 0);
}

export function profileTags(state: AppState): string[] {
  const user = state.user;
  if (!user) return [];
  const scoredTags = (items: ScoreItem[]) => items.filter((item) => item.score >= 60).flatMap((item) => item.tags);
  return Array.from(
    new Set([
      ...scoredTags(user.interestScores),
      ...scoredTags(user.skillScores),
      ...user.interestTags,
      ...user.skillTags,
      ...user.freeTextTags,
      ...user.selectedDomains,
    ]),
  );
}

export function planTags(plan: Plan): string[] {
  const education = catalogEducationOptions.find((item) => item.id === plan.educationId);
  const selectedJobs = jobs.filter((item) => plan.jobIds.includes(item.id));
  const selectedCourses = courses.filter((item) => plan.courseIds.includes(item.id));
  return Array.from(
    new Set([
      ...(education?.tags ?? []),
      ...(education?.relatedSkills ?? []),
      ...selectedJobs.flatMap((item) => [...item.tags, ...item.skills, ...item.domains]),
      ...selectedCourses.flatMap((item) => [...item.tags, ...item.develops, ...item.domains]),
    ]),
  );
}

export function scoreCourse(course: Course, tags: string[], weakSkills: string[] = []) {
  return overlapScore(course.tags, tags, 2) + overlapScore(course.domains, tags, 2) + overlapScore(course.develops, weakSkills, 1);
}

export function scoreCourseForState(course: Course, state: AppState, weakSkills: string[] = []) {
  const user = state.user;
  const tagFallback = scoreCourse(course, profileTags(state), weakSkills);
  if (!user) return tagFallback;
  const interestMatch = vectorScore(user.interestScores, course.interestScores ?? [], 8);
  const skillMatch = vectorScore(user.skillScores, course.skillScores ?? [], 8);
  const domainBoost = course.domains.some((domain) => user.selectedDomains.includes(domain)) ? 6 : 0;
  const hasStructuredProfile = Boolean((course.interestScores?.length ?? 0) + (course.skillScores?.length ?? 0));
  return interestMatch + skillMatch + domainBoost + (hasStructuredProfile ? tagFallback * 0.2 : tagFallback);
}

export function scoreEducation(education: EducationOption, tags: string[]) {
  return overlapScore(education.tags, tags, 2) + overlapScore(education.relatedSkills, tags, 1);
}

function vectorScore(profileScores: ScoreItem[], targetScores: ScoreItem[], weight: number) {
  const targetByKey = new Map(targetScores.map((item) => [item.key, item.score]));
  return profileScores.reduce((sum, item) => {
    const target = targetByKey.get(item.key);
    if (target === undefined) return sum;
    return sum + (item.score / 100) * (target / 100) * weight;
  }, 0);
}

export function scoreEducationForState(education: EducationOption, state: AppState) {
  const user = state.user;
  const tags = profileTags(state);
  const tagFallback = scoreEducation(education, tags);
  if (!user) return tagFallback;
  const interestMatch = vectorScore(user.interestScores, education.interestScores ?? [], 12);
  const skillMatch = vectorScore(user.skillScores, education.skillScores ?? [], 8);
  const domainBoost = education.domain && user.selectedDomains.includes(education.domain) ? 8 : 0;
  const hasStructuredProfile = Boolean((education.interestScores?.length ?? 0) + (education.skillScores?.length ?? 0));
  return interestMatch + skillMatch + domainBoost + (hasStructuredProfile ? tagFallback * 0.25 : tagFallback);
}

export function scoreJob(job: Job, tags: string[]) {
  return overlapScore(job.tags, tags, 2) + overlapScore(job.skills, tags, 1) + overlapScore(job.domains, tags, 2);
}

export function scoreJobForState(job: Job, state: AppState) {
  const user = state.user;
  const tagFallback = scoreJob(job, profileTags(state));
  if (!user) return tagFallback;
  const interestMatch = vectorScore(user.interestScores, job.interestScores ?? [], 10);
  const skillMatch = vectorScore(user.skillScores, job.skillScores ?? [], 10);
  const domainBoost = job.domains.some((domain) => user.selectedDomains.includes(domain)) ? 8 : 0;
  const hasStructuredProfile = Boolean((job.interestScores?.length ?? 0) + (job.skillScores?.length ?? 0));
  return interestMatch + skillMatch + domainBoost + (hasStructuredProfile ? tagFallback * 0.2 : tagFallback);
}

export function weakSkillLabels(state: AppState) {
  return [...(state.user?.skillScores ?? [])]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((item) => item.label);
}

export function rankByProfile<T>(items: T[], scorer: (item: T) => number) {
  return [...items].sort((a, b) => scorer(b) - scorer(a));
}

export function filterTagsFor(state: AppState, filter: "all" | "profile" | "A" | "B" | "C") {
  if (filter === "all") return [];
  if (filter === "profile") return profileTags(state);
  return planTags(state.plans[filter]);
}

export function matchesFilter(itemTags: string[], activeTags: string[], filter: string) {
  if (filter === "all") return true;
  if (activeTags.length === 0) return false;
  return itemTags.some((tag) => activeTags.map(normalize).includes(normalize(tag)));
}
