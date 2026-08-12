// ─── Employer Attestation ────────────────────────────────────────────────────
// Real second verification path for claimed employment, independent of
// EPFO/AuthBridge (verify.js's /epfo/confirm). A former employer/manager/HR
// contact confirms or declines a specific claimed role via a one-time emailed
// link — no Capabilio account required on their end, same pattern as a
// password-reset link: the unguessable token itself is the access control,
// not RLS/auth (see employer_attestations RLS policy — no insert/update
// policy for `authenticated`, all writes go through this service-role route).
//
// Routes:
//   POST /api/pro/attestation/request   (auth)   candidate requests attestation
//   GET  /api/pro/attestation/list      (auth)   candidate views own requests
//   GET  /api/attestation/:token        (public) attester views claim, confirms/declines
//   POST /api/attestation/:token/confirm (public, token-gated)
//   POST /api/attestation/:token/decline (public, token-gated)
//
// On confirm: promotes profiles.experiences[experience_index] to verified
// (same field shape/discipline as verify.js's EPFO promotion — client never
// sets verificationStatus itself) and appends a hash-chained entry into
// verification_audit_log via lib/verification/auditLog.js, the same trail
// EPFO verifications now write into.
import { Router } from "express"
import crypto from "crypto"
import { requireAuth } from "../lib/auth.js"
import { supabaseAdmin } from "../lib/supabase.js"
import { sendEmail } from "../lib/email.js"
import * as auditLog from "../lib/verification/auditLog.js"

const router = Router()

const APP_URL = process.env.PUBLIC_APP_URL || "https://capabilio.online"
const EXPIRY_DAYS = 14

function generateToken() {
  // 32 bytes -> 43-char base64url string. Brute-forcing this is infeasible
  // (256 bits of entropy), so the token alone is a safe bearer credential for
  // an unauthenticated external party — same assumption as a password-reset
  // link.
  return crypto.randomBytes(32).toString("base64url")
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]))
}

