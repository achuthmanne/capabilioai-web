/**
 * openaiAdapter.js — Phase 2.7 (Enterprise AI Engine).
 *
 * Wraps lib/openai.js. Real, working client (real fetch call, real
 * OPENAI_API_KEY present) — but zero production traffic today (confirmed:
 * no file in backend/server imports lib/openai.js). This migration makes
 * it selectable via AI_PROVIDER=openai without changing that it's
 * currently unused; it is not the active default.
 *
 * Capabilities: generateText only. No multimodal/tool-calling usage
 * exists in this codebase for OpenAI — not implemented here since there
 * is no real call site to verify it against (per "no speculative
 * implementations").
 */
import { openaiWithUsage, GPT4O_MINI } from "../../openai.js"

export const openaiAdapter = {
  name: "openai",

  async generateText(messages, { model, maxTokens = 1024, json = false } = {}) {
    const { text, usage, model: servedModel } = await openaiWithUsage(messages, {
      model: model || GPT4O_MINI, maxTokens, json,
    })
    return {
      text,
      model: servedModel,
      inputTokens: usage?.prompt_tokens ?? null,
      outputTokens: usage?.completion_tokens ?? null,
    }
  },

  async extractFromImage() {
    throw new Error("openai provider does not support extractFromImage in this codebase's usage — use the gemini provider for multimodal extraction.")
  },

  async callWithTools() {
    throw new Error("openai provider does not support callWithTools — no real call site in this codebase to build/verify it against yet.")
  },
}
