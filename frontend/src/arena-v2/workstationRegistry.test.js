import { test } from "node:test"
import assert from "node:assert/strict"
import { FRONTEND_WORKSTATION_REGISTRY, isWorkstationReady } from "./workstationRegistry.js"

// Same 13 keys as backend/server/lib/arena-v2/workstation-router/registry.js's
// WORKSTATION_REGISTRY — kept as a literal list here (rather than importing
// the backend file, which would need a bundler alias to resolve across the
// frontend/backend boundary) so this test still catches drift if someone
// adds/renames a key on one side and forgets the other.
const BACKEND_COMPONENT_KEYS = [
  "CodeWorkstation", "SqlWorkstation", "NotebookWorkstation", "ReactFrontendWorkstation",
  "ApiWorkstation", "TerminalWorkstation", "ExcelWorkstation", "DashboardWorkstation",
  "ReportWorkstation", "SystemDesignWorkstation", "EmbeddedWorkstation",
  "CalculatorWorkstation", "FullStackWorkstation",
]

test("FRONTEND_WORKSTATION_REGISTRY has an entry for every backend componentKey", () => {
  const keys = Object.keys(FRONTEND_WORKSTATION_REGISTRY)
  assert.equal(keys.length, BACKEND_COMPONENT_KEYS.length)
  for (const key of BACKEND_COMPONENT_KEYS) {
    assert.ok(keys.includes(key), `frontend registry missing "${key}"`)
  }
})

test("every 'ready' entry declares an importPath", () => {
  for (const [key, entry] of Object.entries(FRONTEND_WORKSTATION_REGISTRY)) {
    if (entry.status === "ready") {
      assert.ok(typeof entry.importPath === "string" && entry.importPath.length > 0, `${key} is ready but has no importPath`)
    }
  }
})

test("isWorkstationReady reflects the registry status", () => {
  // Caught during the final consolidation pass: this test previously
  // asserted isWorkstationReady("CodeWorkstation") === false, which was
  // true back when CodeWorkstation was still unwired but had silently gone
  // stale (like the "exactly one workstation" test below) since this file
  // was never included in any npm test script until this same pass added
  // "test:arena-v2-frontend". All 13 componentKeys are "ready" now, so the
  // false-case is only meaningful against a key that is not in the
  // registry at all.
  assert.equal(isWorkstationReady("SqlWorkstation"), true)
  assert.equal(isWorkstationReady("CodeWorkstation"), true)
  assert.equal(isWorkstationReady("not_a_real_key"), false)
})

// This assertion has already gone stale once (originally asserted
// readyCount === 1, back when only SqlWorkstation was wired — a fact this
// file's own git history preserves, this comment does not need to). It
// was never actually caught by CI because this file was never included in
// any npm test script (see the newly-added "test:arena-v2-frontend"
// script in the repo root package.json, added in the same consolidation
// pass that fixed this line) — a real regression-hardening gap for a
// frontend-only pure-JS test, now closed. Update this number deliberately
// whenever a workstation is wired, rather than letting it silently drift
// again.
test("all thirteen workstations are integrated — sanity check on current milestone scope, updated through the Clinical Lab phase", () => {
  const readyCount = Object.values(FRONTEND_WORKSTATION_REGISTRY).filter((e) => e.status === "ready").length
  assert.equal(readyCount, BACKEND_COMPONENT_KEYS.length)
  assert.equal(readyCount, 13)
})
