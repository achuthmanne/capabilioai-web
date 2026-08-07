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
 * "placements"/"full" tiers (not "roster" — that tier deliberately excludes
 * elo_rating too, so skill/challenge signal that's just as evaluative
 * shouldn't leak in at a tier a college chose specifically to withhold it).
 * This is the actual product differentiator — skill-graph/ELO evidence, not
 * a resume — and previously wasn't wired into the connected-college roster
 * at all, only into the separate candidate-search route
 * (recruiterSearch.js/partnerBridge.js's /candidates). Raw ELO is an
 * already-established recruiter-visible signal in both of those routes;
 * this does not introduce a new exposure, it extends the same one already
 * shipped for elo_rating on this exact roster to two more fields that were
 * always meant to travel with it. Not a "no raw ELO" (PC-7 Portfolio)
 * violation — that rule is scoped to a professional's own public Portfolio
 * page, not private recruiter/college evaluation views (see
 * portfolioNoRawEloAndProCleanup.test.js's own describe() scope).
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
  if (!students?.length || !SKILL_TIERS.has(tier)) return { students: students || [], error: null }

  const userIds = students.map((s) => s.user_id).filter(Boolean)
  if (!userIds.length) return { students, error: null }

  const [{ data: skillRows }, { data: historyRows }] = await Promise.all([
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

  const enriched = students.map((s) => ({
    ...s,
    top_skills: topSkillsByUser[s.user_id] || [],
    challenges_completed: completedByUser[s.user_id] || 0,
  }))
  return { students: enriched, error: null }
}
