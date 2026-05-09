import type { FreeTextAnalysis, ProfileSummary, TestAnalysis } from "../types";
import { mockFreeTextAnalysis, mockProfileSummary, mockTestAnalysis } from "./mockAnalyzer";

const apiBasePath = (import.meta.env.VITE_API_BASE_PATH || "").replace(/\/+$/, "");

function apiUrl(path: string) {
  return `${apiBasePath}${path}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json() as Promise<T>;
}

export async function analyzeTest(kind: "interests" | "skills", text: string, file: File | null): Promise<TestAnalysis> {
  try {
    const formData = new FormData();
    formData.set("text", text);
    if (file) formData.set("file", file);
    return await readJson<TestAnalysis>(await fetch(apiUrl(`/api/analyze/${kind}`), { method: "POST", body: formData }));
  } catch {
    return mockTestAnalysis(kind, "AI analüüs ei olnud hetkel saadaval. Kasutame demoanalüüsi, et saaksid prototüüpi edasi vaadata.");
  }
}

export async function analyzeFreeText(text: string): Promise<FreeTextAnalysis> {
  try {
    return await readJson<FreeTextAnalysis>(
      await fetch(apiUrl("/api/analyze/free-text"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    );
  } catch {
    return mockFreeTextAnalysis(text, "AI analüüs ei olnud hetkel saadaval. Kasutame demoanalüüsi, et saaksid prototüüpi edasi vaadata.");
  }
}

export async function analyzeProfileSummary(payload: unknown): Promise<ProfileSummary> {
  try {
    return await readJson<ProfileSummary>(
      await fetch(apiUrl("/api/analyze/profile-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
  } catch {
    return mockProfileSummary("AI analüüs ei olnud hetkel saadaval. Kasutame demoanalüüsi, et saaksid prototüüpi edasi vaadata.");
  }
}
