/**
 * RecruiterDashboard.jsx — Hiring command center
 * Primary users: Recruiters + Hiring Managers
 * Key question: "What needs my attention across all open roles today?"
 */
import { useState } from "react"

const C = {
  // Brand
  indigo:   "#4F46E5",
  indigoL:  "#EEF2FF",
  indigoB:  "rgba(79,70,229,0.10)",
  // Semantic
  green:    "#16A34A",
  greenL:   "#F0FDF4",
  amber:    "#D97706",
  amberL:   "#FFFBEB",
  red:      "#DC2626",
  redL:     "#FEF2F2",
  blue:     "#1D4ED8",
  blueL:    "#EFF6FF",
  purple:   "#7C3AED",
  purpleL:  "#F5F3FF",
  // Neutral
  ink:      "#FFFFFF",
  ink2:     "#3D3935",
  ink3:     "#6B6560",
  ink4:     "#A8A29E",
  border:   "#E8E3DA",
  surface:  "#FFFFFF",
  bg:       "#F5F5F0",
}

// ── Shared primitives ──────────────────────────────────────────────────────────

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
        ...style,
        cursor: onClick ? "pointer" : style.cursor,
      }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.ink4,
      letterSpacing: "0.08em", textTransform: "uppercase",
      marginBottom: 10,
    }}>
      {children}
    </div>
  )
}

function Pill({ children, color = C.indigo, bg = C.indigoL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 9px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.04em",
    }}>
      {children}
    </span>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const OPEN_ROLES = [
  { id: 1, title: "Senior Backend Engineer",  dept: "Engineering", applicants: 34, new: 6,  interviews: 5, stage: "Interviewing", urgency: "high"   },
  { id: 2, title: "Product Designer",          dept: "Design",      applicants: 21, new: 3,  interviews: 2, stage: "Screening",    urgency: "medium" },
  { id: 3, title: "Data Scientist",            dept: "ML Platform", applicants: 18, new: 8,  interviews: 0, stage: "Applied",      urgency: "high"   },
  { id: 4, title: "Frontend Engineer",         dept: "Engineering", applicants: 29, new: 1,  interviews: 7, stage: "Offer",        urgency: "low"    },
]

const URGENT_ACTIONS = [
  { icon: "⏰", color: C.red,    bg: C.redL,    label: "Offer expiring in 2 days",         sub: "Priya Nambiar · Senior Backend",   action: "pipeline" },
  { icon: "🗓️", color: C.amber,  bg: C.amberL,  label: "3 interviews need feedback",       sub: "Feedback overdue by 24h",          action: "pipeline" },
  { icon: "📬", color: C.blue,   bg: C.blueL,   label: "8 new applications to review",     sub: "Data Scientist · Applied today",   action: "pipeline" },
  { icon: "✅", color: C.green,  bg: C.greenL,  label: "Rohan Verma accepted the offer",   sub: "Frontend Engineer · Starts Aug 1", action: "pipeline" },
]

const PIPELINE_HEALTH = [
  { stage: "Applied",    count: 82,  color: C.indigo },
  { stage: "Screened",   count: 41,  color: C.blue   },
  { stage: "Interview",  count: 14,  color: C.purple },
  { stage: "Offer",      count: 4,   color: C.amber  },
  { stage: "Hired",      count: 2,   color: C.green  },
]

