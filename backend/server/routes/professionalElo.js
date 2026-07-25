/**
 * Professional ELO — status + history API.
 * PRODUCT DECISION (2026-07-25): Professional users get a visible
 * Professional ELO, driven ONLY by real Weekly Skill Pulse performance (see
 * backend/server/lib/professionalElo/eloEngine.js header for the full
 * rationale and how this is kept separate from the older
 * profile-completeness-driven ELO fields on `profiles`).
 *
 * UI RULE this route exists to support: never show a naked, unexplained ELO
 * number. Every response includes the latest event (old score, delta, why,
 * affected skills, next action) alongside the current number — the frontend
 * card is built to always render both together, never the number alone.
 *
 * GET /api/pro/elo/professional — current ELO + recent event history.
 *   Applies any pending inactivity decay first (lazy, same as
 *   GET /pro/weekly/current — see weeklyPulse.js).
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { getOrCreateEloState, applyPendingDecay, STARTING_ELO } from "../lib/professionalElo/eloEngine.js"

const router = Router()

router.get("/pro/elo/professional", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id

    await applyPendingDecay(supabaseAdmin, uid)
    const state = await getOrCreateEloState(supabaseAdmin, uid)

    const { data: events } = await supabaseAdmin
      .from("professional_elo_events")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10)

    const latest = (events || [])[0] || null

    res.json({
      elo: state.elo,
      starting_elo: STARTING_ELO,
      last_assessment_at: state.last_assessment_at,
      latest_change: latest ? {
        delta: latest.delta,
        old_elo: latest.old_elo,
        new_elo: latest.new_elo,
        reason: latest.reason,
        affected_skills: latest.affected_skills,
        next_action: latest.next_action,
        event_type: latest.event_type,
        created_at: latest.created_at,
      } : null,
      history: (events || []).map(e => ({
        delta: e.delta, old_elo: e.old_elo, new_elo: e.new_elo, reason: e.reason,
        affected_skills: e.affected_skills, event_type: e.event_type, created_at: e.created_at,
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
