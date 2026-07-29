/**
 * recommendationEngine.js — deterministic "what's next" ranking.
 * Selection is ALWAYS deterministic (spec §5/§18 Principle #5) — an LLM is
 * only ever used elsewhere to phrase a "why" string for an item this file
 * already picked, never to pick it.
 */
import { supabaseAdmin } from "../supabase.js"
import { readDecayedState } from "./memoryEngine.js"
import { scoreRecommendation } from "./graphService.js"

const SNAPSHOTS = "recommendation_snapshots"
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000

export async function buildRecommendations(userId, { targetDomainKey = null, limit = 5 } = {}) {
  const { data: journeys, error: jErr } = await supabaseAdmin
    .from("skill_journeys")
    .select("id, target_role, skill_graph_nodes(id, slug, label, domain_key)")
    .eq("user_id", userId).eq("status", "active")
  if (jErr) throw jErr

  const scored = []
  for (const j of journeys || []) {
    const node = j.skill_graph_nodes
    if (!node) continue
    const memory = await readDecayedState(userId, node.id)
    const { count: outEdgeCount } = await supabaseAdmin
      .from("skill_graph_edges").select("id", { count: "exact", head: true }).eq("from_node_id", node.id)

    const score = scoreRecommendation({
      decayedConfidence: memory.confidence,
      matchesTargetRole: targetDomainKey ? node.domain_key === targetDomainKey : true,
      outEdgeCount: outEdgeCount || 0,
      recentlyArenaValidated: !!(memory.last_reinforced_at && (Date.now() - new Date(memory.last_reinforced_at).getTime()) < 3 * 86400000),
    })

    scored.push({
      journeyId: j.id,
      skillGraphNodeId: node.id,
      skill: node.label,
      slug: node.slug,
      domainKey: node.domain_key,
      score,
      band: memory.band,
      why: memory.band === "low"
        ? `${node.label} confidence has decayed — revisit before it's forgotten.`
        : `Next step toward ${j.target_role || "your target role"}.`,
    })
  }

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, limit)

  await supabaseAdmin.from(SNAPSHOTS).insert({
    user_id: userId,
    recommendations: top,
    expires_at: new Date(Date.now() + SNAPSHOT_TTL_MS).toISOString(),
  })

  return top
}

/** Home surface: use the latest non-expired snapshot if present, otherwise
 *  recompute. Keeps Home fast and resilient to a transient recompute failure
 *  (spec §27 — falls back to last valid snapshot rather than an empty rail). */
export async function getRecommendations(userId, opts = {}) {
  const { data: snapshot, error } = await supabaseAdmin
    .from(SNAPSHOTS).select("*").eq("user_id", userId)
    .order("generated_at", { ascending: false }).limit(1).maybeSingle()
  if (error) throw error

  const isFresh = snapshot && new Date(snapshot.expires_at).getTime() > Date.now()
  if (isFresh) return snapshot.recommendations

  try {
    return await buildRecommendations(userId, opts)
  } catch (e) {
    console.error("[skillStudio/recommendationEngine] recompute failed, falling back:", e.message)
    return snapshot?.recommendations || []
  }
}
