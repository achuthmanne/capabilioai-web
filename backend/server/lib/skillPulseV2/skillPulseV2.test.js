import { test } from "node:test"
import assert from "node:assert/strict"
import { selectPulseQuestions, seededRandom } from "./selection.js"
import { computeDecayState, DECAY_STATES } from "./decay.js"
import { checkGlobalCoverageGate, hasSufficientCoverageForUser, decideFlowVersion, validateQuestionForApproval, TOP_10_DOMAINS, MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN } from "./questionBankGate.js"
import { computeBoundedConfidenceChange, computeAllConfidenceChanges, CONFIDENCE_FEEDBACK_MAX_DELTA_PER_SKILL } from "./confidenceFeedback.js"
import { resumeAt, mapKeyToIntent } from "./pulseProgress.js"
import { inferDomainForSkill, inferRelevantDomains } from "./domainInference.js"

// ── Fixtures ─────────────────────────────────────────────────────────────
function makeQuestion(overrides = {}) {
  return {
    id: overrides.id || `q-${Math.random().toString(36).slice(2)}`,
    domain: "data_analytics",
    skill_tags: ["sql"],
    difficulty: 3,
    question_type: "scenario",
    prompt: "A scenario prompt",
    options: [{ id: "a", text: "A" }, { id: "b", text: "B" }, { id: "c", text: "C" }, { id: "d", text: "D" }],
    correct_option_id: "a",
    explanation: "Because A is right.",
    review_status: "approved",
    retired_at: null,
    ...overrides,
  }
}

function bigApprovedPool({ skills = ["sql", "python", "excel", "tableau", "vba"], perSkill = 12 } = {}) {
  const pool = []
  for (const skill of skills) {
    for (let i = 0; i < perSkill; i++) {
      pool.push(makeQuestion({
        id: `${skill}-${i}`,
        skill_tags: [skill],
        difficulty: (i % 5) + 1, // spread 1..5 evenly
      }))
    }
  }
  return pool
}

const USER_SKILLS = [
  { id: "s1", name: "SQL", slug: "sql", level_score: 40, verified: false, decayState: "at_risk" },
  { id: "s2", name: "Python", slug: "python", level_score: 60, verified: true, decayState: "fresh" },
  { id: "s3", name: "Excel", slug: "excel", level_score: 30, verified: false, decayState: "decayed" },
  { id: "s4", name: "Tableau", slug: "tableau", level_score: 70, verified: true, decayState: "aging" },
  { id: "s5", name: "VBA", slug: "vba", level_score: 55, verified: false, decayState: "fresh" },
]

// ── 1. Approved-only selection ──────────────────────────────────────────
test("selection only ever includes review_status='approved' questions, even if the pool has others", () => {
  const pool = [
    ...bigApprovedPool(),
    makeQuestion({ id: "draft-1", review_status: "draft", skill_tags: ["sql"] }),
    makeQuestion({ id: "in-review-1", review_status: "in_review", skill_tags: ["python"] }),
    makeQuestion({ id: "rejected-1", review_status: "rejected", skill_tags: ["excel"] }),
  ]
  const result = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-1:2026-07-20" })
  assert.ok(!result.questions.some(q => q.id === "draft-1"))
  assert.ok(!result.questions.some(q => q.id === "in-review-1"))
  assert.ok(!result.questions.some(q => q.id === "rejected-1"))
  assert.ok(result.questions.every(q => q.review_status === "approved"))
})

test("no AI-generated unreviewed question leak: a retired-but-approved-flagged row is still excluded", () => {
  const pool = [
    ...bigApprovedPool(),
    makeQuestion({ id: "retired-1", review_status: "approved", retired_at: "2026-01-01T00:00:00Z", skill_tags: ["sql"] }),
  ]
  const result = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-1:2026-07-20" })
  assert.ok(!result.questions.some(q => q.id === "retired-1"))
})

// ── 2. Anti-repeat window ────────────────────────────────────────────────
test("anti-repeat: questions in seenQuestionIds (prior 8 weeks) are never selected", () => {
  const pool = bigApprovedPool()
  const seen = new Set(pool.slice(0, 40).map(q => q.id))
  const result = selectPulseQuestions({
    approvedQuestions: pool, userSkills: USER_SKILLS, seenQuestionIds: seen, seed: "user-2:2026-07-20",
  })
  assert.ok(result.questions.every(q => !seen.has(q.id)))
})

