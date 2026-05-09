import type { AppState } from "../types";
import type { CatalogQuery } from "./api";

export function buildCatalogQuery(state: AppState): CatalogQuery {
  const user = state.user;
  if (!user) {
    return {
      interestScores: [],
      skillScores: [],
      freeText: "",
      freeTextGoals: [],
      freeTextConcerns: [],
      tags: [],
      selectedDomains: [],
    };
  }
  return {
    interestScores: user.interestScores.map(({ key, score }) => ({ key, score })),
    skillScores: user.skillScores.map(({ key, score }) => ({ key, score })),
    freeText: user.freeText,
    freeTextGoals: user.freeTextGoals,
    freeTextConcerns: user.freeTextConcerns,
    tags: Array.from(new Set([...user.interestTags, ...user.skillTags, ...user.freeTextTags])),
    selectedDomains: user.selectedDomains,
  };
}
