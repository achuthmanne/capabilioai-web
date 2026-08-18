/**
 * Skill Studio Content Admin — content/creator review queue.
 * ---------------------------------------------------------------------------
 * INTERNAL ONLY. Every route requires requireAuth + requireAdmin (the
 * EXISTING `profiles.is_admin` gate built for Arena V2 content authoring —
 * arena-v2/requireAdmin.js — reused rather than inventing a second admin
 * model, same choice questionBankAdmin.js already made).
 *
 * Mounted at the dedicated "/api/admin/skill-studio-content" namespace in
 * server.js — NOT bare "/api" — for the exact routing-shadow reason
 * documented at length in questionBankAdmin.js's own header (2026-07-24
 * fix): `router.use(requireAuth, requireAdmin)` with no path argument
 * match-alls every request Express hands this router, so mounting at a
 * broad prefix would have wrongly gated unrelated routes.
 *
 * GET    /                    — list/filter the review queue
 * GET    /:id                 — single job + full review/version history
 * POST   /sources              — register a content source (upload metadata)
 * POST   /generate              — request a new module draft (job_type='module')
 * POST   /:id/approve            — publish the draft to modules/module_content_blocks
 * POST   /:id/reject              — reject with a required reason
 * POST   /:id/edit                  — human-edit the draft output, stays in review
 * POST   /:id/regenerate              — re-run generation, replacing the draft
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/requireAdmin.js"
import {
  createContentSource, requestModuleGeneration, listJobs, getJob,
  approveJob, rejectJob, editJob, regenerateJob,
} from "../lib/skillStudio/contentQueue.js"

const router = Router()
router.use(requireAuth, requireAdmin)

router.get("/", async (req, res) => {
  try {
    const { status, jobType, limit, offset } = req.query
    const jobs = await listJobs({ status, jobType, limit: Number(limit) || 50, offset: Number(offset) || 0 })
    res.json({ jobs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/:id", async (req, res) => {
  try {
    const job = await getJob(req.params.id)
    if (!job) return res.status(404).json({ error: "Job not found" })
    res.json({ job })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/sources", async (req, res) => {
  try {
    const { sourceType, fileRef, extractedText } = req.body
    const source = await createContentSource({ uploadedBy: req.user.id, sourceType, fileRef, extractedText })
    res.json({ source })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/generate", async (req, res) => {
  try {
    const { skillName, jobTitle, level, teachingMode, contentSourceId } = req.body
    if (!skillName) return res.status(400).json({ error: "skillName is required" })
    const job = await requestModuleGeneration({ requestedBy: req.user.id, contentSourceId, skillName, jobTitle, level, teachingMode })
    res.json({ job })
  } catch (e) {
    console.error("[skillStudioContentAdmin/generate]", e.message)
    res.status(e.code === "generation_failed" ? 502 : 500).json({ error: e.message, jobId: e.jobId })
  }
})

router.post("/:id/approve", async (req, res) => {
  try {
    const result = await approveJob(req.params.id, { reviewerId: req.user.id, notes: req.body?.notes })
    res.json(result)
  } catch (e) {
    res.status(e.code === "invalid_transition" ? 409 : 500).json({ error: e.message })
  }
})

router.post("/:id/reject", async (req, res) => {
  try {
    const { notes } = req.body
    if (!notes) return res.status(400).json({ error: "A rejection reason (notes) is required" })
    const job = await rejectJob(req.params.id, { reviewerId: req.user.id, notes })
    res.json({ job })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/:id/edit", async (req, res) => {
  try {
    const { editedOutput, notes } = req.body
    if (!editedOutput) return res.status(400).json({ error: "editedOutput is required" })
    const job = await editJob(req.params.id, { reviewerId: req.user.id, editedOutput, notes })
    res.json({ job })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/:id/regenerate", async (req, res) => {
  try {
    const job = await regenerateJob(req.params.id, { reviewerId: req.user.id, notes: req.body?.notes })
    res.json({ job })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
