import OpenAI from "openai";
import dotenv from "dotenv";
import path from "node:path";

const runtimeDirectory = typeof __dirname === "string" ? __dirname : process.cwd();

dotenv.config({ path: path.resolve(runtimeDirectory, ".env"), quiet: true });

export function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

export function getOpenAITimeoutMs() {
  const parsed = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45000;
}

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    maxRetries: 0,
    timeout: getOpenAITimeoutMs(),
  });
}

export async function probeOpenAI(): Promise<{ ok: boolean; durationMs: number; model: string; message?: string }> {
  const client = createOpenAIClient();
  const model = getModel();
  if (!client) return { ok: false, durationMs: 0, model, message: "OPENAI_API_KEY missing" };
  const started = Date.now();
  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "Reply with the JSON {\"ok\":true} and nothing else." },
        { role: "user", content: "ping" },
      ],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message?.content ?? "";
    return { ok: content.includes("ok"), durationMs: Date.now() - started, model };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - started,
      model,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
