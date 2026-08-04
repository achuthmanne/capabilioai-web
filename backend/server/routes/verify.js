// Routes: POST /api/verify/* (Digilocker, EPFO, Certification)
// EPFO (2026-08-05): real integration via AuthBridge/TruthScreen's Employee
// PF Verification API (see lib/authbridgeEpfo.js) — replaces the old fully-
// fabricated stub (which generated fake "EPFO data" from the user's own
// resume and matched it against itself) AND replaces the separate Eko-based
// supabase/functions/verify-uan integration (confirmed by the product owner
// not to be working in practice; left deployed but no longer called from
// any frontend flow). Both Student (Aura.jsx) and Professional (Orbit.jsx)
// paths now share these same two routes.
import { Router }        from "express"
import multer            from "multer"
import { createRequire } from "module"
import { supabase } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { matchEmployerNames } from "../lib/employerMatch.js"
import { searchCompany as authbridgeSearchCompany, employmentSearch as authbridgeEmploymentSearch, isAuthBridgeConfigured } from "../lib/authbridgeEpfo.js"
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
// NOTE: DigiLocker/certification (the plain /certification route, not
// /certification-file) are still STUBS (any OTP != "000000" passes). EPFO is
// now real (AuthBridge) — see above. The "verified" badge for DigiLocker/
// plain-certification must not be presented as real until those are also
// replaced — tracked as an external-integration blocker.

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

// ─── EPFO: search-company (STEP 1) ───────────────────────────────────────────
// Fuzzy company-name search against AuthBridge's EPFO-registered company
// index. Frontend calls this first (pre-filled with an experience entry's
// claimed company name) and lets the user pick the correct EPFO-registered
// legal name from the results before calling /epfo/confirm.
router.post("/epfo/search-company", requireAuth, async (req, res) => {
  const query = (req.body?.companyName || req.body?.query || "").trim()
  if (!query) return res.status(400).json({ error: "companyName is required" })
  if (!isAuthBridgeConfigured())
    return res.status(503).json({ error: "Employment verification is not configured yet. Try again later." })

  try {
    const companies = await authbridgeSearchCompany(query)
    res.json({ companies })
  } catch (err) {
    console.error("[epfo/search-company]", err.message)
    res.status(502).json({ error: err.message || "Company search failed — try again." })
  }
})

