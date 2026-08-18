/**
 * executeMission.js — Phase 2.5 (Domain Workspace Foundation).
 *
 * Single dispatch point for "run this submitted content against the
 * sandbox for this mission's panel_type." Collapses the
 * `panel_type !== "sql_runner"` check that POST /missions/:id/validate
 * and POST /missions/:id/submit each independently performed before this
 * — a real de-duplication of two existing call sites, not a speculative
 * abstraction for panel types that don't exist yet.
 *
 * Only sql_runner actually executes; runAgainstDataset's behavior is
 * reused byte-for-byte, so this changes nothing about sandbox execution
 * itself. Any other panel_type throws a typed "not implemented" error
 * that both routes turn into the same 400 response they already returned.
 *
 * Deliberately NOT generalized: the payload shape here is a raw SQL
 * string, which only makes sense for sql_runner. A future panel type
 * (a Python notebook needs cell code, a terminal needs a command...) will
 * need a different payload shape — generalizing that happens when a
 * second real panel type needs a "run" step, per this project's standing
 * "abstract after the second/third implementation" rule, not speculatively
 * now. Evaluation/scoring logic (compareResults, ELO, checklist, AI
 * feedback in routes/arenaDomainRole.js) is entirely untouched by this
 * file — it only wraps the "execute the candidate SQL" step.
 */
import { runAgainstDataset } from "./sqlSandbox.js"

export async function executeMission(mission, sql) {
  if (mission.panel_type !== "sql_runner") {
    const err = new Error(`Panel type "${mission.panel_type}" is not yet supported.`)
    err.notImplemented = true
    throw err
  }
  return runAgainstDataset(mission.dataset, sql) // may throw SqlSandboxError — propagates unchanged
}
