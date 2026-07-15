// ─── Route: POST /api/groq/chat ─────────────────────────────────────────────
// P0 FIX (2026-07-14): CopilotWidget.jsx ("Capi") previously called Groq's
// chat-completions API DIRECTLY from the browser using VITE_GROQ_API_KEY —
// a key bundled into the client JS, inspectable by anyone via devtools or the
// network tab. This route relocates that call server-side, behind the same
// GROQ_API_KEY the rest of the backend already uses (backend/server/lib/groq.js).
//
// Deliberately a thin, faithful proxy — NOT a rewrite of Capi's logic:
//   - Forwards the exact same body shape the widget already sends
//     (model, temperature, max_tokens, stream, messages) straight to Groq.
//   - When stream:true, pipes Groq's raw SSE response back byte-for-byte, so
//     the widget's existing `data: {...}` chunk-parsing loop needs zero changes.
//   - When stream:false (used by the intent classifier), forwards the JSON
//     response as-is.
// All prompt content, classifier logic, tier gating, quality/drift checks,
// and streaming UX in the widget are untouched — only the network destination
// and the API key moved.

import { Router } from "express"

const router = Router()
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

// Whitelist of fields the client may set — never let the client set the
// Authorization header or override the API key.
function sanitizeBody(body) {
  const { model, temperature, max_tokens, stream, messages } = body || {}
  return { model, temperature, max_tokens, stream, messages }
}

router.post("/chat", async (req, res) => {
  const key = process.env.GROQ_API_KEY
  if (!key || key === "your_groq_api_key_here") {
    return res.status(500).json({ error: "GROQ_API_KEY not configured on the server" })
  }

  const body = sanitizeBody(req.body)
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: "messages is required" })
  }

  let upstream
  try {
    upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })
  } catch (e) {
    return res.status(502).json({ error: `Groq unreachable: ${e.message}` })
  }

  if (!body.stream) {
    // Non-streaming path (used by the intent classifier) — forward JSON as-is.
    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader("Content-Type", "application/json")
    return res.send(text)
  }

  // Streaming path — pipe Groq's SSE response through unchanged.
  res.status(upstream.status)
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  if (!upstream.body) {
    return res.end()
  }

  const reader = upstream.body.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch (e) {
    console.error("[groq-proxy] stream error:", e.message)
  } finally {
    res.end()
  }
})

export default router
