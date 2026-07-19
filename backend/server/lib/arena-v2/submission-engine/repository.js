/**
 * submission-engine/repository.js — Milestone 8
 * ---------------------------------------------------------------------------
 * Data access for av2_challenge_instances (ownership lookup + status
 * transitions) and av2_submissions. Does not touch av2_assessments — that's
 * assessment/repository.js's job.
 *
 * OWNERSHIP ENFORCED AT THE QUERY, not just in application code:
 * `getInstanceForSubmission` filters by `user_id = userId` in the SQL itself
 * — a student can never submit against another student's instance id, even
 * if they guess or intercept one, because the row simply won't be returned.
 */
import { supabaseAdmin } from "../../supabase.js"

export async function getInstanceForSubmission(instanceId, userId) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .select("*")
    .eq("id", instanceId)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getAttemptCount(instanceId) {
  const { count, error } = await supabaseAdmin
    .from("av2_submissions")
    .select("id", { count: "exact", head: true })
    .eq("instance_id", instanceId)
  if (error) throw error
  return count || 0
}

export async function insertSubmission(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_submissions")
    .insert({
      instance_id: row.instanceId,
      user_id: row.userId,
      attempt_number: row.attemptNumber,
      submission_data: row.submissionData,
      status: "running",
      is_timed_out: row.isTimedOut,
      time_taken_secs: row.timeTakenSecs,
    })
    .select()
    .single()
  if (error) {
    // Postgres unique_violation on (instance_id, attempt_number) — a genuine
    // concurrent double-submit race (e.g. a double-click or retry storm).
    // Surfaced as a typed, expected condition rather than a raw 500.
    if (error.code === "23505") {
      const dup = new Error("A submission for this attempt is already being processed")
      dup.name = "ConcurrentSubmissionError"
      throw dup
    }
    throw error
  }
  return data
}

export async function updateSubmissionResult(submissionId, { status, validatorResult }) {
  const { data, error } = await supabaseAdmin
    .from("av2_submissions")
    .update({ status, validator_result: validatorResult, validated_at: new Date().toISOString() })
    .eq("id", submissionId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markInstanceStatus(instanceId, status) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .update({ status })
    .eq("id", instanceId)
    .select()
    .single()
  if (error) throw error
  return data
}
