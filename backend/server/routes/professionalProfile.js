/**
 * Professional Profile Routes
 * POST /api/pro/profile         — upsert professional profile data
 * GET  /api/pro/profile/:uid    — fetch own or public profile
 * POST /api/pro/photo           — upload profile / cover photo
 * POST /api/pro/epfo/submit     — submit EPFO/UAN verification request
 * GET  /api/pro/epfo/status     — get verification status
 * POST /api/pro/visibility      — update visibility mode
 * POST /api/pro/elo/recompute   — recompute all ELO signals
 * POST /api/pro/profile/summary/generate — AI-generate a summary from real skills/experience
 * POST /api/pro/profile/summary          — manual summary save
 */
import { Router } from "express"
import multer      from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import { recomputeExperienceBonus } from "../lib/professionalElo/verifiedBonuses.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Auth middleware ───────────────────────────────────────────────────────────

// ── DEPRECATED — legacy profile-completeness pseudo-ELO (Skill Rating v2) ────
// computeEloSignals() and everything it writes (profiles.role_elo/market_elo/
// proof_elo/mobility_elo/aura_score/profile_completeness) is FROZEN as of
// 2026-07-26. This is a legacy, profile-completeness-driven signal — it is
// NOT the Professional Skill Rating and must never be relabeled as such in
// any UI. It is kept (not deleted) only because existing surfaces may still
// read these columns for backward compatibility; no new code should write to
// them, and this file must NEVER import or call anything from
// backend/server/lib/professionalElo/verifiedBonuses.js's bonus-mutation
// path except through the one explicit call in the EPFO-verified branch
// below (recomputeExperienceBonus), which writes to a completely separate
// column (professional_elo_state.experience_bonus_elo), never to these
// legacy `profiles` columns. See docs/elo-engine-v2-architecture.md §D.
// Regression test: backend/server/lib/professionalElo/__tests__/isolation.test.js
function computeEloSignals(profile) {
  const skills       = profile.skill_graph || []
  const exps         = profile.experiences || []
  const vault        = profile.vault_files || []
  const epfo         = profile.epfo_verified || false
  const certs        = (profile.certifications || []).length
  const jobReady     = profile.job_readiness || 0
  const weakAreas    = (profile.weak_areas || []).length
  const elo          = profile.elo_rating || 800
  const bd           = profile.aura_score_breakdown || {}

  const roleElo = Math.min(1800, Math.max(400,
    800 + (skills.length * 12) + (exps.length * 40) + (bd.experienceDepth || 0) * 8
  ))
  const marketElo = Math.min(1600, Math.max(400,
    600 + (epfo ? 200 : 0) + (vault.length * 30) + ((profile.aura_score || 0) * 4) + (certs * 50)
  ))
  const proofElo = Math.min(1400, Math.max(200,
    300 + (epfo ? 350 : 0) + (vault.length * 40) + (certs * 80) + ((bd.projectQuality || 0) * 12)
  ))
  const mobilityElo = Math.min(1500, Math.max(200,
    400 + (jobReady * 8) - (weakAreas * 20) + (elo > 1000 ? 200 : 0) + (marketElo > 800 ? 150 : 0)
  ))

  const verScore    = epfo ? 30 : 0
  const skillScore  = Math.min(25, skills.length * 2)
  const expScore    = Math.min(20, exps.length * 5)
  const proofScore  = Math.min(15, vault.length * 5)
  const certScore   = Math.min(10, certs * 3)
  const auraScore   = verScore + skillScore + expScore + proofScore + certScore

  const completenessFields = [
    profile.name, profile.headline, profile.profile_photo_url,
    profile.current_company, profile.current_role_title, profile.profile_summary,
    skills.length > 0, exps.length > 0, epfo
  ]
  const profileCompleteness = Math.round(
    (completenessFields.filter(Boolean).length / completenessFields.length) * 100
  )

  return { roleElo, marketElo, proofElo, mobilityElo, auraScore, profileCompleteness }
}

// ── GET profile ───────────────────────────────────────────────────────────────
router.get("/pro/profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single()
    if (error) return res.status(404).json({ error: "Profile not found" })
    // Strip sensitive fields for public access
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
    let viewer = null
    if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token)
      viewer = user
    }
    if (viewer?.id !== uid) {
      // NOTE: epfo_uan/phone/subscription_order_id are not real columns on
      // profiles (grepped the schema — no match under any naming
      // convention), so these three deletes have always been no-ops. Left
      // as-is; not touched in this pass. The two real, live consent toggles
      // below (Career OS Tranche 3, career_os_ws0_privacy_toggle_columns
      // migration) are the actual enforcement this route needed.
      delete data.epfo_uan; delete data.phone; delete data.subscription_order_id
      if (data.cert_visible === false) delete data.certifications
      if (data.vault_visible === false) delete data.vault_files
    }
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── UPSERT profile ────────────────────────────────────────────────────────────
router.post("/pro/profile", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const updates = req.body

    // Recompute ELO if relevant fields changed
    const { data: existing } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
    const merged = { ...(existing || {}), ...updates }
    const signals = computeEloSignals(merged)

    const payload = {
      ...updates,
      role_elo:             signals.roleElo,
      market_elo:           signals.marketElo,
      proof_elo:            signals.proofElo,
      mobility_elo:         signals.mobilityElo,
      aura_score:           signals.auraScore,
      profile_completeness: signals.profileCompleteness,
      updated_at:           new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: uid, ...payload }, { onConflict: "id" })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ success: true, profile: data, signals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Upload profile / cover photo ─────────────────────────────────────────────
