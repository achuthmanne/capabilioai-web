// ─── OpenAI client ────────────────────────────────────────────────────────────
// USE: Executive content generation (GPT-4o writes better long-form than Groq)
//      Fallback when Claude quota hits
// NOT for grading — Claude Haiku is cheaper and equally good

const key = () => process.env.OPENAI_API_KEY

export async function openai(messages, {
  model      = "gpt-4o-mini",   // default: cheap + fast
  maxTokens  = 1024,
  json       = false,
} = {}) {
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
  return data.choices?.[0]?.message?.content || ""
}

export const GPT4O      = "gpt-4o"
export const GPT4O_MINI = "gpt-4o-mini"
