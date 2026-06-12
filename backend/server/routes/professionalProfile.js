/**
 * Professional Profile Routes
 * POST /api/pro/profile         — upsert professional profile data
 * GET  /api/pro/profile/:uid    — fetch own or public profile
 * POST /api/pro/photo           — upload profile / cover photo
 * POST /api/pro/epfo/submit     — submit EPFO/UAN verification request
 * GET  /api/pro/epfo/status     — get verification status
 * POST /api/pro/visibility      — update visibility mode
 * POST /api/pro/elo/recompute   — recompute all ELO signals
 */
import { Router } from "express"
import multer      from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

// ── Recompute ELO signals ─────────────────────────────────────────────────────
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
      delete data.epfo_uan; delete data.phone; delete data.subscription_order_id
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
router.post("/pro/epfo/submit", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const { uan, employerList } = req.body
    if (!uan) return res.status(400).json({ error: "UAN is required" })

    // In production: call actual EPFO API / DigiLocker integration
    // For now: create verification record and simulate async processing
    const { data, error } = await supabaseAdmin
      .from("epfo_verifications")
      .insert({
        user_id:         uid,
        uan:             uan,
        submission_data: { uan, employerList: employerList || [] },
        status:          "processing",
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    // Async: attempt to match with career timeline
    setImmediate(async () => {
      try {
        const { data: timeline } = await supabaseAdmin
          .from("career_timeline")
          .select("*")
          .eq("user_id", uid)
          .order("start_date", { ascending: false })

        // Simulate EPFO match (in production: actual EPFO API call)
        const matched = (timeline || []).map(entry => ({
          timeline_id: entry.id,
          company:     entry.company,
          status:      "matched",
          confidence:  0.9,
        }))

        await supabaseAdmin
          .from("epfo_verifications")
          .update({ status: "verified", matched_entries: matched, verified_at: new Date().toISOString() })
          .eq("id", data.id)

        await supabaseAdmin
          .from("profiles")
          .update({
            epfo_verified:      true,
            epfo_uan:           uan,
            epfo_verified_at:   new Date().toISOString(),
            verification_state: "employment_verified",
          })
          .eq("id", uid)

        // Recompute ELO
        const { data: p } = await supabaseAdmin.from("profiles").select("*").eq("id", uid).single()
        if (p) {
          const sig = computeEloSignals(p)
          await supabaseAdmin.from("profiles").update({
            role_elo: sig.roleElo, market_elo: sig.marketElo,
            proof_elo: sig.proofElo, mobility_elo: sig.mobilityElo,
            aura_score: sig.auraScore,
          }).eq("id", uid)
        }
      } catch (err) { console.error("[epfo async]", err.message) }
    })

    res.json({ success: true, verification_id: data.id, status: "processing" })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── EPFO Status ───────────────────────────────────────────────────────────────
router.get("/pro/epfo/status", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("epfo_verifications")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
    if (error) return res.json({ status: "none" })
    res.json(data)
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
