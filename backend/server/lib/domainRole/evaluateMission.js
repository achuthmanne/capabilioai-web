/**
 * evaluateMission.js — Phase 2.6 (Arena Architecture Upgrade), Task 4:
 * Evaluation Registry.
 *
 * Single dispatch point for "grade this successfully-executed attempt."
 * EVALUATION_REGISTRY has exactly one real entry — evaluateSqlExactMatch,
 * wrapping compareResults/buildChecklist/computeInsight from
 * sqlSandbox.js UNCHANGED (same functions, same behavior, same "Groq
 * never decides pass/fail" discipline documented in that file's own
 * header). No other evaluator (similarity, rubric, static analysis,
 * execution trace, unit tests, ...) is declared before a real panel type
 * needs one — a named-but-unimplemented slot isn't "prepared
 * architecture," it's dead code with a false promise (same reasoning as
 * PANEL_REGISTRY and EXECUTION_REGISTRY).
 *
 * Scope boundary: this only covers the case where the candidate SQL
 * actually ran (executeMission succeeded). A SqlSandboxError — the query
 * itself failing to execute — is a distinct failure surface, handled
 * separately in routes/arenaDomainRole.js exactly as before; it is not a
 * grading outcome and does not go through this file.
 *
 * ELO math is NOT here. ELO is a business-rule reward keyed off .passed +
 * mission.difficulty, not part of "how do we grade this attempt" — it
 * stays in routes/arenaDomainRole.js, reading only this file's .passed
 * output, per every phase's "do not touch ELO logic" instruction.
 */
import { compareResults, buildChecklist, computeInsight } from "./sqlSandbox.js"

function evaluateSqlExactMatch(actual, mission) {
  const comparison = compareResults(actual, mission.expected_result, mission.match_mode)
  const checklist = buildChecklist(actual, mission.expected_result, comparison.passed)
  const insight = computeInsight(actual)
  return { ...comparison, checklist, insight }
}

const EVALUATION_REGISTRY = {
  sql_runner: evaluateSqlExactMatch,
}

// Returns {passed, score, reason, checklist, insight}. Caller (the submit
// route) is only ever reached here for a panel_type executeMission already
// confirmed is registered, so a lookup miss here would indicate the two
// registries have drifted out of sync — a real bug, not a normal
// "not implemented" path, hence throwing rather than returning a
// notImplemented flag the way executeMission does.
export function evaluateMission(panelType, actual, mission) {
  const evaluator = EVALUATION_REGISTRY[panelType]
  if (!evaluator) throw new Error(`No evaluator registered for panel type "${panelType}".`)
  return evaluator(actual, mission)
}
