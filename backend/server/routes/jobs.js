// Routes: GET /api/jobs/list, GET /api/jobs/:id, GET /api/markets/india
//
// jobs:          JSearch RapidAPI (real listings)
// markets/india: Gemini + Google Search (live market data) → Groq fallback

import { Router } from "express"
import { groq, GROQ_FAST }    from "../lib/groq.js"
import { geminiSearch }       from "../lib/gemini.js"

const router = Router()

const JSEARCH_HOST = "jsearch.p.rapidapi.com"
const JSEARCH_BASE = `https://${JSEARCH_HOST}`

// ─── Employment type mapping ───────────────────────────────────────────────────
const TYPE_MAP = {
  FULLTIME:   "full-time",
  PARTTIME:   "part-time",
  CONTRACTOR: "contract",
  INTERN:     "internship",
  TEMPORARY:  "contract",
}

// Reverse map: frontend filter → JSearch query term
const TYPE_QUERY = {
  "full-time":  "full time",
  "part-time":  "part time",
  "contract":   "contract",
  "freelance":  "freelance",
  "internship": "internship",
}

function mapJob(j) {
  const location = [j.job_city, j.job_state, j.job_country]
    .filter(Boolean).join(", ")

  const workMode = j.job_is_remote
    ? "remote"
    : j.job_title?.toLowerCase().includes("hybrid") ? "hybrid" : "office"

  const skills = [
    ...(j.job_required_skills || []),
    ...(j.job_highlights?.Qualifications || []),
  ].map(s => (typeof s === "string" ? s : String(s)))
   .filter(s => s.length < 40)           // strip long sentences
   .slice(0, 12)

  return {
    id:             j.job_id,
    title:          j.job_title,
    company:        j.employer_name,
    company_logo:   j.employer_logo,
    location,
    work_mode:      workMode,
    job_type:       TYPE_MAP[j.job_employment_type] || j.job_employment_type?.toLowerCase() || "full-time",
    salary_min:     j.job_min_salary   ? Math.round(j.job_min_salary)   : null,
    salary_max:     j.job_max_salary   ? Math.round(j.job_max_salary)   : null,
    salary_currency: j.job_salary_currency || "INR",
    is_verified:    true,
    apply_url:      j.job_apply_link,
    posted_at:      j.job_posted_at_datetime_utc,
    jd_summary:     j.job_description?.slice(0, 400) || "",
    essential_skills: skills.slice(0, 8),
    technologies:   (j.job_highlights?.Qualifications || [])
                      .filter(s => /react|node|python|java|sql|aws|docker|k8s|typescript|go\b|rust/i.test(s))
                      .slice(0, 6),
    match_score:    null,  // populated by AI match if enabled
    source:         j.job_publisher || "JSearch",
  }
}

