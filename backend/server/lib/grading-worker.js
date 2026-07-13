/**
 * grading-worker.js — Background Arena grading worker
 *
 * Polls the pgmq 'arena_grading' queue every POLL_INTERVAL_MS.
 * For each job:
 *   1. Marks job as 'processing'
 *   2. Runs AI grading (Claude / Groq)
 *   3. Computes ELO delta
 *   4. Writes result to challenge_attempts + profiles
 *   5. Fires background writes (elo_events, skill_graph, etc.)
 *   6. Marks job as 'done', acks the queue message
 *
 * In cluster mode each worker process runs its own polling loop.
 * pgmq's visibility timeout (90s) ensures only ONE worker processes
 * each message — others will not see it until the timeout expires.
 */

import { dequeueGrading, ackGrading, archiveGrading } from "./queue.js"
import { supabaseAdmin }                               from "./supabase.js"
import { gradeSubmission }                             from "./claude.js"

const POLL_INTERVAL_MS = 2_000   // poll every 2 seconds
const MAX_RETRIES      = 2        // retry up to 2× before archiving

// ── ELO formula (mirrors arenaV2.js) ──────────────────────────────────────────
const CHALLENGE_ELO = { Easy: 800, Medium: 1100, Hard: 1400, Expert: 1700 }

function computeEloUpdate({ userElo, difficulty, score, attempts, timeTakenSecs, estimatedSecs }) {
  const challengeElo = CHALLENGE_ELO[difficulty] || 1100
  const expected     = 1 / (1 + Math.pow(10, (challengeElo - userElo) / 400))
  const actual       = Math.max(0, Math.min(1, score / 100))
  const K            = userElo < 800 ? 48 : userElo < 1100 ? 36 : userElo < 1400 ? 28 : 20
  const attemptMult  = Math.max(0.4, 1 - (Math.max(1, attempts) - 1) * 0.15)
  const timeRatio    = estimatedSecs > 0 ? timeTakenSecs / estimatedSecs : 1
  const timeBonus    = timeRatio < 0.5 ? 1.10 : timeRatio < 0.75 ? 1.05 : 1.00
  let   delta        = Math.round(K * (actual - expected) * attemptMult * timeBonus)
  if (actual >= 0.7 && delta < 3) delta = 3
  if (delta < -30) delta = -30
  return { delta, newElo: Math.max(100, userElo + delta) }
}

const today = () => new Date().toISOString().slice(0, 10)

