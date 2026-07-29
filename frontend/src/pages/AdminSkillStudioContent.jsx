/**
 * AdminSkillStudioContent.jsx — Skill Studio content/creator review console
 * (loop-closure work, 2026-07-29).
 *
 * Real gap this closes: backend/server/lib/skillStudio/contentQueue.js has a
 * complete generation_jobs review workflow (running → pending_review →
 * approved|rejected, plus edit/regenerate) backed by
 * skillStudioContentAdmin.js, but no frontend ever called it — the only way
 * to review a generated module draft was reading raw JSON via curl. This
 * page is that missing piece: a thin, production-grade client over the
 * existing, already-tested admin API. No new business logic, no new schema,
 * no new review state machine.
 *
 * Reachability: NOT in any nav — reached only via the direct URL
 * /admin/skill-studio-content (see App.jsx's pathname check), same pattern
 * as /admin/question-bank and /admin/ops-dashboard. Access control is
 * server-side (requireAuth + requireAdmin on every route this page calls);
 * a non-admin landing here just sees every request fail with 401/403,
 * surfaced as an honest error state.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioContentAdminApi } from "../lib/api"

const INK = "#1A1714", MUT = "#6B6560", BG = "#FAFAFA", SURF = "#FFFFFF", BDR = "rgba(17,24,39,0.08)"
const GREEN = "#16A34A", AMBER = "#D97706", RED = "#DC2626", P = "#6366F1"
const MONO = "'DM Mono','Fira Mono',monospace"

const STATUS_COLOR = { running: AMBER, pending_review: P, approved: GREEN, rejected: RED, failed: RED }

function Pill({ children, color = MUT }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color, background: `${color}18`, borderRadius: 999, padding: "3px 9px", fontFamily: MONO }}>
      {children}
    </span>
  )
}

function QualityFlags({ flags }) {
  if (!flags || flags.length === 0) {
    return <span style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>✓ No quality flags</span>
  }
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {flags.map((f) => <Pill key={f} color={AMBER}>{f.replace(/_/g, " ")}</Pill>)}
    </div>
  )
}

function LessonPreview({ lesson }) {
  if (!lesson) return <div style={{ fontSize: 12, color: MUT }}>No output yet.</div>
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>{lesson.title}</div>
        <div style={{ fontSize: 12.5, color: MUT, marginTop: 2 }}>{lesson.objective}</div>
      </div>
      {(lesson.sections || []).map((s, i) => (
        <div key={i} style={{ padding: "10px 12px", borderRadius: 8, background: SURF, border: `1px solid ${BDR}` }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 4 }}>{s.heading}</div>
          <div style={{ fontSize: 12, color: MUT, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{s.content}</div>
          {s.codeExample && (
            <pre style={{ fontSize: 11, background: "#1A1714", color: "#E5E7EB", padding: "8px 10px", borderRadius: 6, marginTop: 6, overflowX: "auto", fontFamily: MONO }}>{s.codeExample}</pre>
          )}
        </div>
      ))}
      {lesson.keyPoints?.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", marginBottom: 6 }}>Key points</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {lesson.keyPoints.map((k, i) => <li key={i} style={{ fontSize: 12, color: INK, marginBottom: 3 }}>{k}</li>)}
          </ul>
        </div>
      )}
      {lesson.practiceTask && (
        <div style={{ padding: "8px 12px", borderRadius: 8, background: `${P}0C`, border: `1px solid ${P}33`, fontSize: 12, color: INK }}>
          <b>Practice: </b>{lesson.practiceTask}
        </div>
      )}
    </div>
  )
}

function JobDetail({ id, onClose, onChanged, onAdvance }) {
  const [state, setState] = useState({ loading: true, error: null, data: null })
  const [rejectNotes, setRejectNotes] = useState("")
  const [approveNotes, setApproveNotes] = useState("")
  const [acting, setActing] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    skillStudioContentAdminApi.get(id)
      .then((res) => setState({ loading: false, error: null, data: res.job }))
      .catch((e) => setState({ loading: false, error: e.data?.error || e.message || "Failed to load job", data: null }))
  }, [id])

  useEffect(() => { load() }, [load])

  const act = async (label, fn, { advance = false } = {}) => {
    setActing(label); setActionError(null)
    try {
      await fn()
      onChanged()
      if (advance && onAdvance) { setRejectNotes(""); setApproveNotes(""); onAdvance() } else load()
    } catch (e) {
      setActionError(e.data?.error || e.message || "Action failed")
    } finally {
      setActing(null)
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "flex-end", zIndex: 200 }} onClick={onClose}>
      <div style={{ width: 620, maxWidth: "100%", height: "100%", background: BG, overflowY: "auto", padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: MUT, fontSize: 13, cursor: "pointer", marginBottom: 12, fontFamily: "inherit" }}>← Close</button>

        {state.loading && <div style={{ color: MUT, fontSize: 13 }}>Loading…</div>}
        {state.error && <div style={{ color: RED, fontSize: 13 }}>{state.error}</div>}

        {state.data && (() => {
          const job = state.data
          const output = job.output_ref
          return (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <Pill color={STATUS_COLOR[job.status] || MUT}>{job.status}</Pill>
                <Pill>{job.job_type}</Pill>
                {job.input_ref?.skillName && <Pill color={P}>{job.input_ref.skillName}</Pill>}
                <Pill>v{job.version || 1}</Pill>
                {output?.generatedBy && <Pill>{output.generatedBy}</Pill>}
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", marginBottom: 6 }}>Quality flags</div>
                <QualityFlags flags={job.quality_flags} />
              </div>

              {job.error && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: `${RED}12`, border: `1px solid ${RED}44`, color: RED, fontSize: 12, marginBottom: 14 }}>
                  Generation error: {job.error}
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", marginBottom: 8 }}>Draft preview</div>
                <LessonPreview lesson={output?.lesson} />
              </div>

              {actionError && <div style={{ color: RED, fontSize: 12, marginBottom: 10 }}>{actionError}</div>}

              {job.status === "pending_review" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Approval notes (optional)"
                      style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 12 }} />
                    <button disabled={!!acting} onClick={() => act("approve", () => skillStudioContentAdminApi.approve(job.id, approveNotes || undefined), { advance: true })}
                      style={{ padding: "8px 16px", background: GREEN, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {acting === "approve" ? "Publishing…" : "Approve & publish"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} placeholder="Rejection reason (required)"
                      style={{ flex: 1, minWidth: 160, padding: "8px 10px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 12 }} />
                    <button disabled={!!acting || !rejectNotes.trim()} onClick={() => act("reject", () => skillStudioContentAdminApi.reject(job.id, rejectNotes), { advance: true })}
                      style={{ padding: "8px 16px", background: rejectNotes.trim() ? RED : `${RED}55`, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: rejectNotes.trim() ? "pointer" : "not-allowed" }}>
                      {acting === "reject" ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                  <div>
                    <button disabled={!!acting} onClick={() => act("regenerate", () => skillStudioContentAdminApi.regenerate(job.id, "Regenerated from admin console"))}
                      style={{ padding: "8px 16px", background: SURF, color: P, border: `1px solid ${P}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      {acting === "regenerate" ? "Regenerating…" : "Regenerate draft"}
                    </button>
                  </div>
                </div>
              )}
              {job.status === "failed" && (
                <div style={{ marginBottom: 20 }}>
                  <button disabled={!!acting} onClick={() => act("regenerate", () => skillStudioContentAdminApi.regenerate(job.id, "Retried after failure"))}
                    style={{ padding: "8px 16px", background: SURF, color: P, border: `1px solid ${P}`, borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    {acting === "regenerate" ? "Retrying…" : "Retry generation"}
                  </button>
                </div>
              )}
              {["approved", "rejected"].includes(job.status) && (
                <div style={{ fontSize: 12, color: MUT, marginBottom: 20 }}>
                  {job.status === "approved" ? "Published — live in modules/module_content_blocks. No further action available here." : "Rejected — no further action available here."}
                </div>
              )}

              {job.reviews?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Review / version history</div>
                  {job.reviews.map((r) => (
                    <div key={r.id} style={{ fontSize: 11, color: MUT, marginBottom: 4 }}>
                      {new Date(r.created_at).toLocaleString()} — <b style={{ color: INK }}>{r.decision}</b>{r.notes ? ` — ${r.notes}` : ""}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function GenerateForm({ onGenerated }) {
  const [skillName, setSkillName] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [level, setLevel] = useState("intermediate")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    if (!skillName.trim()) return
    setBusy(true); setError(null)
    try {
      const res = await skillStudioContentAdminApi.generate({ skillName: skillName.trim(), jobTitle: jobTitle.trim() || undefined, level })
      setSkillName(""); setJobTitle("")
      onGenerated(res.job)
    } catch (e) {
      setError(e.data?.error || e.message || "Generation failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, background: SURF, border: `1px solid ${BDR}`, marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: MUT, textTransform: "uppercase", marginBottom: 10 }}>Request a new module draft</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="Skill (e.g. React Hooks)"
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13, minWidth: 180 }} />
        <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Target role (optional)"
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13, minWidth: 160 }} />
        <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13 }}>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button onClick={submit} disabled={busy || !skillName.trim()}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: busy ? BDR : P, color: busy ? MUT : "#fff", fontSize: 12, fontWeight: 700, cursor: busy ? "default" : "pointer" }}>
          {busy ? "Generating…" : "Generate draft"}
        </button>
      </div>
      {error && <div style={{ color: RED, fontSize: 12, marginTop: 8 }}>{error}</div>}
    </div>
  )
}

export default function AdminSkillStudioContent({ user }) {
  const [status, setStatus] = useState("pending_review")
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState(null)
  const [openId, setOpenId] = useState(null)

  const loadList = useCallback(() => {
    setLoading(true); setListError(null)
    skillStudioContentAdminApi.list({ status: status || undefined, limit: 50 })
      .then((res) => setRows(res.jobs || []))
      .catch((e) => setListError(e.data?.error || e.message || "Failed to load the content queue"))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => { loadList() }, [loadList])

  if (!user) {
    return <div style={{ padding: 40, textAlign: "center", color: MUT }}>Sign in as an admin to use this page.</div>
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "DM Sans, system-ui, sans-serif", padding: "24px 32px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Internal · Skill Studio Content Ops</div>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 800, color: INK, margin: "4px 0 18px" }}>Content Review Queue</h1>

        <GenerateForm onGenerated={() => { loadList(); }} />

        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${BDR}`, fontSize: 13 }}>
            <option value="">All statuses</option>
            <option value="running">Running</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </select>
          <div style={{ alignSelf: "center", fontSize: 12, color: MUT }}>{rows.length} job{rows.length !== 1 ? "s" : ""}</div>
        </div>

        {listError && <div style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{listError}</div>}
        {loading && <div style={{ color: MUT, fontSize: 13 }}>Loading…</div>}
        {!loading && !listError && rows.length === 0 && <div style={{ color: MUT, fontSize: 13 }}>No jobs match this filter.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((j) => (
            <button key={j.id} onClick={() => setOpenId(j.id)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, background: SURF, border: `1px solid ${BDR}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
              <Pill color={STATUS_COLOR[j.status] || MUT}>{j.status}</Pill>
              <span style={{ fontSize: 13, color: INK, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {j.input_ref?.skillName || j.job_type} <span style={{ color: MUT }}>· {j.input_ref?.level || ""}</span>
              </span>
              {j.quality_flags?.length > 0 && <Pill color={AMBER}>{j.quality_flags.length} flag{j.quality_flags.length !== 1 ? "s" : ""}</Pill>}
              <span style={{ fontSize: 11, color: MUT, fontFamily: MONO }}>v{j.version || 1}</span>
            </button>
          ))}
        </div>
      </div>

      {openId && (
        <JobDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => loadList()}
          onAdvance={() => {
            const i = rows.findIndex((r) => r.id === openId)
            const next = rows[i + 1]
            if (next) setOpenId(next.id)
            else setOpenId(null)
          }}
        />
      )}
    </div>
  )
}
