/**
 * OrgPeople.jsx — Member directory, permissions, roles, and verification
 */
import { useState } from "react"

const C = {
  teal: "#0F766E", tealL: "#F0FDFA",
  ink: "#FFFFFF", ink2: "#3D3935", ink3: "#6B6560", ink4: "#A8A29E",
  border: "#E8E3DA", surface: "#fff", bg: "#F6F6F1",
  green: "#16A34A", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  blue: "#1D4ED8", blueL: "#EFF6FF",
}

const MEMBERS = [
  { name: "Anika Sharma",   role: "Student",    dept: "CS · B.Tech 2024", elo: 1847, verified: true,  status: "active"  },
  { name: "Dr. Ramesh Kumar",role: "Professor",  dept: "CS Department",    elo: null, verified: true,  status: "active"  },
  { name: "Kiran Reddy",    role: "Student",    dept: "IT · B.Tech 2025", elo: 1712, verified: true,  status: "active"  },
  { name: "Priya Nambiar",  role: "Student",    dept: "CS · B.Tech 2024", elo: 1680, verified: false, status: "active"  },
  { name: "InfoSys Recruiter",role: "Recruiter", dept: "External",         elo: null, verified: true,  status: "pending" },
  { name: "Rohan Verma",    role: "Student",    dept: "ECE · B.Tech 2024",elo: 1634, verified: false, status: "active"  },
]

const ROLE_COLOR = { Student: C.blue, Professor: C.teal, Recruiter: "#6D28D9", Admin: C.amber }
const ROLE_BG    = { Student: C.blueL, Professor: C.tealL, Recruiter: "#F4F0FF", Admin: C.amberL }

export default function OrgPeople({ user, userData }) {
  const [search, setSearch]     = useState("")
  const [roleFilter, setRole]   = useState("All")
  const [showInvite, setInvite] = useState(false)
  const [invite, setInviteForm] = useState({ email: "", role: "Student", dept: "" })

  const roles = ["All", "Student", "Professor", "Recruiter"]
  const filtered = MEMBERS
    .filter(m => (roleFilter === "All" || m.role === roleFilter))
    .filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.dept.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "DM Sans, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');`}</style>

      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
              People <span style={{ color: C.teal, fontStyle: "italic" }}>& Roles</span>
            </h1>
            <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 0" }}>Members, permissions, and verification state.</p>
          </div>
          <button onClick={() => setInvite(true)} style={{ padding: "10px 14px", background: C.teal, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>+ Invite</button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[
            { val: MEMBERS.filter(m => m.role === "Student").length,   label: "Students",   color: C.blue },
            { val: MEMBERS.filter(m => m.role === "Professor").length,  label: "Faculty",    color: C.teal },
            { val: MEMBERS.filter(m => m.status === "pending").length,  label: "Pending",    color: C.amber },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or department..."
          style={{ width: "100%", padding: "11px 14px", background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
          onFocus={e => e.target.style.borderColor = C.teal}
          onBlur={e => e.target.style.borderColor = C.border}
        />

        {/* Role filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {roles.map(r => (
            <button key={r} onClick={() => setRole(r)}
              style={{ padding: "6px 14px", borderRadius: 100, border: `1.5px solid ${roleFilter === r ? C.teal : C.border}`, background: roleFilter === r ? C.tealL : C.surface, color: roleFilter === r ? C.teal : C.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {filtered.map((m, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${m.status === "pending" ? C.amber + "60" : C.border}`, borderRadius: 16, padding: 14, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: ROLE_BG[m.role] || C.tealL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: ROLE_COLOR[m.role] || C.teal, flexShrink: 0 }}>
              {m.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                {m.verified && <span style={{ fontSize: 12, color: C.green, flexShrink: 0 }}>✓</span>}
                {m.status === "pending" && <span style={{ fontSize: 10, color: C.amber, background: C.amberL, padding: "1px 6px", borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>PENDING</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span style={{ padding: "1px 7px", background: ROLE_BG[m.role] || C.tealL, color: ROLE_COLOR[m.role] || C.teal, borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{m.role}</span>
                <span style={{ fontSize: 12, color: C.ink4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.dept}</span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {m.elo && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: C.teal }}>{m.elo}</div>}
              {m.status === "pending"
                ? <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                    <button style={{ padding: "4px 10px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 6, color: C.teal, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✓</button>
                    <button style={{ padding: "4px 10px", background: C.redL, border: `1px solid ${C.red}30`, borderRadius: 6, color: C.red, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
                  </div>
                : <button style={{ marginTop: 4, padding: "4px 10px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 6, color: C.ink3, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Manage</button>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setInvite(false)} />
          <div style={{ position: "relative", background: C.surface, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", zIndex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 16 }}>Invite Member</div>
            {[
              { label: "Email address", key: "email", type: "email", placeholder: "name@institution.edu" },
              { label: "Department",    key: "dept",  type: "text",  placeholder: "e.g. CS Department" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={invite[f.key]} onChange={e => setInviteForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "11px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>Role</div>
              <select value={invite.role} onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: "100%", padding: "11px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none" }}>
                {["Student", "Professor", "Recruiter", "Admin"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <button disabled={!invite.email} onClick={() => setInvite(false)}
              style={{ width: "100%", padding: "14px", background: invite.email ? C.teal : "#F3F4F6", border: "none", borderRadius: 12, color: invite.email ? "#fff" : C.ink4, fontSize: 15, fontWeight: 700, cursor: invite.email ? "pointer" : "not-allowed", fontFamily: "'DM Sans', sans-serif" }}>
              Send Invite →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
