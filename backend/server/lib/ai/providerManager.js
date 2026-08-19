/**
 * providerManager.js — Phase 2.7 (Enterprise AI Engine).
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
 * Every call — success or failure — is logged exactly once here (see
 * usageLogger.js), regardless of whether the caller is aiService.js
 * directly or retryManager.js retrying/falling back. This is the one
 * place that needs to log, not 30 scattered call sites.
 */
import { groqAdapter } from "./adapters/groqAdapter.js"
import { geminiAdapter } from "./adapters/geminiAdapter.js"
import { openaiAdapter } from "./adapters/openaiAdapter.js"
import { anthropicAdapter } from "./adapters/anthropicAdapter.js"
import { bedrockAdapter } from "./adapters/bedrockAdapter.js"
import { logUsage } from "./usageLogger.js"

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

async function callCapability(capability, args, { provider, feature, requestId } = {}) {
  const providerName = provider || getActiveProviderName()
  const adapter = getAdapter(providerName)
  const start = Date.now()
  try {
    const result = await adapter[capability](...args)
    await logUsage({
      requestId, feature, provider: providerName, model: result.model || null,
      inputTokens: result.inputTokens ?? null, outputTokens: result.outputTokens ?? null,
      latencyMs: Date.now() - start, status: "success",
    })
    return { ...result, provider: providerName }
  } catch (err) {
    const status = err?.status === 429 || /rate.?limit/i.test(err?.message || "") ? "rate_limited" : "error"
    await logUsage({
      requestId, feature, provider: providerName, model: null,
      inputTokens: null, outputTokens: null,
      latencyMs: Date.now() - start, status, errorMessage: err.message,
    })
    throw err
  }
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
