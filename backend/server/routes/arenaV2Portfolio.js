/**
 * arenaV2Portfolio.js — Arena V2, Milestone 10: Portfolio & Recruiter Evidence API
 * ---------------------------------------------------------------------------
 * Thin HTTP wrapper around portfolio/repository.js + portfolio/recruiterEvidence.js,
 * same discipline as arenaV2Delivery.js and arenaV2Submission.js: no eligibility
 * or scoring logic lives in this file — decidePortfolioPublication() already ran
 * inside submission-engine/service.js at submission time (Milestone 10's
 * Portfolio Decision -> Portfolio Artifact step). This route only ever *reads*
 * artifacts that already exist, or flips an already-created draft's
 * publish_state — it never creates a new artifact.
 *
 * Three endpoints:
 *   GET  /mine                       — the authenticated student's own artifacts
 *                                       (any publish_state, including drafts)
 *   POST /:id/publish                — self-selected publish: flips a
 *                                       'not_published' draft to
 *                                       'self_selected' (per the frozen
 *                                       verification semantics — only
 *                                       possible when portfolio/decision.js
 *                                       already allowed manual publish below
 *                                       threshold; auto_published artifacts
 *                                       are already published and this is a
 *                                       no-op/409 for them)
 *   GET  /candidates/:userId/evidence — recruiter-facing read: only
 *                                       PUBLISHED artifacts (auto_published or
 *                                       self_selected), via
 *                                       buildRecruiterEvidenceView — never the
 *                                       raw artifact row.
 *
 * KNOWN GAP, flagged rather than half-solved: there is no dedicated
 * recruiter-role/auth model yet. The recruiter-facing endpoint below is
 * gated by requireAuth only (any authenticated user), not by a recruiter
 * permission check — because that role/permission system doesn't exist
 * elsewhere in this codebase yet either. It only ever exposes artifacts the
 * student has already chosen to make PUBLIC (auto_published or
 * self_selected), never drafts, so this is a real but bounded gap. See
 * docs/future-improvements.md.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import {
  listArtifactsForUser,
  listPublishedArtifactsForUser,
  getArtifactById,
  updatePublishState,
} from "../lib/arena-v2/portfolio/repository.js"
import { buildRecruiterEvidenceView } from "../lib/arena-v2/portfolio/recruiterEvidence.js"

const router = Router()
router.use(requireAuth)

function toArtifactSummaryDto(artifact) {
  // Client-safe shape for the student's own "my portfolio" view — same
  // no-internal-fields discipline as submission-engine/dto.js's rewards/
  // portfolio blocks.
  return {
    id: artifact.id,
    instanceId: artifact.instance_id,
    artifactType: artifact.artifact_type,
    publishState: artifact.publish_state,
    recruiterEvidence: artifact.recruiter_evidence,
    createdAt: artifact.created_at,
  }
}

// GET /mine — the authenticated student's own artifacts, any publish_state.
router.get("/mine", async (req, res) => {
  try {
    const artifacts = await listArtifactsForUser(req.user.id)
    res.status(200).json({ artifacts: artifacts.map(toArtifactSummaryDto) })
  } catch (err) {
    console.error("[arenaV2Portfolio] GET /mine", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /:id/publish — self-selected publish of a draft artifact the student owns.
router.post("/:id/publish", async (req, res) => {
  try {
    const artifact = await getArtifactById(req.params.id)
    if (!artifact) return res.status(404).json({ error: "Artifact not found" })
    // Ownership check — never trust the client-supplied id alone (never trust
    // client input, per the same rule every other Arena V2 route follows).
    if (artifact.user_id !== req.user.id) return res.status(404).json({ error: "Artifact not found" })

    if (artifact.publish_state !== "not_published") {
      // Already published (auto_published or previously self_selected) —
      // idempotent no-op reported as a conflict rather than silently
      // re-publishing, so the client can distinguish "already done" from
      // "just did it".
      return res.status(409).json({ error: "Artifact is already published", publishState: artifact.publish_state })
    }

    const updated = await updatePublishState(artifact.id, "self_selected")
    res.status(200).json(toArtifactSummaryDto(updated))
  } catch (err) {
    console.error("[arenaV2Portfolio] POST /:id/publish", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// GET /candidates/:userId/evidence — recruiter-facing read of only published artifacts.
router.get("/candidates/:userId/evidence", async (req, res) => {
  try {
    const artifacts = await listPublishedArtifactsForUser(req.params.userId)
    res.status(200).json({ evidence: artifacts.map(buildRecruiterEvidenceView) })
  } catch (err) {
    console.error("[arenaV2Portfolio] GET /candidates/:userId/evidence", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
