/**
 * RecruiterProofDrawer — recruiter-facing READ-ONLY view. Deliberately calls
 * the pre-existing PUBLIC Engineering Proofs API (GET /api/proofs/:userId,
 * routes/proofs.js) instead of a new recruiter-auth model — publishing
 * Skill Studio evidence (EvidencePanel) flips the SAME is_portfolio_visible
 * flag that endpoint already filters on, so no new recruiter-visibility
 * pipeline was needed (spec §10: "a read view, not a new data pipeline").
 * No animation flourish here on purpose (spec §17) — recruiter surfaces
 * should feel instant and information-dense, not playful.
 */
import { useState, useEffect } from "react"
import { proofsApi } from "../lib/api"
import { D, sectionLabel } from "./tokens"

export default function RecruiterProofDrawer({ learnerId, onClose }) {
  const [proofs, setProofs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const data = await proofsApi.forUser(learnerId)
        if (!cancelled) setProofs(data?.proofs || data?.grouped || data || [])
      } catch (e) {
        if (!cancelled) setError(e.message)
      }
      if (!cancelled) setLoading(false)
    }
    if (learnerId) load()
    return () => { cancelled = true }
  }, [learnerId])

  const flat = Array.isArray(proofs) ? proofs : Object.values(proofs).flat()

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", borderLeft: `1px solid ${D.border}`, boxShadow: "-8px 0 24px rgba(0,0,0,0.08)", zIndex: 200, overflowY: "auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={sectionLabel}>Evidence & Trust Signals</div>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, color: D.muted }}>×</button>
      </div>

      {loading && <div style={{ fontSize: 12, color: D.muted }}>Loading…</div>}
      {error && <div style={{ fontSize: 12, color: D.rose }}>{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {flat.map((p) => (
          <div key={p.id} style={{ padding: 12, borderRadius: 10, border: `1px solid ${D.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{p.title}</span>
              {typeof p.score === "number" && <span style={{ fontSize: 12, fontWeight: 800, color: D.emerald }}>{p.score}%</span>}
            </div>
            <div style={{ fontSize: 10, color: D.muted, marginTop: 4 }}>
              {p.trustLevel === "verified" ? "Verified" : "Self-claimed"} · {p.difficulty || "—"} · {p.completedAt ? new Date(p.completedAt).toLocaleDateString() : ""}
            </div>
            {p.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {p.tags.slice(0, 6).map((t) => (
                  <span key={t} style={{ fontSize: 9, padding: "2px 6px", borderRadius: 6, background: D.glass, color: D.text2 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && flat.length === 0 && <div style={{ fontSize: 12, color: D.muted }}>No published evidence yet.</div>}
      </div>
    </div>
  )
}
