/**
 * modelRegistry.js — Phase 2.7 architecture refinement, Requirement 4:
 * "Provider selection and model selection must be independent."
 *
 * Fixes a real bug this refinement surfaced: prompts/arena.js's
 * "arena.sqlFeedback" entry used to hardcode `model: GROQ_FAST` — a
 * Groq-specific model ID string — directly into a provider-agnostic
 * prompt entry. If AI_PROVIDER were ever switched off "groq", that exact
 * string would be sent to whichever adapter is active (e.g. OpenAI),
 * which has no model by that name. Prompts now declare an ABSTRACT
 * modelTier ("fast" | "quality"); resolveModel() looks up the concrete
 * model ID for whichever provider is actually active at call time.
 *
 * Tier vocabulary is deliberately just two, not three: Groq is the only
 * provider with a genuine 2-way split today (GROQ_BIG vs GROQ_FAST/
 * GROQ_MID, which lib/groq.js's own header comment says already collapse
 * to the same model because Groq's catalog has no 3rd tier yet). The
 * other 4 providers each have exactly one real model today, so their
 * `fast` and `quality` entries point at the same model — precedented by
 * GROQ_MID===GROQ_FAST already doing exactly this, not a new hack.
 *
 * An explicit `opts.model` override (see aiService.js) always wins over
 * this resolution — same escape-hatch precedence pattern already used
 * for provider/fallbackProvider.
 */
import { GROQ_BIG, GROQ_FAST } from "../groq.js"
import { GPT4O, GPT4O_MINI } from "../openai.js"

const MODEL_REGISTRY = {
  groq:      { fast: GROQ_FAST, quality: GROQ_BIG },
  gemini:    { fast: "gemini-2.5-flash", quality: "gemini-2.5-flash" },
  openai:    { fast: GPT4O_MINI, quality: GPT4O },
  anthropic: { fast: "claude-sonnet-4-5", quality: "claude-sonnet-4-5" },
  // No safe default — Bedrock model access is opt-in per AWS account/
  // region (see bedrockAdapter.js). Resolves to null until BEDROCK_MODEL_ID
  // is actually configured; callers get a clear error, not a guessed ID.
  bedrock:   { fast: process.env.BEDROCK_MODEL_ID || null, quality: process.env.BEDROCK_MODEL_ID || null },
}

/**
 * @param {string} provider — must be a key in MODEL_REGISTRY
 * @param {"fast"|"quality"} tier — defaults to "fast"
 * @returns {string|null} the concrete model ID for that provider/tier,
 *   or null if genuinely unconfigured (Bedrock today)
 */
export function resolveModel(provider, tier = "fast") {
  const entry = MODEL_REGISTRY[provider]
  if (!entry) throw new Error(`No model registry entry for provider "${provider}"`)
  return entry[tier] ?? entry.fast ?? null
}

export { MODEL_REGISTRY }
