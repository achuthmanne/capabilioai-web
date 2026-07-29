/**
 * LearningHome — daily entry point (spec §2). "What should I do right now" —
 * never a course catalog grid; always personalized, ranked, evidence-aware
 * (spec §31 acceptance criteria).
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, cardStyle, sectionLabel } from "./tokens"
import NextSkillPanel from "./NextSkillPanel"
import MemoryPanel from "./MemoryPanel"
import ArenaIngestionPanel from "./ArenaIngestionPanel"

export default function LearningHome({ jobTitle, domainKey, onOpenJourney, onOpenGraph }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newSkill, setNewSkill] = useState("")
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const home = await skillStudioV2Api.home()
      setData(home)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function startJourney() {
    if (!newSkill.trim()) return
    setCreating(true)
    try {
      const { journey } = await skillStudioV2Api.createJourney(newSkill.trim(), domainKey, jobTitle)
      setNewSkill("")
      await load()
      onOpenJourney?.(journey)
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: D.muted, fontSize: 13 }}>Loading your learning home…</div>

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: D.text1 }}>Learning Home</div>
          <div style={{ fontSize: 13, color: D.text2, marginTop: 2 }}>What to do next, ranked for {jobTitle || "your track"}.</div>
        </div>
        <button onClick={onOpenGraph} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`, background: D.glass, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          View Skill Graph
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: D.rose, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Active Journeys</div>
          {(data?.activeJourneys || []).length === 0 && (
            <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>No active journeys yet — start one below.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {(data?.activeJourneys || []).map((j) => (
              <button key={j.id} onClick={() => onOpenJourney?.(j)} style={{
                textAlign: "left", padding: "10px 14px", borderRadius: 12, border: `1px solid ${D.border}`,
                background: D.glass, cursor: "pointer", fontFamily: "inherit",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: D.text1 }}>{j.skill_graph_nodes?.label || "Skill"}</span>
                <span style={{ fontSize: 10, color: D.muted }}>{j.target_role || ""}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startJourney()}
              placeholder="Start a new skill journey (e.g. React Hooks)"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${D.border}`, fontFamily: "inherit", fontSize: 12 }} />
            <button onClick={startJourney} disabled={creating || !newSkill.trim()} style={{
              padding: "9px 16px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{creating ? "Starting…" : "Start"}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 20 }}>
          <NextSkillPanel recommendations={data?.topRecommendations || []} onSelect={(rec) => onOpenJourney?.({ id: rec.journeyId, skill_graph_nodes: { id: rec.skillGraphNodeId, label: rec.skill, domain_key: rec.domainKey }, target_role: jobTitle })} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <MemoryPanel limit={5} />
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <ArenaIngestionPanel limit={5} />
        </div>
      </div>
    </div>
  )
}
