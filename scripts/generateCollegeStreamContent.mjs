#!/usr/bin/env node
/**
 * generateCollegeStreamContent.mjs — builds Academic (College) Stream
 * curriculum content (semester -> subject -> units -> experiments) for
 * streams that currently have zero content, via AIService — then verifies
 * every experiment by REAL Python execution before it's ever eligible to
 * be served to a real student.
 *
 * NON-NEGOTIABLE INTEGRITY RULE (mirrors generateDomainRoleMissions.mjs's
 * Rule 2 for the SQL Runner branch, adapted for this branch):
 *   The AI generates a problem statement AND a Python reference solution.
 *   It NEVER gets to claim what that solution prints. Before insert, the
 *   solution is executed for real in the SAME subprocess sandbox real
 *   submissions run through (lib/collegeStream/pythonSandbox.js's
 *   runPython — imported directly, never reimplemented), and the
 *   captured stdout becomes rubric.expected_stdout. A script that errors,
 *   times out, or produces empty output REJECTS the attempt and retries.
 *   elo_reward/time_limit are fixed per difficulty tier (same values
 *   generateDomainRoleMissions.mjs uses) — the AI never decides economics.
 *
 * Grading path this content is written for (confirmed live,
 * routes/arenaCollegeStream.js:673): rubric.type === "python_stdout_match"
 * is dispatched straight to pythonSandbox.js's evaluatePythonStdout(),
 * which re-runs the student's submission and compares stdout exactly —
 * same mechanism this script uses to establish the rubric in the first
 * place.
 *
 * Usage:
 *   node scripts/generateCollegeStreamContent.mjs
 *     All 5 target streams (mechanical, civil, eee, ece, mba).
 *   TARGET_STREAMS=mechanical,civil node scripts/generateCollegeStreamContent.mjs
 *     Specific streams only (comma-separated stream slugs).
 *   LIMIT=1 node scripts/generateCollegeStreamContent.mjs
 *     First N target streams only — for a small verification run.
 *   TARGET_UNITS=1 node scripts/generateCollegeStreamContent.mjs
 *     Restrict each targeted stream to its first N units — for a cheap
 *     single-unit smoke test.
 *
 * Idempotent: safe to re-run. An existing semester/subject/unit (matched
 * by number/slug/title) is reused, not duplicated; each unit's experiment
 * slots are filled the same slot-aware way generateDomainRoleMissions.mjs
 * fills a role's difficulty slots — already-filled slots are skipped.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, "..", ".env") })

const { supabaseAdmin } = await import("../backend/server/lib/supabase.js")
const { AIService } = await import("../backend/server/lib/ai/aiService.js")
const { ValidationError } = await import("../backend/server/lib/ai/responseValidator.js")
const { runPython, scanForDangerousPatterns, checkPythonAvailable } = await import("../backend/server/lib/collegeStream/pythonSandbox.js")

const SEMESTER_NUMBER = 1
// One easy + one medium experiment per unit for this first pass — no
// "hard" yet, same conservative posture generateDomainRoleMissions.mjs
// took for its original zero-mission roles. A later top-up run can widen
// this the same slot-aware way TARGET_ROLES tops up Domain Role today.
const UNIT_DIFFICULTY_PLAN = ["easy", "medium"]
const ELO_REWARD_BY_DIFFICULTY = { easy: 5, medium: 8, hard: 12 }
const TIME_LIMIT_BY_DIFFICULTY = { easy: 8, medium: 12, hard: 15 }
const MAX_ATTEMPTS_PER_SLOT = 3
const MAX_RATE_LIMIT_RETRIES = 5
const GENERATION_PACING_MS = 12000
const PYTHON_TIMEOUT_MS = 5000

// One core, quantitative, early-curriculum subject per discipline — keeps
// this pass bounded and matches the existing precedent of one seeded
// subject/semester per stream (e.g. CSE's real content is 1 semester x
// Data Structures & Algorithms).
const STREAM_CONFIGS = {
  mechanical: {
    subjectName: "Strength of Materials",
    subjectSlug: "strength-of-materials",
    units: ["Stress & Strain", "Bending & Shear", "Deflection of Beams", "Torsion"],
  },
  civil: {
    subjectName: "Structural Analysis",
    subjectSlug: "structural-analysis",
    units: ["Determinacy & Trusses", "Bending Moment & Shear Force", "Beam Deflection", "Column Design"],
  },
  eee: {
    subjectName: "Electrical Circuit Analysis",
    subjectSlug: "electrical-circuit-analysis",
    units: ["Ohm's & Kirchhoff's Laws", "Series-Parallel Networks", "AC Power & Power Factor", "Three-Phase Systems"],
  },
  ece: {
    subjectName: "Digital Electronics",
    subjectSlug: "digital-electronics",
    units: ["Boolean Algebra & Logic Gates", "Combinational Circuits", "Sequential Circuits (Flip-Flops)", "Number Systems & Codes"],
  },
  mba: {
    subjectName: "Financial Management",
    subjectSlug: "financial-management",
    units: ["Time Value of Money", "NPV & IRR", "Ratio Analysis", "Break-Even & Cost Analysis"],
  },
}

function log(msg) { console.log(`[generateCollegeStreamContent] ${msg}`) }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)) }
function slugify(text) { return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }
function isRateLimitError(err) { return err?.status === 429 || /rate_limit_exceeded|\b429\b/i.test(err?.message || "") }
function extractRetryDelayMs(err, fallbackMs = 20000) {
  const match = /try again in ([\d.]+)s/i.exec(err?.message || "")
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 1000 : fallbackMs
}

// ── Few-shot: real, live CSE experiments (style/shape examples only —
// this content is discipline-agnostic in structure, so borrowing CSE's
// real shipped examples for format is exactly what the Domain Role
// script does by borrowing Data Analyst's real missions). ──────────────
async function fetchFewShotExamples() {
  const { data, error } = await supabaseAdmin
    .from("experiments")
    .select("title,difficulty,prompt,reference_solution,rubric")
    .eq("rubric->>type", "python_stdout_match")
    .order("created_at")
    .limit(3)
  if (error) throw error
  if (!data || data.length === 0) throw new Error("No live python_stdout_match experiments found to use as few-shot examples — aborting.")
  return data
}

function buildFewShotBlock(examples) {
  return examples.map((e, i) => `Example ${i + 1} (${e.difficulty}):
  title: ${e.title}
  prompt: ${e.prompt}
  reference_solution:
${e.reference_solution}
  expected_stdout: ${e.rubric?.expected_stdout}`).join("\n\n")
}

// ── Dedup (ported from generateDomainRoleMissions.mjs, unchanged logic) ─
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
function isDuplicateOfExisting(experiment, existingExperiments) {
  const normTitle = normalizeForDedup(experiment.title)
  for (const existing of existingExperiments) {
    if (normalizeForDedup(existing.title) === normTitle) return `duplicate title of existing experiment "${existing.title}"`
    if (wordOverlapRatio(experiment.prompt, existing.prompt) >= 0.75) return `near-duplicate prompt of existing experiment "${existing.title}"`
  }
  return null
}

// Same "how many of each plan slot does this unit already have" counting
// as generateDomainRoleMissions.mjs's remainingSlots().
function remainingSlots(existingExperiments, plan) {
  const counts = {}
  for (const e of existingExperiments) counts[e.difficulty] = (counts[e.difficulty] || 0) + 1
  const remaining = []
  for (const difficulty of plan) {
    if (counts[difficulty] > 0) counts[difficulty]--
    else remaining.push(difficulty)
  }
  return remaining
}

async function reviewExperimentQuality(subjectName, unitTitle, difficulty, experiment) {
  let review
  try {
    const { data } = await AIService.executePrompt("collegeStream.experimentReview", {
      subjectName, unitTitle, difficulty, title: experiment.title, prompt: experiment.prompt,
    })
    review = data
  } catch (err) {
    if (err instanceof ValidationError) return "quality review returned invalid JSON — treating as a failed review, not a pass"
    throw err
  }
  const failed = !review.is_standard_curriculum_problem || !review.difficulty_appropriate || !review.teaches_one_clear_concept || !review.natural_python_framing
  if (failed) return `quality review rejected: ${review.reason || "no reason given"}`
  return null
}

// One generation + verification attempt. Returns { experiment } on success
// or { rejected: reason } on failure — never throws for an expected
// rejection class; only throws on a genuine infra failure.
async function attemptGeneration(subjectName, unitTitle, difficulty, fewShotBlock, existingExperiments) {
  let parsed
  try {
    const { data } = await AIService.executePrompt("collegeStream.experimentGeneration", {
      subjectName, unitTitle, difficulty, fewShotBlock,
    })
    parsed = data
  } catch (err) {
    if (err instanceof ValidationError) return { rejected: `AI response failed validation: ${err.message}` }
    throw err
  }

  if (scanForDangerousPatterns(parsed.referenceSolution)) {
    return { rejected: "reference solution uses a disallowed operation (file/network/system access)" }
  }

  let run
  try {
    run = await runPython(parsed.referenceSolution, { timeoutMs: PYTHON_TIMEOUT_MS })
  } catch (err) {
    return { rejected: `sandbox error: ${err.message}` }
  }
  if (run.timedOut) return { rejected: "reference solution timed out or exceeded resource limits" }
  if (run.exitCode !== 0) return { rejected: `reference solution exited with code ${run.exitCode}: ${run.stderr.trim().slice(0, 200)}` }
  const expectedStdout = run.stdout.trim()
  if (!expectedStdout) return { rejected: "reference solution produced empty stdout — degenerate experiment" }

  const dupReason = isDuplicateOfExisting(parsed, existingExperiments)
  if (dupReason) return { rejected: dupReason }

  const reviewReason = await reviewExperimentQuality(subjectName, unitTitle, difficulty, parsed)
  if (reviewReason) return { rejected: reviewReason }

  return {
    experiment: {
      title: parsed.title.trim(),
      prompt: parsed.prompt.trim(),
      difficulty,
      rubric: { type: "python_stdout_match", timeout_ms: 3000, expected_stdout: expectedStdout },
      reference_solution: parsed.referenceSolution,
      elo_reward: ELO_REWARD_BY_DIFFICULTY[difficulty],
      time_limit_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      estimated_minutes: TIME_LIMIT_BY_DIFFICULTY[difficulty],
      tier: "foundation",
      challenge_type: "coding",
      category: subjectName,
    },
  }
}

// find-or-create helpers — idempotent, so re-running this script never
// duplicates a semester/subject/unit that already exists.
async function findOrCreateSemester(streamId, number) {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("semesters").select("id").eq("stream_id", streamId).eq("number", number).maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id
  const { data, error } = await supabaseAdmin.from("semesters").insert({ stream_id: streamId, number }).select("id").single()
  if (error) throw error
  return data.id
}
// DEFECT FIX (production verification, 2026-08-19): every real read path
// (routes/arenaCollegeStream.js's getSubjectsForSemesters — GET .../
// all-experiments, next-experiment, history, leaderboard, and the submit
// route's tier-lock check via getStreamIdForUnit) resolves a semester's
// subjects through the `semester_subjects` join table, NOT via
// subjects.semester_id directly (that column is a legacy/unused FK from
// this table's own read path's perspective). The original version of this
// function only set subjects.semester_id, so every subject it created was
// invisible to a real student — content existed in the DB but no live
// route could ever surface it. Confirmed live via a real HTTP submit
// against Civil/EEE/ECE/MBA before this fix; a one-off SQL backfill
// repaired the 5 streams already generated at the time this was found.
async function findOrCreateSubject(semesterId, name, slug) {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("subjects").select("id").eq("semester_id", semesterId).eq("slug", slug).maybeSingle()
  if (findErr) throw findErr
  const subjectId = existing
    ? existing.id
    : (await (async () => {
        const { data, error } = await supabaseAdmin.from("subjects").insert({ semester_id: semesterId, name, slug }).select("id").single()
        if (error) throw error
        return data.id
      })())

  const { data: existingLink, error: linkFindErr } = await supabaseAdmin
    .from("semester_subjects").select("semester_id").eq("semester_id", semesterId).eq("subject_id", subjectId).maybeSingle()
  if (linkFindErr) throw linkFindErr
  if (!existingLink) {
    const { error: linkErr } = await supabaseAdmin.from("semester_subjects").insert({ semester_id: semesterId, subject_id: subjectId })
    if (linkErr) throw linkErr
  }
  return subjectId
}
async function findOrCreateUnit(subjectId, title, sequence) {
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("units").select("id").eq("subject_id", subjectId).eq("title", title).maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id
  const { data, error } = await supabaseAdmin.from("units").insert({ subject_id: subjectId, title, sequence }).select("id").single()
  if (error) throw error
  return data.id
}

async function generateForUnit(unitId, unitTitle, subjectName, fewShotBlock) {
  const result = { unitTitle, inserted: 0, rejections: [] }
  const { data: existingExperiments, error: existingErr } = await supabaseAdmin
    .from("experiments").select("title,prompt,difficulty").eq("unit_id", unitId)
  if (existingErr) throw existingErr

  const slots = remainingSlots(existingExperiments || [], UNIT_DIFFICULTY_PLAN)
  result.totalSlots = slots.length
  if (slots.length === 0) {
    result.alreadyComplete = true
    return result
  }

  const experimentsToInsert = []
  for (const difficulty of slots) {
    let slotFilled = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_SLOT && !slotFilled; attempt++) {
      let outcome = null
      let rateLimitRetries = 0
      for (;;) {
        try {
          outcome = await attemptGeneration(subjectName, unitTitle, difficulty, fewShotBlock, [...(existingExperiments || []), ...experimentsToInsert])
          break
        } catch (err) {
          if (isRateLimitError(err) && rateLimitRetries < MAX_RATE_LIMIT_RETRIES) {
            rateLimitRetries++
            const waitMs = extractRetryDelayMs(err)
            log(`  ${unitTitle} / ${difficulty}: rate-limited, waiting ${Math.round(waitMs / 1000)}s (retry ${rateLimitRetries}/${MAX_RATE_LIMIT_RETRIES})…`)
            await sleep(waitMs)
            continue
          }
          result.rejections.push({ difficulty, attempt, reason: `infra error: ${err.message}` })
          outcome = null
          break
        }
      }
      if (!outcome) break
      if (outcome.experiment) {
        experimentsToInsert.push(outcome.experiment)
        slotFilled = true
      } else {
        result.rejections.push({ difficulty, attempt, reason: outcome.rejected })
      }
      await sleep(GENERATION_PACING_MS)
    }
    if (!slotFilled) log(`  ${unitTitle} / ${difficulty}: all ${MAX_ATTEMPTS_PER_SLOT} attempts rejected — skipping this slot`)
  }

  if (experimentsToInsert.length > 0) {
    const { error } = await supabaseAdmin.from("experiments").insert(experimentsToInsert.map(e => ({ ...e, unit_id: unitId })))
    if (error) {
      result.rejections.push({ difficulty: "(insert)", attempt: 0, reason: `DB insert failed: ${error.message}` })
    } else {
      result.inserted = experimentsToInsert.length
    }
  }
  return result
}

async function generateForStream(streamSlug, streamId, fewShotBlock, unitLimit) {
  const config = STREAM_CONFIGS[streamSlug]
  if (!config) throw new Error(`No STREAM_CONFIGS entry for "${streamSlug}"`)

  const semesterId = await findOrCreateSemester(streamId, SEMESTER_NUMBER)
  const subjectId = await findOrCreateSubject(semesterId, config.subjectName, config.subjectSlug)

  let units = config.units
  if (Number.isFinite(unitLimit) && unitLimit > 0) units = units.slice(0, unitLimit)

  const unitResults = []
  for (let i = 0; i < units.length; i++) {
    const unitId = await findOrCreateUnit(subjectId, units[i], i + 1)
    log(`  Unit "${units[i]}"…`)
    const result = await generateForUnit(unitId, units[i], config.subjectName, fewShotBlock)
    unitResults.push(result)
    if (result.alreadyComplete) {
      log(`    -> already has all ${UNIT_DIFFICULTY_PLAN.length} slots filled — nothing to generate`)
    } else {
      log(`    -> ${result.inserted}/${result.totalSlots} open slot(s) filled, ${result.rejections.length} rejection(s) logged`)
    }
  }
  return { streamSlug, subjectName: config.subjectName, unitResults }
}

async function main() {
  if (!checkPythonAvailable()) {
    throw new Error("python3 isn't available in this environment — cannot verify any experiment by real execution. Aborting rather than generating unverifiable content.")
  }

  log("Fetching few-shot examples from live python_stdout_match experiments…")
  const examples = await fetchFewShotExamples()
  const fewShotBlock = buildFewShotBlock(examples)
  log(`Loaded ${examples.length} few-shot examples.`)

  const { data: streams, error: streamsErr } = await supabaseAdmin.from("streams").select("id,slug").in("slug", Object.keys(STREAM_CONFIGS))
  if (streamsErr) throw streamsErr
  const streamsBySlug = new Map((streams || []).map(s => [s.slug, s.id]))

  const targetSlugsEnv = String(process.env.TARGET_STREAMS || "").split(",").map(s => s.trim()).filter(Boolean)
  let targetSlugs = targetSlugsEnv.length > 0 ? targetSlugsEnv : Object.keys(STREAM_CONFIGS)
  targetSlugs = targetSlugs.filter(slug => {
    if (!streamsBySlug.has(slug)) { log(`⚠ no "streams" row for slug "${slug}" — skipping`); return false }
    return true
  })

  const limit = parseInt(process.env.LIMIT, 10)
  if (Number.isFinite(limit) && limit > 0) {
    log(`LIMIT=${limit} set — restricting this run to the first ${limit} target stream(s).`)
    targetSlugs = targetSlugs.slice(0, limit)
  }
  const unitLimit = parseInt(process.env.TARGET_UNITS, 10)

  log(`${targetSlugs.length} stream(s) targeted this run.`)
  if (targetSlugs.length === 0) { log("Nothing to do."); return }

  const results = []
  for (const slug of targetSlugs) {
    log(`Generating for stream "${slug}"…`)
    const result = await generateForStream(slug, streamsBySlug.get(slug), fewShotBlock, unitLimit)
    results.push(result)
  }

  log("\n" + "=".repeat(70))
  log("PER-STREAM SUMMARY")
  log("=".repeat(70))
  let totalInserted = 0, totalPossible = 0, totalRejections = 0
  for (const r of results) {
    log(`${r.streamSlug} (${r.subjectName}):`)
    for (const u of r.unitResults) {
      if (u.alreadyComplete) { log(`    ${u.unitTitle}: already complete`); continue }
      totalInserted += u.inserted
      totalPossible += u.totalSlots
      totalRejections += u.rejections.length
      log(`    ${u.unitTitle}: ${u.inserted}/${u.totalSlots} inserted, ${u.rejections.length} rejection(s)`)
      for (const rej of u.rejections) log(`        - [${rej.difficulty}, attempt ${rej.attempt}] ${rej.reason}`)
    }
  }
  log("\n" + "=".repeat(70))
  log(`TOTAL: ${totalInserted}/${totalPossible} experiments inserted across ${results.length} stream(s), ${totalRejections} total rejections`)
  log("=".repeat(70))
}

main().catch(err => {
  console.error("[generateCollegeStreamContent] FATAL:", err)
  process.exit(1)
})
