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

export async function listJourneysForUser(userId, status = "active") {
  const { data, error } = await supabaseAdmin
    .from(JOURNEYS)
    .select("*, skill_graph_nodes(label, slug, domain_key)")
    .eq("user_id", userId).eq("status", status)
    .order("priority_rank", { ascending: true })
  if (error) throw error
  return data || []
}

/** True only if this user has NEVER had a skill_journeys row of any status.
 *  Used to gate one-time role-gap seeding (roleGapSeeder.js) — must NOT
 *  re-trigger just because a user archived/completed everything, so this
 *  deliberately ignores status rather than filtering to "active". */
export async function hasAnyJourneyEver(userId) {
  const { count, error } = await supabaseAdmin
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
