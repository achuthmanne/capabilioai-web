/**
 * usageLogger.js — Phase 2.7 (Enterprise AI Engine), Tasks 9 + 10.
 *
 * One INSERT per LOGICAL AI request into the ai_usage_log table — serves
 * both Token Usage Tracking (Task 9) and AI Audit Logging (Task 10) from
 * a single write, per the approved design (no existing table fit either
 * need; verification_audit_log is a hash-chained tamper-evidence log
 * scoped to document-proof verification specifically, a different
 * property this general need doesn't require). Called once from
 * aiService.js after retryManager.js resolves — NOT once per raw
 * transport attempt (that was the pre-refinement-pass behavior, when
 * providerManager.js logged inline; a retried request used to produce
 * multiple rows for one logical call). retryCount on the row reflects
 * how many extra attempts it actually took.
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
 *
 * Cost estimation moved to costCalculator.js in the Phase 2.7 architecture
 * refinement pass — this file only logs, it doesn't calculate.
 */
import { supabaseAdmin } from "../supabase.js"
import { logger } from "../logger.js"
import { estimateCost } from "./costCalculator.js"

export async function logUsage({ requestId, feature, provider, model, inputTokens, outputTokens, latencyMs, retryCount, status, errorMessage }) {
  try {
    const { error } = await supabaseAdmin.from("ai_usage_log").insert({
      request_id: requestId,
      feature: feature || "unknown",
      provider,
      model: model || "unknown",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      latency_ms: latencyMs,
      retry_count: retryCount ?? 0,
      cost_estimate: estimateCost(provider, inputTokens, outputTokens),
      status,
      error_message: errorMessage ? String(errorMessage).slice(0, 500) : null,
    })
    if (error) logger.error("[usageLogger] insert failed (AI call still completed)", { err: error })
  } catch (err) {
    logger.error("[usageLogger] unexpected failure (AI call still completed)", { err })
  }
}
