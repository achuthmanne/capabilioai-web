/**
 * OrgTasks.jsx — Org assignment and challenge engine
 */
import { useState } from "react"

const C = {
  teal: "#0F766E", tealL: "#F0FDFA",
  ink: "#FFFFFF", ink2: "#374151", ink3: "#6B7280", ink4: "#9CA3AF",
  border: "#E5E7EB", surface: "#fff", bg: "#F6F6F1",
  green: "#16A34A", greenL: "#F0FDF4",
  amber: "#D97706", amberL: "#FFFBEB",
  red: "#DC2626", redL: "#FEF2F2",
  blue: "#1D4ED8", blueL: "#EFF6FF",
  purple: "#6D28D9", purpleL: "#F4F0FF",
}

const TASKS = [
  { id: 1, title: "DBMS Lab — SQL Joins",          type: "Lab",          by: "Dr. Ramesh Kumar", assigned: 142, completed: 89,  deadline: "14 Jun", status: "active"   },
  { id: 2, title: "Algorithms — Sorting Challenge", type: "Challenge",    by: "Prof. Meera S",    assigned: 98,  completed: 45,  deadline: "18 Jun", status: "active"   },
  { id: 3, title: "React Assessment — Company Task",type: "Assessment",   by: "Admin",            assigned: 67,  completed: 67,  deadline: "10 Jun", status: "complete" },
  { id: 4, title: "Python Basics — Refresher",      type: "Lab",          by: "Dr. Anand P",      assigned: 310, completed: 0,   deadline: "22 Jun", status: "draft"    },
]

const STATUS_COLOR = { active: C.teal, complete: C.green, draft: C.ink4 }
const STATUS_BG    = { active: C.tealL, complete: C.greenL, draft: "#F9FAFB" }

export default function OrgTasks({ user, userData }) {
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter]         = useState("all")
  const [form, setForm]             = useState({ title: "", type: "Lab", deadline: "", assignTo: "All Students" })

  const filtered = TASKS.filter(t => filter === "all" || t.status === filter)

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
              Tasks <span style={{ color: C.teal, fontStyle: "italic" }}>Engine</span>
            </h1>
            <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 0" }}>Create, assign, monitor, and evaluate challenges.</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{ padding: "10px 16px", background: C.teal, border: "none", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>+ New Task</button>
        </div>

        {/* Summary */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { val: TASKS.filter(t => t.status === "active").length,   label: "Active",   color: C.teal  },
            { val: TASKS.filter(t => t.status === "complete").length,  label: "Complete", color: C.green },
            { val: TASKS.filter(t => t.status === "draft").length,     label: "Draft",    color: C.ink4  },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["all", "active", "complete", "draft"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "6px 14px", borderRadius: 100, border: `1.5px solid ${filter === f ? C.teal : C.border}`, background: filter === f ? C.tealL : C.surface, color: filter === f ? C.teal : C.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize" }}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 24px" }}>
        {filtered.map(task => {
          const pct = task.assigned > 0 ? Math.round((task.completed / task.assigned) * 100) : 0
          return (
            <div key={task.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${STATUS_COLOR[task.status]}`, borderRadius: 16, padding: 18, marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1, paddingRight: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ padding: "2px 8px", background: STATUS_BG[task.status], color: STATUS_COLOR[task.status], borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{task.status.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: C.ink4 }}>{task.type}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>By {task.by} · Due {task.deadline}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: C.teal }}>{pct}%</div>
                  <div style={{ fontSize: 11, color: C.ink4 }}>done</div>
                </div>
              </div>
              <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, marginBottom: 8 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? C.green : C.teal, borderRadius: 99, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: C.ink4 }}>{task.completed}/{task.assigned} students completed</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {task.status !== "complete" && <button style={{ padding: "5px 12px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>}
                  <button style={{ padding: "5px 12px", background: C.tealL, border: `1px solid ${C.teal}30`, borderRadius: 8, color: C.teal, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Results →</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "flex-end" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCreate(false)} />
          <div style={{ position: "relative", background: C.surface, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", zIndex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 16 }}>Create New Task</div>
            {[
              { label: "Task Title", key: "title", type: "text", placeholder: "e.g. SQL Advanced Lab — Batch 2024" },
              { label: "Deadline",   key: "deadline", type: "date", placeholder: "" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>{f.label}</div>
                <input type={f.type} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                  style={{ width: "100%", padding: "11px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>Task Type</div>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: "100%", padding: "11px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none" }}>
                {["Lab", "Challenge", "Assessment", "Sponsored"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink3, marginBottom: 4 }}>Assign To</div>
              <select value={form.assignTo} onChange={e => setForm(p => ({ ...p, assignTo: e.target.value }))}
                style={{ width: "100%", padding: "11px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none" }}>
                {["All Students", "CS Department", "B.Tech 2024", "Specific Cohort"].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <button disabled={!form.title} onClick={() => setShowCreate(false)}
              style={{ width: "100%", padding: "14px", background: form.title ? C.teal : "#F3F4F6", border: "none", borderRadius: 12, color: form.title ? "#fff" : C.ink4, fontSize: 15, fontWeight: 700, cursor: form.title ? "pointer" : "not-allowed", fontFamily: "'Playfair Display', serif" }}>
              Create & Assign Task →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
