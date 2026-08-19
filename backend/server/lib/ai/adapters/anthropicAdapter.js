/**
 * anthropicAdapter.js — Phase 2.7 (Enterprise AI Engine).
 *
 * A genuinely NEW, real adapter — @anthropic-ai/sdk is already an
 * installed dependency and ANTHROPIC_API_KEY is already set in this
 * environment, but nothing in the codebase calls real Anthropic today
 * (lib/claude.js is a Groq-backed shim, see its own header comment for
 * why). This is the first real Anthropic client in the repo.
 *
 * Not the active provider (AI_PROVIDER stays "groq" — see
 * providerManager.js) and no existing "claude"-named call site is
 * switched onto it during this migration: assessment.js/chat.js/
 * payments.js keep their current Groq-backed output, since routing them
 * to genuinely different real Anthropic output would be a product/
 * quality change beyond plumbing, not requested this phase.
 *
 * Capabilities: generateText only. No multimodal/tool-calling usage
 * exists in this codebase for Anthropic — not implemented here since
 * there is no real call site to build/verify it against.
 */
import Anthropic from "@anthropic-ai/sdk"

const key = () => {
  const k = process.env.ANTHROPIC_API_KEY
  if (!k) throw new Error("ANTHROPIC_API_KEY not set")
  return k
}

let client = null
function getClient() {
  if (!client) client = new Anthropic({ apiKey: key() })
  return client
}

const CLAUDE_MODEL = "claude-sonnet-4-5"

export const anthropicAdapter = {
  name: "anthropic",

  async generateText(messages, { model, maxTokens = 1024, json = false } = {}) {
    // Anthropic's Messages API takes `system` as a separate top-level
    // field, not a leading message with role:"system" (same shape
    // difference lib/claude.js's header already documented for Groq).
    const systemMsgs = messages.filter(m => m.role === "system")
    const otherMsgs = messages.filter(m => m.role !== "system")
    const system = systemMsgs.map(m => m.content).join("\n\n") || undefined

    // Anthropic has no native json_object response_format — the standard
    // workaround is a system-prompt instruction, applied only when the
    // caller asked for JSON.
    const effectiveSystem = json
      ? [system, "Respond with ONLY a valid JSON object — no markdown fences, no text outside the JSON."].filter(Boolean).join("\n\n")
      : system

    const res = await getClient().messages.create({
      model: model || CLAUDE_MODEL,
      max_tokens: maxTokens,
      system: effectiveSystem,
      messages: otherMsgs.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    })

    const text = res.content?.filter(b => b.type === "text").map(b => b.text).join("") || ""
    return {
      text,
      model: res.model || model || CLAUDE_MODEL,
      inputTokens: res.usage?.input_tokens ?? null,
      outputTokens: res.usage?.output_tokens ?? null,
    }
  },

  async extractFromImage() {
    throw new Error("anthropic provider does not support extractFromImage in this codebase's usage — use the gemini provider for multimodal extraction.")
  },

  async callWithTools() {
    throw new Error("anthropic provider does not support callWithTools — no real call site in this codebase to build/verify it against yet.")
  },
}
