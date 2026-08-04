/**
 * scripts/importCompanyRegistry.js
 * ---------------------------------------------------------------------------
 * One-off/re-runnable seed script for the `company_registry` table (MCA
 * company master data — see migration company_registry_mca_master_data and
 * routes/companyRegistry.js). Same pattern as scripts/importColleges.js:
 * straight fetch+transform+upsert against a large government dataset, run
 * locally with real network access (this sandbox's outbound network is
 * allowlisted and cannot reach api.data.gov.in — confirmed while building
 * this script; the request just hangs against a local proxy).
 *
 * DATA SOURCE: data.gov.in "Registrars of Companies (RoC)-wise Company
 * Master Data" (resource 4dbe5667-7b6b-41d7-82af-211562424d9a), ~3.67M
 * companies as of 2026, refreshed periodically by MCA/data.gov.in — NOT a
 * live daily feed. Re-run this script periodically (e.g. monthly) to pick up
 * newly-registered companies and status changes; it's a plain upsert on
 * `cin`, so re-running is always safe.
 *
 * FIELD-NAME DEFENSIVE HANDLING: data.gov.in's OGD API has been known to
 * vary field capitalization/naming slightly across datasets and re-exports
 * (there's no strict published schema contract). Rather than hardcode exact
 * field names I could not verify live (this sandbox can't reach the API —
 * see above), this script inspects the actual keys on the first page it
 * receives and does case-insensitive substring matching to find the right
 * field for CIN/name/status/etc. It also stores the FULL raw record in the
 * `raw` jsonb column, so even if a field is missed by the matcher, the data
 * isn't lost and the matcher can be improved later without re-fetching.
 * **First run: watch the console output — it prints exactly which source
 * field it mapped to which column, so you can sanity-check it against the
 * first few real records before it processes all ~3.67M rows.**
 *
 * Idempotent: upserts on company_registry.cin (unique). Rows with no CIN in
 * the source data are skipped and counted, not inserted — a company_registry
 * row without a CIN can't be safely deduped on re-run and isn't reliably
 * matchable against anything anyway.
 *
 * Run with:  node backend/scripts/importCompanyRegistry.js
 * Requires in backend/.env:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same as every other script here)
 *   DATA_GOV_IN_API_KEY (from https://data.gov.in — My Account → API Key)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })
dotenv.config({ path: resolve(__dirname, "../../.env") }) // fallback: repo-root .env, same dual-path pattern as importColleges.js's server usage

import { supabaseAdmin } from "../server/lib/supabase.js"
import { normalizeCompany } from "../server/lib/employerMatch.js"

const RESOURCE_ID = "4dbe5667-7b6b-41d7-82af-211562424d9a"
const API_KEY = process.env.DATA_GOV_IN_API_KEY
const API_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`

const PAGE_SIZE = 1000       // data.gov.in OGD API's documented practical max per request
const BATCH_UPSERT_SIZE = 500
const FETCH_RETRIES = 3
const RETRY_DELAY_MS = 3000
const POLITE_DELAY_MS = 250  // between successive page fetches — don't hammer a free government API

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchPageWithRetry(offset) {
  const url = `${API_URL}?api-key=${encodeURIComponent(API_KEY)}&format=json&offset=${offset}&limit=${PAGE_SIZE}`
  let lastErr
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      return json
    } catch (err) {
      lastErr = err
      console.warn(`  fetch attempt ${attempt}/${FETCH_RETRIES} failed at offset ${offset}: ${err.message}`)
      if (attempt < FETCH_RETRIES) await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  throw lastErr
}

// ─── Field-name discovery (defensive against schema drift — see header) ──────
// Finds the actual key in a record whose name contains ALL of the given
// substrings (case-insensitive), preferring the shortest match.
function findKey(record, mustContainAll) {
  const keys = Object.keys(record)
  const candidates = keys.filter((k) => {
    const lk = k.toLowerCase().replace(/[^a-z0-9]/g, "")
    return mustContainAll.every((needle) => lk.includes(needle))
  })
  if (candidates.length === 0) return null
  candidates.sort((a, b) => a.length - b.length)
  return candidates[0]
}

function detectFieldMap(sampleRecord) {
  const map = {
    cin:              findKey(sampleRecord, ["cin"]),
    companyName:      findKey(sampleRecord, ["company", "name"]) || findKey(sampleRecord, ["companyname"]),
    status:           findKey(sampleRecord, ["status"]),
    category:         findKey(sampleRecord, ["category"]) && !findKey(sampleRecord, ["subcategory"])
                         ? findKey(sampleRecord, ["category"])
                         : findKey(sampleRecord, ["companycategory"]),
    rocCode:          findKey(sampleRecord, ["roc"]),
    registrationDate: findKey(sampleRecord, ["registration", "date"]) || findKey(sampleRecord, ["incorporation", "date"]) || findKey(sampleRecord, ["dateof", "registration"]),
    state:            findKey(sampleRecord, ["state"]) && !findKey(sampleRecord, ["registeredstate"])
                         ? findKey(sampleRecord, ["state"])
                         : findKey(sampleRecord, ["registeredstate"]),
  }
  console.log("\n--- Detected field mapping (verify this looks right before trusting the full run) ---")
  console.log(JSON.stringify(map, null, 2))
  console.log("Sample record keys available:", Object.keys(sampleRecord).join(", "))
  console.log("---\n")
  return map
}

function toRow(record, fieldMap) {
  const cin = fieldMap.cin ? String(record[fieldMap.cin] || "").trim() : ""
  const companyName = fieldMap.companyName ? String(record[fieldMap.companyName] || "").trim() : ""
  if (!cin || !companyName) return null // can't safely dedupe or match without both

  let registrationDate = null
  if (fieldMap.registrationDate) {
    const raw = record[fieldMap.registrationDate]
    if (raw) {
      const parsed = new Date(raw)
      if (!isNaN(parsed)) registrationDate = parsed.toISOString().slice(0, 10)
    }
  }

  return {
    cin,
    company_name: companyName,
    normalized_name: normalizeCompany(companyName),
    status: fieldMap.status ? (record[fieldMap.status] || null) : null,
    category: fieldMap.category ? (record[fieldMap.category] || null) : null,
    roc_code: fieldMap.rocCode ? (record[fieldMap.rocCode] || null) : null,
    registration_date: registrationDate,
    state: fieldMap.state ? (record[fieldMap.state] || null) : null,
    source: "data_gov_in",
    raw: record,
    synced_at: new Date().toISOString(),
  }
}

async function upsertBatch(rows) {
  if (rows.length === 0) return
  const { error } = await supabaseAdmin
    .from("company_registry")
    .upsert(rows, { onConflict: "cin", ignoreDuplicates: false })
  if (error) throw new Error(`upsert failed: ${error.message}`)
}

async function run() {
  if (!API_KEY) {
    throw new Error("DATA_GOV_IN_API_KEY is not set — add it to backend/.env or the environment this script runs in")
  }

  console.log("Fetching first page to detect total count and field names...")
  const firstPage = await fetchPageWithRetry(0)
  const total = Number(firstPage.total) || 0
  const records = Array.isArray(firstPage.records) ? firstPage.records : []
  if (total === 0 || records.length === 0) {
    throw new Error("First page came back empty — aborting rather than writing garbage data. Check the API key and resource ID.")
  }
  console.log(`Dataset reports ${total} total records.`)

  const fieldMap = detectFieldMap(records[0])
  if (!fieldMap.cin || !fieldMap.companyName) {
    throw new Error(
      "Could not detect CIN and/or company name fields from the sample record — aborting. " +
      "Inspect the printed sample keys above and update detectFieldMap() in this script before re-running."
    )
  }

  let totalFetched = 0
  let totalWritten = 0
  let totalSkippedNoKey = 0
  const failedOffsets = []

  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    let page
    if (offset === 0) {
      page = firstPage // reuse — don't re-fetch what we already have
    } else {
      try {
        page = await fetchPageWithRetry(offset)
      } catch (err) {
        console.error(`  page fetch failed at offset ${offset}: ${err.message} — skipping, re-run script later to retry`)
        failedOffsets.push(offset)
        continue
      }
    }

    const pageRecords = Array.isArray(page.records) ? page.records : []
    totalFetched += pageRecords.length

    const rows = pageRecords.map((r) => toRow(r, fieldMap)).filter(Boolean)
    totalSkippedNoKey += pageRecords.length - rows.length

    for (let i = 0; i < rows.length; i += BATCH_UPSERT_SIZE) {
      const batch = rows.slice(i, i + BATCH_UPSERT_SIZE)
      try {
        await upsertBatch(batch)
        totalWritten += batch.length
      } catch (err) {
        console.error(`  batch upsert failed at offset ${offset}, batch start ${i}: ${err.message}`)
        failedOffsets.push(`${offset}+${i}`)
      }
    }

    if (offset % 20000 === 0) {
      console.log(`  progress: ${Math.min(offset + PAGE_SIZE, total)}/${total} fetched, ${totalWritten} written so far`)
    }

    if (offset > 0) await sleep(POLITE_DELAY_MS)
  }

  console.log("\n--- Import summary ---")
  console.log(`Total records in dataset: ${total}`)
  console.log(`Records fetched: ${totalFetched}`)
  console.log(`Rows written (upsert succeeded): ${totalWritten}`)
  console.log(`Records skipped (missing CIN or company name): ${totalSkippedNoKey}`)
  if (failedOffsets.length > 0) {
    console.log(`Failed offsets/batches (re-run this script to retry — it's idempotent): ${failedOffsets.join(", ")}`)
  }

  const { count, error: countErr } = await supabaseAdmin
    .from("company_registry")
    .select("id", { count: "exact", head: true })
  if (!countErr) console.log(`Total rows now in company_registry table: ${count}`)
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Import failed:", err)
    process.exit(1)
  })
