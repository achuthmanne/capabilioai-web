// Route: POST /api/voice/transcribe
// Deepgram nova-2 → Claude Haiku evaluation
// Used by Aura AI Interview tab for voice-based interview practice

import { Router } from "express"
import multer     from "multer"
import { transcribeAndEvaluate, transcribeAudio } from "../lib/deepgram.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } })

// ── POST /api/voice/transcribe ────────────────────────────────────────────────
// Body: multipart/form-data with fields: audio (file), question (string)
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file uploaded" })
    if (!process.env.DEEPGRAM_API_KEY) {
      return res.status(503).json({ error: "Voice transcription not configured. Add DEEPGRAM_API_KEY to .env" })
    }

    const question = req.body.question || ""
    const mime     = req.file.mimetype || "audio/webm"

    const result = await transcribeAndEvaluate(req.file.buffer, { question, mimeType: mime })
    return res.json(result)
  } catch (e) {
    console.error("[voice/transcribe]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── POST /api/voice/transcribe-only ──────────────────────────────────────────
// Just transcription, no evaluation — for real-time streaming use
router.post("/transcribe-only", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No audio file" })
    const { transcript, confidence, duration } = await transcribeAudio(req.file.buffer, req.file.mimetype)
    return res.json({ transcript, confidence, duration })
  } catch (e) { console.error("[voice/transcribe-only]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
