import { test } from "node:test"
import assert from "node:assert/strict"
import {
  RECRUITER_READY_SCORE_THRESHOLD,
  formatEloDelta,
  formatDuration,
  formatScore,
  isRecruiterReadyScore,
} from "./evidenceFormatting.js"

test("formatEloDelta prefixes a plus sign on non-negative deltas", () => {
  assert.equal(formatEloDelta(12), "+12")
  assert.equal(formatEloDelta(0), "+0")
})

test("formatEloDelta does not double up the minus sign on negative deltas", () => {
  assert.equal(formatEloDelta(-8), "-8")
})

test("formatEloDelta falls back to an em dash for missing or non-numeric values", () => {
  assert.equal(formatEloDelta(null), "—")
  assert.equal(formatEloDelta(undefined), "—")
  assert.equal(formatEloDelta(NaN), "—")
})

test("formatDuration renders durations under 30s in seconds (below the round-to-a-minute boundary)", () => {
  assert.equal(formatDuration(20), "20s")
})

test("formatDuration renders minute-and-above durations rounded to the nearest minute", () => {
  assert.equal(formatDuration(125), "2 min")
  assert.equal(formatDuration(600), "10 min")
})

test("formatDuration falls back to an em dash for missing or non-numeric values", () => {
  assert.equal(formatDuration(null), "—")
  assert.equal(formatDuration(undefined), "—")
})

test("formatScore appends the /100 scale and falls back to an em dash", () => {
  assert.equal(formatScore(82), "82/100")
  assert.equal(formatScore(null), "—/100")
})

test("isRecruiterReadyScore matches the platform-wide 70 convention used by 12 of 13 seeded templates", () => {
  assert.equal(RECRUITER_READY_SCORE_THRESHOLD, 70)
  assert.equal(isRecruiterReadyScore(70), true)
  assert.equal(isRecruiterReadyScore(69), false)
  assert.equal(isRecruiterReadyScore(null), false)
})
