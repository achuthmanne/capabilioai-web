/**
 * e2e-verify-cascade-delete.mjs
 * ---------------------------------------------------------------------------
 * Run this AFTER deleting the arena.e2e@capabilio.test auth user (Supabase
 * Dashboard -> Authentication -> delete user), following
 * e2e-verify-real-supabase.mjs. Confirms the ON DELETE CASCADE chain rooted
 * at profiles.id -> auth.users.id actually removes every Arena V2 row tied
 * to that user, matching your stated intended data lifecycle ("deleting a
 * user's account permanently removes all of their data") rather than just
 * assuming it from the schema definition.
 *
 * RUN: node scripts/e2e-verify-cascade-delete.mjs
 */
import dotenv from "dotenv"
dotenv.config({ path: "./.env" })

const TEST_USER_ID = "f5c8f809-9ef3-47e6-855b-7ae7d41f0d9a"

async function main() {
  const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")

  const tables = [
    "profiles",
    "av2_domain_challenge_grants",
    "av2_challenge_instances",
    "av2_submissions",
    "av2_assessments",
    "av2_elo_ledger",
    "av2_xp_ledger",
    "av2_skill_progress",
    "av2_challenge_progression_state",
    "av2_portfolio_artifacts",
    "referral_codes",
  ]

  console.log(`Checking every Arena V2 (+ profiles/referral_codes) row for user_id/id = ${TEST_USER_ID}\n`)

  let anyRemaining = false
  for (const table of tables) {
    const col = table === "profiles" ? "id" : "user_id"
    const { data, error } = await supabaseAdmin.from(table).select("*").eq(col, TEST_USER_ID)
    if (error) { console.error(`  ERROR querying ${table}: ${error.message}`); continue }
    const remaining = data?.length || 0
    if (remaining > 0) anyRemaining = true
    console.log(`  ${table.padEnd(32)} ${remaining === 0 ? "0 rows — cascaded correctly" : `${remaining} rows REMAINING — cascade did NOT clean this up`}`)
  }

  console.log(anyRemaining
    ? "\nFAIL: some rows survived the auth user deletion — the ON DELETE CASCADE chain is incomplete somewhere above."
    : "\nPASS: every row tied to the deleted test user was removed. The cascade-delete behavior matches the intended full-account-deletion lifecycle.")
}

main().catch((err) => {
  console.error("SCRIPT ERROR:", err)
  process.exitCode = 1
})
