/**
 * scripts/backfillProofObjects.js
 * ---------------------------------------------------------------------------
 * One-off migration script: converts existing arena_history + arena_submissions
 * rows into proof_objects rows, so the redesigned Portfolio's Engineering
 * Proofs tab has real data to render for existing users instead of an empty
 * state. Safe to re-run — insertMany() upserts with ignoreDuplicates against
 * the UNIQUE(source, source_ref) constraint, so already-backfilled rows are
 * skipped, not duplicated.
 *
 * Run with:  node backend/scripts/backfillProofObjects.js
 */
// This script runs standalone (not through server.js), so it needs its own
// .env load — same resolve-from-project-root pattern server.js uses.
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { buildProofObjectFromArenaHistory, buildProofObjectFromArenaSubmission } from "../server/lib/arena-v2/proofObjects/legacyBuilder.js"
import * as proofRepo from "../server/lib/arena-v2/proofObjects/repository.js"

async function run() {
  console.log("[backfill] Fetching legacy arena_history rows…")
  const { data: historyRows, error: histErr } = await supabaseAdmin.from("arena_history").select("*")
  if (histErr) throw histErr

  console.log("[backfill] Fetching legacy arena_submissions rows…")
  const { data: submissionRows, error: subErr } = await supabaseAdmin.from("arena_submissions").select("*")
  if (subErr) throw subErr

  const proofs = [
    ...(historyRows || []).map(buildProofObjectFromArenaHistory),
    ...(submissionRows || []).map(buildProofObjectFromArenaSubmission),
  ]

  console.log(`[backfill] Built ${proofs.length} proof objects (${historyRows?.length || 0} from arena_history, ${submissionRows?.length || 0} from arena_submissions). Writing…`)

  const result = await proofRepo.insertMany(proofs)
  console.log(`[backfill] Done. Inserted/updated: ${result.inserted}`)
}

run().then(() => process.exit(0)).catch(err => {
  console.error("[backfill] Failed:", err)
  process.exit(1)
})
