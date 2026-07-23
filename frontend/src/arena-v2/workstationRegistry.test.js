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
  assert.equal(isWorkstationReady("SqlWorkstation"), true)
  assert.equal(isWorkstationReady("CodeWorkstation"), false)
  assert.equal(isWorkstationReady("not_a_real_key"), false)
})

test("exactly one workstation is integrated so far (SQL) — sanity check on current milestone scope", () => {
  const readyCount = Object.values(FRONTEND_WORKSTATION_REGISTRY).filter((e) => e.status === "ready").length
  assert.equal(readyCount, 1)
})
