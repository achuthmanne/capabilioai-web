/**
 * arenaV2Submission.js — Arena V2, Milestone 8: Submission API
 * ---------------------------------------------------------------------------
 * Mounted at /api/av2/submissions in server.js. Thin HTTP wrapper around
 * submission-engine/service.js, exactly the same discipline as arenaV2Delivery.js
 * on the issuance side: no grading/rules/scoring logic lives in this file.
 *
 * This is the ONLY backend route a frontend workstation's submission can
 * reach — and even then, only indirectly: per your instruction, individual
 * workstations must never call this endpoint directly. The frontend's
 * Submission Client (frontend/src/api/arenaV2Submission.js) is the sole
 * caller, invoked only by ArenaV2ChallengeShell.jsx, never by a workstation
 * component itself.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { submitChallenge, InstanceNotFoundError, SubmissionEngineError } from "../lib/arena-v2/submission-engine/service.js"
import { SubmissionNotAllowedError } from "../lib/arena-v2/submission-engine/rules.js"
import { NotImplementedValidatorError } from "../lib/arena-v2/submission-validators/registry.js"

const router = Router()
router.use(requireAuth)

function handleSubmissionError(res, err) {
  if (err instanceof InstanceNotFoundError) return res.status(404).json({ error: err.message })
  if (err instanceof SubmissionNotAllowedError) return res.status(409).json({ error: err.message })
  if (err.name === "ConcurrentSubmissionError") return res.status(409).json({ error: err.message })
  if (err instanceof NotImplementedValidatorError) {
    // A workstation reached submission whose validator type has no grading
    // implementation yet — a real content/rollout gap, not a client error.
    // Never silently "pass" the student; surface it loudly server-side and
    // give the student an honest, generic message.
    console.error("[arenaV2Submission] No submission-validator implementation for this challenge's validator type", { type: err.type })
    return res.status(501).json({ error: "Grading for this challenge type isn't available yet — please try a different challenge." })
  }
  if (err instanceof SubmissionEngineError) return res.status(400).json({ error: err.message })
  console.error("[arenaV2Submission]", err)
  return res.status(500).json({ error: "Internal error" })
}

// POST / — submit an attempt for an already-issued challenge instance.
router.post("/", async (req, res) => {
  try {
    const { instanceId, submissionData, timeTakenSecs } = req.body || {}
    if (!instanceId) return res.status(400).json({ error: "instanceId is required" })
    if (!submissionData || typeof submissionData !== "object") {
      return res.status(400).json({ error: "submissionData is required" })
    }

    const dto = await submitChallenge({
      userId: req.user.id,
      instanceId,
      submissionData,
      timeTakenSecs: typeof timeTakenSecs === "number" ? timeTakenSecs : null,
    })

    res.status(200).json(dto)
  } catch (err) {
    handleSubmissionError(res, err)
  }
})

export default router
