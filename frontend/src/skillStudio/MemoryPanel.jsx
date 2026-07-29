/**
 * MemoryPanel — spaced-repetition revision surface. Standalone (Learning
 * Home links here) AND embeddable inside ModuleRuntime as a post-completion
 * touchpoint.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel, bandColor } from "./tokens"

export default function MemoryPanel({ limit = 5, onReviewed }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeId, setActiveId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { items } = await skillStudioV2Api.memoryDue(limit)
      setItems(items || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [limit])

  useEffect(() => { load() }, [load])

  async function review(skillGraphNodeId, correct) {
    try {
      const result = await skillStudioV2Api.memoryReview(skillGraphNodeId, correct)
      setItems((prev) => prev.filter((i) => i.skill_graph_node_id !== skillGraphNodeId))
      onReviewed?.(result)
    } catch (e) {
      setError(e.message)
    }
    setActiveId(null)
  }

  if (loading) return <div style={{ fontSize: 12, color: D.muted }}>Checking what needs revision…</div>
  if (error) return <div style={{ fontSize: 12, color: D.rose }}>Couldn&apos;t load revision queue: {error}</div>
  if (items.length === 0) return <div style={{ fontSize: 12, color: D.muted }}>Nothing due for revision right now — nice work staying on top of it.</div>

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>Due for Revision</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const node = item.skill_graph_nodes
          const band = item.confidence >= 0.75 ? "high" : item.confidence >= 0.45 ? "medium" : "low"
          return (
            <div key={item.id} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${D.border}`, background: D.glass }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{node?.label || "Skill"}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: bandColor(band), textTransform: "uppercase" }}>{band}</span>
              </div>
              {activeId === item.skill_graph_node_id ? (
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => review(item.skill_graph_node_id, true)} style={btnStyle(D.emerald)}>Got it right</button>
                  <button onClick={() => review(item.skill_graph_node_id, false)} style={btnStyle(D.rose)}>Missed it</button>
                </div>
              ) : (
                <button onClick={() => setActiveId(item.skill_graph_node_id)} style={{ ...btnStyle(D.indigo), marginTop: 8 }}>Quick review</button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function btnStyle(color) {
  return {
    padding: "5px 10px", borderRadius: 8, border: `1px solid ${color}40`, background: color + "15",
    color, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  }
}
