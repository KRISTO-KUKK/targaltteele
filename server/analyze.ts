import { createOpenAIClient, getModel } from "./openaiClient";
import { mockFreeText, mockProfile, mockTest } from "./mock";

const fallbackMessage = "AI analüüs ei olnud hetkel saadaval. Kasutame demoanalüüsi, et saaksid prototüüpi edasi vaadata.";

function parseJson(text: string) {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const json = start >= 0 && end >= start ? trimmed.slice(start, end + 1) : trimmed;
  return JSON.parse(json);
}

async function askJson(system: string, user: string) {
  const client = createOpenAIClient();
  if (!client) throw new Error("Missing OPENAI_API_KEY");
  const response = await client.responses.create({
    model: getModel(),
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_object" } },
  } as any);
  const output = (response as any).output_text ?? "";
  return parseJson(output);
}

const baseInstruction =
  "Analüüsi kasutaja minukarjäär.ee testi tulemust. Ära diagnoosi. Ära tee lõplikke järeldusi. Tõlgenda tulemust karjääri- ja õpitee planeerimise abivahendina. Vasta ainult JSON-ina. Tekstid peavad olema eesti keeles. Kasuta 0-100 skoore ainult indikatiivse tugevusena.";

export async function analyzeTest(kind: "interests" | "skills", text: string) {
  if (!text.trim()) return mockTest(kind, "Teksti ei olnud piisavalt. Kasutasime demoandmeid, et prototüübi teekonda saaks edasi vaadata.");
  try {
    const shape =
      kind === "interests"
        ? '{"scores":[{"key":"people","label":"Inimestega töötamine","score":86,"tags":["inimesed"]}],"tags":["inimesed"],"summary":"Lühike kokkuvõte."}'
        : '{"scores":[{"key":"communication","label":"Suhtlemine","score":84,"tags":["suhtlemine"]}],"tags":["suhtlemine"],"summary":"Lühike kokkuvõte."}';
    const result = await askJson(`${baseInstruction} Tagasta täpselt kujuga ${shape}`, text);
    return { ...result, source: "ai" };
  } catch {
    return mockTest(kind, fallbackMessage);
  }
}

export async function analyzeFreeText(text: string) {
  if (!text.trim()) return mockFreeText(text);
  try {
    const result = await askJson(
      'Analüüsi õpilase vaba teksti karjääri- ja õpitee planeerimise vaatest. Ära diagnoosi. Vasta ainult JSON-ina kujuga {"tags":[],"goals":[],"concerns":[],"summary":""}. Eesti keeles.',
      text,
    );
    return { ...result, source: "ai" };
  } catch {
    return mockFreeText(text, fallbackMessage);
  }
}

export async function analyzeProfileSummary(payload: unknown) {
  try {
    const result = await askJson(
      'Koosta ettevaatlik karjääri- ja õpitee profiili kokkuvõte. Ära tee lõplikke järeldusi. Ütle, et suunad on uurimiseks. Vasta ainult JSON-ina kujuga {"summary":"","possibleJobDirections":[],"possibleEducationDirections":[]}. Eesti keeles.',
      JSON.stringify(payload),
    );
    return { ...result, source: "ai" };
  } catch {
    return mockProfile(fallbackMessage);
  }
}
