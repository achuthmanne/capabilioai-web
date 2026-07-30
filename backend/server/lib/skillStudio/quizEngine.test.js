/**
 * quizEngine.test.js — Phase 1 (2026-07-30) server-authoritative session
 * scoring. getSessionResult reads directly from the supabaseAdmin singleton
 * (../supabase.js) rather than taking a deps param — that's consistent with
 * this file's existing scoreAnswer/getOrGenerateQuestion, which also import
 * supabaseAdmin directly. supabaseAdmin is a Proxy whose `get` trap always
 * routes through the real client UNLESS globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
 * is set — that's the SAME test-only hook arena-v2's pglite integration tests
 * already use (see supabase.js's "TEST-ONLY HOOK" comment), so these tests
 * reuse it rather than inventing a second monkey-patch mechanism (a plain
 * `supabaseAdmin.from = fn` reassignment would silently no-op against this
 * Proxy, since its `get` trap ignores own-properties on the target).
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { MODULE_PASS_THRESHOLD, getSessionResult } from "./quizEngine.js"

function withFakeAttempts(rows) {
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = {
    from: (table) => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    }),
  }
  return () => { delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ }
}

test("MODULE_PASS_THRESHOLD is 80 — the Phase 1 floor", () => {
  assert.equal(MODULE_PASS_THRESHOLD, 80)
})

test("getSessionResult: 4/5 correct (80%) passes at the threshold", async () => {
  const restore = withFakeAttempts([
    { correct: true, quiz_question_id: "q1", quiz_questions: { payload: { prompt: "p1" } } },
    { correct: true, quiz_question_id: "q2", quiz_questions: { payload: { prompt: "p2" } } },
    { correct: true, quiz_question_id: "q3", quiz_questions: { payload: { prompt: "p3" } } },
    { correct: true, quiz_question_id: "q4", quiz_questions: { payload: { prompt: "p4" } } },
    { correct: false, quiz_question_id: "q5", quiz_questions: { payload: { prompt: "p5" } } },
  ])
  try {
    const result = await getSessionResult({ sessionId: "s1", userId: "u1" })
    assert.equal(result.score, 80)
    assert.equal(result.passed, true)
    assert.deepEqual(result.missedTopics, ["p5"])
  } finally {
    restore()
  }
})

test("getSessionResult: below 80% fails, and surfaces missed-question prompts for remedial regeneration", async () => {
  const restore = withFakeAttempts([
    { correct: true, quiz_question_id: "q1", quiz_questions: { payload: { prompt: "p1" } } },
    { correct: false, quiz_question_id: "q2", quiz_questions: { payload: { prompt: "p2" } } },
    { correct: false, quiz_question_id: "q3", quiz_questions: { payload: { prompt: "p3" } } },
  ])
  try {
    const result = await getSessionResult({ sessionId: "s2", userId: "u1" })
    assert.ok(result.score < MODULE_PASS_THRESHOLD)
    assert.equal(result.passed, false)
    assert.deepEqual(result.missedTopics, ["p2", "p3"])
  } finally {
    restore()
  }
})

test("getSessionResult: zero attempts (e.g. bad/missing sessionId) never passes — no answeredCount=0 edge case slipping through", async () => {
  const restore = withFakeAttempts([])
  try {
    const result = await getSessionResult({ sessionId: "nonexistent", userId: "u1" })
    assert.equal(result.answeredCount, 0)
    assert.equal(result.score, 0)
    assert.equal(result.passed, false, "a session with zero recorded attempts must never be treated as passed")
  } finally {
    restore()
  }
})

test("getSessionResult is scoped to (sessionId, userId) — a client cannot pass another user's session to inherit their score", async () => {
  // withFakeAttempts' fake chain doesn't discriminate by the actual eq()
  // args (it always returns the fixture), so this test instead asserts the
  // real query shape: .eq("session_id", sessionId).eq("user_id", userId).
  // If either eq() call were dropped from the implementation, this would
  // still "pass" against the fake — so assert against the real filter chain
  // by having the fake reject any narrowing key state.
  const seenFilters = []
  globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__ = {
    from: () => ({
      select: () => ({
        eq: (col, val) => {
          seenFilters.push([col, val])
          return { eq: (col2, val2) => { seenFilters.push([col2, val2]); return Promise.resolve({ data: [], error: null }) } }
        },
      }),
    }),
  }
  try {
    await getSessionResult({ sessionId: "session-abc", userId: "user-xyz" })
    assert.deepEqual(seenFilters, [["session_id", "session-abc"], ["user_id", "user-xyz"]])
  } finally {
    delete globalThis.__ARENA_V2_TEST_SUPABASE_CLIENT__
  }
})
