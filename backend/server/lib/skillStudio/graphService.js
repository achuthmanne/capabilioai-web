/**
 * graphService.js — Skill Studio V2 knowledge graph
 * ---------------------------------------------------------------------------
 * Catalog layer only (skill_graph_nodes / skill_graph_edges — shared across
 * users, NOT per-user). Per-user mastery still lives on `user_skills`
 * (unchanged, per docs/skill-studio-v2-production-spec-2026-07-29.md §0/§4 —
 * this is NOT a second skill taxonomy, it's the missing catalog `user_skills`
 * always should have pointed at).
 *
 * slugify() is copied verbatim from skillGraph.js's makeSlug() so a skill
 * named e.g. "React Hooks" always resolves to the SAME slug whether it's
 * being read from user_skills or written to skill_graph_nodes — no drift
 * between the two tables' identity of "what is this skill called".
 */
import { supabaseAdmin } from "../supabase.js"

const NODES = "skill_graph_nodes"
const EDGES = "skill_graph_edges"

export function slugify(name = "") {
  return String(name).toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

/** Idempotent upsert of a catalog skill node. Safe to call on every journey
 *  creation — this is the "lazy catalog sync" the spec calls for instead of
 *  a heavyweight batch backfill job. */
export async function ensureSkillNode({ slug, label, domainKey = null, metadata = {} }) {
  if (!slug) throw new Error("ensureSkillNode: slug is required")
  const { data, error } = await supabaseAdmin
    .from(NODES)
    .upsert(
      { node_type: "skill", slug, label: label || slug, domain_key: domainKey, metadata },
      { onConflict: "node_type,slug", ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ensureConceptNode({ slug, label, domainKey = null, metadata = {} }) {
  if (!slug) throw new Error("ensureConceptNode: slug is required")
  const { data, error } = await supabaseAdmin
    .from(NODES)
    .upsert(
      { node_type: "concept", slug, label: label || slug, domain_key: domainKey, metadata },
      { onConflict: "node_type,slug", ignoreDuplicates: false }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getNodeBySlug(slug, nodeType = "skill") {
  const { data, error } = await supabaseAdmin
    .from(NODES).select("*").eq("node_type", nodeType).eq("slug", slug).maybeSingle()
  if (error) throw error
  return data
}

export async function getNodeById(id) {
  const { data, error } = await supabaseAdmin.from(NODES).select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data
}

export async function listNodesForDomain(domainKey) {
  const { data, error } = await supabaseAdmin.from(NODES).select("*").eq("domain_key", domainKey)
  if (error) throw error
  return data || []
}

/** Additive edge upsert — e.g. content-ops declaring "X is a PREREQUISITE_OF Y". */
export async function upsertEdge({ fromNodeId, toNodeId, edgeType, weight = 1.0, threshold = null }) {
  const { data, error } = await supabaseAdmin
    .from(EDGES)
    .upsert(
      { from_node_id: fromNodeId, to_node_id: toNodeId, edge_type: edgeType, weight, threshold },
      { onConflict: "from_node_id,to_node_id,edge_type", ignoreDuplicates: false }
    )
    .select().single()
  if (error) throw error
  return data
}

export async function getEdgesFrom(nodeId, edgeType = null) {
  let q = supabaseAdmin.from(EDGES).select("*").eq("from_node_id", nodeId)
  if (edgeType) q = q.eq("edge_type", edgeType)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

export async function getEdgesTo(nodeId, edgeType = null) {
  let q = supabaseAdmin.from(EDGES).select("*").eq("to_node_id", nodeId)
  if (edgeType) q = q.eq("edge_type", edgeType)
  const { data, error } = await q
  if (error) throw error
  return data || []
}

/**
 * checkPrerequisites — a module cannot enter "available" state until every
 * PREREQUISITE_OF in-edge's source node has the user's user_skills.level_score
 * >= edge.threshold (default 60). Pure function over already-fetched data so
 * it's trivially unit-testable without hitting the DB.
 */
export function evaluatePrerequisites(prereqEdges, userSkillsBySlug, nodeBySlugFromId) {
  const unmet = []
  for (const edge of prereqEdges) {
    const threshold = edge.threshold ?? 60
    const prereqNode = nodeBySlugFromId(edge.from_node_id)
    const slug = prereqNode?.slug
    const score = slug ? (userSkillsBySlug[slug]?.level_score ?? 0) : 0
    if (score < threshold) unmet.push({ slug, required: threshold, current: score })
  }
  return { met: unmet.length === 0, unmet }
}

/**
 * scoreRecommendation — deterministic scoring function (Principle #5 in the
 * spec: the recommendation SELECTION is never made by an LLM, only its
 * human-readable "why" copy is). Higher is more urgent.
 *   urgency        = 1 - decayedConfidence (weaker memory => more urgent)
 *   roleRelevance  = 1 if this node's domainKey matches the learner's target
 *                    role domain, else 0.4
 *   unlockLeverage = min(1, outEdgeCount / 5)  — mild bonus for hub skills
 *   recencyPenalty = mild penalty if an Arena result already just validated it
 */
export function scoreRecommendation({ decayedConfidence = 0.5, matchesTargetRole = false, outEdgeCount = 0, recentlyArenaValidated = false }) {
  const urgency = 1 - decayedConfidence
  const roleRelevance = matchesTargetRole ? 1 : 0.4
  const unlockLeverage = Math.min(1, outEdgeCount / 5)
  const recencyPenalty = recentlyArenaValidated ? 0.5 : 1
  return Number((urgency * 0.5 + roleRelevance * 0.3 + unlockLeverage * 0.2) * recencyPenalty * 100).toFixed(1) * 1
}
