/**
 * arenaV2Library.js — Arena V2, Milestone 2: Challenge Library routes
 * ---------------------------------------------------------------------------
 * Mounted at /api/av2/library in server.js. Deliberately a new mount path,
 * not an addition to the existing /api/arena/v2 (arenaV2.js) — that file is
 * Arena V1's fragmented "v2" naming (per the dependency audit, one of three
 * parallel legacy pipelines) and stays frozen and untouched.
 *
 * Read endpoints: any authenticated user (students need to read Capability
 * Registry / Skill Graph / Scenario Pack / Challenge Template data to play).
 * Write endpoints: requireAdmin (content authoring only).
 *
 * ValidationError from validators.js -> 400 with `issues` array.
 * Any other thrown error (from the Supabase layer) -> 500, message only in
 * non-production to avoid leaking internals.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { requireAdmin } from "../lib/arena-v2/requireAdmin.js"
import * as repo from "../lib/arena-v2/challenge-library/repository.js"
import { listSkillProgressForUser, getLatestEloForRole } from "../lib/arena-v2/reward-engine/repository.js"
import {
  ValidationError,
  validateRoleCapabilities,
  validateSkillGraph,
  validateScenarioPack,
  validateDataset,
  validateDatasetVersion,
  validateChallengeTemplate,
  validateChallengeTemplateVersion,
} from "../lib/arena-v2/challenge-library/validators.js"

const router = Router()

function handle(res, err) {
  if (err instanceof ValidationError) return res.status(400).json({ error: err.message, issues: err.issues })
  console.error("[arenaV2Library]", err)
  return res.status(500).json({ error: "Internal error", detail: process.env.NODE_ENV === "production" ? undefined : err.message })
}

router.use(requireAuth)

// ── Role Capabilities ────────────────────────────────────────────────────────

router.get("/role-capabilities", async (req, res) => {
  try {
    res.json(await repo.listRoleCapabilities({ careerFamily: req.query.careerFamily }))
  } catch (err) { handle(res, err) }
})

router.get("/role-capabilities/:role", async (req, res) => {
  try {
    const row = await repo.getRoleCapabilities(req.params.role, req.query.careerFamily || "IT")
    if (!row) return res.status(404).json({ error: "Not found" })
    res.json(row)
  } catch (err) { handle(res, err) }
})

router.post("/role-capabilities", requireAdmin, async (req, res) => {
  try {
    const clean = validateRoleCapabilities(req.body)
    res.status(201).json(await repo.upsertRoleCapabilities(clean))
  } catch (err) { handle(res, err) }
})

router.delete("/role-capabilities/:role", requireAdmin, async (req, res) => {
  try {
    await repo.deleteRoleCapabilities(req.params.role, req.query.careerFamily || "IT")
    res.status(204).end()
  } catch (err) { handle(res, err) }
})

// ── My Progress (Arena V2 Pilot Phase) ───────────────────────────────────────
// The authenticated student's own real skill-progress + ELO state — reads
// only, backed entirely by reward-engine/repository.js (the same tables
// the Reward Engine itself writes; no separate/duplicated progress store).
// Used by the ML/AI Engineer pilot workspace's Career Skills radar.
router.get("/my-progress", async (req, res) => {
  try {
    const { role, careerFamily = "IT" } = req.query
    const [skillProgress, elo] = await Promise.all([
      listSkillProgressForUser(req.user.id, careerFamily),
      role ? getLatestEloForRole(req.user.id, role) : Promise.resolve(null),
    ])
    res.json({ skillProgress, elo })
  } catch (err) { handle(res, err) }
})

// ── Skill Dependency Graphs ──────────────────────────────────────────────────

router.get("/skill-graphs/:role", async (req, res) => {
  try {
    const row = await repo.getActiveSkillGraph(req.params.role, req.query.careerFamily || "IT")
    if (!row) return res.status(404).json({ error: "No active skill graph for this role" })
    res.json(row)
  } catch (err) { handle(res, err) }
})

router.get("/skill-graphs/:role/versions", requireAdmin, async (req, res) => {
  try {
    res.json(await repo.listSkillGraphVersions(req.params.role, req.query.careerFamily || "IT"))
  } catch (err) { handle(res, err) }
})

router.post("/skill-graphs", requireAdmin, async (req, res) => {
  try {
    const clean = validateSkillGraph(req.body)
    res.status(201).json(await repo.createSkillGraphVersion(clean, { markActive: req.body.isActive !== false }))
  } catch (err) { handle(res, err) }
})

// ── Scenario Packs ───────────────────────────────────────────────────────────

router.get("/scenario-packs", async (req, res) => {
  try {
    res.json(await repo.listScenarioPacks({ status: req.query.status, industry: req.query.industry }))
  } catch (err) { handle(res, err) }
})

router.get("/scenario-packs/:slug", async (req, res) => {
  try {
    const row = await repo.getScenarioPack(req.params.slug, req.query.version)
    if (!row) return res.status(404).json({ error: "Not found" })
    res.json(row)
  } catch (err) { handle(res, err) }
})

router.post("/scenario-packs", requireAdmin, async (req, res) => {
  try {
    const clean = validateScenarioPack(req.body)
    res.status(201).json(await repo.createScenarioPack(clean))
  } catch (err) { handle(res, err) }
})

router.patch("/scenario-packs/:id/status", requireAdmin, async (req, res) => {
  try {
    if (!["active", "draft", "archived"].includes(req.body.status)) {
      return res.status(400).json({ error: "status must be one of active, draft, archived" })
    }
    res.json(await repo.updateScenarioPackStatus(req.params.id, req.body.status))
  } catch (err) { handle(res, err) }
})

// ── Datasets + Dataset Versions ──────────────────────────────────────────────

router.post("/datasets", requireAdmin, async (req, res) => {
  try {
    const clean = validateDataset(req.body)
    res.status(201).json(await repo.createDataset(clean))
  } catch (err) { handle(res, err) }
})

router.get("/datasets/:datasetId/versions", requireAdmin, async (req, res) => {
  try {
    res.json(await repo.listDatasetVersions(req.params.datasetId))
  } catch (err) { handle(res, err) }
})

router.get("/datasets/:datasetId/active-version", async (req, res) => {
  try {
    const row = await repo.getActiveDatasetVersion(req.params.datasetId)
    if (!row) return res.status(404).json({ error: "No active version for this dataset" })
    res.json(row)
  } catch (err) { handle(res, err) }
})

router.post("/datasets/:datasetId/versions", requireAdmin, async (req, res) => {
  try {
    const clean = validateDatasetVersion({ ...req.body, datasetId: req.params.datasetId })
    res.status(201).json(await repo.createDatasetVersion(clean, { markActive: req.body.isActive !== false }))
  } catch (err) { handle(res, err) }
})

// ── Challenge Templates + Versions ───────────────────────────────────────────

router.get("/challenge-templates", async (req, res) => {
  try {
    res.json(await repo.listChallengeTemplates({
      challengeType: req.query.challengeType,
      role: req.query.role,
      skill: req.query.skill,
      status: req.query.status,
    }))
  } catch (err) { handle(res, err) }
})

router.get("/challenge-templates/:id", async (req, res) => {
  try {
    const template = await repo.getChallengeTemplate(req.params.id)
    if (!template) return res.status(404).json({ error: "Not found" })
    const activeVersion = await repo.getActiveChallengeTemplateVersion(req.params.id)
    res.json({ ...template, activeVersion })
  } catch (err) { handle(res, err) }
})

router.post("/challenge-templates", requireAdmin, async (req, res) => {
  try {
    const clean = validateChallengeTemplate(req.body)
    res.status(201).json(await repo.createChallengeTemplate(clean))
  } catch (err) { handle(res, err) }
})

router.patch("/challenge-templates/:id", requireAdmin, async (req, res) => {
  try {
    const allowed = ["status", "skill", "workstation", "scenarioPackId", "scenarioId"]
    const patch = {}
    for (const k of allowed) if (k in req.body) patch[{
      status: "status", skill: "skill", workstation: "workstation",
      scenarioPackId: "scenario_pack_id", scenarioId: "scenario_id",
    }[k]] = req.body[k]
    res.json(await repo.updateChallengeTemplate(req.params.id, patch))
  } catch (err) { handle(res, err) }
})

router.get("/challenge-templates/:id/versions", requireAdmin, async (req, res) => {
  try {
    res.json(await repo.listChallengeTemplateVersions(req.params.id))
  } catch (err) { handle(res, err) }
})

router.post("/challenge-templates/:id/versions", requireAdmin, async (req, res) => {
  try {
    const clean = validateChallengeTemplateVersion(req.body)
    res.status(201).json(await repo.createChallengeTemplateVersion(req.params.id, clean, { markActive: req.body.isActive !== false }))
  } catch (err) { handle(res, err) }
})

export default router
