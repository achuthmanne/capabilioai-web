/**
 * routes/arenaActivity.js — Arena rebuild, Phase B — cross-branch activity stats
 * ---------------------------------------------------------------------------
 * Read-only aggregation over BOTH branches' submission tables
 * (domain_submissions.created_at, college_submissions.submitted_at — note
 * the different column name, verified against routes/arenaCollegeStream.js
 * before writing this query). This does NOT violate the "keep the branches
 * structurally separate" rule from the rebuild spec — that rule is about
 * evaluation/scoring logic staying independent (each branch still owns its
 * own evaluator, its own routes for missions/experiments/submit). This file
 * only reads timestamps for a reporting view; it writes nothing and
 * contains no scoring logic of its own.
 *
 * The actual calendar/streak/week math lives in
 * lib/activity/computeSummary.js as a pure function (unit tested) — this
 * route is just the fetch + shape-into-events glue.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { computeActivitySummary } from "../lib/activity/computeSummary.js"

const router = Router()
const CALENDAR_DAYS = 84
const DAY_MS = 24 * 60 * 60 * 1000

// GET /api/arena/activity/summary
// Auth required — this is inherently "my own activity," never another
// user's (unlike the Domain Role leaderboard, which is intentionally
// cross-user and scoped down to display-name + role ELO only).
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const since = new Date(Date.now() - CALENDAR_DAYS * DAY_MS).toISOString()

    const [domainRes, collegeRes] = await Promise.all([
      supabaseAdmin
        .from("domain_submissions")
        .select("created_at, elo_delta, passed")
        .eq("user_id", req.user.id)
        .eq("passed", true)
        .gte("created_at", since),
      supabaseAdmin
        .from("college_submissions")
        .select("submitted_at, elo_delta, passed")
        .eq("user_id", req.user.id)
        .eq("passed", true)
        .gte("submitted_at", since),
    ])
    if (domainRes.error) throw domainRes.error
    if (collegeRes.error) throw collegeRes.error

    const events = [
      ...(domainRes.data || []).map(r => ({ date: r.created_at, elo: r.elo_delta || 0, branch: "domain" })),
      ...(collegeRes.data || []).map(r => ({ date: r.submitted_at, elo: r.elo_delta || 0, branch: "college" })),
    ]

    res.json(computeActivitySummary(events))
  } catch (err) {
    console.error("[arenaActivity] GET /summary", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
