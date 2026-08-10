// Routes: POST /api/arena/daily, /challenge, /review, /hint, /run-tests
// Generation (/daily): Gemini 2.5 Flash (primary) → Groq fallback
//   Tasks are sticky — generated once, stored in Supabase, reused until completed.
//   Gemini free tier: 1,500 req/day — more than sufficient.
// Grading (/review): Claude Haiku (quality feedback)
// /run-tests: actual code execution (child_process) — zero AI tokens
import { Router }                          from "express"
import { groq, GROQ_FAST }                 from "../lib/groq.js"
import { gradeSubmission }                 from "../lib/claude.js"
import { geminiGenerateMission, resolveDomainContext, getGenModel } from "../lib/gemini.js"
import { exec }                            from "child_process"
import { writeFile, unlink, mkdtemp, rm }   from "fs/promises"
import { tmpdir }                          from "os"
import { join }                            from "path"
import jwt                                  from "jsonwebtoken"
import { compileCircuitMission, isCircuitDomain } from "../lib/arena/missionCompiler.js"
import { supabaseAdmin }                   from "../lib/supabase.js"
import { getArenaTaskQuota, countTodaysDomainMissionCompletions } from "../lib/arenaPlanQuota.js"

const router = Router()

// ── P0-5: server-owned ELO for the /review path ──────────────────────────────
// Mirrors the formula in grading-worker.js / arenaV2.js (single source of truth).
const CHALLENGE_ELO = { Easy: 800, Medium: 1100, Hard: 1400, Expert: 1700 }
// 2026-07-27 P0 fix: same uncapped-positive-delta issue as grading-worker.js's
// computeEloUpdate (kept in sync with that fix — see the comment there for
// the full rationale). Hard maxes at +15, Medium +12, Easy +8, going forward
// only; existing profiles.elo_history is not retroactively recomputed.
const MAX_POSITIVE_DELTA_BY_DIFFICULTY = { Easy: 8, Medium: 12, Hard: 15, Expert: 18 }
// 2026-07-27: minimum score (0-100) required before a submission can move
// ELO upward at all — see grading-worker.js's computeEloUpdate for the
// full rationale (near-empty submissions exploiting ELO expectancy math).
const MIN_SCORE_FOR_POSITIVE_DELTA = 20
function computeReviewEloDelta({ userElo, difficulty, score, timeTakenSecs = 0, estimatedSecs = 0 }) {
  const challengeElo = CHALLENGE_ELO[difficulty] || 1100
  const expected     = 1 / (1 + Math.pow(10, (challengeElo - userElo) / 400))
  const actual       = Math.max(0, Math.min(1, score / 100))
  const K            = userElo < 800 ? 48 : userElo < 1100 ? 36 : userElo < 1400 ? 28 : 20
  const timeRatio    = estimatedSecs > 0 ? timeTakenSecs / estimatedSecs : 1
  const timeBonus    = timeRatio < 0.5 ? 1.10 : timeRatio < 0.75 ? 1.05 : 1.00
  let   delta        = Math.round(K * (actual - expected) * timeBonus)
  if (actual * 100 < MIN_SCORE_FOR_POSITIVE_DELTA && delta > 0) delta = 0
  if (actual >= 0.7 && delta < 3) delta = 3
  if (delta < -30) delta = -30
  const positiveCap = MAX_POSITIVE_DELTA_BY_DIFFICULTY[difficulty] ?? MAX_POSITIVE_DELTA_BY_DIFFICULTY.Medium
  if (delta > positiveCap) delta = positiveCap
  return delta
}
// Optional auth — returns the user id if a valid Supabase JWT is present, else null.
// (Non-breaking: the endpoint still returns the review when no/!valid token; it just
//  can't do the authoritative ELO write. Callers should send the bearer token.)
function optionalUid(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!token || !secret) return null
  try { return jwt.verify(token, secret, { algorithms: ["HS256"] }).sub || null }
  catch { return null }
}

