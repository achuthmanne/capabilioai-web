import { test } from "node:test"
import assert from "node:assert/strict"
import { decidePortfolioPublication, DECISION_TYPES } from "./decision.js"

function event(overrides = {}) {
  return {
    assessment: { final_score: 90, ...(overrides.assessment || {}) },
    instance: {
      challenge_type: "domain",
      portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: true, artifactType: "code" },
      ...(overrides.instance || {}),
    },
  }
}

test("common challenges are never eligible, regardless of score", () => {
  const result = decidePortfolioPublication(event({ instance: { challenge_type: "common" }, assessment: { final_score: 100 } }))
  assert.equal(result.type, DECISION_TYPES.NOT_ELIGIBLE)
  assert.equal(result.publishState, null)
})

test("a score at or above the threshold auto-publishes as Verified", () => {
  const result = decidePortfolioPublication(event({ assessment: { final_score: 80 } }))
  assert.equal(result.type, DECISION_TYPES.AUTO_PUBLISH)
  assert.equal(result.publishState, "auto_published")
  assert.equal(result.verification, "Verified")
})

test("a score below the threshold, with manual publish allowed, creates a pending draft (not yet visible to recruiters)", () => {
  const result = decidePortfolioPublication(event({ assessment: { final_score: 60 } }))
  assert.equal(result.type, DECISION_TYPES.PENDING_MANUAL)
  assert.equal(result.publishState, "not_published")
  assert.equal(result.verification, "Self-Selected")
})

test("a score below the threshold, with manual publish disallowed, produces nothing", () => {
  const result = decidePortfolioPublication(event({
    assessment: { final_score: 60 },
    instance: { portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: false } },
  }))
  assert.equal(result.type, DECISION_TYPES.NOT_QUALIFYING)
  assert.equal(result.publishState, null)
})

test("a domain instance with no portfolio_decision configured at all is treated as not eligible, not a crash", () => {
  const result = decidePortfolioPublication(event({ instance: { portfolio_decision: null } }))
  assert.equal(result.type, DECISION_TYPES.NOT_ELIGIBLE)
})

test("a malformed portfolio_decision (missing minScoreToAutoPublish) is treated as not eligible", () => {
  const result = decidePortfolioPublication(event({ instance: { portfolio_decision: { artifactType: "code" } } }))
  assert.equal(result.type, DECISION_TYPES.NOT_ELIGIBLE)
})

test("exact-threshold score counts as meeting it (>=, not >)", () => {
  const result = decidePortfolioPublication(event({
    assessment: { final_score: 80 },
    instance: { portfolio_decision: { minScoreToAutoPublish: 80, allowManualPublishBelowThreshold: true } },
  }))
  assert.equal(result.type, DECISION_TYPES.AUTO_PUBLISH)
})
