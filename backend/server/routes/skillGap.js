// ─── Routes: POST /api/skill-gap ─────────────────────────────────────────────
// Uses Gemini + Google Search grounding for LIVE job market data.
// Replaces the hardcoded skill gap maps in Aura.jsx.
//
// Request:  { domain, keyword, elo, path, skills? }
// Response: { gaps[], emerging[], growth, marketSignals[], cached }

import { Router } from "express"
import { geminiSearch } from "../lib/gemini.js"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

// ── In-memory cache: domain → { data, ts } ───────────────────────────────────
// Skill gap data doesn't change minute-to-minute. Cache 6 hours per domain.
const CACHE = new Map()
const CACHE_TTL = 6 * 60 * 60 * 1000

// ── Validate that parsed skill gap data has real skill names (not placeholders) ─
const PLACEHOLDER_PATTERNS = /^(<.*>|Not provided|string|skill name|example|undefined|null|N\/A)$/i
function hasValidSkills(data) {
  if (!Array.isArray(data?.gaps) || data.gaps.length === 0) return false
  const validGaps = data.gaps.filter(g => {
    const s = (g?.skill || "").trim()
    return s.length > 1 && !PLACEHOLDER_PATTERNS.test(s)
  })
  return validGaps.length >= 2   // require at least 2 real gap skills
}