// ── GET /api/arena/skill-graph — 2026-07-27 ───────────────────────────────────
// Read-only. Since the 2026-07-18 fix (see useArenaMissions.js's "BUG FIX"
// comment) correctly removed the client-side applySkillUpdates() call that
// was double-writing ELO via a second, out-of-sync formula, nothing ever
// replaced it as a *safe, read-only* source for the Aura dashboard's skill
// radar — profiles.skill_graph (the JSONB blob Aura.jsx reads) has been
// frozen/stale ever since, even though grading-worker.js has continued to
// upsert real, per-skill, proof-backed rows into the `skill_graph` TABLE
// (see grading-worker.js's "Skill graph upsert" background write) on every
// scored Arena submission. This endpoint exposes that already-live table so
// Aura.jsx can render a radar that actually reflects completed missions,
// without reintroducing any write-side race: it performs no writes at all.
// elo_value (400-2000ish rating scale) is rescaled 0-100 for the radar here
// rather than in the frontend, so every caller gets the same scale.
// Exported so other modules can derive the SAME 0-100 radar score from a raw
// skill_graph.elo_value without duplicating this formula (roleGapSeeder.js).
export function eloValueToRadarScore(eloValue) {
  const v = Number(eloValue) || 400
  return Math.max(0, Math.min(100, Math.round(((v - 400) / 1200) * 100)))
}
router.get("/skill-graph", async (req, res) => {
  try {
    const authedUid = optionalUid(req)
    const userId = authedUid || req.query.userId
    if (!userId) return res.status(401).json({ error: "Missing or invalid auth token / userId" })
    // If a token WAS presented, it must match the requested userId — never
    // let a valid token for user A read user B's skill graph via ?userId=.
    if (authedUid && req.query.userId && req.query.userId !== authedUid) {
      return res.status(403).json({ error: "Forbidden" })
    }

    const { data, error } = await supabaseAdmin
      .from("skill_graph")
      .select("skill_name, skill_slug, domain, elo_value, last_proof_date, verification_state, updated_at")
      .eq("user_id", userId)
      .eq("is_current", true)
      .order("elo_value", { ascending: false })
    if (error) throw error

    const skills = (data || []).map(row => ({
      label:              row.skill_name,
      skill:              row.skill_name,
      value:              eloValueToRadarScore(row.elo_value),
      score:              eloValueToRadarScore(row.elo_value),
      elo:                row.elo_value,
      domain:             row.domain,
      verified:           row.verification_state === "verified",
      last_proof_date:    row.last_proof_date,
      updated_at:         row.updated_at,
      source:             "arena",
    }))
    res.json({ skills })
  } catch (e) {
    console.error("[arena/skill-graph]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ── Execution semaphore ───────────────────────────────────────────────────────
// Caps concurrent child_process.exec calls at 40.
// Without this, 50k users could spawn thousands of OS processes simultaneously,
// exhausting file descriptors, RAM, and the OS process table → OOM crash.
// Requests beyond the cap wait in queue rather than spawning more processes.
const MAX_CONCURRENT_EXEC = 40
let _activeExec = 0
const _execQueue = []
function acquireExecSlot() {
  return new Promise(resolve => {
    if (_activeExec < MAX_CONCURRENT_EXEC) { _activeExec++; resolve() }
    else _execQueue.push(resolve)
  })
}
function releaseExecSlot() {
  if (_execQueue.length > 0) {
    const next = _execQueue.shift()
    next() // hand slot directly to next waiter
  } else {
    _activeExec--
  }
}

// ── Sandboxed code executor (Python / JavaScript) ────────────────────────────
// Runs user code in a temp file with a strict 8-second timeout.
// Returns { stdout, stderr, error }
async function executeCode(code, language = "python", timeoutMs = 8000) {
  const ext   = language === "javascript" || language === "js" ? "js" : "py"
  const cmd   = ext === "js" ? "node" : "python3"
  const dir   = await mkdtemp(join(tmpdir(), "arena-"))
  const file  = join(dir, `solution.${ext}`)

  await acquireExecSlot()
  try {
    await writeFile(file, code, "utf8")
    return await new Promise((resolve) => {
      exec(
        `${cmd} "${file}"`,
        { timeout: timeoutMs, maxBuffer: 1024 * 512 },
        async (error, stdout, stderr) => {
          try { await unlink(file) } catch {}
          try { await rm(dir, { recursive: true, force: true }) } catch {}
          if (error && error.killed) {
            resolve({ stdout: "", stderr: "", error: "Time Limit Exceeded (>8s)" })
          } else {
            resolve({ stdout: stdout || "", stderr: stderr || "", error: error?.message || null })
          }
        }
      )
    })
  } catch (e) {
    return { stdout: "", stderr: "", error: e.message }
  } finally {
    releaseExecSlot()
  }
}

// ── Build runnable code for a test case ──────────────────────────────────────
// Appends a driver block to the user's solution so it runs against specific inputs.
function buildRunnableCode(userCode, testCase, language) {
  const lang = (language || "python").toLowerCase()

  // Normalize expected output — DB uses snake_case, AI missions use camelCase
  const rawExpected = testCase.expected_output ?? testCase.expectedOutput ?? ""

  // Parse input lines — each newline-separated segment becomes one function arg.
  // Each segment is kept as a Python/JS literal (JSON-safe).
  const rawInput = String(testCase.input ?? "")
  const segments = rawInput.split("\n").map(s => s.trim()).filter(Boolean)

  // Convert each segment to a valid Python/JS literal.
  // If the segment is already valid JSON (number, array, object, bool), keep as-is.
  // Otherwise wrap in quotes as a string argument.
  function toLiteral(seg) {
    try {
      JSON.parse(seg)    // valid JSON → safe to use as-is in Python/JS
      return seg
    } catch {
      // Raw string — quote it so the generated call is valid
      return JSON.stringify(seg)
    }
  }
  const argList = segments.map(toLiteral).join(", ")

  if (lang === "python") {
    // Find the primary function — prefer class method, fall back to bare def
    const classFn = userCode.match(/def\s+(\w+)\s*\(\s*self/)
    const bareFn  = userCode.match(/^def\s+(\w+)\s*\(/m)
    const fnName  = classFn ? classFn[1] : (bareFn ? bareFn[1] : null)

    const driver = `

# ── Auto-generated test driver ──────────────────────────
import json as _json, sys as _sys
def _serialize(v):
    if isinstance(v, bool):   return _json.dumps(v)   # True→"true", False→"false"
    if isinstance(v, list):   return _json.dumps(v)
    if isinstance(v, dict):   return _json.dumps(v)
    if v is None:             return "null"
    return str(v)

try:
    ${classFn ? `_sol = Solution()\n    _result = _sol.${fnName}(${argList})` : `_result = ${fnName}(${argList})`}
    print(_serialize(_result))
except Exception as _e:
    print(f"Runtime Error: {_e}", file=_sys.stderr)
`
    return fnName ? `${userCode}${driver}` : userCode
  }

  if (lang === "javascript" || lang === "js") {
    const fnMatch = userCode.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:function|\())/)
    const fnName  = fnMatch ? (fnMatch[1] || fnMatch[2]) : null

    const driver = `

// ── Auto-generated test driver ──
try {
  const _result = ${fnName}(${argList});
  console.log(JSON.stringify(_result));
} catch(_e) { console.error("Runtime Error:", _e.message); }
`
    return fnName ? `${userCode}${driver}` : userCode
  }

  return userCode
}

// ─── 6. Daily Tasks ───────────────────────────────────────────────────────────
// NOTE: Tasks are STICKY — generated once per slot, stored in Supabase, and
// reused until the user completes them. Free users: 1 task/day max.
// Pro users: 3 tasks total until all completed. API calls are rare.
//
// Provider priority: Gemini 2.5 Flash → Groq (llama-3.1-8b-instant) fallback
router.post("/daily", async (req, res) => {
  const {
    keyword="Software Development", domainKey="swe",
    eloRating=800, weakAreas=[], path="student",
    recentSkills=[], completedMissions=[],
    requestedSlots=1, slotIndex=0,
    // 2026-08-03: Student/Job Seeker split. studentStage is only meaningful
    // when path==="student" — sent by the frontend from userData.studentStage.
    studentStage=null,
  } = req.body
  const isJobSeeker = path === "student" && studentStage === "job_seeker"

  // Student path: cap difficulty at Medium-Hard even if ELO says otherwise.
  // Job seekers are exempt — they're interviewing against a real hiring bar,
  // not learning fundamentals, so ELO alone decides their difficulty same as
  // the professional path.
  const rawDiff  = eloRating < 700 ? "Easy" : eloRating < 1000 ? "Medium" : eloRating < 1300 ? "Medium-Hard" : "Hard"
  const diff     = path === "student" && !isJobSeeker && rawDiff === "Hard" ? "Medium-Hard" : rawDiff
  const difficulty = diff.split("-")[0]
  // 2026-07-27 P0 fix: this preview badge ("+N ELO" shown before the mission
  // is even started) used to be `eloRating * 0.02..0.05`, which for a Hard
  // mission at a low ELO could preview (and the old uncapped formula would
  // then actually award) 30-45+ points on a single task. The real award is
  // now hard-capped in computeReviewEloDelta/computeEloUpdate — keep this
  // preview inside the same ceiling so what's promised on the card is what
  // the user can actually receive.
  const ELO_PREVIEW_RANGE_BY_DIFFICULTY = {
    Easy:   { min: 3,  max: 8  },
    Medium: { min: 6,  max: 12 },
    Hard:   { min: 10, max: 15 },
    Expert: { min: 12, max: 18 },
  }
  const previewRange = ELO_PREVIEW_RANGE_BY_DIFFICULTY[difficulty] || ELO_PREVIEW_RANGE_BY_DIFFICULTY.Medium
  const eloMin   = previewRange.min
  const eloMax   = previewRange.max
  const eloGain  = eloMin + Math.floor(Math.random() * (eloMax - eloMin))

  // ── Structured-workstation path: Mission Compiler ─────────────────────────────
  // Circuit Lab (ECE) missions are COMPILED from a parameterized template library
  // — pick template → randomize parameters → derive a consistent target →
  // validate against the real DC solver → return a complete `simulation` payload.
  // This fixes the empty "requires a simulation field" Circuit Lab (the LLM path
  // never emits simulation data). LLM remains the fallback. See lib/arena/missionCompiler.js.
  if (isCircuitDomain(domainKey, keyword)) {
    try {
      const mission = compileCircuitMission({ difficulty, eloGain })
      console.log(`[arena/daily] compiled circuit mission for ${keyword} (deterministic)`)
      return res.json({ tasks: [mission] })
    } catch (compileErr) {
      console.warn(`[arena/daily] circuit compile failed (${compileErr.message}) — falling back to LLM`)
    }
  }

  // ── Attempt 1: Gemini 2.5 Flash ──────────────────────────────────────────────
  try {
    const mission = await geminiGenerateMission({
      keyword, domainKey, eloRating, difficulty,
      weakAreas, path, recentSkills, eloGain, studentStage,
      completedMissions: (completedMissions || []).slice(0, 30),
    })
    console.log(`[arena/daily] Gemini: generated mission for ${keyword} ELO:${eloRating} slot:${slotIndex}`)
    return res.json({ tasks: [mission] })
  } catch (geminiErr) {
    console.warn(`[arena/daily] Gemini failed (${geminiErr.message}), falling back to Groq…`)
  }

  // ── Attempt 2: Groq fallback ──────────────────────────────────────────────────
  try {
    // Same resolution as the Gemini path — static DOMAIN_CONTEXT, then the
    // AI-generated/DB-cached manifest, then swe. Previously this block used
    // DOMAIN_CONTEXT[domainKey] directly and hardcoded "type":"Software
    // Engineering" / "workstation":"code_editor" in the prompt regardless of
    // domain — every Groq-fallback mission for a non-swe role was silently
    // generic, same bug class as the Gemini path had before ctx was threaded through.
    const ctx = await resolveDomainContext(getGenModel(), domainKey, keyword)

    const raw = await groq([
      { role: "system", content: "You generate real-world Arena challenges for an Indian tech career platform. Return ONLY valid JSON — a single object, no array, no markdown." },
      { role: "user",   content:
`Domain: ${keyword} | ELO: ${eloRating} | Difficulty: ${difficulty} | Path: ${path}
Weak areas: ${weakAreas.slice(0,3).join(", ")||"fundamentals"}
${isJobSeeker ? "JOB SEEKER PATH: actively interviewing for real roles — mirror the real hiring bar for this role, do not water it down to a classroom exercise." : path === "student" ? "STUDENT PATH: fresher/entry-level user — keep scope simple and beginner-appropriate, ONE skill only." : ""}
${completedMissions.length ? `Avoid repeating these already-completed missions: ${completedMissions.slice(0,10).join(", ")}` : ""}

Primary tools for this role: ${ctx.tools}
Preferred language/stack: ${ctx.lang}

Use a REAL Indian company (Swiggy, Razorpay, CRED, Zepto, Zomato, PhonePe, Meesho, Flipkart, Paytm, etc.).

CRITICAL: Do NOT include solution steps, algorithm names, or approach hints in any field. Hints must be guiding questions only.

Return ONE JSON object (concise strings):
{"id":"slug","title":"short task-specific title","company":"Indian co","difficulty":"${difficulty}","type":"${ctx.type}","scenario":"1-2 sentences of context only — no solution hints","taskDescription":"what to build only — not how","objective":"1 measurable outcome","workstation":"${ctx.workstation}","starterCode":"// scaffold only","expectedOutput":"what correct output looks like","eloGain":${eloGain},"timeLimit":${difficulty === "Hard" ? 55 : difficulty === "Medium" ? 30 : 20},"tags":["t1","t2"],"hints":["guiding question 1","guiding question 2"]}` },
    ], { max_tokens: 1200, json: false })

    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim()
    const obj = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1))
    if (!obj?.title) throw new Error("Groq returned invalid mission structure")

    // Always override AI-generated starterCode/category with our curated
    // template — same reliability reasoning as the Gemini path in gemini.js.
    if (ctx?.starterCode) {
      obj.starterCode = ctx.starterCode.replace(/\{company\}/g, obj.company || "Company")
    }
    if (ctx?.category) {
      obj.category = ctx.category
    }

    console.log(`[arena/daily] Groq fallback: generated mission for ${keyword} ELO:${eloRating}`)
    return res.json({ tasks: [obj] })
  } catch (groqErr) {
    console.error("[arena/daily] Both Gemini and Groq failed:", groqErr.message)
    return res.status(500).json({ error: groqErr.message })
  }
})

// ─── 7. Full Challenge ────────────────────────────────────────────────────────
router.post("/challenge", async (req, res) => {
  const { keyword="Software Development", eloRating=800, taskIndex=0 } = req.body
  try {
    const raw = await groq([
      { role: "system", content: "Generate full Arena challenge details. Return ONLY valid JSON." },
      { role: "user",   content: `Challenge #${taskIndex+1} for "${keyword}" ELO ${eloRating}.\nReturn JSON: {"id":"...","title":"...","company":"<Indian company>","difficulty":"Easy|Medium|Hard","type":"...","scenario":"...","taskDescription":"...","workstation":"python_notebook|sql_editor|code_editor|mcq|case_study","dataset":"...","starterCode":"...","testCases":[{"input":"...","expectedOutput":"...","description":"..."}],"eloGain":<n>,"timeLimit":<mins>,"tags":["..."],"hints":["...","...","..."]}` },
    ], { max_tokens: 1200, json: true })
    return res.json({ task: JSON.parse(raw) })
  } catch (e) { console.error("[arena/challenge]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 8. Review Answer — Claude Haiku with behavioral context ─────────────────
router.post("/review", async (req, res) => {
  const { challenge={}, answer="", output="", testResults=[], userContext={}, behavioral={}, eloRating, keyword, timedOut=false, challengeType="" } = req.body
  const elo = eloRating || userContext.eloRating || 800
  try {
    // ── Daily mission quota — real enforcement, not just a UI lock (2026-07-28) ──
    // Only "domain" challenges (Arena's daily mission slots) are quota'd — DSA
    // practice challenges aren't part of the plan-gated slot system. Checked
    // before calling the AI grader at all, so an over-quota submission never
    // burns an AI call and never reaches the ELO-write block below.
    if (challengeType === "domain") {
      const uidForQuota = optionalUid(req)
      if (uidForQuota) {
        try {
          const { data: prof } = await supabaseAdmin.from("profiles").select("subscription").eq("id", uidForQuota).single()
          const quota = getArenaTaskQuota(prof?.subscription || "free")
          const usedToday = await countTodaysDomainMissionCompletions(supabaseAdmin, uidForQuota)
          if (usedToday >= quota) {
            return res.status(403).json({
              error:   "daily_quota_reached",
              quota,
              usedToday,
              message: `You've used all ${quota} of today's Arena missions on your plan. Upgrade for more daily missions.`,
            })
          }
        } catch (quotaErr) {
          console.warn("[arena/review] quota check skipped:", quotaErr.message) // fail open — never block on our own bug
        }
      }
    }

    const totalTests  = testResults.length
    const passedTests = testResults.filter(r => r.passed).length
    const testSummary = totalTests > 0
      ? `Test results: ${passedTests}/${totalTests} passed.${
          testResults.slice(0, 3).map(r =>
            `\n  input=${r.input} | expected=${r.expected} | got=${r.actual} | ${r.passed?"✓":"✗"}`
          ).join("")
        }`
      : ""

    // Build behavioral context string for the AI
    const pasteCount    = behavioral.pasteCount    || 0
    const keystrokes    = behavioral.keystrokeCount || 0
    const timeOnTask    = behavioral.timeOnTaskSecs || 0
    const pasteRatio    = behavioral.pasteRatio     || 0
    const heavyPaste    = pasteCount > 3

    const behavioralContext = [
      timeOnTask > 0  && `Candidate spent ${Math.floor(timeOnTask/60)}m ${timeOnTask%60}s on this challenge.`,
      keystrokes > 0  && `Total keystrokes: ${keystrokes}.`,
      pasteCount > 0  && `Paste events: ${pasteCount}${heavyPaste ? " (heavy paste usage — may indicate copied solution)" : ""}.`,
      timedOut        && "Submission was triggered by timer expiry — partial work only.",
    ].filter(Boolean).join(" ")

    const candidateAnswer = [
      String(typeof answer === "object" ? JSON.stringify(answer) : answer).slice(0, 2500),
      testSummary,
      behavioralContext ? `\nBehavioural context: ${behavioralContext}` : "",
    ].filter(Boolean).join("\n\n")

    let review = await gradeSubmission({
      challengeTitle:  challenge.title  || "Technical Challenge",
      scenario:        challenge.statement || challenge.scenario || challenge.taskDescription || challenge.description || "",
      expectedOutput:  challenge.expectedOutput || "",
      candidateAnswer,
      eloRating:       elo,
    }).catch(async (claudeErr) => {
      console.warn("[arena/review] Claude failed, falling back to Groq:", claudeErr.message)
      const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : null
      const behavNote = heavyPaste ? `\nNote: heavy paste usage detected (${pasteCount} pastes). Mention this in feedback.` : ""
      const raw = await groq([
        { role: "system", content: "You are a senior technical interviewer. Give specific, honest, personalised feedback. Return ONLY valid JSON." },
        { role: "user",   content: `Review this solution for "${challenge.title || "Technical Task"}" (ELO: ${elo}).
${testSummary}${behavNote}

Code:
${String(answer).slice(0, 1500)}

Return JSON: {"score":${passRate !== null ? passRate : "<0-100>"},"grade":"<A+|A|B+|B|C|D>","summary":"<2 specific sentences about the solution quality — mention test results, code clarity, and any behavioural signals>","strengths":["<strength 1>","<strength 2>"],"improvements":["<specific improvement 1>","<specific improvement 2>"],"tip":"<1 sentence actionable advice>","rubric":[{"criterion":"Correctness","score":<0-100>},{"criterion":"Time Complexity","score":<0-100>},{"criterion":"Space Complexity","score":<0-100>},{"criterion":"Code Quality","score":<0-100>},{"criterion":"Edge Cases","score":<0-100>}]}` },
      ], { max_tokens: 700, json: true })
      try { return JSON.parse(raw) } catch { return {} }
    })

    // ── P0-5: authoritative, server-owned ELO write ─────────────────────────
    // ELO is computed and written HERE (service_role), from the server-graded
    // score and the user's REAL current ELO read from the DB — never from the
    // client-supplied eloRating, and never written by the browser. Requires a
    // valid bearer token; the client no longer writes profiles.elo_rating.
    const uid = optionalUid(req)
    if (uid && review && typeof review.score !== "undefined") {
      try {
        const { supabase: sb } = await import("../lib/supabase.js")
        const db = sb()
        const { data: prof } = await db.from("profiles").select("elo_rating").eq("id", uid).single()
        const userElo = prof?.elo_rating || elo || 800
        const score   = Math.max(0, Math.min(100, Number(review.score) || 0))
        const estMins = challenge.timeLimit || challenge.estimated_mins || challenge.estimatedMins || 30
        const delta   = computeReviewEloDelta({
          userElo,
          difficulty:    challenge.difficulty || "Medium",
          score,
          timeTakenSecs: behavioral.timeOnTaskSecs || 0,
          estimatedSecs: estMins * 60,
        })
        const today = new Date().toISOString().slice(0, 10)
        const { data: applied } = await db.rpc("apply_arena_result", { p_uid: uid, p_elo_delta: delta, p_today: today })
        const row = Array.isArray(applied) ? applied[0] : applied
        review.eloDelta       = delta
        review.newElo         = row?.elo_rating ?? (userElo + delta)
        review.newStreak      = row?.arena_streak ?? null
        review.arenaCompleted = row?.arena_completed ?? null

        // 2026-07-27 fix: this is the ONLY authoritative ELO-write path for
        // the live Arena submit flow (Arena.jsx's client-side ELO formula
        // was removed the same day — see grading-worker.js's identical
        // upsert for the other, queue-based grading path). streak_events
        // is what drives the Streaks tab's heatmap + coding/domain streak
        // counters — apply_arena_result already updates profiles.arena_streak
        // above, but never touched this table, so the heatmap stayed
        // permanently empty for every submission going through /review.
        await db.from("streak_events").upsert({
          user_id:         uid,
          event_date:      today,
          challenge_count: 1,
          domains:         [challenge.domain || "swe"],
          elo_gained:      Math.max(0, delta),
          is_freeze_used:  false,
          updated_at:      new Date().toISOString(),
        }, {
          onConflict:      "user_id,event_date",
          ignoreDuplicates: false,
        }).then(({ error }) => {
          if (error) console.warn("[arena/review] streak_events write failed:", error.message)
        })
      } catch (eloErr) {
        console.warn("[arena/review] ELO write skipped:", eloErr.message)
      }
    }

    return res.json(review)
  } catch (e) { console.error("[arena/review]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── SQL evaluation via AI (Groq) ────────────────────────────────────────────
// SQL test cases in Common Challenges use descriptive inputs ("Trips/Users tables
// as described"), not actual data rows — so we can't execute them in a process.
// Instead, ask Groq to evaluate the query's correctness against the schema.
// SCALE FIX: all test cases evaluated in parallel via Promise.all
// Previously: sequential for-loop → N × Groq latency (e.g. 5 cases = ~15s)
// Now: all cases fire simultaneously → ~1× Groq latency regardless of case count
async function evaluateSQLWithAI(sqlQuery, testCases, challenge) {
  const schema = challenge.statement || challenge.description || challenge.title || ""

  return Promise.all(testCases.map(async (tc) => {
    const start    = Date.now()
    const expected = String(tc.expected_output ?? tc.expectedOutput ?? "")
    try {
      const raw = await groq([
        { role: "system", content: "You are a senior SQL expert. Evaluate queries accurately AND generate realistic sample output rows. Return ONLY valid JSON, no markdown, no explanation outside JSON." },
        { role: "user",   content:
`Schema / Problem:
${schema}

Expected output description: ${expected}

SQL submitted:
${sqlQuery}

Tasks:
1. Evaluate: Is the SQL syntactically valid and logically correct for the expected output? Check table names, JOIN conditions, WHERE clauses, GROUP BY, ROUND/CAST, date filters.
2. Generate 3–5 realistic sample output rows that this query WOULD return (invent plausible values matching the schema).

Return ONLY this JSON (no extra text):
{
  "passed": true_or_false,
  "actual": "one sentence describing what this query computes",
  "error": null_or_"specific SQL issue found",
  "columns": ["ColName1", "ColName2"],
  "sample_rows": [
    {"ColName1": "value", "ColName2": "value"},
    {"ColName1": "value", "ColName2": "value"}
  ]
}` },
      ], { max_tokens: 700, json: false })

      const cleaned = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)
      const obj     = JSON.parse(cleaned)
      return {
        input:       tc.input ?? "Schema as described",
        expected,
        actual:      obj.actual || (obj.passed ? "Query appears correct" : "Query may be incorrect"),
        passed:      obj.passed === true,
        runtime:     `${Date.now() - start}ms`,
        error:       obj.error || null,
        columns:     Array.isArray(obj.columns)     ? obj.columns     : [],
        sample_rows: Array.isArray(obj.sample_rows) ? obj.sample_rows : [],
      }
    } catch {
      return {
        input:       tc.input ?? "Schema as described",
        expected,
        actual:      "AI evaluation unavailable — click Submit for full review",
        passed:      false,
        runtime:     `${Date.now() - start}ms`,
        error:       null,
        columns:     [],
        sample_rows: [],
      }
    }
  }))
}

// ─── Config / manifest evaluation via AI (Groq) ──────────────────────────────
// YAML (K8s manifests, CI/CD pipelines), HCL (Terraform), Bicep, JSON policies
// etc. CANNOT be executed by python3/node — running them through executeCode
// produces a syntax error and fails every test. Instead we AI-evaluate structure
// and correctness against the challenge brief, mirroring evaluateSQLWithAI.
// SCALE FIX: parallel evaluation same as evaluateSQLWithAI above
async function evaluateConfigWithAI(config, testCases, challenge, language) {
  const brief = challenge.statement || challenge.description || challenge.title || ""
  const cases = testCases.length ? testCases : [{ input: "spec compliance", expected_output: "" }]

  return Promise.all(cases.map(async (tc) => {
    const start    = Date.now()
    const expected = String(tc.expected_output ?? tc.expectedOutput ?? "")
    try {
      const raw = await groq([
        { role: "system", content: `You are a senior DevOps / infrastructure engineer. Evaluate ${language.toUpperCase()} manifests/config for validity and correctness against the requirement. These are declarative files — judge structure, required fields, and values, not runtime output. Return ONLY valid JSON, no markdown.` },
        { role: "user", content:
`Requirement / Brief:
${brief}

Expected outcome: ${expected || "A valid, correct manifest that satisfies the brief."}

${language.toUpperCase()} submitted:
${config}

Task: Determine if the submitted config is syntactically valid AND correctly satisfies the requirement (correct kind/apiVersion, required fields present, sensible values, no placeholders/TODOs left).

Return ONLY this JSON:
{
  "passed": true_or_false,
  "actual": "one sentence describing what this config does",
  "error": null_or_"specific issue (missing field, wrong value, leftover TODO, invalid syntax)"
}` },
      ], { max_tokens: 500, json: false })

      const cleaned = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)
      const obj     = JSON.parse(cleaned)
      return {
        input:   tc.input ?? "spec compliance",
        expected,
        actual:  obj.actual || (obj.passed ? "Config appears correct" : "Config may be incorrect"),
        passed:  obj.passed === true,
        runtime: `${Date.now() - start}ms`,
        error:   obj.error || null,
      }
    } catch {
      return {
        input:   tc.input ?? "spec compliance",
        expected,
        actual:  "AI evaluation unavailable — click Submit for full review",
        passed:  false,
        runtime: `${Date.now() - start}ms`,
        error:   null,
      }
    }
  }))
}

// Languages that are declarative config, not executable programs.
const CONFIG_LANGUAGES = new Set(["yaml", "yml", "hcl", "terraform", "bicep", "dockerfile", "json", "helm"])

// ─── GET /problem/:id/detail — server-side problem detail hydration ─────────
// 2026-08-10 security fix: public.problems.test_cases/editorial were removed
// from anon/authenticated column grants (Supabase migration
// revoke_problems_sensitive_columns_from_client_roles) — they were readable
// in full, for all 241 problems, via a single unauthenticated PostgREST
// query, including hidden test cases and full solution write-ups. This route
// serves the same fields via the service-role client so existing UI (hint
// banner, "Show Solution", post-answer explanations, test running) keeps
// working with no product change — see ArenaCommonChallenges.jsx's
// openChallenge() and ArenaCatalog.jsx's hydrateFullProblem(), both of which
// now call this instead of querying Supabase directly. Already covered by
// the aiLimiter rate limit mounted on the whole /api/arena prefix in server.js.
router.get("/problem/:id/detail", async (req, res) => {
  const { id } = req.params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id || "")
  if (!isUUID) return res.status(400).json({ error: "Invalid id" })
  try {
    const { data, error } = await supabaseAdmin
      .from("problems")
      .select("constraints, examples, test_cases, editorial")
      .eq("id", id)
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: "Not found" })
    return res.json(data)
  } catch (e) {
    console.error("[arena/problem-detail]", e.message)
    return res.status(500).json({ error: e.message })
  }
})

// ─── 9. Run Tests — ACTUAL code execution, zero AI tokens ────────────────────
// Executes user code in a sandboxed child_process for each test case.
// Compares stdout to expectedOutput. Fast, deterministic, no rate limits.
// SQL challenges: evaluated via AI (Groq) — not Python/JS execution.
router.post("/run-tests", async (req, res) => {
  const { code = "", language = "python", challenge = {} } = req.body
  let testCases = req.body.testCases || []

  // ── Integrity fix (2026-08-10): never trust client-supplied test cases for
  // a DB-backed problem — a tampered request could previously fabricate a
  // "passing" testCases array, which flows into testSummary in /review and
  // ultimately into the authoritative server-side ELO write there. When
  // challenge.id matches a real public.problems row, always re-fetch
  // test_cases from the DB (service role) and ignore whatever the client
  // sent. AI-generated daily missions have no persisted DB row (non-UUID or
  // no match), so they still fall back to the client-supplied cases — there
  // is no DB source of truth to check those against.
  const isUUIDStr = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""))
  if (isUUIDStr(challenge.id)) {
    try {
      const { data: dbProblem } = await supabaseAdmin
        .from("problems")
        .select("test_cases")
        .eq("id", challenge.id)
        .maybeSingle()
      if (dbProblem?.test_cases?.length) {
        testCases = dbProblem.test_cases
      }
    } catch (e) {
      console.warn("[arena/run-tests] server-side test-case lookup failed, falling back to client-supplied:", e.message)
    }
  }

  if (!code.trim()) {
    return res.status(400).json({ error: "No code provided." })
  }
  if (testCases.length === 0) {
    return res.status(400).json({ error: "No test cases provided." })
  }

  const langLower = language.toLowerCase()

  // ── SQL: route to AI evaluation instead of Python/JS execution ───────────
  if (langLower === "sql") {
    const results = await evaluateSQLWithAI(code, testCases, challenge)
    const passed  = results.filter(r => r.passed).length
    console.log(`[arena/run-tests] SQL "${challenge.title}" — AI eval: ${passed}/${results.length} passed`)
    return res.json({ results })
  }

  // ── FIX: YAML / Terraform / Bicep / Dockerfile etc. are declarative config
  // and CANNOT be run through python3/node. Route to AI evaluation so DevOps
  // "Run Tests" doesn't fail every case with a python3 syntax error.
  if (CONFIG_LANGUAGES.has(langLower)) {
    const results = await evaluateConfigWithAI(code, testCases, challenge, langLower)
    const passed  = results.filter(r => r.passed).length
    console.log(`[arena/run-tests] ${langLower.toUpperCase()} "${challenge.title}" — AI eval: ${passed}/${results.length} passed`)
    return res.json({ results })
  }

  const results = []

  for (let i = 0; i < testCases.length; i++) {
    const tc      = testCases[i]
    const start   = Date.now()

    try {
      const runnable = buildRunnableCode(code, tc, language)
      const { stdout, stderr, error } = await executeCode(runnable, language)
      const elapsed  = Date.now() - start
      const actual   = stdout.trim()
      // Accept both snake_case (DB) and camelCase (AI missions)
      const expected = String(tc.expected_output ?? tc.expectedOutput ?? "").trim()

      // Normalize comparison: handle [0,1] vs [1,0] for problems where order doesn't matter
      let passed = false
      if (actual === expected) {
        passed = true
      } else {
        // Try JSON parse comparison (handles array order variants)
        try {
          const a = JSON.parse(actual)
          const e = JSON.parse(expected)
          if (JSON.stringify(a) === JSON.stringify(e)) passed = true
          // For problems like Two Sum where [0,1] == [1,0]
          else if (Array.isArray(a) && Array.isArray(e) && a.length === e.length) {
            passed = JSON.stringify([...a].sort((x,y)=>x-y)) === JSON.stringify([...e].sort((x,y)=>x-y))
          }
        } catch {}
      }

      results.push({
        input:    tc.input,
        expected: expected,
        actual:   error ? `Runtime Error: ${error}` : (actual || "(no output)"),
        passed,
        runtime:  `${elapsed}ms`,
        error:    error || (stderr ? stderr.slice(0, 200) : null),
      })
    } catch (e) {
      results.push({
        input:    tc.input,
        expected: String(tc.expected_output ?? tc.expectedOutput ?? "").trim(),
        actual:   `Execution error: ${e.message}`,
        passed:   false,
        runtime:  `${Date.now() - start}ms`,
        error:    e.message,
      })
    }
  }

  const passed = results.filter(r => r.passed).length
  console.log(`[arena/run-tests] "${challenge.title}" — ${passed}/${results.length} passed (${language})`)
  return res.json({ results })
})

// ─── Forge: Personalised maintenance tasks ───────────────────────────────────
// Called by Forge.jsx — generates 5 tasks tailored to user's skills & weak areas
router.post("/forge-tasks", async (req, res) => {
  const { skills="", weakAreas="", eloRating=800, domain="professional", role="professional", yearsExp=1, strengths="" } = req.body
  try {
    const diff = eloRating < 900 ? "intermediate" : eloRating < 1200 ? "senior" : "expert"
    const raw = await groq([
      { role: "system", content: "You generate short professional skill-maintenance tasks (5 min each). Return ONLY valid JSON array." },
      { role: "user", content: `Generate exactly 5 personalised Forge tasks for this professional:

Role/Domain: ${role} | ${domain}
Skills: ${skills}
Strengths: ${strengths || "general"}
Weak areas: ${weakAreas || "fundamentals"}
ELO: ${eloRating} (${diff} level)
Years of experience: ${yearsExp}+

Each task must directly test ONE of their listed skills or plug a gap in their weak areas.
Tasks should be practical, real-world, 5-7 min to complete.

Return JSON array of 5 objects:
[{
  "type": "Micro-Debug|Architecture Review|Code Review|Concept Check|Gap Fix",
  "urgency": "high|medium|low",
  "xp": <30-60>,
  "skill": "<specific skill from their profile>",
  "duration": "<N> min",
  "freshness": <20-90>,
  "title": "<specific actionable title>",
  "desc": "<one sentence describing exactly what they'll do>",
  "scenario": "<the actual challenge text — specific to their skill, include code/SQL/scenario as relevant>",
  "expectedOutput": "<what a good answer looks like>"
}]

freshness: low (20-40) = skill they haven't used recently (high urgency to practice)
freshness: medium (40-70) = skill needs sharpening
freshness: high (70-90) = healthy, low urgency` },
    ], { max_tokens: 2000, json: true })

    let tasks = []
    try {
      const parsed = JSON.parse(raw)
      tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || [])
    } catch {}

    if (tasks.length === 0) throw new Error("No tasks parsed")
    return res.json({ tasks })
  } catch (e) {
    console.error("[arena/forge-tasks]", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── 9. Hint ──────────────────────────────────────────────────────────────────
// ── Integrity violation — record warning, apply ELO penalty, ban if 3rd ────────
// Called by the frontend immediately after detectIntegrity fires isCheat=true.
// Atomically: inserts audit row, increments warning count, bans on 3rd strike.
router.post("/flag-integrity", async (req, res) => {
  const { uid, missionId, missionTitle, flags, verdict, behavioral } = req.body
  if (!uid) return res.status(400).json({ error: "uid required" })

  const ELO_PENALTY = -10

  try {
    const { supabase: sb } = await import("../lib/supabase.js")
    const db = sb()

    // 1. Insert audit row
    await db.from("integrity_warnings").insert({
      uid,
      mission_id:    missionId   || null,
      mission_title: missionTitle || null,
      flags:         JSON.stringify(flags || []),
      verdict:       verdict || "definite_paste",
      elo_penalty:   ELO_PENALTY,
    })

    // 2. Fetch current profile state
    const { data: userData } = await db
      .from("profiles")
      .select("integrity_warning_count, elo_rating, integrity_banned_until")
      .eq("id", uid)
      .single()

    const prevCount = userData?.integrity_warning_count || 0
    const newCount  = prevCount + 1
    const isBanned  = newCount >= 3
    const banUntil  = isBanned
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : (userData?.integrity_banned_until || null)
    const currentElo = userData?.elo_rating || 800
    const newElo    = Math.max(0, currentElo + ELO_PENALTY) // floor at 0

    // 3. Update profile: warning count + ELO penalty + ban if applicable
    const updatePayload = {
      integrity_warning_count: newCount,
      elo_rating:              newElo,
    }
    if (isBanned) updatePayload.integrity_banned_until = banUntil

    await db.from("profiles").update(updatePayload).eq("id", uid)

    return res.json({
      warningCount: newCount,
      eloPenalty:   ELO_PENALTY,
      newElo,
      isBanned,
      banUntil,
    })
  } catch (e) {
    console.error("[arena/flag-integrity]", e.message)
    // Non-fatal — return safe defaults so frontend still shows the modal
    return res.json({ warningCount: 1, eloPenalty: ELO_PENALTY, newElo: null, isBanned: false, banUntil: null })
  }
})

router.post("/hint", async (req, res) => {
  const { challenge={}, currentAnswer="", eloRating=800 } = req.body
  try {
    const hint = await groq([
      { role: "system", content: "Give hints that guide thinking WITHOUT revealing the answer. 2-3 sentences max." },
      { role: "user",   content: `Challenge: ${challenge.title||"Technical task"}\nScenario: ${(challenge.scenario||"").slice(0,200)}\nCurrent answer: ${String(currentAnswer).slice(0,400)||"nothing yet"}\nCandidate ELO: ${eloRating}` },
    ], { model: GROQ_FAST, max_tokens: 200 })
    return res.json({ hint })
  } catch (e) { console.error("[arena/hint]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
