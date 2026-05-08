import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { analyzeFreeText, analyzeProfileSummary, analyzeTest } from "./analyze";
import { hasApiKey } from "./openaiClient";
import { mockTest } from "./mock";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/plain", "application/pdf", "image/png", "image/jpeg"];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, apiKeyConfigured: hasApiKey() });
});

app.post("/api/analyze/interests", upload.single("file"), async (req, res) => {
  res.json(await analyzeUploadedTest("interests", req.body.text, req.file));
});

app.post("/api/analyze/skills", upload.single("file"), async (req, res) => {
  res.json(await analyzeUploadedTest("skills", req.body.text, req.file));
});

app.post("/api/analyze/free-text", async (req, res) => {
  res.json(await analyzeFreeText(String(req.body.text ?? "")));
});

app.post("/api/analyze/profile-summary", async (req, res) => {
  res.json(await analyzeProfileSummary(req.body));
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "Fail on liiga suur. Palun laadi väiksem fail või kleebi tulemuse tekst." });
    return;
  }
  res.status(400).json({ message: "Faili ei saanud töödelda. Palun kleebi tulemuse tekst või kasuta demoandmeid." });
});

app.listen(port, () => {
  console.log(`Targalt teele API server listening on http://127.0.0.1:${port}`);
});

async function analyzeUploadedTest(kind: "interests" | "skills", text = "", file?: Express.Multer.File) {
  const fileText = extractText(file);
  if (file && !fileText && file.mimetype === "application/pdf") {
    return mockTest(kind, "PDF võeti vastu, kuid prototüübis ei õnnestunud sellest teksti kindlalt välja lugeda. Kasutasime demoandmeid.");
  }
  if (file && !fileText && file.mimetype.startsWith("image/")) {
    return mockTest(kind, "Pilt võeti vastu, kuid pildilt tulemuse lugemine pole praegu saadaval. Kasutasime demoandmeid.");
  }
  return analyzeTest(kind, [text, fileText].filter(Boolean).join("\n\n"));
}

function extractText(file?: Express.Multer.File) {
  if (!file) return "";
  if (file.mimetype === "text/plain") return file.buffer.toString("utf8");
  return "";
}
