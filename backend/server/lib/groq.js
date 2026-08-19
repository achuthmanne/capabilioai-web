// ─── Groq AI client ──────────────────────────────────────────────────────────
export const GROQ_URL  = "https://api.groq.com/openai/v1/chat/completions"
// 2026-08-18: Groq fully retired the llama-3.3-70b-versatile / llama-3.1-
// 70b-versatile / llama-3.1-8b-instant family (confirmed via a live
// GET /openai/v1/models call — none of the three appear in the current
// catalog, and calling them returns a 404 model_not_found). Remapped to
// the current catalog's chat-completion models. GROQ_MID and GROQ_FAST
// intentionally point at the same model: gpt-oss-20b is the only smaller
// general-purpose chat model Groq currently offers besides the Arabic-
// specialized allam-2-7b, so there's no genuinely distinct third tier to
// map onto right now — collapsing MID into FAST's model reflects what the
// catalog actually has, not a design choice to remove the tier (the two
// constants stay separate so a real MID-tier model slots in later without
// touching any caller).
export const GROQ_BIG  = "openai/gpt-oss-120b"  // complex tasks
export const GROQ_MID  = "openai/gpt-oss-20b"   // first fallback
export const GROQ_FAST = "openai/gpt-oss-20b"   // second fallback / quick tasks

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
async function callGroq(model, messages, { max_tokens, temperature, json, tools, reasoning_effort }) {
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
      // The current models (gpt-oss family) are reasoning models — they
      // spend some of max_tokens on hidden chain-of-thought before the
      // real answer unless told otherwise. "low" keeps that overhead
      // minimal (~10-20 tokens in testing) so every existing caller's
      // max_tokens budget, sized for the old non-reasoning llama models,
      // still comfortably fits the actual answer.
      reasoning_effort: reasoning_effort || "low",
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
  return { message: choice.message || {}, finishReason: choice.finish_reason || null, usage: data.usage || null, model }
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
  model            = GROQ_BIG,
  max_tokens       = 2048,
  temperature      = 0.7,
  json             = false,
  reasoning_effort,
} = {}) {
  const { message } = await withModelFallback(model, (m) => callGroq(m, messages, { max_tokens, temperature, json, reasoning_effort }))
  return message.content || ""
}

// Same call as groq() above but returns the full result — text, token usage,
// and the model that actually served the request (may differ from the
// requested one on a 429 fallback) — added for lib/ai/adapters/groqAdapter.js's
// usage-tracking needs (Phase 2.7). groq() itself is untouched, still returns
// only the string; this is a purely additive sibling sharing the same
// underlying call path, not a duplicate implementation.
export async function groqWithUsage(messages, {
  model            = GROQ_BIG,
  max_tokens       = 2048,
  temperature      = 0.7,
  json             = false,
  reasoning_effort,
} = {}) {
  const { message, usage, model: servedModel } = await withModelFallback(model, (m) => callGroq(m, messages, { max_tokens, temperature, json, reasoning_effort }))
  return { text: message.content || "", usage, model: servedModel }
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
  model            = GROQ_BIG,
  max_tokens       = 1024,
  temperature      = 0.7,
  tools,
  reasoning_effort,
} = {}) {
  return withModelFallback(model, (m) => callGroq(m, messages, { max_tokens, temperature, tools, reasoning_effort }))
}
