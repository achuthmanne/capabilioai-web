/**
 * arenaBridge.js — Skill Studio's readiness gate + handoff into Arena.
 * ---------------------------------------------------------------------------
 * Arena V2 owns its own full pipeline (challenge-engine, submission-engine,
 * reward-engine, proofObjects) and is NOT touched by this file (spec §0/§7:
 * "do not replace Arena's validation pipeline"). This file only:
 *   1. computes a server-verified readiness score,
 *   2. records the handoff intent (arena_handoffs row),
 *   3. hands the LEARNER back to the existing Arena/Arena V2 surfaces —
 *      it does not generate or select a mission itself.
 *
 * Result ingestion (subscribing to AssessmentCompletedEvent to call
 * memoryEngine.reinforce()) is intentionally NOT wired into the live
 * arena-v2 submission route in this pass — splicing a new consumer into an
 * already-tested, scoring-critical pipeline without a dedicated regression
 * pass is exactly the kind of risk the standing engineering rules ask to be
 * flagged rather than done silently. `ingestAssessmentCompletedEvent` below
 * is a ready-to-wire, independently testable consumer function; hooking it
 * into arena-v2's actual event emission point is Phase 3 per the spec's
 * roadmap (shadow-mode first) and should land as its own reviewed change.
 */
import { supabaseAdmin } from "../supabase.js"
import { readDecayedState } from "./memoryEngine.js"
import { listForSkill, READINESS_BLOCKING_SEVERITY } from "./mistakePatterns.js"

const HANDOFFS = "arena_handoffs"

const MEMORY_READY_THRESHOLD = 0.6
const QUIZ_PASS_RATE_THRESHOLD = 0.7

export async function checkReadiness({ userId, skillGraphNodeId }) {
  const unmet = []

  const memory = await readDecayedState(userId, skillGraphNodeId)
  if (memory.confidence < MEMORY_READY_THRESHOLD) {
    unmet.push({ reason: "memory_confidence_below_threshold", current: memory.confidence, required: MEMORY_READY_THRESHOLD })
  }

  const { data: attempts, error: attErr } = await supabaseAdmin
    .from("quiz_attempts")
    .select("correct, quiz_questions!inner(skill_graph_node_id)")
    .eq("user_id", userId)
    .eq("quiz_questions.skill_graph_node_id", skillGraphNodeId)
    .order("created_at", { ascending: false })
    .limit(20)
  if (attErr) throw attErr
  const recent = attempts || []
  const passRate = recent.length ? recent.filter(a => a.correct).length / recent.length : 0
  if (recent.length === 0 || passRate < QUIZ_PASS_RATE_THRESHOLD) {
    unmet.push({ reason: "quiz_pass_rate_below_threshold", current: passRate, required: QUIZ_PASS_RATE_THRESHOLD, attemptsCount: recent.length })
  }

  const mistakes = await listForSkill(userId, skillGraphNodeId)
  const blocking = mistakes.filter(m => m.severity > READINESS_BLOCKING_SEVERITY)
  if (blocking.length > 0) {
    unmet.push({ reason: "unresolved_high_severity_mistakes", count: blocking.length })
  }

  return { ready: unmet.length === 0, unmet, memoryConfidence: memory.confidence, quizPassRate: passRate }
}

/**
 * handoff — re-verifies readiness SERVER-SIDE (never trusts a client-computed
 * readiness flag, since this unlocks Arena and Arena outcomes affect ELO —
 * this is a scoring-adjacent boundary). Records the handoff; does not
 * generate a mission — returns enough context for the frontend to navigate
 * into the existing Arena surface with the right domain pre-selected.
 */
export async function handoff({ userId, skillJourneyId, skillGraphNodeId, domainKey }) {
  const readiness = await checkReadiness({ userId, skillGraphNodeId })
  if (!readiness.ready) {
    const err = new Error("Not ready for Arena handoff")
    err.code = "not_ready"
    err.unmet = readiness.unmet
    throw err
  }

  const { data, error } = await supabaseAdmin
    .from(HANDOFFS)
    .insert({ user_id: userId, skill_journey_id: skillJourneyId })
    .select().single()
  if (error) throw error

  return { handoffId: data.id, domainKey: domainKey || null, readiness }
}

/**
 * ingestAssessmentCompletedEvent — NOT currently subscribed to anything live
 * (see docblock above). Given an Arena V2 AssessmentCompletedEvent-shaped
 * object, reinforces the corresponding memory state and marks the handoff
 * row as ingested. Kept here, independently callable/testable, for the
 * Phase 3 wiring step.
 */
export async function ingestAssessmentCompletedEvent({ userId, skillGraphNodeId, handoffId, passed }) {
  const { reinforce } = await import("./memoryEngine.js")
  await reinforce({ userId, skillGraphNodeId, source: "arena", correct: !!passed })
  if (handoffId) {
    await supabaseAdmin.from(HANDOFFS).update({ result_ingested_at: new Date().toISOString() }).eq("id", handoffId)
  }
}
