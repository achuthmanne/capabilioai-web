// ─── Deepgram speech-to-text client ──────────────────────────────────────────
// USE: Voice AI Interview in Aura — user speaks answers, Deepgram transcribes,
//      Claude evaluates the spoken response.
//
// Model: nova-2 (best accuracy for Indian English accents)
// Cost:  $0.0043/minute — a 3-min interview = ~$0.013
//
// Frontend flow:
//   1. User clicks "Start Voice Interview"
//   2. Browser records audio → MediaRecorder API
//   3. Send audio blob to POST /api/interview/transcribe
//   4. Deepgram returns transcript
//   5. Claude Haiku evaluates transcript as interview answer
//   6. Return score + feedback to frontend

const DEEPGRAM_URL = "https://api.deepgram.com/v1/listen"

export async function transcribeAudio(audioBuffer, mimeType = "audio/webm") {
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) throw new Error("DEEPGRAM_API_KEY not set")

  const res = await fetch(`${DEEPGRAM_URL}?model=nova-2&language=en-IN&smart_format=true&punctuate=true`, {
    method:  "POST",
    headers: {
      Authorization:  `Token ${key}`,
      "Content-Type": mimeType,
    },
    body: audioBuffer,
  })
  if (!res.ok) throw new Error(`Deepgram ${res.status}: ${(await res.text()).slice(0,200)}`)

  const data = await res.json()
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ""
  const confidence = data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
  const duration   = data.metadata?.duration || 0

  return { transcript, confidence, duration }
}

// ── Transcribe + evaluate as interview answer ─────────────────────────────────
// One-shot: audio → transcript → Claude evaluation → score
export async function transcribeAndEvaluate(audioBuffer, { question, mimeType = "audio/webm" } = {}) {
  const { transcript, confidence, duration } = await transcribeAudio(audioBuffer, mimeType)

  if (!transcript || transcript.trim().length < 10) {
    return { transcript, score: 0, feedback: "No speech detected. Please speak clearly.", confidence, duration }
  }

  // Import Claude here to avoid circular deps
  const { claude, CLAUDE_HAIKU } = await import("./claude.js")
  const evaluation = await claude([{
    role: "user",
    content: `Evaluate this spoken interview answer.

Question: ${question || "Tell me about yourself"}
Answer (spoken, transcribed): "${transcript}"

Score this as a technical interview evaluator. Return JSON:
{
  "score": <0-100>,
  "clarity": <0-100>,
  "relevance": <0-100>,
  "depth": <0-100>,
  "summary": "<2 sentence assessment>",
  "strength": "<what they did well>",
  "improve": "<one specific improvement>"
}`,
  }], { model: CLAUDE_HAIKU, maxTokens: 400, json: true })

  return { transcript, confidence, duration, ...evaluation }
}
