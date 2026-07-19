/**
 * arenaV2Portfolio.js — Arena V2, Milestone 10: Portfolio & Recruiter Evidence API
 * ---------------------------------------------------------------------------
 * Phase 1A (Evidence System unification, 2026-07-20): this router now reads
 * and writes `proof_objects` exclusively, not `av2_portfolio_artifacts`.
 * Confirmed before migrating: zero frontend consumers of these three
 * endpoints existed at the time of the switch, so this was a safe cutover —
 * no user-facing flow depended on the old table's data being live. The
 * legacy `av2_portfolio_artifacts` write in portfolio/engine.js is left in
 * place only because the e2e suite still asserts against it; nothing reads
 * it through this router anymore.
 *
 * Three endpoints, same contract as before, different backing store:
 *   GET  /mine                       — the authenticated student's own proof
 *                                       objects (any publish_state, including
 *                                       drafts and not_applicable ones)
 *   POST /:id/publish                — self-selected publish: flips a
 *                                       'not_published' draft proof to
 *                                       'self_selected'. A 'not_applicable'
 *                                       proof (common challenge, or scored
 *                                       too low with no manual-publish
 *                                       allowance) can never be published —
 *                                       same 409 pattern as an
 *                                       already-published one, so the client
 *                                       doesn't need to special-case it.
 *   GET  /candidates/:userId/evidence — recruiter-facing read: only proofs
 *                                       with is_recruiter_visible=true, via
 *                                       buildRecruiterEvidenceViewFromProof —
 *                                       never the raw proof_objects row
 *                                       (which includes final_submission,
 *                                       ai_evaluation internals, etc.).
 *
 * KNOWN GAP, unchanged from before: there is no dedicated recruiter-role/auth
 * model yet. The recruiter-facing endpoint below is gated by requireAuth
 * only (any authenticated user). It only ever exposes proofs the student has
 * already made recruiter-visible, never drafts, so this is a real but
 * bounded gap. See docs/future-improvements.md.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import * as proofRepo from "../lib/arena-v2/proofObjects/repository.js"
import { buildRecruiterEvidenceViewFromProof } from "../lib/arena-v2/portfolio/recruiterEvidence.js"

const router = Router()
router.use(requireAuth)

function toProofSummaryDto(proof) {
  // Client-safe shape for the student's own "my portfolio" view — omits
  // final_submission/ai_evaluation/validator_result internals, same
  // no-internal-fields discipline as the public /api/proofs route.
  return {
    id: proof.id,
    domain: proof.domain,
    skill: proof.skill,
    title: proof.title,
    challengeType: proof.challenge_type,
    difficulty: proof.difficulty,
    score: proof.score,
    trustLevel: proof.trust_level,
    publishState: proof.publish_state,
    isPortfolioVisible: proof.is_portfolio_visible,
    isRecruiterVisible: proof.is_recruiter_visible,
    completedAt: proof.completed_at,
  }
}

// GET /mine — the authenticated student's own proof objects, any publish_state.
router.get("/mine", async (req, res) => {
  try {
    const proofs = await proofRepo.listForUser(req.user.id)
    res.status(200).json({ artifacts: proofs.map(toProofSummaryDto) })
  } catch (err) {
    console.error("[arenaV2Portfolio] GET /mine", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /:id/publish — self-selected publish of a draft proof the student owns.
router.post("/:id/publish", async (req, res) => {
  try {
    const proof = await proofRepo.getById(req.params.id)
    if (!proof) return res.status(404).json({ error: "Proof not found" })
    // Ownership check — never trust the client-supplied id alone.
    if (proof.user_id !== req.user.id) return res.status(404).json({ error: "Proof not found" })

    if (proof.publish_state !== "not_published") {
      // Already published (auto_published/self_selected), or permanently
      // not_applicable (never eligible) — idempotent no-op reported as a
      // conflict rather than silently doing nothing, so the client can
      // distinguish "already done"/"not eligible" from "just did it".
      return res.status(409).json({ error: "Proof cannot be published from its current state", publishState: proof.publish_state })
    }

    const updated = await proofRepo.updatePublishState(proof.id, "self_selected")
    res.status(200).json(toProofSummaryDto(updated))
  } catch (err) {
    console.error("[arenaV2Portfolio] POST /:id/publish", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /candidates/:userId/evidence — recruiter-facing read of only recruiter-visible proofs.
router.get("/candidates/:userId/evidence", async (req, res) => {
  try {
    const proofs = await proofRepo.listRecruiterVisibleForUser(req.params.userId)
    res.status(200).json({ evidence: proofs.map(buildRecruiterEvidenceViewFromProof) })
  } catch (err) {
    console.error("[arenaV2Portfolio] GET /candidates/:userId/evidence", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
