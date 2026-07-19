/**
 * submission-validators/groundTruthCompare.js — Milestone 8, normalized pre-M9
 * ---------------------------------------------------------------------------
 * Real implementation of the `ground_truth_compare` validator type
 * (05-validators.md): "Executes the ground-truth query against the same
 * seeded sql.js DB the student queried, compares published result." This is
 * the SQL Workstation's validator — the one workstation Milestone 7 actually
 * wired up, so this is the one validator type this milestone implements for
 * real rather than flagging as not-yet-implemented.
 *
 * Returns the canonical ValidatorResult shape (validatorResult.js) —
 * `evidence` for graded per-metric comparisons, `diagnostics` for
 * execution-level problems that stopped grading before any comparison could
 * happen (invalid SQL, no submission at all). `timing.durationMs` is left to
 * registry.js's runValidator wrapper to stamp uniformly across every
 * validator type; this function only fills in what it directly knows.
 *
 * SECURITY NOTE: `config.groundTruthQuery` (the answer key) is read here but
 * NEVER placed in the returned `evidence`/`diagnostics`/`metadata` — only
 * the ground truth's *computed values* (numbers) appear as `expected`,
 * never the SQL text that produced them. This mirrors the same principle as
 * challenge-delivery/dto.js's validator exclusion (Milestone 6): the
 * grading mechanism can see the answer key; nothing it returns ever can.
 */
import { runSqlAgainstFreshDb, SqlExecutionError } from "./sqlEngine.js"
import { createValidatorResult } from "./validatorResult.js"

const DEFAULT_TOLERANCE_PCT = 1.5

function extractNumbers(resultSets) {
  const out = []
  for (const rs of resultSets || []) {
    for (const row of rs.values || []) {
      for (const cell of row) {
        if (cell === null || cell === undefined) continue
        const n = typeof cell === "number" ? cell : parseFloat(String(cell).replace(/[₹,%\s,]/g, ""))
        if (Number.isFinite(n)) out.push(n)
      }
    }
  }
  return out
}

const within = (a, b, tolPct) => (b !== 0 ? Math.abs(a - b) / Math.abs(b) <= tolPct / 100 : Math.abs(a) < 1e-6)

/**
 * @param {{ groundTruthQuery: string, tolerancePct?: number }} config
 * @param {{ query: string }} submissionData — the student's submitted SQL text
 * @param {{ datasetSeedSql: string }} context — pinned seed script from the
 *        instance's payload (never re-fetched "latest" — same principle as
 *        the frontend workstation: grade against the version the student
 *        actually played against).
 * @returns {Promise<object>} a ValidatorResult
 */
export async function runGroundTruthCompare(config, submissionData, context) {
  const tolerancePct = typeof config?.tolerancePct === "number" ? config.tolerancePct : DEFAULT_TOLERANCE_PCT
  const metadata = { validatorType: "ground_truth_compare", tolerancePct }

  if (!config?.groundTruthQuery) {
    // A content bug (a ground_truth_compare template with no groundTruthQuery
    // configured) — not something a student caused, so this throws rather
    // than silently failing the student's submission.
    throw new Error("groundTruthCompare: validator config is missing groundTruthQuery")
  }
  if (!submissionData?.query || typeof submissionData.query !== "string" || !submissionData.query.trim()) {
    return createValidatorResult({
      passed: false,
      score: 0,
      evidence: [],
      diagnostics: ["No SQL query was submitted."],
      metadata,
    })
  }

  // Ground truth first — if this fails, it's our content that's broken.
  let expectedSets
  try {
    expectedSets = await runSqlAgainstFreshDb(context?.datasetSeedSql, config.groundTruthQuery)
  } catch (e) {
    throw new Error(`groundTruthCompare: ground-truth query failed to execute — content bug, not a student error: ${e.message}`)
  }
  const expectedNumbers = extractNumbers(expectedSets)

  // Student's query — failure here IS a gradeable, expected outcome.
  let actualSets
  try {
    actualSets = await runSqlAgainstFreshDb(context?.datasetSeedSql, submissionData.query)
  } catch (e) {
    const reason = e instanceof SqlExecutionError ? e.message : String(e.message || e)
    return createValidatorResult({
      passed: false,
      score: 0,
      evidence: [],
      diagnostics: [`Your SQL query failed to execute: ${reason}`],
      metadata,
    })
  }
  const actualNumbers = extractNumbers(actualSets)

  if (expectedNumbers.length === 0) {
    // Ground truth produced no comparable numeric output — also a content bug.
    throw new Error("groundTruthCompare: ground-truth query produced no numeric result to compare against")
  }

  const evidence = expectedNumbers.map((expected, i) => {
    const hit = actualNumbers.some((n) => within(n, expected, tolerancePct))
    return { metric: `expected value #${i + 1}`, expected, actual: hit ? "found ✓" : "not found in your result", passed: hit }
  })

  const matched = evidence.filter((d) => d.passed).length
  const score = Math.round((matched / evidence.length) * 100)

  return createValidatorResult({
    passed: score === 100,
    score,
    evidence,
    diagnostics: [],
    metadata: { ...metadata, expectedCount: evidence.length, matchedCount: matched },
  })
}
