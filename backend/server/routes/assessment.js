// Routes: POST /api/generate-mcq, /api/analyse-assessment, /api/analyse-professional-profile
//
// generate-mcq:                 Groq llama-3.3-70b-versatile (primary, no strict json mode)
//                               → llama-3.1-8b-instant on 429 (auto-fallback in groq.js)
// analyse-assessment:           Claude Haiku → Groq fallback  (user reads this feedback)
// analyse-professional-profile: Claude Sonnet → Groq fallback (career intelligence)

import { Router } from "express"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { claude, CLAUDE_HAIKU, CLAUDE_SONNET } from "../lib/claude.js"
import { getRoleConfig } from "../../../frontend/src/config/roleConfig.js"

const router = Router()

const hasClaude = () => process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_key_here"

// ─── Helper: try Claude, fall back to Groq ────────────────────────────────────
async function claudeOrGroq(messages, { model = CLAUDE_HAIKU, groqMaxTokens = 1000 } = {}) {
  if (hasClaude()) {
    try { return await claude(messages, { model, maxTokens: groqMaxTokens, json: true }) }
    catch (e) { console.warn("[assessment] Claude failed, falling back to Groq:", e.message) }
  }
  const raw = await groq(
    messages.map(m => ({ role: m.role, content: m.content })),
    { max_tokens: groqMaxTokens, json: true }
  )
  try { return JSON.parse(raw) } catch { return {} }
}

// ─── Domain skills — single source of truth is roleConfig.js's auraSkills ────
// 2026-07-27 fix: this used to maintain its own hand-written skill-name list
// per role (a DOMAIN_SKILLS object, ~30 entries), completely separate from
// roleConfig.js's `auraSkills` — the list Aura.jsx's dashboard radar actually
// displays. The two lists drifted apart (different wording, different skill
// counts, some skills in one but not the other), so even a perfect assessment
// score could never populate several radar axes: the AI-generated quiz's
// "category" field is constrained to exactly this list (see the generate-mcq
// prompt below: "category must be one of the exact skill names given"), and
// those categories never matched what the radar was looking for.
// This now resolves through getRoleConfig() — the same resolver Aura.jsx,
// Arena, and SkillStudio already use — so quiz categories and radar labels
// can't drift apart again; there is exactly one skill-name list per role.

// Roles whose skill sets are not code/programming-based — preserves the
// original question-mix decision (no code_output questions, add numerical/
// scenario instead) that the old isEngineeringBranch check made per branch,
// now also driven by the resolved role's `stream` so it still applies when
// a keyword alone (no branch) resolves to one of these domains.
const NON_CODE_STREAMS = new Set(["ECE", "EEE", "Mechanical", "Civil", "Pharmacy", "Medical"])

// roleConfig.js's branch resolver (_resolveByBranch) doesn't have explicit
// Pharmacy/MBA branch handling (those students are expected to type a
// specific job title) — the old BRANCH_DOMAIN_KEY did handle them, so this
// small map preserves that exact fallback rather than silently losing it.
const EXTRA_BRANCH_ROLE_ID = { Pharmacy: "pharmacy", MBA: "mba" }

// Resolves a role by keyword first (the more specific signal), falling back
// to the student's declared branch only if the keyword didn't resolve to
// anything more specific than the generic default (Software Engineer) —
// mirrors the old getDomainSkills(jobTitle, branch) fallback order exactly.
function resolveAssessmentRole(jobTitle, branch) {
  const byKeyword = getRoleConfig(jobTitle)
  if (byKeyword.id !== "swe" || !branch) return byKeyword
  if (EXTRA_BRANCH_ROLE_ID[branch]) return getRoleConfig(EXTRA_BRANCH_ROLE_ID[branch])
  const byBranch = getRoleConfig({ branch })
  return byBranch.id !== "swe" ? byBranch : byKeyword
}

function getDomainSkills(jobTitle, branch = "") {
  const role = resolveAssessmentRole(jobTitle, branch)
  return { skills: role.auraSkills || [], stream: role.stream }
}

