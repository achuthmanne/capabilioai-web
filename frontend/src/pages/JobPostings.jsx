/**
 * JobPostings.jsx — Job posting management
 * Primary flow: create and manage open roles, track per-role pipeline counts.
 * Used by recruiters and hiring managers to control what's live.
 */
import { useState } from "react"

const C = {
  indigo:  "#4F46E5",
  indigoL: "#EEF2FF",
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
  ink:     "#FFFFFF",
  ink2:    "#374151",
  ink3:    "#6B7280",
  ink4:    "#9CA3AF",
  border:  "#E5E7EB",
  surface: "#FFFFFF",
  bg:      "#F5F5F0",
}

// ── Data ──────────────────────────────────────────────────────────────────────

const INITIAL_POSTINGS = [
  {
    id: 1,
    title:      "Senior Backend Engineer",
    dept:       "Engineering",
    type:       "Full-time",
    location:   "Remote · India",
    status:     "open",
    postedDate: "May 20, 2026",
    deadline:   "Jul 1, 2026",
    pipeline:   { applied: 34, screening: 8, interview: 5, offer: 1, hired: 0 },
    description: "Build and scale distributed services powering our core platform. 5+ yrs Go or Python required.",
    skills:     ["Go", "Python", "PostgreSQL", "Distributed Systems", "AWS"],
  },
  {
    id: 2,
    title:      "Product Designer",
    dept:       "Design",
    type:       "Full-time",
    location:   "Bengaluru / Remote",
    status:     "open",
    postedDate: "May 28, 2026",
    deadline:   "Jun 30, 2026",
    pipeline:   { applied: 21, screening: 6, interview: 2, offer: 0, hired: 0 },
    description: "Own end-to-end design for our recruiter and professional user experiences.",
    skills:     ["Figma", "Design Systems", "User Research", "Prototyping"],
  },
  {
    id: 3,
    title:      "Data Scientist",
    dept:       "ML Platform",
    type:       "Full-time",
    location:   "Remote · India",
    status:     "open",
    postedDate: "Jun 3, 2026",
    deadline:   "Jul 15, 2026",
    pipeline:   { applied: 18, screening: 0, interview: 0, offer: 0, hired: 0 },
    description: "Build ML models for skill scoring, job matching, and career trajectory prediction.",
    skills:     ["Python", "PyTorch", "MLflow", "SQL", "BigQuery"],
  },
  {
    id: 4,
    title:      "Frontend Engineer",
    dept:       "Engineering",
    type:       "Full-time",
    location:   "Remote · India",
    status:     "closed",
    postedDate: "May 10, 2026",
    deadline:   "Jun 4, 2026",
    pipeline:   { applied: 29, screening: 12, interview: 7, offer: 2, hired: 1 },
    description: "Build performant React experiences for students and professionals.",
    skills:     ["React", "TypeScript", "GraphQL", "CSS"],
  },
  {
    id: 5,
    title:      "Engineering Manager — Platform",
    dept:       "Engineering",
    type:       "Full-time",
    location:   "Bengaluru",
    status:     "draft",
    postedDate: null,
    deadline:   null,
    pipeline:   { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 },
    description: "Lead the platform engineering team. 8+ yrs experience, 3+ in management.",
    skills:     ["System Design", "People Management", "Backend"],
  },
]

const STATUS_META = {
  open:   { label: "Live",   color: C.green,  bg: C.greenL  },
  closed: { label: "Closed", color: C.ink4,   bg: "#F3F4F6" },
  draft:  { label: "Draft",  color: C.amber,  bg: C.amberL  },
}

const DEPT_COLOR = {
  "Engineering": C.indigo,
  "Design":      C.purple,
  "ML Platform": C.blue,
}

const FILTERS = ["All", "Live", "Draft", "Closed"]

const EMPTY_FORM = {
  title: "", dept: "Engineering", type: "Full-time",
  location: "", description: "", skills: "",
}

// ── Posting card ──────────────────────────────────────────────────────────────

