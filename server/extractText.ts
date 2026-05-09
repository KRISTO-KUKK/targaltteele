import fs from "node:fs/promises";
import path from "node:path";
import { createOpenAIClient, getModel } from "./openaiClient";

export type ExtractedTextResult = {
  text: string;
  savedPath: string | null;
  method: "plain-text" | "pdf-parse" | "image-ocr" | "none";
};

export async function extractTextFromUpload(kind: "interests" | "skills", file?: Express.Multer.File): Promise<ExtractedTextResult> {
  if (!file) return { text: "", savedPath: null, method: "none" };

  let text = "";
  let method: ExtractedTextResult["method"] = "none";

  if (file.mimetype === "text/plain") {
    text = file.buffer.toString("utf8");
    method = "plain-text";
  } else if (file.mimetype === "application/pdf") {
    throw new Error("PDF text extraction is not available in the bundled server build");
  } else if (file.mimetype.startsWith("image/")) {
    text = await extractTextFromImage(file.mimetype, file.buffer.toString("base64"));
    method = "image-ocr";
  }

  const savedPath = text.trim() ? await saveExtractedText(kind, file.originalname, text) : null;
  return { text, savedPath, method };
}

async function extractTextFromImage(mimeType: string, base64: string) {
  const client = createOpenAIClient();
  if (!client) throw new Error("Missing OPENAI_API_KEY");
  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: "system",
        content:
          "Oled OCR-tööriist. Loe pildilt välja kogu nähtav tekst. Ära analüüsi, ära kokkuvõtlikusta, ära paranda sisu. Tagasta ainult loetav tekst reavahetustega.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Väljasta selle pildi tekst võimalikult täpselt." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ] as any,
      },
    ],
  });
  return response.choices[0]?.message?.content ?? "";
}

async function saveExtractedText(kind: string, originalName: string, text: string) {
  const directory = path.resolve("extracted-text");
  await fs.mkdir(directory, { recursive: true });
  const safeName = originalName.replace(/[^\w.-]+/g, "_").slice(0, 80) || "upload";
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${kind}-${safeName}.txt`;
  const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, text, "utf8");
  return path.relative(process.cwd(), filePath);
}
