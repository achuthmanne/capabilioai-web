/**
 * queue.js — pgmq helper for async Arena grading jobs
 *
 * Uses Supabase pgmq (Queues integration) via RPC wrapper functions
 * defined in supabase_integrations_setup.sql.
 *
 * Flow:
 *   1. Submit route calls enqueueGrading() → returns job_id instantly
 *   2. grading-worker.js polls dequeueGrading() every 2s
 *   3. Worker grades, writes result, calls ackGrading() to remove from queue
 */

import { supabaseAdmin } from "./supabase.js"

// ── Enqueue ────────────────────────────────────────────────────────────────────
/**
 * Enqueue a grading job.
 * @param {object} payload - All data the worker needs to grade the submission
 * @returns {string} job_id — UUID from arena_grading_jobs table
 */
export async function enqueueGrading(payload) {
  // 1. Insert job record (for status polling)
  const { data: job, error: jobErr } = await supabaseAdmin
    .from("arena_grading_jobs")
    .insert({
      user_id:     payload.userId,
      challenge_id: payload.challengeId,
      attempt_id:  payload.attemptId || null,
      status:      "queued",
    })
    .select("id")
    .single()

  if (jobErr) throw new Error(`Job insert failed: ${jobErr.message}`)

  // 2. Send message to pgmq queue (includes job_id so worker can update the record)
  const { data: msgId, error: qErr } = await supabaseAdmin
    .rpc("queue_send_grading", { msg: { ...payload, job_id: job.id } })

  if (qErr) {
    // Clean up orphan job record if queue send fails
    await supabaseAdmin.from("arena_grading_jobs").delete().eq("id", job.id).catch(() => {})
    throw new Error(`Queue send failed: ${qErr.message}`)
  }

  // 3. Store msg_id on the job record (for debugging / manual ack)
  supabaseAdmin
    .from("arena_grading_jobs")
    .update({ msg_id: msgId })
    .eq("id", job.id)
    .catch(() => {})

  return job.id
}

// ── Dequeue ────────────────────────────────────────────────────────────────────
/**
 * Pull the next grading job from the queue.
 * vt = visibility timeout in seconds — message is hidden from other workers
 * for this duration. If not ack'd in time, it becomes visible again.
 * @returns {{ msg_id: bigint, message: object } | null}
 */
export async function dequeueGrading(vt = 90) {
  const { data, error } = await supabaseAdmin
    .rpc("queue_read_grading", { vt })

  if (error) {
    console.error("[queue] dequeue error:", error.message)
    return null
  }
  return data?.[0] || null // { msg_id, read_ct, enqueued_at, vt, message }
}

// ── Ack ────────────────────────────────────────────────────────────────────────
/**
 * Acknowledge (permanently delete) a processed message.
 */
export async function ackGrading(msgId) {
  const { error } = await supabaseAdmin.rpc("queue_ack_grading", { msg_id: msgId })
  if (error) console.error("[queue] ack error:", error.message)
}

// ── Archive (on failure) ───────────────────────────────────────────────────────
/**
 * Archive a failed message for post-mortem debugging.
 * Message moves to pgmq archive table instead of being deleted.
 */
export async function archiveGrading(msgId) {
  const { error } = await supabaseAdmin.rpc("queue_archive_grading", { msg_id: msgId })
  if (error) console.error("[queue] archive error:", error.message)
}

// ── Job status ─────────────────────────────────────────────────────────────────
/**
 * Get the current status + result of a grading job (for frontend polling).
 */
export async function getJobStatus(jobId) {
  const { data, error } = await supabaseAdmin
    .from("arena_grading_jobs")
    .select("id, user_id, status, result, error_msg, created_at, completed_at")
    .eq("id", jobId)
    .single()

  if (error) return null
  return data
}
