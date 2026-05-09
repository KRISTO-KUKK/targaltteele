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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, ms = 35000) {
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

const inFlightRecommendations = new Map<string, Promise<RecommendationResponse>>();

export async function getRecommendations(payload: RecommendationInput): Promise<RecommendationResponse> {
  const key = JSON.stringify(payload);
  const existing = inFlightRecommendations.get(key);
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
    return result;
  })().finally(() => {
    inFlightRecommendations.delete(key);
  });
  inFlightRecommendations.set(key, request);
  return request;
}

export type CatalogQuery = {
  interestScores: Pick<ScoreItem, "key" | "score">[];
  skillScores: Pick<ScoreItem, "key" | "score">[];
  freeText: string;
  freeTextGoals: string[];
  freeTextConcerns: string[];
  tags: string[];
  selectedDomains: string[];
};

async function postCatalog<T>(path: string, payload: CatalogQuery): Promise<T[]> {
  const response = await fetchWithTimeout(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await readJson<{ items: T[] }>(response);
  return Array.isArray(json.items) ? json.items : [];
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
