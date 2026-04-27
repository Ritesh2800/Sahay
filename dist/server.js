// server.ts
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from "firebase-admin";
import fs from "node:fs";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var adminDb = null;
var adminAuth = null;
function getAdmin() {
  if (!adminDb || !adminAuth) {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
    adminDb = admin.firestore();
    adminAuth = admin.auth();
  }
  return { db: adminDb, auth: adminAuth };
}
async function startServer() {
  const app = express();
  const PORT = 3e3;
  app.use(express.json({ limit: "10mb" }));
  app.get("/health", (req, res) => {
    res.send("OK");
  });
  app.post("/auth/verify", async (req, res) => {
    const { idToken } = req.body;
    try {
      const { auth } = getAdmin();
      const decodedToken = await auth.verifyIdToken(idToken);
      res.json({ uid: decodedToken.uid });
    } catch (error) {
      console.error("Error verifying token:", error);
      res.status(401).json({ error: "Unauthorized" });
    }
  });
  app.post("/api/ocr/scan", async (req, res) => {
    const { imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const base64Data = imageBase64.split(",")[1];
      const prompt = `
        You are an AI assistant helping NGOs digitize paper field reports.
        Analyze the image of a handwritten or printed field report and extract:
        1. All person names mentioned
        2. All needs/requirements (categorize each as: Food, Medical, Shelter, Rescue, or Other)
        3. Any locations or addresses mentioned
        4. Any urgency indicators (words like "urgent", "critical", "emergency", "asap")

        Return ONLY a valid JSON object with this exact structure:
        {
          "raw_text": "full transcribed text from the image",
          "extracted_items": [
            {
              "person_name": "string or null",
              "need_type": "Food|Medical|Shelter|Rescue|Other",
              "location": "string or null",
              "urgency": "low|medium|critical",
              "description": "string"
            }
          ],
          "summary": "string"
        }
        Return only JSON, no explanation, no markdown.
      `;
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg"
          }
        }
      ]);
      const response = await result.response;
      const text = response.text();
      const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } catch (error) {
      console.error("Gemini OCR error:", error);
      res.status(500).json({ error: "Failed to process image" });
    }
  });
  app.post("/api/sync/batch", async (req, res) => {
    const { actions } = req.body;
    try {
      for (const action of actions) {
      }
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ error: "Batch sync failed" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
        // Explicitly disable HMR in dev server middleware
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
