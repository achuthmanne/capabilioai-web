import { test } from "node:test"
import assert from "node:assert/strict"
import { runGroundTruthCompare } from "./groundTruthCompare.js"

const SEED_SQL = `
  CREATE TABLE orders (order_id INTEGER PRIMARY KEY, amount REAL, status TEXT);
  INSERT INTO orders VALUES (1, 100, 'Delivered');
  INSERT INTO orders VALUES (2, 200, 'Delivered');
  INSERT INTO orders VALUES (3, 50, 'Cancelled');
`
const CONTEXT = { datasetSeedSql: SEED_SQL }

test("passes when the student's query matches ground truth within tolerance — real sql.js execution, no mocking", async () => {
  const config = { groundTruthQuery: "SELECT SUM(amount) FROM orders WHERE status = 'Delivered'", tolerancePct: 1.5 }
  const result = await runGroundTruthCompare(config, { query: "SELECT SUM(amount) FROM orders WHERE status = 'Delivered'" }, CONTEXT)
  assert.equal(result.passed, true)
  assert.equal(result.score, 100)
  assert.equal(result.evidence[0].passed, true)
  assert.deepEqual(result.diagnostics, [])
  assert.equal(result.metadata.validatorType, "ground_truth_compare")
})

test("fails when the student's query produces a numerically wrong answer", async () => {
  const config = { groundTruthQuery: "SELECT SUM(amount) FROM orders WHERE status = 'Delivered'" }
  const result = await runGroundTruthCompare(config, { query: "SELECT SUM(amount) FROM orders" }, CONTEXT) // includes the cancelled order — wrong
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
})

test("fails cleanly (not throws) on invalid student SQL — reported as a diagnostic, not evidence", async () => {
  const config = { groundTruthQuery: "SELECT SUM(amount) FROM orders" }
  const result = await runGroundTruthCompare(config, { query: "SELECT NOT VALID SQL HERE (((" }, CONTEXT)
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
  assert.deepEqual(result.evidence, [])
  assert.equal(result.diagnostics.length, 1)
  assert.match(result.diagnostics[0], /failed to execute/)
})

test("fails cleanly when no query was submitted at all — reported as a diagnostic", async () => {
  const config = { groundTruthQuery: "SELECT SUM(amount) FROM orders" }
  const result = await runGroundTruthCompare(config, {}, CONTEXT)
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
  assert.deepEqual(result.evidence, [])
  assert.match(result.diagnostics[0], /No SQL query was submitted/)
})

test("throws (does not silently fail the student) when the ground-truth query itself is broken — a content bug", async () => {
  const config = { groundTruthQuery: "SELECT * FROM a_table_that_does_not_exist" }
  await assert.rejects(
    () => runGroundTruthCompare(config, { query: "SELECT 1" }, CONTEXT),
    /content bug, not a student error/
  )
})

test("throws when validator config has no groundTruthQuery at all — a content-authoring bug", async () => {
  await assert.rejects(
    () => runGroundTruthCompare({}, { query: "SELECT 1" }, CONTEXT),
    /missing groundTruthQuery/
  )
})

test("never leaks the raw groundTruthQuery SQL text anywhere in the returned result", async () => {
  const secretQuery = "SELECT SUM(amount) FROM orders WHERE status = 'Delivered' -- SECRET_MARKER_XYZ"
  const config = { groundTruthQuery: secretQuery }
  const result = await runGroundTruthCompare(config, { query: "SELECT SUM(amount) FROM orders WHERE status = 'Delivered'" }, CONTEXT)
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes("SECRET_MARKER_XYZ"), false)
})

test("partial credit: scores the fraction of expected values found when ground truth has multiple rows/columns", async () => {
  const config = { groundTruthQuery: "SELECT status, SUM(amount) FROM orders GROUP BY status ORDER BY status" }
  // Student's query only gets one of the two groups right
  const result = await runGroundTruthCompare(config, { query: "SELECT 'Cancelled', 50 UNION SELECT 'Delivered', 999" }, CONTEXT)
  assert.ok(result.score > 0 && result.score < 100)
  assert.equal(result.passed, false)
  assert.equal(result.metadata.expectedCount, 2)
})

test("returns a shape createValidatorResult would accept — every branch produces the canonical ValidatorResult", async () => {
  const config = { groundTruthQuery: "SELECT SUM(amount) FROM orders" }
  const results = await Promise.all([
    runGroundTruthCompare(config, { query: "SELECT SUM(amount) FROM orders" }, CONTEXT),
    runGroundTruthCompare(config, { query: "SELECT NOT VALID" }, CONTEXT),
    runGroundTruthCompare(config, {}, CONTEXT),
  ])
  for (const r of results) {
    assert.equal(typeof r.passed, "boolean")
    assert.equal(typeof r.score, "number")
    assert.ok(Array.isArray(r.evidence))
    assert.ok(Array.isArray(r.diagnostics))
    assert.equal(typeof r.metadata, "object")
  }
})
