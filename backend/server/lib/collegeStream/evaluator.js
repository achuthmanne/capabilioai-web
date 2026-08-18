/**
 * evaluator.js — College Stream rule-based evaluator
 * ---------------------------------------------------------------------------
 * PURE RULE-BASED. No Groq/AI calls anywhere in this file or anywhere else
 * in the College Stream branch — that's the whole point of this branch
 * (static, curriculum-aligned, deterministic, zero AI cost or latency).
 *
 * Supports two rubric types today (Phase 1): "exact_match" and
 * "numeric_tolerance". Both are pure JS, no code execution engine involved.
 * More rubric types (e.g. "test_cases" for real code execution) are a
 * natural future extension — same reasoning as the Domain Role branch's
 * "add via config/registry, not a rewrite" principle — but are out of scope
 * for proving the Phase 1 pipeline end-to-end.
 *
 * `evaluate(rubric, answer)` -> { score: 0-100, passed: boolean }
 * Throws EvaluatorError for a malformed/unknown rubric — callers must not
 * silently swallow this (no fake pass on a bad rubric).
 */

export class EvaluatorError extends Error {}

function normalizeText(value, { caseSensitive, trim }) {
  let v = String(value ?? "")
  if (trim) v = v.trim()
  if (!caseSensitive) v = v.toLowerCase()
  // Collapse internal whitespace runs so "O(log n)" and "O(log  n)" match —
  // deliberately generous for free-text Big-O / short-answer responses.
  return v.replace(/\s+/g, " ")
}

function evaluateExactMatch(rubric, answer) {
  const { answer: expected, case_sensitive = false, trim = true } = rubric
  if (typeof expected !== "string") {
    throw new EvaluatorError("exact_match rubric requires a string 'answer'")
  }
  const opts = { caseSensitive: case_sensitive, trim }
  const submitted = typeof answer === "string" ? answer : answer?.text ?? answer?.value ?? ""
  const isMatch = normalizeText(submitted, opts) === normalizeText(expected, opts)
  return { score: isMatch ? 100 : 0, passed: isMatch }
}

function evaluateNumericTolerance(rubric, answer) {
  const { answer: expected, tolerance = 0 } = rubric
  if (typeof expected !== "number" || Number.isNaN(expected)) {
    throw new EvaluatorError("numeric_tolerance rubric requires a numeric 'answer'")
  }
  const raw = typeof answer === "number" ? answer : answer?.value ?? answer?.text ?? answer
  const submitted = Number(raw)
  if (Number.isNaN(submitted)) {
    // Not a parse error on our side — the student's answer just isn't a
    // number. That's a legitimate 0/fail, not a thrown error.
    return { score: 0, passed: false }
  }
  const isWithinTolerance = Math.abs(submitted - expected) <= Math.abs(tolerance)
  return { score: isWithinTolerance ? 100 : 0, passed: isWithinTolerance }
}

const EVALUATORS = {
  exact_match: evaluateExactMatch,
  numeric_tolerance: evaluateNumericTolerance,
}

/**
 * @param {object} rubric - experiments.rubric jsonb, must have a "type" key
 * @param {*} answer - the raw submitted answer (string, number, or {text|value})
 * @returns {{ score: number, passed: boolean }}
 */
export function evaluate(rubric, answer) {
  if (!rubric || typeof rubric !== "object" || !rubric.type) {
    throw new EvaluatorError("rubric is missing or has no 'type'")
  }
  const fn = EVALUATORS[rubric.type]
  if (!fn) {
    throw new EvaluatorError(`Unknown rubric type: "${rubric.type}"`)
  }
  return fn(rubric, answer)
}

export const SUPPORTED_RUBRIC_TYPES = Object.keys(EVALUATORS)
