import { test } from "node:test"
import assert from "node:assert/strict"
import { computeCriticalGaps, resolveJobTitle, seedJourneysFromRoleGaps, seedIfFirstVisit, syncMissingJourneys } from "./roleGapSeeder.js"

const AURA_SKILLS = ["Scikit-learn", "Model Evaluation (AUC/F1/RMSE)", "PyTorch / TensorFlow", "Data Preprocessing"]

function fakeEloToRadar(v) {
  return Math.max(0, Math.min(100, Math.round(((Number(v) - 400) / 1200) * 100)))
}

function baseDeps(overrides = {}) {
  const calls = []
  return {
    supabaseAdmin: overrides.supabaseAdmin || {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ then: (resolve) => resolve({ data: overrides.skillGraphRows ?? [], error: null }) }),
            maybeSingle: async () => ({ data: overrides.profile ?? null, error: null }),
          }),
        }),
      }),
    },
    getRoleConfig: overrides.getRoleConfig || (() => ({ id: "ml_engineer", label: "ML / AI Engineer", arenaKey: "ml", auraSkills: AURA_SKILLS })),
    eloValueToRadarScore: overrides.eloValueToRadarScore || fakeEloToRadar,
    createOrGetJourney: overrides.createOrGetJourney || (async ({ userId, skillName, domainKey, targetRole }) => {
      calls.push(["createOrGetJourney", userId, skillName, domainKey, targetRole])
      return { journey: { id: `journey-${skillName}` }, node: { id: `node-${skillName}` }, created: true }
    }),
    hasAnyJourneyEver: overrides.hasAnyJourneyEver || (async () => false),
    listJourneysForUser: overrides.listJourneysForUser || (async () => overrides.existingJourneys ?? []),
    _calls: calls,
  }
}

test("resolveJobTitle prefers target_role, then keyword, then current experience, then a generic default", () => {
  assert.equal(resolveJobTitle({ target_role: "ML / AI Engineer" }), "ML / AI Engineer")
  assert.equal(resolveJobTitle({ keyword: "backend developer" }), "backend developer")
  assert.equal(resolveJobTitle({ experiences: [{ title: "SDE-2", isCurrent: true }] }), "SDE-2")
  assert.equal(resolveJobTitle({}), "Professional")
})

test("computeCriticalGaps treats a skill with no skill_graph row as a 0-score gap", () => {
  const gaps = computeCriticalGaps(AURA_SKILLS, [], { eloValueToRadarScore: fakeEloToRadar })
  assert.equal(gaps.length, 4)
  assert.ok(gaps.every((g) => g.isCritical))
  assert.equal(gaps[0].score, 0)
})

test("computeCriticalGaps marks a skill non-critical once its skill_graph score clears the threshold, but still returns it", () => {
  const gaps = computeCriticalGaps(AURA_SKILLS, [{ skill_name: "Scikit-learn", elo_value: 1200 }], { eloValueToRadarScore: fakeEloToRadar })
  // 2026-07-30: no longer filtered out — every role skill is returned so it
  // can still get seeded a journey; isCritical is now purely informational.
  assert.equal(gaps.length, 4)
  const scikit = gaps.find((g) => g.label === "Scikit-learn")
  assert.equal(scikit.isCritical, false, "a strong (elo 1200 -> 66%) skill must not be flagged critical")
})

test("computeCriticalGaps matches skill_name case-insensitively and trims whitespace", () => {
  const gaps = computeCriticalGaps(AURA_SKILLS, [{ skill_name: "  scikit-LEARN  ", elo_value: 1200 }], { eloValueToRadarScore: fakeEloToRadar })
  const scikit = gaps.find((g) => g.label === "Scikit-learn")
  assert.equal(scikit.isCritical, false)
})

test("computeCriticalGaps returns ALL skills, not capped, sorted lowest-score first", () => {
  const manySkills = ["A", "B", "C", "D", "E", "F"]
  const rows = [{ skill_name: "A", elo_value: 1600 }, { skill_name: "B", elo_value: 400 }]
  const gaps = computeCriticalGaps(manySkills, rows, { eloValueToRadarScore: fakeEloToRadar })
  // 2026-07-30: the old MAX_SEEDED_JOURNEYS=4 cap is gone — an 11-skill role
  // (the bug report this fixes) must get all 11 back, not just 4.
  assert.equal(gaps.length, 6)
  assert.equal(gaps[gaps.length - 1].label, "A") // highest score (100%) sorts last
})

