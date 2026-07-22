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

const router = Router()

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
  res.json({ success: true, link: row, matchedExistingAccount: !!companyUserId })
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

export default router
