/**
 * Mentor Marketplace — Razorpay webhook endpoint. Career OS Workstream 4.
 *
 * MUST be mounted in server.js with express.raw({ type: 'application/json' })
 * scoped to exactly this route, BEFORE the global express.json() parser
 * would otherwise consume the body — HMAC verification in webhook.js needs
 * the exact raw bytes Razorpay signed, not a re-serialized JSON object.
 * See server.js for the exact mount order/comment.
 *
 * This endpoint is intentionally NOT gated behind requireAuth (Razorpay is
 * the caller, not a logged-in user) — it is gated by (a) the
 * MENTOR_MARKETPLACE_V1_ENABLED flag and (b) signature verification inside
 * processWebhookEvent, which rejects with 400 before trusting any event data.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { processWebhookEvent } from "../lib/mentorMarketplace/webhook.js"
import { MENTOR_MARKETPLACE_V1_ENABLED } from "./mentorMarketplace.js"

const router = Router()

router.post("/pro/v1/mentor/webhook/razorpay", async (req, res) => {
  if (!MENTOR_MARKETPLACE_V1_ENABLED) return res.status(404).end()

  try {
    // req.body is a Buffer here (express.raw), not parsed JSON — this is
    // required for signature verification over the exact bytes.
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body || "")
    const signatureHeader = req.headers["x-razorpay-signature"]
    const eventId = req.headers["x-razorpay-event-id"]

    let payload = {}
    try { payload = JSON.parse(rawBody) } catch { /* leave {} — signature check below still runs on raw bytes */ }

    const result = await processWebhookEvent(supabaseAdmin, {
      eventId,
      eventType: payload?.event,
      payload,
      rawBody,
      signatureHeader,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    })

    return res.status(result.httpStatus).json({ accepted: result.accepted, duplicate: !!result.duplicate })
  } catch (e) {
    console.error("[mentorMarketplace:webhook]", e.message)
    // Still 200 unexpected internal errors would cause Razorpay to keep
    // retrying indefinitely on a bug rather than a real delivery problem;
    // however we deliberately return 500 here so retries DO happen for a
    // genuine processing failure (as opposed to a duplicate, which is 200).
    return res.status(500).json({ accepted: false, error: "internal_error" })
  }
})

export default router
