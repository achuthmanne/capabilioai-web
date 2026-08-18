/**
 * executeMission.js — Phase 2.5 (Domain Workspace Foundation), converted
 * to a registry in Phase 2.6 (Task 3: Execution Registry).
 *
 * Single dispatch point for "run this submitted content against the
 * sandbox for this mission's panel_type." Collapses the
 * `panel_type !== "sql_runner"` check that POST /missions/:id/validate
 * and POST /missions/:id/submit each independently performed before this
 * — a real de-duplication of two existing call sites, not a speculative
 * abstraction for panel types that don't exist yet.
 *
 * EXECUTION_REGISTRY has exactly one real entry. Per this project's
 * standing "abstract after the second/third implementation" rule (and
 * Phase 2.6's explicit "do not build the other workspaces yet"), no other
 * panel type gets a key here — a future python_notebook/cyber_console/
 * etc. executor is added the same way PANEL_REGISTRY (registry.js) grows:
 * one new function, one new line below, once that workspace is real.
 *
 * executeSqlMission reuses runAgainstDataset byte-for-byte — this changes
 * nothing about sandbox execution itself. Any unregistered panel_type
 * throws a typed "not implemented" error that both routes turn into the
 * same 400 response they already returned.
 *
 * Deliberately NOT generalized beyond a raw SQL string argument — a
 * future panel type (a Python notebook needs cell code, a terminal needs
 * a command...) will need a different payload shape, but generalizing
 * that now, with zero second real case to generalize from, would be
 * guessing at a shape rather than abstracting a proven one. Evaluation/
 * scoring logic (evaluateMission.js, ELO, AI feedback in
 * routes/arenaDomainRole.js) is entirely untouched by this file — it only
 * wraps the "execute the candidate SQL" step.
 */
import { runAgainstDataset } from "./sqlSandbox.js"

async function executeSqlMission(mission, sql) {
  return runAgainstDataset(mission.dataset, sql) // may throw SqlSandboxError — propagates unchanged
}

const EXECUTION_REGISTRY = {
  sql_runner: executeSqlMission,
}

export async function executeMission(mission, sql) {
  const executor = EXECUTION_REGISTRY[mission.panel_type]
  if (!executor) {
    const err = new Error(`Panel type "${mission.panel_type}" is not yet supported.`)
    err.notImplemented = true
    throw err
  }
  return executor(mission, sql)
}
