/**
 * groqAdapter.js — Phase 2.7 (Enterprise AI Engine).
 *
 * Wraps lib/groq.js unchanged. This is the ACTIVE provider by default
 * (AI_PROVIDER=groq) — what's actually serving every one of the 30
 * existing AI call sites in production today.
 *
 * Capabilities: generateText, callWithTools. Does NOT support
 * extractFromImage — Groq has no multimodal file-input API in this
 * codebase's usage; callers needing that stay on the Gemini adapter's
 * capability, same as today.
 */
import { groqWithUsage, groqTools, GROQ_BIG } from "../../groq.js"

export const groqAdapter = {
  name: "groq",

  async generateText(messages, { model, maxTokens = 2048, temperature = 0.7, json = false, reasoningEffort } = {}) {
    const { text, usage, model: servedModel } = await groqWithUsage(messages, {
      model: model || GROQ_BIG, max_tokens: maxTokens, temperature, json, reasoning_effort: reasoningEffort,
    })
    return {
      text,
      model: servedModel,
      inputTokens: usage?.prompt_tokens ?? null,
      outputTokens: usage?.completion_tokens ?? null,
    }
  },

  async callWithTools(messages, { model, maxTokens = 1024, temperature = 0.7, tools, reasoningEffort } = {}) {
    const { message, finishReason } = await groqTools(messages, {
      model: model || GROQ_BIG, max_tokens: maxTokens, temperature, tools, reasoning_effort: reasoningEffort,
    })
    // groqTools() doesn't expose usage today (see groq.js) — left null rather
    // than estimated. Real number added if/when a tool-calling call site is
    // actually migrated and needs it.
    return { message, finishReason, model: model || GROQ_BIG, inputTokens: null, outputTokens: null }
  },

  async extractFromImage() {
    throw new Error("groq provider does not support extractFromImage — use the gemini provider for multimodal extraction.")
  },
}
