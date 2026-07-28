// Route: POST /api/tts/speak
// Deepgram Aura-2 text-to-speech — returns real synthesized audio (mp3 bytes)
// for a line of narration. Built for EchoPitch (Aura career video), which
// previously narrated only through the browser's Web Speech API — audio that
// plays live but can never be captured into a MediaRecorder recording (a
// hard browser limitation, not a bug in our code). This endpoint returns
// real audio bytes the client can decode via Web Audio API and mix into the
// exported video, so downloaded EchoPitch videos finally have real sound.
//
// See lib/deepgram.js's synthesizeSpeech() header for the honest limitation:
// Deepgram's Aura-2 catalog has no Indian-English (en-in) voice today — the
// default model here is American English, not Indian, and must not be
// mislabeled in the UI.

import { Router } from "express"
import { synthesizeSpeech } from "../lib/deepgram.js"

const router = Router()

// POST /api/tts/speak  { text: string }  -> audio/mpeg bytes
router.post("/speak", async (req, res) => {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return res.status(503).json({ error: "Text-to-speech not configured. Add DEEPGRAM_API_KEY to .env" })
    }
    const { text } = req.body || {}
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" })
    }
    const { audioBuffer, contentType } = await synthesizeSpeech(text)
    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "no-store")
    res.status(200).send(audioBuffer)
  } catch (e) {
    console.error("[tts/speak]", e.message)
    res.status(500).json({ error: e.message })
  }
})

export default router
