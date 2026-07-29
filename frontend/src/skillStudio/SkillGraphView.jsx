/**
 * SkillGraphView — visual map of the catalog skill graph for a domain
 * (spec §2/§4). Deliberately NOT a force-directed graph library (no new
 * heavy dependency for a first pass) — renders nodes as cards with their
 * PREREQUISITE_OF relationships shown as explicit "requires" chips, which
 * is enough to make prerequisite structure visible and clickable without
 * adding new frontend dependencies.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, cardStyle, sectionLabel } from "./tokens"

export default function SkillGraphView({ domainKey, onSelectNode }) {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!domainKey) return
    setLoading(true); setError(null)
    try {
      const { nodes, edges } = await skillStudioV2Api.graph(domainKey)
      setNodes(nodes || []); setEdges(edges || [])
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [domainKey])

  useEffect(() => { load() }, [load])

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]))

  function prereqsFor(nodeId) {
    return edges
      .filter((e) => e.edge_type === "PREREQUISITE_OF" && e.to_node_id === nodeId)
      .map((e) => nodeById[e.from_node_id])
      .filter(Boolean)
  }

  if (loading) return <div style={{ fontSize: 12, color: D.muted }}>Loading skill graph…</div>
  if (error) return <div style={{ fontSize: 12, color: D.rose }}>{error}</div>
  if (nodes.length === 0) return <div style={{ fontSize: 12, color: D.muted }}>No catalog nodes yet for this domain — start a journey to seed one.</div>

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 12 }}>Skill Graph — {domainKey}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {nodes.map((n) => {
          const prereqs = prereqsFor(n.id)
          return (
            <button key={n.id} onClick={() => onSelectNode?.(n)} style={{
              ...cardStyle, textAlign: "left", padding: 14, cursor: "pointer", fontFamily: "inherit",
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: D.text1 }}>{n.label}</span>
              {prereqs.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {prereqs.map((p) => (
                    <span key={p.id} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: D.glass, color: D.text2 }}>needs: {p.label}</span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