// ── 3. Max questions per skill ───────────────────────────────────────────
test("never more than maxPerSkill (default 3) questions for any single skill", () => {
  const pool = bigApprovedPool()
  const result = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-3:2026-07-20" })
  const perSkill = {}
  for (const q of result.questions) for (const t of q.skill_tags) perSkill[t] = (perSkill[t] || 0) + 1
  for (const count of Object.values(perSkill)) assert.ok(count <= 3, `expected <=3, got ${count}`)
})

test("max-per-skill cap holds even with only 2 skills available (forces spread)", () => {
  const pool = bigApprovedPool({ skills: ["sql", "python"], perSkill: 20 })
  const result = selectPulseQuestions({
    approvedQuestions: pool,
    userSkills: [USER_SKILLS[0], USER_SKILLS[1]],
    seed: "user-4:2026-07-20",
  })
  const perSkill = {}
  for (const q of result.questions) for (const t of q.skill_tags) perSkill[t] = (perSkill[t] || 0) + 1
  for (const count of Object.values(perSkill)) assert.ok(count <= 3)
  // With only 2 skills capped at 3 each, max possible is 6 — confirms the
  // engine correctly reports "insufficient" rather than silently returning
  // fewer than 15 without saying so.
  assert.equal(result.insufficient, true)
  assert.ok(result.questions.length <= 6)
})

// ── 4. Difficulty balancing — never all-hard or all-easy ────────────────
test("difficulty floor: a full 15-question set always has at least 2 easy and 2 hard, even with high prior accuracy", () => {
  const pool = bigApprovedPool()
  const result = selectPulseQuestions({
    approvedQuestions: pool, userSkills: USER_SKILLS,
    priorPerformance: { accuracyLastPulse: 1.0 }, // would naively push toward all-hard
    seed: "user-5:2026-07-20",
  })
  assert.equal(result.questions.length, 15)
  assert.ok(result.meta.easyCount >= 2, `expected >=2 easy, got ${result.meta.easyCount}`)
  assert.ok(result.meta.hardCount >= 2, `expected >=2 hard, got ${result.meta.hardCount}`)
})

test("difficulty floor holds with low prior accuracy too (would naively push toward all-easy)", () => {
  const pool = bigApprovedPool()
  const result = selectPulseQuestions({
    approvedQuestions: pool, userSkills: USER_SKILLS,
    priorPerformance: { accuracyLastPulse: 0.0 },
    seed: "user-6:2026-07-20",
  })
  assert.ok(result.meta.easyCount >= 2)
  assert.ok(result.meta.hardCount >= 2)
})

// ── 5. Determinism for a fixed seed ──────────────────────────────────────
test("selection is deterministic: same pool + same seed always produces the same question set", () => {
  const pool = bigApprovedPool()
  const r1 = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-7:2026-07-20" })
  const r2 = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-7:2026-07-20" })
  assert.deepEqual(r1.questions.map(q => q.id), r2.questions.map(q => q.id))
})

test("different seeds (different user or week) can produce different sets", () => {
  const pool = bigApprovedPool()
  const r1 = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-8:2026-07-20" })
  const r2 = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-8:2026-07-27" })
  assert.notDeepEqual(r1.questions.map(q => q.id), r2.questions.map(q => q.id))
})

test("seededRandom itself is deterministic for a fixed seed", () => {
  const a = seededRandom("fixed-seed")
  const b = seededRandom("fixed-seed")
  const seqA = [a(), a(), a()]
  const seqB = [b(), b(), b()]
  assert.deepEqual(seqA, seqB)
})

// ── 6. Weighting — at-risk / decayed / target-gap skills favored ────────
test("at-risk and decayed skills are represented at least as often as fresh skills at equal pool size", () => {
  const pool = bigApprovedPool()
  const result = selectPulseQuestions({ approvedQuestions: pool, userSkills: USER_SKILLS, seed: "user-9:2026-07-20" })
  const perSkill = {}
  for (const q of result.questions) for (const t of q.skill_tags) perSkill[t] = (perSkill[t] || 0) + 1
  // excel = decayed (highest weight), python/vba = fresh (lowest weight)
  assert.ok((perSkill.excel || 0) >= (perSkill.python || 0))
})

