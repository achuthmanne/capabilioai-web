#!/usr/bin/env node
/**
 * generatePythonDomainMissions.mjs — Career Workspace refactor.
 *
 * Generates real, execution-verified python_runner Domain Role missions —
 * the fix for "every role gets SQL Runner regardless of its actual skill
 * graph" (see the Career Workspace Audit). Targets roles whose real
 * auraSkills (frontend/src/config/roleConfig.js) are Python/ML-shaped, ML
 * / AI Engineer first.
 *
 * NON-NEGOTIABLE INTEGRITY RULE (same discipline as
 * generateDomainRoleMissions.mjs's SQL generator and
 * generateCollegeStreamContent.mjs): the AI generates a problem statement
 * AND a Python reference solution. It NEVER gets to claim what that
 * solution prints. Before insert, the solution is executed for real in
 * the SAME subprocess sandbox real submissions run through
 * (lib/collegeStream/pythonSandbox.js's runPython, now also the execution
 * path lib/domainRole/executeMission.js's python_runner entry uses —
 * imported directly here, never reimplemented), and the captured stdout
 * becomes rubric.expected_stdout.
 *
 * Usage:
 *   TARGET_ROLES=ml_engineer node scripts/generatePythonDomainMissions.mjs
 *     Targets specific roles (comma-separated domain_roles.id values),
 *     slot-aware — only fills open DIFFICULTY_PLAN slots for python_runner
 *     missions specifically (existing sql_runner missions for the same
 *     role, if any, are untouched by this script).
 *   DELETE_MISSION_IDS=<uuid>,<uuid> TARGET_ROLES=ml_engineer node ...
 *     Deletes the given domain_missions.id rows first (e.g. stale
 *     sql_runner rows being replaced), same mechanism as the SQL
 *     generator.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { AIService } = await import("../backend/server/lib/ai/aiService.js")
const { ValidationError } = await import("../backend/server/lib/ai/responseValidator.js")
const { runPython, scanForDangerousPatterns, checkPythonAvailable, checkPackagesAvailable } = await import("../backend/server/lib/collegeStream/pythonSandbox.js")
const { getRoleConfig } = await import("../frontend/src/config/roleConfig.js")

const DIFFICULTY_PLAN = ["easy", "easy", "medium", "hard"]
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3
const MAX_RATE_LIMIT_RETRIES = 5
const GENERATION_PACING_MS = 12000
// Larger than College Stream's 3s default — sklearn's own import alone
// measured ~3.3s cold in this sandbox; stdlib-only missions finish in
// well under this, package-backed ones need the headroom. Confirmed live
// before this script was written, not guessed.
const PYTHON_TIMEOUT_MS = 15000

function log(msg) { console.log(`[generatePythonDomainMissions] ${msg}`) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isRateLimitError(err) { return err?.status === 429 || /rate_limit_exceeded|\b429\b/i.test(err?.message || "") }
function extractRetryDelayMs(err, fallbackMs = 20000) {
  const match = /try again in ([\d.]+)s/i.exec(err?.message || "")
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : fallbackMs
}

// Vision Reset (2026-08-20): same "no live example of the new shape exists
// yet" situation as generateNodeDomainMissions.mjs — hand-authored ticket
// examples with a deliberately buggy starterCode, never inserted.
const HARDCODED_TICKET_FEWSHOT = [
  {
    difficulty: "easy",
    title: "Fix off-by-one in train/test split ratio",
    prompt: "A teammate wrote `split_dataset(rows, train_ratio)` for the churn-prediction pipeline, but the last data-quality review found the training set is one row short of the intended 80/20 split on a 10-row sample. Fix the function so it returns exactly `train_ratio * len(rows)` rows (rounded down) in the training set, with the rest in the test set. Run it against the fixed sample list defined in the file and print `len(train), len(test)` as a comma-separated line.",
    starterCode: "def split_dataset(rows, train_ratio):\n    cut = int(len(rows) * train_ratio) - 1\n    return rows[:cut], rows[cut:]\n\nrows = list(range(10))\ntrain, test = split_dataset(rows, 0.8)\nprint(f\"{len(train)},{len(test)}\")",
    expected_stdout: "8,2",
  },
  {
    difficulty: "medium",
    title: "Confusion-matrix helper miscounts false positives",
    prompt: "QA on the fraud-detection model reported the dashboard's false-positive count doesn't match their manual audit. The bug is in `confusion_counts(y_true, y_pred)` in the shared metrics module. Fix it so it correctly counts true positives, false positives, true negatives, and false negatives for the fixed sample arrays defined in the file, then print them as a comma-separated line in that exact order.",
    starterCode: "def confusion_counts(y_true, y_pred):\n    tp = fp = tn = fn = 0\n    for t, p in zip(y_true, y_pred):\n        if t == 1 and p == 1:\n            tp += 1\n        elif t == 1 and p == 0:\n            fp += 1\n        elif t == 0 and p == 0:\n            tn += 1\n        else:\n            fn += 1\n    return tp, fp, tn, fn\n\ny_true = [1, 0, 1, 0, 1, 0]\ny_pred = [1, 0, 0, 0, 1, 1]\ntp, fp, tn, fn = confusion_counts(y_true, y_pred)\nprint(f\"{tp},{fp},{tn},{fn}\")",
    expected_stdout: "2,1,2,1",
  },
]

async function fetchFewShotExamples() {
  return HARDCODED_TICKET_FEWSHOT
}

function buildFewShotBlock(examples) {
  return examples.map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  starterCode (BUGGY — this is what ships in the editor):
${e.starterCode}
  expected_stdout after the fix: ${e.expected_stdout}`).join("\n\n")
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
    const { data } = await AIService.executePrompt("domainRole.pythonMissionReview", {
      roleLabel: role.label, roleSkillsList: role.auraSkills.join(", "), difficulty, title: mission.title, prompt: mission.prompt,
    })
    review = data
  } catch (err) {
    if (err instanceof ValidationError) return "quality review returned invalid JSON — treating as a failed review, not a pass"
    throw err
  }
  const failed = !review.matches_real_skill || !review.junior_appropriate || !review.teaches_measurable_skill || !review.not_generic_sql
  if (failed) return `quality review rejected: ${review.reason || "no reason given"}`
  return null
}

async function attemptGeneration(role, difficulty, fewShotBlock, existingMissions) {
  let parsed
  try {
    const { data } = await AIService.executePrompt("domainRole.pythonMissionGeneration", {
      roleLabel: role.label, roleSkillsList: role.auraSkills.join(", "), difficulty, fewShotBlock,
    })
    parsed = data
  } catch (err) {
    if (err instanceof ValidationError) return { rejected: `AI response failed validation: ${err.message}` }
    throw err
  }

  if (scanForDangerousPatterns(parsed.referenceSolution)) {
    return { rejected: "reference solution uses a disallowed operation (file/network/system access)" }
  }
  if (scanForDangerousPatterns(parsed.starterCode)) {
    return { rejected: "starter code uses a disallowed operation (file/network/system access)" }
  }
  if (parsed.usePackages && !checkPackagesAvailable()) {
    return { rejected: "mission requires numpy/pandas/scikit-learn but the sandbox venv isn't available in this environment" }
  }

  let run
  try {
    run = await runPython(parsed.referenceSolution, { timeoutMs: PYTHON_TIMEOUT_MS, usePackages: parsed.usePackages })
  } catch (err) {
    return { rejected: `sandbox error: ${err.message}` }
  }
  if (run.timedOut) return { rejected: "reference solution timed out or exceeded resource limits" }
  if (run.exitCode !== 0) return { rejected: `reference solution exited with code ${run.exitCode}: ${run.stderr.trim().slice(0, 200)}` }
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return { rejected: "reference solution produced empty stdout — degenerate mission" }

  // Vision Reset integrity check (see generateNodeDomainMissions.mjs's
  // identical check for the full rationale): verify starterCode is really
  // broken by really running it, never trust the AI's claim that it's buggy.
  let starterRun
  try {
    starterRun = await runPython(parsed.starterCode, { timeoutMs: PYTHON_TIMEOUT_MS, usePackages: parsed.usePackages })
  } catch (err) {
    return { rejected: `starter code sandbox error: ${err.message}` }
  }
  const starterProducesCorrectOutput = !starterRun.timedOut && starterRun.exitCode === 0 && starterRun.stdout.trim() === expectedStdout
  if (starterProducesCorrectOutput) {
    return { rejected: "starter code already produces the correct output — no real bug for the student to fix" }
  }

  const dupReason = isDuplicateOfExisting(parsed, existingMissions)
  if (dupReason) return { rejected: dupReason }

  const reviewReason = await reviewMissionQuality(role, difficulty, parsed)
  if (reviewReason) return { rejected: reviewReason }

  return {
    mission: {
      domain_role_id: role.id,
      panel_type: "python_runner",
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
        type: "python_stdout_match",
        timeout_ms: PYTHON_TIMEOUT_MS,
        usePackages: parsed.usePackages,
        expected_stdout: expectedStdout,
        starter_code: parsed.starterCode,
        requirements: parsed.requirements,
        acceptance_criteria: parsed.acceptanceCriteria,
      },
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
      await supabaseAdmin.from("domain_roles").update({ primary_panel_type: "python_runner" }).eq("id", role.id)
    }
  }
  return result
}

async function main() {
  if (!checkPythonAvailable()) throw new Error("python3 isn't available — cannot verify any mission by real execution. Aborting rather than generating unverifiable content.")
  const packagesOk = checkPackagesAvailable()
  log(`Sandbox venv (numpy/pandas/scikit-learn/Pillow): ${packagesOk ? "available" : "NOT available — usePackages missions will be rejected, not faked"}`)

  log("Fetching few-shot examples from live python_stdout_match experiments…")
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
  if (targetRoleIds.length === 0) throw new Error("TARGET_ROLES is required for this script (no default 'every zero-mission role' behavior — python_runner missions need a role whose real skills are Python-shaped, not a blind sweep).")

  const { data: existingMissionRows, error: missionsErr } = await supabaseAdmin
    .from("domain_missions").select("id,domain_role_id,title,prompt,difficulty,panel_type").in("domain_role_id", targetRoleIds).eq("panel_type", "python_runner")
  if (missionsErr) throw missionsErr
  const missionsByRole = new Map()
  for (const m of existingMissionRows || []) {
    if (!missionsByRole.has(m.domain_role_id)) missionsByRole.set(m.domain_role_id, [])
    missionsByRole.get(m.domain_role_id).push(m)
  }

  const results = []
  for (const roleId of targetRoleIds) {
    const role = getRoleConfig(roleId)
    if (role.id !== roleId) { log(`⚠ "${roleId}" didn't resolve to itself in roleConfig.js (got "${role.id}") — skipping to avoid generating for the wrong role`); continue }
    const existingMissions = missionsByRole.get(roleId) || []
    log(`Generating python_runner missions for "${role.label}" (${existingMissions.length} existing python_runner mission(s))…`)
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
  console.error("[generatePythonDomainMissions] FATAL:", err)
  process.exit(1)
})
