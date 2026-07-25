/**
 * questionImport.js — Career OS Workstream 3 content-ops: CSV/JSON import
 * parsing + validation for seeding question_bank. Pure, dependency-free
 * (no CSV library — the format is simple enough not to need one, and this
 * keeps it testable without an install).
 *
 * HARD RULE: every row this module produces is forced to
 * `review_status: 'draft'` regardless of what the source file says. Bulk
 * import must never be a backdoor to auto-approval — approval only ever
 * happens through the admin `/approve` endpoint's server-side validation
 * gate (questionBankGate.js's validateQuestionForApproval), one question at
 * a time, by a human reviewer.
 */

import { TOP_10_DOMAINS } from "./questionBankGate.js"

const ALL_DOMAINS = [...TOP_10_DOMAINS, "other"]
const QUESTION_TYPES = [
  "scenario", "bug_finding", "reasoning", "dashboard_interpretation",
  "architecture_interpretation", "operational_decision", "work_situation",
]
const SOURCES = ["ai_generated", "human_authored", "imported"]

const CSV_COLUMNS = [
  "domain", "skill_tags", "difficulty", "question_type", "prompt",
  "option_a", "option_b", "option_c", "option_d", "correct_option_id",
  "explanation", "source",
]

// ── CSV parsing (simple: no embedded commas inside quoted fields support
// beyond basic double-quote escaping, which is enough for question content
// that shouldn't contain raw commas without quoting anyway) ────────────────
function parseCsvLine(line) {
  const fields = []
  let cur = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false }
      else { cur += c }
    } else {
      if (c === '"') inQuotes = true
      else if (c === ",") { fields.push(cur); cur = "" }
      else cur += c
    }
  }
  fields.push(cur)
  return fields
}

/**
 * @param {string} csvText — full CSV file contents, header row required,
 *   columns must match CSV_COLUMNS (order doesn't matter, extras ignored).
 * @returns {Array<object>} raw parsed rows (not yet validated) in the same
 *   shape validateImportRow expects.
 */
export function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (!lines.length) return []
  const header = parseCsvLine(lines[0]).map(h => h.trim())
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const raw = {}
    header.forEach((col, idx) => { raw[col] = cells[idx] !== undefined ? cells[idx].trim() : "" })
    rows.push(csvRowToQuestion(raw))
  }
  return rows
}

function csvRowToQuestion(raw) {
  const options = ["option_a", "option_b", "option_c", "option_d"]
    .map((col, i) => ({ id: ["a", "b", "c", "d"][i], text: raw[col] }))
    .filter(o => o.text && o.text.length > 0)
  return {
    domain: raw.domain,
    skill_tags: (raw.skill_tags || "").split("|").map(s => s.trim()).filter(Boolean),
    difficulty: Number(raw.difficulty),
    question_type: raw.question_type,
    prompt: raw.prompt,
    options,
    correct_option_id: raw.correct_option_id,
    explanation: raw.explanation,
    source: raw.source || "imported",
  }
}

/**
 * @param {string} jsonText — JSON array of question objects, each already
 *   shaped like { domain, skill_tags: [], difficulty, question_type,
 *   prompt, options: [{id,text}], correct_option_id, explanation, source }.
 */
export function parseJson(jsonText) {
  const parsed = JSON.parse(jsonText)
  if (!Array.isArray(parsed)) throw new Error("questionImport: JSON input must be an array of question objects")
  return parsed
}

/**
 * Import-time validation — stricter shape checking than
 * validateQuestionForApproval (which assumes a well-formed row already);
 * this catches malformed import data (wrong types, out-of-range values,
 * unknown domain/type/source) before it ever becomes a row in the DB.
 */
export function validateImportRow(row, index) {
  const errors = []
  const prefix = index != null ? `row ${index + 1}: ` : ""

  if (!row.domain || !ALL_DOMAINS.includes(row.domain)) {
    errors.push(`${prefix}domain must be one of ${ALL_DOMAINS.join(", ")} (got "${row.domain}")`)
  }
  if (!Array.isArray(row.skill_tags) || row.skill_tags.length === 0) {
    errors.push(`${prefix}skill_tags must be a non-empty array`)
  }
  if (!Number.isInteger(row.difficulty) || row.difficulty < 1 || row.difficulty > 5) {
    errors.push(`${prefix}difficulty must be an integer 1-5 (got "${row.difficulty}")`)
  }
  if (!row.question_type || !QUESTION_TYPES.includes(row.question_type)) {
    errors.push(`${prefix}question_type must be one of ${QUESTION_TYPES.join(", ")} (got "${row.question_type}")`)
  }
  if (!row.prompt || row.prompt.trim().length < 10) {
    errors.push(`${prefix}prompt is required and should be a real question (min 10 chars)`)
  }
  if (!Array.isArray(row.options) || row.options.length !== 4) {
    errors.push(`${prefix}exactly 4 options are required (got ${Array.isArray(row.options) ? row.options.length : 0})`)
  } else if (row.options.some(o => !o.text || !o.text.trim())) {
    errors.push(`${prefix}every option must have non-empty text`)
  }
  const optionIds = new Set((row.options || []).map(o => o.id))
  if (!row.correct_option_id || !optionIds.has(row.correct_option_id)) {
    errors.push(`${prefix}correct_option_id must match one of the option ids`)
  }
  if (!row.explanation || row.explanation.trim().length < 5) {
    errors.push(`${prefix}explanation is required (min 5 chars)`)
  }
  if (row.source && !SOURCES.includes(row.source)) {
    errors.push(`${prefix}source must be one of ${SOURCES.join(", ")} (got "${row.source}")`)
  }

  return { valid: errors.length === 0, errors }
}

/**
 * @param {Array<object>} rows — parsed but not-yet-validated rows
 * @returns {{ valid: Array, invalid: Array<{row, errors}>, summary: object }}
 */
export function validateImportBatch(rows) {
  const valid = []
  const invalid = []
  rows.forEach((row, i) => {
    const result = validateImportRow(row, i)
    if (result.valid) valid.push(row)
    else invalid.push({ row, errors: result.errors })
  })
  return {
    valid, invalid,
    summary: { total: rows.length, validCount: valid.length, invalidCount: invalid.length },
  }
}

/**
 * Converts a validated import row into the exact shape ready for a
 * `question_bank` insert. Always forces review_status: 'draft' — see the
 * hard-rule comment at the top of this file.
 */
export function toQuestionBankRow(row, createdBy) {
  return {
    domain: row.domain,
    skill_tags: row.skill_tags,
    difficulty: row.difficulty,
    question_type: row.question_type,
    prompt: row.prompt,
    media_url: row.media_url || null,
    options: row.options,
    correct_option_id: row.correct_option_id,
    explanation: row.explanation,
    source: SOURCES.includes(row.source) ? row.source : "imported",
    review_status: "draft", // hard-enforced, never trust the import file
    created_by: createdBy || null,
  }
}

export { CSV_COLUMNS, ALL_DOMAINS, QUESTION_TYPES as IMPORT_QUESTION_TYPES, SOURCES as IMPORT_SOURCES }