// ─── 3. Generate MCQ ── Groq (generation, not user-visible analysis) ──────────
router.post("/generate-mcq", async (req, res) => {
  const { jobTitle="Professional", branch="", count=25, skills=[], resumeContext="", resumeSummary="" } = req.body

  // Get the EXACT skills for this domain — these become mandatory question categories
  // branch is the student's enrolled branch (ECE/EEE/Mechanical/Civil/etc.) used as fallback
  // when the jobTitle keyword alone doesn't resolve to a known non-IT domain.
  const { skills: domainSkills, stream: domainStream } = getDomainSkills(jobTitle, branch)
  // Ensure every domain skill gets at least 1-2 questions for full radar coverage
  const questionsPerSkill = Math.max(1, Math.floor(count / domainSkills.length))
  const extra = count - (questionsPerSkill * domainSkills.length)

  // For non-IT/engineering domains, swap code_output for numerical/diagram questions
  const isEngineeringBranch = branch && ["ECE","EEE","Mechanical","Civil","IoT","Pharmacy","MBA"].includes(branch)
  // Detect engineering domain by the resolved role's stream (not just branch) so
  // sub-role keyword matches (e.g. "VLSI Engineer" with no branch set) still work.
  const isEngineeringRole = isEngineeringBranch || NON_CODE_STREAMS.has(domainStream)
  const mix = isEngineeringRole
    ? { mcq: Math.round(count * 0.40), numerical: Math.round(count * 0.25), problem_solving: Math.round(count * 0.20), scenario: Math.round(count * 0.10), fill_blank: Math.round(count * 0.05), code_output: 0 }
    : { mcq: Math.round(count * 0.30), code_output: Math.round(count * 0.25), problem_solving: Math.round(count * 0.20), scenario: Math.round(count * 0.15), fill_blank: Math.round(count * 0.10), numerical: 0 }

  const summaryLine = resumeSummary ? `Candidate background: ${resumeSummary.slice(0,250)}` : ""
  const contextLine = resumeContext ? `Extra context: ${resumeContext.slice(0,300)}` : ""

  // ── Parse raw LLM string → questions array (handles all wrapper formats) ───
  function parseQuestions(raw) {
    if (!raw || typeof raw !== "string") return []

    // 1. Strip markdown code fences if present
    let text = raw.trim()
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

    // 2. Try parsing as-is
    let d
    try { d = JSON.parse(text) } catch {
      // 3. Try to fix a truncated JSON by finding the last complete object
      try {
        const lastBrace = text.lastIndexOf("},")
        if (lastBrace > 0) {
          const fixed = text.slice(0, lastBrace + 1) + "]}"
          d = JSON.parse(fixed)
        }
      } catch {}
      if (!d) return []
    }

    // 4. Extract array from any wrapper key
    if (Array.isArray(d)) return d
    for (const key of ["questions", "data", "result", "items", "mcqs", "quiz", "list"]) {
      if (Array.isArray(d[key])) return d[key]
    }
    const firstArr = Object.values(d).find(v => Array.isArray(v))
    return firstArr || []
  }

  // ── Validate + repair one question object ─────────────────────────────────
  function repairQuestion(q, idx, skills) {
    if (!q || typeof q !== "object" || !q.question) return null

    // If options came back as an object ({"a":"...","b":"..."}) convert to array
    if (q.options && !Array.isArray(q.options) && typeof q.options === "object") {
      q.options = Object.values(q.options).map(String)
    }

    // Strip letter prefixes "A) " / "1. " from options (frontend adds its own)
    if (Array.isArray(q.options)) {
      q.options = q.options
        .map(o => String(o).replace(/^[A-Ea-e1-4][).:\-\s]+\s*/, "").trim())
        .filter(o => o.length > 0 && !/^[A-Ea-e]$/.test(o)) // drop empty + bare-letter artifacts, keep "0","1","null" etc
    }

    // If options still missing/short — skip this question rather than show placeholders
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return null // will be filtered out; Groq fallback batch fills the gap
    }

    // Clamp correct index
    if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= q.options.length) {
      q.correct = 0
    }

    // Ensure category matches a known skill
    if (!skills.includes(q.category)) {
      q.category = skills[idx % skills.length]
    }

    q.id = idx + 1
    return q
  }

  // ── Groq primary (llama-3.3-70b-versatile → llama-3.1-8b-instant on 429) ──────
  // No json:true — strict JSON mode causes json_validate_failed on the small model.
  // parseQuestions() handles plain-text JSON, code-fenced JSON, and truncated JSON.
  try {
    // Detect if this is a non-IT/engineering domain so we can set the right context.
    // (isEngineeringBranch is already computed above from the same branch list this
    // used to derive via BRANCH_DOMAIN_KEY — kept in sync now that DOMAIN_SKILLS/
    // BRANCH_DOMAIN_KEY were removed in favor of roleConfig.js's auraSkills.)
    const isNonItDomain = !!isEngineeringBranch

    const raw = await groq([
      {
        role: "system",
        content: `You are an MCQ generator for Indian fresher job-role assessments (campus placement / entry-level hiring level).
TARGET ROLE: "${jobTitle}" — ALL questions must test knowledge and skills REQUIRED FOR THIS SPECIFIC ROLE.
${isNonItDomain ? `This is an engineering/core domain role. Do NOT generate generic software/programming/CS questions unless the role explicitly requires them.` : ""}
STRICT OUTPUT RULES:
- Return ONLY a raw JSON object. No markdown, no code fences, no explanation text.
- Top-level key must be "questions" with an array of exactly ${count} question objects.
- Each question: {"id":1,"type":"mcq","category":"<exact skill>","question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}
- "options" MUST be an array of exactly 4 plain strings. Never omit.
- "correct" is 0-based index of the right answer.
- "category" must be one of the exact skill names given.
- Do NOT prefix options with "A)", "1.", etc.`,
      },
      {
        role: "user",
        content: `Generate ${count} fresher-level MCQs for a "${jobTitle}" role assessment.

These questions must test ROLE-SPECIFIC knowledge — what a "${jobTitle}" actually does on the job, not generic academic theory.

Skills to cover (use EXACTLY as category):
${domainSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Each skill needs at least ${Math.max(1, Math.floor(count / domainSkills.length))} question(s).
Type mix: mcq:${mix.mcq}, ${isEngineeringBranch ? `numerical:${mix.numerical}` : `code_output:${mix.code_output}`}, problem_solving:${mix.problem_solving}, scenario:${mix.scenario}, fill_blank:${mix.fill_blank}
${summaryLine}
${contextLine}

${isEngineeringBranch
  ? `For numerical questions: present a real engineering problem (formula application, circuit calculation, design check); options are 4 numerical values with units.`
  : `For code_output questions: show a short code snippet (≤6 lines) and ask "What is the output?" — options are 4 possible outputs.`}
For scenario questions: describe a realistic on-the-job situation for a "${jobTitle}" and ask what action/approach is correct.
For fill_blank: use "___" in question text, options are 4 completions.
Never start a question with "Write a..." or "Create a..." — those are open-ended, not MCQ.

Return JSON now:`,
      },
    ], { max_tokens: 3500 })
    // 3500 keeps total tokens (prompt ~412 + output) well under llama-3.1-8b-instant's
    // hard 6000 TPM cap. llama-3.3-70b-versatile handles this fine at higher limits.

    console.log(`[generate-mcq] Groq raw length: ${raw?.length} chars`)

    const questions = parseQuestions(raw)
      .map((q, i) => repairQuestion(q, i, domainSkills))
      .filter(Boolean)

    console.log(`[generate-mcq] Groq: ${questions.length} valid questions for "${jobTitle}"`)
    if (questions.length < 3) throw new Error(`Only ${questions.length} valid questions from Groq. Raw: ${raw?.slice(0, 300)}`)
    return res.json({ questions: questions.slice(0, count), domainSkills })
  } catch (e) {
    console.error("[generate-mcq] ERROR:", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── 4. Analyse Assessment ── Claude Haiku (user reads this output) ────────────
router.post("/analyse-assessment", async (req, res) => {
  const { keyword="Professional", score=0, total=25, pct=0, radarData=[], resumeContext="" } = req.body

  // Build a detailed skill-by-skill performance summary for the AI
  const skillBreakdown = radarData.map(d => {
    const level = d.value >= 80 ? "Strong" : d.value >= 60 ? "Good" : d.value >= 40 ? "Developing" : "Weak"
    return `${d.label}: ${d.value}% (${level})`
  }).join("\n")

  const strongSkills = radarData.filter(d => d.value >= 70).map(d => d.label)
  const weakSkills   = radarData.filter(d => d.value < 50).map(d => d.label)
  const midSkills    = radarData.filter(d => d.value >= 50 && d.value < 70).map(d => d.label)

  try {
    const messages = [
      {
        role: "user",
        content: `You are a senior career coach giving DETAILED, GENUINE feedback to a fresher ${keyword} candidate in India.
This is their first assessment — be honest, specific, and actionable. Do NOT be vague.

ASSESSMENT RESULTS:
Overall score: ${score}/${total} (${pct}%)
Per-skill performance:
${skillBreakdown}

Strong skills (≥70%): ${strongSkills.join(", ") || "none yet"}
Developing skills (50-69%): ${midSkills.join(", ") || "none"}
Weak skills (<50%): ${weakSkills.join(", ") || "none"}
${resumeContext ? `\nCandidate context: ${resumeContext.slice(0,400)}` : ""}

RULES for your response:
- Strengths: Name each strong/good skill specifically. Explain WHY it matters for ${keyword} jobs. Be concrete.
- Weak areas: For EACH weak skill, say exactly what they got wrong conceptually and what to study.
- Do NOT write generic things like "Keep practicing" — every point must be skill-specific.
- Resources: Match each resource to a specific weak skill. Use real free resources (YouTube, official docs, freeCodeCamp, etc.)
- Summary must be 3-4 sentences: honest about gaps, encouraging about strengths, clear next step.

Return ONLY this JSON (no markdown):
{
  "jobReadiness": <0-100>,
  "eloRating": <400-1200>,
  "eloAdjustment": <-15 to 15>,
  "summary": "<3-4 sentence honest assessment mentioning specific skills by name>",
  "strengths": [
    "<Skill name>: specific observation about what they demonstrated and why it matters for ${keyword} roles",
    "<Skill name>: specific observation",
    "<Skill name>: specific observation"
  ],
  "weakAreas": [
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it",
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it",
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it"
  ],
  "skillInsights": [
    {"skill": "<skill name>", "score": <0-100>, "verdict": "Strong|Good|Developing|Needs Work", "tip": "<1 specific actionable tip for this skill>"}
  ],
  "resources": [
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<which weak skill this fixes>", "url_hint": "<platform like YouTube/freeCodeCamp/official docs>", "reason": "<exactly why this resource closes the gap>"},
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<skill>", "url_hint": "<platform>", "reason": "<reason>"},
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<skill>", "url_hint": "<platform>", "reason": "<reason>"}
  ],
  "quickWins": [
    "<Specific 1-week action for the weakest skill — what exactly to do, not just 'practice more'>",
    "<Specific 1-week action for the 2nd weakest skill>",
    "<Specific 1-week action combining a strength with a weak skill to build momentum>"
  ],
  "arenaRecommendation": "<which Arena challenge type to do first based on weakest skills>"
}`,
      },
    ]

    const result = await claudeOrGroq(messages, { model: CLAUDE_HAIKU, groqMaxTokens: 2000 })
    return res.json({ analysis: result })
  } catch (e) { console.error("[analyse-assessment]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 5. Analyse Professional Profile ── Claude Sonnet (career intelligence) ───
router.post("/analyse-professional-profile", async (req, res) => {
  const { extractedData={}, githubData=null, resumeText="", linkedinText="" } = req.body
  try {
    const messages = [
      {
        role: "user",
        content: `You are a senior career intelligence AI for the Indian tech market.
Analyse this professional profile and score it precisely.

PROFILE DATA:
Name:       ${extractedData.name || "Professional"}
Title:      ${extractedData.title || ""}
Summary:    ${(extractedData.summary || "").slice(0, 400)}
Skills (${(extractedData.skills||[]).length}): ${(extractedData.skills||[]).slice(0,15).join(", ")}
Experience: ${(extractedData.experience||[]).length} roles — ${(extractedData.experience||[]).map(e=>`${e.role} at ${e.company}`).slice(0,3).join("; ")}
Education:  ${(extractedData.education||[]).map(e=>`${e.degree} from ${e.institution}`).join(", ") || "not specified"}
GitHub:     ${githubData ? `${githubData.publicRepos} repos, ${githubData.totalStars} stars, top: ${githubData.topLanguage}` : "not connected"}

Return ONLY this JSON:
{
  "profileScore": {
    "completeness":       <0-20>,
    "experienceDepth":    <0-25>,
    "technicalBreadth":   <0-20>,
    "projectQuality":     <0-20>,
    "marketReadiness":    <0-15>,
    "total":              <sum of above>
  },
  "radarData": [
    {"label":"Problem Solving",   "value":<0-100>},
    {"label":"Technical Depth",   "value":<0-100>},
    {"label":"Communication",     "value":<0-100>},
    {"label":"Domain Expertise",  "value":<0-100>},
    {"label":"Leadership",        "value":<0-100>}
  ],
  "analysis": {
    "eloRating":        <800-1800>,
    "domain":           "<primary tech domain>",
    "jobReadiness":     <0-100>,
    "marketValue":      "<₹X–Y LPA range>",
    "summary":          "<3 sentence honest career assessment>",
    "strengths":        ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
    "criticalGaps":     ["<gap 1>", "<gap 2>"],
    "quickWins":        ["<1-week action 1>", "<1-week action 2>"],
    "recommendedTasks": [
      {"title":"<challenge name>","description":"<what to practice>","eloGain":<15-60>},
      {"title":"<challenge name>","description":"<what to practice>","eloGain":<15-60>}
    ]
  }
}`,
      },
    ]

    const result = await claudeOrGroq(messages, { model: CLAUDE_SONNET, groqMaxTokens: 1800 })
    return res.json({
      profileScore: result.profileScore || { completeness:10, experienceDepth:10, technicalBreadth:10, projectQuality:10, marketReadiness:10, total:50 },
      radarData:    result.radarData    || [],
      analysis:     result.analysis     || {},
    })
  } catch (e) { console.error("[analyse-professional-profile]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 6. Resolve Role by Intent ── Groq fast (AI intent matching for typeahead) ──
// Called by the frontend RoleSearchPicker when ≥4 chars typed but local score < 60.
// Receives { query: string, roles: [{id, label, stream, keywords}] }
// Returns  { roleIds: string[] }  — ordered by relevance, max 4 IDs
router.post("/resolve-role", async (req, res) => {
  const { query = "", roles = [] } = req.body
  if (!query || !roles.length) return res.json({ roleIds: [] })

  try {
    const roleList = roles.map(r => `${r.id}: ${r.label} (${r.stream}) — ${(r.keywords || []).join(", ")}`).join("\n")
    const prompt = `You are a career-role matching engine. Given a student's search query, return the top matching role IDs.

Search query: "${query}"

Available roles (id: label (stream) — keywords):
${roleList}

Return ONLY a JSON object with a single key "roleIds" containing an array of up to 4 matching role IDs, ordered from most to least relevant. No markdown, no explanation.`

    const raw = await groq(prompt, { model: GROQ_FAST, maxTokens: 80, temperature: 0.1 })
    const cleaned = raw.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)
    const ids = (parsed.roleIds || []).filter(id => roles.some(r => r.id === id)).slice(0, 4)
    return res.json({ roleIds: ids })
  } catch (e) {
    console.error("[resolve-role]", e.message)
    return res.json({ roleIds: [] }) // graceful fallback — client uses local results
  }
})

export default router
