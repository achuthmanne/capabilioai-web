/**
 * ArenaIngestionPanel — the learner-facing half of the Arena→Skill Studio
 * loop closure (2026-07-29). Reads GET /skill-studio/arena/ingestion, which
 * surfaces `arena_ingestion_records` — the idempotent, server-validated
 * consumer in backend/server/lib/skillStudio/arenaIngestion.js that runs
 * automatically after every Arena V2 submission via submission-engine/
 * service.js. This panel does not trigger ingestion itself — it only shows
 * the learner what already happened: which Arena result was picked up,
 * which skill it updated, and whether mastery/recommendations refreshed.
 *
 * Statuses shown: processing (still running), completed (mastery/decay/
 * recommendations updated), failed (Arena result was recorded but this
 * consumer hit an error — never blocks or reverses the Arena grade itself).
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, sectionLabel } from "./tokens"

function statusMeta(status) {
  if (status === "completed") return { label: "Synced", color: D.emerald }
  if (status === "failed") return { label: "Sync issue", color: D.rose }
  return { label: "Syncing…", color: D.gold }
}

function timeAgo(iso) {
  if (!iso) return ""
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function ArenaIngestionPanel({ limit = 5 }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { records } = await skillStudioV2Api.arenaIngestion(limit)
      setRecords(records || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }, [limit])

  useEffect(() => { load() }, [load])

  if (loading) return <div style={{ fontSize: 12, color: D.muted }}>Checking for Arena results…</div>
  if (error) return <div style={{ fontSize: 12, color: D.rose }}>Couldn&apos;t load Arena sync status: {error}</div>
  if (records.length === 0) {
    return (
      <div>
        <div style={{ ...sectionLabel, marginBottom: 10 }}>Arena Results</div>
        <div style={{ fontSize: 12, color: D.muted }}>Complete an Arena mission for a skill you&apos;re learning here and it will show up as evidence toward that journey.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={sectionLabel}>Arena Results</div>
        <button onClick={load} style={{ fontSize: 10, color: D.indigo, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Refresh</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {records.map((r) => {
          const meta = statusMeta(r.status)
          return (
            <div key={r.id} style={{ padding: "10px 12px", borderRadius: 12, border: `1px solid ${D.border}`, background: D.glass }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{r.skillLabel || "General challenge"}</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: meta.color, textTransform: "uppercase" }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 10.5, color: D.muted, marginTop: 3 }}>
                {r.status === "completed"
                  ? `Mastery, memory, and recommendations updated · ${timeAgo(r.completedAt || r.createdAt)}`
                  : r.status === "failed"
                    ? `Your Arena grade is unaffected — this sync will retry · ${timeAgo(r.createdAt)}`
                    : `Submitted ${timeAgo(r.createdAt)}`}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
