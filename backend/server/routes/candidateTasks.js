/**
 * Candidate Tasks (outbound partner-bridge caller) — 2026-08-06
 * ---------------------------------------------------------------------------
 * A recruiter on capabilio-recruiter can assign a candidate a freeform task
 * (TasksChallenges.jsx there, backed by its own Supabase project's
 * tasks_challenges table). This app's own candidate has no session or
 * account on that side, so this route calls INTO capabilio-recruiter-
 * backend's new inbound bridge (src/routes/candidateTasks.js there) using
 * the same shared secret as the existing outbound bridge in
 * partnerBridge.js -- just the reverse direction. The secret never reaches
 * the browser; this route is itself protected by this app's own normal
 * session auth (requireAuth), and forwards req.user.id as the candidateId,
 * so a candidate can only ever see/submit their own tasks.
 *
 * Works for both student and professional path candidates -- tasks aren't
 * path-specific, they're just addressed to a real profiles.id.
 *
 * Required env vars on this service:
 *   CAPABILIO_RECRUITER_API_URL   e.g. https://capabilio-recruiter.onrender.com
 *   PARTNER_BRIDGE_SECRET         same value as the recruiter-side service
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"

const router = Router()

const RECRUITER_API_URL = process.env.CAPABILIO_RECRUITER_API_URL
const PARTNER_SECRET = process.env.PARTNER_BRIDGE_SECRET

async function callRecruiterBridge(method, path, { query = {}, body } = {}) {
  if (!RECRUITER_API_URL || !PARTNER_SECRET) {
    const err = new Error("Task bridge not configured (missing CAPABILIO_RECRUITER_API_URL or PARTNER_BRIDGE_SECRET)")
    err.status = 503
    throw err
  }
  const qs = new URLSearchParams(query).toString()
  const url = `${RECRUITER_API_URL}/api/partner/${path}${qs ? `?${qs}` : ""}`
  const res = await fetch(url, {
    method,
    headers: {
      "x-partner-secret": PARTNER_SECRET,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const responseBody = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(responseBody.error || `Task bridge request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return responseBody
}

// GET /api/candidate/tasks — tasks assigned to the logged-in candidate
router.get("/candidate/tasks", requireAuth, async (req, res) => {
  try {
    const data = await callRecruiterBridge("GET", "candidate-tasks", {
      query: { candidateId: req.user.id },
    })
    res.json(data)
  } catch (err) {
    console.error("[candidate/tasks]", err.message)
    res.status(err.status || 500).json({ error: err.message })
  }
})

// POST /api/candidate/tasks/:id/submit — { submissionText, submissionUrl }
router.post("/candidate/tasks/:id/submit", requireAuth, async (req, res) => {
  try {
    const submissionText = String(req.body?.submissionText || "").trim()
    const submissionUrl = String(req.body?.submissionUrl || "").trim()
    if (!submissionText && !submissionUrl) {
      return res.status(400).json({ error: "Add some text or a link before submitting." })
    }
    const data = await callRecruiterBridge("POST", `candidate-tasks/${req.params.id}/submit`, {
      body: { candidateId: req.user.id, submissionText, submissionUrl },
    })
    res.json(data)
  } catch (err) {
    console.error("[candidate/tasks/submit]", err.message)
    res.status(err.status || 500).json({ error: err.message })
  }
})

export default router