// ─── Candidate: request attestation for a claimed experience entry ──────────
router.post("/pro/attestation/request", requireAuth, async (req, res) => {
  const uid = req.user.id // PC-5: identity from the JWT, never the body
  const { expIndex, attesterName, attesterEmail, attesterTitle = "" } = req.body || {}

  if (!Number.isInteger(expIndex) || expIndex < 0)
    return res.status(400).json({ error: "expIndex is required" })
  if (!attesterEmail?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attesterEmail.trim()))
    return res.status(400).json({ error: "A valid attesterEmail is required" })
  if (!attesterName?.trim())
    return res.status(400).json({ error: "attesterName is required" })

  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles")
    .select("experiences, display_name, full_name, name")
    .eq("id", uid)
    .single()
  if (fetchErr) return res.status(500).json({ error: fetchErr.message })

  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : []
  const exp = experiences[expIndex]
  if (!exp) return res.status(404).json({ error: "Experience entry not found" })
  if (exp.verificationStatus === "verified")
    return res.status(400).json({ error: "This experience entry is already verified — no attestation needed." })

  const candidateName = (profile?.display_name || profile?.full_name || profile?.name || "A Capabilio candidate").trim()

  let token = generateToken()
  let inserted = null
  // Extremely unlikely collision on a 256-bit token, but retry once anyway —
  // same defensive pattern as orgJoinLinks.js's short 8-char tokens.
  for (let attempt = 0; attempt < 2 && !inserted; attempt++) {
    const { data, error } = await supabaseAdmin.from("employer_attestations").insert({
      user_id: uid,
      experience_index: expIndex,
      company: exp.company || exp.displayCompany || "",
      role: exp.role || exp.title || "",
      start_date: exp.startDate || exp.start_date || "",
      end_date: exp.endDate || exp.end_date || "",
      attester_name: attesterName.trim(),
      attester_email: attesterEmail.trim().toLowerCase(),
      attester_title: attesterTitle.trim(),
      token,
      expires_at: new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()
    if (!error) { inserted = data; break }
    if (error.code === "23505") { token = generateToken(); continue } // unique_violation on token — retry
    console.error("[attestation/request] insert failed:", error.message)
    return res.status(500).json({ error: error.message })
  }
  if (!inserted) return res.status(500).json({ error: "Could not generate a unique attestation link, please retry" })

  const confirmUrl = `${APP_URL}/attest/${token}`
  const html = `
    <p>Hi ${escapeHtml(attesterName.trim())},</p>
    <p><strong>${escapeHtml(candidateName)}</strong> listed you as a reference to confirm their employment on Capabilio,
       a skills-verification platform.</p>
    <p>Claimed role: <strong>${escapeHtml(exp.role || exp.title || "")}</strong> at
       <strong>${escapeHtml(exp.company || exp.displayCompany || "")}</strong>
       ${exp.startDate || exp.start_date ? `(${escapeHtml(exp.startDate || exp.start_date)} – ${escapeHtml(exp.endDate || exp.end_date || "present")})` : ""}</p>
    <p>Please confirm or decline this claim — it takes under a minute and requires no account:</p>
    <p><a href="${confirmUrl}">${confirmUrl}</a></p>
    <p>This link expires in ${EXPIRY_DAYS} days.</p>
  `
  const emailResult = await sendEmail({
    to: inserted.attester_email,
    subject: `${candidateName} asked you to confirm their employment — Capabilio`,
    html,
  })
  if (!emailResult.sent) {
    // Fails soft (matches lib/email.js's documented contract) — the request
    // row exists and can be resent or the link shared manually, so we don't
    // roll it back, but the candidate should know the email didn't go out.
    console.warn(`[attestation/request] email not sent for attestation ${inserted.id}: ${emailResult.reason}`)
  }

  res.json({ success: true, attestation: inserted, emailSent: emailResult.sent })
})

// ─── Candidate: list own attestation requests ────────────────────────────────
router.get("/pro/attestation/list", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("employer_attestations")
    .select("*")
    .eq("user_id", req.user.id)
    .order("requested_at", { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ attestations: data || [] })
})

// ─── Public: load an attestation by token (used by the confirm/decline page) ─
router.get("/attestation/:token", async (req, res) => {
  const { data: row, error } = await supabaseAdmin
    .from("employer_attestations")
    .select("*")
    .eq("token", req.params.token)
    .maybeSingle()

  if (error) return res.status(500).json({ error: error.message })
  if (!row) return res.status(404).json({ valid: false, reason: "not_found" })
  if (row.status !== "pending") return res.json({ valid: false, reason: row.status, status: row.status })
  if (new Date(row.expires_at) < new Date()) {
    // Lazily flip to expired on first read past expiry rather than a
    // scheduled job — mirrors org_join_links' expires_at check style.
    await supabaseAdmin.from("employer_attestations").update({ status: "expired" }).eq("id", row.id)
    return res.json({ valid: false, reason: "expired" })
  }

  res.json({
    valid: true,
    company: row.company,
    role: row.role,
    startDate: row.start_date,
    endDate: row.end_date,
    attesterName: row.attester_name,
  })
})

async function resolvePendingAttestation(token) {
  const { data: row, error } = await supabaseAdmin
    .from("employer_attestations")
    .select("*")
    .eq("token", token)
    .maybeSingle()
  if (error) return { error: error.message }
  if (!row) return { notFound: true }
  if (row.status !== "pending") return { alreadyResolved: true, row }
  if (new Date(row.expires_at) < new Date()) {
    await supabaseAdmin.from("employer_attestations").update({ status: "expired" }).eq("id", row.id)
    return { expired: true }
  }
  return { row }
}

