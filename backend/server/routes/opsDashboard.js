/**
 * Ops Dashboard — CAREER OS TRANCHE 11 (Monitoring / alerts readiness).
 * INTERNAL ONLY, same admin model as questionBankAdmin.js — requireAuth +
 * requireAdmin (profiles.is_admin), no separate feature flag (mirrors the
 * existing internal-tooling pattern, not a user-facing surface).
 *
 * Mounted at the dedicated "/api/admin/ops" namespace in server.js — NOT at
 * bare "/api" or the broader "/api/admin" — for the same reason
 * questionBankAdmin.js was moved off bare "/api" (see its header/server.js
 * comment): this router's `router.use(requireAuth, requireAdmin)` has no
 * path argument, so Express treats it as match-all for every request handed
 * to this router. mentorMarketplaceAdmin.js's routes live under
 * "/admin/mentor/..." while mounted at bare "/api" — mounting this router
 * at "/api/admin" instead of "/api/admin/ops" would have made Express hand
 * it every "/api/admin/mentor/*" request too, running THIS router's
 * requireAdmin ahead of mentorMarketplaceAdmin's own requireFlag check and
 * silently changing its response (403-not-admin instead of
 * 403-flag-disabled) for non-admin callers. Mounting at the more specific
 * "/api/admin/ops" avoids that entirely, regardless of mount order.
 *
 * GET /api/admin/ops/dashboard — one real, read-only snapshot combining:
 *   - apiMetrics          in-process error-rate/latency by endpoint group (opsMetrics.js)
 *   - skillPulse          weekly_pulses completion rate (last 7 / 30 days)
 *   - mentorFunnel        mentor_bookings grouped by status
 *   - payoutHealth        mentor_payouts grouped by status
 *   - moderationQueue     question_bank rows still in_review (the real
 *                         moderation queue in this codebase)
 *   - webhookHealth       mentor_payment_webhook_events signature/processing
 *                         outcomes in the last 24h, with a computed failure rate
 *   - consentToggles      CURRENT snapshot of profiles.{searchable,
 *                         analytics_enabled,cert_visible,vault_visible} —
 *                         see honest limitation note below
 *   - alerts              anything checkAndLogAlerts() fired this call
 *
 * HONEST LIMITATION: consentToggles is a point-in-time COUNT, not a
 * grant/revoke VOLUME over time — there is no audit-log table tracking
 * changes to these 4 boolean columns (unlike question_bank_audit_log, which
 * DOES track every review-state change). Building that history table is a
 * real, separate, additive schema change — not done here because it wasn't
 * judged safe/necessary to rush into this tranche without also updating
 * SettingsPanel.jsx's save path to write to it; flagged explicitly in the
 * Tranche 11 report rather than faked with a computed "estimate".
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/requireAdmin.js"
import { getMetricsSnapshot, checkAndLogAlerts } from "../lib/opsMetrics.js"

const router = Router()
router.use(requireAuth, requireAdmin)

function daysAgoISO(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

async function countBy(table, column, since = null) {
  let query = supabaseAdmin.from(table).select(column)
  if (since) query = query.gte("created_at", since)
  const { data, error } = await query
  if (error) return { error: error.message, counts: {} }
  const counts = {}
  for (const row of data || []) {
    const key = row[column] ?? "null"
    counts[key] = (counts[key] || 0) + 1
  }
  return { counts, total: (data || []).length }
}

router.get("/dashboard", async (req, res) => {
  try {
    const apiMetrics = getMetricsSnapshot({})
    const alerts = checkAndLogAlerts(apiMetrics)

    const [pulse7d, pulse30d, mentorFunnel, payoutHealth, moderationQueue, webhook24h, subWebhook24h, consentProfiles] = await Promise.all([
      countBy("weekly_pulses", "status", daysAgoISO(7)),
      countBy("weekly_pulses", "status", daysAgoISO(30)),
      countBy("mentor_bookings", "status"),
      countBy("mentor_payouts", "status"),
      supabaseAdmin.from("question_bank").select("id", { count: "exact", head: true }).eq("review_status", "in_review"),
      supabaseAdmin.from("mentor_payment_webhook_events").select("signature_valid, processing_result").gte("created_at", daysAgoISO(1)),
      // Tranche 4 (2026-07-25): also watch the general subscription webhook
      // (payment_webhook_events, added Tranche C) — a failure here means a
      // paying user may be charged with no entitlement granted.
      supabaseAdmin.from("payment_webhook_events").select("signature_valid, processing_result").gte("created_at", daysAgoISO(1)),
      supabaseAdmin.from("profiles").select("searchable, analytics_enabled, cert_visible, vault_visible"),
    ])

    const pulseCompletionRate = (snap) => {
      const completed = snap.counts.completed || 0
      const total = snap.total || 0
      return { completed, total, rate: total ? Number((completed / total).toFixed(4)) : null }
    }

    const webhookRows = webhook24h.data || []
    const invalidSignatureCount = webhookRows.filter(r => r.signature_valid === false).length
    const nonTerminalStuckCount = webhookRows.filter(r => r.processing_result === "received").length
    const webhookFailureRate = webhookRows.length
      ? Number(((invalidSignatureCount + nonTerminalStuckCount) / webhookRows.length).toFixed(4))
      : null
    if (webhookFailureRate !== null && webhookFailureRate >= 0.1 && webhookRows.length >= 5) {
      console.error(`[ALERT:webhook_failure_rate] failureRate=${webhookFailureRate} sampleSize=${webhookRows.length} windowHours=24`)
      alerts.push({ type: "webhook_failure_rate", failureRate: webhookFailureRate, sampleSize: webhookRows.length })
    }

    const consentRows = consentProfiles.data || []
    const consentSnapshot = {
      totalProfiles: consentRows.length,
      searchableFalse: consentRows.filter(r => r.searchable === false).length,
      analyticsEnabledFalse: consentRows.filter(r => r.analytics_enabled === false).length,
      certVisibleFalse: consentRows.filter(r => r.cert_visible === false).length,
      vaultVisibleFalse: consentRows.filter(r => r.vault_visible === false).length,
      note: "point-in-time counts, not grant/revoke volume — no audit-log table exists yet for these columns (see route header)",
    }

    res.json({
      generatedAt: new Date().toISOString(),
      apiMetrics,
      skillPulse: {
        last7Days: pulseCompletionRate(pulse7d),
        last30Days: pulseCompletionRate(pulse30d),
      },
      mentorFunnel: mentorFunnel.counts,
      payoutHealth: payoutHealth.counts,
      moderationQueue: { inReviewCount: moderationQueue.count || 0 },
      webhookHealth: {
        windowHours: 24,
        totalEvents: webhookRows.length,
        invalidSignatureCount,
        nonTerminalStuckCount,
        failureRate: webhookFailureRate,
      },
      subscriptionWebhookHealth: (() => {
        const rows = subWebhook24h.data || []
        const invalid = rows.filter(r => r.signature_valid === false).length
        const stuck = rows.filter(r => r.processing_result === "received").length
        const grantFailed = rows.filter(r => (r.processing_result || "").startsWith("grant_failed")).length
        return {
          windowHours: 24,
          totalEvents: rows.length,
          invalidSignatureCount: invalid,
          nonTerminalStuckCount: stuck,
          grantFailedCount: grantFailed,
          note: rows.length === 0 ? "no events in 24h — expected until the webhook URL is registered in the Razorpay dashboard" : undefined,
        }
      })(),
      consentToggles: consentSnapshot,
      alerts,
      rlsSignal: {
        note: "RLS-policy-violation attempts are not tracked in-app because almost every backend route uses the service-role client (supabaseAdmin), which bypasses RLS entirely — an in-app counter here would be misleadingly near-zero. The real signal already exists in Supabase's own Postgres logs (permission-denied / insufficient_privilege errors) and via the get_advisors(security) check already used throughout this engagement — use those, not a new in-app counter.",
      },
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
