import { test } from "node:test"
import assert from "node:assert/strict"
import { runValidator, isValidatorImplemented, NotImplementedValidatorError } from "./registry.js"

const SEED_SQL = "CREATE TABLE t (a INTEGER); INSERT INTO t VALUES (5);"

test("routes ground_truth_compare to the real implementation", async () => {
  const result = await runValidator({
    validatorConfig: { type: "ground_truth_compare", version: "v1", config: { groundTruthQuery: "SELECT SUM(a) FROM t" } },
    submissionData: { query: "SELECT SUM(a) FROM t" },
    context: { datasetSeedSql: SEED_SQL },
  })
  assert.equal(result.passed, true)
})

test("stamps timing.durationMs onto every result, regardless of what the implementation itself returned", async () => {
  const result = await runValidator({
    validatorConfig: { type: "ground_truth_compare", version: "v1", config: { groundTruthQuery: "SELECT SUM(a) FROM t" } },
    submissionData: { query: "SELECT SUM(a) FROM t" },
    context: { datasetSeedSql: SEED_SQL },
  })
  assert.equal(typeof result.timing.durationMs, "number")
  assert.ok(result.timing.durationMs >= 0)
  assert.equal(typeof result.timing.startedAt, "string")
})

test("throws a typed NotImplementedValidatorError for a validator type with no implementation yet", async () => {
  await assert.rejects(
    () => runValidator({ validatorConfig: { type: "test_case_judge", version: "v1", config: {} }, submissionData: {}, context: {} }),
    NotImplementedValidatorError
  )
})

test("isValidatorImplemented reflects exactly the one wired-up validator (matching Milestone 7's one wired-up workstation)", () => {
  assert.equal(isValidatorImplemented("ground_truth_compare"), true)
  const otherTypes = [
    "test_case_judge", "published_result_compare", "live_render_probe", "http_assertion",
    "command_output_match", "formula_result_check", "kpi_compare", "rubric_review",
    "numeric_tolerance", "register_match",
  ]
  for (const t of otherTypes) assert.equal(isValidatorImplemented(t), false, `expected ${t} to be unimplemented`)
})
