/**
 * arenaV2Delivery.js — Arena V2, Milestone 6: Challenge Delivery API
 * ---------------------------------------------------------------------------
 * Mounted at /api/av2/challenges in server.js. This is the first Arena V2
 * route that a student's browser actually talks to — everything before this
 * milestone was library code (Milestones 3-5 deliberately shipped with no
 * route, per their own scope). This file adds no new selection/validation/
 * routing logic of its own; it's a thin HTTP wrapper around
 * challenge-delivery/service.js.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/arena-v2/requireAdmin.js"
import { getOrIssueChallenge } from "../lib/arena-v2/challenge-delivery/service.js"
import { buildChallengeResponseDto } from "../lib/arena-v2/challenge-delivery/dto.js"
import { getActiveInstanceForUser, expireAbandonedInstances } from "../lib/arena-v2/challenge-delivery/repository.js"
import { isInstanceExpired } from "../lib/arena-v2/challenge-delivery/expiry.js"
import { EntitlementError, NoEligibleContentError, ChallengeEngineError } from "../lib/arena-v2/challenge-engine/engine.js"
import { PayloadRejectedError } from "../lib/arena-v2/challenge-payload-validator/validator.js"
import { routeToWorkstation, UnknownWorkstationError } from "../lib/arena-v2/workstation-router/router.js"

const router = Router()
router.use(requireAuth)

function handleDeliveryError(res, err) {
  if (err instanceof EntitlementError) return res.status(403).json({ error: err.message })
  if (err instanceof NoEligibleContentError) return res.status(404).json({ error: err.message })
  if (err instanceof ChallengeEngineError) return res.status(400).json({ error: err.message })
  if (err instanceof PayloadRejectedError) {
    // Our own Challenge Engine produced a payload our own Validator rejected —
    // that's a content/config bug, not a client error. Log loudly, don't leak
    // internals to the student.
    console.error("[arenaV2Delivery] Engine produced a payload the Validator rejected", { gate: err.gate, issues: err.issues })
    return res.status(500).json({ error: "Unable to issue a challenge right now — please try again shortly." })
  }
  if (err instanceof UnknownWorkstationError) {
    console.error("[arenaV2Delivery] Workstation Router could not resolve a registered workstation", { workstation: err.workstation })
    return res.status(500).json({ error: "Unable to issue a challenge right now — please try again shortly." })
  }
  console.error("[arenaV2Delivery]", err)
  return res.status(500).json({ error: "Internal error" })
}

// POST /next — issue the next challenge, or resume the student's existing
// active instance for this (challengeType, role) if one hasn't expired.
router.post("/next", async (req, res) => {
  try {
    const { challengeType, role, industry, skill, difficulty, scenarioId } = req.body || {}
    if (!challengeType) return res.status(400).json({ error: "challengeType is required" })

    const { instance, routing, resumed } = await getOrIssueChallenge({
      userId: req.user.id,
      challengeType,
      role: role || null,
      industry: industry || null,
      skill: skill || null,
      difficulty: difficulty || null,
      scenarioId: scenarioId || null,
    })

    res.status(200).json(buildChallengeResponseDto({ instance, routing, resumed }))
  } catch (err) {
    handleDeliveryError(res, err)
  }
})

// GET /active — check for an existing active instance without issuing a new
// one. Returns 404 if none exists (this does NOT create a challenge).
router.get("/active", async (req, res) => {
  try {
    const { challengeType, role } = req.query
    if (!challengeType) return res.status(400).json({ error: "challengeType is required" })

    const existing = await getActiveInstanceForUser(req.user.id, { challengeType, role: role || null })
    if (!existing) return res.status(404).json({ error: "No active instance" })

    if (isInstanceExpired(existing)) return res.status(404).json({ error: "No active instance" })

    const routing = routeToWorkstation(existing)
    res.status(200).json(buildChallengeResponseDto({ instance: existing, routing, resumed: true }))
  } catch (err) {
    handleDeliveryError(res, err)
  }
})

// POST /expire-sweep — admin-only, manual/cron-callable bulk expiry.
// No scheduler is wired up yet (see docs/future-improvements.md) — this
// exists so expiry can be triggered today, by hand or by an external cron
// hitting this endpoint, without building scheduling infra as part of this milestone.
router.post("/expire-sweep", requireAdmin, async (req, res) => {
  try {
    const expired = await expireAbandonedInstances()
    res.status(200).json({ expiredCount: expired.length, expiredIds: expired.map((r) => r.id) })
  } catch (err) {
    handleDeliveryError(res, err)
  }
})

export default router
