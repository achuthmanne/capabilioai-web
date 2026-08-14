import { test } from "node:test"
import assert from "node:assert/strict"
import { applyRewards, RewardRulesViolationError } from "./engine.js"

function domainInstance(overrides = {}) {
  return {
    id: "inst-1", challenge_type: "domain", role: "backend-engineer", skill: "sql",
    difficulty: "Medium", career_family: "IT",
    reward_rules: { common: { elo: false }, domain: { elo: true } },
    ...overrides,
  }
}
function commonInstance(overrides = {}) {
  return {
    id: "inst-2", challenge_type: "common", role: null, skill: "sql",
    difficulty: "Easy", career_family: "IT",
    reward_rules: { common: { elo: false }, domain: { elo: true } },
    ...overrides,
  }
}
function assessment(overrides = {}) {
  return { id: "assess-1", user_id: "user-1", final_score: 90, is_zero_effort: false, ...overrides }
}

function fakeDeps(overrides = {}) {
  const calls = []
  const eloEntries = {}
  const xpEntries = {}
  let skillProgressRow = overrides.initialSkillProgress ?? null
  const deps = {
    getLatestEloForRole: async () => { calls.push("getLatestEloForRole"); return overrides.currentElo ?? null },
    getEloEntryForAssessment: async (id) => { calls.push("getEloEntryForAssessment"); return eloEntries[id] || null },
    getXpEntryForAssessment: async (id) => { calls.push("getXpEntryForAssessment"); return xpEntries[id] || null },
    insertEloLedgerEntry: async (row) => {
      calls.push("insertEloLedgerEntry")
      const entry = { id: "elo-1", ...row }
      eloEntries[row.assessmentId] = entry
      return entry
    },
    insertXpLedgerEntry: async (row) => {
      calls.push("insertXpLedgerEntry")
      const entry = { id: "xp-1", ...row }
      xpEntries[row.assessmentId] = entry
      return entry
    },
    getSkillProgress: async () => { calls.push("getSkillProgress"); return skillProgressRow },
    upsertSkillProgress: async (row) => { calls.push("upsertSkillProgress"); skillProgressRow = { ...row, attempts_count: row.attemptsCount, best_score: row.bestScore, mastery_state: row.masteryState }; return skillProgressRow },
  }
  return { deps, calls }
}

test("domain challenge: posts an ELO ledger entry and updates skill progress, no XP entry", async () => {
  const { deps, calls } = fakeDeps({ currentElo: 800 })
  const result = await applyRewards({ assessment: assessment(), instance: domainInstance() }, deps)
  assert.ok(result.eloEntry)
  assert.equal(result.xpEntry, null)
  assert.equal(result.eloEntry.eloBefore, 800)
  assert.ok(result.eloEntry.eloAfter > 800)
  assert.ok(result.skillProgress)
  assert.equal(calls.includes("insertXpLedgerEntry"), false)
})

test("domain challenge with no prior ELO history starts from START_ELO (800)", async () => {
  const { deps } = fakeDeps({ currentElo: null })
  const result = await applyRewards({ assessment: assessment(), instance: domainInstance() }, deps)
  assert.equal(result.eloEntry.eloBefore, 800)
})

test("common challenge: posts an XP ledger entry and updates skill progress, no ELO entry", async () => {
  const { deps, calls } = fakeDeps()
  const result = await applyRewards({ assessment: assessment({ final_score: 100 }), instance: commonInstance() }, deps)
  assert.ok(result.xpEntry)
  assert.equal(result.eloEntry, null)
  assert.equal(result.xpEntry.xpGained, 10) // Easy base XP, full score
  assert.equal(calls.includes("insertEloLedgerEntry"), false)
})

test("common challenge with a zero-effort (timed-out) submission does not count toward the streak", async () => {
  const { deps } = fakeDeps()
  const result = await applyRewards({ assessment: assessment({ is_zero_effort: true, final_score: 30 }), instance: commonInstance() }, deps)
  assert.equal(result.xpEntry.streakCounted, false)
})

test("refuses to post rewards when a common instance's rewardRules contradict the frozen ELO/XP split", async () => {
  const { deps } = fakeDeps()
  const badInstance = commonInstance({ reward_rules: { common: { elo: true }, domain: { elo: true } } })
  await assert.rejects(() => applyRewards({ assessment: assessment(), instance: badInstance }, deps), RewardRulesViolationError)
})

test("refuses to post rewards when a domain instance's rewardRules contradict the frozen ELO/XP split", async () => {
  const { deps } = fakeDeps()
  const badInstance = domainInstance({ reward_rules: { common: { elo: false }, domain: { elo: false } } })
  await assert.rejects(() => applyRewards({ assessment: assessment(), instance: badInstance }, deps), RewardRulesViolationError)
})

test("IDEMPOTENCY: re-applying rewards for the same assessment does not double-post ELO or double-count skill progress", async () => {
  const { deps, calls } = fakeDeps({ currentElo: 800 })
  const first = await applyRewards({ assessment: assessment(), instance: domainInstance() }, deps)
  assert.equal(first.alreadyApplied, false)
  const insertCallsAfterFirst = calls.filter((c) => c === "insertEloLedgerEntry").length
  assert.equal(insertCallsAfterFirst, 1)

  const second = await applyRewards({ assessment: assessment(), instance: domainInstance() }, deps)
  assert.equal(second.alreadyApplied, true)
  const insertCallsAfterSecond = calls.filter((c) => c === "insertEloLedgerEntry").length
  assert.equal(insertCallsAfterSecond, 1) // unchanged — no second insert
  assert.equal(calls.includes("upsertSkillProgress") && calls.filter((c) => c === "upsertSkillProgress").length, 1) // only from the first call
})

test("IDEMPOTENCY holds for the common/XP path too", async () => {
  const { deps, calls } = fakeDeps()
  await applyRewards({ assessment: assessment(), instance: commonInstance() }, deps)
  await applyRewards({ assessment: assessment(), instance: commonInstance() }, deps)
  assert.equal(calls.filter((c) => c === "insertXpLedgerEntry").length, 1)
})

test("throws if assessment or instance is missing", async () => {
  const { deps } = fakeDeps()
  await assert.rejects(() => applyRewards({ instance: domainInstance() }, deps))
  await assert.rejects(() => applyRewards({ assessment: assessment() }, deps))
})

test("never reads instance.portfolio_decision or writes anything portfolio-related — out of scope for this milestone", async () => {
  const { deps, calls } = fakeDeps({ currentElo: 800 })
  const instance = domainInstance({ portfolio_decision: { artifactType: "code" } })
  await applyRewards({ assessment: assessment(), instance }, deps)
  assert.equal(calls.some((c) => /portfolio/i.test(c)), false)
})
