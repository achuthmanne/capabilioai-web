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
 *   4. GENERATE ONCE. This script only ever targets roles with zero
 *      existing missions (re-running it is always safe — it skips
 *      anything already populated) and is meant to be run manually/
 *      admin-triggered, never from a student-facing request path. No
 *      route in this codebase calls this script or anything like it.
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
 * Usage: node scripts/generateDomainRoleMissions.mjs
 *        LIMIT=2 node scripts/generateDomainRoleMissions.mjs   (first N target roles only — for a small verification run before the full batch)
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { groq, GROQ_BIG } = await import("../backend/server/lib/groq.js")
const { runAgainstDataset, compareResults, SqlSandboxError } = await import("../backend/server/lib/domainRole/sqlSandbox.js")

const MISSIONS_PER_ROLE = 4
const DIFFICULTY_PLAN = ["easy", "easy", "medium", "hard"]
// Matches Data Analyst's real, live values exactly (see the few-shot
// fetch below) — fixed, not Groq-decided. See integrity rule 3 above.
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3
const VALID_MATCH_MODES = new Set(["unordered_rows", "ordered_rows"])

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

function buildPrompt(role, difficulty, fewShotBlock) {
  return `You are writing an entry-level SQL practice mission for the "${role.label}" job role, matching the style of these real, already-shipped examples exactly:

${fewShotBlock}

Write ONE new mission for "${role.label}" at difficulty "${difficulty}". Requirements:
- Invent a plausible database this role would realistically touch day-to-day — it does not need to be their core technical discipline (e.g. inventory, test/inspection logs, asset tracking, project data, sensor readings — whatever fits "${role.label}" best). Keep it entry-level and concrete, like the examples.
- The dataset must have 6-10 rows, a short realistic tableName, and 4-7 columns.
- The prompt must describe the table's columns inline (like the examples) and ask a clear, single, unambiguous SQL task.
- referenceQuery must be a single valid SQLite SELECT statement that actually solves the prompt against your dataset.
- expected_result must be EXACTLY what referenceQuery produces when run against your dataset — columns and rows, in the same order the query would return them if match_mode is "ordered_rows", or any order if "unordered_rows".
- match_mode: "ordered_rows" only if the task inherently requires a specific order (e.g. "highest first"); otherwise "unordered_rows".
- Use a realistic Indian company name, manager name, and sprint label, matching the examples' tone.
- difficulty "easy" = single WHERE filter. "medium" = GROUP BY with an aggregate. "hard" = GROUP BY + aggregate + ORDER BY/LIMIT for a "top/highest/lowest" style question.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "dataset": {"tableName": string, "columns": [string], "rows": [[...]]}, "referenceQuery": string, "expected_result": {"columns": [string], "rows": [[...]]}, "match_mode": "unordered_rows" | "ordered_rows", "company": string, "manager": string, "sprint": string}`
}

function validateShape(m) {
  if (!m || typeof m !== "object") return "not an object"
  if (typeof m.title !== "string" || !m.title.trim()) return "missing title"
  if (typeof m.prompt !== "string" || !m.prompt.trim()) return "missing prompt"
  if (typeof m.referenceQuery !== "string" || !m.referenceQuery.trim()) return "missing referenceQuery"
  if (!VALID_MATCH_MODES.has(m.match_mode)) return `invalid match_mode: ${m.match_mode}`
  const d = m.dataset
  if (!d || typeof d !== "object" || typeof d.tableName !== "string" || !Array.isArray(d.columns) || !Array.isArray(d.rows)) return "malformed dataset"
  if (d.columns.length === 0 || d.rows.length === 0) return "empty dataset"
  if (!d.rows.every(r => Array.isArray(r) && r.length === d.columns.length)) return "dataset row/column length mismatch"
  const er = m.expected_result
  if (!er || typeof er !== "object" || !Array.isArray(er.columns) || !Array.isArray(er.rows)) return "malformed expected_result"
  return null
}

