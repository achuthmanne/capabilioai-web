// Routes: /api/org/company-links, /api/org/company-links/received, /accept-nda, /decline
// Connects a college's Talent Network invite (org_company_links) to a REAL
// company org account on Capabilio, instead of an inert CRM record —
// frontend/src/pages/InstitutionOS.jsx CompaniesPage.
//
// SECURITY: matching an invite email to an existing company account requires
// reading profiles by email, which the inviting college's own RLS session
// cannot do — so this write (and the company-side accept/decline) goes
// through supabaseAdmin here rather than the client-side Supabase call the
// frontend used previously. Identity for the "who am I acting as" checks
// always comes from req.user.id (PC-5), never the request body.
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { sendEmail } from "../lib/email.js"

const router = Router()

// PII is never exposed to a connected company through this feature, at any
// visibility tier — "full" means fuller PERFORMANCE data, not contact info.
// A company that wants to reach a specific student must go through the
// college (out of scope for this pass — no messaging UI yet, but the data
// layer below guarantees email/phone can never leak via this path regardless
// of what gets built on top of it later).
const VISIBILITY_COLUMNS = {
  roster:     ["id", "name", "role", "department", "batch", "status"],
  elo:        ["id", "name", "role", "department", "batch", "status", "elo_rating"],
  placements: ["id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc"],
  full:       ["id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc", "joined_at"],
}

const APP_URL = process.env.PUBLIC_APP_URL || "https://capabilio.online"

// ─── College: invite a company (matches a real account if one exists) ───────
router.post("/company-links", requireAuth, async (req, res) => {
  const institutionOrgId = req.user.id // PC-5
  const { company_name, company_email = "", company_website = "", company_size = "", industry = "", notes = "" } = req.body || {}

  if (!company_name || !company_name.trim())
    return res.status(400).json({ error: "Company name is required." })

  let companyUserId = null
  if (company_email.trim()) {
    const { data: match } = await supabaseAdmin
      .from("profiles").select("id")
      .eq("email", company_email.trim())
      .eq("org_type", "company")
      .maybeSingle()
    companyUserId = match?.id || null
  }

  const { data: row, error } = await supabaseAdmin.from("org_company_links").insert({
    institution_org_id: institutionOrgId,
    company_name: company_name.trim(),
    company_email: company_email.trim(),
    company_website: company_website.trim(),
    company_size, industry, notes,
    status: "invited",
    invited_by: institutionOrgId,
    company_user_id: companyUserId,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  let emailResult = { sent: false, reason: "no_email_provided" }
  if (company_email.trim()) {
    const { data: inviterProfile } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", institutionOrgId).single()
    const institutionName = inviterProfile?.org_name || inviterProfile?.name || "An institution on Capabilio"
    emailResult = await sendEmail({
      to: company_email.trim(),
      subject: `${institutionName} invited you to their Talent Network on Capabilio`,
      html: companyUserId
        ? `<p>Hi,</p><p><strong>${institutionName}</strong> has invited your company to connect on Capabilio's Talent Network.</p><p>Log in to your Recruiter Network page to accept or decline: <a href="${APP_URL}">${APP_URL}</a></p><p>If you accept, you'll see student ELO scores and placement performance — never personal contact details. Reaching a student always goes through the college.</p>`
        : `<p>Hi,</p><p><strong>${institutionName}</strong> wants to connect with your company on Capabilio's Talent Network — a platform for verified student skill assessment and placements.</p><p>Sign up for a free Recruiter/Company account to review and accept this invite: <a href="${APP_URL}">${APP_URL}</a></p><p>If you accept, you'll see student ELO scores and placement performance — never personal contact details.</p>`,
    })
  }

  res.json({ success: true, link: row, matchedExistingAccount: !!companyUserId, emailSent: emailResult.sent, emailReason: emailResult.reason })
})

// ─── Company: list institutions that have linked/invited them ───────────────
router.get("/company-links/received", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("org_company_links").select("*")
    .eq("company_user_id", req.user.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  // Attach institution display name (profiles.org_name) for each link.
  const orgIds = [...new Set((data || []).map(l => l.institution_org_id))]
  let orgNames = {}
  if (orgIds.length) {
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, org_name, name").in("id", orgIds)
    orgNames = Object.fromEntries((profiles || []).map(p => [p.id, p.org_name || p.name || "An institution"]))
  }

  res.json({ links: (data || []).map(l => ({ ...l, institution_name: orgNames[l.institution_org_id] || "An institution" })) })
})

// ─── Company: accept the NDA and activate the link ───────────────────────────
router.post("/company-links/:id/accept-nda", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin.from("org_company_links").select("id, company_user_id").eq("id", req.params.id).single()
  if (!link || link.company_user_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })

  const { error } = await supabaseAdmin.from("org_company_links").update({
    status: "active", linked_at: new Date().toISOString(),
    nda_signed_at: new Date().toISOString(), nda_signed_by: req.user.id,
  }).eq("id", req.params.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ─── Company: decline the invite ─────────────────────────────────────────────
router.post("/company-links/:id/decline", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin.from("org_company_links").select("id, company_user_id").eq("id", req.params.id).single()
  if (!link || link.company_user_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })

  const { error } = await supabaseAdmin.from("org_company_links").update({ status: "rejected" }).eq("id", req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ─── Company: view the connected institution's student roster (PII-free) ────
// Ownership + consent-gated: only the matched company, only once status is
// 'active' (i.e. the NDA was actually accepted through this same route file's
// accept-nda handler — never bypassable from the client, per the consent
// trigger in org_company_links_consent_trigger_migration.sql). Column set is
// scoped by visibility tier via VISIBILITY_COLUMNS — email/phone are never
// selected from org_members at any tier, regardless of what visibility says.
router.get("/company-links/:id/students", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin
    .from("org_company_links").select("id, company_user_id, institution_org_id, status, visibility")
    .eq("id", req.params.id).single()

  if (!link || link.company_user_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })
  if (link.status !== "active")
    return res.status(403).json({ error: "This link is not active yet — the NDA must be accepted first." })

  const columns = VISIBILITY_COLUMNS[link.visibility] || VISIBILITY_COLUMNS.roster
  const { data: students, error } = await supabaseAdmin
    .from("org_members")
    .select(columns.join(","))
    .eq("org_id", link.institution_org_id)
    .eq("role", "student")
    .in("status", ["active", "placed"])
    .order("elo_rating", { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json({ students: students || [], visibility: link.visibility })
})

export default router
