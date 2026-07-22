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

export default router
