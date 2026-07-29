/**
 * NextSkillPanel — renders the (already-ranked, deterministic) recommendation
 * list. Never re-ranks or filters client-side; the ranking decision was made
 * server-side by recommendationEngine.js (spec Principle #5).
 */
import { D, sectionLabel, bandColor } from "./tokens"

export default function NextSkillPanel({ recommendations = [], onSelect, loading = false, title = "Next Best Skill" }) {
  return (
    <div>
      <div style={{ ...sectionLabel, marginBottom: 10 }}>{title}</div>
      {loading && <div style={{ fontSize: 12, color: D.muted }}>Computing your next best step…</div>}
      {!loading && recommendations.length === 0 && (
        <div style={{ fontSize: 12, color: D.muted }}>No active journeys yet — start one below to get a personalized path.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recommendations.map((rec) => (
          <button
            key={rec.journeyId || rec.skill}
            onClick={() => onSelect?.(rec)}
            style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 12,
              border: `1px solid ${D.border}`, background: D.glass, cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 4, fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{rec.skill}</span>
              {rec.band && (
                <span style={{ fontSize: 9, fontWeight: 800, color: bandColor(rec.band), textTransform: "uppercase" }}>
                  {rec.band} confidence
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: D.text2 }}>{rec.why}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
