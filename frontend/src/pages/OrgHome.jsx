/**
 * OrgHome.jsx — Organisation admin command center
 * "What needs admin attention now?"
 */
const C = {
  teal:    "#06B6D4",
  tealL:   "rgba(6,182,212,0.12)",
  tealB:   "rgba(6,182,212,0.28)",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  border:  "rgba(0,0,0,0.05)",
  surface: "#FFFFFF",
  bg:      "#FFFFFF",
  green:   "#10B981",
  greenL:  "rgba(16,185,129,0.12)",
  amber:   "#F59E0B",
  amberL:  "rgba(245,158,11,0.12)",
  red:     "#F43F5E",
  redL:    "rgba(244,63,94,0.12)",
  blue:    "#3B82F6",
  blueL:   "rgba(59,130,246,0.12)",
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 20,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
      ...style,
    }}>{children}</div>
  )
}

function Label({ children, color = C.teal, bg = C.tealL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{children}</span>
  )
}

function StatCard({ value, label, sub, color }) {
  return (
    <Card style={{ flex: 1, padding: 16, textAlign: "center" }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24, fontWeight: 700, color: color || C.teal }}>{value}</div>
      <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>{sub}</div>}
    </Card>
  )
}

export default function OrgHome({ user, userData, onNavigate }) {
  const name      = userData?.name || user?.displayName || "Admin"
  const firstName = name.split(" ")[0]
  const orgType   = userData?.org_type || "college" // or "company"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  // Mock data — will connect to org analytics API
  const pendingApprovals = [
    { type: "Professor",  name: "Dr. Ramesh Kumar",    dept: "CS Department",        time: "1h ago"  },
    { type: "Student",    name: "Anika Sharma",         dept: "B.Tech 2024 Batch",    time: "3h ago"  },
    { type: "Recruiter",  name: "InfoSys Campus Team",  dept: "External Recruiter",   time: "1d ago"  },
  ]

  const alerts = orgType === "college" ? [
    { icon: "🎓", color: C.teal,  label: "14 new students joined",         sub: "B.Tech CSE 2024 batch",               action: "orgPeople"   },
    { icon: "⚠️", color: C.amber, label: "Cohort average ELO dropped 12%",  sub: "DBMS domain — needs task assignment",  action: "orgIntel"    },
    { icon: "🏆", color: C.green, label: "3 placement offers accepted",     sub: "Amazon, Flipkart, Juspay",             action: "orgIntel"    },
    { icon: "📋", color: C.blue,  label: "2 tasks pending professor review", sub: "Algorithms Lab · SQL Basics",          action: "orgTasks"    },
  ] : [
    { icon: "👥", color: C.teal,  label: "5 new verified engineers added",   sub: "Backend & DevOps",                    action: "orgPeople"   },
    { icon: "📊", color: C.amber, label: "Company ELO threshold reached",    sub: "Eligible for top badge",               action: "orgIntel"    },
    { icon: "🔗", color: C.red,   label: "ATS sync issue detected",          sub: "Greenhouse integration · Check now",   action: "orgSettings" },
    { icon: "🧪", color: C.blue,  label: "Assessment completion: 78%",       sub: "React Native challenge — 14 pending",  action: "orgTasks"    },
  ]

  const cohortStats = [
    { label: "Avg ELO",       value: "924",  color: C.teal  },
    { label: "Job Ready",     value: "38%",  color: C.green },
    { label: "Active Today",  value: "142",  color: C.blue  },
    { label: "Placements",    value: "67",   color: C.amber },
  ]

  return (
    <div style={{ background: `radial-gradient(ellipse at 20% 60%, rgba(255,87,1,0.05) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(255,87,1,0.03) 0%, transparent 45%), #FAF7F2`, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');`}</style>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>{greeting}, {firstName} · Admin Console</p>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 24, fontWeight: 800, color: C.ink, margin: "4px 0 0", lineHeight: 1.2 }}>
          What needs <span style={{ color: C.teal, fontStyle: "italic" }}>attention</span> now?
        </h1>
      </div>

      {/* ── Org health stats ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
        {cohortStats.map((s, i) => (
          <Card key={i} style={{ flex: "0 0 80px", padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* ── Priority alerts ──────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2, marginBottom: 10 }}>Alerts Needing Action</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div
              key={i}
              onClick={() => onNavigate(a.action)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${a.color}`, borderRadius: 12, cursor: "pointer" }}
            >
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{a.label}</div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 1 }}>{a.sub}</div>
              </div>
              <span style={{ color: C.ink4, fontSize: 16 }}>›</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending approvals ────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Pending Approvals</div>
          <Label>{pendingApprovals.length} waiting</Label>
        </div>
        {pendingApprovals.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < pendingApprovals.length - 1 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.tealL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.teal }}>
                {p.name.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{p.name}</div>
                <div style={{ fontSize: 11, color: C.ink4 }}>{p.type} · {p.dept}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ padding: "5px 12px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 8, color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Approve</button>
              <button style={{ padding: "5px 10px", background: "#FAF7F2", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
            </div>
          </div>
        ))}
        <button onClick={() => onNavigate("orgPeople")} style={{ marginTop: 12, width: "100%", padding: "10px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 10, color: C.teal, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          View All People →
        </button>
      </Card>

      {/* ── Quick admin nav ──────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { icon: "📊", label: "Intelligence", page: "orgIntel"    },
          { icon: "📋", label: "Tasks",         page: "orgTasks"    },
          { icon: "👥", label: "People",        page: "orgPeople"   },
          { icon: "⚙️", label: "Settings",      page: "orgSettings" },
        ].map((a) => (
          <button key={a.page} onClick={() => onNavigate(a.page)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.ink2, transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.teal}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          ><span style={{ fontSize: 18 }}>{a.icon}</span>{a.label}</button>
        ))}
      </div>
    </div>
  )
}
