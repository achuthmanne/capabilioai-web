/**
 * Recruiter Communication & Jobs Routes
 *
 * Jobs:
 *   GET  /api/jobs/list              — list active jobs with skill matching
 *   GET  /api/jobs/:id               — get single job detail
 *   POST /api/jobs                   — create job (recruiter)
 *   POST /api/jobs/:id/apply         — apply to job
 *   GET  /api/jobs/applications      — user's applications
 *   POST /api/jobs/save              — save / unsave job
 *   GET  /api/jobs/saved             — list saved jobs
 *
 * Recruiter:
 *   GET  /api/recruiter/messages     — inbox / outbox
 *   POST /api/recruiter/messages     — send message
 *   POST /api/recruiter/schedule     — schedule interview
 *   GET  /api/recruiter/schedules    — list schedules (for user)
 *   PUT  /api/recruiter/schedule/:id — update schedule status
 *
 * Offers:
 *   POST /api/offers                 — send offer (recruiter)
 *   GET  /api/offers                 — list offers for user
 *   PUT  /api/offers/:id/respond     — accept/reject offer
 */
import { Router }   from "express"
import { supabaseAdmin }   from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

function optionalAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return next()
  supabaseAdmin.auth.getUser(token)
    .then(({ data: { user } }) => { req.user = user; next() })
    .catch(() => next())
}

// ══════════════════════════════════════════
// JOBS
// ══════════════════════════════════════════

