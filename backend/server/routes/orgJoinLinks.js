// Routes: /api/org/join-links, /api/org/join/:token
// Self-serve student onboarding via a shareable link, instead of an admin
// typing every student into the "+ Invite" modal one at a time
// (frontend/src/pages/InstitutionOS.jsx People page, ~1000 students/college).
//
// Scoped to the LIVE org_members table (org_id = institution admin's
// profiles.id) — see org_join_links_migration.sql header for why the
// pre-existing institution_invite_codes/institution_students tables were not
// reused (never applied to production, dead code).
//
// SECURITY: link resolution + joining happen entirely server-side via
// supabaseAdmin (service_role). Validation (active/expiry/max_uses) and the
// uses_count increment are done here, not trusted from the client — matches
// the PC-5 convention (derive identity from req.user.id, never the body).
import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

function generateToken() {
  // 8-char URL-safe token, e.g. "k3f9xq2p" — short enough to read aloud,
  // long enough (36^8 ≈ 2.8×10^12 combinations) that guessing isn't practical.
  return crypto.randomBytes(6).toString("base64url").slice(0, 8).toLowerCase().replace(/[-_]/g, "x")
}

const VALID_ROLES = ["student", "faculty", "admin", "recruiter", "mentor", "dept_head"]

// ─── Admin: create a join link ───────────────────────────────────────────────
router.post("/join-links", requireAuth, async (req, res) => {
  const orgId = req.user.id
  const { label = "", role = "student", department = "", batch = "", maxUses = null, expiresAt = null } = req.body || {}

  if (role && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` })
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1))
    return res.status(400).json({ error: "maxUses must be a positive integer or null" })

  let token = generateToken()
  // Extremely unlikely, but handle a token collision by retrying once.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabaseAdmin.from("org_join_links").insert({
      org_id: orgId, token, label, role, department, batch,
      max_uses: maxUses, expires_at: expiresAt, created_by: orgId,
    }).select().single()

    if (!error) {
      return res.json({ success: true, link: data, url: `${req.protocol}://${req.get("host").replace(/^api\./, "")}/join-org/${token}` })
    }
    if (error.code === "23505") { token = generateToken(); continue } // unique_violation on token — retry
    console.error("[org/join-links] create failed:", error.message)
    return res.status(500).json({ error: error.message })
  }
  res.status(500).json({ error: "Could not generate a unique link, please retry" })
})

// ─── Admin: list own join links ──────────────────────────────────────────────
router.get("/join-links", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("org_join_links").select("*")
    .eq("org_id", req.user.id)
    .order("created_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ links: data || [] })
})

// ─── Admin: revoke a join link ───────────────────────────────────────────────
router.patch("/join-links/:id/revoke", requireAuth, async (req, res) => {
  const { data: link } = await supabaseAdmin
    .from("org_join_links").select("id, org_id").eq("id", req.params.id).single()
  if (!link || link.org_id !== req.user.id)
    return res.status(404).json({ error: "Link not found" })

  const { error } = await supabaseAdmin
    .from("org_join_links").update({ is_active: false }).eq("id", req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// ─── Public: resolve a token (preview, before login/signup) ─────────────────
router.get("/join/:token", async (req, res) => {
  const { data: link, error } = await supabaseAdmin
    .from("org_join_links").select("*").eq("token", req.params.token).single()

  if (error || !link) return res.json({ valid: false, reason: "not_found" })
  if (!link.is_active) return res.json({ valid: false, reason: "revoked" })
  if (link.expires_at && new Date(link.expires_at) < new Date()) return res.json({ valid: false, reason: "expired" })
  if (link.max_uses !== null && link.uses_count >= link.max_uses) return res.json({ valid: false, reason: "max_uses_reached" })

  const { data: orgProfile } = await supabaseAdmin
    .from("profiles").select("org_name, name").eq("id", link.org_id).single()

  res.json({
    valid: true,
    orgName: orgProfile?.org_name || orgProfile?.name || "Your Institution",
    role: link.role, department: link.department, batch: link.batch, label: link.label,
  })
})

// ─── Join: consume the link and create the org_members row ──────────────────
router.post("/join/:token", requireAuth, async (req, res) => {
  const userId = req.user.id // PC-5: identity comes from the JWT, never the body

  // Check-and-increment with an optimistic lock (WHERE uses_count = <value we
  // just read>) — closes the race between two students hitting a link at the
  // same instant when it has exactly one use left. If another request wins
  // the race, this UPDATE affects 0 rows and we correctly report the link as
  // no longer valid rather than over-issuing past max_uses.
  const { data: link } = await supabaseAdmin.from("org_join_links").select("*").eq("token", req.params.token).single()
  if (!link) return res.status(410).json({ error: "This invite link is no longer valid.", reason: "not_found" })
  if (!link.is_active) return res.status(410).json({ error: "This invite link is no longer valid.", reason: "revoked" })
  if (link.expires_at && new Date(link.expires_at) < new Date())
    return res.status(410).json({ error: "This invite link is no longer valid.", reason: "expired" })
  if (link.max_uses !== null && link.uses_count >= link.max_uses)
    return res.status(410).json({ error: "This invite link is no longer valid.", reason: "max_uses_reached" })

  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("org_join_links").update({ uses_count: link.uses_count + 1 })
    .eq("id", link.id).eq("uses_count", link.uses_count) // optimistic lock
    .select().single()

  if (claimErr || !claimed)
    return res.status(410).json({ error: "This invite link is no longer valid.", reason: "max_uses_reached" })

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("name, email").eq("id", userId).single()

  const { data: member, error: insertErr } = await supabaseAdmin
    .from("org_members").insert({
      org_id: claimed.org_id, user_id: userId,
      name: profile?.name || req.user.email || "Member",
      email: profile?.email || req.user.email || "",
      role: claimed.role, department: claimed.department, batch: claimed.batch,
      status: "active", joined_at: new Date().toISOString(),
      metadata: { joined_via: "join_link", join_link_id: claimed.id },
    }).select().single()

  if (insertErr) {
    // 23505 = unique_violation on (org_id, user_id) — already a member of this
    // org via this or another link/invite. Idempotent: not an error to the user.
    if (insertErr.code === "23505") {
      const { data: existing } = await supabaseAdmin
        .from("org_members").select("*").eq("org_id", claimed.org_id).eq("user_id", userId).single()
      return res.json({ success: true, alreadyMember: true, member: existing })
    }
    console.error("[org/join] member insert failed:", insertErr.message)
    return res.status(500).json({ error: insertErr.message })
  }

  res.json({ success: true, member })
})

export default router