const URGENCY_COLOR = { high: C.red, medium: C.amber, low: C.green }
const URGENCY_BG    = { high: C.redL, medium: C.amberL, low: C.greenL }
const STAGE_COLOR   = {
  Applied: C.indigo, Screening: C.blue, Interviewing: C.purple, Offer: C.amber,
}
const STAGE_BG = {
  Applied: C.indigoL, Screening: C.blueL, Interviewing: C.purpleL, Offer: C.amberL,
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function RecruiterDashboard({ user, userData, onNavigate }) {
  const name      = userData?.name || user?.displayName || "there"
  const firstName = name.split(" ")[0]
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const totalApplicants = OPEN_ROLES.reduce((s, r) => s + r.applicants, 0)
  const totalNew        = OPEN_ROLES.reduce((s, r) => s + r.new, 0)
  const totalInterviews = OPEN_ROLES.reduce((s, r) => s + r.interviews, 0)
  const maxCount        = Math.max(...PIPELINE_HEALTH.map(p => p.count))

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ padding: "24px 16px 32px", maxWidth: 480, margin: "0 auto" }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: C.ink3, fontWeight: 500, marginBottom: 4 }}>
            {greeting}, {firstName}
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, color: C.ink,
            margin: 0, lineHeight: 1.2, letterSpacing: "-0.5px",
          }}>
            Your hiring{" "}
            <span style={{ color: C.indigo }}>dashboard</span>
          </h1>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[
            { value: OPEN_ROLES.length, label: "Open Roles",    color: C.indigo },
            { value: totalApplicants,   label: "Total Applicants", color: C.blue   },
            { value: `+${totalNew}`,    label: "New Today",     color: C.green  },
            { value: totalInterviews,   label: "Interviews",    color: C.purple },
          ].map((k, i) => (
            <Card key={i} style={{ flex: 1, padding: "14px 10px", textAlign: "center" }}>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 20, fontWeight: 700, color: k.color,
                lineHeight: 1,
              }}>
                {k.value}
              </div>
              <div style={{
                fontSize: 10, color: C.ink4, fontWeight: 600,
                letterSpacing: "0.05em", textTransform: "uppercase",
                marginTop: 5, lineHeight: 1.3,
              }}>
                {k.label}
              </div>
            </Card>
          ))}
        </div>

        {/* ── Candidate search entry point ───────────────────────── */}
        {/* 2026-08-05: recruiters previously had no discovery mechanism at
            all — only pre-existing links (applications, referrals). See
            CandidateSearch.jsx + backend/server/routes/recruiterSearch.js. */}
        <Card
          onClick={() => onNavigate?.("candidateSearch")}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 18px", marginBottom: 24,
            background: C.indigoL, borderColor: C.indigo,
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
          }}>
            🔍
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Find Candidates</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              Search by skill, ELO, domain, or verification status
            </div>
          </div>
          <span style={{ color: C.indigo, fontSize: 18 }}>→</span>
        </Card>

        {/* ── Urgent actions ─────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Needs Your Attention</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {URGENT_ACTIONS.map((a, i) => (
              <Card
                key={i}
                onClick={() => onNavigate?.(a.action)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 16px",
                  borderLeft: `3px solid ${a.color}`,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: a.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0,
                }}>
                  {a.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>
                    {a.label}
                  </div>
                  <div style={{ fontSize: 12, color: C.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.sub}
                  </div>
                </div>
                <span style={{ color: C.ink4, fontSize: 18, flexShrink: 0 }}>›</span>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Pipeline health funnel ─────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <SectionLabel>Pipeline Health</SectionLabel>
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {PIPELINE_HEALTH.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 72, fontSize: 12, fontWeight: 600, color: C.ink3, flexShrink: 0 }}>
                    {p.stage}
                  </div>
                  <div style={{ flex: 1, height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${(p.count / maxCount) * 100}%`,
                      height: "100%",
                      background: p.color,
                      borderRadius: 99,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <div style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13, fontWeight: 700, color: p.color,
                    width: 28, textAlign: "right", flexShrink: 0,
                  }}>
                    {p.count}
                  </div>
                </div>
              ))}
            </div>
            <div
              onClick={() => onNavigate?.("pipeline")}
              style={{
                marginTop: 14, paddingTop: 14,
                borderTop: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, color: C.indigo, fontWeight: 700 }}>
                View full pipeline
              </span>
              <span style={{ color: C.indigo, fontSize: 16 }}>→</span>
            </div>
          </Card>
        </div>

        {/* ── Open roles ─────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <SectionLabel>Open Roles</SectionLabel>
            <span
              onClick={() => onNavigate?.("jobPostings")}
              style={{ fontSize: 12, color: C.indigo, fontWeight: 700, cursor: "pointer" }}
            >
              Manage →
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {OPEN_ROLES.map((role) => (
              <Card
                key={role.id}
                onClick={() => onNavigate?.("pipeline")}
                style={{ padding: "14px 16px" }}
              >
                {/* Title row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, paddingRight: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 3 }}>
                      {role.title}
                    </div>
                    <div style={{ fontSize: 12, color: C.ink3 }}>{role.dept}</div>
                  </div>
                  <Pill
                    color={STAGE_COLOR[role.stage] || C.indigo}
                    bg={STAGE_BG[role.stage] || C.indigoL}
                  >
                    {role.stage}
                  </Pill>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>
                      {role.applicants}
                    </span>
                    <span style={{ fontSize: 12, color: C.ink4 }}>applicants</span>
                    {role.new > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: C.green, background: C.greenL,
                        padding: "1px 6px", borderRadius: 100,
                      }}>
                        +{role.new} new
                      </span>
                    )}
                  </div>
                  <div style={{ width: 1, height: 14, background: C.border }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontSize: 12, color: C.ink4 }}>🗓️</span>
                    <span style={{ fontSize: 12, color: C.ink3, fontWeight: 600 }}>
                      {role.interviews} in interview
                    </span>
                  </div>
                  <div style={{
                    marginLeft: "auto",
                    width: 8, height: 8, borderRadius: "50%",
                    background: URGENCY_COLOR[role.urgency],
                    flexShrink: 0,
                    boxShadow: `0 0 0 3px ${URGENCY_BG[role.urgency]}`,
                  }} />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Quick actions ──────────────────────────────────────── */}
        <div>
          <SectionLabel>Quick Actions</SectionLabel>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Post a Role",      icon: "➕", action: "jobPostings", color: C.indigo, bg: C.indigoL },
              { label: "View Pipeline",    icon: "📋", action: "pipeline",    color: C.purple, bg: C.purpleL },
              { label: "Team Settings",    icon: "⚙️", action: "orgSettings", color: C.ink3,   bg: "#F3F4F6" },
            ].map((a, i) => (
              <Card
                key={i}
                onClick={() => onNavigate?.(a.action)}
                style={{
                  flex: 1, padding: "14px 10px",
                  textAlign: "center",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 6,
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: a.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>
                  {a.icon}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: a.color, lineHeight: 1.3 }}>
                  {a.label}
                </div>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
