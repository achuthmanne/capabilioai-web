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

// Returns the full { message, finishReason } shape — `groq()` below extracts
// just the text content out of this (preserving its old return contract for
// every existing caller); `groqTools()` returns the whole thing, since a
// tool-calling loop needs `finishReason` (to know whether the model wants to
// call a tool vs is done) and `message.tool_calls` (which `groq()` callers
// never needed).
async function callGroq(model, messages, { max_tokens, temperature, json, tools }) {
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
      ...(tools ? { tools, tool_choice: "auto" } : {}),
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    // BUG FIX: this was slicing to 200 chars, which cut error bodies off
    // mid-field — specifically hid the `failed_generation` field Groq sends
    // back on json_validate_failed errors, which is the one piece of data
    // that would show WHY the model's JSON was invalid. Widened to 2000 so
    // callers/logs can actually see it next time this happens.
    const error = new Error(`Groq ${res.status}: ${err.slice(0, 2000)}`)
    error.status = res.status
    throw error
  }
  const data = await res.json()
  const choice = data.choices?.[0] || {}
  return { message: choice.message || {}, finishReason: choice.finish_reason || null }
}

// Shared 429-fallback retry loop, used by both groq() and groqTools() so the
// degrade-on-rate-limit behavior stays identical for both call shapes.
async function withModelFallback(model, attempt) {
  const modelsToTry = [model, ...(FALLBACK_CHAIN[model] || [])]

  for (const m of modelsToTry) {
    try {
      const result = await attempt(m)
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

export async function groq(messages, {
  model       = GROQ_BIG,
  max_tokens  = 2048,
  temperature = 0.7,
  json        = false,
} = {}) {
  const { message } = await withModelFallback(model, (m) => callGroq(m, messages, { max_tokens, temperature, json }))
  return message.content || ""
}

// ── Tool-calling variant ────────────────────────────────────────────────────
// For callers that need Groq's OpenAI-style function calling (e.g. an
// assistant that calls backend tools mid-conversation), rather than a single
// text/JSON completion. Returns { message, finishReason } instead of a plain
// string — the caller drives its own multi-turn loop:
//   - finishReason === "tool_calls" means message.tool_calls is a real array
//     of { id, type: "function", function: { name, arguments } } — arguments
//     is a JSON *string* (OpenAI/Groq convention, unlike Anthropic's already-
//     parsed `input` object), so the caller must JSON.parse it itself.
//   - any other finishReason means message.content is the final answer.
// Continuing the conversation after a tool call: push the assistant message
// as-is (`{ role: "assistant", content: message.content, tool_calls:
// message.tool_calls }`), then one `{ role: "tool", tool_call_id, content }`
// message per tool result — NOT a single batched turn like Anthropic's
// tool_result blocks.
export async function groqTools(messages, {
  model       = GROQ_BIG,
  max_tokens  = 1024,
  temperature = 0.7,
  tools,
} = {}) {
  return withModelFallback(model, (m) => callGroq(m, messages, { max_tokens, temperature, tools }))
}
