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
 * Second real case (Career Workspace refactor): python_runner. The
 * generic-enough-in-practice payload shape this file's own header used to
 * call unproven — "a raw string of candidate code" — turned out to need
 * no change at all; executeMission(mission, code) already takes a plain
 * string for both. python_runner reuses pythonSandbox.js's runPython()
 * directly (same subprocess sandbox the College Stream branch already
 * runs in production), returning the raw execution result — the actual
 * stdout-vs-rubric comparison is evaluateMission.js's job, same
 * execute-then-evaluate split SQL already uses. usePackages (numpy/
 * pandas/scikit-learn/Pillow venv) is opt-in per mission via
 * mission.rubric.usePackages — absent/false runs bare stdlib-only,
 * unaffected for any mission that doesn't set it.
 */
import { runAgainstDataset } from "./sqlSandbox.js"
import { runPython, scanForDangerousPatterns, checkPythonAvailable, checkPackagesAvailable, PythonSandboxError } from "../collegeStream/pythonSandbox.js"
import { runNode, scanForDangerousPatterns as scanNodeDangerousPatterns, checkNodeAvailable, NodeSandboxError } from "../collegeStream/nodeSandbox.js"

async function executeSqlMission(mission, sql) {
  return runAgainstDataset(mission.dataset, sql) // may throw SqlSandboxError — propagates unchanged
}

async function executePythonMission(mission, code) {
  if (!checkPythonAvailable()) {
    throw new PythonSandboxError("Python execution isn't available in this environment.")
  }
  const usePackages = !!mission.rubric?.usePackages
  if (usePackages && !checkPackagesAvailable()) {
    throw new PythonSandboxError("Package-backed Python execution (numpy/pandas/scikit-learn) isn't available in this environment.")
  }
  if (scanForDangerousPatterns(code)) {
    return { stdout: "", stderr: "", timedOut: false, exitCode: 1, blocked: "Submission uses a disallowed operation (file/network/system access). Solve it with plain computation and print()." }
  }
  return runPython(code, { timeoutMs: mission.rubric?.timeout_ms, usePackages })
}

// Third real case (Phase 6, Software Engineering roles): node_runner.
// Same execute-then-evaluate split, reusing nodeSandbox.js's runNode()
// directly (that file's own header explains why it's a deliberate mirror
// of pythonSandbox.js, not a divergent design).
async function executeNodeMission(mission, code) {
  if (!checkNodeAvailable()) {
    throw new NodeSandboxError("Node execution isn't available in this environment.")
  }
  if (scanNodeDangerousPatterns(code)) {
    return { stdout: "", stderr: "", timedOut: false, exitCode: 1, blocked: "Submission uses a disallowed operation (fs/network/process access). Solve it with plain computation and console.log()." }
  }
  return runNode(code, { timeoutMs: mission.rubric?.timeout_ms })
}

const EXECUTION_REGISTRY = {
  sql_runner: executeSqlMission,
  python_runner: executePythonMission,
  node_runner: executeNodeMission,
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