// ─── Public: attester confirms the claim ─────────────────────────────────────
router.post("/attestation/:token/confirm", async (req, res) => {
  const { note = "" } = req.body || {}
  const resolved = await resolvePendingAttestation(req.params.token)
  if (resolved.error) return res.status(500).json({ error: resolved.error })
  if (resolved.notFound) return res.status(404).json({ error: "Attestation not found" })
  if (resolved.expired) return res.status(410).json({ error: "This attestation link has expired" })
  if (resolved.alreadyResolved) return res.status(409).json({ error: `This attestation was already ${resolved.row.status}` })

  const row = resolved.row

  // Optimistic-lock the status transition (WHERE status = 'pending') so a
  // double-submit (e.g. the attester double-clicks Confirm) can't run this
  // twice — same race-closing pattern as orgJoinLinks.js's uses_count check.
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("employer_attestations")
    .update({ status: "confirmed", responded_at: new Date().toISOString(), response_note: note })
    .eq("id", row.id).eq("status", "pending")
    .select().single()
  if (claimErr || !claimed)
    return res.status(409).json({ error: "This attestation was already resolved by a concurrent request" })

  // Promote the matching experience entry, same discipline as verify.js's
  // EPFO promotion — never let the client set verificationStatus directly.
  const { data: profile, error: fetchErr } = await supabaseAdmin
    .from("profiles").select("experiences").eq("id", row.user_id).single()
  if (fetchErr) {
    console.error("[attestation/confirm] profile fetch failed:", fetchErr.message)
  } else {
    const experiences = Array.isArray(profile?.experiences) ? profile.experiences : []
    if (experiences[row.experience_index]) {
      const updatedExperiences = experiences.map((e, i) => i === row.experience_index ? {
        ...e,
        verificationStatus: "verified",
        verificationSource: "Employer Attestation",
        attestedBy: row.attester_name,
        attestedAt: new Date().toISOString(),
      } : e)
      const { error: updateErr } = await supabaseAdmin
        .from("profiles").update({ experiences: updatedExperiences }).eq("id", row.user_id)
      if (updateErr) console.error("[attestation/confirm] experience promotion failed:", updateErr.message)
    }
  }

  try {
    await auditLog.appendEntry({
      userId: row.user_id,
      providerId: "employer_attestation",
      capabilityUsed: "employer_attestation_v1",
      result: "verified",
      details: { company: row.company, role: row.role, expIndex: row.experience_index, attesterName: row.attester_name },
    })
  } catch (auditErr) {
    // Never fail the confirmation over audit-log bookkeeping — the
    // experience entry is already correctly promoted above.
    console.error("[attestation/confirm] audit log append failed:", auditErr.message)
  }

  res.json({ success: true, status: "confirmed" })
})

// ─── Public: attester declines the claim ─────────────────────────────────────
router.post("/attestation/:token/decline", async (req, res) => {
  const { note = "" } = req.body || {}
  const resolved = await resolvePendingAttestation(req.params.token)
  if (resolved.error) return res.status(500).json({ error: resolved.error })
  if (resolved.notFound) return res.status(404).json({ error: "Attestation not found" })
  if (resolved.expired) return res.status(410).json({ error: "This attestation link has expired" })
  if (resolved.alreadyResolved) return res.status(409).json({ error: `This attestation was already ${resolved.row.status}` })

  const row = resolved.row
  const { data: claimed, error: claimErr } = await supabaseAdmin
    .from("employer_attestations")
    .update({ status: "declined", responded_at: new Date().toISOString(), response_note: note })
    .eq("id", row.id).eq("status", "pending")
    .select().single()
  if (claimErr || !claimed)
    return res.status(409).json({ error: "This attestation was already resolved by a concurrent request" })

  try {
    await auditLog.appendEntry({
      userId: row.user_id,
      providerId: "employer_attestation",
      capabilityUsed: "employer_attestation_v1",
      result: "rejected",
      details: { company: row.company, role: row.role, expIndex: row.experience_index, attesterName: row.attester_name, note },
    })
  } catch (auditErr) {
    console.error("[attestation/decline] audit log append failed:", auditErr.message)
  }

  res.json({ success: true, status: "declined" })
})

export default router