// ─── Fetch from JSearch ────────────────────────────────────────────────────────
async function jsearchFetch(path, params) {
  const key = process.env.RAPIDAPI_KEY
  if (!key || key === "your_rapidapi_key_here") {
    throw new Error("RAPIDAPI_KEY not set — add it to .env")
  }
  const url = `${JSEARCH_BASE}${path}?${new URLSearchParams(params)}`
  const res = await fetch(url, {
    headers: {
      "X-RapidAPI-Key":  key,
      "X-RapidAPI-Host": JSEARCH_HOST,
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`JSearch ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

// ─── GET /api/jobs/list ────────────────────────────────────────────────────────
// Query params: search, work_mode, job_type, page, limit
router.get("/jobs/list", async (req, res) => {
  const {
    search    = "",
    work_mode = "",
    job_type  = "",
    page      = 1,
  } = req.query

  // Build JSearch query string
  let query = search || "software developer"

  // Append type hint to query if filter provided (JSearch doesn't have a strict enum filter)
  if (job_type && TYPE_QUERY[job_type]) query += ` ${TYPE_QUERY[job_type]}`
  if (work_mode === "remote")           query += " remote"

  // Target India by default
  if (!/india|bangalore|mumbai|hyderabad|pune|chennai|delhi/i.test(query)) {
    query += " India"
  }

  // ── Stage 1: JSearch (live listings) ─────────────────────────────────────
  const key = process.env.RAPIDAPI_KEY
  if (key && key !== "your_rapidapi_key_here") {
    try {
      const data = await jsearchFetch("/search", {
        query,
        page:      String(page),
        num_pages: "1",
        country:   "in",
      })

      const jobs = (data.data || []).map(mapJob)

      const filtered = work_mode
        ? jobs.filter(j => j.work_mode === work_mode)
        : jobs

      if (filtered.length > 0) {
        return res.json({
          jobs:  filtered,
          total: data.status === "OK" ? (data.data?.length ?? filtered.length) * 3 : filtered.length,
          page:  Number(page),
          source: "jsearch",
        })
      }
    } catch (e) {
      console.warn("[jobs/list] JSearch failed, falling back to DB:", e.message)
    }
  }

  // ── Stage 2: Supabase jobs table (seeded fallback) ────────────────────────
  try {
    const { supabaseAdmin } = await import("../lib/supabase.js")
    const searchLower = search.toLowerCase()

    let dbQuery = supabaseAdmin
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .range((Number(page) - 1) * 20, Number(page) * 20 - 1)

    if (search) {
      // Keyword filter against title, company, jd_summary
      dbQuery = dbQuery.or(`title.ilike.%${search}%,jd_summary.ilike.%${search}%,company.ilike.%${search}%`)
    }
    if (work_mode) dbQuery = dbQuery.eq("work_mode", work_mode)
    if (job_type)  dbQuery = dbQuery.eq("job_type",  job_type)

    const { data: rows, error, count } = await dbQuery

    if (error) throw error

    const jobs = (rows || []).map(r => ({
      id:               r.id,
      title:            r.title,
      company:          r.company,
      company_logo:     r.company_logo || null,
      location:         r.location,
      work_mode:        r.work_mode,
      job_type:         r.job_type || "full-time",
      salary_min:       r.salary_min,
      salary_max:       r.salary_max,
      salary_currency:  r.salary_currency || "INR",
      is_verified:      r.is_verified,
      apply_url:        r.external_url,
      posted_at:        r.posted_at,
      jd_summary:       r.jd_summary,
      essential_skills: r.essential_skills || [],
      technologies:     r.technologies || [],
      match_score:      null,
      source:           r.source || "Capabilio",
    }))

    return res.json({ jobs, total: count ?? jobs.length, page: Number(page), source: "db" })
  } catch (e) {
    console.error("[jobs/list] DB fallback failed:", e.message)
    return res.status(500).json({ error: "Job listings temporarily unavailable", jobs: [], total: 0 })
  }
})

// Keep legacy /jobs for backwards compat (redirects to /jobs/list)
router.get("/jobs", (req, res) => res.redirect(`/api/jobs/list?${new URLSearchParams(req.query)}`))

// ─── GET /api/jobs/applications — user's job applications (from Supabase) ─────
router.get("/jobs/applications", async (req, res) => {
  try {
    const { supabaseAdmin } = await import("../lib/supabase.js")
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
    if (!token) return res.json({ applications: [] })
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return res.json({ applications: [] })
    const { data } = await supabaseAdmin
      .from("job_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("applied_at", { ascending: false })
      .limit(50)
    return res.json({ applications: data || [] })
  } catch (e) {
    console.error("[jobs/applications]", e.message)
    return res.json({ applications: [] })   // never 500 — return empty gracefully
  }
})

// ─── GET /api/jobs/saved — user's saved jobs (from Supabase) ──────────────────
router.get("/jobs/saved", async (req, res) => {
  try {
    const { supabaseAdmin } = await import("../lib/supabase.js")
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
    if (!token) return res.json({ saved: [] })
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    if (!user) return res.json({ saved: [] })
    const { data } = await supabaseAdmin
      .from("saved_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false })
      .limit(50)
    return res.json({ saved: data || [] })
  } catch (e) {
    console.error("[jobs/saved]", e.message)
    return res.json({ saved: [] })   // never 500 — return empty gracefully
  }
})

// ─── GET /api/jobs/:id — fetch single job details ─────────────────────────────
router.get("/jobs/:id", async (req, res) => {
  const { id } = req.params
  try {
    const data = await jsearchFetch("/job-details", { job_id: id, extended_publisher_details: "false" })
    const job  = data.data?.[0]
    if (!job) return res.status(404).json({ error: "Job not found" })
    return res.json(mapJob(job))
  } catch (e) {
    console.error("[jobs/:id]", e.message)
    return res.status(500).json({ error: e.message })
  }
})

// ─── Cache market data — refreshes every 12 hours ─────────────────────────────
let marketCache = { data: null, ts: 0 }

// ─── GET /api/markets/india ── Gemini Search → Groq fallback ──────────────────
router.get("/markets/india", async (req, res) => {
  if (marketCache.data && Date.now() - marketCache.ts < 12 * 60 * 60 * 1000) {
    return res.json({ ...marketCache.data, _cached: true })
  }

  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_key_here") {
    try {
      const { text } = await geminiSearch(
        `Search for the latest Indian tech job market trends in 2026:
- Which tech roles have the highest hiring demand right now?
- What are the top skills being hired for?
- What are typical salary ranges for junior/mid/senior tech roles in India?
- Which companies are hiring the most tech talent in India?
- Is overall hiring trending up, down, or stable?

Return ONLY this JSON (no markdown):
{
  "hiringTrend": "up|stable|down",
  "topRoles": [
    {"title": "<role>", "demandChange": "+X%", "avgSalary": "₹X LPA", "eloRequired": <n>},
    {"title": "<role>", "demandChange": "+X%", "avgSalary": "₹X LPA", "eloRequired": <n>},
    {"title": "<role>", "demandChange": "+X%", "avgSalary": "₹X LPA", "eloRequired": <n>},
    {"title": "<role>", "demandChange": "+X%", "avgSalary": "₹X LPA", "eloRequired": <n>}
  ],
  "topSkills":       ["<skill1>","<skill2>","<skill3>","<skill4>","<skill5>"],
  "emergingSkills":  ["<skill1>","<skill2>","<skill3>"],
  "topHiringCompanies": ["<company1>","<company2>","<company3>","<company4>","<company5>"],
  "salaryInsights": {
    "junior": "₹4–8 LPA",
    "mid":    "₹10–20 LPA",
    "senior": "₹22–40 LPA",
    "staff":  "₹45–80 LPA"
  },
  "marketSummary": "<2 sentence summary of current Indian tech hiring market>"
}`,
        { maxTokens: 1000 }
      )

      const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
      const data  = JSON.parse(match?.[1] || text)
      data.updatedAt = new Date().toISOString()
      data._source   = "gemini-search"

      marketCache = { data, ts: Date.now() }
      return res.json(data)
    } catch (e) { console.warn("[markets/india] Gemini:", e.message) }
  }

  // Groq fallback
  try {
    const raw = await groq([{
      role: "user",
      content: `Indian tech job market report 2026. Return ONLY valid JSON.
{"hiringTrend":"up|stable|down","topRoles":[{"title":"...","demandChange":"+X%","avgSalary":"₹X LPA","eloRequired":<n>}],"topSkills":["..."],"emergingSkills":["..."],"topHiringCompanies":["..."],"salaryInsights":{"junior":"₹4–8 LPA","mid":"₹10–20 LPA","senior":"₹22–40 LPA","staff":"₹45–80 LPA"},"marketSummary":"...","updatedAt":"${new Date().toISOString()}"}`
    }], { model: GROQ_FAST, max_tokens: 800, json: true })
    const data = JSON.parse(raw)
    data._source = "groq"
    marketCache = { data, ts: Date.now() }
    return res.json(data)
  } catch (e) { console.error("[markets/india]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
