import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import path from "node:path";
import { analyzeFreeText, analyzeProfileSummary, analyzeTest } from "./analyze";
import { extractTextFromUpload } from "./extractText";
import { mockTest } from "./mock";
import { getRecommendations, type RecommendInput } from "./recommend";
import { rankAmetid, rankCourses, rankCurricula, type CatalogInput } from "./catalog";

const runtimeDirectory = typeof __dirname === "string" ? __dirname : process.cwd();

dotenv.config({ path: path.resolve(runtimeDirectory, ".env"), quiet: true });

const app = express();
const port = Number(process.env.PORT || 8787);
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigin = process.env.ALLOWED_ORIGIN?.split(",").map((origin) => origin.trim()).filter(Boolean);
const clientDirectory = path.resolve(runtimeDirectory, "dist");
const appBasePath = normalizeBasePath(process.env.APP_BASE_PATH || "");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["text/plain", "application/pdf", "image/png", "image/jpeg"];
    cb(null, allowed.includes(file.mimetype));
  },
});

if (allowedOrigin?.length) {
  app.use(cors({ origin: allowedOrigin }));
} else if (!isProduction) {
  app.use(cors({ origin: true }));
}
app.use(express.json({ limit: "1mb" }));

const apiRouter = express.Router();

apiRouter.use((req, res, next) => {
  const started = Date.now();
  console.log(`[api] ${req.method} ${req.originalUrl} start`, {
    at: new Date().toISOString(),
    contentType: req.headers["content-type"],
  });
  res.on("finish", () => {
    console.log(`[api] ${req.method} ${req.originalUrl} done`, {
      at: new Date().toISOString(),
      status: res.statusCode,
      durationMs: Date.now() - started,
    });
  });
  next();
});

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.post("/analyze/interests", upload.single("file"), async (req, res) => {
  res.json(await analyzeUploadedTest("interests", req.body.text, req.file));
});

apiRouter.post("/analyze/skills", upload.single("file"), async (req, res) => {
  res.json(await analyzeUploadedTest("skills", req.body.text, req.file));
});

apiRouter.post("/analyze/free-text", async (req, res) => {
  res.json(await analyzeFreeText(String(req.body.text ?? "")));
});

apiRouter.post("/analyze/profile-summary", async (req, res) => {
  res.json(await analyzeProfileSummary(req.body));
});

function readCatalogInput(body: any): CatalogInput {
  const safe = (body ?? {}) as Partial<CatalogInput>;
  return {
    interestScores: Array.isArray(safe.interestScores) ? safe.interestScores : [],
    skillScores: Array.isArray(safe.skillScores) ? safe.skillScores : [],
    freeText: typeof safe.freeText === "string" ? safe.freeText : "",
    freeTextGoals: Array.isArray(safe.freeTextGoals) ? safe.freeTextGoals.map(String) : [],
    freeTextConcerns: Array.isArray(safe.freeTextConcerns) ? safe.freeTextConcerns.map(String) : [],
    tags: Array.isArray(safe.tags) ? safe.tags.map(String) : [],
    selectedDomains: Array.isArray(safe.selectedDomains) ? safe.selectedDomains.map(String) : [],
  };
}

apiRouter.post("/catalog/curricula", (req, res) => {
  res.json({ items: rankCurricula(readCatalogInput(req.body)) });
});

apiRouter.post("/catalog/courses", (req, res) => {
  res.json({ items: rankCourses(readCatalogInput(req.body)) });
});

apiRouter.post("/catalog/jobs", (req, res) => {
  res.json({ items: rankAmetid(readCatalogInput(req.body)) });
});

apiRouter.post("/recommend", async (req, res) => {
  const body = (req.body ?? {}) as Partial<RecommendInput>;
  const input: RecommendInput = {
    interestScores: Array.isArray(body.interestScores) ? body.interestScores : [],
    skillScores: Array.isArray(body.skillScores) ? body.skillScores : [],
    freeText: typeof body.freeText === "string" ? body.freeText : "",
    freeTextGoals: Array.isArray(body.freeTextGoals) ? body.freeTextGoals.map(String) : [],
    freeTextConcerns: Array.isArray(body.freeTextConcerns) ? body.freeTextConcerns.map(String) : [],
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    selectedDomains: Array.isArray(body.selectedDomains) ? body.selectedDomains.map(String) : [],
    aiSummary: typeof body.aiSummary === "string" ? body.aiSummary : "",
  };
  res.json(await getRecommendations(input));
});

app.use("/api", apiRouter);
if (appBasePath) {
  app.use(`${appBasePath}/api`, apiRouter);
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ message: "Fail on liiga suur. Palun laadi väiksem fail või kleebi tulemuse tekst." });
    return;
  }
  res.status(400).json({ message: "Faili ei saanud töödelda. Palun kleebi tulemuse tekst käsitsi." });
});

if (isProduction) {
  app.use(appBasePath || "/", express.static(clientDirectory));
  app.use((req, res, next) => {
    const isAppRoute = !appBasePath || req.path === appBasePath || req.path.startsWith(`${appBasePath}/`);
    if (req.method === "GET" && isAppRoute && !req.path.includes("/api/")) {
      res.sendFile(path.join(clientDirectory, "index.html"));
      return;
    }
    next();
  });
}

app.listen(port, () => {
  console.log(`Targalt teele API server listening on http://127.0.0.1:${port}`);
});

function normalizeBasePath(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

async function analyzeUploadedTest(kind: "interests" | "skills", text = "", file?: Express.Multer.File) {
  console.log("[api] analyze-uploaded-test:start", {
    at: new Date().toISOString(),
    kind,
    textLength: text.length,
    file: file ? { originalname: file.originalname, mimetype: file.mimetype, size: file.size } : null,
  });
  try {
    const extracted = await extractTextFromUpload(kind, file);
    const combinedText = [text, extracted.text].filter(Boolean).join("\n\n");
    if (!combinedText.trim() && file) {
      return mockTest(kind, "Fail võeti vastu, aga sellest ei õnnestunud loetavat teksti kätte saada. Proovi tulemuse tekst käsitsi kleepida või laadi selgem pilt.");
    }
    const result = await analyzeTest(kind, combinedText);
    return {
      ...result,
      extractedTextFile: extracted.savedPath,
      extractedTextMethod: extracted.method,
    };
  } catch (error) {
    console.log("[api] analyze-uploaded-test:error", {
      at: new Date().toISOString(),
      kind,
      message: error instanceof Error ? error.message : String(error),
    });
    if (file?.mimetype.startsWith("image/")) {
      return mockTest(kind, "Pildi OCR ei õnnestunud. Proovi selgemat pilti või kleebi tulemuse tekst käsitsi.");
    }
    if (file?.mimetype === "application/pdf") {
      return mockTest(kind, "PDF-i teksti ei õnnestunud välja lugeda. Proovi tulemuse tekst käsitsi kleepida või laadi pilt.");
    }
    return mockTest(kind, "Faili teksti ei õnnestunud töödelda. Proovi tulemuse tekst käsitsi kleepida.");
  }
}
