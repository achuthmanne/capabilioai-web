import { test } from "node:test"
import assert from "node:assert/strict"
import { routeToWorkstation, UnknownWorkstationError } from "./router.js"
import { WORKSTATION_IDS } from "../challenge-library/validators.js"

test("routeToWorkstation resolves a known workstation to its registry descriptor", () => {
  const result = routeToWorkstation({ workstation: "sql", payload: { prompt: "write a query" } })
  assert.equal(result.workstation, "sql")
  assert.equal(result.componentKey, "SqlWorkstation")
  assert.ok(result.uiModules.includes("sql_editor"))
  assert.deepEqual(result.payload, { prompt: "write a query" })
})

test("routeToWorkstation throws UnknownWorkstationError for an unregistered workstation id", () => {
  assert.throws(() => routeToWorkstation({ workstation: "not_a_real_workstation", payload: {} }), UnknownWorkstationError)
})

test("routeToWorkstation resolves every workstation id in the enum without throwing", () => {
  for (const id of WORKSTATION_IDS) {
    const result = routeToWorkstation({ workstation: id, payload: { any: "thing" } })
    assert.equal(result.workstation, id)
  }
})

// ── The rule that matters most for this milestone ────────────────────────────
// Router output must depend ONLY on payload.workstation (+ passthrough
// payload.payload) — never on role, challengeType, difficulty, or industry.
// This test proves it empirically rather than trusting a code-review promise:
// same workstation, wildly different payload shapes elsewhere, identical
// routing descriptor (modulo the passed-through `payload` field itself).

test("routeToWorkstation output is identical across different roles for the same workstation (no role branching)", () => {
  const base = { workstation: "react_frontend", payload: { prompt: "build a card" } }

  const asFrontendDev = routeToWorkstation({ ...base, role: "Frontend Developer", challengeType: "domain", difficulty: "Hard" })
  const asFullStackDev = routeToWorkstation({ ...base, role: "Full Stack Developer", challengeType: "common", difficulty: "Easy" })
  const asUiUxEngineer = routeToWorkstation({ ...base, role: "UI/UX Engineer (Design Systems)", challengeType: "domain", difficulty: "Expert" })

  assert.deepEqual(asFrontendDev, asFullStackDev)
  assert.deepEqual(asFullStackDev, asUiUxEngineer)
})

test("routeToWorkstation output is identical across challengeType (common vs domain) for the same workstation", () => {
  const commonResult = routeToWorkstation({ workstation: "sql", challengeType: "common", role: null, payload: { q: "SELECT 1" } })
  const domainResult = routeToWorkstation({ workstation: "sql", challengeType: "domain", role: "Data Analyst", payload: { q: "SELECT 1" } })
  assert.deepEqual(commonResult, domainResult)
})

test("routeToWorkstation never reads role/challengeType/difficulty/industry even if present and malformed", () => {
  // If the router touched these fields at all, a getter that throws would blow up the call.
  const trapPayload = {
    workstation: "code",
    payload: { ok: true },
    get role() { throw new Error("router read `role` — it must not") },
    get challengeType() { throw new Error("router read `challengeType` — it must not") },
    get difficulty() { throw new Error("router read `difficulty` — it must not") },
    get industry() { throw new Error("router read `industry` — it must not") },
  }
  assert.doesNotThrow(() => routeToWorkstation(trapPayload))
})
