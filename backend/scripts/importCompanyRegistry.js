/**
 * scripts/importCompanyRegistry.js
 * ---------------------------------------------------------------------------
 * CLI wrapper around lib/companyRegistrySync.js (fetch/transform/upsert logic
 * factored out there 2026-08-05 so it can be reused by a scheduled job, not
 * just this manual script).
 *
 * Two modes:
 *   node backend/scripts/importCompanyRegistry.js                → full sync
 *     (fetches and upserts the ENTIRE ~3.67M-row dataset in one run — same
 *     behavior this script always had; for the very first backfill only,
 *     run locally where it can take as long as it needs.)
 *   node backend/scripts/importCompanyRegistry.js --incremental   → bounded sync
 *     (advances company_registry_sync_state by DEFAULT_INCREMENTAL_MAX_PAGES
 *     pages and returns — safe to run on a schedule, e.g. the nightly
 *     .github/workflows/company-registry-sync.yml workflow, since it never
 *     holds a request open long enough to hit a CI/platform timeout.)
 *
 * DATA SOURCE: data.gov.in "Registrars of Companies (RoC)-wise Company
 * Master Data" (resource 4dbe5667-7b6b-41d7-82af-211562424d9a), ~3.67M
 * companies as of 2026 — not a live daily feed, refreshed periodically by
 * MCA/data.gov.in. Idempotent: upserts on company_registry.cin (unique).
 *
 * Sandbox note: this sandbox's outbound network cannot reach api.data.gov.in
 * (confirmed while building the original version of this script) — run it
 * where it has real network access (locally, or in CI for --incremental).
 *
 * Requires:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   DATA_GOV_IN_API_KEY (from https://data.gov.in — My Account → API Key)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"
import { runFullSync, runIncrementalSync, DEFAULT_INCREMENTAL_MAX_PAGES } from "../server/lib/companyRegistrySync.js"

const API_KEY = process.env.DATA_GOV_IN_API_KEY
const incremental = process.argv.includes("--incremental")

async function main() {
  if (!API_KEY) {
    throw new Error("DATA_GOV_IN_API_KEY is not set — add it to backend/.env or the environment this runs in")
  }

  if (incremental) {
    console.log(`Running incremental sync (max ${DEFAULT_INCREMENTAL_MAX_PAGES} pages this run)...`)
    const result = await runIncrementalSync({ apiKey: API_KEY })
    console.log("\n--- Incremental sync summary ---")
    console.log(`Dataset total: ${result.total}`)
    console.log(`Started at offset: ${result.startedAtOffset}, pages processed: ${result.pagesProcessed}`)
    console.log(`Rows written: ${result.totalWritten}, skipped (no CIN/name): ${result.totalSkippedNoKey}`)
    console.log(`Next run resumes at offset: ${result.nextOffset}`)
    if (result.reachedEndOfDataset) console.log(`✓ Reached end of dataset — full cycle #${result.fullCyclesCompleted} complete, wrapping to 0.`)
    if (result.failedOffsets.length > 0) console.log(`Failed offsets (will retry next run): ${result.failedOffsets.join(", ")}`)
  } else {
    console.log("Running FULL sync (entire dataset, one run) — this is the long-running backfill mode.")
    const result = await runFullSync({ apiKey: API_KEY })
    console.log("\n--- Full sync summary ---")
    console.log(`Total records in dataset: ${result.total}`)
    console.log(`Records fetched: ${result.totalFetched}`)
    console.log(`Rows written (upsert succeeded): ${result.totalWritten}`)
    console.log(`Records skipped (missing CIN or company name): ${result.totalSkippedNoKey}`)
    if (result.failedOffsets.length > 0) console.log(`Failed offsets/batches (re-run to retry): ${result.failedOffsets.join(", ")}`)
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("company_registry")
    .select("id", { count: "exact", head: true })
  if (!countErr) console.log(`Total rows now in company_registry table: ${count}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err)
    process.exit(1)
  })
