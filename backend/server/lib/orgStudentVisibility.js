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
 */
import { supabaseAdmin } from "./supabase.js"

export const VISIBILITY_COLUMNS = {
  roster:     ["id", "user_id", "name", "role", "department", "batch", "status"],
  elo:        ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating"],
  placements: ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc"],
  full:       ["id", "user_id", "name", "role", "department", "batch", "status", "elo_rating", "placement_company", "placement_ctc", "joined_at"],
}

/**
 * @param {{institution_org_id: string, visibility: string}} link
 * @returns {Promise<{students: object[], error: string|null}>}
 */
export async function fetchLinkStudents(link) {
  const columns = VISIBILITY_COLUMNS[link.visibility] || VISIBILITY_COLUMNS.roster
  const { data: students, error } = await supabaseAdmin
    .from("org_members")
    .select(columns.join(","))
    .eq("org_id", link.institution_org_id)
    .eq("role", "student")
    .in("status", ["active", "placed"])
    .order("elo_rating", { ascending: false })

  if (error) return { students: [], error: error.message }
  return { students: students || [], error: null }
}