// ── Core grading function ──────────────────────────────────────────────────────
async function processJob(payload) {
  const {
    job_id,
    userId,
    challengeId,
    attemptId,
    code,
    test_results = [],
    time_taken_secs = 0,
    is_timed_out = false,
    challenge,     // full challenge object (serialized at submit time)
    userElo = 800,
    userProfile,   // { arena_completed, arena_streak, last_arena_date }
    attempts = 1,
  } = payload

  // Mark job as processing
  await supabaseAdmin
    .from("arena_grading_jobs")
    .update({ status: "processing" })
    .eq("id", job_id)
    .catch(() => {})

  // ── AI grading ──────────────────────────────────────────────────────────────
  let aiReview = null
  if (!is_timed_out && code?.trim().length > 10) {
    try {
      aiReview = await gradeSubmission({
        challengeTitle:  challenge.title,
        scenario:        challenge.description,
        expectedOutput:  challenge.test_cases?.[0]?.expected || "",
        candidateAnswer: String(code).slice(0, 3500),
        eloRating:       userElo,
      })
    } catch (e) {
      console.warn("[worker] AI grading failed, using test results fallback:", e.message)
      const passed = test_results.filter(t => t.passed).length
      const total  = test_results.length || 1
      aiReview = {
        score:        Math.round((passed / total) * 100),
        summary:      `${passed}/${total} test cases passed.`,
        strengths:    [],
        improvements: ["Graded by test results — AI review unavailable."],
        grade:        passed === total ? "B" : "C",
      }
    }
  }

  const finalScore  = is_timed_out ? Math.min(30, aiReview?.score || 0) : (aiReview?.score || 0)
  const { delta, newElo } = computeEloUpdate({
    userElo,
    difficulty:    challenge.difficulty,
    score:         finalScore,
    attempts,
    timeTakenSecs: time_taken_secs,
    estimatedSecs: (challenge.estimated_mins || 30) * 60,
  })

  const grade = finalScore >= 90 ? "A+" : finalScore >= 80 ? "A" : finalScore >= 70 ? "B+" :
                finalScore >= 60 ? "B"  : finalScore >= 50 ? "C" : "D"

  const feedbackPayload = {
    summary:      aiReview?.summary      || "Evaluation complete.",
    strengths:    aiReview?.strengths    || [],
    improvements: aiReview?.improvements || [],
    grade,
  }

  const updateData = {
    status:         "evaluated",
    submitted_at:   new Date().toISOString(),
    evaluated_at:   new Date().toISOString(),
    code_snapshot:  String(code || "").slice(0, 20000),
    test_results,
    score:          finalScore,
    elo_delta:      delta,
    feedback:       feedbackPayload,
    grade,
    time_taken_secs,
    is_timed_out,
  }

  // ── Critical write: attempt record ──────────────────────────────────────────
  let resolvedAttemptId = attemptId
  if (attemptId) {
    await supabaseAdmin
      .from("challenge_attempts")
      .update(updateData)
      .eq("id", attemptId)
      .eq("user_id", userId)
  } else {
    const { data: newAttempt } = await supabaseAdmin
      .from("challenge_attempts")
      .insert({ user_id: userId, challenge_id: challengeId, ...updateData })
      .select("id")
      .single()
    resolvedAttemptId = newAttempt?.id
  }

  // ── Critical write: profile ELO ─────────────────────────────────────────────
  const todayDate  = today()
  const lastDate   = userProfile?.last_arena_date || ""
  const yesterday  = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const newStreak  = lastDate === todayDate
    ? (userProfile?.arena_streak || 1)
    : lastDate === yesterday ? (userProfile?.arena_streak || 0) + 1 : 1

  await supabaseAdmin.from("profiles").update({
    elo_rating:        newElo,
    arena_completed:   (userProfile?.arena_completed || 0) + 1,
    arena_streak:      newStreak,
    last_arena_date:   todayDate,
    arena_last_active: new Date().toISOString(),
  }).eq("id", userId).catch(() => {})

  // ── Fire-and-forget: non-critical background writes ──────────────────────────
  Promise.all([
    supabaseAdmin.from("elo_events").insert({
      user_id:    userId,
      source:     "arena",
      source_id:  resolvedAttemptId,
      domain:     challenge.domain,
      delta,
      elo_before: userElo,
      elo_after:  newElo,
      note:       `${challenge.title} (${challenge.difficulty}) — score ${finalScore}`,
    }).catch(() => {}),

    finalScore >= 50
      ? supabaseAdmin.from("skill_graph").upsert({
          user_id:            userId,
          skill_name:         challenge.domain,
          skill_slug:         challenge.domain?.toLowerCase().replace(/\s+/g, "-"),
          domain:             challenge.domain,
          elo_value:          newElo,
          last_proof_date:    todayDate,
          proof_source:       "arena",
          verification_state: "verified",
          is_current:         true,
          updated_at:         new Date().toISOString(),
        }, { onConflict: "user_id,skill_slug" }).catch(() => {})
      : Promise.resolve(),
  ]).catch(() => {})

  // ── Write result to job record → frontend poll picks this up ─────────────────
  const result = {
    score:         finalScore,
    elo_delta:     delta,
    new_elo:       newElo,
    grade,
    feedback:      feedbackPayload,
    new_streak:    newStreak,
    proof_created: finalScore >= 50,
    attempt_id:    resolvedAttemptId,
  }

  await supabaseAdmin.from("arena_grading_jobs").update({
    status:       "done",
    result,
    completed_at: new Date().toISOString(),
  }).eq("id", job_id)

  return result
}

// ── Polling loop ───────────────────────────────────────────────────────────────
let _running   = false
let _timer     = null
let _retryMap  = new Map() // msg_id → retry count

export function startGradingWorker() {
  if (_running) return
  _running = true
  console.log(`[grading-worker] started (pid ${process.pid})`)
  _poll()
}

export function stopGradingWorker() {
  _running = false
  if (_timer) clearTimeout(_timer)
}

async function _poll() {
  if (!_running) return

  try {
    const msg = await dequeueGrading(90)

    if (msg) {
      const { msg_id, message: payload } = msg
      const retries = _retryMap.get(msg_id) || 0

      try {
        await processJob(payload)
        await ackGrading(msg_id)
        _retryMap.delete(msg_id)
        console.log(`[grading-worker] job ${payload.job_id} done ✓`)
      } catch (err) {
        console.error(`[grading-worker] job ${payload.job_id} failed (attempt ${retries + 1}):`, err.message)

        if (retries + 1 >= MAX_RETRIES) {
          // Give up — archive for debugging, mark job failed
          await archiveGrading(msg_id)
          _retryMap.delete(msg_id)
          await supabaseAdmin.from("arena_grading_jobs").update({
            status:    "failed",
            error_msg: err.message,
          }).eq("id", payload.job_id).catch(() => {})
        } else {
          // Will be retried after visibility timeout expires
          _retryMap.set(msg_id, retries + 1)
        }
      }
    }
  } catch (err) {
    console.error("[grading-worker] poll error:", err.message)
  }

  // Schedule next poll (immediately if we just processed a job, else wait)
  _timer = setTimeout(_poll, POLL_INTERVAL_MS)
}