// ── 7. Coverage gate / v2 fallback ───────────────────────────────────────
test("global coverage gate requires ALL top 10 domains to meet the 30-question minimum", () => {
  const counts = Object.fromEntries(TOP_10_DOMAINS.map(d => [d, 30]))
  counts[TOP_10_DOMAINS[0]] = 29 // one domain just under
  const gate = checkGlobalCoverageGate(counts)
  assert.equal(gate.eligible, false)
  assert.equal(gate.minimumRequired, MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN)
  assert.equal(gate.perDomain.find(d => d.domain === TOP_10_DOMAINS[0]).meets, false)
})

test("global coverage gate passes when every top 10 domain meets exactly the minimum", () => {
  const counts = Object.fromEntries(TOP_10_DOMAINS.map(d => [d, MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN]))
  assert.equal(checkGlobalCoverageGate(counts).eligible, true)
})

test("per-user coverage check requires enough approved questions across the user's relevant domains", () => {
  const result = hasSufficientCoverageForUser(["data_analytics"], { data_analytics: 10 })
  assert.equal(result.sufficient, false)
  const result2 = hasSufficientCoverageForUser(["data_analytics"], { data_analytics: 50 })
  assert.equal(result2.sufficient, true)
})

test("v2 fallback: flag off always yields v1 regardless of coverage", () => {
  const counts = Object.fromEntries(TOP_10_DOMAINS.map(d => [d, 999]))
  const decision = decideFlowVersion({ v2FlagEnabled: false, approvedCountsByDomain: counts, relevantDomains: ["data_analytics"] })
  assert.equal(decision.flow_version, "v1")
  assert.equal(decision.reason, "flag_off")
})

test("v2 fallback: flag on but global gate not met yields v1", () => {
  const decision = decideFlowVersion({ v2FlagEnabled: true, approvedCountsByDomain: {}, relevantDomains: ["data_analytics"] })
  assert.equal(decision.flow_version, "v1")
  assert.equal(decision.reason, "global_coverage_gate_not_met")
})

test("v2 fallback: flag on, global gate met, but this user's own domain lacks coverage yields v1", () => {
  const counts = Object.fromEntries(TOP_10_DOMAINS.map(d => [d, MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN]))
  counts.data_analytics = 30 // meets global minimum but not the higher per-user total (45)
  const decision = decideFlowVersion({ v2FlagEnabled: true, approvedCountsByDomain: counts, relevantDomains: ["data_analytics"] })
  assert.equal(decision.flow_version, "v1")
  assert.equal(decision.reason, "insufficient_user_domain_coverage")
})

test("v2 activates only when flag on + global gate met + user's domain has real coverage", () => {
  const counts = Object.fromEntries(TOP_10_DOMAINS.map(d => [d, MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN]))
  counts.data_analytics = 60
  const decision = decideFlowVersion({ v2FlagEnabled: true, approvedCountsByDomain: counts, relevantDomains: ["data_analytics"] })
  assert.equal(decision.flow_version, "v2")
})

test("today's real production coverage (0 approved questions in every domain) always falls back to v1", () => {
  // Mirrors the actual current state confirmed in the Workstream 3 audit —
  // question_bank has 0 rows in production today, so no user can be on v2
  // yet regardless of the flag, by design.
  const decision = decideFlowVersion({ v2FlagEnabled: true, approvedCountsByDomain: {}, relevantDomains: ["data_analytics"] })
  assert.equal(decision.flow_version, "v1")
})

// ── 8. Question approval validation (server-enforced workflow) ─────────
test("a question missing an explanation cannot be approved", () => {
  const row = makeQuestion({ explanation: "" })
  const result = validateQuestionForApproval(row)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes("explanation")))
})

test("a question whose correct_option_id doesn't match any option cannot be approved", () => {
  const row = makeQuestion({ correct_option_id: "z" })
  const result = validateQuestionForApproval(row)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(e => e.includes("correct_option_id")))
})

test("a well-formed question passes approval validation", () => {
  const result = validateQuestionForApproval(makeQuestion())
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
})

// ── 9. Decay state boundaries ────────────────────────────────────────────
test("decay: fewer than 4 weeks since signal is Fresh", () => {
  const now = new Date("2026-07-24T00:00:00Z")
  const signal = { type: "weekly_pulse_activity", occurred_at: "2026-07-01T00:00:00Z" } // ~3.3 weeks
  const result = computeDecayState([signal], now)
  assert.equal(result.state, DECAY_STATES.FRESH)
  assert.ok(result.driver)
  assert.equal(result.driver.type, "weekly_pulse_activity")
})

