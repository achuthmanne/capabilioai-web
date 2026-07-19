/**
 * routes/proofs.js — Engineering Proofs API (Portfolio redesign, 2026-07-20)
 * ---------------------------------------------------------------------------
 * Public read endpoints backing the Portfolio page's "Engineering Proofs" tab.
 * Intentionally NOT behind requireAuth — a public portfolio (e.g. shared with
 * a recruiter who isn't logged in) must be viewable without an account, same
 * as the rest of Portfolio.jsx today. Only rows with is_portfolio_visible=true
 * are ever returned here — private/draft proofs are never exposed this way
 * (that's a separate, authenticated "my proofs" concern for a later phase,
 * same pattern arenaV2Portfolio.js already draws between /mine and
 * /candidates/:userId/evidence).
 *
 * No writes happen through this router at all — proof_objects is written only
 * by the assessment pipeline (portfolio/engine.js) and the one-off backfill
 * script, per the migration's RLS comment.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

function toProofSummaryDto(p) {
  // Client-safe summary — omits raw validator_result/build_output payloads,
  // which can be large and are only needed on the detail view.
  return {
    id: p.id,
    domain: p.domain,
    skill: p.skill,
    skillsDemonstrated: p.skills_demonstrated || [],
    challengeType: p.challenge_type,
    difficulty: p.difficulty,
    title: p.title,
    tags: p.tags || [],
    score: p.score,
    eloDelta: p.elo_delta,
    timeTakenSecs: p.time_taken_secs,
    trustLevel: p.trust_level,
    completedAt: p.completed_at,
  }
}

function toProofDetailDto(p) {
  return {
    ...toProofSummaryDto(p),
    problemStatement: p.problem_statement,
    finalSubmission: p.final_submission,
    snapshots: p.snapshots || [], // always [] today — reserved for the replay feature
    buildOutput: p.build_output,
    aiEvaluation: p.ai_evaluation,
    validatorResult: p.validator_result,
    artifacts: p.artifacts || [],
  }
}

// GET /api/proofs/:userId — grouped by domain, with search/filter/sort.
// Query params: q (search title/skill/tags), difficulty, technology (matches
// tags or skillsDemonstrated), minScore, sort=newest|hardest|highest (default newest)
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params
    const { q, difficulty, technology, minScore, sort = "newest" } = req.query

    const { data, error } = await supabaseAdmin
      .from("proof_objects")
      .select("*")
      .eq("user_id", userId)
      .eq("is_portfolio_visible", true)
    if (error) throw error

    let proofs = data || []

    if (q) {
      const needle = String(q).toLowerCase()
      proofs = proofs.filter(p =>
        (p.title || "").toLowerCase().includes(needle) ||
        (p.skill || "").toLowerCase().includes(needle) ||
        (p.tags || []).some(t => String(t).toLowerCase().includes(needle))
      )
    }
    if (difficulty) proofs = proofs.filter(p => (p.difficulty || "").toLowerCase() === String(difficulty).toLowerCase())
    if (technology) {
      const needle = String(technology).toLowerCase()
      proofs = proofs.filter(p =>
        (p.skills_demonstrated || []).some(s => String(s).toLowerCase().includes(needle)) ||
        (p.tags || []).some(t => String(t).toLowerCase().includes(needle))
      )
    }
    if (minScore) proofs = proofs.filter(p => (p.score ?? 0) >= Number(minScore))

    const DIFFICULTY_RANK = { easy: 1, medium: 2, hard: 3, expert: 4 }
    if (sort === "hardest") {
      proofs.sort((a, b) => (DIFFICULTY_RANK[(b.difficulty || "").toLowerCase()] || 0) - (DIFFICULTY_RANK[(a.difficulty || "").toLowerCase()] || 0))
    } else if (sort === "highest") {
      proofs.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    } else {
      proofs.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    }

    // Group by domain for the "Embedded Systems (187 proofs)" style rollup
    const groups = {}
    for (const p of proofs) {
      if (!groups[p.domain]) groups[p.domain] = []
      groups[p.domain].push(toProofSummaryDto(p))
    }
    const domains = Object.entries(groups)
      .map(([domain, items]) => ({ domain, count: items.length, proofs: items }))
      .sort((a, b) => b.count - a.count)

    res.status(200).json({ totalCount: proofs.length, domains })
  } catch (err) {
    console.error("[proofs] GET /:userId", err.message)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /api/proofs/:userId/:proofId — full detail for one proof (challenge detail page)
router.get("/:userId/:proofId", async (req, res) => {
  try {
    const { userId, proofId } = req.params
    const { data, error } = await supabaseAdmin
      .from("proof_objects")
      .select("*")
      .eq("id", proofId)
      .eq("user_id", userId)
      .eq("is_portfolio_visible", true)
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: "Proof not found" })
    res.status(200).json(toProofDetailDto(data))
  } catch (err) {
    console.error("[proofs] GET /:userId/:proofId", err.message)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
