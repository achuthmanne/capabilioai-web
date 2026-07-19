import { test } from "node:test"
import assert from "node:assert/strict"
import { createAssessmentCompletedEvent, InvalidAssessmentCompletedEventError } from "./assessmentCompletedEvent.js"

const fixture = () => ({
  assessment: { id: "a1" }, instance: { id: "i1" }, submission: { id: "s1" }, rewardResult: { eloEntry: null, xpEntry: null, skillProgress: {} },
})

test("constructs a well-formed event with all four fields", () => {
  const f = fixture()
  const event = createAssessmentCompletedEvent(f)
  assert.equal(event.assessment, f.assessment)
  assert.equal(event.instance, f.instance)
  assert.equal(event.submission, f.submission)
  assert.equal(event.rewardResult, f.rewardResult)
})

test("the event is frozen — downstream consumers cannot mutate it", () => {
  const event = createAssessmentCompletedEvent(fixture())
  assert.throws(() => { event.assessment = null }, TypeError)
})

test("throws a typed error listing every missing field", () => {
  try {
    createAssessmentCompletedEvent({})
    assert.fail("expected to throw")
  } catch (e) {
    assert.ok(e instanceof InvalidAssessmentCompletedEventError)
    assert.equal(e.issues.length, 4)
  }
})

test("throws if only some fields are missing", () => {
  const f = fixture()
  assert.throws(() => createAssessmentCompletedEvent({ assessment: f.assessment, instance: f.instance }), InvalidAssessmentCompletedEventError)
})
