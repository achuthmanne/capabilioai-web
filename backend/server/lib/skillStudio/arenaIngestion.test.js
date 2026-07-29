import { test } from "node:test"
import assert from "node:assert/strict"
import { notifySkillStudio, resolvePassed, defaultDeps } from "./arenaIngestion.js"

/**
 * Minimal chainable fake Supabase client. Only implements the exact method
 * chains arenaIngestion.js actually calls (from/upsert/select/eq/is/order/
 * limit/update/contains/maybeSingle) — not a general-purpose Supabase mock.
 */
function fakeSupabase({ ingestionUpsertData = { id: "ingest-1" }, handoffData = null, proofObjectData = null } = {}) {
  const calls = []
  const chain = (table) => {
    const self = {
      _table: table,
      upsert: (row, opts) => { calls.push(["upsert", table, row, opts]); return self },
      select: (...args) => { calls.push(["select", table, args]); return self },
      update: (patch) => { calls.push(["update", table, patch]); self._lastUpdate = patch; return self },
      eq: (...args) => { calls.push(["eq", table, args]); return self },
      is: (...args) => { calls.push(["is", table, args]); return self },
      order: (...args) => { calls.push(["order", table, args]); return self },
      limit: (...args) => { calls.push(["limit", table, args]); return self },
      contains: (...args) => { calls.push(["contains", table, args]); return self },
      maybeSingle: async () => {
        if (table === "arena_ingestion_records" && calls.some((c) => c[0] === "upsert")) {
          return { data: ingestionUpsertData, error: null }
        }
        if (table === "arena_handoffs") return { data: handoffData, error: null }
        if (table === "proof_objects") return { data: proofObjectData, error: null }
        return { data: null, error: null }
      },
      then: (resolve) => resolve({ data: null, error: null }), // for awaited chains with no .maybeSingle() call
    }
    return self
  }
  return { supabaseAdmin: { from: chain }, calls }
}

function makeEvent(overrides = {}) {
  return {
    assessment: { id: "assess-1", user_id: "user-1", final_score: 90, ...overrides.assessment },
    instance: { id: "inst-1", skill: "React Hooks", role: "frontend", challenge_type: "domain", ...overrides.instance },
    submission: { id: "sub-1", validator_result: { passed: true, diagnostics: [] }, ...overrides.submission },
    rewardResult: { eloEntry: null, xpEntry: null, skillProgress: {}, alreadyApplied: false },
    ...overrides,
  }
}

function baseDeps(overrides = {}) {
  const calls = []
  const { supabaseAdmin, calls: sbCalls } = fakeSupabase(overrides.sb || {})
  return {
    deps: {
      supabaseAdmin,
      getNodeBySlug: overrides.getNodeBySlug || (async () => ({ id: "node-1", slug: "react-hooks", label: "React Hooks" })),
      ensureSkillNode: overrides.ensureSkillNode || (async ({ slug, label }) => { calls.push(["ensureSkillNode", slug, label]); return { id: "node-1", slug, label } }),
      reinforce: overrides.reinforce || (async (args) => { calls.push(["reinforce", args]); return { confidence: 0.7 } }),
      recordMistake: overrides.recordMistake || (async (args) => { calls.push(["recordMistake", args]); return {} }),
      buildRecommendations: overrides.buildRecommendations || (async (userId) => { calls.push(["buildRecommendations", userId]); return [] }),
    },
    calls,
    sbCalls,
  }
}

test("resolvePassed reads submission.validator_result.passed as the canonical signal", () => {
  assert.equal(resolvePassed({ final_score: 10 }, { validator_result: { passed: true } }), true)
  assert.equal(resolvePassed({ final_score: 95 }, { validator_result: { passed: false } }), false)
})

test("resolvePassed falls back to a 70-score threshold only when validator_result is absent", () => {
  assert.equal(resolvePassed({ final_score: 71 }, {}), true)
  assert.equal(resolvePassed({ final_score: 69 }, {}), false)
})

