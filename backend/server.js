import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (.env in backend or root)
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Helper to resolve paths
const SHARED_LIB_PATH = path.join(__dirname, "..", "shared", "componentLibrary.json");
const BACKEND_LIB_PATH = path.join(__dirname, "data", "componentLibrary.json");
const SAMPLE_PATH = path.join(__dirname, "sample.json");

// Helper to load component library
export function getComponentLibrary() {
  const libPath = fs.existsSync(SHARED_LIB_PATH) ? SHARED_LIB_PATH : BACKEND_LIB_PATH;
  if (!fs.existsSync(libPath)) {
    return [];
  }
  const raw = fs.readFileSync(libPath, "utf-8");
  return JSON.parse(raw);
}

// 1. Component Library API
app.get("/api/components", (req, res) => {
  try {
    const library = getComponentLibrary();
    res.json(library);
  } catch (err) {
    console.error("Failed to load components:", err);
    res.status(500).json({ error: "Failed to load component library" });
  }
});

// 2. Health & Provider Status
app.get("/api/status", (req, res) => {
  res.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
    grok: Boolean(process.env.GROK_API_KEY || process.env.XAI_API_KEY)
  });
});

// 3. Sample Demo Circuit
app.get("/api/sample", (req, res) => {
  try {
    if (fs.existsSync(SAMPLE_PATH)) {
      const data = JSON.parse(fs.readFileSync(SAMPLE_PATH, "utf-8"));
      return res.json(data);
    }
    res.status(404).json({ error: "sample.json not found" });
  } catch (err) {
    res.status(500).json({ error: "Failed to read sample.json" });
  }
});

// 4. Chat Endpoint (Preserving existing chat function)
app.post("/api/chat", async (req, res) => {
  const { messages, spec, sel } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const systemPrompt = `Tum Decompile 3D ke AI tutor ho. Ek normal chatbot ki tarah baat karo: student jo puche sirf utna hi, seedha jawab do.
Electronics ke har sawal ka jawab do. Hinglish/English/Hindi allowed hai. HTML tags na use karo.
BOARD JSON: ${JSON.stringify(spec || {})}
${sel ? "SELECTED PART: " + JSON.stringify(sel) : ""}`;

  const msgs = [{ role: "system", content: systemPrompt }, ...messages.slice(-10)];

  // Try Groq first if key present
  if (process.env.GROQ_API_KEY) {
    try {
      const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({ model, messages: msgs, max_tokens: 1200 })
      });
      const data = await groqRes.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (reply) {
        return res.json({ reply: reply.trim(), provider: "groq" });
      }
    } catch (e) {
      console.warn("Groq chat failed:", e.message);
    }
  }

  // Fallback to Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const chatContents = messages.slice(-10).map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      }));
      if (!chatContents.length) chatContents.push({ role: "user", parts: [{ text: "Hello" }] });

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: chatContents
          })
        }
      );
      const data = await geminiRes.json();
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return res.json({ reply: reply.trim(), provider: "gemini" });
      }
    } catch (e) {
      console.warn("Gemini chat failed:", e.message);
    }
  }

  return res.json({
    reply: "Tutor connect nahi ho paya. Kripya .env me GROQ_API_KEY ya GEMINI_API_KEY check karein."
  });
});

// 5. Image Analyze Endpoint (Preserving existing vision endpoint)
app.post("/api/analyze", async (req, res) => {
  const { image } = req.body || {};
  if (!image) {
    return res.status(400).json({ error: "Image data is required" });
  }
  if (!process.env.GEMINI_API_KEY && !process.env.VISION_API_KEY) {
    return res.status(400).json({ error: "GEMINI_API_KEY or VISION_API_KEY required in backend/.env" });
  }

  let mime = "image/jpeg";
  let b64 = image;
  if (image.includes(",")) {
    const parts = image.split(",", 2);
    const mimeMatch = parts[0].match(/data:([\w/+.-]+);/);
    if (mimeMatch) mime = mimeMatch[1];
    b64 = parts[1];
  }

  const prompt = `You are looking at a photo of a PCB. Return ONLY valid JSON, no markdown:
{"board":{"aspect":1.0,"name":"Detected PCB"},
"parts":[{"type":"usb_c|inductor|ic|resistor|capacitor|cap_electrolytic|diode|led|pad|hole|connector|transistor|crystal|button|antenna|other",
"label":"U1","value":"","x":50,"y":50,"w":10,"h":10,"role":"short Hinglish description"}]}`;

  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      }
    );
    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return res.status(502).json({ error: "Vision AI returned empty response" });
    }
    const parsed = JSON.parse(text);
    return res.json(parsed);
  } catch (e) {
    return res.status(502).json({ error: "Vision AI processing failed: " + e.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Decompile3D Backend running on http://localhost:${PORT}`);
});
