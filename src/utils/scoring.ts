import type { ActivePlanFilter, AppState, Plan, ScoreItem } from "../types";

function scoredTags(items: ScoreItem[]) {
  return items.filter((item) => item.score >= 60).flatMap((item) => item.tags);
}

export function profileTags(state: AppState): string[] {
  const user = state.user;
  if (!user) return [];

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
  return Array.from(
    new Set(
      [
        plan.education?.pealkiri ?? "",
        plan.education?.oppeaste ?? "",
        ...plan.jobs.map((job) => job.nimi),
        ...plan.courses.flatMap((course) => [course.pealkiri, ...course.tags]),
      ].filter(Boolean),
    ),
  );
}

export function filterTagsFor(state: AppState, filter: ActivePlanFilter) {
  if (filter === "all") return [];
  if (filter === "profile") return profileTags(state);
  return planTags(state.plans[filter]);
}