router.get("/jobs/list", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, location, work_mode, job_type } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let q = supabaseAdmin.from("jobs").select("*", { count: "exact" })
      .eq("is_active", true)
      .order("posted_at", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (search) q = q.or(`title.ilike.%${search}%,company.ilike.%${search}%,jd_summary.ilike.%${search}%`)
    if (location) q = q.ilike("location", `%${location}%`)
    if (work_mode) q = q.eq("work_mode", work_mode)
    if (job_type)  q = q.eq("job_type", job_type)

    const { data: jobs, error, count } = await q
    if (error) throw error

    // If user is authenticated, add skill match data
    let enrichedJobs = jobs || []
    if (req.user) {
      const { data: userSkills } = await supabaseAdmin
        .from("skill_graph").select("skill_name,elo_value")
        .eq("user_id", req.user.id)
      const mySkillNames = (userSkills || []).map(s => s.skill_name.toLowerCase())

      enrichedJobs = enrichedJobs.map(job => {
        const required = (job.required_skills || []).map(s => (typeof s === "string" ? s : s.name || "").toLowerCase())
        const essential = (job.essential_skills || []).map(s => (typeof s === "string" ? s : s.name || "").toLowerCase())
        const allRequired = [...new Set([...required, ...essential])]

        const matched = allRequired.filter(s => mySkillNames.some(m => m.includes(s) || s.includes(m)))
        const missing = allRequired.filter(s => !mySkillNames.some(m => m.includes(s) || s.includes(m)))

        const matchScore = allRequired.length > 0 ? Math.round((matched.length / allRequired.length) * 100) : 50
        return { ...job, match_score: matchScore, matched_skills: matched, missing_skills: missing }
      })
    }

    res.json({ jobs: enrichedJobs, total: count || 0, page: parseInt(page), limit: parseInt(limit) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/jobs/:id", optionalAuth, async (req, res) => {
  try {
    const { data: job, error } = await supabaseAdmin.from("jobs").select("*").eq("id", req.params.id).single()
    if (error || !job) return res.status(404).json({ error: "Job not found" })

    // Add fit analysis if user authenticated
    let fitAnalysis = {}
    if (req.user) {
      const { data: profile } = await supabaseAdmin.from("profiles")
        .select("skill_graph,experiences,current_salary_lpa,expected_salary_lpa").eq("id", req.user.id).single()
      const { data: skills } = await supabaseAdmin.from("skill_graph")
        .select("skill_name,elo_value").eq("user_id", req.user.id)

      const mySkillNames = (skills || []).map(s => s.skill_name.toLowerCase())
      const required = [...(job.required_skills || []), ...(job.essential_skills || [])]
        .map(s => (typeof s === "string" ? s : s.name || "").toLowerCase()).filter(Boolean)

      const matched = required.filter(s => mySkillNames.some(m => m.includes(s) || s.includes(m)))
      const missing = required.filter(s => !mySkillNames.some(m => m.includes(s) || s.includes(m)))

      const matchScore = required.length > 0 ? Math.round((matched.length / required.length) * 100) : 50

      // AI fit explanation
      try {
        const prompt = `Job: ${job.title} at ${job.company}
Required skills: ${required.slice(0, 10).join(", ")}
My skills: ${mySkillNames.slice(0, 15).join(", ")}
Match score: ${matchScore}%

In 2 short sentences: (1) why this candidate is a good fit, (2) main gap or risk.
Return JSON: {"why_match": "...", "why_gap": "..."}`
        const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 200, json: true })
        fitAnalysis = JSON.parse(raw)
      } catch { fitAnalysis = { why_match: `${matchScore}% skill match found.`, why_gap: `${missing.length} required skills to develop.` } }

      fitAnalysis = { ...fitAnalysis, match_score: matchScore, matched_skills: matched, missing_skills: missing }
    }

    res.json({ job, fit_analysis: fitAnalysis })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/jobs", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("jobs").insert({
      ...req.body,
      posted_by: req.user.id,
      is_active: true,
      is_verified: false,
    }).select().single()
    if (error) throw error
    res.json({ success: true, job: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/jobs/:id/apply", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: job } = await supabaseAdmin.from("jobs").select("id,title,company,posted_by").eq("id", req.params.id).single()
    if (!job) return res.status(404).json({ error: "Job not found" })

    // Compute match score
    const { data: skills } = await supabaseAdmin.from("skill_graph").select("skill_name").eq("user_id", uid)
    const mySkillNames = (skills || []).map(s => s.skill_name.toLowerCase())

    const { data, error } = await supabaseAdmin.from("job_applications").insert({
      user_id:      uid,
      job_id:       job.id,
      recruiter_id: job.posted_by,
      status:       "applied",
      stage:        "applied",
      matched_skills: mySkillNames.slice(0, 10),
      stage_history: [{ stage: "applied", at: new Date().toISOString() }],
    }).select().single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Already applied" })
      throw error
    }

    // Notify recruiter
    if (job.posted_by) {
      const { data: applicant } = await supabaseAdmin.from("profiles")
        .select("name,headline").eq("id", uid).single()
      await supabaseAdmin.from("notifications").insert({
        user_id:        job.posted_by,
        type:           "new_application",
        title:          "New Application",
        body:           `${applicant?.name || "A candidate"} applied to ${job.title}`,
        actor_id:       uid,
        reference_id:   data.id,
        reference_type: "job_application",
      }).catch(() => {})
    }

    res.json({ success: true, application: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/jobs/applications", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("job_applications")
      .select("*, jobs(id,title,company,company_logo,location,work_mode,job_type,salary_min,salary_max)")
      .eq("user_id", req.user.id)
      .order("applied_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/jobs/save", requireAuth, async (req, res) => {
  try {
    const { job_id, action } = req.body
    if (action === "unsave") {
      await supabaseAdmin.from("saved_jobs").delete().match({ user_id: req.user.id, job_id })
      return res.json({ success: true, saved: false })
    }
    const { error } = await supabaseAdmin.from("saved_jobs").upsert({ user_id: req.user.id, job_id }, { onConflict: "user_id,job_id", ignoreDuplicates: true })
    if (error) throw error
    res.json({ success: true, saved: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/jobs/saved", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("saved_jobs")
      .select("*, jobs(*)")
      .eq("user_id", req.user.id)
      .order("saved_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// RECRUITER MESSAGES
// ══════════════════════════════════════════

router.get("/recruiter/messages", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { box = "inbox" } = req.query
    const q = supabaseAdmin.from("recruiter_messages").select("*, from_user:from_user_id(id,name,profile_photo_url,headline), to_user:to_user_id(id,name,profile_photo_url,headline)")
    if (box === "inbox") {
      q.eq("to_user_id", uid)
    } else {
      q.eq("from_user_id", uid)
    }
    const { data, error } = await q.order("created_at", { ascending: false }).limit(50)
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/recruiter/messages", requireAuth, async (req, res) => {
  try {
    const { to_user_id, subject, body, job_id, application_id, message_type = "message" } = req.body
    if (!to_user_id || !body) return res.status(400).json({ error: "to_user_id and body required" })

    const { data, error } = await supabaseAdmin.from("recruiter_messages").insert({
      from_user_id:   req.user.id,
      to_user_id,
      job_id:         job_id || null,
      application_id: application_id || null,
      message_type,
      subject:        subject || null,
      body,
    }).select().single()
    if (error) throw error

    // Notify recipient
    const { data: sender } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    await supabaseAdmin.from("notifications").insert({
      user_id:        to_user_id,
      type:           "recruiter_message",
      title:          "New Message",
      body:           `${sender?.name || "Someone"} sent you a message${subject ? `: ${subject}` : ""}`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "recruiter_message",
    }).catch(() => {})

    res.json({ success: true, message: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/recruiter/schedule", requireAuth, async (req, res) => {
  try {
    const { application_id, candidate_id, job_id, interview_type, stage, title, scheduled_at, duration_mins, meeting_link, description } = req.body
    if (!candidate_id || !scheduled_at) return res.status(400).json({ error: "candidate_id and scheduled_at required" })

    const { data, error } = await supabaseAdmin.from("interview_schedules").insert({
      application_id:  application_id || null,
      candidate_id,
      recruiter_id:    req.user.id,
      job_id:          job_id || null,
      interview_type:  interview_type || "video",
      stage:           stage || "initial",
      title:           title || `Interview - ${interview_type || "Video"}`,
      description:     description || null,
      scheduled_at,
      duration_mins:   duration_mins || 45,
      meeting_link:    meeting_link || null,
      status:          "scheduled",
      candidate_status: "pending",
    }).select().single()
    if (error) throw error

    // Notify candidate
    const { data: recruiter } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    await supabaseAdmin.from("notifications").insert({
      user_id:        candidate_id,
      type:           "interview_scheduled",
      title:          "Interview Scheduled",
      body:           `${recruiter?.name || "A recruiter"} scheduled an interview for ${new Date(scheduled_at).toLocaleDateString("en-IN")}`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "interview_schedule",
    }).catch(() => {})

    res.json({ success: true, schedule: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/recruiter/schedules", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data, error } = await supabaseAdmin.from("interview_schedules")
      .select("*, jobs(title,company)")
      .or(`candidate_id.eq.${uid},recruiter_id.eq.${uid}`)
      .order("scheduled_at", { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/recruiter/schedule/:id", requireAuth, async (req, res) => {
  try {
    const { data: sched } = await supabaseAdmin.from("interview_schedules").select("candidate_id,recruiter_id").eq("id", req.params.id).single()
    if (!sched || (sched.candidate_id !== req.user.id && sched.recruiter_id !== req.user.id))
      return res.status(403).json({ error: "Forbidden" })
    const { data, error } = await supabaseAdmin.from("interview_schedules")
      .update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, schedule: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// OFFERS
// ══════════════════════════════════════════

router.post("/offers", requireAuth, async (req, res) => {
  try {
    const { candidate_id, job_id, application_id, company, role_title, salary_lpa, joining_date, offer_document_url, expires_at } = req.body
    if (!candidate_id) return res.status(400).json({ error: "candidate_id required" })

    const { data, error } = await supabaseAdmin.from("offers").insert({
      candidate_id,
      recruiter_id:       req.user.id,
      job_id:             job_id || null,
      application_id:     application_id || null,
      company:            company || null,
      role_title:         role_title || null,
      salary_lpa:         salary_lpa || null,
      joining_date:       joining_date || null,
      offer_document_url: offer_document_url || null,
      expires_at:         expires_at || null,
    }).select().single()
    if (error) throw error

    const { data: recruiter } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    await supabaseAdmin.from("notifications").insert({
      user_id:        candidate_id,
      type:           "offer_received",
      title:          "Offer Letter Received",
      body:           `You received an offer${role_title ? ` for ${role_title}` : ""}${company ? ` at ${company}` : ""}`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "offer",
    }).catch(() => {})

    res.json({ success: true, offer: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/offers", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { as } = req.query
    let q = supabaseAdmin.from("offers").select("*, jobs(title,company)")
    if (as === "recruiter") {
      q = q.eq("recruiter_id", uid)
    } else {
      q = q.eq("candidate_id", uid)
    }
    const { data, error } = await q.order("created_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/offers/:id/respond", requireAuth, async (req, res) => {
  try {
    const { response } = req.body  // "accepted" | "rejected" | "countered"

    // Fetch full offer details — we need company/role/dates for auto-profile update
    const { data: offer } = await supabaseAdmin
      .from("offers")
      .select("candidate_id,recruiter_id,company,role_title,joining_date,salary_lpa,job_id")
      .eq("id", req.params.id)
      .single()
    if (!offer || offer.candidate_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin.from("offers").update({
      status:             response,
      candidate_response: response,
      responded_at:       new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    }).eq("id", req.params.id).select().single()
    if (error) throw error

    // ── Auto-update career timeline when offer is accepted ──────────────────
    // Pull job JD + skills if a job_id is attached; otherwise use offer fields.
    if (response === "accepted") {
      try {
        let jobDescription = ""
        let requiredSkills = []

        if (offer.job_id) {
          const { data: job } = await supabaseAdmin
            .from("job_postings")
            .select("description,required_skills,essential_skills")
            .eq("id", offer.job_id)
            .single()
          if (job) {
            jobDescription = job.description || ""
            requiredSkills = [
              ...(job.required_skills  || []),
              ...(job.essential_skills || []),
            ].map(s => (typeof s === "string" ? s : s.name || "")).filter(Boolean)
          }
        }

        // Build the new experience entry
        const newExp = {
          company:            offer.company    || "New Company",
          role:               offer.role_title || "New Role",
          startDate:          offer.joining_date
                                ? offer.joining_date.slice(0, 7)  // "YYYY-MM"
                                : new Date().toISOString().slice(0, 7),
          endDate:            null,
          isCurrent:          true,
          description:        jobDescription
                                ? jobDescription.slice(0, 600)
                                : `Role: ${offer.role_title || "New Role"} at ${offer.company || "New Company"}`,
          skills:             requiredSkills.slice(0, 12),
          industry:           "Technology",
          verificationStatus: "self-claimed",
          verificationSource: "Capabilio Offer",
          _source:            "offer_accepted",
          offerId:            req.params.id,
        }

        // Prepend to existing experiences (new job goes first)
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("experiences")
          .eq("id", req.user.id)
          .single()

        const existing = Array.isArray(profile?.experiences) ? profile.experiences : []

        // Mark any previous "isCurrent" entry as ended
        const today = new Date().toISOString().slice(0, 7)
        const updated = existing.map(e =>
          e.isCurrent ? { ...e, isCurrent: false, endDate: e.endDate || today } : e
        )

        await supabaseAdmin
          .from("profiles")
          .update({ experiences: [newExp, ...updated] })
          .eq("id", req.user.id)

        console.log(`[offer-accept] Auto-added "${newExp.role}" at "${newExp.company}" to timeline for user ${req.user.id}`)
      } catch (autoErr) {
        // Non-fatal — offer acceptance still succeeds even if timeline update fails
        console.error("[offer-accept] Timeline auto-update failed:", autoErr.message)
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    await supabaseAdmin.from("notifications").insert({
      user_id:        offer.recruiter_id,
      type:           "offer_response",
      title:          `Offer ${response.charAt(0).toUpperCase() + response.slice(1)}`,
      body:           `Candidate ${response} your offer`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "offer",
    }).catch(() => {})

    res.json({ success: true, offer: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
