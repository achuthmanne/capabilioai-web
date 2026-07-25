import { test } from "node:test"
import assert from "node:assert/strict"
import { parseCsv, parseJson, validateImportRow, validateImportBatch, toQuestionBankRow } from "./questionImport.js"

const GOOD_ROW = {
  domain: "data_analytics",
  skill_tags: ["sql"],
  difficulty: 2,
  question_type: "scenario",
  prompt: "A dashboard shows revenue dropped 40% overnight. What's your first move?",
  options: [{ id: "a", text: "Check the ETL job" }, { id: "b", text: "Panic" }, { id: "c", text: "Ignore it" }, { id: "d", text: "Delete the dashboard" }],
  correct_option_id: "a",
  explanation: "Pipeline issues are more common than real overnight revenue collapses.",
  source: "ai_generated",
}

test("parseCsv parses the documented template file shape", () => {
  const csv = `domain,skill_tags,difficulty,question_type,prompt,option_a,option_b,option_c,option_d,correct_option_id,explanation,source
data_analytics,sql,2,scenario,"A test prompt with enough length","Opt A","Opt B","Opt C","Opt D",a,"An explanation",ai_generated`
  const rows = parseCsv(csv)
  assert.equal(rows.length, 1)
  assert.equal(rows[0].domain, "data_analytics")
  assert.deepEqual(rows[0].skill_tags, ["sql"])
  assert.equal(rows[0].difficulty, 2)
  assert.equal(rows[0].options.length, 4)
  assert.equal(rows[0].correct_option_id, "a")
})

test("parseCsv handles quoted fields containing commas", () => {
  const csv = `domain,skill_tags,difficulty,question_type,prompt,option_a,option_b,option_c,option_d,correct_option_id,explanation,source
data_analytics,sql,2,scenario,"A prompt, with a comma inside it","A","B","C","D",a,"Explains, with a comma",ai_generated`
  const rows = parseCsv(csv)
  assert.equal(rows[0].prompt, "A prompt, with a comma inside it")
  assert.equal(rows[0].explanation, "Explains, with a comma")
})

test("parseJson parses an array and rejects a non-array", () => {
  const rows = parseJson(JSON.stringify([GOOD_ROW]))
  assert.equal(rows.length, 1)
  assert.throws(() => parseJson(JSON.stringify({ not: "an array" })))
})

test("validateImportRow accepts a well-formed row", () => {
  const result = validateImportRow(GOOD_ROW)
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

test("validateImportRow rejects an unknown domain", () => {
  const result = validateImportRow({ ...GOOD_ROW, domain: "underwater_basket_weaving" })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes("domain")))
})

test("validateImportRow rejects difficulty outside 1-5", () => {
  assert.equal(validateImportRow({ ...GOOD_ROW, difficulty: 0 }).valid, false)
  assert.equal(validateImportRow({ ...GOOD_ROW, difficulty: 6 }).valid, false)
})

test("validateImportRow rejects fewer than 4 options", () => {
  const result = validateImportRow({ ...GOOD_ROW, options: GOOD_ROW.options.slice(0, 3) })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes("4 options")))
})

test("validateImportRow rejects a correct_option_id that doesn't match any option", () => {
  const result = validateImportRow({ ...GOOD_ROW, correct_option_id: "z" })
  assert.equal(result.valid, false)
})

test("validateImportRow rejects an empty/missing explanation", () => {
  assert.equal(validateImportRow({ ...GOOD_ROW, explanation: "" }).valid, false)
  assert.equal(validateImportRow({ ...GOOD_ROW, explanation: "hi" }).valid, false) // too short
})

test("validateImportBatch splits valid and invalid rows and summarizes counts", () => {
  const bad = { ...GOOD_ROW, domain: "nonsense" }
  const { valid, invalid, summary } = validateImportBatch([GOOD_ROW, bad])
  assert.equal(valid.length, 1)
  assert.equal(invalid.length, 1)
  assert.equal(summary.total, 2)
  assert.equal(summary.validCount, 1)
  assert.equal(summary.invalidCount, 1)
})

test("toQuestionBankRow always forces review_status to 'draft', even if the source data implies otherwise", () => {
  const row = toQuestionBankRow({ ...GOOD_ROW, review_status: "approved" }, "reviewer-uuid")
  assert.equal(row.review_status, "draft")
  assert.equal(row.created_by, "reviewer-uuid")
})

test("toQuestionBankRow falls back to 'imported' for an unrecognized source value", () => {
  const row = toQuestionBankRow({ ...GOOD_ROW, source: "not_a_real_source" })
  assert.equal(row.source, "imported")
})
