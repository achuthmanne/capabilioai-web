/**
 * StudentCollegePage.jsx — student-facing task inbox + proctored assessments (2026-08-02)
 *
 * Task inbox closes a real, previously-shipped-but-broken gap: professors/
 * admins could publish a task in Institution OS and target it at a batch,
 * department, or a Group, but no student anywhere in the app could ever see
 * it (org_tasks had zero student-facing readers). Nav entry only shown when
 * GET /college/me/tasks reports the student is actually linked to an org
 * (see App.jsx), so non-college students never see an empty tab.
 *
 * Deliberately read-only for tasks: there is no submission/completion
 * tracking table anywhere in the schema (org_tasks.submission_count /
 * total_assigned are static columns nothing ever writes to). Building that
 * is a separate, real feature — not silently implied here.
 *
 * Proctored assessments (placement-day parity, closes a TapTap/Blackbucks
 * gap): honestly scoped as integrity monitoring — fullscreen-exit / tab-
 * switch / copy-paste detection during a timed window — not live video
 * invigilation, which would need a third-party service.
 */
import { useState, useEffect, useCallback, useRef } from "react"
import { collegeApi } from "../lib/api"

const T = {
  ink: "#1A1714", ink3: "#475569", ink4: "#A8A29E",
  border: "rgba(0,0,0,0.08)", surface: "#FFFFFF", bg: "#FAF7F2",
  teal: "#06B6D4", tealL: "rgba(6,182,212,0.12)",
  amber: "#F59E0B", amberL: "rgba(245,158,11,0.12)",
  red: "#F43F5E", redL: "rgba(244,63,94,0.12)",
  green: "#10B981", greenL: "rgba(16,185,129,0.12)",
}

