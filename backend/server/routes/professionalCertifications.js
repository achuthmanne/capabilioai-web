/**
 * Professional Certifications — claim + verification routes (Skill Rating v2).
 *
 * POST   /api/pro/certifications             — claim a certificate (status: claimed)
 * POST   /api/pro/certifications/:id/upload  — attach a file + run OCR verification
 * GET    /api/pro/certifications             — list own certifications with status
 *
 * TRUST RULE: cert_bonus_elo (professional_elo_state) is written ONLY by
 * recomputeCertBonus(), which reads ONLY rows in this table with
 * verification_status = 'verified'. A user can never set their own row to
 * 'verified' — RLS only allows user-owned UPDATEs while status is 'claimed'
 * (see migration 2026-07-26_professional_elo_v2_trust_gating.sql), and the
 * verify route below runs exclusively through supabaseAdmin (service role).
 */
import { Router } from "express"
import multer from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { verify as verifyCertificateOcr } from "../lib/verification/providers/certificateOcr.js"
import { recomputeCertBonus, CERT_VALUES } from "../lib/professionalElo/verifiedBonuses.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } })

// ── Claim a certification (no ELO effect — status starts 'claimed') ────────
router.post("/pro/certifications", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { cert_name, cert_type, issuer } = req.body
    if (!cert_name || typeof cert_name !== "string" || !cert_name.trim()) {
      return res.status(400).json({ error: "cert_name is required" })
    }
    if (cert_type && !Object.prototype.hasOwnProperty.call(CERT_VALUES, cert_type)) {
      return res.status(400).json({ error: `Unrecognized cert_type. Valid values: ${Object.keys(CERT_VALUES).join(", ")}` })
    }

    const { data, error } = await supabaseAdmin
      .from("professional_certifications")
      .insert({
        user_id: uid,
        cert_name: cert_name.trim(),
        cert_type: cert_type || null,
        issuer: issuer || null,
        source: "manual",
        verification_status: "claimed",
      })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })

    res.json({ success: true, certification: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── List own certifications ─────────────────────────────────────────────────
router.get("/pro/certifications", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("professional_certifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    res.json({ certifications: data || [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Upload proof + run OCR verification (idempotent) ────────────────────────
// Idempotency: if this cert is already 'verified' or 'rejected', re-running
// verification on the same row is a no-op that just returns the existing
// status — this prevents a retried/duplicated upload request from running
// OCR twice or double-firing the bonus recompute.
router.post("/pro/certifications/:id/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const uid = req.user.id
    const { id } = req.params

    const { data: cert, error: fetchErr } = await supabaseAdmin
      .from("professional_certifications")
      .select("*")
      .eq("id", id)
      .eq("user_id", uid)
      .maybeSingle()
    if (fetchErr) return res.status(500).json({ error: fetchErr.message })
    if (!cert) return res.status(404).json({ error: "Certification not found" })

    if (cert.verification_status === "verified" || cert.verification_status === "rejected") {
      // Already resolved — idempotent no-op, return current state rather
      // than re-running OCR or re-triggering the bonus recompute.
      return res.json({ success: true, certification: cert, idempotent: true })
    }

    if (!req.file) return res.status(400).json({ error: "file is required" })

    await supabaseAdmin
      .from("professional_certifications")
      .update({ verification_status: "pending_verification", updated_at: new Date().toISOString() })
      .eq("id", id)

    const result = await verifyCertificateOcr({
      file: { buffer: req.file.buffer, mimetype: req.file.mimetype },
      claim: { name: cert.cert_name, issuer: cert.issuer },
    })

    let nextStatus = "pending_verification"
    let rejectedReason = null
    let bonusValue = null
    if (result.status === "verified") {
      nextStatus = "verified"
      bonusValue = cert.cert_type ? (CERT_VALUES[cert.cert_type] || 0) : 0
    } else if (result.status === "rejected") {
      nextStatus = "rejected"
      rejectedReason = result.details?.reason || "Verification failed"
    } else {
      // OCR/parse error — leave as pending_verification so the user can retry
      // rather than silently rejecting on a transient failure.
      nextStatus = "pending_verification"
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("professional_certifications")
      .update({
        verification_status: nextStatus,
        verification_provider: "certificate_ocr",
        verified_at: nextStatus === "verified" ? new Date().toISOString() : null,
        rejected_reason: rejectedReason,
        bonus_value: bonusValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()
    if (updateErr) return res.status(500).json({ error: updateErr.message })

    if (nextStatus === "verified") {
      try {
        await recomputeCertBonus(supabaseAdmin, uid)
      } catch (bonusErr) {
        console.error("[pro/certifications upload] cert bonus recompute failed", bonusErr.message)
      }
    }

    res.json({ success: true, certification: updated, ocr: { status: result.status, confidence: result.confidence } })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