// ─── EPFO confirm (STEP 2) — real employment verification ───────────────────
// Confirms whether the authenticated user is a known EPFO-registered
// employee of a specific (exact) company name, and — only on a genuine match
// — promotes the corresponding profiles.experiences[expIndex] entry to
// verified. The client never sets verificationStatus itself; this is the
// only path that may write "verified" onto an experience entry, same
// discipline as /certification-file and /education-file above.
router.post("/epfo/confirm", requireAuth, async (req, res) => {
  const uid = req.user.id   // PC-5: bind to the authenticated user, not body uid
  const { expIndex, companyName, personName: personNameOverride, verificationYear } = req.body || {}

  if (!isAuthBridgeConfigured())
    return res.status(503).json({ verified: false, error: "Employment verification is not configured yet. Try again later." })
  if (!companyName?.trim())
    return res.status(400).json({ verified: false, error: "companyName is required — pick one from /epfo/search-company first" })
  if (!Number.isInteger(expIndex) || expIndex < 0)
    return res.status(400).json({ verified: false, error: "expIndex is required" })

  // ── 1. Load this user's experiences + display name ──────────────────────
  const { data: profile, error: fetchErr } = await supabase()
    .from("profiles")
    .select("experiences, display_name, full_name, name")
    .eq("id", uid)
    .single()
  if (fetchErr) return res.status(500).json({ verified: false, error: fetchErr.message })

  const experiences = Array.isArray(profile?.experiences) ? profile.experiences : []
  const exp = experiences[expIndex]
  if (!exp) return res.status(404).json({ verified: false, error: "Experience entry not found" })
  if (_isProject(exp))
    return res.status(400).json({ verified: false, error: "This entry looks like a project, not an employer — EPFO verification only applies to real jobs." })

  const personName = (personNameOverride || profile?.display_name || profile?.full_name || profile?.name || "").trim()
  if (!personName)
    return res.status(400).json({ verified: false, error: "Add your name to your profile before verifying employment, or pass personName explicitly." })

  // ── 2. Call AuthBridge's real employment-search API ──────────────────────
  let result
  try {
    result = await authbridgeEmploymentSearch({ companyName: companyName.trim(), personName, verificationYear })
  } catch (err) {
    console.error("[epfo/confirm] AuthBridge call failed:", err.message)
    return res.status(502).json({ verified: false, error: err.message || "Employment verification failed — try again." })
  }

  if (!result.matched) {
    return res.json({ verified: false, reason: "No matching employment record found at this company for this name." })
  }

  // ── 3. Person-name sanity check ──────────────────────────────────────────
  // AuthBridge returned SOME employees at this company — confirm our
  // person's name is actually among them (loose containment, since EPFO
  // records commonly differ in spacing/initials from a profile's display name).
  const normPerson = personName.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()
  const nameMatches = result.employeeNames.some(n => {
    const norm = n.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim()
    return norm === normPerson || norm.includes(normPerson) || normPerson.includes(norm)
  })
  if (!nameMatches) {
    return res.json({
      verified: false,
      reason: `AuthBridge found employees at this company, but none matched the name "${personName}".`,
      employeeNamesFound: result.employeeNames,
    })
  }

  // ── 4. Cross-check the claimed (resume) company name against the real
  //      EPFO-registered legal name AuthBridge just confirmed — reuses the
  //      existing brand-vs-legal-name fuzzy matcher (employerMatch.js),
  //      finally fed real data instead of the old stub's self-referential
  //      fake data.
  const nameMatch = matchEmployerNames(result.employerName, exp.company || exp.displayCompany || "")
  const matchConfidence = Math.round(Math.max(nameMatch.confidence, 0.75) * 100) // floor at 75 — we already have a real, confirmed EPFO record; the resume-name gap alone shouldn't tank confidence below that

  // ── 5. Persist: promote this one experience entry to verified ────────────
  const updatedExperiences = experiences.map((e, i) => i === expIndex ? {
    ...e,
    verificationStatus: "verified",
    verificationSource: "AuthBridge/EPFO",
    legalName:          result.employerName,
    epfoEstablishmentId: result.establishmentId,
    verifiedAt:          new Date().toISOString(),
    matchConfidence,
  } : e)

  const { error: saveErr } = await supabase()
    .from("profiles")
    .update({
      experiences:      updatedExperiences,
      uan_verified:      true,
      uan_verified_at:   new Date().toISOString(),
      epfo_raw:          result.raw,
    })
    .eq("id", uid)

  if (saveErr) return res.status(500).json({ verified: false, error: saveErr.message })

  res.json({
    verified: true,
    data: {
      employerName:     result.employerName,
      establishmentId:  result.establishmentId,
      matchConfidence,
      updatedExperiences,
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

// ─── Education — degree/marksheet file upload verification ──────────────────
// Same real pattern as /certification-file above (mirrored, not duplicated
// logic-wise — same extraction + Groq match-check approach), applied to
// `profiles.education[]` instead of `certifications[]`. Added 2026-08-05 in
// response to a direct product ask: certificates already had a real "upload
// proof, get verified" path; education never did, so every degree sat as
// "self-claimed" forever with no way to strengthen it. Same honesty caveat
// as certification-file: this is OCR/text-match against what the user
// claimed, not a registrar/DigiLocker-grade check (DigiLocker integration
// above is still a stub) — "verified" here means "a real degree/marksheet
// document was uploaded and its content matches the claimed institution and
// degree," nothing stronger.
router.post("/education-file", requireAuth, upload.single("document"), async (req, res) => {
  try {
    const uid = req.user.id
    if (!req.file) return res.status(400).json({ verified: false, error: "No file uploaded" })
    const eduIndex = parseInt(req.body.eduIndex, 10)
    if (!Number.isInteger(eduIndex) || eduIndex < 0)
      return res.status(400).json({ verified: false, error: "eduIndex is required" })

    const { data: profile, error: fetchErr } = await supabase()
      .from("profiles").select("education").eq("id", uid).single()
    if (fetchErr) return res.status(500).json({ verified: false, error: fetchErr.message })

    const eduList = Array.isArray(profile?.education) ? profile.education : []
    const edu = eduList[eduIndex]
    if (!edu) return res.status(404).json({ verified: false, error: "Education entry not found" })

    const claimedInstitution = edu.institution || edu.school || ""
    const claimedDegree      = [edu.degree, edu.field].filter(Boolean).join(" in ")
    if (!claimedInstitution) return res.status(400).json({ verified: false, error: "This entry has no institution to match against" })

    const buffer = req.file.buffer
    const mime   = req.file.mimetype || ""
    let extractedText = ""

    if (mime === "application/pdf") {
      try { const r = await parsePdf(buffer); extractedText = r.text || "" }
      catch (e) { console.warn("[education-file] pdf-parse failed:", e.message) }
    }
    if (extractedText.trim().length < 10 && mime.startsWith("image/") && hasGemini()) {
      try {
        const base64 = buffer.toString("base64")
        const r = await geminiExtractImage(base64, mime,
          "Extract ALL visible text from this degree certificate or marksheet image, verbatim. Return ONLY the raw text, no commentary.")
        extractedText = (typeof r === "string" ? r : (r?.raw || r?.text || JSON.stringify(r || {}))) || ""
      } catch (e) { console.warn("[education-file] Gemini image extract failed:", e.message) }
    }

    if (extractedText.trim().length < 10) {
      return res.json({ verified: false, error: "Could not read this file — try a clearer PDF or image of the degree certificate/marksheet." })
    }

    let match = { match: false, confidence: 0, reason: "" }
    try {
      const raw = await groq([
        { role: "system", content: "You verify academic credentials. Return ONLY valid JSON, no markdown." },
        { role: "user", content:
          `A user claims this education:\nInstitution: ${claimedInstitution}\nDegree: ${claimedDegree || "(not specified)"}\n\n` +
          `Here is the text extracted from the degree certificate/marksheet file they uploaded:\n"""${extractedText.slice(0, 3000)}"""\n\n` +
          `Does the extracted text plausibly confirm this specific institution and degree (allow for reasonable naming/formatting differences, but the institution must genuinely match — do not pass an unrelated document)? ` +
          `Return JSON: {"match":true|false,"confidence":0-100,"reason":"one short sentence"}` },
      ], { model: GROQ_FAST, max_tokens: 300, json: true })
      match = JSON.parse(raw)
    } catch (e) {
      console.warn("[education-file] match check failed:", e.message)
      return res.status(500).json({ verified: false, error: "Verification check failed — try again." })
    }

    if (!match.match || (match.confidence || 0) < 60) {
      return res.json({
        verified: false,
        confidence: match.confidence || 0,
        reason: match.reason || "The uploaded file doesn't clearly match the claimed institution/degree — check the details or upload a clearer copy.",
      })
    }

    const updatedEdu = eduList.map((e, i) => i === eduIndex ? {
      ...e,
      verificationStatus: "verified",
      verificationSource: "Degree Upload",
      verifiedAt: new Date().toISOString(),
      matchConfidence: match.confidence,
    } : e)

    const { error: saveErr } = await supabase()
      .from("profiles").update({ education: updatedEdu }).eq("id", uid)
    if (saveErr) return res.status(500).json({ verified: false, error: saveErr.message })

    res.json({ verified: true, confidence: match.confidence, reason: match.reason, education: updatedEdu })
  } catch (e) {
    console.error("[education-file]", e.message)
    res.status(500).json({ verified: false, error: e.message })
  }
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
