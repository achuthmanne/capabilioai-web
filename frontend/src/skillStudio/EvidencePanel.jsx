/**
 * EvidencePanel — this-skill evidence trail + self-publish toggle. Reads
 * proof_objects (via GET /skill-studio/evidence) filtered to this skill;
 * publish flips is_portfolio_visible/is_recruiter_visible via the SAME
 * updatePublishState() Arena's own portfolio publish flow uses.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

export default function EvidencePanel({ skillLabel }) {
  const [artifacts, setArtifacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { artifacts } = await skillStudioV2Api.evidenceList()
      setArtifacts((artifacts || []).filter((a) => !skillLabel || a.skill === skillLabel))
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [skillLabel])

  useEffect(() => { load() }, [load])

  async function togglePublish(artifact) {
    setBusyId(artifact.id)
    try {
      const publish = artifact.publish_state !== "self_selected" && artifact.publish_state !== "auto_published"
      const { artifact: updated } = await skillStudioV2Api.evidencePublish(artifact.id, publish)
      setArtifacts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (e) { setError(e.message) }
    setBusyId(null)
  }

  if (loading) return <div style={{ fontSize: 12, color: D.muted }}>Loading evidence trail…</div>

  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>Evidence Trail</div>
      {artifacts.length === 0 && <div style={{ fontSize: 12, color: D.muted }}>No evidence yet for this skill — pass a module or Arena mission to generate some.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {artifacts.map((a) => {
          const published = a.publish_state === "self_selected" || a.publish_state === "auto_published"
          const canPublish = a.publish_state !== "not_applicable"
          return (
            <div key={a.id} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${D.border}`, background: D.glass }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{a.title}</div>
                  <div style={{ fontSize: 10, color: D.muted, marginTop: 2 }}>
                    {a.source === "arena_v2" ? "Arena — validated" : a.source === "skill_studio_interview" ? "Mock interview" : "Skill Studio module"} · {new Date(a.completed_at).toLocaleDateString()}
                  </div>
                </div>
                {canPublish && (
                  <button onClick={() => togglePublish(a)} disabled={busyId === a.id} style={{
                    padding: "4px 10px", borderRadius: 8, border: `1px solid ${published ? D.emerald : D.border}40`,
                    background: published ? D.emerald + "15" : D.glass, color: published ? D.emerald : D.muted,
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                  }}>{busyId === a.id ? "…" : published ? "Published" : "Publish"}</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {error && <div style={{ fontSize: 11, color: D.rose, marginTop: 8 }}>{error}</div>}
    </div>
  )
}
