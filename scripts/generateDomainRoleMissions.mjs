#!/usr/bin/env node
/**
 * generateDomainRoleMissions.mjs — batch-generates SQL Runner
 * (panel_type='sql_runner') domain_missions for every domain_role that
 * currently has zero missions, via Groq — then validates every single one
 * before it's ever eligible to be served to a real student.
 *
 * NON-NEGOTIABLE INTEGRITY RULES (do not weaken any of these):
 *   1. Groq generates the task, its dataset, AND a reference query, AND a
 *      claimed expected_result — four things, not three plus a trust.
 *   2. Before insert: the reference query is executed against the
 *      generated dataset in the SAME sql.js sandbox real submissions run
 *      through (lib/domainRole/sqlSandbox.js — imported directly, never
 *      reimplemented), and the actual output must exactly match the
 *      claimed expected_result via the SAME compareResults() comparator
 *      real scoring uses. Any mismatch, sandbox error, malformed JSON, or
 *      degenerate (empty) result REJECTS the attempt and retries — it
 *      never "fixes" a mismatch by substituting the computed value for
 *      Groq's claim. A model that can't stay self-consistent in one
 *      generation call is a signal to throw the whole attempt away.
 *   3. Groq NEVER decides scoring parameters. elo_reward/time_limit are
 *      fixed per difficulty tier (matching Data Analyst's real, live
 *      values below) — Groq only generates content (scenario, dataset,
 *      query, expected result), never the economics. This is the same
 *      "Groq never decides pass/fail" principle from Section 8.4,
 *      extended to point values too.
 *   4. IDEMPOTENT BY SLOT, NOT JUST BY ROLE. Default behavior (no env
 *      vars) is unchanged: only roles with zero existing missions are
 *      targeted. TARGET_ROLES opts specific roles in regardless of
 *      existing content, but generation is still slot-aware — a role's
 *      already-filled DIFFICULTY_PLAN slots are always skipped, so
 *      re-running is always safe. Meant to be run manually/admin-
 *      triggered, never from a student-facing request path. No route in
 *      this codebase calls this script or anything like it.
 *
 * Style/quality bar: the three live Data Analyst missions (few-shot
 * examples below, fetched fresh from domain_missions at script start) —
 * entry-level, realistic Indian business scenario, small (~8 row)
 * dataset, one escalating SQL concept per difficulty tier.
 *
 * Content-fit note: many of the 43 target roles are hardware/civil/
 * mechanical disciplines where "write a SQL query" isn't literally core
 * job work. Rather than force an unnatural narrative, the prompt below
 * instructs Groq to invent a plausible database that role realistically
 * *touches* (inventory, test logs, asset tracking, project data) — not
 * to pretend SQL is their primary discipline.
 *
 * Usage:
 *   node scripts/generateDomainRoleMissions.mjs
 *     Default: only roles with zero existing missions.
 *   LIMIT=2 node scripts/generateDomainRoleMissions.mjs
 *     First N target roles only — for a small verification run.
 *   TARGET_ROLES=ml_engineer,cyber,soc node scripts/generateDomainRoleMissions.mjs
 *     Targets specific roles regardless of existing mission count — fills
 *     only their still-open DIFFICULTY_PLAN slots (top-up / selective
 *     regeneration). Comma-separated domain_roles.id values.
 *   DELETE_MISSION_IDS=<uuid>,<uuid> TARGET_ROLES=ml_engineer node scripts/generateDomainRoleMissions.mjs
 *     Deletes the given domain_missions.id rows first, then generates —
 *     the mechanism for "replace this specific bad mission." The deleted
 *     row's difficulty slot is naturally treated as open afterward.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { AIService } = await import("../backend/server/lib/ai/aiService.js")
const { ValidationError } = await import("../backend/server/lib/ai/responseValidator.js")
const { runAgainstDataset, compareResults, SqlSandboxError } = await import("../backend/server/lib/domainRole/sqlSandbox.js")

const MISSIONS_PER_ROLE = 4
const DIFFICULTY_PLAN = ["easy", "easy", "medium", "hard"]
// Matches Data Analyst's real, live values exactly (see the few-shot
// fetch below) — fixed, not Groq-decided. See integrity rule 3 above.
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3

// Plain, flat, data-driven — the entire mechanism for making a role's
// content more realistic than the generic "invent a plausible adjacent
// database" fallback in buildDatasetGuidance() below. Adding a new role's
// hint later is a one-line addition here, never a new code path — see
// buildDatasetGuidance()'s single optional-injection point. Populated so far for
// the three roles Phase 1 (2026-08-18) found generating generic/
// mismatched content (ml_engineer had zero ML-adjacent framing at all;
// cyber/soc were mostly fine but drifted into unrelated sales data on
// weaker attempts). Every other role intentionally has no entry yet —
// it falls back to the same generic instruction that already produced
// acceptable results for roles like data/dba/qa. Add an entry only once
// a specific role's output has actually been reviewed and found generic,
// not preemptively for roles nobody has looked at yet.
const ROLE_DOMAIN_HINTS = {
  ml_engineer: "a model's prediction/inference log, a training-run metrics history (loss, accuracy, epoch), a feature store, or an A/B test results table — never generic sales/inventory data, which has no ML content in it at all",
  cyber: "an authentication/access log, a vulnerability scan result set, a firewall/network event log, or an incident report table — grounded in security monitoring, not unrelated business data",
  soc: "an authentication/access log, a SIEM alert queue, a network device/asset inventory used for security monitoring, or an incident timeline — grounded in security operations, not unrelated business data",
}

// Rate-limit handling — see generateForRole's comment for why this exists
// at all (discovered live during a small verification run).
const MAX_RATE_LIMIT_RETRIES = 5
const GENERATION_PACING_MS = 12000

function log(msg) { console.log(`[generateDomainRoleMissions] ${msg}`) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function isRateLimitError(err) { return err?.status === 429 || /rate_limit_exceeded|\b429\b/i.test(err?.message || "") }
// Groq's error message includes a precise "try again in Ns" hint — use it
// when present (usually a few seconds to ~20s) rather than a fixed guess.
function extractRetryDelayMs(err, fallbackMs = 20000) {
  const match = /try again in ([\d.]+)s/i.exec(err?.message || "")
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : fallbackMs
}

async function fetchFewShotExamples() {
  const { data, error } = await supabaseAdmin
    .from("domain_missions")
    .select("title,difficulty,prompt,dataset,expected_result,match_mode,company,manager,sprint")
    .eq("domain_role_id", "data")
    .order("created_at")
  if (error) throw error
  if (!data || data.length === 0) throw new Error("No Data Analyst missions found to use as few-shot examples — aborting.")
  return data
}

function buildFewShotBlock(examples) {
  // All three real examples share one dataset — show it once, then each
  // mission's prompt/query/expected_result, to keep the few-shot block
  // compact rather than repeating an identical dataset three times.
  const shared = examples[0].dataset
  const datasetBlock = JSON.stringify(shared, null, 0)
  const missionBlocks = examples.map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  expected_result: ${JSON.stringify(e.expected_result)}
  match_mode: ${e.match_mode}
  company/manager/sprint: ${e.company} / ${e.manager} / ${e.sprint}`).join("\n\n")
  return `These three real, live missions all use this ONE shared dataset:\n${datasetBlock}\n\n${missionBlocks}`
}

// Single optional-injection point (evolutionary architecture, not a new
// code path) — ROLE_DOMAIN_HINTS[role.id] is undefined for every role
// without a reviewed hint, so this is a no-op fallback to the original
// generic instruction for those roles. Adding a role's hint later never
// touches the prompt template itself (lib/ai/prompts/domainRole.js).
function buildDatasetGuidance(role) {
  const hint = ROLE_DOMAIN_HINTS[role.id]
  return hint
    ? `Invent a plausible database from this role's actual work: ${hint}. Keep it entry-level and concrete, like the examples.`
    : `Invent a plausible database this role would realistically touch day-to-day — it does not need to be their core technical discipline (e.g. inventory, test/inspection logs, asset tracking, project data, sensor readings — whatever fits "${role.label}" best). Keep it entry-level and concrete, like the examples.`
}

// ── Quality gates (2026-08-18) ─────────────────────────────────────────────
// Everything above this point already gated on "is it technically valid and
// internally consistent" (schema + sandbox re-execution). These four gates
// ask a different question — "should a student ever see this" — the same
// bar a human content reviewer would apply. Two are cheap and deterministic
// (dedup, difficulty shape); two genuinely need judgment and get one small
// AI review call. This is content curation, not student scoring — it never
// touches how a real submission is graded (still exclusively
// runAgainstDataset/compareResults, Section 8.4, unchanged) — it decides
// whether AI-drafted content is fit to publish, the same kind of call an
// editor makes on a draft before print, not a verdict on a person's work.

// Deterministic — normalized-title exact match plus a cheap word-overlap
// ratio on the prompt text. Generous threshold on purpose: this only needs
// to catch near-repeats within the same role, not paraphrase-detect every
// possible rewording.
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

// Deterministic — the prompt already states the difficulty rubric (easy =
// single WHERE, medium = GROUP BY+aggregate, hard = GROUP BY+aggregate+
// ORDER BY/LIMIT). This only catches obvious violations of Groq's own
// stated rubric, not stylistic variance — lenient on purpose to avoid
// over-rejecting valid queries.
function checkDifficultyShape(referenceQuery, difficulty) {
  const q = String(referenceQuery || "").toUpperCase()
  const hasGroupBy = /GROUP\s+BY/.test(q)
  const hasOrderLimit = /ORDER\s+BY/.test(q) || /LIMIT\s+\d/.test(q)
  if (difficulty === "medium" && !hasGroupBy) return "medium mission has no GROUP BY — doesn't match the stated difficulty rubric"
  if (difficulty === "hard" && !(hasGroupBy && hasOrderLimit)) return "hard mission is missing GROUP BY+aggregate or ORDER BY/LIMIT — doesn't match the stated difficulty rubric"
  return null
}

// The two genuinely-judgment gates, bundled into one small/cheap call
// (modelTier "fast" — this is a review of already-sandbox-validated
// content, not primary generation, so it doesn't need the big model).
// Returns a rejection reason string, or null if the mission passes every
// check. Prompt text lives in lib/ai/prompts/domainRole.js
// ("domainRole.sqlMissionReview") — this function only supplies variables
// and interprets the (already schema-validated) result.
async function reviewMissionQuality(role, difficulty, mission) {
  let review
  try {
    const { data } = await AIService.executePrompt("domainRole.sqlMissionReview", {
      roleLabel: role.label,
      difficulty,
      title: mission.title,
      prompt: mission.prompt,
      tableName: mission.dataset.tableName,
      columns: mission.dataset.columns.join(", "),
    })
    review = data
  } catch (err) {
    if (err instanceof ValidationError) return "quality review returned invalid JSON — treating as a failed review, not a pass"
    throw err
  }
  const failed = !review.realistic_dataset || !review.junior_appropriate || !review.teaches_measurable_skill || !review.role_match
  if (failed) return `quality review rejected: ${review.reason || "no reason given"}`
  return null
}

// One generation + validation attempt. Returns { mission } on success or
// { rejected: reason } on failure — never throws for an expected rejection
// class (bad/malformed AI response, sandbox error, mismatch, quality-gate
// failure); only throws on a genuine infra failure (provider unreachable),
// which the caller lets propagate since retrying won't help a downed API
// any more than the first attempt did. Prompt text lives in
// lib/ai/prompts/domainRole.js ("domainRole.sqlMissionGeneration") — JSON
// parsing/schema validation now happens inside AIService.executePrompt
// (responseValidator.js), not by hand here.
async function attemptGeneration(role, difficulty, fewShotBlock, existingMissions = []) {
  let parsed
  try {
    const { data } = await AIService.executePrompt("domainRole.sqlMissionGeneration", {
      roleLabel: role.label,
      difficulty,
      fewShotBlock,
      datasetGuidance: buildDatasetGuidance(role),
    })
    parsed = data
  } catch (err) {
    if (err instanceof ValidationError) return { rejected: `AI response failed validation: ${err.message}` }
    throw err
  }

  let actual
  try {
    actual = await runAgainstDataset(parsed.dataset, parsed.referenceQuery)
  } catch (err) {
    const reason = err instanceof SqlSandboxError ? err.message : `sandbox error: ${err.message}`
    return { rejected: reason }
  }

  if (!actual.rows || actual.rows.length === 0) {
    return { rejected: "reference query produced zero rows — degenerate mission" }
  }

  const comparison = compareResults(actual, parsed.expected_result, parsed.match_mode)
  if (!comparison.passed) {
    return { rejected: `self-inconsistent: claimed expected_result doesn't match what referenceQuery actually produces (${comparison.reason})` }
  }

  const dupReason = isDuplicateOfExisting(parsed, existingMissions)
  if (dupReason) return { rejected: dupReason }

  const shapeReason = checkDifficultyShape(parsed.referenceQuery, difficulty)
  if (shapeReason) return { rejected: shapeReason }

  const reviewReason = await reviewMissionQuality(role, difficulty, parsed)
  if (reviewReason) return { rejected: reviewReason }

  return {
    mission: {
      domain_role_id: role.id,
      panel_type: "sql_runner",
      title: parsed.title.trim(),
      prompt: parsed.prompt.trim(),
      difficulty,
      elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
      time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      dataset: parsed.dataset,
      expected_result: parsed.expected_result,
      match_mode: parsed.match_mode,
      company: String(parsed.company || "").slice(0, 100) || "Capabilio Partner Co.",
      manager: String(parsed.manager || "").slice(0, 100) || "Team Lead",
      sprint: String(parsed.sprint || "").slice(0, 100) || "Week 1",
      source: "ai_generated",
    },
  }
}

// Counts how many of each difficulty a role already has, and returns only
// the DIFFICULTY_PLAN slots still open — e.g. a role with one "easy" and no
// "medium"/"hard" gets ["easy", "medium", "hard"] back (DIFFICULTY_PLAN has
// two "easy" slots; one is already filled). Plain per-difficulty counting,
// not Set membership, specifically because of that duplicate "easy" slot.
function remainingSlots(existingMissions) {
  const counts = {}
  for (const m of existingMissions) counts[m.difficulty] = (counts[m.difficulty] || 0) + 1
  const remaining = []
  for (const difficulty of DIFFICULTY_PLAN) {
    if (counts[difficulty] > 0) {
      counts[difficulty]--
    } else {
      remaining.push(difficulty)
    }
  }
  return remaining
}

// existingMissions: this role's current live missions (for slot-counting
// and dedup) — [] for a brand-new role, the real rows for a top-up/replace
// run. Slots already filled by an existing mission are skipped entirely;
// newly generated missions are deduped against both existingMissions and
// whatever this same run has already produced, so two new slots in one run
// can't collide with each other either.
async function generateForRole(role, fewShotBlock, existingMissions = []) {
  const result = { roleId: role.id, roleLabel: role.label, inserted: 0, rejections: [] }
  const missionsToInsert = []
  const slots = remainingSlots(existingMissions)
  result.totalSlots = slots.length
  if (slots.length === 0) {
    result.alreadyComplete = true
    return result
  }

  for (const difficulty of slots) {
    let slotFilled = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SLOT && !slotFilled; attempt++) {
      let outcome = null
      let rateLimitRetries = 0
      // Rate-limit (429) retries don't consume a quality-attempt — this
      // account's free/on-demand tier has tight per-minute token limits
      // (confirmed live during a 2-role verification run: both the
      // primary and fallback models hit 429 within minutes), and a 429 is
      // a transient "try again in Ns" condition, not a sign the generated
      // content was bad. Genuine content-quality rejections (schema,
      // self-inconsistency, degenerate result) still only get
      // MAX_ATTEMPTS_PER_SLOT tries.
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
      if (!outcome) break // genuine (non-rate-limit) infra failure — move on to the next slot rather than retrying a downed API
      if (outcome.mission) {
        missionsToInsert.push(outcome.mission)
        slotFilled = true
      } else {
        result.rejections.push({ difficulty, attempt, reason: outcome.rejected })
      }
      await sleep(GENERATION_PACING_MS) // proactive pacing to stay under the per-minute token limit in the first place
    }
    if (!slotFilled) log(`  ${role.label} / ${difficulty}: all ${MAX_ATTEMPTS_PER_SLOT} attempts rejected — skipping this slot`)
  }

  if (missionsToInsert.length > 0) {
    const { error } = await supabaseAdmin.from("domain_missions").insert(missionsToInsert)
    if (error) {
      result.rejections.push({ difficulty: "(insert)", attempt: 0, reason: `DB insert failed: ${error.message}` })
    } else {
      result.inserted = missionsToInsert.length
      // Only mark the role sql_runner-ready once it actually has content —
      // never flip this for a role generation totally failed for.
      await supabaseAdmin.from("domain_roles").update({ primary_panel_type: "sql_runner" }).eq("id", role.id)
    }
  }

  return result
}

async function main() {
  log("Fetching few-shot examples from live Data Analyst missions…")
  const examples = await fetchFewShotExamples()
  const fewShotBlock = buildFewShotBlock(examples)
  log(`Loaded ${examples.length} few-shot examples.`)

  // DELETE_MISSION_IDS runs before slot-counting so a deleted row's slot is
  // naturally treated as open by remainingSlots() below — "replace a bad
  // mission" is just "delete it, then generate normally," no separate
  // replace code path needed.
  const deleteIds = String(process.env.DELETE_MISSION_IDS || "").split(",").map(s => s.trim()).filter(Boolean)
  if (deleteIds.length > 0) {
    log(`DELETE_MISSION_IDS set — deleting ${deleteIds.length} mission(s) before generation: ${deleteIds.join(", ")}`)
    const { error: deleteErr } = await supabaseAdmin.from("domain_missions").delete().in("id", deleteIds)
    if (deleteErr) throw deleteErr
  }

  const { data: roles, error: rolesErr } = await supabaseAdmin.from("domain_roles").select("id,label").order("label")
  if (rolesErr) throw rolesErr

  const { data: existingMissionRows, error: missionsErr } = await supabaseAdmin.from("domain_missions").select("domain_role_id,title,prompt,difficulty")
  if (missionsErr) throw missionsErr
  const missionsByRole = new Map()
  for (const m of existingMissionRows || []) {
    if (!missionsByRole.has(m.domain_role_id)) missionsByRole.set(m.domain_role_id, [])
    missionsByRole.get(m.domain_role_id).push(m)
  }

  // TARGET_ROLES (comma-separated role ids) opts specific roles into this
  // run regardless of how many missions they already have — the mechanism
  // for top-up/replacement/selective-regeneration runs. Unset, behavior is
  // unchanged: only roles with zero missions at all are targeted.
  const targetRoleIds = String(process.env.TARGET_ROLES || "").split(",").map(s => s.trim()).filter(Boolean)
  let targetRoles = targetRoleIds.length > 0
    ? roles.filter(r => targetRoleIds.includes(r.id))
    : roles.filter(r => !missionsByRole.has(r.id))

  const limit = parseInt(process.env.LIMIT, 10)
  if (Number.isFinite(limit) && limit > 0) {
    log(`LIMIT=${limit} set — restricting this run to the first ${limit} target role(s).`)
    targetRoles = targetRoles.slice(0, limit)
  }
  log(`${targetRoles.length} role(s) targeted this run.`)
  if (targetRoles.length === 0) {
    log("Nothing to do.")
    return
  }

  const results = []
  for (const role of targetRoles) {
    const existingMissions = missionsByRole.get(role.id) || []
    log(`Generating for "${role.label}" (${existingMissions.length} existing mission(s))…`)
    const result = await generateForRole(role, fewShotBlock, existingMissions)
    results.push(result)
    if (result.alreadyComplete) {
      log(`  -> already has all ${DIFFICULTY_PLAN.length} slots filled — nothing to generate`)
    } else {
      log(`  -> ${result.inserted}/${result.totalSlots} open slot(s) filled, ${result.rejections.length} rejection(s) logged`)
    }
  }

  // ── Final per-role report ──────────────────────────────────────────────
  log("\n" + "=".repeat(70))
  log("PER-ROLE SUMMARY")
  log("=".repeat(70))
  for (const r of results) {
    if (r.alreadyComplete) {
      log(`${r.roleLabel} (${r.roleId}): already complete, skipped`)
      continue
    }
    const rejectionRate = r.rejections.length + r.inserted > 0
      ? Math.round((r.rejections.length / (r.rejections.length + r.inserted)) * 100)
      : 0
    log(`${r.roleLabel} (${r.roleId}): ${r.inserted}/${r.totalSlots} inserted, ${r.rejections.length} rejection(s), ~${rejectionRate}% attempt-rejection rate`)
    if (r.rejections.length > 0) {
      for (const rej of r.rejections) log(`    - [${rej.difficulty}, attempt ${rej.attempt}] ${rej.reason}`)
    }
  }

  const attemptedResults = results.filter(r => !r.alreadyComplete)
  const totalInserted = attemptedResults.reduce((a, r) => a + r.inserted, 0)
  const totalPossible = attemptedResults.reduce((a, r) => a + r.totalSlots, 0)
  const totalRejections = attemptedResults.reduce((a, r) => a + r.rejections.length, 0)
  log("\n" + "=".repeat(70))
  log(`TOTAL: ${totalInserted}/${totalPossible} missions inserted across ${attemptedResults.length} role(s) needing generation (${results.length - attemptedResults.length} already complete), ${totalRejections} total rejections`)
  const rolesWithZeroInserted = attemptedResults.filter(r => r.inserted === 0)
  if (rolesWithZeroInserted.length > 0) {
    log(`⚠ ${rolesWithZeroInserted.length} role(s) got ZERO missions inserted — needs manual follow-up: ${rolesWithZeroInserted.map(r => r.roleLabel).join(", ")}`)
  }
  log("=".repeat(70))
}

main().catch(err => {
  console.error("[generateDomainRoleMissions] FATAL:", err)
  process.exit(1)
})
