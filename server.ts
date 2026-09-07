import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import os from "os";

dotenv.config();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // API Endpoints FIRST
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Diagnostic API: Detects host hardware specs (CPU cores, platform, free memory)
  app.get("/api/hardware", (_req, res) => {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const platform = os.platform(); // win32, linux, darwin
      const arch = os.arch();

      // Recommended worker count based on CPU cores
      const recommendedWorkers = Math.max(1, Math.min(8, Math.floor(cpus.length / 2) || 2));

      res.json({
        platform,
        arch,
        cpuModel: cpus[0]?.model || "Standard Processor",
        cpuCores: cpus.length,
        totalMemoryGb: (totalMem / (1024 * 1024 * 1024)).toFixed(1),
        freeMemoryGb: (freeMem / (1024 * 1024 * 1024)).toFixed(1),
        recommendedWorkers,
        hasGpuHint: false, // Default host check
        windowsCompatible: true,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Hardware query error";
      res.status(500).json({ error: message });
    }
  });

  // Optional Online Fallback Verification via Gemini API
  // Strictly called only if user enables online processing in settings
  app.post("/api/verify-gemini", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: "GEMINI_API_KEY is not configured in server environment.",
          available: false,
        });
      }

      const { phoneme, consonantRegion, vowelRegion, estimatedPreutterance, notes } = req.body;
      
      // Lazy import GoogleGenAI to prevent startup failures if unneeded
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `You are an expert acoustic phonetics and vocal synthesis engineer (UTAU / DiffSinger).
Evaluate this vocal segment candidate:
- Phoneme: "${phoneme}"
- Consonant Region: ${consonantRegion}ms
- Vowel Region: ${vowelRegion}ms
- Estimated Preutterance: ${estimatedPreutterance}ms
- Additional Acoustic Context: ${notes || "Standard singing voice sample"}

Provide a JSON response with:
{
  "consensusPhoneme": string,
  "confidenceScore": number (0-100),
  "isAcousticallyPlausible": boolean,
  "suggestedPreutteranceAdjustMs": number,
  "conflictReasoning": string
}
Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
      });

      const responseText = response.text?.trim() || "{}";
      const cleanJson = responseText.replace(/^```json\s*/, "").replace(/```$/, "");
      const parsed = JSON.parse(cleanJson);

      return res.json({
        engine: "gemini-fallback",
        available: true,
        verification: parsed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Online verification failed";
      return res.status(500).json({ error: message, available: false });
    }
  });

  // Vite Middleware for Dev vs Static Dist for Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Vocal Labeling Workstation] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
