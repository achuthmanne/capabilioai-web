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
 * 2026-08-07 (later same day) — PRODUCT DECISION, supersedes the note this
 * replaces: raw ELO must never be returned to a recruiter/company consumer
 * of this function. Explicit instruction: "ELO should be only visible to
 * users not recruiters ... recruiters can see user portfolio and user
 * skills and user performance not ELO because recruiters don't understand
 * about ELO thing." orgCompanyLinks.js's route that calls this function is
 * itself the institution's *preview of what the connected company/recruiter
 * sees* — so this shared function is correctly scoped as "the
 * recruiter-visible view" for both callers, and raw elo_rating /
 * skill_graph.elo_value are now stripped from every returned row regardless
 * of tier. In their place: performance_tier (a qualitative label — Beginner/
 * Intermediate/Advanced/Expert, same bands as capabilio-recruiter's existing
 * eloLevel() helper in CandidateProfile.jsx, so the two systems agree) and
 * top_skills now carries skill_name only (no elo_value). Also added
 * ai_interview_completed (from interview_sessions.completed_at) as a
 * portfolio signal, per: "recruiter has to see the user portfolio where
 * user generate their portfolios through tasks/ AI Interviews/ and other
 * things." elo_rating is still SELECTED from org_members internally (it's
 * needed to compute the tier and to preserve the existing sort-by-strongest
 * ordering) — it is simply never included in the object returned to callers.
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

  // elo_rating was only selected (if at all) to support the sort above and
  // the tier computation below — strip the raw number before it ever leaves
  // this function. See file header: recruiters/companies never see it.
  const stripRawElo = (row) => {
    if (!("elo_rating" in row)) return row
    const { elo_rating, ...rest } = row
    return { ...rest, performance_tier: performanceTier(elo_rating) }
  }

  if (!students?.length || !SKILL_TIERS.has(tier)) {
    return { students: (students || []).map(stripRawElo), error: null }
  }

  const userIds = students.map((s) => s.user_id).filter(Boolean)
  if (!userIds.length) return { students: students.map(stripRawElo), error: null }

  const [{ data: skillRows }, { data: historyRows }, { data: interviewRows }] = await Promise.all([
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
  ])

  // No elo_value in the returned skill objects — skill NAME is the evidence
  // ("user skills"), the numeric rating behind it is not.
  const topSkillsByUser = {}
  for (const row of skillRows || []) {
    if (!topSkillsByUser[row.user_id]) topSkillsByUser[row.user_id] = []
    if (topSkillsByUser[row.user_id].length < 3) {
      topSkillsByUser[row.user_id].push({ skill_name: row.skill_name })
    }
  }
  const completedByUser = {}
  for (const row of historyRows || []) {
    completedByUser[row.user_id] = (completedByUser[row.user_id] || 0) + 1
  }
  const interviewedUsers = new Set((interviewRows || []).map((r) => r.user_id))

  const enriched = students.map((s) => ({
    ...stripRawElo(s),
    top_skills: topSkillsByUser[s.user_id] || [],
    challenges_completed: completedByUser[s.user_id] || 0,
    ai_interview_completed: interviewedUsers.has(s.user_id),
  }))
  return { students: enriched, error: null }
}
