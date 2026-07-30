// Routes: POST /api/org/* — server-side writes to PC-7-protected profiles columns
// FIXES: "Verification failed: profiles.verificationStatus can only be modified
// server-side" on the Institution OS "Settings > Verification" tab
// (frontend/src/pages/InstitutionOS.jsx, handleEmailVerify()).
//
// pc7_protect_profile_trust_fields_migration.sql blocks anon/authenticated
// roles from writing profiles.verificationStatus (and other trust columns) —
// intentional, applied 2026-07-20, to stop client-forged verification state.
// This route is the legitimate server-side path: it re-derives the target
// user from the authenticated JWT (PC-5 convention, see verify.js) and writes
// via supabaseAdmin (service_role), which the PC-7 trigger allows through.
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

// ─── Email verification ──────────────────────────────────────────────────────
// A signed-in Supabase session already implies a confirmed email address
// (Supabase Auth itself gates session issuance on email confirmation when
// confirmations are enabled). This endpoint simply records that fact into
// profiles.verificationStatus — it does not re-verify email ownership itself.
router.post("/verify-email", requireAuth, async (req, res) => {
  const uid = req.user.id // PC-5: bind to the authenticated user, never a client-supplied id

  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("id, verificationStatus")
    .eq("id", uid)
    .single()

  if (fetchErr || !profile)
    return res.status(404).json({ error: "Profile not found" })

  if (profile.verificationStatus === "email_verified")
    return res.json({ success: true, verificationStatus: "email_verified", alreadyVerified: true })

  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ verificationStatus: "email_verified" })
    .eq("id", uid)

  if (updateErr) {
    console.error("[org/verify-email] update failed:", updateErr.message)
    return res.status(500).json({ error: updateErr.message })
  }

  res.json({ success: true, verificationStatus: "email_verified" })
})

// ─── Document verification (NAAC certificate / accreditation upload) ───────
// Real self-serve replacement for the old "email your docs to
// verify@capabilio.com" instruction on Level 3. The file itself is uploaded
// client-side straight to Supabase Storage (org-media bucket — same bucket
// and upload helper already used for profile/cover photos, see
// InstitutionOS.jsx's uploadOrgPhoto), which returns a public URL. This route
// only records that URL against the profile and advances verificationStatus
// — the same "backend writes the PC-7-protected column, client only supplies
// the already-uploaded evidence" split used by verify-email above.
// Never regresses an already-higher level (e.g. a fully_verified admin
// re-uploading a doc stays fully_verified, doesn't drop back to
// document_submitted).
router.post("/verify-document", requireAuth, async (req, res) => {
  const uid = req.user.id // PC-5: bind to the authenticated user, never a client-supplied id
  const { url, docType = "naac_certificate" } = req.body || {}

  if (!url || typeof url !== "string" || !url.startsWith("http")) {
    return res.status(400).json({ error: "Body must include a valid { url } from the upload step" })
  }

  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("id, verificationStatus")
    .eq("id", uid)
    .single()

  if (fetchErr || !profile)
    return res.status(404).json({ error: "Profile not found" })

  const RANK = { "": 0, email_verified: 1, domain_verified: 2, document_submitted: 3, fully_verified: 4, verified: 4 }
  const currentLevel = RANK[profile.verificationStatus || ""] ?? 0

  const payload = { org_naac_cert_url: url }
  if (currentLevel < 3) payload.verificationStatus = "document_submitted"

  const { error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update(payload)
    .eq("id", uid)

  if (updateErr) {
    console.error("[org/verify-document] update failed:", updateErr.message)
    return res.status(500).json({ error: updateErr.message })
  }

  res.json({ success: true, url, docType, verificationStatus: payload.verificationStatus || profile.verificationStatus })
})

export default router
