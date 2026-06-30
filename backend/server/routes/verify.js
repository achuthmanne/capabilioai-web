// Routes: POST /api/verify/* (Digilocker, EPFO, Certification)
// EPFO /confirm now does real employer-name matching against profiles.experiences
import { Router } from "express"
import { supabase } from "../lib/supabase.js"
import { matchEpfoToExperiences, normalizeCompany } from "../lib/employerMatch.js"

const router = Router()

// ─── Digilocker (stub) ───────────────────────────────────────────────────────
router.post("/digilocker/init", async (req, res) => {
  res.json({ success: true, txnId: `digi_${Date.now()}`, message: `OTP sent to ${req.body.mobile}` })
})

router.post("/digilocker/confirm", async (req, res) => {
  if (req.body.otp === "000000")
    return res.json({ verified: false, error: "Invalid OTP" })
  res.json({
    verified: true,
    data: { institution: "Verified University", degree: "B.Tech", year: "2022", digilockerVerified: true },
  })
})

// ─── EPFO init (stub — OTP trigger) ─────────────────────────────────────────
router.post("/epfo/init", async (req, res) => {
  const { uan } = req.body
  if (!uan || String(uan).length < 10)
    return res.json({ success: false, error: "Invalid UAN (must be 12 digits)" })
  res.json({ success: true, txnId: `epfo_${Date.now()}`, message: "OTP sent to UAN-linked mobile number" })
})

// ─── EPFO confirm — employer matching ────────────────────────────────────────
router.post("/epfo/confirm", async (req, res) => {
  const { otp, uan, uid } = req.body

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
router.post("/certification", async (req, res) => {
  if (!req.body.certId?.trim())
    return res.json({ verified: false, error: "Invalid certificate ID" })
  res.json({
    verified: true,
    data: { provider: req.body.provider, certId: req.body.certId, verifiedAt: new Date().toISOString() },
  })
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
