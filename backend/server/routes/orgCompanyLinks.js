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
import crypto from "crypto"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { sendEmail } from "../lib/email.js"
import { fetchLinkStudents } from "../lib/orgStudentVisibility.js"

const router = Router()

function generateInviteToken() {
  return crypto.randomBytes(12).toString("hex")
}

// PII is never exposed to a connected company through this feature, at any
// visibility tier — "full" means fuller PERFORMANCE data, not contact info.
// 2026-08-06: "a company that wants to reach a specific student must go
// through the college" is now actually built — see
// recruiter_student_access_requests + partnerBridge.js's request-access
// routes + college.js's placement-cell decide routes. Column tiers now live
// in ../lib/orgStudentVisibility.js (shared with the recruiter-side partner
// bridge route) instead of being duplicated here.
const APP_URL = process.env.PUBLIC_APP_URL || "https://capabilio.online"

// PRODUCT DECISION 2026-08-06: invites are app-only now — a company must
// accept/decline inside its own product (this app's /company-invite/:token
// page for a same-DB "company" account, OR recruiter.capabilio.online's
// College Connections page via the partner bridge, see
// backend/server/routes/partnerBridge.js's /company-invites routes). Email
// delivery is intentionally disabled: previously this function sent an
// email with a direct accept/decline link, but that bypassed the "connect
// happens in the application, not via an email link" requirement. The
// function is kept (unused) rather than deleted so re-enabling email later
// (e.g. as a notification-only "you have a pending invite, log in to
// review it" nudge, no direct accept link) is a one-line change, not a
// rewrite.
async function sendInviteEmail({ institutionOrgId, companyEmail, companyName, inviteToken }) {
  if (!companyEmail.trim()) return { sent: false, reason: "no_email_provided" }
  const { data: inviterProfile } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", institutionOrgId).single()
  const institutionName = inviterProfile?.org_name || inviterProfile?.name || "An institution on Capabilio"
  const inviteUrl = `${APP_URL}/company-invite/${inviteToken}`
  return sendEmail({
    to: companyEmail.trim(),
    subject: `${institutionName} invited you to their Talent Network on Capabilio`,
    html: `<p>Hi,</p><p><strong>${institutionName}</strong> has invited your company to connect on Capabilio's Talent Network.</p><p>Review and accept or decline here: <a href="${inviteUrl}">${inviteUrl}</a></p><p>If you accept, you'll see this institution's verified student performance and placement data — never personal contact details. Reaching a student always goes through the college, never directly.</p><p style="color:#6B7280;font-size:12px;margin-top:16px">This creates a separate Talent Network account on Capabilio's institution-partnership site — it is not the same as a Capabilio Recruiter account at recruiter.capabilio.online.</p>`,
  })
}

// Always returns "not sent, disabled" without making a network call — see
// the product-decision comment above sendInviteEmail. Same return shape as
// sendInviteEmail() so callers don't need to branch.
function skipInviteEmail() {
  return { sent: false, reason: "email_disabled_app_only" }
}

// ─── College: invite a company (matches a real account if one exists) ───────
router.post("/company-links", requireAuth, async (req, res) => {
  const institutionOrgId = req.user.id // PC-5
  const { company_name, company_email = "", company_website = "", company_address = "", company_size = "", industry = "", notes = "" } = req.body || {}

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

  // company_user_id is recorded for informational display only (the
  // "🔗 Linked to Capabilio account" badge) — it does NOT grant access.
  // status always starts 'invited' and can only become 'active' through the
  // token-based accept route below, run by the company itself. This closes
  // the exact bug reported: a college could previously self-Activate any
  // unmatched invite with zero real consent from the company.
  const inviteToken = generateInviteToken()
  const { data: row, error } = await supabaseAdmin.from("org_company_links").insert({
    institution_org_id: institutionOrgId,
    company_name: company_name.trim(),
    company_email: company_email.trim(),
    company_website: company_website.trim(),
    company_address: company_address.trim(),
    company_size, industry, notes,
    status: "invited",
    invited_by: institutionOrgId,
    company_user_id: companyUserId,
    invite_token: inviteToken,
  }).select().single()

  if (error) return res.status(500).json({ error: error.message })

  const emailResult = skipInviteEmail()

  res.json({ success: true, link: row, matchedExistingAccount: !!companyUserId, emailSent: emailResult.sent, emailReason: emailResult.reason })
})

// ─── All companies (college's own full network, every status) ──────────────
router.get("/company-links", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("org_company_links").select("*")
    .eq("institution_org_id", req.user.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ links: data || [] })
})

