/**
 * mistakePatterns.js — records recurring error signatures per (user, skill).
 * Fed by quizEngine on incorrect answers, and (future wiring, see
 * arenaBridge.js docblock) by Arena/interview result ingestion. Feeds the
 * Recommendation Engine as a high-urgency "revisit this module" signal.
 */
import { supabaseAdmin } from "../supabase.js"

const TABLE = "mistake_patterns"

export async function recordMistake({ userId, skillGraphNodeId, patternKey, source }) {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from(TABLE).select("*")
    .eq("user_id", userId).eq("skill_graph_node_id", skillGraphNodeId).eq("pattern_key", patternKey)
    .maybeSingle()
  if (fetchErr) throw fetchErr

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({
        occurrence_count: existing.occurrence_count + 1,
        severity: Math.min(5, existing.severity + 1),
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id).select().single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({ user_id: userId, skill_graph_node_id: skillGraphNodeId, pattern_key: patternKey, source, severity: 1 })
    .select().single()
  if (error) throw error
  return data
}

export async function listForSkill(userId, skillGraphNodeId) {
  const { data, error } = await supabaseAdmin
    .from(TABLE).select("*").eq("user_id", userId).eq("skill_graph_node_id", skillGraphNodeId)
    .order("severity", { ascending: false })
  if (error) throw error
  return data || []
}

/** Used by the Arena readiness gate — any unresolved mistake above this
 * severity blocks the "ready for Arena" state (spec §7, condition b). */
export const READINESS_BLOCKING_SEVERITY = 2
