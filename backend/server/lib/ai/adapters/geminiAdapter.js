/**
 * geminiAdapter.js — Phase 2.7 (Enterprise AI Engine).
 *
 * Wraps lib/gemini.js unchanged. Real, fully functional — already serving
 * Resume DNA / PDF Extraction / Skill Studio traffic today.
 *
 * Capabilities: generateText, extractFromImage. Does NOT implement
 * callWithTools — nothing in gemini.js does OpenAI-style function calling.
 *
 * Token usage: gemini.js's existing functions don't currently expose
 * usageMetadata (it's discarded internally, same gap groq.js had before
 * this phase's additive groqWithUsage() export). Left null here rather
 * than estimated — a real fix follows the same pattern as groq.js's
 * groqWithUsage() when Gemini is actually wired into a batch (Batch 2/3),
 * not added speculatively now for a capability nothing yet calls through
 * this adapter.
 *
 * extractFromImage's return shape note: geminiExtractImage() already does
 * its own JSON.parse (with a {raw: text} fallback) internally — this
 * adapter returns that parsed result as-is rather than re-extracting a
 * raw string, since duplicating that parse logic here would violate the
 * "no duplicate AI logic" requirement for a capability that already
 * handles it correctly.
 */
import { gemini, geminiExtractImage } from "../../gemini.js"

export const geminiAdapter = {
  name: "gemini",

  async generateText(messages, { maxTokens = 2048, json = false } = {}) {
    // gemini() takes a single prompt string, not a messages array (a real
    // shape difference from groq/claude/openai) — flatten the standard
    // {role, content} array into one prompt, preserving role labels so
    // multi-turn context isn't silently dropped.
    const prompt = messages.map(m => (m.role === "user" ? m.content : `[${m.role}] ${m.content}`)).join("\n\n")
    const text = await gemini(prompt, { json, maxTokens })
    return { text, model: "gemini-2.5-flash", inputTokens: null, outputTokens: null }
  },

  async extractFromImage(base64Image, mimeType, prompt) {
    const parsed = await geminiExtractImage(base64Image, mimeType, prompt)
    return { parsed, model: "gemini-2.5-flash", inputTokens: null, outputTokens: null }
  },

  async callWithTools() {
    throw new Error("gemini provider does not support callWithTools in this codebase's usage — use the groq provider for tool-calling.")
  },
}
