#!/usr/bin/env node
/**
 * generateFrontendDomainMissions.mjs — Vision Reset (2026-08-20).
 *
 * Generates real, checker-verified frontend_runner Domain Role missions —
 * "Marketing reported the pricing cards break on mobile. Fix the
 * responsive layout without changing desktop behaviour." style CSS bug
 * tickets, per the product spec's own literal Frontend Developer example.
 *
 * Same non-negotiable integrity discipline as the sibling generators
 * (generateNodeDomainMissions.mjs / generatePythonDomainMissions.mjs /
 * generateDomainRoleMissions.mjs): the AI never gets to claim its own
 * correctness. referenceCss is re-checked with the SAME checkCssRules()
 * function real submissions are graded with (lib/domainRole/
 * cssRuleChecker.js), and every check must pass. starterCss is also
 * re-checked, and at least one check must FAIL — confirming the "bug" is
 * real, not a cosmetic no-op.
 *
 * Usage:
 *   TARGET_ROLES=frontend node scripts/generateFrontendDomainMissions.mjs
 *   DELETE_MISSION_IDS=<uuid>,<uuid> TARGET_ROLES=frontend node ...
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { AIService } = await import("../backend/server/lib/ai/aiService.js")
const { ValidationError } = await import("../backend/server/lib/ai/responseValidator.js")
const { checkCssRules } = await import("../backend/server/lib/domainRole/cssRuleChecker.js")
const { getRoleConfig } = await import("../frontend/src/config/roleConfig.js")

const DIFFICULTY_PLAN = ["easy", "easy", "medium", "hard"]
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3
const MAX_RATE_LIMIT_RETRIES = 5
const GENERATION_PACING_MS = 12000

function log(msg) { console.log(`[generateFrontendDomainMissions] ${msg}`) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isRateLimitError(err) { return err?.status === 429 || /rate_limit_exceeded|\b429\b/i.test(err?.message || "") }
function extractRetryDelayMs(err, fallbackMs = 20000) {
  const match = /try again in ([\d.]+)s/i.exec(err?.message || "")
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : fallbackMs
}

const HARDCODED_TICKET_FEWSHOT = {
  difficulty: "easy",
  title: "Pricing cards don't stack on mobile",
  prompt: "Marketing reported the pricing cards break on mobile — all three cards squeeze into one unreadable row below 500px instead of stacking. Fix the responsive layout without changing desktop behaviour.",
  html: '<section class="pricing">\n  <div class="pricing-cards">\n    <div class="card">Basic</div>\n    <div class="card">Pro</div>\n    <div class="card">Enterprise</div>\n  </div>\n</section>',
  starterCss: ".pricing-cards {\n  display: flex;\n  flex-direction: row;\n  gap: 16px;\n}\n.card {\n  flex: 1;\n  padding: 24px;\n  border: 1px solid #ddd;\n}",
  referenceCss: ".pricing-cards {\n  display: flex;\n  flex-direction: row;\n  gap: 16px;\n}\n.card {\n  flex: 1;\n  padding: 24px;\n  border: 1px solid #ddd;\n}\n@media (max-width: 500px) {\n  .pricing-cards {\n    flex-direction: column;\n  }\n}",
  checks: [
    { description: "Pricing cards stack vertically below 500px", selector: ".pricing-cards", property: "flex-direction", expectedValue: "column", mediaMaxWidth: 500 },
    { description: "Desktop layout keeps cards in a row", selector: ".pricing-cards", property: "flex-direction", expectedValue: "row", mediaMaxWidth: null },
  ],
}

function buildFewShotBlock() {
  const e = HARDCODED_TICKET_FEWSHOT
  return `Example (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  html: ${e.html}
  starterCss (BUGGY — this is what ships in the editor):
${e.starterCss}
  referenceCss (the fix):
${e.referenceCss}
  checks: ${JSON.stringify(e.checks)}`
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

async function reviewMissionQuality(difficulty, mission) {
  let review
  try {
    const { data } = await AIService.executePrompt("domainRole.frontendMissionReview", {
      difficulty, title: mission.title, prompt: mission.prompt,
    })
    review = data
  } catch (err) {
    if (err instanceof ValidationError) return "quality review returned invalid JSON — treating as a failed review, not a pass"
    throw err
  }
  const failed = !review.is_realistic_production_task || !review.junior_appropriate || !review.teaches_measurable_skill || !review.feels_like_a_ticket
  if (failed) return `quality review rejected: ${review.reason || "no reason given"}`
  return null
}

async function attemptGeneration(role, difficulty, fewShotBlock, existingMissions) {
  let parsed
  try {
    const { data } = await AIService.executePrompt("domainRole.frontendMissionGeneration", { difficulty, fewShotBlock })
    parsed = data
  } catch (err) {
    if (err instanceof ValidationError) return { rejected: `AI response failed validation: ${err.message}` }
    throw err
  }

  // Integrity gate 1: referenceCss must make EVERY check pass, verified by
  // really running the same checker real submissions are graded with.
  const refResult = checkCssRules(parsed.referenceCss, parsed.checks)
  if (!refResult.parsed) return { rejected: `referenceCss failed to parse: ${refResult.parseError}` }
  const refAllPass = refResult.results.every(r => r.passed)
  if (!refAllPass) {
    const failing = refResult.results.filter(r => !r.passed).map(r => r.description)
    return { rejected: `self-inconsistent: referenceCss doesn't satisfy its own checks (${failing.join("; ")})` }
  }

  // Integrity gate 2: starterCss must be REALLY broken — at least one
  // check must fail, or the "bug" is fictional.
  const starterResult = checkCssRules(parsed.starterCss, parsed.checks)
  const starterAllPass = starterResult.parsed && starterResult.results.every(r => r.passed)
  if (starterAllPass) {
    return { rejected: "starter CSS already satisfies every check — no real bug for the student to fix" }
  }

  const dupReason = isDuplicateOfExisting(parsed, existingMissions)
  if (dupReason) return { rejected: dupReason }

  const reviewReason = await reviewMissionQuality(difficulty, parsed)
  if (reviewReason) return { rejected: reviewReason }

  return {
    mission: {
      domain_role_id: role.id,
      panel_type: "frontend_runner",
      title: parsed.title.trim(),
      prompt: parsed.prompt.trim(),
      difficulty,
      elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
      time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      company: parsed.company.trim(),
      manager: parsed.manager.trim(),
      sprint: parsed.sprint.trim(),
      rubric: {
        type: "css_rule_match",
        html: parsed.html,
        checks: parsed.checks,
        starter_code: parsed.starterCss,
        requirements: parsed.requirements,
        acceptance_criteria: parsed.acceptanceCriteria,
      },
      reference_solution: parsed.referenceCss,
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
      await supabaseAdmin.from("domain_roles").update({ primary_panel_type: "frontend_runner" }).eq("id", role.id)
    }
  }
  return result
}

async function main() {
  const fewShotBlock = buildFewShotBlock()

  const deleteIds = String(process.env.DELETE_MISSION_IDS || "").split(",").map(s => s.trim()).filter(Boolean)
  if (deleteIds.length > 0) {
    log(`DELETE_MISSION_IDS set — deleting ${deleteIds.length} mission(s) before generation`)
    const { error } = await supabaseAdmin.from("domain_missions").delete().in("id", deleteIds)
    if (error) throw error
  }

  const targetRoleIds = String(process.env.TARGET_ROLES || "").split(",").map(s => s.trim()).filter(Boolean)
  if (targetRoleIds.length === 0) throw new Error("TARGET_ROLES is required for this script.")

  const { data: existingMissionRows, error: missionsErr } = await supabaseAdmin
    .from("domain_missions").select("id,domain_role_id,title,prompt,difficulty,panel_type").in("domain_role_id", targetRoleIds).eq("panel_type", "frontend_runner")
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
    log(`Generating frontend_runner missions for "${role.label}" (${existingMissions.length} existing frontend_runner mission(s))…`)
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
  console.error("[generateFrontendDomainMissions] FATAL:", err)
  process.exit(1)
})