// One generation + validation attempt. Returns { mission } on success or
// { rejected: reason } on failure — never throws for an expected rejection
// class (bad JSON, sandbox error, mismatch); only throws on a genuine
// infra failure (Groq unreachable), which the caller lets propagate since
// retrying won't help a downed API any more than the first attempt did.
async function attemptGeneration(role, difficulty, fewShotBlock) {
  const raw = await groq(
    [{ role: "user", content: buildPrompt(role, difficulty, fewShotBlock) }],
    { model: GROQ_BIG, json: true, max_tokens: 1400, temperature: 0.8 },
  )

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { rejected: "invalid JSON from Groq" }
  }

  const shapeError = validateShape(parsed)
  if (shapeError) return { rejected: `schema: ${shapeError}` }

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

async function generateForRole(role, fewShotBlock) {
  const result = { roleId: role.id, roleLabel: role.label, inserted: 0, rejections: [] }
  const missionsToInsert = []

  for (const difficulty of DIFFICULTY_PLAN) {
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
          outcome = await attemptGeneration(role, difficulty, fewShotBlock)
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

  const { data: roles, error: rolesErr } = await supabaseAdmin.from("domain_roles").select("id,label").order("label")
  if (rolesErr) throw rolesErr

  const { data: existingMissionRows, error: missionsErr } = await supabaseAdmin.from("domain_missions").select("domain_role_id")
  if (missionsErr) throw missionsErr
  const rolesWithMissions = new Set((existingMissionRows || []).map(m => m.domain_role_id))

  let targetRoles = roles.filter(r => !rolesWithMissions.has(r.id))
  const limit = parseInt(process.env.LIMIT, 10)
  if (Number.isFinite(limit) && limit > 0) {
    log(`LIMIT=${limit} set — restricting this run to the first ${limit} target role(s).`)
    targetRoles = targetRoles.slice(0, limit)
  }
  log(`${targetRoles.length} role(s) currently have zero missions — generating up to ${MISSIONS_PER_ROLE} each.`)
  if (targetRoles.length === 0) {
    log("Nothing to do.")
    return
  }

  const results = []
  for (const role of targetRoles) {
    log(`Generating for "${role.label}"…`)
    const result = await generateForRole(role, fewShotBlock)
    results.push(result)
    log(`  -> ${result.inserted}/${MISSIONS_PER_ROLE} missions inserted, ${result.rejections.length} rejection(s) logged`)
  }

  // ── Final per-role report ──────────────────────────────────────────────
  log("\n" + "=".repeat(70))
  log("PER-ROLE SUMMARY")
  log("=".repeat(70))
  for (const r of results) {
    const rejectionRate = r.rejections.length + r.inserted > 0
      ? Math.round((r.rejections.length / (r.rejections.length + r.inserted)) * 100)
      : 0
    log(`${r.roleLabel} (${r.roleId}): ${r.inserted}/${MISSIONS_PER_ROLE} inserted, ${r.rejections.length} rejection(s), ~${rejectionRate}% attempt-rejection rate`)
    if (r.rejections.length > 0) {
      for (const rej of r.rejections) log(`    - [${rej.difficulty}, attempt ${rej.attempt}] ${rej.reason}`)
    }
  }

  const totalInserted = results.reduce((a, r) => a + r.inserted, 0)
  const totalPossible = results.length * MISSIONS_PER_ROLE
  const totalRejections = results.reduce((a, r) => a + r.rejections.length, 0)
  log("\n" + "=".repeat(70))
  log(`TOTAL: ${totalInserted}/${totalPossible} missions inserted across ${results.length} roles, ${totalRejections} total rejections`)
  const rolesWithZeroInserted = results.filter(r => r.inserted === 0)
  if (rolesWithZeroInserted.length > 0) {
    log(`⚠ ${rolesWithZeroInserted.length} role(s) got ZERO missions inserted — needs manual follow-up: ${rolesWithZeroInserted.map(r => r.roleLabel).join(", ")}`)
  }
  log("=".repeat(70))
}

main().catch(err => {
  console.error("[generateDomainRoleMissions] FATAL:", err)
  process.exit(1)
})
