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
import "./prompts/index.js" // registers every feature prompt file's entries before any getPrompt() lookup below
import { getPrompt } from "./prompts/registry.js"
import { providerManager, getActiveProviderName } from "./providerManager.js"
import { executeWithRetry } from "./retryManager.js"
import { validateJSON, validateShape } from "./responseValidator.js"
import { resolveModel } from "./modelRegistry.js"

/**
 * @param {string} promptId — a registered prompts/registry.js entry id
 * @param {object} variables — values for the prompt's declared `variables`
 * @param {{provider?: string, fallbackProvider?: string, timeoutMs?: number, maxRetries?: number}} opts
 * @returns {Promise<{data: any, provider: string, model: string|null}>} —
 *   `data` is the validated/parsed object (if the prompt has a
 *   responseSchema) or the raw text (if not). `provider`/`model` expose
 *   which one actually served the request — real information some
 *   callers need (e.g. Skill Studio persists generated_by per lesson) and
 *   that pre-migration code always had access to via its own try/catch
 *   branching; collapsing it to a constant would be a real information
 *   loss, not a harmless simplification.
 */
async function executePrompt(promptId, variables, opts = {}) {
  const entry = getPrompt(promptId)
  const requestId = crypto.randomUUID()
  const capability = entry.defaultOpts.capability || "generateText"
  const callOpts = { ...entry.defaultOpts, requestId, feature: promptId }
  // Precedence: an explicit per-call override (opts.provider) beats a
  // prompt's own declared preference (entry.defaultOpts.provider), which
  // beats the global AI_PROVIDER default (providerManager's own fallback
  // when `provider` is left undefined here). A prompt CAN declare its own
  // provider/fallbackProvider — e.g. Skill Studio's lesson generation has
  // always preferred Gemini first, Groq second, independent of whatever
  // the platform-wide default is — without every caller needing to repeat
  // that preference on every executePrompt() call.
  const resolvedProvider = opts.provider || entry.defaultOpts.provider
  const resolvedFallback = opts.fallbackProvider || entry.defaultOpts.fallbackProvider
  // Model selection is independent of provider selection (Phase 2.7
  // architecture refinement, Requirement 4): a prompt declares an
  // abstract modelTier ("fast"|"quality"), resolved here against
  // whichever provider ends up serving the request — never a raw,
  // provider-specific model string baked into the prompt entry. An
  // explicit opts.model/entry.defaultOpts.model always wins if present
  // (escape hatch for a caller that genuinely needs one exact model).
  function resolveModelFor(providerName) {
    return opts.model || callOpts.model || resolveModel(providerName || getActiveProviderName(), callOpts.modelTier)
  }

  let outcome // { result, retryCount, providerUsed, fallbackUsed } — see retryManager.js
  if (capability === "extractFromImage") {
    const { base64Image, mimeType, prompt } = entry.buildExtraction(variables)
    outcome = await executeWithRetry(
      (providerOverride) => {
        const p = providerOverride || resolvedProvider
        return providerManager.extractFromImage(base64Image, mimeType, prompt, { ...callOpts, provider: p, model: resolveModelFor(p) })
      },
      { fallbackProvider: resolvedFallback, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
    )
  } else {
    const messages = entry.buildMessages(variables)
    outcome = await executeWithRetry(
      (providerOverride) => {
        const p = providerOverride || resolvedProvider
        return providerManager[capability](messages, { ...callOpts, provider: p, model: resolveModelFor(p) })
      },
      { fallbackProvider: resolvedFallback, timeoutMs: opts.timeoutMs, maxRetries: opts.maxRetries }
    )
  }

  const result = outcome.result
  const provider = outcome.providerUsed || resolvedProvider || null
  const model = result.model ?? null

  if (!entry.responseSchema) return { data: result.text ?? result.parsed ?? result, provider, model }

  const data = result.parsed !== undefined
    ? validateShape(result.parsed, entry.responseSchema)
    : validateJSON(result.text, entry.responseSchema)
  return { data, provider, model }
}

export const AIService = {
  executePrompt,

  // Batch 1 (Phase 2.7) — retires lib/domainRole/aiProvider.js's local
  // seam onto the platform-wide service. Returns { data: string|null, ... }
  // on any failure inside executePrompt this still throws — the route's
  // own try/catch (generateAiFeedback in routes/arenaDomainRole.js) is
  // what preserves the existing "never blocks a submission, null on
  // failure" contract, unchanged.
  async generateArenaFeedback(vars) {
    return executePrompt("arena.sqlFeedback", vars)
  },
}