const PRIORITY_META = {
  urgent: { label: "Urgent", color: T.red,   bg: T.redL },
  high:   { label: "High",   color: T.amber, bg: T.amberL },
  medium: { label: "Medium", color: T.teal,  bg: T.tealL },
  low:    { label: "Low",    color: T.ink4,  bg: "rgba(168,162,158,0.12)" },
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function StudentCollegePage({ onBack }) {
  const [tasks, setTasks]     = useState([])
  const [drives, setDrives]   = useState([])
  const [institutionId, setInstitutionId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [activeDrive, setActiveDrive] = useState(null) // drive currently in the lockdown gate

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [taskRes, driveRes] = await Promise.all([collegeApi.getMyTasks(), collegeApi.getMyDrives()])
      setTasks(taskRes?.tasks || [])
      setDrives(driveRes?.drives || [])
      setInstitutionId(driveRes?.institutionId || null)
      setError(null)
    } catch (e) {
      setError(e.message || "Could not load your college info")
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const overdue = tasks.filter(t => isOverdue(t.due_date))
  const upcoming = tasks.filter(t => !isOverdue(t.due_date))

  if (activeDrive) {
    return (
      <LockdownGate
        drive={activeDrive}
        institutionId={institutionId}
        onExit={() => { setActiveDrive(null); load() }}
      />
    )
  }

  return (
    <div style={{ background: T.bg, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 40px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: T.ink, margin: "4px 0 4px" }}>College</h1>
        <p style={{ fontSize: 13, color: T.ink3, margin: "0 0 20px" }}>Tasks assigned to you and any proctored placement assessments open right now.</p>

        {loading ? (
          <div style={{ fontSize: 13, color: T.ink4, padding: 20 }}>Loading…</div>
        ) : error ? (
          <div style={{ fontSize: 13, color: T.red, padding: 16, background: T.redL, borderRadius: 12 }}>
            {error} <button onClick={load} style={{ marginLeft: 8, fontSize: 12, color: T.teal, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Retry</button>
          </div>
        ) : (
          <>
            {drives.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Proctored Assessments</div>
                {drives.map(d => <DriveCard key={d.id} drive={d} onStart={() => setActiveDrive(d)} />)}
                <div style={{ fontSize: 11, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em", margin: "20px 0 8px" }}>Tasks</div>
              </>
            )}

            {tasks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 20px", color: T.ink4 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.ink3 }}>No tasks assigned right now</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Anything your professors or placement cell publish for you will show up here.</div>
              </div>
            ) : (
              <>
                {overdue.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.red, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Overdue</div>
                    {overdue.map(t => <TaskCard key={t.id} task={t} overdue />)}
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.ink4, textTransform: "uppercase", letterSpacing: "0.05em", margin: "16px 0 8px" }}>Upcoming</div>
                  </>
                )}
                {upcoming.map(t => <TaskCard key={t.id} task={t} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function DriveCard({ drive, onStart }) {
  const session = drive.mySession
  const done = session?.status === "completed"
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 10,
      display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
          🔒 {drive.title}
        </div>
        <div style={{ fontSize: 11.5, color: T.ink4, marginTop: 4 }}>
          {drive.assessment_duration_minutes ? `${drive.assessment_duration_minutes} min · ` : ""}
          {done ? `Completed · ${session.violation_count} violation${session.violation_count === 1 ? "" : "s"} logged` : session ? `In progress · ${session.violation_count} violation${session.violation_count === 1 ? "" : "s"} so far` : "Fullscreen + tab-switch monitored while active"}
        </div>
      </div>
      <button onClick={onStart} disabled={done} style={{
        padding: "8px 16px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700, cursor: done ? "default" : "pointer",
        background: done ? T.greenL : T.teal, color: done ? T.green : "#fff", flexShrink: 0,
      }}>
        {done ? "✓ Done" : session ? "Resume" : "Start"}
      </button>
    </div>
  )
}

// ─── Lockdown Gate ───────────────────────────────────────────────────────────
// Real integrity monitoring: requests fullscreen, listens for visibility/blur/
// copy/paste/contextmenu events while active, logs each to the backend, and
// shows the student a live violation counter (transparency, not a "gotcha" —
// the placement cell sees the same count). The assessment itself opens in a
// new tab (assessment_url) since embedding arbitrary third-party or Arena
// content in an iframe safely is its own project — this page IS the proctor,
// watching the browser window for the duration of the attempt.
function LockdownGate({ drive, institutionId, onExit }) {
  const [session, setSession] = useState(drive.mySession || null)
  const [violations, setViolations] = useState(drive.mySession?.violation_count || 0)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(null)
  const [fullscreenActive, setFullscreenActive] = useState(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  async function logViolation(type) {
    if (!sessionRef.current) return
    setViolations(v => v + 1)
    try { await collegeApi.logDriveViolation(sessionRef.current.id, type) } catch (_) {}
  }

  useEffect(() => {
    if (!session) return
    const onVisibility = () => { if (document.hidden) logViolation("tab_hidden") }
    const onBlur = () => logViolation("window_blur")
    const onCopy = () => logViolation("copy")
    const onPaste = () => logViolation("paste")
    const onContextMenu = (e) => { e.preventDefault(); logViolation("right_click") }
    const onFullscreenChange = () => {
      const active = !!document.fullscreenElement
      setFullscreenActive(active)
      if (!active) logViolation("fullscreen_exit")
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    document.addEventListener("copy", onCopy)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [session])

  async function begin() {
    setStarting(true); setError(null)
    try {
      const res = await collegeApi.startDriveSession(institutionId, drive.id)
      setSession(res.session)
      try { await document.documentElement.requestFullscreen?.() } catch (_) { /* user may deny — still tracked via visibility/blur */ }
      if (drive.assessment_url) window.open(drive.assessment_url, "_blank", "noopener,noreferrer")
    } catch (e) {
      setError(e.message || "Could not start session")
    }
    setStarting(false)
  }

  async function finish(status) {
    if (session) {
      try { await collegeApi.endDriveSession(session.id, status) } catch (_) {}
    }
    try { if (document.fullscreenElement) await document.exitFullscreen() } catch (_) {}
    onExit()
  }

  return (
    <div style={{ background: "#0B0A08", minHeight: "100%", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "DM Sans, sans-serif", color: "#F7F2EA" }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{drive.title}</div>

        {!session ? (
          <>
            <p style={{ fontSize: 13, color: "rgba(247,242,234,0.68)", lineHeight: 1.6, marginBottom: 16 }}>
              {drive.assessment_instructions || "This is a proctored assessment. Once you begin, this window monitors fullscreen exits, tab switches, and copy/paste for the duration of your attempt. Your placement cell sees the same integrity signal you do here — nothing hidden."}
            </p>
            {drive.assessment_duration_minutes && (
              <div style={{ fontSize: 12, color: T.amber, marginBottom: 16 }}>Recommended duration: {drive.assessment_duration_minutes} minutes</div>
            )}
            {error && <div style={{ fontSize: 12, color: T.red, marginBottom: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => onExit()} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.16)", background: "transparent", color: "rgba(247,242,234,0.68)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={begin} disabled={starting} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.teal, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {starting ? "Starting…" : "Begin Proctored Session"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999,
              background: violations === 0 ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              color: violations === 0 ? T.green : T.amber, fontSize: 13, fontWeight: 700, marginBottom: 16,
            }}>
              {violations === 0 ? "✓ No violations" : `⚠ ${violations} violation${violations === 1 ? "" : "s"} logged`}
            </div>
            <p style={{ fontSize: 12.5, color: "rgba(247,242,234,0.68)", lineHeight: 1.6, marginBottom: 8 }}>
              {fullscreenActive ? "Fullscreen active — stay in this window while attempting the assessment." : "Fullscreen isn't active. Leaving this tab, exiting fullscreen, or copy/paste will be logged."}
            </p>
            {drive.assessment_url && (
              <button onClick={() => window.open(drive.assessment_url, "_blank", "noopener,noreferrer")} style={{ fontSize: 12, color: T.teal, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginBottom: 16 }}>
                Re-open assessment link
              </button>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 8 }}>
              <button onClick={() => finish("abandoned")} style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.16)", background: "transparent", color: "rgba(247,242,234,0.68)", fontSize: 13, cursor: "pointer" }}>Abandon</button>
              <button onClick={() => finish("completed")} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>I'm Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, overdue }) {
  const pm = PRIORITY_META[task.priority] || PRIORITY_META.medium
  return (
    <div style={{
      background: T.surface, border: `1px solid ${overdue ? "rgba(244,63,94,0.3)" : T.border}`,
      borderRadius: 14, padding: 16, marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{task.title}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: pm.color, background: pm.bg, padding: "3px 8px", borderRadius: 999, flexShrink: 0 }}>{pm.label.toUpperCase()}</span>
      </div>
      {task.description && <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 6, lineHeight: 1.5 }}>{task.description}</div>}
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, fontSize: 11.5, color: T.ink4 }}>
        {task.subject && <span>📖 {task.subject}</span>}
        {task.due_date && <span style={{ color: overdue ? T.red : T.ink4, fontWeight: overdue ? 700 : 400 }}>📅 Due {new Date(task.due_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
        {task.published_by_name && <span>👤 {task.published_by_name}</span>}
        {task.attachment_url && (
          <a href={task.attachment_url} target="_blank" rel="noreferrer" style={{ color: T.teal, fontWeight: 600, textDecoration: "none" }}>
            📎 {task.attachment_name || "Attachment"}
          </a>
        )}
      </div>
    </div>
  )
}
