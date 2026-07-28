import { test } from "node:test"
import assert from "node:assert/strict"
import { resolveArenaV2PilotPage } from "./arenaV2RoleRouting.js"

// { domain: "<roleConfig.js role id>" } is roleConfig.js's own "explicit
// override" input shape — getRoleConfig looks this up by role `id` (NOT by
// arenaKey — the two differ for several roles, e.g. id "ml_engineer" has
// arenaKey "ml", id "hardware_engineer" has arenaKey "ece"), so every
// fixture below uses a real role id, then asserts on the arenaKey-derived
// routing outcome. Using this override path keeps these tests independent
// of roleConfig.js's fuzzier keyword/branch-matching heuristics, which are
// out of scope here.

test("routes each of the nine roles with a live Arena V2 pilot to its page id", () => {
  const cases = [
    ["ml_engineer", "arenaV2MLPilot"],       // arenaKey "ml"
    ["swe", "arenaV2SoftwarePilot"],         // arenaKey "swe"
    ["cyber", "arenaV2CyberPilot"],          // arenaKey "cyber"
    ["devops", "arenaV2DevOpsPilot"],        // arenaKey "devops"
    ["dba", "arenaV2DbaPilot"],              // arenaKey "dba"
    ["hardware_engineer", "arenaV2EcePilot"],       // arenaKey "ece"
    ["power_engineer", "arenaV2EeePilot"],          // arenaKey "eee"
    ["structural_engineer", "arenaV2CivilPilot"],   // arenaKey "civil"
    ["mechanical_design", "arenaV2MechanicalPilot"],// arenaKey "mechanical"
  ]
  for (const [roleId, pageId] of cases) {
    assert.equal(resolveArenaV2PilotPage({ domain: roleId }), pageId, `role "${roleId}" should route to "${pageId}"`)
  }
})

test("falls back to null (legacy Arena) for roles with no Arena V2 pilot yet", () => {
  // A representative sample of real roleConfig.js role ids whose arenaKey is
  // NOT an Arena V2 domain — these must keep going to the legacy Arena page.
  for (const roleId of ["frontend", "backend", "fullstack", "sre", "qa", "aws", "medical", "vlsi", "pharmacy"]) {
    assert.equal(resolveArenaV2PilotPage({ domain: roleId }), null, `role "${roleId}" should NOT have an Arena V2 pilot`)
  }
})

test("never throws on missing/empty userData — matches getRoleConfig's own documented 'never throws, falls back to SWE' contract", () => {
  // roleConfig.js's getRoleConfig explicitly returns its SWE default for
  // null/undefined/empty input rather than null — and SWE does have a live
  // Arena V2 pilot, so all three inputs correctly resolve to it, not to
  // null. This mirrors the legacy resolveArenaDomain()'s own "swe" fallback
  // for an unrecognized role, so an unrecognized/blank profile lands on the
  // same default role on both the legacy and the V2 path.
  assert.equal(resolveArenaV2PilotPage(null), "arenaV2SoftwarePilot")
  assert.equal(resolveArenaV2PilotPage(undefined), "arenaV2SoftwarePilot")
  assert.equal(resolveArenaV2PilotPage({}), "arenaV2SoftwarePilot")
})

test("Biotech-family roles (Bioprocess/Medical Biotech/Clinical Lab) are not routable yet — documented gap, not a bug", () => {
  // These three Arena V2 pilots exist and are fully built, but roleConfig.js
  // has no role at all whose arenaKey is "biotech"/"medicalbiotech"/
  // "clinicallab" (verified directly against roleConfig.js during this
  // consolidation pass) — an unrecognized override id here falls through
  // to the same SWE default as any other unrecognized input, exactly like
  // the "never throws" case above, not to a null/error state.
  assert.equal(resolveArenaV2PilotPage({ domain: "biotech" }), "arenaV2SoftwarePilot")
  assert.equal(resolveArenaV2PilotPage({ domain: "medicalbiotech" }), "arenaV2SoftwarePilot")
  assert.equal(resolveArenaV2PilotPage({ domain: "clinicallab" }), "arenaV2SoftwarePilot")
})
