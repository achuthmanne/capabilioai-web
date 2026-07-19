/**
 * challenge-payload-validator/repository.js — Milestone 4
 * ---------------------------------------------------------------------------
 * Data-access for the Validator's own responsibilities: reading the
 * Capability Registry, logging rejections, emitting analytics events, and
 * (only on success) creating the av2_challenge_instances row. Reuses rather
 * than duplicates:
 *   - getRoleCapabilities  from Milestone 2's challenge-library/repository.js
 *   - insertChallengeInstance from Milestone 3's challenge-engine/repository.js
 *     (that file exported it specifically so this module wouldn't need a
 *     fourth copy of the same insert)
 */
import { supabaseAdmin } from "../../supabase.js"
import { getRoleCapabilities } from "../challenge-library/repository.js"
import { insertChallengeInstance } from "../challenge-engine/repository.js"

export { getRoleCapabilities, insertChallengeInstance }

export async function logRejection({ attemptedRole, gate, reason, payload }) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_payload_rejections")
    .insert({
      attempted_role: attemptedRole || null,
      gate,
      reason,
      payload_snapshot: payload,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function emitAnalyticsEvent({ userId = null, instanceId = null, eventType, eventData = {} }) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_analytics_events")
    .insert({
      user_id: userId,
      instance_id: instanceId,
      event_type: eventType,
      event_data: eventData,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
