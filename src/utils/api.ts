import type {
  CatalogAmet,
  CatalogCourse,
  CatalogCurriculum,
  FreeTextAnalysis,
  ProfileSummary,
  RecommendationResponse,
  ScoreItem,
  TestAnalysis,
} from "../types";
import { mockFreeTextAnalysis, mockProfileSummary, mockTestAnalysis } from "./mockAnalyzer";

const apiBasePath = (import.meta.env.VITE_API_BASE_PATH || "").replace(/\/+$/, "");

function apiUrl(path: string) {
  return `${apiBasePath}${path}`;
}

function logApi(stage: string, details: Record<string, unknown>) {
  console.info(`[api] ${stage}`, { at: new Date().toISOString(), ...details });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 75000) {
  const controller = new AbortController();
  const started = performance.now();
  const url = String(input);
  const timer = window.setTimeout(() => controller.abort(), ms);
  logApi("request:start", { url, method: init.method ?? "GET", timeoutMs: ms });
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    logApi("request:done", { url, status: response.status, durationMs: Math.round(performance.now() - started) });
    return response;
  } catch (error) {
    logApi("request:error", { url, durationMs: Math.round(performance.now() - started), message: error instanceof Error ? error.message : String(error) });
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json() as Promise<T>;
}

export async function analyzeTest(kind: "interests" | "skills", text: string, file: File | null): Promise<TestAnalysis> {
  try {
    logApi("analyze-test:start", { kind, textLength: text.length, hasFile: Boolean(file), fileName: file?.name, fileType: file?.type });
    const formData = new FormData();
    formData.set("text", text);
    if (file) formData.set("file", file);
    const result = await readJson<TestAnalysis>(await fetchWithTimeout(apiUrl(`/api/analyze/${kind}`), { method: "POST", body: formData }));
    logApi("analyze-test:done", { kind, scoreCount: result.scores.length, source: result.source, message: result.message });
    return result;
  } catch (error) {
    logApi("analyze-test:fallback", { kind, message: error instanceof Error ? error.message : String(error) });
    return mockTestAnalysis(kind, "AI analüüs ei olnud hetkel saadaval. Näidisandmeid ei kasutata; palun proovi uuesti või kleebi testi protsendid tekstina.");
  }
}

