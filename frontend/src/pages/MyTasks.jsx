import { useState, useEffect, useCallback } from "react"
import { candidateTasksApi } from "../lib/api"

// Recruiter-Assigned Tasks — 2026-08-06
// ---------------------------------------------------------------------------
// A recruiter on the separate capabilio-recruiter product can assign a
// candidate a freeform task/challenge. This page is the candidate's inbox
// for those, reached via /api/candidate/tasks (backend/server/routes/
// candidateTasks.js), which calls into capabilio-recruiter-backend
// server-to-server. This is deliberately NOT part of Arena/ELO/Skill Studio
// — no automated pass/fail happens here, a human recruiter reviews every
// submission on their side. It's also a different feature from the
// institution task inbox at /college/me/tasks; that one is college-assigned,
// this one is company/recruiter-assigned.

const STAGE_META = {
  assigned:     { label: "Assigned",     color: "#8a8578", bg: "#F2EFE9" },
  started:      { label: "In progress",  color: "#3B82F6", bg: "#EAF1FF" },
  submitted:    { label: "Submitted",    color: "#6D5CE0", bg: "#EFECFC" },
  evaluated:    { label: "Under review", color: "#DC8B18", bg: "#FCEFDD" },
  passed:       { label: "Passed",       color: "#2FAE7A", bg: "#E6F7EF" },
  failed:       { label: "Not selected", color: "#E0574F", bg: "#FBE9E8" },
  needs_review: { label: "Under review", color: "#DC8B18", bg: "#FCEFDD" },
}

function TaskCard({ task, onSubmit }) {
  const meta = STAGE_META[task.status] || STAGE_META.assigned
  const canSubmit = task.status === "assigned" || task.status === "started"
  const [text, setText] = useState(task.submission_text || "")
  const [url, setUrl] = useState(task.submission_url || "")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const submit = async () => {
    if (!text.trim() && !url.trim()) { setErr("Add some text or a link before submitting."); return }
    setSaving(true); setErr(null)
    try {
      await onSubmit(task.id, text.trim(), url.trim())
      setOpen(false)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #E8E3DA", borderRadius: 14, padding: 18, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#20180E" }}>{task.title}</div>
          <div style={{ fontSize: 12, color: "#8a8578", marginTop: 2 }}>{task.company_name || "A company"}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.color}30`, borderRadius: 7, padding: "3px 9px", whiteSpace: "nowrap" }}>
          {meta.label}
        </span>
      </div>

      {task.description && (
        <div style={{ fontSize: 13, color: "#4A4436", marginTop: 10, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{task.description}</div>
      )}

      {task.status !== "assigned" && task.status !== "started" && (task.submission_text || task.submission_url) && (
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#F7F5F0", border: "1px solid #E8E3DA", borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", marginBottom: 4 }}>YOUR SUBMISSION</div>
          {task.submission_text && <div style={{ fontSize: 12.5, color: "#4A4436", whiteSpace: "pre-wrap" }}>{task.submission_text}</div>}
          {task.submission_url && <a href={task.submission_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "#3B82F6", display: "block", marginTop: 4 }}>{task.submission_url}</a>}
          {task.evaluator_notes && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #E8E3DA" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", marginBottom: 4 }}>RECRUITER NOTES</div>
              <div style={{ fontSize: 12.5, color: "#4A4436" }}>{task.evaluator_notes}</div>
            </div>
          )}
        </div>
      )}

      {canSubmit && (
        <div style={{ marginTop: 12 }}>
          {!open ? (
            <button onClick={() => setOpen(true)} style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", background: "#20180E", color: "#F7F2EA", border: "none", borderRadius: 9, cursor: "pointer" }}>
              Submit your work
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe what you built / your answer..."
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E3DA", fontSize: 13, minHeight: 80, resize: "vertical", fontFamily: "inherit" }} />
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Optional link (repo, deployed demo, doc)..."
                style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #E8E3DA", fontSize: 13, fontFamily: "inherit" }} />
              {err && <div style={{ fontSize: 12, color: "#E0574F" }}>{err}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submit} disabled={saving} style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", background: "#20180E", color: "#F7F2EA", border: "none", borderRadius: 9, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Submitting..." : "Submit"}
                </button>
                <button onClick={() => setOpen(false)} style={{ fontSize: 12, fontWeight: 700, padding: "8px 16px", background: "transparent", color: "#8a8578", border: "1px solid #E8E3DA", borderRadius: 9, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// How-it-works explainer — shown whenever there are no tasks to display,
// whether that's because no recruiter has been granted access yet, or
// (2026-08-07) because the request itself failed for a technical reason
// (e.g. the partner bridge being unreachable/misconfigured). Students should
// never see a raw error string or an env-var name here — this is a candidate
// -facing page, not a debug console. Genuine failures are still logged to
// the browser console (see `load()` below) so support/engineering can
// diagnose them from a bug report, they're just never rendered on-screen.
function HowItWorks() {
  const steps = [
    { icon: "🔍", title: "Recruiters browse Capabilio", body: "Companies search for candidates by skill, domain, and how active they are in Arena, Skill Studio, and AI interviews — not by resume keywords." },
    { icon: "🤝", title: "They request access to you", body: "When a recruiter wants to work with a specific candidate, they request contact access. For students, your college's placement cell reviews and approves that request first." },
    { icon: "📋", title: "Real work shows up here", body: "Once access is approved, a recruiter can assign you an actual work sample tied to a role they're hiring for. A human reviews every submission — nothing here is auto-graded." },
  ]
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ color: "#8a8578", fontSize: 14, textAlign: "center", padding: "12px 0 4px" }}>
        No tasks yet — here&apos;s how a recruiter task ends up in this list.
      </div>
      {steps.map((s) => (
        <div key={s.title} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#fff", border: "1px solid #E8E3DA", borderRadius: 14, padding: "16px 18px" }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: "#20180E" }}>{s.title}</div>
            <div style={{ fontSize: 12.5, color: "#4A4436", marginTop: 3, lineHeight: 1.55 }}>{s.body}</div>
          </div>
        </div>
      ))}
      <div style={{ fontSize: 12, color: "#8a8578", textAlign: "center", marginTop: 4 }}>
        The best way to show up in a recruiter&apos;s search: keep practicing in Arena and Skill Studio.
      </div>
    </div>
  )
}

export default function MyTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await candidateTasksApi.list()
      setTasks(res.tasks || [])
    } catch (e) {
      // Never surface this to the candidate (see HowItWorks comment above) —
      // log for diagnosis and fall back to the same empty/explainer state a
      // genuinely task-free candidate would see.
      console.error("[MyTasks] couldn't load tasks:", e.message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSubmit = async (id, submissionText, submissionUrl) => {
    await candidateTasksApi.submit(id, submissionText, submissionUrl)
    await load()
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#20180E", margin: 0 }}>Tasks from Companies</h1>
        <p style={{ fontSize: 13, color: "#8a8578", marginTop: 4 }}>
          Real work samples assigned by recruiters who found you through Capabilio. Every submission is reviewed by a human — nothing here is auto-graded.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#8a8578", fontSize: 13, textAlign: "center", padding: "40px 0" }}>Loading...</div>
      ) : tasks.length === 0 ? (
        <HowItWorks />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map((t) => <TaskCard key={t.id} task={t} onSubmit={handleSubmit} />)}
        </div>
      )}
    </div>
  )
}
