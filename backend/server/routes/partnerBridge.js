/**
 * Partner Bridge — 2026-08-05
 * ---------------------------------------------------------------------------
 * Service-to-service integration for the standalone "capabilio-recruiter"
 * app, which lives in its own separate codebase and its own separate
 * Supabase project (recruiters there have no account or session here).
 *
 * Product decision (see conversation this was built in): rather than merge
 * the two Supabase projects or forge per-user JWTs across systems, this is a
 * narrow, explicit bridge. capabilio-recruiter's OWN backend calls these
 * routes server-to-server, authenticated by a shared secret (not a per-user
 * session) -- the shared secret never reaches any browser on either side.
 *
 * SECURITY:
 * - requirePartnerSecret fails CLOSED: if PARTNER_BRIDGE_SECRET isn't set in
 *   this app's env, every request here 503s rather than silently allowing
 *   unauthenticated access.
 * - GET /candidates reuses the exact same privacy-gated query as
 *   recruiterSearch.js (profiles.recruiter_discoverable = true AND
 *   employment_status <> 'active_hidden', same field whitelist -- never
 *   email/phone/vault/resume data). This is the same trust boundary as the
 *   in-app recruiter search, just reached from a different caller. Updated
 *   2026-08-06 (employment_status_recruiter_visibility migration) to add
 *   the employment_status gate alongside recruiter_discoverable -- see
 *   recruiterSearch.js's header comment for why both are required.
 * - GET /institutions lists only non-sensitive institution display info.
 * - GET/POST /company-invites lets a recruiter-side company READ the
 *   institution invites addressed to it (org_company_links, status=
 *   'invited') and ACCEPT/DECLINE them, without needing a profiles row in
 *   this app's Supabase project. This does NOT reuse company_user_id (which
 *   only ever points at a same-DB profiles.id) -- it writes a separate
 *   partner_company_ref/accepted_via pair added in
 *   org_company_links_partner_bridge_migration.sql. First-to-accept wins:
 *   a link already claimed via this app's own /company-invite/:token flow
 *   (company_user_id set) can't also be claimed here, and vice versa is
 *   enforced by the status='invited' guard on both paths.
 * - There is still NO endpoint for the reverse direction (a recruiter
 *   requesting a college that hasn't invited them) -- that has no UI on the
 *   institution side to action it yet. Real product gap, not faked here.
 *
 * UPDATED 2026-08-07 — raw ELO briefly stripped from GET /candidates, then
 * REVERSED same day: "i want recruiters to see the student ELO and student
 * choosen career, so then recruiters can see what student is proven" —
 * confirmed as a full reversal, same as recruiterSearch.js (see that file's
 * header for the full quote). role_elo/professional_elo/aura_score are back
 * in the response; performance_tier stays as an additive derived field.
 * performanceTier is imported from orgStudentVisibility.js (this file
 * already imports fetchLinkStudents from there) rather than duplicated,
 * since both are in the same app/deploy unit.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { fetchLinkStudents, performanceTier } from "../lib/orgStudentVisibility.js"

const router = Router()

function requirePartnerSecret(req, res, next) {
  const expected = process.env.PARTNER_BRIDGE_SECRET
  if (!expected) {
    return res.status(503).json({ error: "Partner bridge not configured on this deployment." })
  }
  const provided = req.headers["x-partner-secret"]
  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid partner credentials." })
  }
  next()
}

router.use(requirePartnerSecret)

// Identical field whitelist and privacy gate to recruiterSearch.js's
// GET /api/recruiter/search -- this is the same data, reached by a
// different (service-authenticated) caller, not a looser version of it.
const RESULT_FIELDS = [
  "id", "username", "display_name", "avatar_url", "headline",
  "current_role_title", "current_company", "domain", "target_role",
  "path_type", "years_of_experience", "location",
  "role_elo", "professional_elo", "aura_score",
  "uan_verified", "education_verified",
  "employment_status", "notice_period_ends_at",
].join(", ")

router.get("/candidates", async (req, res) => {
  try {
    const {
      skill = "", domain = "", minElo, verifiedOnly,
      limit: limitRaw, offset: offsetRaw,
      partnerName = "capabilio-recruiter",
    } = req.query

    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50)
    const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0)

    let matchingUserIds = null
    if (skill.trim()) {
      const { data: skillRows, error: skillErr } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .eq("is_current", true)
        .ilike("skill_name", `%${skill.trim()}%`)
        .limit(500)
      if (skillErr) return res.status(500).json({ error: skillErr.message })
      matchingUserIds = [...new Set((skillRows || []).map((r) => r.user_id))]
      if (matchingUserIds.length === 0) return res.json({ candidates: [], total: 0, limit, offset })
    }

    let query = supabaseAdmin
      .from("profiles")
      .select(RESULT_FIELDS, { count: "exact" })
      .eq("recruiter_discoverable", true)
      .neq("employment_status", "active_hidden") // second mandatory gate — see file header
      .is("org_type", null)

    if (matchingUserIds) query = query.in("id", matchingUserIds)
    if (domain.trim()) query = query.ilike("domain", `%${domain.trim()}%`)
    if (verifiedOnly === "true" || verifiedOnly === "1") {
      query = query.or("uan_verified.eq.true,education_verified.eq.true")
    }
    const minEloNum = parseInt(minElo, 10)
    if (Number.isFinite(minEloNum)) {
      query = query.or(`professional_elo.gte.${minEloNum},role_elo.gte.${minEloNum},aura_score.gte.${minEloNum}`)
    }

    query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: candidates, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    const ids = (candidates || []).map((c) => c.id)
    let skillsByUser = {}
    if (ids.length > 0) {
      const { data: skillRows } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .in("user_id", ids)
        .eq("is_current", true)
        .order("elo_value", { ascending: false })
      for (const row of skillRows || []) {
        if (!skillsByUser[row.user_id]) skillsByUser[row.user_id] = []
        if (skillsByUser[row.user_id].length < 3) skillsByUser[row.user_id].push(row.skill_name)
      }
    }

    console.log(`[partner-bridge] ${partnerName} fetched ${candidates?.length || 0} candidates`)
    const enriched = (candidates || []).map((c) => {
      const tierScore = Math.max(c.role_elo || 0, c.professional_elo || 0, c.aura_score || 0)
      return { ...c, performance_tier: performanceTier(tierScore), topSkills: skillsByUser[c.id] || [] }
    })
    res.json({ candidates: enriched, total: count ?? enriched.length, limit, offset })
  } catch (err) {
    console.error("[partner-bridge/candidates]", err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get("/institutions", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, org_name, name, updated_at")
      .eq("org_type", "institution")
      .order("org_name", { ascending: true })
      .limit(200)
    if (error) return res.status(500).json({ error: error.message })

    const institutions = (data || []).map((p) => ({
      id: p.id,
      name: p.org_name || p.name || "Unnamed institution",
    }))
    res.json({ institutions })
  } catch (err) {
    console.error("[partner-bridge/institutions]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: list institution invites addressed to this company ─────────
// Matched by company_email (what the institution typed when inviting) OR
// partner_accepted_by (for invites this same bridge already accepted, so a
// re-fetch shows current status). Case-insensitive exact match, not a
// substring search -- ilike with no wildcards.
router.get("/company-invites", async (req, res) => {
  try {
    const email = (req.query.email || "").trim()
    if (!email) return res.status(400).json({ error: "email query param is required." })

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100)
    const safeEmail = email.replace(/[,()]/g, "") // keep the .or() filter string well-formed

    const { data, error } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, company_name, company_email, company_website, company_address, company_size, industry, notes, status, visibility, created_at, linked_at, accepted_via")
      .or(`company_email.ilike.${safeEmail},partner_accepted_by.ilike.${safeEmail}`)
      .order("created_at", { ascending: false })
      .limit(limit)
    if (error) return res.status(500).json({ error: error.message })

    const orgIds = [...new Set((data || []).map((l) => l.institution_org_id))]
    let orgNames = {}
    if (orgIds.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, org_name, name").in("id", orgIds)
      orgNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.org_name || p.name || "An institution"]))
    }

    res.json({
      invites: (data || []).map((l) => ({ ...l, institution_name: orgNames[l.institution_org_id] || "An institution" })),
    })
  } catch (err) {
    console.error("[partner-bridge/company-invites]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: accept an institution invite ────────────────────────────────
router.post("/company-invites/:id/accept", async (req, res) => {
  try {
    const partnerCompanyId = String(req.body?.partnerCompanyId || "").trim()
    const acceptedByEmail = String(req.body?.acceptedByEmail || "").trim()
    if (!partnerCompanyId)
      return res.status(400).json({ error: "partnerCompanyId is required." })

    const { data: link, error: fetchErr } = await supabaseAdmin
      .from("org_company_links")
      .select("id, status, company_user_id")
      .eq("id", req.params.id)
      .single()
    if (fetchErr || !link) return res.status(404).json({ error: "Invite not found." })
    if (link.company_user_id)
      return res.status(409).json({ error: "This invite was already accepted through a Capabilio company account." })
    if (link.status !== "invited")
      return res.status(409).json({ error: `This invite was already ${link.status}.` })

    // Re-assert status='invited' in the WHERE clause as an optimistic-
    // concurrency guard against two simultaneous accept calls racing on the
    // same row -- .single() on the result means "someone else already
    // claimed it between our SELECT and this UPDATE" surfaces as a 409, not
    // a silent double-accept.
    const { data: updated, error } = await supabaseAdmin
      .from("org_company_links")
      .update({
        status: "active",
        linked_at: new Date().toISOString(),
        nda_signed_at: new Date().toISOString(),
        partner_company_ref: partnerCompanyId,
        partner_accepted_by: acceptedByEmail || null,
        accepted_via: "partner_bridge",
      })
      .eq("id", req.params.id)
      .eq("status", "invited")
      .select()
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!updated) return res.status(409).json({ error: "This invite was just actioned by someone else — refresh and check its status." })

    console.log(`[partner-bridge] company-invite ${req.params.id} accepted (partner_company_ref=${partnerCompanyId})`)
    res.json({ success: true, link: updated })
  } catch (err) {
    console.error("[partner-bridge/company-invites/accept]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── Recruiter: decline an institution invite ───────────────────────────────
router.post("/company-invites/:id/decline", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, status")
      .eq("id", req.params.id)
      .single()
    if (!link) return res.status(404).json({ error: "Invite not found." })
    if (link.status !== "invited")
      return res.status(409).json({ error: `This invite was already ${link.status}.` })

    const { data: updated, error } = await supabaseAdmin
      .from("org_company_links")
      .update({ status: "rejected" })
      .eq("id", req.params.id)
      .eq("status", "invited")
      .select()
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })
    if (!updated) return res.status(409).json({ error: "This invite was just actioned by someone else — refresh and check its status." })

    res.json({ success: true })
  } catch (err) {
    console.error("[partner-bridge/company-invites/decline]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Recruiter -> connected-college roster + per-student access requests
// Added 2026-08-06 — closes the "reverse direction" gap noted in the file
// header above. A recruiter can now:
//   1. List its own ACTIVE college connections (GET /company-links)
//   2. View that college's tier-scoped aggregate roster (GET .../students)
//   3. Request contact access to ONE specific student (POST .../request-access)
//   4. Check the status of its own requests (GET .../access-requests)
// Approval itself happens on the college side (backend/server/routes/
// college.js's placement-cell decide route) — nothing here can self-approve.
// See recruiter_student_access_requests_migration.sql for the schema.
// ─────────────────────────────────────────────────────────────────────────────

// Matches the same email-based identity pattern as /company-invites above —
// a recruiter has no profiles row here, so "which links are mine" is
// resolved by matching the email they authenticate as on capabilio-recruiter
// against company_email (set at invite time) or partner_accepted_by (set
// when they accepted through this same bridge).
router.get("/company-links", async (req, res) => {
  try {
    const email = (req.query.email || "").trim()
    if (!email) return res.status(400).json({ error: "email query param is required." })
    const safeEmail = email.replace(/[,()]/g, "")

    const { data, error } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, company_name, status, visibility, linked_at")
      .or(`company_email.ilike.${safeEmail},partner_accepted_by.ilike.${safeEmail}`)
      .eq("status", "active")
      .order("linked_at", { ascending: false })
    if (error) return res.status(500).json({ error: error.message })

    const orgIds = [...new Set((data || []).map((l) => l.institution_org_id))]
    let orgNames = {}
    if (orgIds.length) {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("id, org_name, name").in("id", orgIds)
      orgNames = Object.fromEntries((profiles || []).map((p) => [p.id, p.org_name || p.name || "An institution"]))
    }

    res.json({ links: (data || []).map((l) => ({ ...l, institution_name: orgNames[l.institution_org_id] || "An institution" })) })
  } catch (err) {
    console.error("[partner-bridge/company-links]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// Aggregate, tier-scoped roster — identical query/columns to the company-side
// /org/company-links/:id/students route, via the same fetchLinkStudents
// helper. No individual student is contactable from this data alone.
router.get("/company-links/:linkId/students", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, status, visibility")
      .eq("id", req.params.linkId)
      .single()
    if (!link) return res.status(404).json({ error: "Link not found." })
    if (link.status !== "active") return res.status(403).json({ error: "This connection is not active." })

    const { students, error } = await fetchLinkStudents(link)
    if (error) return res.status(500).json({ error })
    res.json({ students, visibility: link.visibility })
  } catch (err) {
    console.error("[partner-bridge/company-links/students]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /company-links/:linkId/students/:studentId/request-access
// Body: { partnerCompanyId, requestedByEmail, reason }
// Creates (or resets to pending, if previously denied) a per-student request.
// This does NOT grant anything by itself — decide happens on the college
// side. studentId is verified to actually belong to this link's institution
// before a row is created, so a recruiter can't request access to an
// arbitrary profiles.id unrelated to this college.
router.post("/company-links/:linkId/students/:studentId/request-access", async (req, res) => {
  try {
    const { data: link } = await supabaseAdmin
      .from("org_company_links")
      .select("id, institution_org_id, status")
      .eq("id", req.params.linkId)
      .single()
    if (!link) return res.status(404).json({ error: "Link not found." })
    if (link.status !== "active") return res.status(403).json({ error: "This connection is not active." })

    const { data: member } = await supabaseAdmin
      .from("org_members")
      .select("id, user_id")
      .eq("org_id", link.institution_org_id)
      .eq("user_id", req.params.studentId)
      .eq("role", "student")
      .maybeSingle()
    if (!member) return res.status(404).json({ error: "This student isn't part of that college's roster." })

    const partnerCompanyId = String(req.body?.partnerCompanyId || "").trim()
    const requestedByEmail = String(req.body?.requestedByEmail || "").trim()
    const reason = String(req.body?.reason || "").trim() || null

    const { data: upserted, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .upsert(
        {
          org_company_link_id: link.id,
          student_id: req.params.studentId,
          requested_by_partner_ref: partnerCompanyId || null,
          requested_by_email: requestedByEmail || null,
          reason,
          status: "pending",
          decided_by: null,
          decided_at: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "org_company_link_id,student_id" }
      )
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    res.json({ request: upserted })
  } catch (err) {
    console.error("[partner-bridge/request-access]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /company-links/:linkId/access-requests — a recruiter's own requests
// for this link, so the UI can show pending/approved/denied per student.
router.get("/company-links/:linkId/access-requests", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .select("id, student_id, status, reason, created_at, decided_at")
      .eq("org_company_link_id", req.params.linkId)
    if (error) return res.status(500).json({ error: error.message })
    res.json({ requests: data || [] })
  } catch (err) {
    console.error("[partner-bridge/access-requests]", err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /access-requests/:studentId/status?linkId=X — single-row status check.
// Used by capabilio-recruiter-backend to gate task assignment: it must see
// status === "approved" here before it's allowed to insert into its own
// tasks_challenges table for this student. Returns "none" (not "denied")
// when no request row exists at all, so callers can tell "never asked"
// apart from "asked and refused".
router.get("/access-requests/:studentId/status", async (req, res) => {
  try {
    const linkId = String(req.query.linkId || "").trim()
    if (!linkId) return res.status(400).json({ error: "linkId query param is required." })

    const { data, error } = await supabaseAdmin
      .from("recruiter_student_access_requests")
      .select("status")
      .eq("org_company_link_id", linkId)
      .eq("student_id", req.params.studentId)
      .maybeSingle()
    if (error) return res.status(500).json({ error: error.message })

    res.json({ status: data?.status || "none" })
  } catch (err) {
    console.error("[partner-bridge/access-requests/status]", err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
