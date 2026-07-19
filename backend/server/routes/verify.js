// Routes: POST /api/verify/* (Digilocker, EPFO, Certification)
// EPFO /confirm now does real employer-name matching against profiles.experiences
import { Router }        from "express"
import multer            from "multer"
import { createRequire } from "module"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { matchEpfoToExperiences, normalizeCompany } from "../lib/employerMatch.js"
import { groq, GROQ_FAST }            from "../lib/groq.js"
import { gemini, geminiExtractImage } from "../lib/gemini.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

let _pdfParse = null
async function parsePdf(buffer) {
  if (!_pdfParse) _pdfParse = createRequire(import.meta.url)("pdf-parse/lib/pdf-parse.js")
  return _pdfParse(buffer)
}
const hasGemini = () => process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_key_here"

// SECURITY (PC-5): every verify route now requires auth and derives the target
// user from the JWT (req.user.id) — never from a client-supplied `uid` in the
// body. Previously these were unauthenticated and trusted body `uid`, so anyone
// could stamp epfo_verified onto any account.
// NOTE: DigiLocker/EPFO/certification are still STUBS (any OTP != "000000"
// passes). The "verified" badge must not be presented as a real, production
// verification until the real integrations replace these stubs — tracked as an
// external-integration blocker.

// ─── Digilocker (stub) ───────────────────────────────────────────────────────
router.post("/digilocker/init", requireAuth, async (req, res) => {
  res.json({ success: true, txnId: `digi_${Date.now()}`, message: `OTP sent to ${req.body.mobile}` })
})

router.post("/digilocker/confirm", requireAuth, async (req, res) => {
  if (req.body.otp === "000000")
    return res.json({ verified: false, error: "Invalid OTP" })
  res.json({
    verified: true,
    data: { institution: "Verified University", degree: "B.Tech", year: "2022", digilockerVerified: true },
  })
})

// ─── EPFO init (stub — OTP trigger) ─────────────────────────────────────────
router.post("/epfo/init", requireAuth, async (req, res) => {
  const { uan } = req.body
  if (!uan || String(uan).length < 10)
    return res.json({ success: false, error: "Invalid UAN (must be 12 digits)" })
  res.json({ success: true, txnId: `epfo_${Date.now()}`, message: "OTP sent to UAN-linked mobile number" })
})

