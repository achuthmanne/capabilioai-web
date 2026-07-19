/**
 * submission-validators/validatorResult.js — pre-Milestone 9 normalization
 * ---------------------------------------------------------------------------
 * The single internal shape every validator type produces, per your
 * recommendation before starting Milestone 9. Pure, dependency-free — this
 * is the seam that lets Assessment stay completely ignorant of how any
 * given validator type works: it consumes exactly this shape and nothing
 * validator-specific, regardless of whether the grading was SQL execution,
 * an HTTP assertion, a notebook run, or a rubric review.
 *
 *   ValidatorResult
 *   ├── passed      boolean
 *   ├── score       number, 0-100
 *   ├── evidence    Array<{ metric, expected, actual, passed }> — the
 *   │                 per-criterion comparisons a validator actually graded.
 *   │                 Empty when grading couldn't run far enough to produce
 *   │                 any criteria (see diagnostics below).
 *   ├── timing      { durationMs, startedAt? } — how long grading took.
 *   │                 `durationMs` is always stamped by registry.js's
 *   │                 runValidator wrapper (every validator gets it for
 *   │                 free); a validator implementation MAY additionally
 *   │                 report finer-grained timing under this key.
 *   ├── diagnostics Array<string> — execution-level problems that prevented
 *   │                 (partial or full) grading: invalid submitted SQL,
 *   │                 missing submission data, a sandboxed process crash,
 *   │                 etc. Distinct from `evidence`: evidence entries are
 *   │                 graded criteria (each has its own pass/fail);
 *   │                 diagnostics are why grading couldn't produce more
 *   │                 evidence, not a criterion themselves.
 *   └── metadata    { validatorType, ...validator-specific details } — free
 *                     -form, never used by Assessment's scoring math, purely
 *                     for audit/debugging (persisted in full on
 *                     av2_submissions.validator_result).
 *
 * Only `createValidatorResult` should be used to construct one — this is
 * what "keep using it consistently as additional validator types are
 * implemented" (your words) means in code: every future validator (HTTP
 * assertions, notebook execution, rubric review, etc.) calls this factory
 * rather than hand-rolling a differently-shaped object.
 */
const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

export class InvalidValidatorResultError extends Error {
  constructor(issues) {
    super(`Invalid ValidatorResult: ${issues.join("; ")}`)
    this.name = "InvalidValidatorResultError"
    this.issues = issues
  }
}

/**
 * @param {{ passed: boolean, score: number, evidence?: Array, timing?: object,
 *           diagnostics?: Array<string>, metadata?: object }} input
 * @returns {object} a well-formed ValidatorResult
 */
export function createValidatorResult({ passed, score, evidence = [], timing = {}, diagnostics = [], metadata = {} }) {
  const issues = []
  if (typeof passed !== "boolean") issues.push("passed must be a boolean")
  if (typeof score !== "number" || Number.isNaN(score)) issues.push("score must be a number")
  else if (score < 0 || score > 100) issues.push("score must be between 0 and 100")
  if (!Array.isArray(evidence)) issues.push("evidence must be an array")
  if (!Array.isArray(diagnostics)) issues.push("diagnostics must be an array")
  if (!isPlainObject(timing)) issues.push("timing must be an object")
  if (!isPlainObject(metadata)) issues.push("metadata must be an object")

  if (issues.length) throw new InvalidValidatorResultError(issues)

  return { passed, score, evidence, timing, diagnostics, metadata }
}

export function isValidatorResult(value) {
  try {
    createValidatorResult(value || {})
    return true
  } catch {
    return false
  }
}
