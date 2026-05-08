import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export function hasApiKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.5";
}

export function createOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