// ─── EPFO confirm — employer matching ────────────────────────────────────────
router.post("/epfo/confirm", requireAuth, async (req, res) => {
  const { otp, uan } = req.body
  const uid = req.user.id   // PC-5: bind to the authenticated user, not body uid

  if (otp === "000000")
    return res.json({ verified: false, error: "Invalid OTP" })

  // ── 1. Fetch this user's experiences from profiles ──────────────────────
  let experiences = []
  if (uid) {
    const { data: profile, error } = await supabase()
      .from("profiles")
      .select("experiences")
      .eq("id", uid)
      .single()

    if (!error && profile?.experiences) {
      experiences = Array.isArray(profile.experiences) ? profile.experiences : []
    }
  }

  // ── 2. Build smart stub EPFO employment history ──────────────────────────
  //    EPFO returns: legal registered names (ALL CAPS, full suffix, no abbrev)
  //    We simulate this from the user's actual experience company names
  //    so the matching can be properly exercised.
  const professionalExps = experiences.filter(e => !_isProject(e))

  const epfoEmployers = professionalExps.length > 0
    ? professionalExps.map(exp => ({
        legal_name:      toLegalName(exp.company || exp.displayCompany || "UNKNOWN COMPANY"),
        estab_code:      `EST${Math.floor(Math.random() * 900000 + 100000)}`,
        date_of_joining: exp.startDate || exp.start_date || null,
        date_of_exit:    (exp.isCurrent || exp.current) ? null : (exp.endDate || exp.end_date || null),
        member_id:       `MEM${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      }))
    : [
        // Generic fallback if no experiences exist yet
        { legal_name: "SAMPLE TECHNOLOGIES PRIVATE LIMITED", estab_code: "EST123456", date_of_joining: "2022-01-01", date_of_exit: null },
      ]

  // ── 3. Run employer matching ────────────────────────────────────────────
  let updatedExperiences = experiences
  let matchLog = []

  try {
    const result = await matchEpfoToExperiences(epfoEmployers, experiences, true)
    updatedExperiences = result.updatedExperiences
    matchLog = result.matchLog
  } catch (err) {
    console.error("[EPFO match error]", err.message)
    // Non-fatal — still mark as EPFO verified at account level, no per-entry changes
  }

  // ── 4. Persist updated experiences to profiles ───────────────────────────
  if (uid && updatedExperiences !== experiences) {
    const { error: saveErr } = await supabase()
      .from("profiles")
      .update({ experiences: updatedExperiences, epfo_verified: true })
      .eq("id", uid)

    if (saveErr) console.error("[EPFO save error]", saveErr.message)
  }

  // ── 5. Build per-experience verification summary for the client ──────────
  const verificationSummary = updatedExperiences.map(exp => ({
    company:            exp.company,
    verificationStatus: exp.verificationStatus || "self-claimed",
    verificationSource: exp.verificationSource || null,
    legalName:          exp.legalName          || null,
    matchConfidence:    exp.matchConfidence     || null,
  }))

  const verifiedCount = verificationSummary.filter(e => e.verificationStatus === "verified").length

  res.json({
    verified: true,
    data: {
      uan,
      epfoVerified:        true,
      verifiedAt:          new Date().toISOString(),
      updatedExperiences,
      verificationSummary,
      verifiedCount,
      totalProfessional:   professionalExps.length,
      epfoEmployers,       // expose for debug / future use
      matchLog,
    },
  })
})

// ─── Certification (stub) ────────────────────────────────────────────────────
router.post("/certification", requireAuth, async (req, res) => {
  if (!req.body.certId?.trim())
    return res.json({ verified: false, error: "Invalid certificate ID" })
  res.json({
    verified: true,
    data: { provider: req.body.provider, certId: req.body.certId, verifiedAt: new Date().toISOString() },
  })
})

// ─── Certification — file upload verification ────────────────────────────────
// Promotes a "self-claimed" certificate (added manually or extracted from a resume)
// to "verified" by checking the actual certificate file the user uploads.
// SECURITY: this is the ONLY path that may set certifications[].verificationStatus
// to "verified" — the client never writes that value directly (see Aura.jsx /
// StudentCertificatesPanel, which only ever writes "self-claimed" or leaves it
// untouched). Written with supabase() (service_role), so it bypasses RLS by
// design — the auth check below (requireAuth + uid from JWT) is what keeps this
// safe, exactly like the EPFO confirm handler above.
//
// HONESTY NOTE: this checks whether the extracted text of the uploaded file
// plausibly names the claimed certificate + issuer (an OCR/text match, done via
// Groq/Gemini). It is NOT a cryptographic or issuer-API verification — there is
// no per-provider integration here. Treat "verified" as "a real certificate file
// was uploaded and its content matches what the user claimed", not as "confirmed
// with AWS/Coursera/etc." Same caveat class as the DigiLocker/EPFO stubs above,
// but this one does real content extraction rather than always-pass.
router.post("/certification-file", requireAuth, upload.single("certificate"), async (req, res) => {
  try {
    const uid = req.user.id
    if (!req.file) return res.status(400).json({ verified: false, error: "No file uploaded" })
    const certIndex = parseInt(req.body.certIndex, 10)
    if (!Number.isInteger(certIndex) || certIndex < 0)
      return res.status(400).json({ verified: false, error: "certIndex is required" })

    // ── 1. Load this user's certifications array ────────────────────────────
    const { data: profile, error: fetchErr } = await supabase()
      .from("profiles").select("certifications").eq("id", uid).single()
    if (fetchErr) return res.status(500).json({ verified: false, error: fetchErr.message })

    const certs = Array.isArray(profile?.certifications) ? profile.certifications : []
    const cert  = certs[certIndex]
    if (!cert) return res.status(404).json({ verified: false, error: "Certificate entry not found" })

    const claimedName   = cert.name  || cert.label    || ""
    const claimedIssuer = cert.issuer || cert.provider || ""
    if (!claimedName) return res.status(400).json({ verified: false, error: "This entry has no certificate name to match against" })

    // ── 2. Extract text from the uploaded file ───────────────────────────────
    const buffer = req.file.buffer
    const mime   = req.file.mimetype || ""
    let extractedText = ""

    if (mime === "application/pdf") {
      try { const r = await parsePdf(buffer); extractedText = r.text || "" }
      catch (e) { console.warn("[certification-file] pdf-parse failed:", e.message) }
    }
    if (extractedText.trim().length < 10 && mime.startsWith("image/") && hasGemini()) {
      try {
        const base64 = buffer.toString("base64")
        const r = await geminiExtractImage(base64, mime,
          "Extract ALL visible text from this certificate image, verbatim. Return ONLY the raw text, no commentary.")
        extractedText = (typeof r === "string" ? r : (r?.raw || r?.text || JSON.stringify(r || {}))) || ""
      } catch (e) { console.warn("[certification-file] Gemini image extract failed:", e.message) }
    }

    if (extractedText.trim().length < 10) {
      return res.json({ verified: false, error: "Could not read this file — try a clearer PDF or image of the certificate." })
    }

    // ── 3. Ask the model whether the extracted text confirms the claim ──────
    let match = { match: false, confidence: 0, reason: "" }
    try {
      const raw = await groq([
        { role: "system", content: "You verify certificates. Return ONLY valid JSON, no markdown." },
        { role: "user", content:
          `A user claims to hold this certificate:\nName: ${claimedName}\nIssuer: ${claimedIssuer || "(not specified)"}\n\n` +
          `Here is the text extracted from the certificate file they uploaded:\n"""${extractedText.slice(0, 3000)}"""\n\n` +
          `Does the extracted text plausibly confirm this specific certificate and issuer (allow for reasonable naming/formatting differences, but the credential and issuer must genuinely match — do not pass a vague or unrelated document)? ` +
          `Return JSON: {"match":true|false,"confidence":0-100,"reason":"one short sentence"}` },
      ], { model: GROQ_FAST, max_tokens: 300, json: true })
      match = JSON.parse(raw)
    } catch (e) {
      console.warn("[certification-file] match check failed:", e.message)
      return res.status(500).json({ verified: false, error: "Verification check failed — try again." })
    }

    if (!match.match || (match.confidence || 0) < 60) {
      return res.json({
        verified: false,
        confidence: match.confidence || 0,
        reason: match.reason || "The uploaded file doesn't clearly match the claimed certificate — check the name/issuer or upload a clearer copy.",
      })
    }

    // ── 4. Promote this entry to verified — server-side write only ──────────
    const updatedCerts = certs.map((c, i) => i === certIndex ? {
      ...c,
      verificationStatus: "verified",
      verificationSource: "Certificate Upload",
      verifiedAt: new Date().toISOString(),
      matchConfidence: match.confidence,
    } : c)

    const { error: saveErr } = await supabase()
      .from("profiles").update({ certifications: updatedCerts }).eq("id", uid)
    if (saveErr) return res.status(500).json({ verified: false, error: saveErr.message })

    res.json({ verified: true, confidence: match.confidence, reason: match.reason, certifications: updatedCerts })
  } catch (e) {
    console.error("[certification-file]", e.message)
    res.status(500).json({ verified: false, error: e.message })
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a brand/short company name to EPFO-style legal name */
function toLegalName(company) {
  const cleaned = company.trim()
  // If it already looks like a legal name (has Pvt/Ltd/Private etc.), uppercase it
  if (/pvt|ltd|private|limited|llp|inc|corp/i.test(cleaned)) {
    return cleaned.toUpperCase()
  }
  // Otherwise append " PRIVATE LIMITED" to simulate EPFO registration
  return `${cleaned.toUpperCase()} PRIVATE LIMITED`
}

/** Mirror of frontend isProjectEntry — keep in sync */
function _isProject(e) {
  const co    = (e.company || "").toLowerCase().trim()
  const title = (e.role || e.title || e.position || "").toLowerCase()

  if (!co || co === "unknown" || co === "self" || co === "personal" || co === "n/a") return true
  if (/university|college|institute|school|iit|nit|iim|iiit|academy|polytechnic|dept\.|department/.test(co)) return true
  if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic/.test(co)) return true
  if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic[\s-]?project|personal[\s-]?project|side[\s-]?project|capstone|thesis|dissertation|final[\s-]?year|hackathon|open[\s-]?source|freelance[\s-]?project/.test(title)) return true

  const hasJobTitle = /engineer|developer|analyst|manager|intern|lead|head|consultant|architect|designer|officer|specialist|director|associate|executive|trainee|apprentice|researcher|scientist/.test(title)
  if (!hasJobTitle && !e.startDate && !e.start_date && !e.endDate && !e.end_date) return true
  return false
}

export default router
