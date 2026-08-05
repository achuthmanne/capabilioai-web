/**
 * Partner Bridge — 2026-08-05
 * ---------------------------------------------------------------------------
 * Service-to-service integration for the standalone "capabilio-recruiter"
 * app, which lives in its own separate codebase and its own separate
 * Supabase project (recruiters there have no account or session here).
 *
 * Product decision (see conversation this was built in): rather than merge
 * the two Supabase projects or forge per-user JWTs across systems, this is a
 * narrow, explicit bridge. capabilio-recruiter's OWN backend calls these
 * routes server-to-server, authenticated by a shared secret (not a per-user
 * session) -- the shared secret never reaches any browser on either side.
 *
 * SECURITY:
 * - requirePartnerSecret fails CLOSED: if PARTNER_BRIDGE_SECRET isn't set in
 *   this app's env, every request here 503s rather than silently allowing
 *   unauthenticated access.
 * - GET /candidates reuses the exact same privacy-gated query as
 *   recruiterSearch.js (profiles.recruiter_discoverable = true only, same
 *   field whitelist -- never email/phone/vault/resume data). This is the
 *   same trust boundary as the in-app recruiter search, just reached from a
 *   different caller.
 * - GET /institutions lists only non-sensitive institution display info.
 * - There is intentionally NO write/connect endpoint yet. org_company_links'
 *   existing consent model (college invites a company, the COMPANY accepts
 *   via an emailed token) doesn't have a symmetric "company requests a
 *   college, college accepts" path built in this app's frontend yet -- so a
 *   bridge-initiated connection request would have no UI on the institution
 *   side to action it. That's a real product/UX gap to close in a follow-up,
 *   not something to fake with a write that silently goes nowhere.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

function requirePartnerSecret(req, res, next) {
  const expected = process.env.PARTNER_BRIDGE_SECRET
  if (!expected) {
    return res.status(503).json({ error: "Partner bridge not configured on this deployment." })
  }
  const provided = req.headers["x-partner-secret"]
  if (provided !== expected) {
    return res.status(401).json({ error: "Invalid partner credentials." })
  }
  next()
}

router.use(requirePartnerSecret)

// Identical field whitelist and privacy gate to recruiterSearch.js's
// GET /api/recruiter/search -- this is the same data, reached by a
// different (service-authenticated) caller, not a looser version of it.
const RESULT_FIELDS = [
  "id", "username", "display_name", "avatar_url", "headline",
  "current_role_title", "current_company", "domain", "target_role",
  "path_type", "years_of_experience", "location",
  "role_elo", "professional_elo", "aura_score",
  "uan_verified", "education_verified",
].join(", ")

router.get("/candidates", async (req, res) => {
  try {
    const {
      skill = "", domain = "", minElo, verifiedOnly,
      limit: limitRaw, offset: offsetRaw,
      partnerName = "capabilio-recruiter",
    } = req.query

    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50)
    const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0)

    let matchingUserIds = null
    if (skill.trim()) {
      const { data: skillRows, error: skillErr } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .eq("is_current", true)
        .ilike("skill_name", `%${skill.trim()}%`)
        .limit(500)
      if (skillErr) return res.status(500).json({ error: skillErr.message })
      matchingUserIds = [...new Set((skillRows || []).map((r) => r.user_id))]
      if (matchingUserIds.length === 0) return res.json({ candidates: [], total: 0, limit, offset })
    }

    let query = supabaseAdmin
      .from("profiles")
      .select(RESULT_FIELDS, { count: "exact" })
      .eq("recruiter_discoverable", true)
      .is("org_type", null)

    if (matchingUserIds) query = query.in("id", matchingUserIds)
    if (domain.trim()) query = query.ilike("domain", `%${domain.trim()}%`)
    if (verifiedOnly === "true" || verifiedOnly === "1") {
      query = query.or("uan_verified.eq.true,education_verified.eq.true")
    }
    const minEloNum = parseInt(minElo, 10)
    if (Number.isFinite(minEloNum)) {
      query = query.or(`professional_elo.gte.${minEloNum},role_elo.gte.${minEloNum},aura_score.gte.${minEloNum}`)
    }

    query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1)

    const { data: candidates, count, error } = await query
    if (error) return res.status(500).json({ error: error.message })

    const ids = (candidates || []).map((c) => c.id)
    let skillsByUser = {}
    if (ids.length > 0) {
      const { data: skillRows } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .in("user_id", ids)
        .eq("is_current", true)
        .order("elo_value", { ascending: false })
      for (const row of skillRows || []) {
        if (!skillsByUser[row.user_id]) skillsByUser[row.user_id] = []
        if (skillsByUser[row.user_id].length < 3) skillsByUser[row.user_id].push(row.skill_name)
      }
    }

    console.log(`[partner-bridge] ${partnerName} fetched ${candidates?.length || 0} candidates`)
    const enriched = (candidates || []).map((c) => ({ ...c, topSkills: skillsByUser[c.id] || [] }))
    res.json({ candidates: enriched, total: count ?? enriched.length, limit, offset })
  } catch (err) {
    console.error("[partner-bridge/candidates]", err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get("/institutions", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, org_name, name, updated_at")
      .eq("org_type", "institution")
      .order("org_name", { ascending: true })
      .limit(200)
    if (error) return res.status(500).json({ error: error.message })

    const institutions = (data || []).map((p) => ({
      id: p.id,
      name: p.org_name || p.name || "Unnamed institution",
    }))
    res.json({ institutions })
  } catch (err) {
    console.error("[partner-bridge/institutions]", err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
