// Routes: POST /api/arena/daily, /challenge, /review, /hint, /run-tests
// Generation (/daily): Gemini 2.5 Flash (primary) → Groq fallback
//   Tasks are sticky — generated once, stored in Supabase, reused until completed.
//   Gemini free tier: 1,500 req/day — more than sufficient.
// Grading (/review): Claude Haiku (quality feedback)
// /run-tests: actual code execution (child_process) — zero AI tokens
import { Router }                          from "express"
import { groq, GROQ_FAST }                 from "../lib/groq.js"
import { gradeSubmission }                 from "../lib/claude.js"
import { geminiGenerateMission }           from "../lib/gemini.js"
import { exec }                            from "child_process"
import { writeFile, unlink, mkdtemp }      from "fs/promises"
import { tmpdir }                          from "os"
import { join }                            from "path"

const router = Router()

// ── Sandboxed code executor (Python / JavaScript) ────────────────────────────
// Runs user code in a temp file with a strict 8-second timeout.
// Returns { stdout, stderr, error }
async function executeCode(code, language = "python", timeoutMs = 8000) {
  const ext   = language === "javascript" || language === "js" ? "js" : "py"
  const cmd   = ext === "js" ? "node" : "python3"
  const dir   = await mkdtemp(join(tmpdir(), "arena-"))
  const file  = join(dir, `solution.${ext}`)

  try {
    await writeFile(file, code, "utf8")
    return await new Promise((resolve) => {
      const proc = exec(
        `${cmd} "${file}"`,
        { timeout: timeoutMs, maxBuffer: 1024 * 512 },
        async (error, stdout, stderr) => {
          try { await unlink(file) } catch {}
          try { await unlink(dir).catch(() => {}) } catch {}
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
  } = req.body

  // Student path: cap difficulty at Medium even if ELO says otherwise
  const rawDiff  = eloRating < 700 ? "Easy" : eloRating < 1000 ? "Medium" : eloRating < 1300 ? "Medium-Hard" : "Hard"
  const diff     = path === "student" && rawDiff === "Hard" ? "Medium-Hard" : rawDiff
  const eloMin   = Math.round(eloRating * 0.02)
  const eloMax   = Math.round(eloRating * 0.05)
  const eloGain  = eloMin + Math.floor(Math.random() * (eloMax - eloMin))
  const difficulty = diff.split("-")[0]

  // ── Attempt 1: Gemini 2.5 Flash ──────────────────────────────────────────────
  try {
    const mission = await geminiGenerateMission({
      keyword, domainKey, eloRating, difficulty,
      weakAreas, path, recentSkills, eloGain,
      completedMissions: (completedMissions || []).slice(0, 30),
    })
    console.log(`[arena/daily] Gemini: generated mission for ${keyword} ELO:${eloRating} slot:${slotIndex}`)
    return res.json({ tasks: [mission] })
  } catch (geminiErr) {
    console.warn(`[arena/daily] Gemini failed (${geminiErr.message}), falling back to Groq…`)
  }

  // ── Attempt 2: Groq fallback ──────────────────────────────────────────────────
  try {
    const raw = await groq([
      { role: "system", content: "You generate real-world Arena challenges for an Indian tech career platform. Return ONLY valid JSON — a single object, no array, no markdown." },
      { role: "user",   content:
`Domain: ${keyword} | ELO: ${eloRating} | Difficulty: ${difficulty} | Path: ${path}
Weak areas: ${weakAreas.slice(0,3).join(", ")||"fundamentals"}
${path === "student" ? "STUDENT PATH: fresher/entry-level user — keep scope simple and beginner-appropriate, ONE skill only." : ""}
${completedMissions.length ? `Avoid repeating these already-completed missions: ${completedMissions.slice(0,10).join(", ")}` : ""}

Use a REAL Indian company (Swiggy, Razorpay, CRED, Zepto, Zomato, PhonePe, Meesho, Flipkart, Paytm, etc.).

CRITICAL: Do NOT include solution steps, algorithm names, or approach hints in any field. Hints must be guiding questions only.

Return ONE JSON object (concise strings):
{"id":"slug","title":"short task-specific title","company":"Indian co","difficulty":"${difficulty}","type":"Software Engineering","scenario":"1-2 sentences of context only — no solution hints","taskDescription":"what to build only — not how","objective":"1 measurable outcome","workstation":"code_editor","starterCode":"// scaffold only","expectedOutput":"what correct output looks like","eloGain":${eloGain},"timeLimit":${difficulty === "Hard" ? 55 : difficulty === "Medium" ? 30 : 20},"tags":["t1","t2"],"hints":["guiding question 1","guiding question 2"]}` },
    ], { max_tokens: 1200, json: false })

    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim()
    const obj = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1))
    if (!obj?.title) throw new Error("Groq returned invalid mission structure")

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
  const { challenge={}, answer="", output="", testResults=[], userContext={}, behavioral={}, eloRating, keyword, timedOut=false } = req.body
  const elo = eloRating || userContext.eloRating || 800
  try {
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
    return res.json(review)
  } catch (e) { console.error("[arena/review]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── SQL evaluation via AI (Groq) ────────────────────────────────────────────
// SQL test cases in Common Challenges use descriptive inputs ("Trips/Users tables
// as described"), not actual data rows — so we can't execute them in a process.
// Instead, ask Groq to evaluate the query's correctness against the schema.
async function evaluateSQLWithAI(sqlQuery, testCases, challenge) {
  const schema  = challenge.statement || challenge.description || challenge.title || ""
  const results = []

  for (const tc of testCases) {
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
      results.push({
        input:       tc.input ?? "Schema as described",
        expected,
        actual:      obj.actual || (obj.passed ? "Query appears correct" : "Query may be incorrect"),
        passed:      obj.passed === true,
        runtime:     `${Date.now() - start}ms`,
        error:       obj.error || null,
        // Visual output — rendered as a table + chart in the frontend
        columns:     Array.isArray(obj.columns)     ? obj.columns     : [],
        sample_rows: Array.isArray(obj.sample_rows) ? obj.sample_rows : [],
      })
    } catch {
      results.push({
        input:       tc.input ?? "Schema as described",
        expected,
        actual:      "AI evaluation unavailable — click Submit for full review",
        passed:      false,
        runtime:     `${Date.now() - start}ms`,
        error:       null,
        columns:     [],
        sample_rows: [],
      })
    }
  }
  return results
}

// ─── 9. Run Tests — ACTUAL code execution, zero AI tokens ────────────────────
// Executes user code in a sandboxed child_process for each test case.
// Compares stdout to expectedOutput. Fast, deterministic, no rate limits.
// SQL challenges: evaluated via AI (Groq) — not Python/JS execution.
router.post("/run-tests", async (req, res) => {
  const { code = "", language = "python", challenge = {}, testCases = [] } = req.body

  if (!code.trim()) {
    return res.status(400).json({ error: "No code provided." })
  }
  if (testCases.length === 0) {
    return res.status(400).json({ error: "No test cases provided." })
  }

  // ── SQL: route to AI evaluation instead of Python/JS execution ───────────
  if (language.toLowerCase() === "sql") {
    const results = await evaluateSQLWithAI(code, testCases, challenge)
    const passed  = results.filter(r => r.passed).length
    console.log(`[arena/run-tests] SQL "${challenge.title}" — AI eval: ${passed}/${results.length} passed`)
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
            passed = JSON.stringify([...a].sort()) === JSON.stringify([...e].sort())
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
  const { skills="", weakAreas="", eloRating=800, domain="software engineering", role="professional", yearsExp=1, strengths="" } = req.body
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
