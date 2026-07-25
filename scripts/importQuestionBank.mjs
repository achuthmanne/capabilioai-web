#!/usr/bin/env node
/**
 * importQuestionBank.mjs — Career OS Workstream 3 content-ops CLI.
 *
 * Validates a CSV or JSON question-bank seed file and (only with --commit)
 * inserts every valid row into `question_bank` as a draft. Never approves
 * anything — that's a separate, one-at-a-time, human-reviewer action via
 * the admin API's /approve endpoint. This script's whole job is getting
 * candidate content INTO the review queue safely, with every row that
 * doesn't pass validation reported and skipped, not silently dropped or
 * force-inserted.
 *
 * Usage:
 *   node scripts/importQuestionBank.mjs <file.csv|file.json> [--commit] [--created-by=<uuid>]
 *
 * Without --commit: dry run — parses, validates, prints a report, inserts nothing.
 * With --commit: also inserts every valid row as review_status='draft'.
 *
 * Templates: docs/question-bank-import-template.csv,
 *            docs/question-bank-import-template.json
 */
import { readFileSync } from "node:fs"
import { parseCsv, parseJson, validateImportBatch, toQuestionBankRow } from "../backend/server/lib/skillPulseV2/questionImport.js"

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find(a => !a.startsWith("--"))
  const commit = args.includes("--commit")
  const createdByArg = args.find(a => a.startsWith("--created-by="))
  const createdBy = createdByArg ? createdByArg.split("=")[1] : null

  if (!filePath) {
    console.error("Usage: node scripts/importQuestionBank.mjs <file.csv|file.json> [--commit] [--created-by=<uuid>]")
    process.exit(1)
  }

  const text = readFileSync(filePath, "utf-8")
  const rows = filePath.endsWith(".json") ? parseJson(text) : parseCsv(text)

  const { valid, invalid, summary } = validateImportBatch(rows)

  console.log(`\nParsed ${summary.total} rows from ${filePath}`)
  console.log(`  Valid:   ${summary.validCount}`)
  console.log(`  Invalid: ${summary.invalidCount}`)

  if (invalid.length) {
    console.log("\nInvalid rows (skipped, never inserted):")
    for (const { errors } of invalid.slice(0, 50)) {
      for (const err of errors) console.log(`  - ${err}`)
    }
    if (invalid.length > 50) console.log(`  ...and ${invalid.length - 50} more`)
  }

  const byDomain = {}
  for (const row of valid) byDomain[row.domain] = (byDomain[row.domain] || 0) + 1
  console.log("\nValid rows by domain:")
  for (const [domain, count] of Object.entries(byDomain)) console.log(`  ${domain}: ${count}`)

  if (!commit) {
    console.log("\nDry run only — no rows inserted. Re-run with --commit to insert valid rows as drafts.")
    return
  }

  if (!valid.length) {
    console.log("\nNothing valid to insert.")
    return
  }

  // Dynamic import so a dry run never needs Supabase credentials configured.
  const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
  const insertRows = valid.map(r => toQuestionBankRow(r, createdBy))
  const { data, error } = await supabaseAdmin.from("question_bank").insert(insertRows).select("id")
  if (error) {
    console.error("\nInsert failed:", error.message)
    process.exit(1)
  }
  console.log(`\nInserted ${data.length} questions as drafts (review_status='draft'). None auto-approved.`)
}

main().catch(e => { console.error(e); process.exit(1) })
