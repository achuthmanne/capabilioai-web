/**
 * lib/companyRegistrySync.js
 * ---------------------------------------------------------------------------
 * Shared fetch/transform/upsert logic for the `company_registry` table (MCA
 * company master data via data.gov.in), factored out of
 * scripts/importCompanyRegistry.js so it can be reused by both:
 *   - the original one-off full backfill (runFullSync — same behavior as
 *     the script always had, unchanged)
 *   - a new bounded incremental sync (runIncrementalSync) driven by
 *     company_registry_sync_state, meant to run on a schedule (see
 *     .github/workflows/company-registry-sync.yml) without ever holding an
 *     HTTP request open long enough to hit a platform timeout, and without
 *     re-scanning all ~3.67M records on every run.
 *
 * The user (product owner) flagged that new companies register with the MCA
 * every day and the registry needs to stay fresh — this module exists to
 * make that not a manual, easily-forgotten chore.
 */
import { supabaseAdmin } from "./supabase.js"
import { normalizeCompany } from "./employerMatch.js"

const RESOURCE_ID = "4dbe5667-7b6b-41d7-82af-211562424d9a"
const API_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`

export const PAGE_SIZE = 1000
export const BATCH_UPSERT_SIZE = 500
const FETCH_RETRIES = 3
const RETRY_DELAY_MS = 3000
const POLITE_DELAY_MS = 250

// Default bounded per-run budget for incremental syncs — chosen to comfortably
// finish inside a GitHub Actions job (or any short-lived scheduled runner)
// well within typical timeouts. 300 pages * 1000 records = up to 300K
// records touched per run; a full cycle through 3.67M records takes ~13 runs.
export const DEFAULT_INCREMENTAL_MAX_PAGES = 300

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function fetchPageWithRetry(apiKey, offset) {
  const url = `${API_URL}?api-key=${encodeURIComponent(apiKey)}&format=json&offset=${offset}&limit=${PAGE_SIZE}`
  let lastErr
  for (let attempt = 1; attempt <= FETCH_RETRIES; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      console.warn(`  fetch attempt ${attempt}/${FETCH_RETRIES} failed at offset ${offset}: ${err.message}`)
      if (attempt < FETCH_RETRIES) await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  throw lastErr
}

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

export function detectFieldMap(sampleRecord, { quiet = false } = {}) {
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
  if (!quiet) {
    console.log("\n--- Detected field mapping ---")
    console.log(JSON.stringify(map, null, 2))
    console.log("---\n")
  }
  return map
}

export function toRow(record, fieldMap) {
  const cin = fieldMap.cin ? String(record[fieldMap.cin] || "").trim() : ""
  const companyName = fieldMap.companyName ? String(record[fieldMap.companyName] || "").trim() : ""
  if (!cin || !companyName) return null

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

export async function upsertBatch(rows) {
  if (rows.length === 0) return
  const { error } = await supabaseAdmin
    .from("company_registry")
    .upsert(rows, { onConflict: "cin", ignoreDuplicates: false })
  if (error) throw new Error(`upsert failed: ${error.message}`)
}

// ─── Full sync (original script behavior, unchanged) ───────────────────────
export async function runFullSync({ apiKey }) {
  if (!apiKey) throw new Error("DATA_GOV_IN_API_KEY is required")

  console.log("Fetching first page to detect total count and field names...")
  const firstPage = await fetchPageWithRetry(apiKey, 0)
  const total = Number(firstPage.total) || 0
  const records = Array.isArray(firstPage.records) ? firstPage.records : []
  if (total === 0 || records.length === 0) {
    throw new Error("First page came back empty — aborting rather than writing garbage data.")
  }
  console.log(`Dataset reports ${total} total records.`)

  const fieldMap = detectFieldMap(records[0])
  if (!fieldMap.cin || !fieldMap.companyName) {
    throw new Error("Could not detect CIN and/or company name fields from the sample record — aborting.")
  }

  let totalFetched = 0, totalWritten = 0, totalSkippedNoKey = 0
  const failedOffsets = []

  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    let page
    if (offset === 0) page = firstPage
    else {
      try { page = await fetchPageWithRetry(apiKey, offset) }
      catch (err) {
        console.error(`  page fetch failed at offset ${offset}: ${err.message}`)
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
      try { await upsertBatch(batch); totalWritten += batch.length }
      catch (err) {
        console.error(`  batch upsert failed at offset ${offset}, batch start ${i}: ${err.message}`)
        failedOffsets.push(`${offset}+${i}`)
      }
    }

    if (offset % 20000 === 0) console.log(`  progress: ${Math.min(offset + PAGE_SIZE, total)}/${total} fetched, ${totalWritten} written so far`)
    if (offset > 0) await sleep(POLITE_DELAY_MS)
  }

  return { total, totalFetched, totalWritten, totalSkippedNoKey, failedOffsets }
}

// ─── Incremental sync (new, 2026-08-05) ────────────────────────────────────
// Advances a bounded window of pages starting at company_registry_sync_state.next_offset,
// wraps to 0 (and increments full_cycles_completed) when it reaches the end.
// Field-name detection re-runs each time from the first page it fetches in
// this run (cheap — one extra page) rather than trusting a stale cached map,
// since data.gov.in has no schema contract and re-detecting is nearly free.
export async function runIncrementalSync({ apiKey, maxPages = DEFAULT_INCREMENTAL_MAX_PAGES }) {
  if (!apiKey) throw new Error("DATA_GOV_IN_API_KEY is required")

  const { data: state, error: stateErr } = await supabaseAdmin
    .from("company_registry_sync_state").select("*").eq("id", 1).maybeSingle()
  if (stateErr) throw new Error(`failed to read sync state: ${stateErr.message}`)

  const probeOffset = state?.next_offset ?? 0
  let fullCycles = state?.full_cycles_completed ?? 0

  let probePage = await fetchPageWithRetry(apiKey, probeOffset)
  const total = Number(probePage.total) || state?.last_known_total || 0
  if (total === 0) throw new Error("Dataset reported 0 total records — aborting without writing.")

  let offset = probeOffset
  let firstPage = probePage
  if (probeOffset >= total) {
    // Reached (or started past) the end last run — wrap to a new cycle. The
    // page we just fetched at probeOffset is stale for this new offset, so
    // re-fetch at 0 rather than reusing it.
    offset = 0
    fullCycles += 1
    firstPage = await fetchPageWithRetry(apiKey, 0)
  }

  const fieldMap = detectFieldMap(firstPage.records?.[0] || {}, { quiet: true })
  if (!fieldMap.cin || !fieldMap.companyName) {
    throw new Error("Could not detect CIN/company name fields on this run's sample record — aborting without writing.")
  }

  let pagesProcessed = 0, totalWritten = 0, totalSkippedNoKey = 0
  let cursor = offset
  const failedOffsets = []

  while (pagesProcessed < maxPages && cursor < total) {
    let pageData
    if (cursor === offset) pageData = firstPage
    else {
      try { pageData = await fetchPageWithRetry(apiKey, cursor) }
      catch (err) {
        console.error(`  page fetch failed at offset ${cursor}: ${err.message}`)
        failedOffsets.push(cursor)
        cursor += PAGE_SIZE
        pagesProcessed++
        continue
      }
    }

    const pageRecords = Array.isArray(pageData.records) ? pageData.records : []
    const rows = pageRecords.map((r) => toRow(r, fieldMap)).filter(Boolean)
    totalSkippedNoKey += pageRecords.length - rows.length

    for (let i = 0; i < rows.length; i += BATCH_UPSERT_SIZE) {
      const batch = rows.slice(i, i + BATCH_UPSERT_SIZE)
      try { await upsertBatch(batch); totalWritten += batch.length }
      catch (err) {
        console.error(`  batch upsert failed at offset ${cursor}, batch start ${i}: ${err.message}`)
        failedOffsets.push(`${cursor}+${i}`)
      }
    }

    cursor += PAGE_SIZE
    pagesProcessed++
    if (cursor < total) await sleep(POLITE_DELAY_MS)
  }

  const reachedEnd = cursor >= total
  const nextOffset = reachedEnd ? 0 : cursor
  if (reachedEnd) fullCycles += 1

  const { error: updateErr } = await supabaseAdmin
    .from("company_registry_sync_state")
    .update({
      next_offset: nextOffset,
      last_known_total: total,
      full_cycles_completed: fullCycles,
      last_full_cycle_completed_at: reachedEnd ? new Date().toISOString() : (state?.last_full_cycle_completed_at ?? null),
      last_run_at: new Date().toISOString(),
      last_run_written: totalWritten,
      last_run_error: failedOffsets.length > 0 ? `Failed offsets: ${failedOffsets.join(", ")}` : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
  if (updateErr) throw new Error(`failed to persist sync state: ${updateErr.message}`)

  return {
    total, pagesProcessed, totalWritten, totalSkippedNoKey, failedOffsets,
    startedAtOffset: offset, nextOffset, reachedEndOfDataset: reachedEnd, fullCyclesCompleted: fullCycles,
  }
}
