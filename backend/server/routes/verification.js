/**
 * routes/verification.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * GET  /api/verification/providers          — public: what can/can't be
 *                                              verified right now, honestly
 *                                              (capability='unsupported' for
 *                                              anything not real yet)
 * GET  /api/verification/integrity          — public: proves the audit chain
 *                                              hasn't been tampered with.
 *                                              Reveals no PII, just pass/fail
 *                                              + which row broke if any.
 * GET  /api/verification/audit/mine         — authenticated: the caller's
 *                                              own audit trail
 * POST /api/verification/verify             — authenticated: run a
 *                                              verification. Always binds to
 *                                              req.user.id — never a
 *                                              client-supplied userId.
 *
 * This does NOT replace routes/verify.js's DigiLocker/EPFO/certification-file
 * routes yet — those keep working as-is. This is the new framework
 * (certificate_ocr + github providers real; everything else honestly
 * declared unsupported) growing alongside it. Migrating verify.js's
 * certification-file route to call this pipeline instead of duplicating its
 * own OCR logic is a natural follow-up, not done in this slice to avoid
 * touching a working, already-tested route in the same change that
 * introduces the new framework.
 */
import { Router } from "express"
import multer from "multer"
import { requireAuth } from "../lib/auth.js"
import { runVerification, VerificationPipelineError } from "../lib/verification/pipeline.js"
import { listProviders } from "../lib/verification/providers/registry.js"
import { getAuditLog, verifyChainIntegrity } from "../lib/verification/auditLog.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.get("/providers", (req, res) => {
  res.status(200).json({ providers: listProviders() })
})

router.get("/integrity", async (req, res) => {
  try {
    const result = await verifyChainIntegrity()
    res.status(200).json(result)
  } catch (err) {
    console.error("[verification] GET /integrity", err)
    res.status(500).json({ error: "Internal error" })
  }
})

router.get("/audit/mine", requireAuth, async (req, res) => {
  try {
    const entries = await getAuditLog(req.user.id)
    res.status(200).json({ entries })
  } catch (err) {
    console.error("[verification] GET /audit/mine", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /verify — multipart form: file (optional — only certificate_ocr
// needs one), providerId (required), proofObjectId (optional), claim
// (required, JSON-stringified — e.g. {"name":"AWS Certified...","issuer":"AWS"}
// for certificate_ocr, or {"repoUrl":"...", "expectedOwner":"..."} for github).
router.post("/verify", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const { providerId, proofObjectId } = req.body || {}
    if (!providerId) return res.status(400).json({ error: "providerId is required" })

    let claim = {}
    if (req.body?.claim) {
      try { claim = JSON.parse(req.body.claim) }
      catch { return res.status(400).json({ error: "claim must be valid JSON" }) }
    }

    const file = req.file ? { buffer: req.file.buffer, mimetype: req.file.mimetype } : null

    const result = await runVerification({
      userId: req.user.id,
      proofObjectId: proofObjectId || null,
      providerId,
      file,
      claim,
    })

    res.status(200).json(result)
  } catch (err) {
    if (err instanceof VerificationPipelineError) {
      return res.status(400).json({ error: err.message, code: err.code })
    }
    console.error("[verification] POST /verify", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