// ── POST /api/skill-gap ───────────────────────────────────────────────────────
router.post("/skill-gap", async (req, res) => {
  const { domain = "software engineer", keyword, elo = 800, path = "student" } = req.body
  const domainKey = (keyword || domain).toLowerCase().trim()
  const cacheKey  = `${domainKey}_${path}`

  // Return cached if fresh
  const cached = CACHE.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return res.json({ ...cached.data, cached: true })
  }

  try {
    // ── Step 1: Gemini searches Google for live job market data ──────────────
    const searchPrompt = `Search for detailed skill gap analysis for ${domainKey} jobs in India in 2026.

Find specific, data-backed information about:
1. Top 5 critical skills with highest demand growth (exact % numbers if available)
2. Top 5 skills freshers/candidates most commonly lack (with specific gaps)
3. 3 emerging skills worth learning now with reasons
4. Overall job market growth, average salary range (fresher and experienced), and top hiring companies
5. Week-by-week learning plan for the #1 critical gap skill
6. What interviewers actually ask about these skills

Focus on Indian tech market (Naukri, LinkedIn, Glassdoor India data).

Return ONLY this JSON (no extra text):
{
  "growth": "<market growth % YoY>",
  "fresherSalary": "<₹X–Y LPA range for freshers>",
  "experiencedSalary": "<₹X–Y LPA for 3-5 years exp>",
  "topHiringCompanies": ["<company1>", "<company2>", "<company3>", "<company4>", "<company5>"],
  "marketDemand": "<2-3 sentence market overview with specific numbers>",
  "gaps": [
    {
      "skill": "<exact skill name>",
      "demand": "High|Medium",
      "weeks": <realistic weeks to reach job-ready level>,
      "surge": true|false,
      "pct": <% demand increase>,
      "reason": "<specific sentence with data — why employers need this>",
      "whatYouNeed": "<exact level of proficiency needed to pass interviews>",
      "interviewFocus": "<what interviewers actually ask about this skill>",
      "freeResource": "<specific free resource to learn this — YouTube channel/course/docs>",
      "weeklyPlan": ["Week 1: <specific topic>", "Week 2: <specific topic>", "Week 3: <specific topic>"]
    }
  ],
  "emerging": [
    {
      "skill": "<skill name>",
      "demand": "Medium",
      "weeks": <weeks>,
      "surge": false,
      "pct": 0,
      "reason": "<why it matters now and in 2027>",
      "whatYouNeed": "<what level to aim for>",
      "freeResource": "<specific resource>"
    }
  ],
  "marketSignals": ["<specific trend with data>", "<specific trend>", "<specific trend>", "<specific trend>"],
  "topAction": "<single most impactful thing a fresher should do this week — be very specific>",
  "urgentGaps": [{"skill":"<name>","surge":true|false}]
}`

    const { text } = await geminiSearch(searchPrompt, { maxTokens: 2500 })

    // Extract JSON from Gemini's response
    let data
    try {
      const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
      data = JSON.parse(match?.[1] || text)
    } catch {
      // ── Fallback: use Groq to structure the raw Gemini text ─────────────────
      const structurePrompt = `Extract structured skill gap data from this market research text and return valid JSON only.

TEXT: ${text.slice(0, 3000)}

Return EXACTLY this JSON structure (fill all fields with real values from the text):
{
  "growth": "<string>",
  "fresherSalary": "<string>",
  "experiencedSalary": "<string>",
  "topHiringCompanies": ["", "", "", "", ""],
  "marketDemand": "<string>",
  "gaps": [
    {"skill":"","demand":"High","weeks":4,"surge":true,"pct":40,"reason":"","whatYouNeed":"","interviewFocus":"","freeResource":"","weeklyPlan":["Week 1: ","Week 2: ","Week 3: "]},
    {"skill":"","demand":"High","weeks":5,"surge":true,"pct":35,"reason":"","whatYouNeed":"","interviewFocus":"","freeResource":"","weeklyPlan":["Week 1: ","Week 2: ","Week 3: "]},
    {"skill":"","demand":"High","weeks":6,"surge":false,"pct":25,"reason":"","whatYouNeed":"","interviewFocus":"","freeResource":"","weeklyPlan":["Week 1: ","Week 2: ","Week 3: "]},
    {"skill":"","demand":"Medium","weeks":4,"surge":false,"pct":20,"reason":"","whatYouNeed":"","interviewFocus":"","freeResource":"","weeklyPlan":["Week 1: ","Week 2: ","Week 3: "]},
    {"skill":"","demand":"Medium","weeks":5,"surge":false,"pct":15,"reason":"","whatYouNeed":"","interviewFocus":"","freeResource":"","weeklyPlan":["Week 1: ","Week 2: "]}
  ],
  "emerging": [
    {"skill":"","demand":"Medium","weeks":4,"surge":false,"pct":0,"reason":"","whatYouNeed":"","freeResource":""},
    {"skill":"","demand":"Medium","weeks":5,"surge":false,"pct":0,"reason":"","whatYouNeed":"","freeResource":""},
    {"skill":"","demand":"Low","weeks":8,"surge":false,"pct":0,"reason":"","whatYouNeed":"","freeResource":""}
  ],
  "marketSignals": ["","","",""],
  "topAction": "",
  "urgentGaps": [{"skill":"","surge":true}]
}`

      const raw = await groq(
        [{ role: "user", content: structurePrompt }],
        { model: GROQ_FAST, max_tokens: 2000, json: true }
      )
      try { data = JSON.parse(raw) } catch { data = null }
    }

    if (!data || !data.gaps?.length) {
      return res.status(500).json({ error: "Could not extract market data", raw: text.slice(0, 500) })
    }

    // ── Reject responses where skill names are still placeholders ──────────────
    if (!hasValidSkills(data)) {
      console.warn("[skill-gap] Gemini/Groq returned placeholder skill names — rejecting")
      return res.status(500).json({ error: "Market data contained placeholder values" })
    }

    // Cache and return
    CACHE.set(cacheKey, { data, ts: Date.now() })
    return res.json({ ...data, cached: false })

  } catch (e) {
    console.error("[skill-gap]", e.message)

    // If Gemini fails, fall back to Groq with deep knowledge
    try {
      const fallbackPrompt = `You are a senior tech career expert with deep knowledge of the Indian job market in 2026.
Provide a detailed, accurate skill gap analysis for ${domainKey} roles in India.
Use realistic, specific data — salary ranges, company names, exact skill requirements.

Return ONLY this JSON (no extra text):
{
  "growth": "<realistic YoY growth %>",
  "fresherSalary": "<₹X–Y LPA for freshers>",
  "experiencedSalary": "<₹X–Y LPA for 3-5yr exp>",
  "topHiringCompanies": ["<company1>", "<company2>", "<company3>", "<company4>", "<company5>"],
  "marketDemand": "<2-3 sentence overview with real numbers>",
  "gaps": [
    {"skill": "<most critical gap skill>", "demand": "High", "weeks": 4, "surge": true, "pct": 45, "reason": "<specific data-backed reason>", "whatYouNeed": "<exact proficiency level>", "interviewFocus": "<what interviewers ask>", "freeResource": "<specific free resource>", "weeklyPlan": ["Week 1: <topic>", "Week 2: <topic>", "Week 3: <topic>"]},
    {"skill": "<2nd critical gap>", "demand": "High", "weeks": 5, "surge": true, "pct": 38, "reason": "<reason>", "whatYouNeed": "<proficiency>", "interviewFocus": "<focus>", "freeResource": "<resource>", "weeklyPlan": ["Week 1: <topic>", "Week 2: <topic>", "Week 3: <topic>"]},
    {"skill": "<3rd gap>", "demand": "High", "weeks": 6, "surge": false, "pct": 28, "reason": "<reason>", "whatYouNeed": "<proficiency>", "interviewFocus": "<focus>", "freeResource": "<resource>", "weeklyPlan": ["Week 1: <topic>", "Week 2: <topic>", "Week 3: <topic>"]},
    {"skill": "<4th gap>", "demand": "Medium", "weeks": 4, "surge": false, "pct": 22, "reason": "<reason>", "whatYouNeed": "<proficiency>", "interviewFocus": "<focus>", "freeResource": "<resource>", "weeklyPlan": ["Week 1: <topic>", "Week 2: <topic>"]},
    {"skill": "<5th gap>", "demand": "Medium", "weeks": 3, "surge": false, "pct": 18, "reason": "<reason>", "whatYouNeed": "<proficiency>", "interviewFocus": "<focus>", "freeResource": "<resource>", "weeklyPlan": ["Week 1: <topic>", "Week 2: <topic>"]}
  ],
  "emerging": [
    {"skill": "<emerging skill 1>", "demand": "Medium", "weeks": 4, "surge": false, "pct": 0, "reason": "<why it matters in 2026-27>", "whatYouNeed": "<level>", "freeResource": "<resource>"},
    {"skill": "<emerging skill 2>", "demand": "Medium", "weeks": 6, "surge": false, "pct": 0, "reason": "<reason>", "whatYouNeed": "<level>", "freeResource": "<resource>"},
    {"skill": "<emerging skill 3>", "demand": "Low", "weeks": 8, "surge": false, "pct": 0, "reason": "<reason>", "whatYouNeed": "<level>", "freeResource": "<resource>"}
  ],
  "marketSignals": ["<trend 1 with data>", "<trend 2>", "<trend 3>", "<trend 4>"],
  "topAction": "<single most specific action a fresher should take this week>",
  "urgentGaps": [{"skill": "<most urgent>", "surge": true}, {"skill": "<2nd urgent>", "surge": true}]
}`

      const raw = await groq(
        [{ role: "user", content: fallbackPrompt }],
        { max_tokens: 2500, json: true }
      )
      const fallback = JSON.parse(raw)
      if (!hasValidSkills(fallback)) {
        return res.status(500).json({ error: "Groq fallback also returned placeholder values" })
      }
      CACHE.set(cacheKey, { data: fallback, ts: Date.now() })
      return res.json({ ...fallback, cached: false, fallback: true })
    } catch (e2) {
      return res.status(500).json({ error: e.message })
    }
  }
})

export default router
