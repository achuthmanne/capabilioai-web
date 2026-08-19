// ─── OpenAI client ────────────────────────────────────────────────────────────
// USE: Executive content generation (GPT-4o writes better long-form than Groq)
//      Fallback when Claude quota hits
// NOT for grading — Claude Haiku is cheaper and equally good
//
// Extension point (Phase 2.7 architecture refinement, Requirement 10):
// the base URL below is hardcoded. Azure OpenAI, DeepSeek, and Ollama are
// all OpenAI-chat-completions-API-compatible (same request/response JSON
// shape this file already speaks — different base URL/auth only), so
// adding any of them later means parameterizing a `baseUrl` here (default
// to today's URL, zero behavior change) and letting
// lib/ai/adapters/openaiAdapter.js (or a thin sibling adapter reusing this
// same client) pass a different URL/key per provider. Not built now — no
// real credentials/endpoints exist yet to build or verify against.

const key = () => process.env.OPENAI_API_KEY

async function callOpenAI(messages, { model, maxTokens, json }) {
  const k = key()
  if (!k) throw new Error("OPENAI_API_KEY not set")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0,200)}`)
  const data = await res.json()
  return { text: data.choices?.[0]?.message?.content || "", usage: data.usage || null }
}

export async function openai(messages, {
  model      = "gpt-4o-mini",   // default: cheap + fast
  maxTokens  = 1024,
  json       = false,
} = {}) {
  const { text } = await callOpenAI(messages, { model, maxTokens, json })
  return text
}

// Same call as openai() but also returns token usage — added for
// lib/ai/adapters/openaiAdapter.js (Phase 2.7). openai() itself is
// unchanged; this is a purely additive sibling sharing the same call path.
export async function openaiWithUsage(messages, {
  model      = "gpt-4o-mini",
  maxTokens  = 1024,
  json       = false,
} = {}) {
  const { text, usage } = await callOpenAI(messages, { model, maxTokens, json })
  return { text, usage, model }
}

export const GPT4O      = "gpt-4o"
export const GPT4O_MINI = "gpt-4o-mini"