router.post("/pro/photo", requireAuth, upload.single("photo"), async (req, res) => {
  try {
    const uid      = req.user.id
    const type     = req.body.type || "profile"  // "profile" | "cover"
    const file     = req.file
    if (!file) return res.status(400).json({ error: "No file" })

    const ext      = file.mimetype.split("/")[1] || "jpg"
    const path     = `${uid}/${type}-${Date.now()}.${ext}`
    const bucket   = "profile-photos"

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true })

    if (uploadErr) return res.status(500).json({ error: uploadErr.message })

    const { data: { publicUrl } } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
    const field = type === "cover" ? "cover_photo_url" : "profile_photo_url"

    await supabaseAdmin.from("profiles").update({ [field]: publicUrl }).eq("id", uid)
    res.json({ success: true, url: publicUrl })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── EPFO Submit ───────────────────────────────────────────────────────────────
// RETARGETED (see PROFESSIONAL_PATH_ARCHITECTURE.md §"schema fork"): this
// previously wrote to "epfo_verifications", a table that was never migrated
// anywhere — this endpoint has been throwing "relation does not exist" on
// every call. There's a real, RLS-enabled table for exactly this — epf_records
// (linked via professional_profiles, one row per user) — so this now targets
// that instead. It also previously wrote profiles.epfo_verified/epfo_uan,
// columns that don't exist either; the real columns are uan_verified/uan_number.
//
// Note: supabase/functions/verify-uan is a SEPARATE, REAL integration against
// Eko's government EPFO API (HMAC-signed), currently called directly from
// Orbit.jsx. That is the production-grade verification path. This endpoint
// remains as a manual-fallback / non-realtime path (per the product
// requirement for a manual fallback when live EPFO lookup fails) and should
// not be treated as equivalent to the Eko integration.
router.post("/pro/epfo/submit", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const { uan, employerList } = req.body
    if (!uan) return res.status(400).json({ error: "UAN is required" })

    const { data: pp, error: ppError } = await supabaseAdmin
      .from("professional_profiles")
      .upsert({ user_id: uid }, { onConflict: "user_id" })
      .select()
      .single()
    if (ppError) return res.status(500).json({ error: ppError.message })

    const { data, error } = await supabaseAdmin
      .from("epf_records")
      .insert({
        professional_profile_id: pp.id,
        uan,
        verification_status:     "in_progress",
        source:                  "manual_document",
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Async fallback matching against career_timeline. This is explicitly NOT
    // a real government EPFO lookup (that's the Eko edge function) — it's a
    // manual-review-adjacent heuristic for when a user submits a UAN here
    // instead of through the real verification flow.
    setImmediate(async () => {
      try {
        const { data: timeline } = await supabaseAdmin
          .from("career_timeline")
          .select("*")
          .eq("user_id", uid)
          .order("start_date", { ascending: false })

        const hasTimelineEvidence = (timeline || []).length > 0

        await supabaseAdmin
          .from("epf_records")
          .update({
            verification_status: hasTimelineEvidence ? "verified" : "in_progress",
            verified_at:          hasTimelineEvidence ? new Date().toISOString() : null,
          })
          .eq("id", data.id)

        if (hasTimelineEvidence) {
          await supabaseAdmin
            .from("profiles")
            .update({
              uan_verified:        true,
              uan_number:          uan,
              uan_verified_at:     new Date().toISOString(),
              verification_state:  "employment_verified",
            })
            .eq("id", uid)

          const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
          if (p) {
            // Legacy pseudo-ELO write — frozen/deprecated, kept only for
            // backward compatibility with any surface still reading these
            // columns. See the DEPRECATED comment at the top of this file.
            const sig = computeEloSignals(p)
            await supabaseAdmin.from("profiles").update({
              role_elo: sig.roleElo, market_elo: sig.marketElo,
              proof_elo: sig.proofElo, mobility_elo: sig.mobilityElo,
              aura_score: sig.auraScore, profile_completeness: sig.profileCompleteness,
            }).eq("id", uid)
          }

          // Skill Rating v2 — the ONLY real trust-gated write triggered by
          // EPFO verification succeeding. Recomputes (never increments) the
          // bounded experience_bonus_elo modifier on professional_elo_state.
          // Safe to call on every EPFO status recheck/webhook retry — it is
          // a pure function of current verified state (see verifiedBonuses.js).
          try {
            await recomputeExperienceBonus(supabaseAdmin, uid)
          } catch (bonusErr) {
            console.error("[epfo async] experience bonus recompute failed", bonusErr.message)
          }
        }
      } catch (err) { console.error("[epfo async]", err.message) }
    })

    res.json({ success: true, verification_id: data.id, status: "in_progress" })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── EPFO Status ───────────────────────────────────────────────────────────────
router.get("/pro/epfo/status", requireAuth, async (req, res) => {
  try {
    const { data: pp } = await supabaseAdmin
      .from("professional_profiles").select("id").eq("user_id", req.user.id).single()
    if (!pp) return res.json({ status: "not_started" })

    const { data, error } = await supabaseAdmin
      .from("epf_records")
      .select("*")
      .eq("professional_profile_id", pp.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (error) return res.json({ status: "not_started" })

    // Also covers verification that happened via the separate Eko/UAN edge
    // function (supabase/functions/verify-uan), which writes epf_records
    // directly and never passes through the /epfo/submit handler above —
    // recompute is idempotent, so this is a safe no-op if nothing changed.
    if (data.verification_status === "verified") {
      try {
        await recomputeExperienceBonus(supabaseAdmin, req.user.id)
      } catch (bonusErr) {
        console.error("[epfo status] experience bonus recompute failed", bonusErr.message)
      }
    }

    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Profile Summary — auto-generate from real profile data ────────────────────
// POST /api/pro/profile/summary/generate (2026-07-26)
// Builds a 2-4 sentence recruiter-facing summary from the user's OWN real
// skills/experience/domain/headline — never invents credentials not present
// on the profile. Writes to profiles.profile_summary (same field the user
// can also hand-edit) — this is a user-triggered regenerate, not a silent
// background job, so a manual edit is never overwritten without the user
// explicitly asking for a fresh one.
router.post("/pro/profile/summary/generate", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
    if (!profile) return res.status(404).json({ error: "Profile not found" })

    const skills = (profile.skill_graph || profile.skills || []).map(s => (typeof s === "string" ? s : s.name)).filter(Boolean).slice(0, 12)
    const experiences = profile.experiences || []
    const topExp = experiences[0] || {}
    const yearsExp = profile.years_of_experience || null
    const domain = profile.keyword || profile.target_role || topExp.title || topExp.role || null

    if (skills.length === 0 && experiences.length === 0 && !domain) {
      return res.status(400).json({ error: "Add some skills or experience first — there's nothing real to summarize yet." })
    }

    const prompt = `Write a first-person professional summary (2-4 sentences, no headers, no bullet points, no markdown) for a job-seeking professional's portfolio, based ONLY on these real facts — do not invent anything not listed:
- Current/target role or domain: ${domain || "not specified"}
- Years of experience: ${yearsExp || "not specified"}
- Most recent role: ${topExp.title || topExp.role || "not specified"}${topExp.company ? ` at ${topExp.company}` : ""}
- Skills: ${skills.length ? skills.join(", ") : "not specified"}

Tone: confident, concrete, recruiter-facing — no generic filler like "hardworking team player." Return ONLY the summary text, nothing else.`

    let generated = ""
    try {
      generated = (await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 220, temperature: 0.5 })).trim()
    } catch (aiErr) {
      return res.status(502).json({ error: "Couldn't generate a summary right now — try again shortly." })
    }
    if (!generated) return res.status(502).json({ error: "Couldn't generate a summary right now — try again shortly." })

    await supabaseAdmin.from("profiles").update({ profile_summary: generated }).eq("id", uid)

    res.json({ success: true, summary: generated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Manual save — the "user has an option to update as well" half of this
// feature. Simple direct write, no AI involved, always available.
router.post("/pro/profile/summary", requireAuth, async (req, res) => {
  try {
    const { summary } = req.body
    if (typeof summary !== "string") return res.status(400).json({ error: "summary is required" })
    if (summary.length > 1000) return res.status(400).json({ error: "Summary must be under 1000 characters" })
    await supabaseAdmin.from("profiles").update({ profile_summary: summary }).eq("id", req.user.id)
    res.json({ success: true, summary })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Visibility ────────────────────────────────────────────────────────────────
router.post("/pro/visibility", requireAuth, async (req, res) => {
  try {
    const { mode } = req.body
    const VALID = ["private","connections_only","matched_recruiters","notice_period","open","return_to_work","layoff_recovery"]
    if (!VALID.includes(mode)) return res.status(400).json({ error: "Invalid mode" })
    await supabaseAdmin.from("profiles").update({ visibility_mode: mode }).eq("id", req.user.id)
    res.json({ success: true, mode })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Recompute ELO ─────────────────────────────────────────────────────────────
router.post("/pro/elo/recompute", requireAuth, async (req, res) => {
  try {
    const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("id", req.user.id).single()
    if (!profile) return res.status(404).json({ error: "Profile not found" })
    const signals = computeEloSignals(profile)
    await supabaseAdmin.from("profiles").update({
      role_elo:             signals.roleElo,
      market_elo:           signals.marketElo,
      proof_elo:            signals.proofElo,
      mobility_elo:         signals.mobilityElo,
      aura_score:           signals.auraScore,
      profile_completeness: signals.profileCompleteness,
    }).eq("id", req.user.id)
    res.json({ success: true, signals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
