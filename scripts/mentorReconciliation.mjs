#!/usr/bin/env node
/**
 * mentorReconciliation.mjs — Career OS Workstream 4 CLI.
 *
 * Runs the mentor-marketplace reconciliation sweep:
 *   1. Release stale reservations (expired reservation_expires_at, still 'reserved')
 *   2. Recover missed webhooks (pending_payment past a threshold, checked
 *      against a — currently STUBBED — Razorpay order-status lookup)
 *   3. Auto-complete eligible confirmed bookings (24h after scheduled_end,
 *      no open dispute / no-show report)
 *
 * Dry-run by default (same convention as scripts/importQuestionBank.mjs) —
 * prints what WOULD change. Pass --commit to actually write changes.
 *
 * Usage:
 *   node scripts/mentorReconciliation.mjs [--commit] [--threshold-minutes=20]
 *
 * NOTE: the missed-webhook recovery sweep calls a stubbed Razorpay
 * order-status checker (reconciliation.js's stubCheckRazorpayOrderStatus)
 * that throws — there is no live Razorpay account in this environment. Any
 * booking that would need that check is reported as
 * `flaggedForAdminReview` rather than silently skipped or wrongly expired.
 * Wire a real razorpay().orders.fetch()/payments.fetch() call in before
 * relying on sweep #2 in production.
 */
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
import { runReconciliation } from "../backend/server/lib/mentorMarketplace/reconciliation.js"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })
dotenv.config({ path: resolve(__dirname, "../.env.server") })

async function main() {
  const args = process.argv.slice(2)
  const commit = args.includes("--commit")
  const thresholdArg = args.find(a => a.startsWith("--threshold-minutes="))
  const thresholdMinutes = thresholdArg ? Number(thresholdArg.split("=")[1]) : 20

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY — cannot run against a real database.")
    console.error("(This sandbox has no network egress to Supabase; run this script in a real deployment environment.)")
    process.exit(1)
  }

  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log(`\nMentor Marketplace Reconciliation — ${commit ? "COMMIT MODE (writes changes)" : "DRY RUN (no changes)"}`)
  console.log(`Missed-webhook threshold: ${thresholdMinutes} minutes\n`)

  const result = await runReconciliation(db, { commit, now: new Date() })

  console.log("── Sweep 1: Stale reservations ──")
  console.log(`  Checked: ${result.staleReservations.checked}`)
  for (const a of result.staleReservations.actions) console.log(`  ${JSON.stringify(a)}`)

  console.log("\n── Sweep 2: Missed webhook recovery ──")
  console.log(`  Checked: ${result.missedWebhooks.checked}`)
  for (const r of result.missedWebhooks.results) {
    console.log(`  ${JSON.stringify(r)}`)
    if (r.flaggedForAdminReview) console.log(`    ^ FLAGGED FOR ADMIN REVIEW — needs manual Razorpay dashboard check`)
  }

  console.log("\n── Sweep 3: Auto-completion ──")
  console.log(`  Checked: ${result.autoCompletions.checked}`)
  for (const r of result.autoCompletions.results) console.log(`  ${JSON.stringify(r)}`)

  if (!commit) {
    console.log("\nDry run only — no rows changed. Re-run with --commit to apply.")
  } else {
    console.log("\nCommit mode — changes applied and logged to mentor_audit_log.")
  }
}

main().catch(e => {
  console.error("Reconciliation failed:", e.message)
  process.exit(1)
})
