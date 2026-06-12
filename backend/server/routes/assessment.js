// Routes: POST /api/generate-mcq, /api/analyse-assessment, /api/analyse-professional-profile
//
// generate-mcq:                 Gemini Flash → Groq fallback
//   STICKY: generated once per assessment session, held until user submits.
//   Was 8,000 tokens on Groq 70b — very wasteful. Gemini handles JSON natively.
// analyse-assessment:           Claude Haiku → Groq fallback  (user reads this feedback)
// analyse-professional-profile: Claude Sonnet → Groq fallback (career intelligence)

import { Router } from "express"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { claude, CLAUDE_HAIKU, CLAUDE_SONNET } from "../lib/claude.js"
import { geminiGenerateMCQ } from "../lib/gemini.js"

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

// ─── Domain skill map — mirrors Aura.jsx domainSkillsMap exactly ─────────────
// CRITICAL: category names in MCQs MUST match these exactly so radar aligns.
const DOMAIN_SKILLS = {
  "Data Analyst":     ["SQL","Python","Data Cleaning","Exploratory Data Analysis","Data Visualization","Statistical Analysis","A/B Testing","Business Intelligence","Funnel Analysis","KPI Reporting","Dashboard Design","Storytelling with Data"],
  "Full-Stack":       ["React","Node.js","TypeScript","SQL","REST APIs","Authentication","State Management","Testing","System Design","Performance","Deployment","CSS"],
  "Frontend":         ["React","TypeScript","JavaScript","CSS / Tailwind","HTML","State Management","Web Performance","Accessibility (WCAG)","Testing (Jest/RTL)","Design Systems","API Integration","Responsive Design"],
  "Backend":          ["Node.js / Express","REST API Design","Authentication (JWT/OAuth)","Caching (Redis)","Message Queues","Database Queries","Rate Limiting","Pagination","Microservices","Testing (Supertest)","Performance","Error Handling"],
  "DevOps":           ["Docker","Kubernetes","CI/CD Pipelines","Terraform / IaC","Linux & Bash","Monitoring (Prometheus/Grafana)","Helm Charts","SRE Practices","Incident Management","Cloud Platforms","Networking","Security & Secrets"],
  "DBA":              ["Query Optimisation","Index Strategy","Schema Design","Stored Procedures","Performance Tuning","Backup & Recovery","Replication","Schema Migration","EXPLAIN / Query Plans","PL/SQL / T-SQL","Data Integrity","High Availability"],
  "Software Developer":["Data Structures","Algorithms","OOP Concepts","System Design","Database Basics","REST APIs","Version Control (Git)","Testing","Problem Solving","Design Patterns","Time Complexity","Debugging"],
  "Machine Learning": ["Python","NumPy / Pandas","Scikit-learn","Model Evaluation","Feature Engineering","Neural Networks","Data Preprocessing","Statistics","Regression / Classification","Deep Learning Basics","Model Deployment","Experiment Tracking"],
  "Android Developer":["Kotlin","Java","Android SDK","Jetpack Compose","MVVM Architecture","Room Database","Retrofit","Coroutines","UI/UX Design","Testing","Push Notifications","Play Store Deployment"],
  "iOS Developer":    ["Swift","Xcode","UIKit","SwiftUI","Core Data","Networking (URLSession)","MVC/MVVM","Auto Layout","Push Notifications","App Store Deployment","Testing (XCTest)","Memory Management"],
  "Cybersecurity":    ["Network Security","Linux","Ethical Hacking Basics","OWASP Top 10","Cryptography","Firewalls & IDS","Penetration Testing","Vulnerability Assessment","Security Auditing","Incident Response","Compliance (ISO 27001)","SIEM Tools"],
  "Cloud Engineer":   ["AWS / Azure / GCP","IAM & Security","Compute (EC2/VMs)","Storage (S3/Blob)","Networking (VPC)","Containers (ECS/AKS)","Serverless","Monitoring (CloudWatch)","Infrastructure as Code","Cost Optimisation","Databases","CI/CD"],
}

