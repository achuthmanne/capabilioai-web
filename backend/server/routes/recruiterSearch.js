/**
 * Recruiter Candidate Search — 2026-08-05
 * ---------------------------------------------------------------------------
 * GET /api/recruiter/search
 *
 * Previously: recruiters could only view a candidate if they already had a
 * direct link to their public Portfolio (from an application, a job posting
 * response, or an outside referral) — there was no discovery mechanism at
 * all. All the verification work this platform does (EPFO, Code DNA,
 * certificates, ELO) had nowhere to surface for a recruiter who doesn't
 * already know who they're looking for.
 *
 * PRIVACY MODEL (explicit product decision, 2026-08-05): opt-in, not
 * opt-out. A profile only appears in results if profiles.recruiter_discoverable
 * = true (default false — see migration recruiter_discoverable_opt_in).
 * This is deliberately a SEPARATE flag from `searchable` (default true,
 * used by pulseNexus.js for general peer/Pulse search) — recruiter
 * visibility is a different trust boundary than peer discovery, and the
 * product owner chose not to reuse the more permissive default for it.
 *
 * Only fields a recruiter legitimately needs to evaluate a candidate are
 * selected — never email, phone, vault files, or raw resume/interview data.
 * Every filter below is applied server-side; nothing here trusts a client
 * to have already filtered anything.
 *
 * UPDATED 2026-08-06 (employment_status_recruiter_visibility migration):
 * recruiter_discoverable alone is no longer sufficient. A profile must ALSO
 * have employment_status IN ('notice_period', 'discoverable') — i.e. NOT
 * 'active_hidden' (the default). Product rule: an actively-employed
 * professional must never be visible to a recruiter, even if they left
 * recruiter_discoverable on from a previous job search. This is a second,
 * independent gate — both conditions are required, not either/or.
 *
 * UPDATED 2026-08-07 — PRODUCT DECISION: raw ELO (role_elo, professional_elo,
 * aura_score) is no longer returned in the response. Explicit instruction:
 * "ELO should be only visible to users not recruiters ... recruiters can see
 * user portfolio and user skills and user performance not ELO because
 * recruiters don't understand about ELO thing." The three ELO columns are
 * still SELECTED server-side (needed to compute the qualitative tier below
 * and to keep the minElo filter working), they are just stripped from every
 * candidate object before it's sent. Response now carries performance_tier
 * (Beginner/Intermediate/Advanced/Expert — same bands as
 * capabilio-recruiter's eloLevel() and orgStudentVisibility.js's
 * performanceTier()) computed from the candidate's strongest of the three
 * scores, plus topSkills (names only, already had no raw numbers).
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"

// Mirrors backend/server/lib/orgStudentVisibility.js's performanceTier() —
// not imported from there because that module is scoped to the org/roster
// domain; duplicating a 5-line pure function is cheaper and safer here than
// creating a cross-domain import for something this small. Keep the bands
// in sync if either changes.
function performanceTier(elo) {
  const e = elo || 0
  if (e >= 1200) return "Expert"
  if (e >= 1000) return "Advanced"
  if (e >= 900)  return "Intermediate"
  return "Beginner"
}

const router = Router()

// Same account model as recruiterComms.js's requireRecruiter() — kept as its
// own local copy per this codebase's existing convention (every route file
// defines its own gate function rather than importing a shared one).
function requireRecruiter() {
  return async (req, res, next) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("org_type").eq("id", req.user.id).maybeSingle()
    if (profile?.org_type !== "company") {
      return res.status(403).json({ error: "Requires a company/recruiter account" })
    }
    next()
  }
}

const RESULT_FIELDS = [
  "id", "username", "display_name", "avatar_url", "headline",
  "current_role_title", "current_company", "domain", "target_role",
  "path_type", "years_of_experience", "location",
  "role_elo", "professional_elo", "aura_score",
  "uan_verified", "education_verified",
  "employment_status", "notice_period_ends_at", // so the UI can label "Notice period" vs "Open to offers" — never surfaces active_hidden rows since the query filters those out entirely
].join(", ")

router.get("/recruiter/search", requireAuth, requireRecruiter(), async (req, res) => {
  try {
    const {
      skill = "", domain = "", minElo, verifiedOnly,
      limit: limitRaw, offset: offsetRaw,
    } = req.query

    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50)
    const offset = Math.max(parseInt(offsetRaw, 10) || 0, 0)

    let matchingUserIds = null // null = no skill filter applied
    let skillsByUser = {}
    if (skill.trim()) {
      const { data: skillRows, error: skillErr } = await supabaseAdmin
        .from("skill_graph")
        .select("user_id, skill_name, elo_value")
        .eq("is_current", true)
        .ilike("skill_name", `%${skill.trim()}%`)
        .limit(500)
      if (skillErr) return res.status(500).json({ error: skillErr.message })
      matchingUserIds = [...new Set((skillRows || []).map(r => r.user_id))]
      if (matchingUserIds.length === 0) return res.json({ candidates: [], total: 0, limit, offset })
    }

    let query = supabaseAdmin
      .from("profiles")
      .select(RESULT_FIELDS, { count: "exact" })
      .eq("recruiter_discoverable", true)
      .neq("employment_status", "active_hidden") // second mandatory gate — see file header
      .is("org_type", null) // exclude company/college/recruiter accounts — candidates only

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

    // Attach top 3 current skills per candidate (best-effort, non-fatal) so
    // a recruiter can see WHY a profile matched, not just that it did.
    const ids = (candidates || []).map(c => c.id)
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

    const enriched = (candidates || []).map(c => {
      const { role_elo, professional_elo, aura_score, ...rest } = c
      const tierScore = Math.max(role_elo || 0, professional_elo || 0, aura_score || 0)
      return { ...rest, performance_tier: performanceTier(tierScore), topSkills: skillsByUser[c.id] || [] }
    })
    res.json({ candidates: enriched, total: count ?? enriched.length, limit, offset })
  } catch (err) {
    console.error("[recruiter/search]", err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
