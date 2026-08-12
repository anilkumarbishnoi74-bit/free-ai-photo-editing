import express from "express";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import os from "os";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({
  dest: path.join(os.tmpdir(), "free-ai-photo-editing"),
  limits: { fileSize: 20 * 1024 * 1024 }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.static("public"));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

function requireKey(res) {
  if (!OPENAI_API_KEY) {
    res.status(500).json({
      error: "OPENAI_API_KEY is missing. Copy .env.example to .env and add your API key."
    });
    return false;
  }
  return true;
}

async function openai(url, options) {
  const response = await fetch(`https://api.openai.com${url}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!response.ok) {
    const message = data?.error?.message || data?.raw || `OpenAI request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

// Generate a polished image prompt from a simple user idea.
app.post("/api/prompt", async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const idea = String(req.body?.idea || "").trim();
    if (!idea) return res.status(400).json({ error: "Please enter an image idea." });

    const data = await openai("/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.TEXT_MODEL || "gpt-5-mini",
        input: `Create one production-ready image-generation prompt for this idea:
${idea}

Return only the final prompt. Make it detailed, realistic, cinematic, composition-aware, and suitable for a modern AI image generator. Do not add commentary.`
      })
    });

    const prompt = data.output_text || data.output?.map(x =>
      x.content?.map(c => c.text || "").join("") || ""
    ).join("") || "";

    res.json({ prompt: prompt.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Generate an image from a prompt.
app.post("/api/generate", async (req, res) => {
  try {
    if (!requireKey(res)) return;
    const prompt = String(req.body?.prompt || "").trim();
    const size = ["1024x1024", "1536x1024", "1024x1536"].includes(req.body?.size)
      ? req.body.size : "1024x1024";

    if (!prompt) return res.status(400).json({ error: "Please enter a prompt." });

    const data = await openai("/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.IMAGE_MODEL || "gpt-image-1",
        prompt,
        size
      })
    });

    const item = data.data?.[0];
    if (!item) throw new Error("No image was returned.");

    // Some image APIs return base64, while other configurations may return a URL.
    if (item.b64_json) {
      return res.json({ image: `data:image/png;base64,${item.b64_json}` });
    }
    if (item.url) return res.json({ image: item.url });

    throw new Error("The image response did not contain an image.");
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Edit an uploaded photo using an image-edit endpoint.
app.post("/api/edit", upload.single("image"), async (req, res) => {
  let tempPath = req.file?.path;
  try {
    if (!requireKey(res)) return;
    if (!req.file) return res.status(400).json({ error: "Please upload an image." });

    const prompt = String(req.body?.prompt || "Improve this photo naturally while preserving the person's identity and important details.").trim();

    const form = new FormData();
    form.append("model", process.env.IMAGE_MODEL || "gpt-image-1");
    form.append("prompt", prompt);
    form.append("image", new Blob([fs.readFileSync(tempPath)], { type: req.file.mimetype }), req.file.originalname);

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.raw || `Image edit failed (${response.status})`);
    }

    const item = data.data?.[0];
    if (!item) throw new Error("No edited image was returned.");

    if (item.b64_json) return res.json({ image: `data:image/png;base64,${item.b64_json}` });
    if (item.url) return res.json({ image: item.url });

    throw new Error("The edit response did not contain an image.");
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (tempPath) fs.unlink(tempPath, () => {});
  }
});

// A local, lossless-ish 4K canvas upsize is intentionally NOT called AI upscaling.
// It gives the user a 3840x2160 output when the source is suitable.
app.post("/api/upscale-info", (req, res) => {
  res.json({
    message: "For true AI 4K enhancement, connect a dedicated super-resolution model/API. The current app can generate/edit images, but simply resizing to 4K does not create new detail."
  });
});

app.get("*splat", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

app.listen(port, () => {
  console.log(`Free AI Photo Editing running at http://localhost:${port}`);
});
