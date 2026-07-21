// ─── backend/server/lib/eloLedger.js ──────────────────────────────────────────
// The ONE place in the entire codebase allowed to write to elo_events, which
// is the append-only ledger that institution_students.elo_current is derived
// from (via the trg_apply_elo_event trigger — see college_path_foundation_
// migration.sql §14). No route handler should ever run:
//   supabaseAdmin.from('institution_students').update({ elo_current: ... })
// directly. Every ELO change — task grading, challenge grading, interview
// scoring, manual admin correction — goes through recordEloEvent() so there
// is exactly one code path, one audit trail, and no way for a client-supplied
// score to become a student's ELO without passing through server logic.
//
// This closes the "client-authored ELO" item left open by the 2026-07-16
// certification audit, scoped to the College Path.
import { supabaseAdmin } from "./supabase.js"

const VALID_SOURCES = new Set([
  "arena_mission",
  "institution_task",
  "challenge_submission",
  "interview",
  "manual_admin_adjustment",
])

/**
 * Append an ELO event and let the DB trigger sync institution_students.elo_current.
 *
 * @param {object} params
 * @param {string} params.studentId    - institution_students.id (NOT auth user id)
 * @param {string} params.source       - one of VALID_SOURCES
 * @param {string} [params.sourceId]   - id of the assignment/interview/etc that caused this
 * @param {number} params.delta        - signed change, computed server-side, never from req.body directly
 * @param {string} [params.reviewerId] - REQUIRED when source === 'manual_admin_adjustment'
 * @returns {Promise<object>} the inserted elo_events row
 */
export async function recordEloEvent({ studentId, source, sourceId = null, delta, reviewerId = null }) {
  if (!studentId) throw new Error("recordEloEvent: studentId is required")
  if (!VALID_SOURCES.has(source)) throw new Error(`recordEloEvent: invalid source '${source}'`)
  if (typeof delta !== "number" || !Number.isFinite(delta)) {
    throw new Error("recordEloEvent: delta must be a finite number")
  }
  if (source === "manual_admin_adjustment" && !reviewerId) {
    throw new Error("recordEloEvent: manual_admin_adjustment requires reviewerId (two-person review)")
  }

  const { data: student, error: studentErr } = await supabaseAdmin
    .from("institution_students")
    .select("id, elo_current")
    .eq("id", studentId)
    .single()

  if (studentErr || !student) {
    throw new Error(`recordEloEvent: student ${studentId} not found (${studentErr?.message || "no row"})`)
  }

  const eloBefore = Number(student.elo_current) || 0
  const eloAfter  = eloBefore + delta

  const { data, error } = await supabaseAdmin
    .from("elo_events")
    .insert({
      student_id:  studentId,
      source,
      source_id:   sourceId,
      delta,
      elo_before:  eloBefore,
      elo_after:   eloAfter,
      created_by:  source === "manual_admin_adjustment" ? "admin" : "system",
      reviewer_id: reviewerId,
    })
    .select()
    .single()

  if (error) throw new Error(`recordEloEvent: insert failed — ${error.message}`)
  return data
}

/**
 * Read a student's ELO ledger (for transparency / dispute review).
 */
export async function getEloHistory(studentId, { limit = 50 } = {}) {
  const { data, error } = await supabaseAdmin
    .from("elo_events")
    .select("id, source, source_id, delta, elo_before, elo_after, created_by, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(`getEloHistory: ${error.message}`)
  return data
}