export async function analyzeFreeText(text: string): Promise<FreeTextAnalysis> {
  const started = performance.now();
  try {
    logApi("free-text:start", { textLength: text.length, hasText: Boolean(text.trim()) });
    const result = await readJson<FreeTextAnalysis>(
      await fetchWithTimeout(apiUrl("/api/analyze/free-text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    );
    logApi("free-text:done", {
      durationMs: Math.round(performance.now() - started),
      source: result.source,
      tagCount: result.tags.length,
      interestScoreCount: result.interestScores.length,
      skillScoreCount: result.skillScores.length,
      hasMessage: Boolean(result.message),
    });
    return result;
  } catch (error) {
    logApi("free-text:fallback", {
      durationMs: Math.round(performance.now() - started),
      message: error instanceof Error ? error.message : String(error),
    });
    return mockFreeTextAnalysis(text);
  }
}

export type RecommendationInput = {
  interestScores: Pick<ScoreItem, "key" | "score">[];
  skillScores: Pick<ScoreItem, "key" | "score">[];
  freeText: string;
  freeTextGoals: string[];
  freeTextConcerns: string[];
  tags: string[];
  selectedDomains: string[];
  aiSummary: string;
};

const recommendationCache = new Map<string, Promise<RecommendationResponse>>();
const recommendationResolved = new Map<string, RecommendationResponse>();

function recommendationKey(payload: RecommendationInput) {
  return JSON.stringify(payload);
}

export async function getRecommendations(payload: RecommendationInput): Promise<RecommendationResponse> {
  const key = recommendationKey(payload);
  const existing = recommendationCache.get(key);
  if (existing) return existing;
  const request = (async () => {
    logApi("recommend:start", {
      interestScoreCount: payload.interestScores.length,
      skillScoreCount: payload.skillScores.length,
      selectedDomainCount: payload.selectedDomains.length,
      freeTextLength: payload.freeText.length,
    });
    const response = await fetchWithTimeout(apiUrl("/api/recommend"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await readJson<RecommendationResponse>(response);
    logApi("recommend:done", { source: result.source, curriculumCount: result.refinedCurricula.length, courseCount: result.suggestedCourses.length });
    recommendationResolved.set(key, result);
    return result;
  })().catch((error) => {
    recommendationCache.delete(key);
    throw error;
  });
  recommendationCache.set(key, request);
  return request;
}

export function prefetchRecommendations(payload: RecommendationInput) {
  void getRecommendations(payload).catch(() => {});
}

export function peekRecommendations(payload: RecommendationInput): RecommendationResponse | undefined {
  return recommendationResolved.get(recommendationKey(payload));
}

export function clearRecommendationCache() {
  recommendationCache.clear();
  recommendationResolved.clear();
}

export type CatalogQuery = {
  interestScores: Pick<ScoreItem, "key" | "score">[];
  skillScores: Pick<ScoreItem, "key" | "score">[];
  freeText: string;
  freeTextGoals: string[];
  freeTextConcerns: string[];
  tags: string[];
  selectedDomains: string[];
  aiSummary: string;
};

const catalogCache = new Map<string, Promise<unknown[]>>();
const catalogResolved = new Map<string, unknown[]>();

function cacheKey(path: string, payload: CatalogQuery) {
  return `${path}::${JSON.stringify(payload)}`;
}

async function postCatalog<T>(path: string, payload: CatalogQuery): Promise<T[]> {
  const key = cacheKey(path, payload);
  const cached = catalogCache.get(key) as Promise<T[]> | undefined;
  if (cached) return cached;
  const request = (async () => {
    try {
      const response = await fetchWithTimeout(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await readJson<{ items: T[] }>(response);
      const items = Array.isArray(json.items) ? json.items : [];
      catalogResolved.set(key, items);
      return items;
    } catch (error) {
      catalogCache.delete(key);
      throw error;
    }
  })();
  catalogCache.set(key, request as Promise<unknown[]>);
  return request;
}

function peekCatalog<T>(path: string, payload: CatalogQuery): T[] | undefined {
  return catalogResolved.get(cacheKey(path, payload)) as T[] | undefined;
}

export function getCatalogCurricula(payload: CatalogQuery) {
  return postCatalog<CatalogCurriculum>("/api/catalog/curricula", payload);
}

export function getCatalogCourses(payload: CatalogQuery) {
  return postCatalog<CatalogCourse>("/api/catalog/courses", payload);
}

export function getCatalogJobs(payload: CatalogQuery) {
  return postCatalog<CatalogAmet>("/api/catalog/jobs", payload);
}

export function peekCatalogCurricula(payload: CatalogQuery): CatalogCurriculum[] | undefined {
  return peekCatalog<CatalogCurriculum>("/api/catalog/curricula", payload);
}

export function peekCatalogCourses(payload: CatalogQuery): CatalogCourse[] | undefined {
  return peekCatalog<CatalogCourse>("/api/catalog/courses", payload);
}

export function peekCatalogJobs(payload: CatalogQuery): CatalogAmet[] | undefined {
  return peekCatalog<CatalogAmet>("/api/catalog/jobs", payload);
}

export function prefetchCatalog(payload: CatalogQuery) {
  void getCatalogCurricula(payload).catch(() => {});
  void getCatalogCourses(payload).catch(() => {});
  void getCatalogJobs(payload).catch(() => {});
}

export function clearCatalogCache() {
  catalogCache.clear();
  catalogResolved.clear();
}

export async function analyzeProfileSummary(payload: unknown): Promise<ProfileSummary> {
  const started = performance.now();
  const mode = typeof payload === "object" && payload && "mode" in payload ? String((payload as { mode?: unknown }).mode) : "unknown";
  try {
    logApi("profile-summary:start", { mode });
    const result = await readJson<ProfileSummary>(
      await fetchWithTimeout(apiUrl("/api/analyze/profile-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    logApi("profile-summary:done", { mode, durationMs: Math.round(performance.now() - started), hasMessage: Boolean(result.message) });
    return result;
  } catch (error) {
    logApi("profile-summary:fallback", {
      mode,
      durationMs: Math.round(performance.now() - started),
      message: error instanceof Error ? error.message : String(error),
    });
    return mockProfileSummary(payload, "AI analüüs ei olnud hetkel saadaval. Näidisandmeid ei kasutata; jätkame ainult sinu sisestatud profiiliandmetega.");
  }
}