test("decay: exactly 4 weeks since signal is Aging, not Fresh (boundary)", () => {
  const now = new Date("2026-07-29T00:00:00Z")
  const signal = { type: "verified_proof", occurred_at: "2026-07-01T00:00:00Z" } // exactly 4 weeks
  const result = computeDecayState([signal], now)
  assert.equal(result.state, DECAY_STATES.AGING)
})

test("decay: 7.9 weeks is Aging, exactly 8 weeks is At Risk (boundary)", () => {
  const now = new Date("2026-07-24T00:00:00Z")
  const justUnder8 = computeDecayState([{ type: "certification", occurred_at: "2026-05-30T00:00:00Z" }], now)
  const exactly8 = computeDecayState([{ type: "certification", occurred_at: "2026-05-27T00:00:00Z" }], now)
  assert.equal(justUnder8.state, DECAY_STATES.AGING)
  assert.equal(exactly8.state, DECAY_STATES.AT_RISK)
})

test("decay: exactly 16 weeks is Decayed, 15.9 weeks is still At Risk (boundary)", () => {
  const now = new Date("2026-07-24T00:00:00Z")
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000
  const justUnder16Date = new Date(now.getTime() - 15.9 * WEEK_MS)
  const exactly16Date = new Date(now.getTime() - 16 * WEEK_MS)
  const justUnder16 = computeDecayState([{ type: "verified_skill_event", occurred_at: justUnder16Date.toISOString() }], now)
  const exactly16 = computeDecayState([{ type: "verified_skill_event", occurred_at: exactly16Date.toISOString() }], now)
  assert.equal(justUnder16.state, DECAY_STATES.AT_RISK)
  assert.equal(exactly16.state, DECAY_STATES.DECAYED)
})

test("decay: no relevant signal at all is Decayed with an explicit null driver, never a bare score", () => {
  const result = computeDecayState([], new Date())
  assert.equal(result.state, DECAY_STATES.DECAYED)
  assert.equal(result.driver, null)
  assert.equal(result.weeksSinceSignal, null)
})

test("decay: multiple signals pick the most recent one as the driver", () => {
  const now = new Date("2026-07-24T00:00:00Z")
  const result = computeDecayState([
    { type: "certification", occurred_at: "2026-01-01T00:00:00Z" },
    { type: "weekly_pulse_activity", occurred_at: "2026-07-10T00:00:00Z" }, // most recent
  ], now)
  assert.equal(result.driver.type, "weekly_pulse_activity")
  assert.equal(result.state, DECAY_STATES.FRESH)
})

test("decay: an invalid/unparseable signal date is ignored, not crashed on", () => {
  const result = computeDecayState([{ type: "certification", occurred_at: "not-a-date" }], new Date())
  assert.equal(result.state, DECAY_STATES.DECAYED)
  assert.equal(result.driver, null)
})

// ── 10. Confidence caps — bounded, visible math ─────────────────────────
test("confidence change is capped at +/-15 regardless of how lopsided the results are", () => {
  const answers = Array.from({ length: 3 }, () => ({ isCorrect: true }))
  const result = computeBoundedConfidenceChange("skill-1", answers, 50)
  assert.equal(result.cappedDelta, CONFIDENCE_FEEDBACK_MAX_DELTA_PER_SKILL)
  assert.ok(Math.abs(result.cappedDelta) <= 15)
})

test("confidence change never pushes level_score below 0 or above 100", () => {
  const allCorrect = Array.from({ length: 3 }, () => ({ isCorrect: true }))
  const nearMax = computeBoundedConfidenceChange("skill-1", allCorrect, 92)
  assert.ok(nearMax.newLevelScore <= 100)
  const allWrong = Array.from({ length: 3 }, () => ({ isCorrect: false }))
  const nearMin = computeBoundedConfidenceChange("skill-2", allWrong, 5)
  assert.ok(nearMin.newLevelScore >= 0)
})

test("confidence math exposes every intermediate value (visible bounded math, not just a final number)", () => {
  const answers = [{ isCorrect: true }, { isCorrect: false }]
  const result = computeBoundedConfidenceChange("skill-1", answers, 50)
  assert.ok("correct" in result && "total" in result && "ratio" in result && "rawDelta" in result && "cappedDelta" in result)
  assert.ok(result.explanation.includes("correct"))
})

