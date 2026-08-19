/**
 * providerManager.js — Phase 2.7 (Enterprise AI Engine). Narrowed to pure
 * transport dispatch in the architecture refinement pass (Requirement 2:
 * ProviderManager is one of 7 separated components, not a place that also
 * retries or logs).
 *
 * Single dispatch point for "which provider handles this AI call."
 * Provider selection is entirely config-driven: the AI_PROVIDER env var
 * (default "groq" — what's actually live in production today). Changing
 * one env value switches every migrated call site at once; no code edit
 * required.
 *
 * Exposes four capability methods matching the real shapes found across
 * all 30 existing AI call sites in this codebase: generateText (the
 * overwhelming majority — a messages array in, a string out),
 * generateJSON (generateText + json:true, still returns the raw string —
 * parsing/schema validation happens in aiService.js via
 * responseValidator.js, exactly once, not duplicated per adapter),
 * extractFromImage (multimodal — only geminiAdapter implements this
 * today), callWithTools (function-calling — only groqAdapter implements
 * this today). An adapter that doesn't support a capability throws a
 * clear "not supported" error rather than silently no-op'ing.
 *
 * Does NOT retry (retryManager.js's job, wrapping calls to this file) and
 * does NOT log (usageLogger.js's job, called once per logical request
 * from aiService.js — not once per raw transport attempt here, which is
 * what this file used to do before this pass. A retried request used to
 * produce multiple ai_usage_log rows for one logical call; now it
 * produces exactly one, with a real retryCount).
 */
import { groqAdapter } from "./adapters/groqAdapter.js"
import { geminiAdapter } from "./adapters/geminiAdapter.js"
import { openaiAdapter } from "./adapters/openaiAdapter.js"
import { anthropicAdapter } from "./adapters/anthropicAdapter.js"
import { bedrockAdapter } from "./adapters/bedrockAdapter.js"

const ADAPTERS = {
  groq: groqAdapter,
  gemini: geminiAdapter,
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  bedrock: bedrockAdapter,
}

export function getActiveProviderName() {
  return process.env.AI_PROVIDER || "groq"
}

export function getAdapter(providerName) {
  const adapter = ADAPTERS[providerName]
  if (!adapter) throw new Error(`Unknown AI provider "${providerName}" — valid providers: ${Object.keys(ADAPTERS).join(", ")}`)
  return adapter
}

async function callCapability(capability, args, { provider } = {}) {
  const providerName = provider || getActiveProviderName()
  const adapter = getAdapter(providerName)
  const result = await adapter[capability](...args)
  return { ...result, provider: providerName }
}

export const providerManager = {
  async generateText(messages, opts = {}) {
    return callCapability("generateText", [messages, opts], opts)
  },
  async generateJSON(messages, opts = {}) {
    return callCapability("generateText", [messages, { ...opts, json: true }], opts)
  },
  async extractFromImage(base64Image, mimeType, prompt, opts = {}) {
    return callCapability("extractFromImage", [base64Image, mimeType, prompt], opts)
  },
  async callWithTools(messages, opts = {}) {
    return callCapability("callWithTools", [messages, opts], opts)
  },
}
