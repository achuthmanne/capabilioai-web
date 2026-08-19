/**
 * aiService.js — Phase 2.7 (Enterprise AI Engine), Task 4.
 *
 * The ONLY thing business code (routes, lib files) should import for AI
 * calls. `executePrompt` is the one shared engine — look up the prompt,
 * build the request, retry, log, validate — so every named business
 * method added per migration batch is a thin one-or-two-line wrapper
 * around it, not a place duplicate retry/validation/logging logic
 * accumulates.
 *
 * Named, business-facing methods (generateArenaFeedback, extractResume,
 * generateInterviewQuestion, ...) are added incrementally as each
 * migration batch actually moves a call site onto this service — Batch 0
 * (infrastructure) ships zero named methods, per "no speculative
 * implementations."
 */
import crypto from "crypto"
import { getPrompt } from "./prompts/registry.js"
import { providerManager } from "./providerManager.js"
import { executeWithRetry } from "./retryManager.js"
import { validateJSON, validateShape } from "./responseValidator.js"

/**
 * @param {string} promptId — a registered prompts/registry.js entry id
 * @param {object} variables — values for the prompt's declared `variables`
 * @param {{provider?: string, fallbackProvider?: string, timeoutMs?: number, maxRetries?: number}} opts
 */
async function executePrompt(promptId, variables, opts = {}) {
  const entry = getPrompt(promptId)
  const requestId = crypto.randomUUID()
  const capability = entry.defaultOpts.capability || "generateText"
  const callOpts = { ...entry.defaultOpts, requestId, feature: promptId }

  let result
  if (capability === "extractFromImage") {
    const { base64Image, mimeType, prompt } = entry.buildExtraction(variables)
    result = await executeWithRetry(
      (providerOverride) => providerManager.extractFromImage(base64Image, mimeType, prompt, { ...callOpts, provider: providerOverride || opts.provider }),
      { fallbackProvider: opts.fallbackProvider, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
    )
  } else {
    const messages = entry.buildMessages(variables)
    result = await executeWithRetry(
      (providerOverride) => providerManager[capability](messages, { ...callOpts, provider: providerOverride || opts.provider }),
      { fallbackProvider: opts.fallbackProvider, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
    )
  }

  if (!entry.responseSchema) return result.text ?? result.parsed ?? result

  return result.parsed !== undefined
    ? validateShape(result.parsed, entry.responseSchema)
    : validateJSON(result.text, entry.responseSchema)
}

export const AIService = {
  executePrompt,
}
