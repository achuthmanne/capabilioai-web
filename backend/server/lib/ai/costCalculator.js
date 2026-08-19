/**
 * costCalculator.js — Phase 2.7 architecture refinement, Requirement 2.
 *
 * Extracted verbatim out of usageLogger.js — pure cost estimation, no
 * logic change from what usageLogger.js did inline before this pass.
 *
 * Approximate, not exact billing — Groq/Gemini are on free tiers today
 * (per gemini.js's own comments), so $0 is accurate for the providers
 * actually serving traffic. OpenAI/Anthropic estimates are the two
 * providers' published per-1K-token list prices at time of writing;
 * Bedrock cost varies by hosted model and account-level pricing, so it's
 * left null (an honest "unknown" rather than a guessed number) until a
 * real Bedrock deployment reports it.
 */
const COST_PER_1K_TOKENS = {
  groq:      { input: 0, output: 0 },
  gemini:    { input: 0, output: 0 },
  openai:    { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.003, output: 0.015 },
  bedrock:   null,
}

export function estimateCost(provider, inputTokens, outputTokens) {
  const rates = COST_PER_1K_TOKENS[provider]
  if (!rates || inputTokens == null || outputTokens == null) return null
  return Math.round(((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output) * 1_000_000) / 1_000_000
}

export { COST_PER_1K_TOKENS }
