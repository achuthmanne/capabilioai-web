/**
 * service.test.js — Milestone 6
 * Fully dependency-injected: no Supabase, no network. Fakes the underlying
 * Engine/Validator/Router calls entirely so this file tests only the
 * resume-vs-issue integration logic this milestone actually adds.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { getOrIssueChallenge } from "./service.js"

const freshInstance = {
  id: "inst-fresh", status: "issued", workstation: "sql", payload: { q: "..." },
  started_at: new Date().toISOString(), submission_rules: {},
}
const existingActiveInstance = {
  id: "inst-existing", status: "in_progress", workstation: "sql", payload: { q: "old" },
  started_at: new Date().toISOString(), submission_rules: {}, // untimed, never expires
}
const expiredInstance = {
  id: "inst-expired", status: "issued", workstation: "sql", payload: { q: "stale" },
  expires_at: "2020-01-01T00:00:00Z", submission_rules: {},
}

function makeDeps(overrides = {}) {
  const calls = { getActiveInstanceForUser: 0, markInstanceExpired: [], selectAndGenerateChallenge: 0, validateAndIssue: 0, routeToWorkstation: [] }
  const deps = {
    getActiveInstanceForUser: async () => { calls.getActiveInstanceForUser++; return null },
    markInstanceExpired: async (id) => { calls.markInstanceExpired.push(id) },
    selectAndGenerateChallenge: async () => { calls.selectAndGenerateChallenge++; return { payload: { workstation: "sql", payload: { q: "new" } } } },
    engineDeps: {},
    validateAndIssue: async () => { calls.validateAndIssue++; return freshInstance },
    validatorDeps: {},
    routeToWorkstation: (instance) => { calls.routeToWorkstation.push(instance.id); return { workstation: instance.workstation, componentKey: "SqlWorkstation", uiModules: [], artifactType: "code", payload: instance.payload } },
    ...overrides,
  }
  return { deps, calls }
}

test("getOrIssueChallenge issues a fresh instance when none exists", async () => {
  const { deps, calls } = makeDeps()
  const result = await getOrIssueChallenge({ userId: "u1", challengeType: "domain", role: "Data Analyst" }, deps)

  assert.equal(result.resumed, false)
  assert.equal(result.instance.id, "inst-fresh")
  assert.equal(calls.selectAndGenerateChallenge, 1)
  assert.equal(calls.validateAndIssue, 1)
  assert.equal(calls.markInstanceExpired.length, 0)
})

test("getOrIssueChallenge resumes an existing non-expired instance without touching Engine/Validator", async () => {
  const { deps, calls } = makeDeps({ getActiveInstanceForUser: async () => existingActiveInstance })
  const result = await getOrIssueChallenge({ userId: "u1", challengeType: "domain", role: "Data Analyst" }, deps)

  assert.equal(result.resumed, true)
  assert.equal(result.instance.id, "inst-existing")
  assert.equal(calls.selectAndGenerateChallenge, 0)
  assert.equal(calls.validateAndIssue, 0)
  assert.equal(calls.markInstanceExpired.length, 0)
})

test("getOrIssueChallenge expires a stale instance and issues a fresh one instead", async () => {
  const { deps, calls } = makeDeps({ getActiveInstanceForUser: async () => expiredInstance })
  const result = await getOrIssueChallenge({ userId: "u1", challengeType: "domain", role: "Data Analyst" }, deps)

  assert.equal(result.resumed, false)
  assert.equal(result.instance.id, "inst-fresh")
  assert.deepEqual(calls.markInstanceExpired, ["inst-expired"])
  assert.equal(calls.selectAndGenerateChallenge, 1)
})

test("getOrIssueChallenge propagates EntitlementError/etc. from the Engine untouched", async () => {
  class FakeEntitlementError extends Error {}
  const { deps } = makeDeps({
    selectAndGenerateChallenge: async () => { throw new FakeEntitlementError("no grant") },
  })
  await assert.rejects(() => getOrIssueChallenge({ userId: "u1", challengeType: "domain", role: "Data Analyst" }, deps), FakeEntitlementError)
})

test("getOrIssueChallenge requires userId and a valid challengeType", async () => {
  const { deps } = makeDeps()
  await assert.rejects(() => getOrIssueChallenge({ challengeType: "domain" }, deps))
  await assert.rejects(() => getOrIssueChallenge({ userId: "u1", challengeType: "not_real" }, deps))
})

test("getOrIssueChallenge routes the resumed instance the same way it routes a fresh one", async () => {
  const { deps, calls } = makeDeps({ getActiveInstanceForUser: async () => existingActiveInstance })
  await getOrIssueChallenge({ userId: "u1", challengeType: "domain", role: "Data Analyst" }, deps)
  assert.deepEqual(calls.routeToWorkstation, ["inst-existing"])
})
