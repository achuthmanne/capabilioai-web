/**
 * Shared tier-scoped student roster query — extracted 2026-08-06 so both
 * orgCompanyLinks.js's company-side route AND partnerBridge.js's new
 * recruiter-side route use the exact same column tiers and query, instead
 * of two copies that could silently drift apart.
 *
 * PII is never exposed at any visibility tier — "full" means fuller
 * PERFORMANCE data, not contact info. email/phone are never selected here.
 * user_id (profiles.id) IS included at every tier — it's not PII, and it's
 * the identifier a connected company/recruiter needs to actually act on a
 * record (e.g. request contact access to a specific student). Before
 * 2026-08-06 this column set omitted user_id entirely, which meant nothing
 * downstream of this query could reference the real student — only display
 * a name.
 *
 * 2026-08-07: added top_skills/challenges_completed to the "elo"/
 * "placements"/"full" tiers (not "roster").
 *
 * 2026-08-07 (same day, PRODUCT DECISION #1): raw ELO briefly stripped from
 * every response here, replaced with a performance_tier label only.
 *
 * 2026-08-07 (same day, PRODUCT DECISION #2 — supersedes #1): reversed.
 * Explicit instruction: "i want recruiters to see the student ELO and
 * student choosen career, so then recruiters can see what student is
 * proven" — confirmed as a full reversal across every recruiter-facing
 * surface, not just this roster. Raw elo_rating and skill_graph.elo_value
 * are back in every returned row. performance_tier is kept alongside the
 * raw number (additive, not a replacement) since it's a cheap derived label
 * some UI already renders. Also added `career` — the student's chosen
 * career track name (profiles.career_track_slug -> career_tracks.name,
 * the same source CareerPicker.jsx writes and useCareerTrack.js reads) —
 * this is genuinely new, it was never on this roster before either
 * decision, and is what "student choosen career" refers to.
 */
import { supabaseAdmin } from "./supabase.js"

export const VISIBILITY_COLUMNS = {
  roster:     ["id", "user_id", "name", "role", "department", "batch", "status"],
  elo:        ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating"],
  placements: ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc"],
  full:       ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc", "joined_at"],
}

const SKILL_TIERS = new Set(["elo", "placements", "full"])

/**
 * Qualitative performance tier from a raw ELO number — never expose the
 * number itself to recruiter-facing consumers. Bands match
 * capabilio-recruiter/src/pages/recruiter/CandidateProfile.jsx's existing
 * eloLevel() helper exactly, so a candidate's labeled tier is consistent
 * across both apps.
 */
export function performanceTier(elo) {
  const e = elo || 0
  if (e >= 1200) return "Expert"
  if (e >= 1000) return "Advanced"
  if (e >= 900)  return "Intermediate"
  return "Beginner"
}

/**
 * @param {{institution_org_id: string, visibility: string}} link
 * @returns {Promise<{students: object[], error: string|null}>}
 */
export async function fetchLinkStudents(link) {
  const tier = VISIBILITY_COLUMNS[link.visibility] ? link.visibility : "roster"
  const columns = VISIBILITY_COLUMNS[tier]
  const { data: students, error } = await supabaseAdmin
    .from("org_members")
    .select(columns.join(","))
    .eq("org_id", link.institution_org_id)
    .eq("role", "student")
    .in("status", ["active", "placed"])
    .order("elo_rating", { ascending: false })

  if (error) return { students: [], error: error.message }

  const withTier = (row) =>
    "elo_rating" in row ? { ...row, performance_tier: performanceTier(row.elo_rating) } : row

  if (!students?.length || !SKILL_TIERS.has(tier)) {
    return { students: (students || []).map(withTier), error: null }
  }

  const userIds = students.map((s) => s.user_id).filter(Boolean)
  if (!userIds.length) return { students: students.map(withTier), error: null }

  const [{ data: skillRows }, { data: historyRows }, { data: interviewRows }, { data: careerRows }] = await Promise.all([
    supabaseAdmin
      .from("skill_graph")
      .select("user_id, skill_name, elo_value")
      .in("user_id", userIds)
      .eq("is_current", true)
      .order("elo_value", { ascending: false }),
    supabaseAdmin
      .from("arena_history")
      .select("user_id")
      .in("user_id", userIds)
      .not("completed_at", "is", null),
    supabaseAdmin
      .from("interview_sessions")
      .select("user_id")
      .in("user_id", userIds)
      .not("completed_at", "is", null),
    supabaseAdmin
      .from("profiles")
      .select("id, career_track_slug, domain, target_role")
      .in("id", userIds),
  ])

  const topSkillsByUser = {}
  for (const row of skillRows || []) {
    if (!topSkillsByUser[row.user_id]) topSkillsByUser[row.user_id] = []
    if (topSkillsByUser[row.user_id].length < 3) {
      topSkillsByUser[row.user_id].push({ skill_name: row.skill_name, elo_value: row.elo_value })
    }
  }
  const completedByUser = {}
  for (const row of historyRows || []) {
    completedByUser[row.user_id] = (completedByUser[row.user_id] || 0) + 1
  }
  const interviewedUsers = new Set((interviewRows || []).map((r) => r.user_id))

  const careerSlugs = [...new Set((careerRows || []).map((r) => r.career_track_slug).filter(Boolean))]
  const trackNameBySlug = {}
  if (careerSlugs.length) {
    const { data: tracks } = await supabaseAdmin
      .from("career_tracks").select("slug, name").in("slug", careerSlugs)
    for (const t of tracks || []) trackNameBySlug[t.slug] = t.name
  }
  const careerByUser = {}
  for (const row of careerRows || []) {
    careerByUser[row.id] = (row.career_track_slug && trackNameBySlug[row.career_track_slug])
      || row.target_role || row.domain || null
  }

  const enriched = students.map((s) => ({
    ...withTier(s),
    top_skills: topSkillsByUser[s.user_id] || [],
    challenges_completed: completedByUser[s.user_id] || 0,
    ai_interview_completed: interviewedUsers.has(s.user_id),
    career: careerByUser[s.user_id] || null,
  }))
  return { students: enriched, error: null }
}
