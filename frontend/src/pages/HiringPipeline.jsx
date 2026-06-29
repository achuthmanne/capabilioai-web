/**
 * HiringPipeline.jsx — Kanban candidate pipeline
 * Primary flows: candidate list, candidate profile/review, status stage moves
 * Both recruiters and hiring managers land here to action candidates.
 */
import { useState } from "react"

const C = {
  indigo:  "#4F46E5",
  indigoL: "#EEF2FF",
  indigoB: "rgba(79,70,229,0.08)",
  green:   "#16A34A",
  greenL:  "#F0FDF4",
  amber:   "#D97706",
  amberL:  "#FFFBEB",
  red:     "#DC2626",
  redL:    "#FEF2F2",
  blue:    "#1D4ED8",
  blueL:   "#EFF6FF",
  purple:  "#7C3AED",
  purpleL: "#F5F3FF",
  teal:    "#0F766E",
  tealL:   "#F0FDFA",
  ink:     "#FFFFFF",
  ink2:    "#3D3935",
  ink3:    "#6B6560",
  ink4:    "#A8A29E",
  border:  "#E8E3DA",
  surface: "#FFFFFF",
  bg:      "#F5F5F0",
}

// ── Stage config ───────────────────────────────────────────────────────────────

const STAGES = [
  { id: "applied",   label: "Applied",   color: C.indigo, bg: C.indigoL },
  { id: "screening", label: "Screening", color: C.blue,   bg: C.blueL   },
  { id: "interview", label: "Interview", color: C.purple, bg: C.purpleL },
  { id: "offer",     label: "Offer",     color: C.amber,  bg: C.amberL  },
  { id: "hired",     label: "Hired",     color: C.green,  bg: C.greenL  },
]

const STAGE_NEXT = {
  applied:   "screening",
  screening: "interview",
  interview: "offer",
  offer:     "hired",
}
const STAGE_LABEL = Object.fromEntries(STAGES.map(s => [s.id, s.label]))

// ── Candidate data ─────────────────────────────────────────────────────────────

const ALL_CANDIDATES = [
  {
    id: 1,  name: "Anika Sharma",    role: "Senior Backend Engineer", stage: "interview",
    elo: 1847, domain: "Backend · Go / Python", yoe: "5 yrs",
    matchScore: 92, appliedDate: "Jun 2",
    tags: ["Go", "PostgreSQL", "Distributed Systems"],
    note: "Strong system design. Needs DS&A prep.",
    avatar: "AS", avatarColor: C.indigo,
    lastAction: "Technical interview scheduled Jun 8",
    urgent: true,
  },
  {
    id: 2,  name: "Kiran Reddy",     role: "Senior Backend Engineer", stage: "screening",
    elo: 1712, domain: "Backend · Node / AWS",  yoe: "4 yrs",
    matchScore: 84, appliedDate: "Jun 3",
    tags: ["Node.js", "AWS", "Kafka"],
    note: "Great infra experience. Communication to validate.",
    avatar: "KR", avatarColor: C.purple,
    lastAction: "Screening call booked for Jun 7",
    urgent: false,
  },
  {
    id: 3,  name: "Priya Nambiar",   role: "Senior Backend Engineer", stage: "offer",
    elo: 1680, domain: "Backend · Java / Spring", yoe: "6 yrs",
    matchScore: 88, appliedDate: "May 28",
    tags: ["Java", "Spring Boot", "Kubernetes"],
    note: "Offer extended Jun 1. Expiring Jun 8 — follow up today.",
    avatar: "PN", avatarColor: C.amber,
    lastAction: "Offer sent May 31 · Expires Jun 8",
    urgent: true,
  },
  {
    id: 4,  name: "Rohan Verma",     role: "Frontend Engineer",       stage: "hired",
    elo: 1634, domain: "Frontend · React / TS",  yoe: "3 yrs",
    matchScore: 90, appliedDate: "May 20",
    tags: ["React", "TypeScript", "GraphQL"],
    note: "Strong portfolio. Accepted offer. Starts Aug 1.",
    avatar: "RV", avatarColor: C.green,
    lastAction: "Offer accepted Jun 4 · Starts Aug 1",
    urgent: false,
  },
  {
    id: 5,  name: "Sanjay Iyer",     role: "Data Scientist",          stage: "applied",
    elo: 1590, domain: "ML · Python / PyTorch",  yoe: "3 yrs",
    matchScore: 78, appliedDate: "Jun 5",
    tags: ["Python", "PyTorch", "MLflow"],
    note: "Strong ML background. Review portfolio before screen.",
    avatar: "SI", avatarColor: C.teal,
    lastAction: "Applied Jun 5",
    urgent: false,
  },
  {
    id: 6,  name: "Meera Pillai",    role: "Data Scientist",          stage: "applied",
    elo: 1556, domain: "ML · TF / BigQuery",     yoe: "2 yrs",
    matchScore: 71, appliedDate: "Jun 5",
    tags: ["TensorFlow", "BigQuery", "dbt"],
    note: "Good data engineering depth.",
    avatar: "MP", avatarColor: C.blue,
    lastAction: "Applied Jun 5",
    urgent: false,
  },
  {
    id: 7,  name: "Aarav Singh",     role: "Product Designer",        stage: "screening",
    elo: 1480, domain: "Design · Figma / UX",    yoe: "4 yrs",
    matchScore: 82, appliedDate: "Jun 1",
    tags: ["Figma", "Design Systems", "User Research"],
    note: "Impressive portfolio. Assess systems thinking.",
    avatar: "AS", avatarColor: C.pink,
    lastAction: "Screening call completed Jun 6",
    urgent: false,
  },
  {
    id: 8,  name: "Divya Menon",     role: "Product Designer",        stage: "interview",
    elo: 1460, domain: "Design · Prototyping",   yoe: "5 yrs",
    matchScore: 86, appliedDate: "May 29",
    tags: ["Figma", "Prototyping", "Motion"],
    note: "Excellent motion work. Design challenge pending feedback.",
    avatar: "DM", avatarColor: C.purple,
    lastAction: "Design challenge submitted Jun 4",
    urgent: true,
  },
]

