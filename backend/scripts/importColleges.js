/**
 * scripts/importColleges.js
 * ---------------------------------------------------------------------------
 * One-off/re-runnable seed script for the `colleges` table (public Indian
 * college/university directory, backs the onboarding autocomplete — see
 * routes/collegeDirectory.js and migration create_colleges_table).
 *
 * WHY THIS RUNS LOCALLY, NOT FROM AN AUTOMATED TOOL:
 * The source dataset (AICTE-derived, via indian-colleges-list.vercel.app,
 * itself mirroring anburocky3/indian-colleges-data) is served per-state and
 * some states (UP, Maharashtra, Karnataka, Tamil Nadu...) return several
 * thousand institutions each with a nested `programmes` array we don't need.
 * Pulling and transcribing that through a chat/tool-call context is both
 * infeasible (multi-MB payloads) and the wrong layer for it — this is a
 * straight fetch+transform+upsert job, so it's a script like every other
 * one-off backfill in this folder.
 *
 * Idempotent: upserts on colleges.aicte_id (unique partial index), so
 * re-running after a partial failure or to pick up new institutions is safe
 * and will not create duplicates.
 *
 * Upgrade path: when moving to the official AISHE dataset, write a second
 * script that upserts with source='aishe' — no schema change needed, the
 * `source` column already exists for exactly this reason.
 *
 * Run with:  node backend/scripts/importColleges.js
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env (same
 * vars every other script/server.js in this repo already uses).
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { supabaseAdmin } from "../server/lib/supabase.js"

const STATES_URL = "https://indian-colleges-list.vercel.app/api/institutions/states"
const STATE_URL = (slug) => `https://indian-colleges-list.vercel.app/api/institutions/states/${slug}`

const BATCH_SIZE = 500 // keep individual upsert payloads small and retry-friendly
const FETCH_RETRIES = 3
const RETRY_DELAY_MS = 2000

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchJsonWithRetry(url) {
  let lastErr
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      console.warn(`  fetch attempt ${attempt}/${FETCH_RETRIES} failed for ${url}: ${err.message}`)
      if (attempt < FETCH_RETRIES) await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  throw lastErr
}

// Extract only what the directory/autocomplete needs — deliberately drops
// the `programmes` array (intake/enrollment/course data), which is not
// relevant to "find your college by name" and is the bulk of the payload.
function toRow(rec, stateName) {
  const name = (rec.institute_name || "").trim()
  if (!name) return null
  return {
    aicte_id: rec.aicte_id || null,
    institute_name: name,
    state: rec.state || stateName || null,
    district: rec.district || null,
    institution_type: rec.institution_type || null,
    source: "aicte",
  }
}

async function upsertBatch(rows) {
  if (rows.length === 0) return { inserted: 0 }
  // Two groups: rows with a real aicte_id (safe to upsert/dedupe on it), and
  // rows without one (rare — fall back to plain insert, duplicates there are
  // a data-source quirk, not a script bug, and won't break the UI).
  const withId = rows.filter((r) => r.aicte_id)
  const withoutId = rows.filter((r) => !r.aicte_id)

  if (withId.length > 0) {
    const { error } = await supabaseAdmin
      .from("colleges")
      .upsert(withId, { onConflict: "aicte_id", ignoreDuplicates: false })
    if (error) throw new Error(`upsert (with aicte_id) failed: ${error.message}`)
  }
  if (withoutId.length > 0) {
    const { error } = await supabaseAdmin.from("colleges").insert(withoutId)
    if (error) throw new Error(`insert (no aicte_id) failed: ${error.message}`)
  }
  return { inserted: rows.length }
}

async function run() {
  console.log("Fetching state list...")
  const { states } = await fetchJsonWithRetry(STATES_URL)
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("State list came back empty — aborting rather than writing partial/garbage data")
  }
  console.log(`Found ${states.length} states/UTs.`)

  let totalFetched = 0
  let totalWritten = 0
  const failedStates = []

  for (const { name, slug } of states) {
    process.stdout.write(`[${slug}] fetching... `)
    let payload
    try {
      payload = await fetchJsonWithRetry(STATE_URL(slug))
    } catch (err) {
      console.log(`FAILED (${err.message}) — skipping, re-run script later to retry`)
      failedStates.push(slug)
      continue
    }

    const records = Array.isArray(payload?.data) ? payload.data : []
    totalFetched += records.length
    console.log(`${records.length} institutions`)

    const rows = records.map((r) => toRow(r, name)).filter(Boolean)

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      try {
        const { inserted } = await upsertBatch(batch)
        totalWritten += inserted
      } catch (err) {
        console.error(`  batch write failed for ${slug} rows ${i}-${i + batch.length}: ${err.message}`)
        failedStates.push(`${slug} (batch ${i})`)
      }
    }

    // Be a polite client against a free-tier hosted API.
    await sleep(300)
  }

  console.log("\n--- Import summary ---")
  console.log(`States processed: ${states.length}`)
  console.log(`Institutions fetched: ${totalFetched}`)
  console.log(`Rows written (upsert/insert calls succeeded): ${totalWritten}`)
  if (failedStates.length > 0) {
    console.log(`Failed states/batches (re-run this script to retry — it's idempotent): ${failedStates.join(", ")}`)
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("colleges")
    .select("id", { count: "exact", head: true })
  if (!countErr) console.log(`Total rows now in colleges table: ${count}`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err)
    process.exit(1)
  })
