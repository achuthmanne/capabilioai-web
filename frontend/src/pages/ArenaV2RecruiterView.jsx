// ArenaV2RecruiterView.jsx — Arena V2 Pilot Phase (Recruiter View v1)
// ---------------------------------------------------------------------------
// Recruiter-facing evidence read for a single candidate, backed entirely by
// the existing GET /api/av2/portfolio/candidates/:userId/evidence endpoint
// (arenaV2Portfolio.js, Milestone 10 — unchanged) and its
// buildRecruiterEvidenceViewFromProof (portfolio/recruiterEvidence.js),
// which this pilot extended additively with strengths/suggestions/
// recruiterReadiness/eloDelta/timeTakenSecs. This page adds no new backend
// surface of its own — it's a read-only render of already-existing,
// already-gated (is_recruiter_visible=true only) evidence.
//
// KNOWN GAP, same one arenaV2Portfolio.js's own header already documents:
// there is no dedicated recruiter-role/auth model yet — any authenticated
// user hitting this page can view another user's *already recruiter-visible*
// evidence. That's the existing, bounded gap in the backend this page
// inherits, not a new one introduced here.
import { useEffect, useState } from "react"
import { fetchRecruiterEvidence } from "../api/arenaV2Portfolio.js"
import { formatDuration, formatEloDelta, isRecruiterReadyScore } from "../arena-v2/evidenceFormatting.js"

function EvidenceCard({ ev }) {
  return (
    <div style={{ padding: 16, background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{ev.title || ev.skill}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            {ev.role} · {ev.difficulty} · {ev.industry || "—"} · {new Date(ev.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: isRecruiterReadyScore(ev.scorePct) ? "#4ade80" : "#fbbf24" }}>{ev.scorePct}/100</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{ev.verification}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#cbd5e1" }}>
        <div>Time taken: <strong>{formatDuration(ev.timeTakenSecs)}</strong></div>
        <div>ELO delta: <strong style={{ color: typeof ev.eloDelta !== "number" ? "#94a3b8" : ev.eloDelta >= 0 ? "#4ade80" : "#f87171" }}>{formatEloDelta(ev.eloDelta)}</strong></div>
      </div>

      {ev.skillsDemonstrated?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {ev.skillsDemonstrated.map((s) => (
            <span key={s} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#1e293b", color: "#93c5fd" }}>{s}</span>
          ))}
        </div>
      )}

      {ev.recruiterReadiness && (
        <div style={{ fontSize: 12 }}>
          <span style={{ color: "#94a3b8" }}>Recruiter readiness: </span>
          <span style={{ fontWeight: 700, color: "#4ade80" }}>{ev.recruiterReadiness}</span>
          {ev.recruiterReadinessNote && <span style={{ color: "#94a3b8" }}> — {ev.recruiterReadinessNote}</span>}
        </div>
      )}

      {ev.criteriaScores && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "#94a3b8" }}>
          {Object.entries(ev.criteriaScores).map(([k, v]) => <span key={k}>{k}: <strong style={{ color: "#e2e8f0" }}>{v ?? "—"}</strong></span>)}
        </div>
      )}

      {ev.strengths?.length > 0 && (
        <div style={{ fontSize: 12 }}>
          <div style={{ color: "#94a3b8", marginBottom: 4 }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#4ade80" }}>
            {ev.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}

      {ev.suggestions?.length > 0 && (
        <div style={{ fontSize: 12 }}>
          {/* "Growth Areas" — unified with ArenaV2WorkspaceShell.jsx's
              MissionControlPanel AI Reviewer block during the final
              consolidation pass, which previously said "Suggestions" for
              this identical field. */}
          <div style={{ color: "#94a3b8", marginBottom: 4 }}>Growth Areas</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "#fbbf24" }}>
            {ev.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function ArenaV2RecruiterView({ candidateUserId, onBack }) {
  const [evidence, setEvidence] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    setEvidence(null)
    setError(null)
    fetchRecruiterEvidence(candidateUserId)
      .then((dto) => { if (alive) setEvidence(dto?.evidence || []) })
      .catch((e) => { if (alive) setError(e) })
    return () => { alive = false }
  }, [candidateUserId])

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>Recruiter View — Proof Timeline</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Real evidence from graded Arena V2 submissions, not just a completion badge.</div>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
            ← Back
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: 13, color: "#f87171" }}>Couldn't load evidence: {error.message}</div>}
      {!error && !evidence && <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading…</div>}
      {evidence && evidence.length === 0 && (
        <div style={{ fontSize: 13, color: "#94a3b8" }}>No recruiter-visible evidence yet — nothing has been auto-published or self-published for this candidate.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(evidence || []).map((ev, i) => <EvidenceCard key={i} ev={ev} />)}
      </div>
    </div>
  )
}
