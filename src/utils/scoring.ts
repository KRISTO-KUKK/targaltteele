import { courses, educationOptions, jobs } from "../data/demoData";
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
  const education = educationOptions.find((item) => item.id === plan.educationId);
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

export function scoreEducation(education: EducationOption, tags: string[]) {
  return overlapScore(education.tags, tags, 2) + overlapScore(education.relatedSkills, tags, 1);
}

export function scoreJob(job: Job, tags: string[]) {
  return overlapScore(job.tags, tags, 2) + overlapScore(job.skills, tags, 1) + overlapScore(job.domains, tags, 2);
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