test("seedJourneysFromRoleGaps creates a journey per role skill (no cap), tagged with the resolved role's domainKey/targetRole", async () => {
  const deps = baseDeps({ profile: { target_role: "ML / AI Engineer" }, skillGraphRows: [] })
  const result = await seedJourneysFromRoleGaps("user-1", deps)
  assert.equal(result.seeded.length, 4) // all of AURA_SKILLS, not sliced to 4-of-N
  assert.equal(result.jobTitle, "ML / AI Engineer")
  const call = deps._calls.find((c) => c[2] === "Scikit-learn")
  assert.equal(call[3], "ml") // domainKey
  assert.equal(call[4], "ML / AI Engineer") // targetRole
})

test("seedJourneysFromRoleGaps returns an empty result (no throw) when the role has no auraSkills configured", async () => {
  const deps = baseDeps({ getRoleConfig: () => ({ id: "unknown", label: "Something", auraSkills: [] }) })
  const result = await seedJourneysFromRoleGaps("user-1", deps)
  assert.deepEqual(result.seeded, [])
  assert.equal(result.reason, "role_has_no_aura_skills")
})

test("seedJourneysFromRoleGaps never throws even if a dependency throws mid-flow", async () => {
  const deps = baseDeps({ createOrGetJourney: async () => { throw new Error("db exploded") } })
  const result = await seedJourneysFromRoleGaps("user-1", deps)
  assert.deepEqual(result.seeded, [])
  assert.match(result.error, /db exploded/)
})

test("seedIfFirstVisit no-ops for a user who already has any journey (even archived/completed)", async () => {
  const deps = baseDeps({ hasAnyJourneyEver: async () => true })
  const ran = await seedIfFirstVisit("user-1", deps)
  assert.equal(ran, false)
  assert.equal(deps._calls.length, 0, "must not call createOrGetJourney for a returning user")
})

test("seedIfFirstVisit seeds and returns true for a genuinely first-ever visit", async () => {
  const deps = baseDeps({ hasAnyJourneyEver: async () => false, profile: { target_role: "ML / AI Engineer" } })
  const ran = await seedIfFirstVisit("user-1", deps)
  assert.equal(ran, true)
  assert.ok(deps._calls.some((c) => c[0] === "createOrGetJourney"))
})

test("syncMissingJourneys creates journeys only for skills without an existing active journey", async () => {
  const deps = baseDeps({
    profile: { target_role: "ML / AI Engineer" },
    skillGraphRows: [],
    existingJourneys: [{ skill_graph_nodes: { label: "Scikit-learn" } }, { skill_graph_nodes: { label: "Data Preprocessing" } }],
  })
  const result = await syncMissingJourneys("user-1", deps)
  assert.equal(result.seeded.length, 2) // only the 2 of 4 skills without a journey yet
  assert.ok(result.seeded.every((s) => s.skillName !== "Scikit-learn" && s.skillName !== "Data Preprocessing"))
})

test("syncMissingJourneys no-ops (does not call createOrGetJourney) once every skill already has a journey", async () => {
  const deps = baseDeps({
    profile: { target_role: "ML / AI Engineer" },
    skillGraphRows: [],
    existingJourneys: AURA_SKILLS.map((label) => ({ skill_graph_nodes: { label } })),
  })
  const result = await syncMissingJourneys("user-1", deps)
  assert.deepEqual(result.seeded, [])
  assert.equal(result.reason, "already_synced")
  assert.equal(deps._calls.length, 0)
})

test("syncMissingJourneys never throws even if a dependency throws mid-flow", async () => {
  const deps = baseDeps({ listJourneysForUser: async () => { throw new Error("db exploded") } })
  const result = await syncMissingJourneys("user-1", deps)
  assert.deepEqual(result.seeded, [])
  assert.match(result.error, /db exploded/)
})