function getDomainSkills(jobTitle) {
  const k = (jobTitle || "").toLowerCase()
  if (k.includes("data analyst") || k.includes("business analyst") || k.includes("analytics")) return DOMAIN_SKILLS["Data Analyst"]
  if (k.includes("machine learning") || k.includes("ml engineer") || k.includes("ai engineer")) return DOMAIN_SKILLS["Machine Learning"]
  if (k.includes("frontend") || k.includes("front-end") || k.includes("react developer") || k.includes("ui developer")) return DOMAIN_SKILLS["Frontend"]
  if (k.includes("backend") || k.includes("back-end") || k.includes("api developer")) return DOMAIN_SKILLS["Backend"]
  if (k.includes("devops") || k.includes("sre") || k.includes("platform engineer") || k.includes("infrastructure")) return DOMAIN_SKILLS["DevOps"]
  if (k.includes("dba") || k.includes("database admin")) return DOMAIN_SKILLS["DBA"]
  if (k.includes("android")) return DOMAIN_SKILLS["Android Developer"]
  if (k.includes("ios")) return DOMAIN_SKILLS["iOS Developer"]
  if (k.includes("cyber") || k.includes("security engineer")) return DOMAIN_SKILLS["Cybersecurity"]
  if (k.includes("cloud")) return DOMAIN_SKILLS["Cloud Engineer"]
  if ((k.includes("full") && k.includes("stack")) || k.includes("software engineer") || k.includes("software developer") || k.includes("swe")) return DOMAIN_SKILLS["Full-Stack"]
  return DOMAIN_SKILLS["Software Developer"]
}

// ─── 3. Generate MCQ ── Groq (generation, not user-visible analysis) ──────────
router.post("/generate-mcq", async (req, res) => {
  const { jobTitle="Software Developer", count=25, skills=[], resumeContext="", resumeSummary="" } = req.body

  // Get the EXACT skills for this domain — these become mandatory question categories
  const domainSkills = getDomainSkills(jobTitle)
  // Ensure every domain skill gets at least 1-2 questions for full radar coverage
  const questionsPerSkill = Math.max(1, Math.floor(count / domainSkills.length))
  const extra = count - (questionsPerSkill * domainSkills.length)

  const mix = {
    mcq:             Math.round(count * 0.30),
    code_output:     Math.round(count * 0.25),
    problem_solving: Math.round(count * 0.20),
    scenario:        Math.round(count * 0.15),  // real-world data/work scenario
    fill_blank:      Math.round(count * 0.10),
  }

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
        .filter(o => o.length > 1) // filter empty AND single-char leftovers like "A"
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

  // ── Attempt 1: Gemini Flash (primary — STICKY content, native JSON mode) ──────
  try {
    const result = await geminiGenerateMCQ({ jobTitle, count, domainSkills, mix, summaryLine, contextLine })
    const questions = result.questions
      .map((q, i) => repairQuestion(q, i, domainSkills))
      .filter(Boolean)

    console.log(`[generate-mcq] Gemini: ${questions.length} questions for "${jobTitle}"`)
    if (questions.length < 3) throw new Error(`Only ${questions.length} valid questions from Gemini`)
    return res.json({ questions: questions.slice(0, count), domainSkills })
  } catch (geminiErr) {
    console.warn(`[generate-mcq] Gemini failed (${geminiErr.message}), falling back to Groq…`)
  }

  // ── Attempt 2: Groq fallback ──────────────────────────────────────────────────
  try {
    const raw = await groq([
      {
        role: "system",
        content: `MCQ generator for Indian fresher tech assessment. STRICT: every question has "options" array of 4 plain strings, "correct" is 0-based index, "category" is exact skill name. Return JSON object with key "questions". No markdown.`,
      },
      {
        role: "user",
        content: `${count} fresher questions for "${jobTitle}". Skills: ${domainSkills.slice(0,8).join(", ")}. Mix: mcq:${mix.mcq},code:${mix.code_output},ps:${mix.problem_solving}. ${summaryLine} Return {"questions":[{"id":1,"type":"mcq","category":"<skill>","question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}]}`,
      },
    ], { max_tokens: 6000, json: true })

    console.log("[generate-mcq] Groq fallback raw length:", raw?.length)

    const questions = parseQuestions(raw)
      .map((q, i) => repairQuestion(q, i, domainSkills))
      .filter(Boolean)

    if (questions.length < 3) throw new Error(`Only ${questions.length} valid questions from Groq. Raw: ${raw?.slice(0,300)}`)
    return res.json({ questions: questions.slice(0, count), domainSkills })
  } catch (e) {
    console.error("[generate-mcq] ERROR:", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── 4. Analyse Assessment ── Claude Haiku (user reads this output) ────────────
router.post("/analyse-assessment", async (req, res) => {
  const { keyword="Software Developer", score=0, total=25, pct=0, radarData=[], resumeContext="" } = req.body

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

export default router