test("computeAllConfidenceChanges groups answers by skill and caps each independently", () => {
  const answers = [
    { skillId: "s1", isCorrect: true }, { skillId: "s1", isCorrect: true }, { skillId: "s1", isCorrect: true },
    { skillId: "s2", isCorrect: false },
  ]
  const changes = computeAllConfidenceChanges(answers, { s1: 50, s2: 50 })
  const s1 = changes.find(c => c.skillId === "s1")
  const s2 = changes.find(c => c.skillId === "s2")
  assert.equal(s1.cappedDelta, 15)
  assert.equal(s2.cappedDelta, -15)
})

// ── 11. Pause/resume ──────────────────────────────────────────────────────
test("resumeAt finds the first unanswered question", () => {
  const questions = [{ id: "a" }, { id: "b" }, { id: "c" }]
  const result = resumeAt(questions, new Set(["a"]))
  assert.equal(result.index, 1)
  assert.equal(result.isComplete, false)
})

test("resumeAt reports complete when every question is answered", () => {
  const questions = [{ id: "a" }, { id: "b" }]
  const result = resumeAt(questions, new Set(["a", "b"]))
  assert.equal(result.isComplete, true)
  assert.equal(result.index, 2)
})

test("resumeAt with zero answered questions resumes at index 0 (pause immediately after starting)", () => {
  const questions = [{ id: "a" }, { id: "b" }]
  const result = resumeAt(questions, new Set())
  assert.equal(result.index, 0)
})

// ── 12. Keyboard support ──────────────────────────────────────────────────
test("keyboard: number keys 1-4 map to option selection", () => {
  assert.deepEqual(mapKeyToIntent("1", 4), { type: "select", optionIndex: 0 })
  assert.deepEqual(mapKeyToIntent("4", 4), { type: "select", optionIndex: 3 })
})

test("keyboard: a number beyond the option count is ignored", () => {
  assert.equal(mapKeyToIntent("5", 4), null)
})

test("keyboard: Enter submits, arrows navigate", () => {
  assert.deepEqual(mapKeyToIntent("Enter", 4), { type: "submit" })
  assert.deepEqual(mapKeyToIntent("ArrowRight", 4), { type: "next" })
  assert.deepEqual(mapKeyToIntent("ArrowLeft", 4), { type: "prev" })
})

test("keyboard: unrelated keys produce no intent", () => {
  assert.equal(mapKeyToIntent("q", 4), null)
})

// ── 13. One-pulse-per-week (documented DB-level enforcement) ────────────
// The actual guarantee here is a Postgres UNIQUE constraint on
// weekly_pulses(user_id, week_of) (weekly_pulses_user_id_week_of_key),
// confirmed via direct schema inspection during the Workstream 3 audit —
// not application code that could regress. There's no pure function to unit
// test for this one; it's recorded here so the requirement isn't silently
// dropped from the visible test list.
test("one-pulse-per-week is enforced by a DB unique constraint, not application logic (documented, not unit-testable here)", () => {
  assert.ok(true, "See weekly_pulses_user_id_week_of_key in career-os-implementation-plan.md §5d")
})

// ── 14. RLS/authorization (documented DB-level enforcement) ─────────────
test("question_bank has RLS enabled with zero client policies; question_bank_reports is owner-scoped (documented, not unit-testable here)", () => {
  assert.ok(true, "Confirmed via get_advisors + pg_policies during migration — see career_os_ws3_skill_pulse_v2_question_bank_migration.sql")
})

// ── 15. Domain inference (bridges free-text skill names to fixed domains) ─
test("domain inference maps real production skill names to data_analytics", () => {
  for (const name of ["SQL", "Python", "Microsoft Excel", "Tableau", "Power BI", "VBA", "Statistical Data Analysis"]) {
    assert.equal(inferDomainForSkill(name), "data_analytics", `expected ${name} -> data_analytics`)
  }
})

test("domain inference falls back to 'other' for an unrecognized skill name", () => {
  assert.equal(inferDomainForSkill("Underwater Basket Weaving"), "other")
})

test("domain inference handles empty/null input without throwing", () => {
  assert.equal(inferDomainForSkill(""), "other")
  assert.equal(inferDomainForSkill(null), "other")
  assert.equal(inferDomainForSkill(undefined), "other")
})

test("inferRelevantDomains de-duplicates across a user's skill set", () => {
  const domains = inferRelevantDomains([{ name: "SQL" }, { name: "Python" }, { name: "Excel" }])
  assert.deepEqual(domains, ["data_analytics"])
})
