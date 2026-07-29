/**
 * eventLogger.js — writes to the PRE-EXISTING `learning_events` table.
 * ---------------------------------------------------------------------------
 * `learning_events` already existed live in Supabase before this build
 * (untracked, unused by any app code) with shape (id, user_id, event_type,
 * skill_id, module_id, score, elo_delta, metadata jsonb, created_at) — NOT
 * the (payload, occurred_at) shape originally sketched in the design doc.
 * This file targets the REAL shape. Never writes elo_delta for anything
 * Skill Studio does (Skill Studio never touches ELO — see arenaBridge.js /
 * memoryEngine.js docblocks); elo_delta stays null for every row this file writes.
 */
import { supabaseAdmin } from "../supabase.js"

const TABLE = "learning_events"

export async function logEvent({ userId, eventType, skillId = null, moduleId = null, score = null, metadata = {} }) {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .insert({ user_id: userId, event_type: eventType, skill_id: skillId, module_id: moduleId, score, metadata })
  if (error) console.error(`[skillStudio/eventLogger] ${eventType}:`, error.message) // never blocks the request on a logging failure
}