// ─── College: edit a link's non-consent details ──────────────────────────────
// Deliberately excludes status/visibility/company_user_id/nda_* — those
// either flow through the token consent routes (status) or the existing
// direct-client visibility update (RLS-permitted, unrelated to consent).
// Re-checks ownership server-side rather than trusting RLS alone, since a
// second defense-in-depth layer costs nothing here and the pattern is already
// established throughout this route file.
router.patch("/company-links/:id", requireAuth, async (req, res) => {
  const { data: existing } = await supabaseAdmin.from("org_company_links").select("id, institution_org_id").eq("id", req.params.id).single()
  if (!existing || existing.institution_org_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })

  const { company_name, company_email, company_website, company_address, company_size, industry, notes } = req.body || {}
  if (company_name !== undefined && !company_name.trim())
    return res.status(400).json({ error: "Company name is required." })

  const patch = {}
  if (company_name    !== undefined) patch.company_name    = company_name.trim()
  if (company_email   !== undefined) patch.company_email   = company_email.trim()
  if (company_website  !== undefined) patch.company_website  = company_website.trim()
  if (company_address !== undefined) patch.company_address = company_address.trim()
  if (company_size    !== undefined) patch.company_size    = company_size
  if (industry         !== undefined) patch.industry         = industry
  if (notes            !== undefined) patch.notes            = notes

  // If the email changed, re-run the account match so the "linked" badge
  // stays accurate — but only for links that haven't already been accepted
  // (an accepted link's company_user_id is the company that actually
  // consented; editing contact details afterward shouldn't silently re-point
  // access to a different account).
  if (patch.company_email !== undefined) {
    const { data: current } = await supabaseAdmin.from("org_company_links").select("status").eq("id", req.params.id).single()
    if (current?.status === "invited") {
      if (patch.company_email) {
        const { data: match } = await supabaseAdmin.from("profiles").select("id").eq("email", patch.company_email).eq("org_type", "company").maybeSingle()
        patch.company_user_id = match?.id || null
      } else {
        patch.company_user_id = null
      }
    }
  }

  const { data: row, error } = await supabaseAdmin.from("org_company_links").update(patch).eq("id", req.params.id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, link: row })
})

// ─── College: delete a link entirely ─────────────────────────────────────────
router.delete("/company-links/:id", requireAuth, async (req, res) => {
  const { data: existing } = await supabaseAdmin.from("org_company_links").select("id, institution_org_id").eq("id", req.params.id).single()
  if (!existing || existing.institution_org_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })

  const { error } = await supabaseAdmin.from("org_company_links").delete().eq("id", req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ─── College: "resend" — app-only now, so there's no email to resend. Kept
// as a no-op success response (rather than removing the route) so the
// existing "Resend Invite" button in InstitutionOS.jsx doesn't 404; it just
// confirms the invite is still pending and tells the college the company
// needs to check their own recruiter application, not an inbox.
router.post("/company-links/:id/resend", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin.from("org_company_links").select("*").eq("id", req.params.id).single()
  if (!link || link.institution_org_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })
  if (link.status !== "invited")
    return res.status(409).json({ error: `Can't resend — this invite was already ${link.status}.` })

  const emailResult = skipInviteEmail()
  res.json({ success: true, emailSent: emailResult.sent, emailReason: emailResult.reason })
})

// ─── Public: resolve an invite token (preview before login/signup) ──────────
router.get("/company-invite/:token", async (req, res) => {
  const { data: link, error } = await supabaseAdmin
    .from("org_company_links").select("company_name, institution_org_id, status, visibility")
    .eq("invite_token", req.params.token).single()
  if (error || !link) return res.json({ valid: false, reason: "not_found" })

  const { data: inst } = await supabaseAdmin.from("profiles").select("org_name, name").eq("id", link.institution_org_id).single()
  res.json({
    valid: true,
    institutionName: inst?.org_name || inst?.name || "An institution",
    companyName: link.company_name,
    status: link.status, // lets the page show "already accepted/declined" instead of the buttons
  })
})

