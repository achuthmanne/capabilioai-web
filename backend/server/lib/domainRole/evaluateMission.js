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
 * Scope boundary: this only covers the case where the candidate
 * successfully ran (executeMission succeeded). A SqlSandboxError/blocked
 * Python submission — execution itself failing — is a distinct failure
 * surface, handled separately in routes/arenaDomainRole.js exactly as
 * before; it is not a grading outcome and does not go through this file.
 *
 * Second real entry (Career Workspace refactor): python_runner. Same
 * "stdout must exactly match, trimmed" comparison
 * pythonSandbox.js's evaluatePythonStdout already uses for College
 * Stream — reused here as plain string comparison since `actual` (the
 * already-executed result from executeMission.js's executePythonMission)
 * carries the real stdout, never a claimed one.
 *
 * Third real entry (Phase 6, Software Engineering roles): node_runner.
 * evaluateStdoutMatch's body was already 100% language-agnostic (it never
 * referenced Python specifically) — this is the second real case that
 * justifies generalizing its name instead of pasting a near-identical
 * evaluateNodeStdoutMatch copy (same "abstract after the second/third
 * implementation" rule this whole file's header already invokes).
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

function normalizeStdout(s) { return String(s ?? "").trim().replace(/\r\n/g, "\n") }

function evaluateStdoutMatch(actual, mission) {
  if (actual.blocked) {
    return { passed: false, score: 0, reason: actual.blocked, checklist: null, insight: null }
  }
  if (actual.timedOut) {
    return { passed: false, score: 0, reason: "Execution timed out or exceeded resource limits.", checklist: null, insight: null }
  }
  if (actual.exitCode !== 0) {
    return { passed: false, score: 0, reason: actual.stderr?.trim() || `Process exited with code ${actual.exitCode}.`, checklist: null, insight: null }
  }
  const expected = mission.rubric?.expected_stdout
  const isMatch = normalizeStdout(actual.stdout) === normalizeStdout(expected)
  return {
    passed: isMatch,
    score: isMatch ? 100 : 0,
    reason: isMatch ? null : "Output didn't match the expected result.",
    checklist: null,
    // insight is a `text` column (domain_submissions.insight) — plain
    // string, same type computeInsight() already returns for SQL.
    insight: actual.stdout?.trim() ? `Printed: ${actual.stdout.trim()}` : "No output printed.",
  }
}

// Fourth real entry (Vision Reset, 2026-08-20): frontend_runner. `actual`
// is executeFrontendMission's raw checkCssRules() result — a parse status
// plus one pass/fail per rubric.checks entry, never a claimed verdict.
// checklist reuses the exact ChecklistPanel shape evaluateSqlExactMatch's
// buildChecklist() already produces ({label, passed}[]) so the frontend
// can render it with the SAME component, not a new one.
function evaluateCssRuleMatch(actual, mission) {
  if (!actual.parsed) {
    return { passed: false, score: 0, reason: `CSS failed to parse: ${actual.parseError}`, checklist: null, insight: null }
  }
  const total = actual.results.length
  const passedCount = actual.results.filter(r => r.passed).length
  const passed = total > 0 && passedCount === total
  const checklist = actual.results.map((r, i) => ({ key: `check_${i}`, label: r.description, passed: r.passed }))
  const failedDescriptions = actual.results.filter(r => !r.passed).map(r => r.description)
  return {
    passed,
    score: total > 0 ? Math.round((passedCount / total) * 100) : 0,
    reason: passed ? null : `Not yet meeting: ${failedDescriptions.join("; ")}`,
    checklist,
    insight: passed ? "All required styles are in place." : `${passedCount}/${total} requirements met.`,
  }
}

const EVALUATION_REGISTRY = {
  sql_runner: evaluateSqlExactMatch,
  python_runner: evaluateStdoutMatch,
  node_runner: evaluateStdoutMatch,
  frontend_runner: evaluateCssRuleMatch,
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
