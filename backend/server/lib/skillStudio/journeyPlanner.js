/**
 * journeyPlanner.js — creates/fetches skill_journeys rows.
 * Ensures the catalog node exists (lazy sync, see graphService.js) before
 * creating the per-user journey, so every journey is always graph-backed.
 */
import { supabaseAdmin } from "../supabase.js"
import { slugify, ensureSkillNode, getNodeBySlug } from "./graphService.js"

const JOURNEYS = "skill_journeys"

export async function createOrGetJourney({ userId, skillName, domainKey = null, targetRole = null }) {
  const slug = slugify(skillName)
  let node = await getNodeBySlug(slug, "skill")
  if (!node) node = await ensureSkillNode({ slug, label: skillName, domainKey })

  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from(JOURNEYS)
    .select("*")
    .eq("user_id", userId).eq("skill_graph_node_id", node.id).eq("status", "active")
    .maybeSingle()
  if (fetchErr) throw fetchErr
  if (existing) return { journey: existing, node, created: false }

  const { data: nextRank } = await supabaseAdmin
    .from(JOURNEYS).select("priority_rank").eq("user_id", userId).order("priority_rank", { ascending: false }).limit(1).maybeSingle()

  const { data, error } = await supabaseAdmin
    .from(JOURNEYS)
    .insert({
      user_id: userId,
      skill_graph_node_id: node.id,
      target_role: targetRole,
      status: "active",
      priority_rank: (nextRank?.priority_rank ?? 0) + 1,
    })
    .select().single()
  if (error) throw error
  return { journey: data, node, created: true }
}

// Exported so a test can assert the exact select string still includes the
// node's `id` — see listJourneysForUser's 2026-07-29 bug-fix comment below.
export const JOURNEY_LIST_SELECT = "*, skill_graph_nodes(id, label, slug, domain_key)"

export async function listJourneysForUser(userId, status = "active", deps = { supabaseAdmin }) {
  // BUG FIX (2026-07-29): this embedded select used to omit `id` from the
  // nested skill_graph_nodes(...) relation. The frontend reads that as
  // `node.id` for skillGraphNodeId everywhere a journey is opened (Quiz,
  // Arena gate, module requests) — with `id` missing, every one of those
  // calls sent skillGraphNodeId: undefined. Module generation happened to
  // have a skillName-based fallback that silently masked this, but
  // POST /quiz/start has no such fallback and hard-required both fields,
  // which is what surfaced this as "skillGraphNodeId and skillLabel required".
  const { data, error } = await deps.supabaseAdmin
    .from(JOURNEYS)
    .select(JOURNEY_LIST_SELECT)
    .eq("user_id", userId).eq("status", status)
    .order("priority_rank", { ascending: true })
  if (error) throw error
  return data || []
}

/** True only if this user has NEVER had a skill_journeys row of any status.
 *  Used to gate one-time role-gap seeding (roleGapSeeder.js) — must NOT
 *  re-trigger just because a user archived/completed everything, so this
 *  deliberately ignores status rather than filtering to "active". */
export async function hasAnyJourneyEver(userId, deps = { supabaseAdmin }) {
  const { count, error } = await deps.supabaseAdmin
    .from(JOURNEYS).select("id", { count: "exact", head: true }).eq("user_id", userId)
  if (error) throw error
  return (count || 0) > 0
}

export async function archiveJourney(userId, journeyId) {
  const { data, error } = await supabaseAdmin
    .from(JOURNEYS).update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", journeyId).eq("user_id", userId).select().maybeSingle()
  if (error) throw error
  return data
}

export async function completeJourney(userId, journeyId) {
  const { data, error } = await supabaseAdmin
    .from(JOURNEYS).update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("id", journeyId).eq("user_id", userId).select().maybeSingle()
  if (error) throw error
  return data
}