const ROLES = ["All Roles", ...new Set(ALL_CANDIDATES.map(c => c.role))]

// ── Shared primitives ──────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: color + "20",
      border: `2px solid ${color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 800, color,
      flexShrink: 0, letterSpacing: "-0.5px",
    }}>
      {initials}
    </div>
  )
}

function ScoreBadge({ score }) {
  const color = score >= 85 ? C.green : score >= 70 ? C.amber : C.red
  const bg    = score >= 85 ? C.greenL : score >= 70 ? C.amberL : C.redL
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 10px", borderRadius: 10,
      background: bg, border: `1px solid ${color}30`,
      flexShrink: 0,
    }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 700, color, lineHeight: 1 }}>
        {score}
      </div>
      <div style={{ fontSize: 9, fontWeight: 700, color: color + "99", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>
        match
      </div>
    </div>
  )
}

// ── Candidate card ─────────────────────────────────────────────────────────────

function CandidateCard({ candidate, onTap }) {
  const stage = STAGES.find(s => s.id === candidate.stage)
  return (
    <div
      onClick={() => onTap(candidate)}
      style={{
        background: C.surface,
        border: `1px solid ${candidate.urgent ? C.amber + "80" : C.border}`,
        borderLeft: `3px solid ${stage?.color || C.indigo}`,
        borderRadius: 14,
        padding: "14px 14px 12px",
        marginBottom: 8,
        cursor: "pointer",
        position: "relative",
      }}
    >
      {candidate.urgent && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          width: 8, height: 8, borderRadius: "50%",
          background: C.amber,
          boxShadow: `0 0 0 3px ${C.amberL}`,
        }} />
      )}

      {/* Name + score */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
        <Avatar initials={candidate.avatar} color={candidate.avatarColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
            {candidate.name}
          </div>
          <div style={{ fontSize: 12, color: C.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {candidate.domain} · {candidate.yoe}
          </div>
        </div>
        <ScoreBadge score={candidate.matchScore} />
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {candidate.tags.slice(0, 3).map((tag, i) => (
          <span key={i} style={{
            fontSize: 11, fontWeight: 600,
            padding: "2px 8px", borderRadius: 6,
            background: "#F3F4F6", color: C.ink3,
          }}>
            {tag}
          </span>
        ))}
      </div>

      {/* Last action */}
      <div style={{ fontSize: 11, color: C.ink4 }}>
        🕐 {candidate.lastAction}
      </div>
    </div>
  )
}

// ── Candidate detail drawer ────────────────────────────────────────────────────

function CandidateDrawer({ candidate, onClose, onMove, onReject }) {
  if (!candidate) return null
  const stage     = STAGES.find(s => s.id === candidate.stage)
  const nextStage = STAGE_NEXT[candidate.stage]
  const nextLabel = nextStage ? STAGE_LABEL[nextStage] : null

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
      />

      {/* Sheet */}
      <div style={{
        position: "relative", background: C.surface,
        borderRadius: "20px 20px 0 0",
        padding: "0 0 32px",
        maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border }} />
        </div>

        <div style={{ padding: "8px 20px 0" }}>
          {/* Header */}
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
            <Avatar initials={candidate.avatar} color={candidate.avatarColor} size={52} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, letterSpacing: "-0.3px" }}>
                {candidate.name}
              </div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>
                {candidate.role}
              </div>
              <div style={{ marginTop: 6 }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 100,
                  background: stage?.bg, color: stage?.color,
                  fontSize: 11, fontWeight: 700,
                }}>
                  {stage?.label}
                </span>
              </div>
            </div>
            <ScoreBadge score={candidate.matchScore} />
          </div>

          {/* Detail rows */}
          {[
            { label: "Domain",   value: candidate.domain    },
            { label: "Experience", value: candidate.yoe     },
            { label: "Applied",  value: candidate.appliedDate },
            { label: "ELO Score", value: candidate.elo.toLocaleString(), mono: true },
          ].map((row, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              paddingTop: 10, paddingBottom: 10,
              borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontSize: 13, color: C.ink4, fontWeight: 600 }}>{row.label}</span>
              <span style={{
                fontSize: 13, fontWeight: 700, color: C.ink,
                fontFamily: row.mono ? "'DM Mono', monospace" : "inherit",
              }}>
                {row.value}
              </span>
            </div>
          ))}

          {/* Tags */}
          <div style={{ paddingTop: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.ink4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Skills
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {candidate.tags.map((tag, i) => (
                <span key={i} style={{
                  padding: "5px 12px", borderRadius: 8,
                  background: C.indigoL, color: C.indigo,
                  fontSize: 13, fontWeight: 600,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Recruiter note */}
          {candidate.note && (
            <div style={{
              background: C.amberL,
              border: `1px solid ${C.amber}30`,
              borderRadius: 12, padding: "12px 14px",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                📝 Recruiter Note
              </div>
              <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.5 }}>
                {candidate.note}
              </div>
            </div>
          )}

          {/* Last action */}
          <div style={{ fontSize: 12, color: C.ink4, marginBottom: 20 }}>
            🕐 {candidate.lastAction}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {nextLabel && (
              <button
                onClick={() => { onMove(candidate.id, nextStage); onClose() }}
                style={{
                  width: "100%", padding: 15,
                  background: C.indigo, border: "none",
                  borderRadius: 14, color: "#fff",
                  fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                  letterSpacing: "-0.2px",
                }}
              >
                Move to {nextLabel} →
              </button>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                style={{
                  flex: 1, padding: "12px 0",
                  background: "#FAF7F2",
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12, color: C.ink3,
                  fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                💬 Message
              </button>
              {candidate.stage !== "hired" && (
                <button
                  onClick={() => { onReject(candidate.id); onClose() }}
                  style={{
                    flex: 1, padding: "12px 0",
                    background: C.redL,
                    border: `1.5px solid ${C.red}30`,
                    borderRadius: 12, color: C.red,
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ✕ Reject
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function HiringPipeline({ user, userData, onNavigate }) {
  const [activeStage,   setActiveStage]   = useState("applied")
  const [roleFilter,    setRoleFilter]    = useState("All Roles")
  const [selected,      setSelected]      = useState(null)
  const [candidates,    setCandidates]    = useState(ALL_CANDIDATES)

  const stage = STAGES.find(s => s.id === activeStage)

  const visible = candidates.filter(c =>
    c.stage === activeStage &&
    (roleFilter === "All Roles" || c.role === roleFilter)
  )

  const stageCount = (id) => candidates.filter(c => c.stage === id).length

  const moveCandidate = (id, newStage) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, stage: newStage } : c))
  }
  const rejectCandidate = (id) => {
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "20px 16px 0",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: "-0.4px" }}>
            Hiring Pipeline
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: C.amber,
              background: C.amberL, padding: "3px 8px", borderRadius: 6,
            }}>
              {candidates.filter(c => c.urgent).length} urgent
            </span>
          </div>
        </div>

        {/* Role filter */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
          {ROLES.map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: "5px 14px", borderRadius: 100, border: "none",
                background: roleFilter === r ? C.indigo : "#F3F4F6",
                color: roleFilter === r ? "#fff" : C.ink3,
                fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Stage tabs */}
        <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {STAGES.map(s => {
            const count   = stageCount(s.id)
            const isActive = s.id === activeStage
            return (
              <button
                key={s.id}
                onClick={() => setActiveStage(s.id)}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  borderBottom: isActive ? `2px solid ${s.color}` : "2px solid transparent",
                  borderTop: "2px solid transparent",
                  background: "transparent",
                  display: "flex", alignItems: "center", gap: 6,
                  color: isActive ? s.color : C.ink4,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                  whiteSpace: "nowrap", flexShrink: 0,
                  transition: "all 0.15s",
                }}
              >
                {s.label}
                {count > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 100,
                    background: isActive ? s.color : "#F3F4F6",
                    color: isActive ? "#fff" : C.ink4,
                    minWidth: 18, textAlign: "center",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Stage header ───────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>
              {stage?.label}
            </div>
            <div style={{ fontSize: 12, color: C.ink4, marginTop: 2 }}>
              {visible.length} candidate{visible.length !== 1 ? "s" : ""}
              {roleFilter !== "All Roles" ? ` · ${roleFilter}` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* ── Candidate list ─────────────────────────────────────── */}
      <div style={{ padding: "0 16px 100px" }}>
        {visible.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 20px",
            color: C.ink4, fontSize: 14,
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            No candidates in {stage?.label} stage
            {roleFilter !== "All Roles" ? ` for ${roleFilter}` : ""}
          </div>
        ) : (
          visible.map(c => (
            <CandidateCard key={c.id} candidate={c} onTap={setSelected} />
          ))
        )}
      </div>

      {/* ── Candidate drawer ───────────────────────────────────── */}
      {selected && (
        <CandidateDrawer
          candidate={selected}
          onClose={() => setSelected(null)}
          onMove={moveCandidate}
          onReject={rejectCandidate}
        />
      )}
    </div>
  )
}
