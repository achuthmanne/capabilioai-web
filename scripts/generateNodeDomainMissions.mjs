#!/usr/bin/env node
/**
 * generateNodeDomainMissions.mjs — Phase 6 (Software Engineering roles).
 *
 * Same integrity discipline and structure as generatePythonDomainMissions.mjs
 * (that file's own header documents the "never trust the AI's claimed
 * output, only its code" rule in full) — this is the node_runner sibling,
 * for roles whose real auraSkills are JS/Node-shaped: Software Engineer,
 * Backend Developer, Full Stack Developer, Frontend Developer (framed as
 * pure-function JS logic — see prompts/domainRole.js's
 * nodeMissionGeneration prompt for why).
 *
 * Usage:
 *   TARGET_ROLES=swe,backend,fullstack,frontend node scripts/generateNodeDomainMissions.mjs
 *   DELETE_MISSION_IDS=<uuid>,<uuid> TARGET_ROLES=swe node ... (replace stale content first)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { AIService } = await import("../backend/server/lib/ai/aiService.js")
const { ValidationError } = await import("../backend/server/lib/ai/responseValidator.js")
const { runNode, scanForDangerousPatterns, checkNodeAvailable } = await import("../backend/server/lib/collegeStream/nodeSandbox.js")
const { getRoleConfig } = await import("../frontend/src/config/roleConfig.js")

const DIFFICULTY_PLAN = ["easy", "easy", "medium", "hard"]
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3
const MAX_RATE_LIMIT_RETRIES = 5
const GENERATION_PACING_MS = 12000
const NODE_TIMEOUT_MS = 5000

function log(msg) { console.log(`[generateNodeDomainMissions] ${msg}`) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isRateLimitError(err) { return err?.status === 429 || /rate_limit_exceeded|\b429\b/i.test(err?.message || "") }
function extractRetryDelayMs(err, fallbackMs = 20000) {
  const match = /try again in ([\d.]+)s/i.exec(err?.message || "")
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : fallbackMs
}

async function fetchFewShotExamples() {
  const { data, error } = await supabaseAdmin
    .from("domain_missions")
    .select("title,difficulty,prompt,reference_solution,rubric")
    .eq("panel_type", "python_runner")
    .order("created_at")
    .limit(2)
  if (error) throw error
  if (!data || data.length === 0) throw new Error("No live python_runner missions found to use as style few-shot — aborting.")
  return data
}

// Few-shot is style/shape only (title/prompt/expected-output framing) —
// borrowed from the ML Engineer Python missions since no node_runner
// mission exists yet to bootstrap from, same "borrow shape from a
// sibling panel type" move generateCollegeStreamContent.mjs made
// borrowing CSE's real examples.
function buildFewShotBlock(examples) {
  return examples.map((e, i) => `Example ${i + 1} (${e.difficulty}, illustrates STYLE/SHAPE only — different language, ignore the Python-specific code):
  title: ${e.title}
  prompt: ${e.prompt}
  expected_stdout: ${e.rubric?.expected_stdout}`).join("\n\n")
}

function normalizeForDedup(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim()
}
function wordOverlapRatio(a, b) {
  const wa = new Set(normalizeForDedup(a).split(" ").filter(Boolean))
  const wb = new Set(normalizeForDedup(b).split(" ").filter(Boolean))
  if (wa.size === 0 || wb.size === 0) return 0
  let shared = 0
  for (const w of wa) if (wb.has(w)) shared++
  return shared / Math.min(wa.size, wb.size)
}
function isDuplicateOfExisting(mission, existingMissions) {
  const normTitle = normalizeForDedup(mission.title)
  for (const existing of existingMissions) {
    if (normalizeForDedup(existing.title) === normTitle) return `duplicate title of existing mission "${existing.title}"`
    if (wordOverlapRatio(mission.prompt, existing.prompt) >= 0.75) return `near-duplicate prompt of existing mission "${existing.title}"`
  }
  return null
}

function remainingSlots(existingMissions) {
  const counts = {}
  for (const m of existingMissions) counts[m.difficulty] = (counts[m.difficulty] || 0) + 1
  const remaining = []
  for (const difficulty of DIFFICULTY_PLAN) {
    if (counts[difficulty] > 0) counts[difficulty]--
    else remaining.push(difficulty)
  }
  return remaining
}

async function reviewMissionQuality(role, difficulty, mission) {
  let review
  try {
    const { data } = await AIService.executePrompt("domainRole.nodeMissionReview", {
      roleLabel: role.label, roleSkillsList: role.auraSkills.join(", "), difficulty, title: mission.title, prompt: mission.prompt,
    })
    review = data
  } catch (err) {
    if (err instanceof ValidationError) return "quality review returned invalid JSON — treating as a failed review, not a pass"
    throw err
  }
  const failed = !review.matches_real_skill || !review.is_realistic_production_task || !review.junior_appropriate || !review.teaches_measurable_skill || !review.not_toy_problem
  if (failed) return `quality review rejected: ${review.reason || "no reason given"}`
  return null
}

async function attemptGeneration(role, difficulty, fewShotBlock, existingMissions) {
  let parsed
  try {
    const { data } = await AIService.executePrompt("domainRole.nodeMissionGeneration", {
      roleLabel: role.label, roleSkillsList: role.auraSkills.join(", "), difficulty, fewShotBlock,
    })
    parsed = data
  } catch (err) {
    if (err instanceof ValidationError) return { rejected: `AI response failed validation: ${err.message}` }
    throw err
  }

  if (scanForDangerousPatterns(parsed.referenceSolution)) {
    return { rejected: "reference solution uses a disallowed operation (fs/network/process access)" }
  }

  let run
  try {
    run = await runNode(parsed.referenceSolution, { timeoutMs: NODE_TIMEOUT_MS })
  } catch (err) {
    return { rejected: `sandbox error: ${err.message}` }
  }
  if (run.timedOut) return { rejected: "reference solution timed out or exceeded resource limits" }
  if (run.exitCode !== 0) return { rejected: `reference solution exited with code ${run.exitCode}: ${run.stderr.trim().slice(0, 200)}` }
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return { rejected: "reference solution produced empty stdout — degenerate mission" }

  const dupReason = isDuplicateOfExisting(parsed, existingMissions)
  if (dupReason) return { rejected: dupReason }

  const reviewReason = await reviewMissionQuality(role, difficulty, parsed)
  if (reviewReason) return { rejected: reviewReason }

  return {
    mission: {
      domain_role_id: role.id,
      panel_type: "node_runner",
      title: parsed.title.trim(),
      prompt: parsed.prompt.trim(),
      difficulty,
      elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
      time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      rubric: { type: "node_stdout_match", timeout_ms: NODE_TIMEOUT_MS, expected_stdout: expectedStdout },
      reference_solution: parsed.referenceSolution,
      source: "ai_generated",
    },
  }
}

async function generateForRole(role, fewShotBlock, existingMissions = []) {
  const result = { roleId: role.id, roleLabel: role.label, inserted: 0, rejections: [] }
  const missionsToInsert = []
  const slots = remainingSlots(existingMissions)
  result.totalSlots = slots.length
  if (slots.length === 0) { result.alreadyComplete = true; return result }

  for (const difficulty of slots) {
    let slotFilled = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SLOT && !slotFilled; attempt++) {
      let outcome = null
      let rateLimitRetries = 0
      for (;;) {
        try {
          outcome = await attemptGeneration(role, difficulty, fewShotBlock, [...existingMissions, ...missionsToInsert])
          break
        } catch (err) {
          if (isRateLimitError(err) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
            rateLimitRetries++
            const waitMs = extractRetryDelayMs(err)
            log(`  ${role.label} / ${difficulty}: rate-limited, waiting ${Math.round(waitMs / 1000)}s (retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})…`)
            await sleep(waitMs)
            continue
          }
          result.rejections.push({ difficulty, attempt, reason: `infra error: ${err.message}` })
          outcome = null
          break
        }
      }
      if (!outcome) break
      if (outcome.mission) { missionsToInsert.push(outcome.mission); slotFilled = true }
      else result.rejections.push({ difficulty, attempt, reason: outcome.rejected })
      await sleep(GENERATION_PACING_MS)
    }
    if (!slotFilled) log(`  ${role.label} / ${difficulty}: all ${MAX_ATTEMPTS_PER_SLOT} attempts rejected — skipping this slot`)
  }

  if (missionsToInsert.length > 0) {
    const { error } = await supabaseAdmin.from("domain_missions").insert(missionsToInsert)
    if (error) {
      result.rejections.push({ difficulty: "(insert)", attempt: 0, reason: `DB insert failed: ${error.message}` })
    } else {
      result.inserted = missionsToInsert.length
      await supabaseAdmin.from("domain_roles").update({ primary_panel_type: "node_runner" }).eq("id", role.id)
    }
  }
  return result
}

async function main() {
  if (!checkNodeAvailable()) throw new Error("node isn't available — cannot verify any mission by real execution. Aborting rather than generating unverifiable content.")

  log("Fetching few-shot style examples…")
  const examples = await fetchFewShotExamples()
  const fewShotBlock = buildFewShotBlock(examples)
  log(`Loaded ${examples.length} few-shot examples.`)

  const deleteIds = String(process.env.DELETE_MISSION_IDS || "").split(",").map(s => s.trim()).filter(Boolean)
  if (deleteIds.length > 0) {
    log(`DELETE_MISSION_IDS set — deleting ${deleteIds.length} mission(s) before generation`)
    const { error } = await supabaseAdmin.from("domain_missions").delete().in("id", deleteIds)
    if (error) throw error
  }

  const targetRoleIds = String(process.env.TARGET_ROLES || "").split(",").map(s => s.trim()).filter(Boolean)
  if (targetRoleIds.length === 0) throw new Error("TARGET_ROLES is required for this script.")

  const { data: existingMissionRows, error: missionsErr } = await supabaseAdmin
    .from("domain_missions").select("id,domain_role_id,title,prompt,difficulty,panel_type").in("domain_role_id", targetRoleIds).eq("panel_type", "node_runner")
  if (missionsErr) throw missionsErr
  const missionsByRole = new Map()
  for (const m of existingMissionRows || []) {
    if (!missionsByRole.has(m.domain_role_id)) missionsByRole.set(m.domain_role_id, [])
    missionsByRole.get(m.domain_role_id).push(m)
  }

  const results = []
  for (const roleId of targetRoleIds) {
    const role = getRoleConfig(roleId)
    if (role.id !== roleId) { log(`⚠ "${roleId}" didn't resolve to itself in roleConfig.js (got "${role.id}") — skipping`); continue }
    const existingMissions = missionsByRole.get(roleId) || []
    log(`Generating node_runner missions for "${role.label}" (${existingMissions.length} existing node_runner mission(s))…`)
    const result = await generateForRole(role, fewShotBlock, existingMissions)
    results.push(result)
    if (result.alreadyComplete) log(`  -> already has all ${DIFFICULTY_PLAN.length} slots filled`)
    else log(`  -> ${result.inserted}/${result.totalSlots} open slot(s) filled, ${result.rejections.length} rejection(s) logged`)
  }

  log("\n" + "=".repeat(70))
  log("PER-ROLE SUMMARY")
  log("=".repeat(70))
  for (const r of results) {
    if (r.alreadyComplete) { log(`${r.roleLabel} (${r.roleId}): already complete, skipped`); continue }
    log(`${r.roleLabel} (${r.roleId}): ${r.inserted}/${r.totalSlots} inserted, ${r.rejections.length} rejection(s)`)
    for (const rej of r.rejections) log(`    - [${rej.difficulty}, attempt ${rej.attempt}] ${rej.reason}`)
  }
  const attempted = results.filter(r => !r.alreadyComplete)
  const totalInserted = attempted.reduce((a, r) => a + r.inserted, 0)
  const totalPossible = attempted.reduce((a, r) => a + r.totalSlots, 0)
  log("\n" + "=".repeat(70))
  log(`TOTAL: ${totalInserted}/${totalPossible} missions inserted across ${attempted.length} role(s)`)
  log("=".repeat(70))
}

main().catch(err => {
  console.error("[generateNodeDomainMissions] FATAL:", err)
  process.exit(1)
})