// ─── Company: accept via the emailed token (works with or without a prior account match) ──
router.post("/company-invite/:token/accept", requireAuth, async (req, res) => {
  const { data: profile } = await supabaseAdmin.from("profiles").select("org_type").eq("id", req.user.id).single()
  if (profile?.org_type !== "company")
    return res.status(403).json({ error: "This invite is for a company account. Complete your Organisation (Company) signup first, then try again." })

  const { data: link } = await supabaseAdmin.from("org_company_links").select("id, status").eq("invite_token", req.params.token).single()
  if (!link) return res.status(404).json({ error: "Invite not found." })
  if (link.status !== "invited") return res.status(409).json({ error: `This invite was already ${link.status}.` })

  const { error } = await supabaseAdmin.from("org_company_links").update({
    status: "active", linked_at: new Date().toISOString(),
    nda_signed_at: new Date().toISOString(), nda_signed_by: req.user.id,
    company_user_id: req.user.id, // covers the "no prior match at invite time" case too
  }).eq("id", link.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ─── Company: decline via the emailed token ──────────────────────────────────
router.post("/company-invite/:token/decline", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin.from("org_company_links").select("id, status").eq("invite_token", req.params.token).single()
  if (!link) return res.status(404).json({ error: "Invite not found." })
  if (link.status !== "invited") return res.status(409).json({ error: `This invite was already ${link.status}.` })

  const { error } = await supabaseAdmin.from("org_company_links").update({ status: "rejected" }).eq("id", link.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
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

  const { students, error } = await fetchLinkStudents(link)
  if (error) return res.status(500).json({ error })
  res.json({ students, visibility: link.visibility })
})

// ─────────────────────────────────────────────────────────────────────────────
// Placement cell: approve/deny a recruiter's request to contact one specific
// student — 2026-08-06. Same identity pattern as the rest of this file
// (req.user.id === org_company_links.institution_org_id, PC-5), so this is
// scoped to the logged-in institution admin's OWN connections only; there is
// no way to see or decide a request belonging to a different college.
// ─────────────────────────────────────────────────────────────────────────────

// GET /company-links/access-requests?status=pending — across ALL of this
// institution's company links, not just one. status defaults to "pending"
// (the placement-cell queue); pass status=all to see the full history.
router.get("/company-links/access-requests", requireAuth, async (req, res) => {
  const institutionOrgId = req.user.id
  const statusFilter = req.query.status || "pending"

  const { data: links } = await supabaseAdmin
    .from("org_company_links")
    .select("id, company_name")
    .eq("institution_org_id", institutionOrgId)
  const linkIds = (links || []).map((l) => l.id)
  if (linkIds.length === 0) return res.json({ requests: [] })
  const nameByLink = Object.fromEntries((links || []).map((l) => [l.id, l.company_name]))

  let query = supabaseAdmin
    .from("recruiter_student_access_requests")
    .select("id, org_company_link_id, student_id, requested_by_email, reason, status, created_at, decided_at")
    .in("org_company_link_id", linkIds)
    .order("created_at", { ascending: false })
  if (statusFilter !== "all") query = query.eq("status", statusFilter)

  const { data: requests, error } = await query
  if (error) return res.status(500).json({ error: error.message })

  const studentIds = [...new Set((requests || []).map((r) => r.student_id))]
  let studentNames = {}
  if (studentIds.length) {
    const { data: students } = await supabaseAdmin.from("profiles").select("id, name, display_name").in("id", studentIds)
    studentNames = Object.fromEntries((students || []).map((s) => [s.id, s.display_name || s.name || "A student"]))
  }

  res.json({
    requests: (requests || []).map((r) => ({
      ...r,
      company_name: nameByLink[r.org_company_link_id] || "A company",
      student_name: studentNames[r.student_id] || "A student",
    })),
  })
})

// POST /company-links/access-requests/:id/decide — body: { decision: "approved"|"denied" }
router.post("/company-links/access-requests/:id/decide", requireAuth, async (req, res) => {
  const institutionOrgId = req.user.id
  const decision = req.body?.decision
  if (!["approved", "denied"].includes(decision)) {
    return res.status(400).json({ error: 'decision must be "approved" or "denied".' })
  }

  const { data: reqRow } = await supabaseAdmin
    .from("recruiter_student_access_requests")
    .select("id, org_company_link_id, status")
    .eq("id", req.params.id)
    .single()
  if (!reqRow) return res.status(404).json({ error: "Request not found." })

  // Ownership check: the request's link must belong to THIS institution.
  const { data: link } = await supabaseAdmin
    .from("org_company_links")
    .select("id, institution_org_id")
    .eq("id", reqRow.org_company_link_id)
    .single()
  if (!link || link.institution_org_id !== institutionOrgId) {
    return res.status(404).json({ error: "Request not found." })
  }

  const { data: updated, error } = await supabaseAdmin
    .from("recruiter_student_access_requests")
    .update({ status: decision, decided_by: institutionOrgId, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .eq("status", "pending") // optimistic-concurrency guard, same pattern as the invite accept/decline routes above
    .select()
    .maybeSingle()
  if (error) return res.status(500).json({ error: error.message })
  if (!updated) return res.status(409).json({ error: "This request was already decided." })

  res.json({ success: true, request: updated })
})

export default router
