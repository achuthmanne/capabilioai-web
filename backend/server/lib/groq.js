// ─── Groq AI client ──────────────────────────────────────────────────────────
export const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions"
export const GROQ_BIG  = "llama-3.3-70b-versatile"   // complex tasks — 100K TPD free limit
export const GROQ_MID  = "llama-3.1-70b-versatile"   // first fallback (separate quota)
export const GROQ_FAST = "llama-3.1-8b-instant"       // second fallback / quick tasks — 500K TPD

// Model fallback chain: if primary hits 429, try these in order
const FALLBACK_CHAIN = {
  [GROQ_BIG]:  [GROQ_FAST],          // big model → fast model
  [GROQ_MID]:  [GROQ_FAST],
  [GROQ_FAST]: [],                    // no further fallback
}

async function callGroq(model, messages, { max_tokens, temperature, json }) {
  const res = await fetch(GROQ_URL, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    const error = new Error(`Groq ${res.status}: ${err.slice(0, 200)}`)
    error.status = res.status
    throw error
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ""
}

export async function groq(messages, {
  model       = GROQ_BIG,
  max_tokens  = 2048,
  temperature = 0.7,
  json        = false,
} = {}) {
  const modelsToTry = [model, ...(FALLBACK_CHAIN[model] || [])]

  for (const m of modelsToTry) {
    try {
      const result = await callGroq(m, messages, { max_tokens, temperature, json })
      if (m !== model) console.log(`[Groq] Fell back to ${m} (primary ${model} rate-limited)`)
      return result
    } catch (err) {
      const is429 = err.status === 429 || err.message.includes("429")
      const isLast = m === modelsToTry[modelsToTry.length - 1]
      if (is429 && !isLast) {
        console.warn(`[Groq] ${m} rate-limited (429), trying next model…`)
        continue
      }
      throw err
    }
  }
}
