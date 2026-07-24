import { test } from "node:test"
import assert from "node:assert/strict"
import { computeTodayPriority } from "./homePriority.js"

const FULL = {
  hasResumeOrTimeline: true,
  weeklyPulseStatus: "done",
  hasTargetRole: true,
  isEmploymentVerified: true,
  skillsCount: 9,
  hasSummary: true,
}

test("no resume/timeline wins over everything else — activation gate", () => {
  const p = computeTodayPriority({ ...FULL, hasResumeOrTimeline: false, weeklyPulseStatus: "due" })
  assert.equal(p.id, "activate_resume")
  assert.equal(p.insufficientData, true)
  assert.equal(p.ctaTarget.page, "aura")
})

test("weekly pulse due outranks verification/profile gaps (tier 3 < tier 4)", () => {
  const p = computeTodayPriority({ ...FULL, weeklyPulseStatus: "due", isEmploymentVerified: false, hasTargetRole: false })
  assert.equal(p.id, "weekly_pulse_due")
})

test("in-progress pulse produces a resume-flow CTA, not the start-flow one", () => {
  const p = computeTodayPriority({ ...FULL, weeklyPulseStatus: "in_progress" })
  assert.equal(p.id, "weekly_pulse_resume")
})

test("verification gap surfaces when pulse isn't due and resume exists", () => {
  const p = computeTodayPriority({ ...FULL, weeklyPulseStatus: "done", isEmploymentVerified: false })
  assert.equal(p.id, "verify_employment")
})

test("target role gap surfaces ahead of skills/summary gaps when employment is already verified", () => {
  const p = computeTodayPriority({ ...FULL, hasTargetRole: false, skillsCount: 0, hasSummary: false, isEmploymentVerified: true })
  assert.equal(p.id, "set_target_role")
})

test("zero skills surfaces once target role and verification are resolved", () => {
  const p = computeTodayPriority({ ...FULL, skillsCount: 0, hasSummary: false })
  assert.equal(p.id, "add_skills")
})

test("missing summary is the lowest tier-4 gap", () => {
  const p = computeTodayPriority({ ...FULL, hasSummary: false })
  assert.equal(p.id, "add_summary")
})

test("fully set-up profile with no pending pulse returns the honest caught-up state, never a fabricated action", () => {
  const p = computeTodayPriority(FULL)
  assert.equal(p.id, "all_caught_up")
  assert.equal(p.insufficientData, false)
  assert.equal(p.estimatedMinutes, 0)
})

test("every returned priority has the full required contract (why/outcome/minutes/cta/target)", () => {
  const scenarios = [
    { ...FULL, hasResumeOrTimeline: false },
    { ...FULL, weeklyPulseStatus: "due" },
    { ...FULL, isEmploymentVerified: false },
    FULL,
  ]
  for (const ctx of scenarios) {
    const p = computeTodayPriority(ctx)
    assert.ok(p.title && typeof p.title === "string")
    assert.ok(p.whyItMatters && typeof p.whyItMatters === "string")
    assert.ok(p.expectedOutcome && typeof p.expectedOutcome === "string")
    assert.equal(typeof p.estimatedMinutes, "number")
    assert.ok(p.ctaLabel && typeof p.ctaLabel === "string")
    assert.ok(p.ctaTarget && typeof p.ctaTarget.page === "string")
  }
})