test("happy path: reinforces memory with source='arena' and correct=true on a pass, never records a mistake", async () => {
  const { deps, calls } = baseDeps()
  const result = await notifySkillStudio(makeEvent(), deps)
  assert.equal(result.ok, true)
  assert.equal(result.passed, true)
  const reinforceCall = calls.find((c) => c[0] === "reinforce")
  assert.equal(reinforceCall[1].source, "arena")
  assert.equal(reinforceCall[1].correct, true)
  assert.equal(calls.some((c) => c[0] === "recordMistake"), false)
})

test("failing attempt records a mistake pattern and reinforces with correct=false", async () => {
  const { deps, calls } = baseDeps()
  const event = makeEvent({ submission: { id: "sub-1", validator_result: { passed: false, diagnostics: ["off-by-one in loop bound"] } } })
  const result = await notifySkillStudio(event, deps)
  assert.equal(result.passed, false)
  const mistakeCall = calls.find((c) => c[0] === "recordMistake")
  assert.ok(mistakeCall, "expected recordMistake to be called")
  assert.equal(mistakeCall[1].patternKey, "off-by-one in loop bound")
  const reinforceCall = calls.find((c) => c[0] === "reinforce")
  assert.equal(reinforceCall[1].correct, false)
})

test("triggers a recommendation refresh for the assessed user after reinforcement", async () => {
  const { deps, calls } = baseDeps()
  await notifySkillStudio(makeEvent(), deps)
  const recCall = calls.find((c) => c[0] === "buildRecommendations")
  assert.ok(recCall)
  assert.equal(recCall[1], "user-1")
})

test("a recommendation-refresh failure does not undo the already-committed reinforcement or fail the whole call", async () => {
  const { deps, calls } = baseDeps({ buildRecommendations: async () => { throw new Error("boom") } })
  const result = await notifySkillStudio(makeEvent(), deps)
  assert.equal(result.ok, true, "reinforcement already committed — this must still report success")
  assert.ok(calls.some((c) => c[0] === "reinforce"))
})

test("idempotent: a second call for the SAME assessment_id is a no-op (upsert returns no row)", async () => {
  const { deps, calls } = baseDeps({ sb: { ingestionUpsertData: null } })
  const result = await notifySkillStudio(makeEvent(), deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "already_ingested")
  assert.equal(calls.some((c) => c[0] === "reinforce"), false, "must not re-apply reinforcement on a duplicate/replayed event")
})

test("skips cleanly (no error) when the Arena instance has no skill tag (e.g. a common challenge)", async () => {
  const { deps, calls } = baseDeps()
  const event = makeEvent({ instance: { id: "inst-2", skill: null, challenge_type: "common" } })
  const result = await notifySkillStudio(event, deps)
  assert.equal(result.ok, true)
  assert.equal(result.skipped, "no_skill_on_instance")
  assert.equal(calls.some((c) => c[0] === "reinforce"), false)
})

test("never throws on a malformed event — returns ok:false instead", async () => {
  const { deps } = baseDeps()
  const result = await notifySkillStudio({ assessment: null }, deps)
  assert.equal(result.ok, false)
  assert.ok(result.error)
})

test("never throws even if a required dep itself throws mid-flow", async () => {
  const { deps } = baseDeps({ reinforce: async () => { throw new Error("db exploded") } })
  const result = await notifySkillStudio(makeEvent(), deps)
  assert.equal(result.ok, false)
  assert.match(result.error, /db exploded/)
})

test("default export wiring points at the real supabaseAdmin/graph/memory/mistake/recommendation modules", () => {
  assert.equal(typeof defaultDeps.supabaseAdmin, "object")
  assert.equal(typeof defaultDeps.ensureSkillNode, "function")
  assert.equal(typeof defaultDeps.getNodeBySlug, "function")
  assert.equal(typeof defaultDeps.reinforce, "function")
  assert.equal(typeof defaultDeps.recordMistake, "function")
  assert.equal(typeof defaultDeps.buildRecommendations, "function")
})
