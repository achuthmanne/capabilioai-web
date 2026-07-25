// SCRATCH FILE from the 2026-07-24 mentor-marketplace release-verification pass.
// Not part of the application, not imported anywhere, safe to delete manually.
// Could not be removed in-sandbox (rm returned "Operation not permitted").
// Contains no secret literals — only process.env references.
import dotenv from 'dotenv'
dotenv.config()
import { verifyWebhookSignature } from './backend/server/lib/mentorMarketplace/webhook.js'
import crypto from 'crypto'

const secret = process.env.RAZORPAY_WEBHOOK_SECRET
const rawBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_synthetic1', notes: { mentor_booking_id: 'test-booking-id' } } } } })

const correctSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

console.log('=== TEST 2: Webhook signature verification (real webhook.js function, real RAZORPAY_WEBHOOK_SECRET) ===')
console.log('  Correctly-signed payload accepted:', verifyWebhookSignature(rawBody, correctSig, secret) === true)
console.log('  Tampered body (sig now mismatched) rejected:', verifyWebhookSignature(rawBody + 'x', correctSig, secret) === false)
console.log('  Tampered signature rejected:', verifyWebhookSignature(rawBody, correctSig.slice(0,-2)+'00', secret) === false)
console.log('  Wrong secret rejected:', verifyWebhookSignature(rawBody, correctSig, 'totally_wrong_secret') === false)
console.log('  Missing signature header rejected:', verifyWebhookSignature(rawBody, undefined, secret) === false)
console.log('  Missing secret rejected:', verifyWebhookSignature(rawBody, correctSig, undefined) === false)
