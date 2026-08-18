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
import { supabaseAdmin } from "../lib/supabase.js"
import * as proofRepo from "../lib/proofObjects/repository.js"

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

// Vault doc_type → proof_objects.proof_type (DB CHECK only allows: challenge,
// certification, academic_project, achievement, transcript_record,
// coursework — a vault upload is never a "challenge", so this maps the
// closest honest fit; anything without a clean match falls back to
// "achievement", the most generic "evidence something real happened" type.
const VAULT_DOC_TYPE_TO_PROOF_TYPE = {
  certification: "certification",
  experience_letter: "achievement",
  offer_letter: "achievement",
  resume: "achievement",
  payslip: "achievement",
  contract: "achievement",
  invoice: "achievement",
  other: "achievement",
}

// Trust & Verification Center, Phase 2 Step 2 (2026-08-02) — resolves the
// proof_object a vault document should be verified against: reuse the one
// already linked (vault_documents.proof_object_id), or create+link one on
// first verification attempt. Ownership is checked against req.user.id, the
// same "never trust a client-supplied id, always re-derive from auth"
// pattern used throughout college.js's student-only routes.
async function resolveProofObjectForDocument(userId, documentId) {
  const { data: doc, error } = await supabaseAdmin
    .from("vault_documents")
    .select("id, user_id, doc_type, file_name, proof_object_id")
    .eq("id", documentId)
    .single()
  if (error || !doc) throw new VerificationPipelineError("Document not found", "DOCUMENT_NOT_FOUND")
  if (doc.user_id !== userId) throw new VerificationPipelineError("This document does not belong to you", "FORBIDDEN")

  if (doc.proof_object_id) return doc.proof_object_id

  const proofObject = await proofRepo.insert({
    userId,
    source: "manual",
    sourceRef: { vault_document_id: doc.id },
    domain: "Documents",
    proofType: VAULT_DOC_TYPE_TO_PROOF_TYPE[doc.doc_type] || "achievement",
    title: doc.file_name,
    trustLevel: "self-claimed",
  })

  await supabaseAdmin.from("vault_documents").update({ proof_object_id: proofObject.id }).eq("id", doc.id)
  return proofObject.id
}

// POST /verify — multipart form: file (optional — only certificate_ocr
// needs one), providerId (required), proofObjectId (optional), documentId
// (optional — a vault_documents id; when given, the result is persisted onto
// that document via its proof_object, not just returned as a one-off), claim
// (required, JSON-stringified — e.g. {"name":"AWS Certified...","issuer":"AWS"}
// for certificate_ocr, or {"repoUrl":"...", "expectedOwner":"..."} for github).
router.post("/verify", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const { providerId, documentId } = req.body || {}
    let { proofObjectId } = req.body || {}
    if (!providerId) return res.status(400).json({ error: "providerId is required" })

    if (!proofObjectId && documentId) {
      proofObjectId = await resolveProofObjectForDocument(req.user.id, documentId)
    }

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

    res.status(200).json({ ...result, proofObjectId: proofObjectId || null })
  } catch (err) {
    if (err instanceof VerificationPipelineError) {
      return res.status(400).json({ error: err.message, code: err.code })
    }
    console.error("[verification] POST /verify", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
