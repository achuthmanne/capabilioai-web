/**
 * Subscription/plan Razorpay webhook — Tranche C (2026-07-25).
 *
 * MUST be mounted with express.raw({ type: 'application/json' }) scoped to
 * exactly this path, before the global express.json() parser — same
 * requirement and same reasoning as mentorMarketplaceWebhook.js (HMAC
 * verification needs the exact raw bytes Razorpay signed).
 *
 * Not gated behind requireAuth — Razorpay is the caller. Gated by signature
 * verification inside processSubscriptionWebhookEvent, which rejects with
 * 400 before trusting any event data. Not behind a feature flag: unlike
 * mentor marketplace (a whole new surface), this is a safety-net for an
 * ALREADY-LIVE payment flow (/api/create-order, /api/verify-payment) — it
 * has nothing to gate off; the client-driven verify-payment path is
 * untouched and keeps working exactly as before regardless of whether this
 * webhook is configured in the Razorpay dashboard yet.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { razorpay, PLAN_PRICES } from "../lib/razorpay.js"
import { processSubscriptionWebhookEvent } from "../lib/payments/subscriptionWebhook.js"

const router = Router()

router.post("/webhooks/razorpay/subscription", async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "")
    const signatureHeader = req.headers["x-razorpay-signature"]
    const eventId = req.headers["x-razorpay-event-id"]

    let payload = {}
    try { payload = JSON.parse(rawBody) } catch { /* signature check below still runs on raw bytes */ }

    const result = await processSubscriptionWebhookEvent(supabaseAdmin, {
      eventId,
      eventType: payload?.event,
      payload,
      rawBody,
      signatureHeader,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      fetchOrder: (orderId) => razorpay().orders.fetch(orderId),
      fetchPayment: (paymentId) => razorpay().payments.fetch(paymentId),
      getPlan: (planId) => PLAN_PRICES[planId],
    })

    return res.status(result.httpStatus).json({ accepted: result.accepted, duplicate: !!result.duplicate })
  } catch (e) {
    console.error("[subscriptionWebhook]", e.message)
    // 500 (not 200) on genuine internal errors so Razorpay retries a real
    // processing failure, distinct from a 200 duplicate no-op — same
    // reasoning as mentorMarketplaceWebhook.js.
    return res.status(500).json({ accepted: false, error: "internal_error" })
  }
})

export default router
