/**
 * assessment/repository.js — Milestone 8
 * ---------------------------------------------------------------------------
 * Data access for av2_assessments only (Milestone 1's table). Does not touch
 * av2_challenge_instances or av2_submissions — those belong to
 * submission-engine/repository.js, which already owns them.
 */
import { supabaseAdmin } from "../../supabase.js"

export async function insertAssessment(row) {
  const { data, error } = await supabaseAdmin
    .from("av2_assessments")
    .insert({
      submission_id: row.submissionId,
      instance_id: row.instanceId,
      user_id: row.userId,
      validator_score: row.validatorScore,
      rubric_score: row.rubricScore,
      ai_review_score: row.aiReviewScore,
      ai_review_weight: row.aiReviewWeight,
      timing_modifier: row.timingModifier,
      code_quality_notes: row.codeQualityNotes || [],
      final_score: row.finalScore,
      is_zero_effort: row.isZeroEffort,
      feedback: row.feedback || {},
    })
    .select()
    .single()
  if (error) throw error
  return data
}