function PostingCard({ posting, onTap }) {
  const meta      = STATUS_META[posting.status]
  const total     = Object.values(posting.pipeline).reduce((a, b) => a + b, 0)
  const hired     = posting.pipeline.hired
  const deptColor = DEPT_COLOR[posting.dept] || C.indigo

  return (
    <div
      onClick={() => onTap(posting)}
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "16px 16px 14px",
        marginBottom: 10,
        cursor: "pointer",
        opacity: posting.status === "closed" ? 0.75 : 1,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, paddingRight: 10 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>
            {posting.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: deptColor, background: deptColor + "15",
              padding: "2px 8px", borderRadius: 6,
            }}>
              {posting.dept}
            </span>
            <span style={{ fontSize: 12, color: C.ink4 }}>{posting.type}</span>
          </div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: meta.color, background: meta.bg,
          padding: "4px 10px", borderRadius: 100,
          flexShrink: 0,
        }}>
          {meta.label}
        </span>
      </div>

      {/* Location */}
      <div style={{ fontSize: 12, color: C.ink4, marginBottom: 10 }}>
        📍 {posting.location || "Location TBD"}
        {posting.deadline && (
          <span style={{ marginLeft: 12 }}>⏰ Closes {posting.deadline}</span>
        )}
      </div>

      {/* Pipeline mini-bar */}
      {posting.status !== "draft" && total > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", height: 6, borderRadius: 99, overflow: "hidden", gap: 1 }}>
            {[
              { key: "applied",   color: C.indigo },
              { key: "screening", color: C.blue   },
              { key: "interview", color: C.purple },
              { key: "offer",     color: C.amber  },
              { key: "hired",     color: C.green  },
            ].map(({ key, color }) => {
              const val = posting.pipeline[key]
              if (!val) return null
              return (
                <div
                  key={key}
                  style={{
                    flex: val,
                    background: color,
                    borderRadius: 99,
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {posting.status !== "draft" ? (
          <>
            <span style={{ fontSize: 12, color: C.ink3, fontWeight: 600 }}>
              <span style={{ color: C.ink, fontWeight: 700 }}>{total}</span> applicants
            </span>
            {hired > 0 && (
              <>
                <div style={{ width: 1, height: 12, background: C.border }} />
                <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>
                  ✓ {hired} hired
                </span>
              </>
            )}
          </>
        ) : (
          <span style={{ fontSize: 12, color: C.amber, fontWeight: 600 }}>Not published yet</span>
        )}
        {posting.postedDate && (
          <span style={{ fontSize: 12, color: C.ink4, marginLeft: "auto" }}>
            Posted {posting.postedDate}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Detail sheet ──────────────────────────────────────────────────────────────

function PostingDetail({ posting, onClose, onPublish, onClose2 }) {
  if (!posting) return null
  const meta  = STATUS_META[posting.status]
  const total = Object.values(posting.pipeline).reduce((a, b) => a + b, 0)

  const stages = [
    { label: "Applied",   key: "applied",   color: C.indigo },
    { label: "Screening", key: "screening", color: C.blue   },
    { label: "Interview", key: "interview", color: C.purple },
    { label: "Offer",     key: "offer",     color: C.amber  },
    { label: "Hired",     key: "hired",     color: C.green  },
  ]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "relative", background: C.surface,
        borderRadius: "20px 20px 0 0",
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border }} />
        </div>

        <div style={{ padding: "8px 20px 32px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ flex: 1, paddingRight: 12 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, letterSpacing: "-0.4px", lineHeight: 1.2 }}>
                {posting.title}
              </div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 4 }}>
                {posting.dept} · {posting.type} · {posting.location || "TBD"}
              </div>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: meta.color, background: meta.bg,
              padding: "4px 12px", borderRadius: 100,
              flexShrink: 0,
            }}>
              {meta.label}
            </span>
          </div>

          {/* Description */}
          <div style={{
            fontSize: 13, color: C.ink2, lineHeight: 1.6,
            padding: "12px 14px", background: "#F9FAFB",
            borderRadius: 12, marginBottom: 16,
          }}>
            {posting.description}
          </div>

          {/* Skills */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink4, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Required Skills
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {posting.skills.map((s, i) => (
                <span key={i} style={{
                  padding: "5px 12px", borderRadius: 8,
                  background: C.indigoL, color: C.indigo,
                  fontSize: 13, fontWeight: 600,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Pipeline breakdown */}
          {posting.status !== "draft" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.ink4, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Pipeline — {total} total
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stages.map(({ label, key, color }) => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 70, fontSize: 12, fontWeight: 600, color: C.ink3 }}>{label}</div>
                    <div style={{ flex: 1, height: 8, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
                      {total > 0 && (
                        <div style={{
                          width: `${(posting.pipeline[key] / total) * 100}%`,
                          height: "100%", background: color, borderRadius: 99,
                        }} />
                      )}
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color, width: 24, textAlign: "right" }}>
                      {posting.pipeline[key]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {posting.status === "draft" && (
              <button
                onClick={() => { onPublish(posting.id); onClose() }}
                style={{
                  width: "100%", padding: 15,
                  background: C.green, border: "none",
                  borderRadius: 14, color: "#fff",
                  fontSize: 15, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                Publish Role →
              </button>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{
                flex: 1, padding: "12px 0",
                background: C.indigoL,
                border: `1.5px solid ${C.indigo}30`,
                borderRadius: 12, color: C.indigo,
                fontSize: 13, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                ✏️ Edit Role
              </button>
              {posting.status === "open" && (
                <button
                  onClick={() => { onClose2(posting.id); onClose() }}
                  style={{
                    flex: 1, padding: "12px 0",
                    background: "#F9FAFB",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12, color: C.ink3,
                    fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Close Role
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create role form ───────────────────────────────────────────────────────────

function CreateRoleForm({ onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))
  const valid = form.title.trim() && form.location.trim()

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "relative", background: C.surface,
        borderRadius: "20px 20px 0 0",
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border }} />
        </div>
        <div style={{ padding: "8px 20px 40px" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, letterSpacing: "-0.4px", marginBottom: 20 }}>
            New Role
          </div>

          {[
            { label: "Job Title *",    key: "title",       placeholder: "e.g. Senior Backend Engineer" },
            { label: "Location *",     key: "location",    placeholder: "e.g. Remote · India"          },
            { label: "Description",    key: "description", placeholder: "What will they build?",       textarea: true },
            { label: "Required Skills",key: "skills",      placeholder: "Go, PostgreSQL, AWS (comma-separated)" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>{f.label}</div>
              {f.textarea ? (
                <textarea
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{
                    width: "100%", padding: "11px 14px",
                    background: "#F9FAFB",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12, fontSize: 14,
                    fontFamily: "inherit", color: C.ink,
                    outline: "none", resize: "none",
                  }}
                />
              ) : (
                <input
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{
                    width: "100%", padding: "11px 14px",
                    background: "#F9FAFB",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12, fontSize: 14,
                    fontFamily: "inherit", color: C.ink,
                    outline: "none",
                  }}
                />
              )}
            </div>
          ))}

          {/* Dept + Type row */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Department", key: "dept", opts: ["Engineering", "Design", "ML Platform", "Product", "Operations"] },
              { label: "Type",       key: "type", opts: ["Full-time", "Contract", "Internship"] },
            ].map(f => (
              <div key={f.key} style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, marginBottom: 6 }}>{f.label}</div>
                <select
                  value={form[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  style={{
                    width: "100%", padding: "11px 10px",
                    background: "#F9FAFB",
                    border: `1.5px solid ${C.border}`,
                    borderRadius: 12, fontSize: 13,
                    fontFamily: "inherit", color: C.ink,
                    outline: "none",
                  }}
                >
                  {f.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              disabled={!valid}
              onClick={() => { onSave({ ...form, status: "draft" }); onClose() }}
              style={{
                flex: 1, padding: 15,
                background: valid ? "#F9FAFB" : "#F3F4F6",
                border: `1.5px solid ${C.border}`,
                borderRadius: 14,
                color: valid ? C.ink3 : C.ink4,
                fontSize: 14, fontWeight: 700,
                cursor: valid ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Save as Draft
            </button>
            <button
              disabled={!valid}
              onClick={() => { onSave({ ...form, status: "open" }); onClose() }}
              style={{
                flex: 1, padding: 15,
                background: valid ? C.indigo : "#F3F4F6",
                border: "none",
                borderRadius: 14,
                color: valid ? "#fff" : C.ink4,
                fontSize: 14, fontWeight: 700,
                cursor: valid ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Publish →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function JobPostings({ user, userData, onNavigate }) {
  const [postings,    setPostings]    = useState(INITIAL_POSTINGS)
  const [filter,      setFilter]      = useState("All")
  const [selected,    setSelected]    = useState(null)
  const [showCreate,  setShowCreate]  = useState(false)

  const filtered = postings.filter(p => {
    if (filter === "All")    return true
    if (filter === "Live")   return p.status === "open"
    if (filter === "Draft")  return p.status === "draft"
    if (filter === "Closed") return p.status === "closed"
    return true
  })

  const publishPosting = (id) => setPostings(prev => prev.map(p => p.id === id ? { ...p, status: "open", postedDate: "Jun 6, 2026" } : p))
  const closePosting   = (id) => setPostings(prev => prev.map(p => p.id === id ? { ...p, status: "closed" } : p))

  const addPosting = (form) => {
    const skillList = form.skills.split(",").map(s => s.trim()).filter(Boolean)
    setPostings(prev => [{
      id: Date.now(),
      title: form.title, dept: form.dept, type: form.type,
      location: form.location, status: form.status,
      postedDate: form.status === "open" ? "Jun 6, 2026" : null,
      deadline: null,
      pipeline: { applied: 0, screening: 0, interview: 0, offer: 0, hired: 0 },
      description: form.description,
      skills: skillList,
    }, ...prev])
  }

  const counts = {
    live:   postings.filter(p => p.status === "open").length,
    draft:  postings.filter(p => p.status === "draft").length,
    closed: postings.filter(p => p.status === "closed").length,
  }

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "Inter, -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Sticky header ──────────────────────────────────────── */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: "20px 16px 0",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: C.ink, margin: 0, letterSpacing: "-0.4px" }}>
            Job Postings
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              padding: "9px 16px",
              background: C.indigo, border: "none",
              borderRadius: 10, color: "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            + New Role
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {FILTERS.map(f => {
            const active = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "10px 14px",
                border: "none",
                borderBottom: active ? `2px solid ${C.indigo}` : "2px solid transparent",
                borderTop: "2px solid transparent",
                background: "transparent",
                color: active ? C.indigo : C.ink4,
                fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}>
                {f}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── KPI strip ──────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, padding: "16px 16px 0" }}>
        {[
          { value: counts.live,   label: "Live Roles",   color: C.green  },
          { value: counts.draft,  label: "Drafts",       color: C.amber  },
          { value: counts.closed, label: "Closed",       color: C.ink4   },
          { value: postings.reduce((s, p) => s + Object.values(p.pipeline).reduce((a, b) => a + b, 0), 0), label: "Total Applicants", color: C.indigo },
        ].map((k, i) => (
          <div key={i} style={{
            flex: 1,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "12px 8px",
            textAlign: "center",
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: k.color }}>
              {k.value}
            </div>
            <div style={{ fontSize: 10, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 4, lineHeight: 1.3 }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Postings list ──────────────────────────────────────── */}
      <div style={{ padding: "16px 16px 80px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: C.ink4 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 14 }}>No {filter.toLowerCase()} postings</div>
          </div>
        ) : (
          filtered.map(p => (
            <PostingCard key={p.id} posting={p} onTap={setSelected} />
          ))
        )}
      </div>

      {/* ── Detail sheet ───────────────────────────────────────── */}
      {selected && (
        <PostingDetail
          posting={selected}
          onClose={() => setSelected(null)}
          onPublish={publishPosting}
          onClose2={closePosting}
        />
      )}

      {/* ── Create form ────────────────────────────────────────── */}
      {showCreate && (
        <CreateRoleForm
          onClose={() => setShowCreate(false)}
          onSave={addPosting}
        />
      )}
    </div>
  )
}
