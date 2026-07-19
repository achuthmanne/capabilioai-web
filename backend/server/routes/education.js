/**
 * routes/education.js — Education redesign, Phase 1
 * ---------------------------------------------------------------------------
 * Two endpoints:
 *   GET  /api/education/profile/:userId  — public read (portfolios are
 *                                          public pages, same discipline as
 *                                          routes/proofs.js — no auth)
 *   POST /api/education/profile          — authenticated write of the
 *                                          CALLER's own profile. Never
 *                                          trusts a client-supplied userId —
 *                                          always writes to req.user.id.
 *
 * Called by the resume-upload flow right after /professional/parse-resume
 * returns (frontend wiring is Phase 2 — this endpoint exists and works
 * standalone in the meantime for direct testing/manual entry). Also the
 * landing spot for a future "Add Education manually" form and, later,
 * transcript uploads — those all funnel through the same upsertProfile()
 * source-precedence logic, they just pass a different `source` value.
 */
import { Router } from "express"
import { requireAuth } from "../lib/auth.js"
import * as eduRepo from "../lib/education/repository.js"
import * as proofRepo from "../lib/arena-v2/proofObjects/repository.js"
import { buildAcademicAchievementProofObject } from "../lib/arena-v2/proofObjects/academicBuilder.js"

const router = Router()

const VALID_SOURCES = new Set([
  "resume_import", "transcript", "user_added",
  "institution_verified", "capabilio_verified", "ai_extracted", "recruiter_verified",
])

function toProfileDto(profile) {
  if (!profile) return null
  return {
    institution: profile.institution || "",
    university: profile.university || "",
    degree: profile.degree || "",
    branch: profile.branch || "",
    admissionYear: profile.admission_year || "",
    graduationYear: profile.graduation_year || "",
    cgpa: profile.cgpa,
    relevantCoursework: profile.relevant_coursework || [],
    fieldSources: profile.field_sources || {},
    updatedAt: profile.updated_at,
  }
}

// GET /profile/:userId — public.
router.get("/profile/:userId", async (req, res) => {
  try {
    const profile = await eduRepo.getProfile(req.params.userId)
    res.status(200).json(toProfileDto(profile))
  } catch (err) {
    console.error("[education] GET /profile/:userId", err)
    res.status(500).json({ error: "Internal error" })
  }
})

// POST /profile — authenticated, writes only the caller's own profile.
// Body: { academicIdentity?: {...FIELD_MAP keys}, achievements?: [{title,type,date}], source: string }
router.post("/profile", requireAuth, async (req, res) => {
  try {
    const { academicIdentity, achievements, source } = req.body || {}
    if (!VALID_SOURCES.has(source)) {
      return res.status(400).json({ error: `source must be one of: ${[...VALID_SOURCES].join(", ")}` })
    }

    let profile = await eduRepo.getProfile(req.user.id)
    if (academicIdentity && typeof academicIdentity === "object") {
      profile = await eduRepo.upsertProfile(req.user.id, academicIdentity, source)
    }

    const insertedAchievements = []
    if (Array.isArray(achievements)) {
      for (const a of achievements) {
        if (!a?.title) continue
        const proofObject = buildAcademicAchievementProofObject(req.user.id, a)
        const inserted = await proofRepo.insert(proofObject)
        insertedAchievements.push(inserted)
      }
    }

    res.status(200).json({ profile: toProfileDto(profile), achievementsInserted: insertedAchievements.length })
  } catch (err) {
    console.error("[education] POST /profile", err)
    res.status(500).json({ error: "Internal error" })
  }
})

export default router
