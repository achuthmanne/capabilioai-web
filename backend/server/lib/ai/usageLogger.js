/**
 * usageLogger.js — Phase 2.7 (Enterprise AI Engine), Tasks 9 + 10.
 *
 * One INSERT per AI call attempt into the new ai_usage_log table — serves
 * both Token Usage Tracking (Task 9) and AI Audit Logging (Task 10) from
 * a single write, per the approved design (no existing table fit either
 * need; verification_audit_log is a hash-chained tamper-evidence log
 * scoped to document-proof verification specifically, a different
 * property this general need doesn't require).
 *
 * NEVER logs prompt or response content — only provider-reported summary
 * fields (tokens/latency/cost/status), the same "no personal data" rule
 * lib/verification/auditLog.js already established for its own table.
 * The simplest way to guarantee this is to never accept prompt/response
 * text as a parameter at all, not attempt selective redaction.
 *
 * Best-effort: a logging failure must never break a real AI call — logged
 * and swallowed, matching the existing pattern in
 * routes/arenaDomainRole.js's bumpProfileElo/recordArenaHistory.
 */
import { supabaseAdmin } from "../supabase.js"
import { logger } from "../logger.js"

// Approximate, not exact billing — Groq/Gemini are on free tiers today
// (per gemini.js's own comments), so $0 is accurate for the providers
// actually serving traffic. OpenAI/Anthropic estimates are the two
// providers' published per-1K-token list prices at time of writing;
// Bedrock cost varies by hosted model and account-level pricing, so it's
// left null (an honest "unknown" rather than a guessed number) until a
// real Bedrock deployment reports it.
const COST_PER_1K_TOKENS = {
  groq:      { input: 0, output: 0 },
  gemini:    { input: 0, output: 0 },
  openai:    { input: 0.00015, output: 0.0006 },
  anthropic: { input: 0.003, output: 0.015 },
  bedrock:   null,
}

function estimateCost(provider, inputTokens, outputTokens) {
  const rates = COST_PER_1K_TOKENS[provider]
  if (!rates || inputTokens == null || outputTokens == null) return null
  return Math.round(((inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output) * 1_000_000) / 1_000_000
}

export async function logUsage({ requestId, feature, provider, model, inputTokens, outputTokens, latencyMs, status, errorMessage }) {
  try {
    const { error } = await supabaseAdmin.from("ai_usage_log").insert({
      request_id: requestId,
      feature: feature || "unknown",
      provider,
      model: model || "unknown",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      cost_estimate: estimateCost(provider, inputTokens, outputTokens),
      status,
      error_message: errorMessage ? String(errorMessage).slice(0, 500) : null,
    })
    if (error) logger.error("[usageLogger] insert failed (AI call still completed)", { err: error })
  } catch (err) {
    logger.error("[usageLogger] unexpected failure (AI call still completed)", { err })
  }
}
