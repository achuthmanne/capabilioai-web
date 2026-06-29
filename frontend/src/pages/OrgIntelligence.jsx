/**
 * OrgIntelligence.jsx — Org talent & performance analytics brain
 */
import { useState } from "react"

const C = {
  teal: "#0F766E", tealL: "#F0FDFA", tealB: "rgba(15,118,110,0.12)",
  ink: "#1A1714", ink2: "#475569", ink3: "#A8A29E", ink4: "#A8A29E",
  border: "#E8E3DA", surface: "#1A1714", bg: "#FAF7F2",
  green: "#16A34A", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  blue: "#1D4ED8", blueL: "#EFF6FF",
  purple: "#6D28D9", purpleL: "#F4F0FF",
}

const DEPARTMENTS = [
  { name: "Computer Science",  students: 420, avgElo: 964, jobReady: "41%", placements: 38, trend: "+32" },
  { name: "Information Tech",  students: 310, avgElo: 887, jobReady: "29%", placements: 22, trend: "+18" },
  { name: "Electronics",       students: 280, avgElo: 741, jobReady: "17%", placements: 11, trend: "-4"  },
  { name: "Mechanical",        students: 190, avgElo: 612, jobReady: "8%",  placements: 4,  trend: "-12" },
]

const TOP_STUDENTS = [
  { name: "Anika Sharma",   elo: 1847, domain: "SWE",      badge: "Top 1%"  },
  { name: "Kiran Reddy",    elo: 1712, domain: "ML/AI",    badge: "Top 3%"  },
  { name: "Priya Nambiar",  elo: 1680, domain: "DevOps",   badge: "Top 5%"  },
  { name: "Rohan Verma",    elo: 1634, domain: "SWE",      badge: "Top 7%"  },
]

const PLACEMENT_FUNNEL = [
  { stage: "Active Profiles",  count: 847, pct: 100, color: C.teal   },
  { stage: "Recruiter Views",  count: 512, pct: 60,  color: C.blue   },
  { stage: "Interview Invites",count: 189, pct: 22,  color: C.purple },
  { stage: "Offers Extended",  count: 67,  pct: 8,   color: C.green  },
]

const TABS = ["Cohort Overview", "Leaderboard", "Placements", "Skill Gaps"]

export default function OrgIntelligence({ user, userData }) {
  const [tab, setTab] = useState("Cohort Overview")

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');`}</style>

      <div style={{ padding: "20px 16px 0" }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
          Intelligence <span style={{ color: C.teal, fontStyle: "italic" }}>Dashboard</span>
        </h1>
        <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 16px" }}>Cohort performance, placement analytics, and skill insights.</p>

        {/* KPI strip */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {[
            { val: "924",  label: "Avg ELO",       color: C.teal   },
            { val: "38%",  label: "Job Ready",      color: C.green  },
            { val: "67",   label: "Placements",     color: C.blue   },
            { val: "1,200",label: "Total Students", color: C.purple },
          ].map((s, i) => (
            <div key={i} style={{ flex: "0 0 100px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, overflowX: "auto", background: C.surface, padding: "0 16px" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "11px 14px", border: "none", borderBottom: tab === t ? `2px solid ${C.teal}` : "2px solid transparent", borderTop: "2px solid transparent", background: "transparent", color: tab === t ? C.teal : C.ink3, fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 16px 24px" }}>

        {tab === "Cohort Overview" && (
          <div>
            {DEPARTMENTS.map((d, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{d.name}</div>
                    <div style={{ fontSize: 12, color: C.ink4, marginTop: 2 }}>{d.students} students enrolled</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: C.teal }}>{d.avgElo}</div>
                    <div style={{ fontSize: 11, color: d.trend.startsWith("+") ? C.green : C.red, fontWeight: 700 }}>ELO {d.trend} MoM</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                  <span style={{ color: C.green, fontWeight: 600 }}>✓ {d.jobReady} job-ready</span>
                  <span style={{ color: C.blue, fontWeight: 600 }}>🏆 {d.placements} placements</span>
                </div>
                <div style={{ marginTop: 10, height: 5, background: "#F3F4F6", borderRadius: 99 }}>
                  <div style={{ width: d.jobReady, height: "100%", background: C.teal, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Leaderboard" && (
          <div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12 }}>Top performers across all departments · This semester</div>
            {TOP_STUDENTS.map((s, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: i === 0 ? "#F59E0B" : i === 1 ? "#A8A29E" : i === 2 ? "#B45309" : C.ink4, width: 28, textAlign: "center" }}>#{i + 1}</div>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.tealL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.teal }}>{s.name.charAt(0)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: C.ink4 }}>{s.domain}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: C.teal }}>{s.elo}</div>
                  <span style={{ padding: "2px 8px", background: C.tealL, color: C.teal, borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{s.badge}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "Placements" && (
          <div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 16 }}>Placement funnel · Current semester</div>
            {PLACEMENT_FUNNEL.map((stage, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.ink2 }}>{stage.stage}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: stage.color }}>{stage.count}</span>
                </div>
                <div style={{ height: 10, background: "#F3F4F6", borderRadius: 99 }}>
                  <div style={{ width: `${stage.pct}%`, height: "100%", background: stage.color, borderRadius: 99, transition: "width 0.4s" }} />
                </div>
                <div style={{ fontSize: 11, color: C.ink4, marginTop: 3 }}>{stage.pct}% of total</div>
              </div>
            ))}
          </div>
        )}

        {tab === "Skill Gaps" && (
          <div>
            <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12 }}>Top skills most students lack · Based on recruiter demand vs. cohort ELO</div>
            {[
              { skill: "System Design",   gap: 78, students: 420, action: "Assign task" },
              { skill: "DevOps / Docker", gap: 65, students: 310, action: "Assign task" },
              { skill: "SQL Advanced",    gap: 54, students: 280, action: "Assign task" },
              { skill: "React / Frontend",gap: 47, students: 190, action: "Assign task" },
            ].map((g, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{g.skill}</div>
                    <div style={{ fontSize: 12, color: C.ink4, marginTop: 1 }}>{g.students} students affected</div>
                  </div>
                  <button style={{ padding: "6px 12px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 8, color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{g.action}</button>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: C.ink4 }}>Skill gap severity</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: g.gap > 60 ? C.red : C.amber, fontFamily: "'DM Mono', monospace" }}>{g.gap}%</span>
                  </div>
                  <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99 }}>
                    <div style={{ width: `${g.gap}%`, height: "100%", background: g.gap > 60 ? C.red : C.amber, borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
