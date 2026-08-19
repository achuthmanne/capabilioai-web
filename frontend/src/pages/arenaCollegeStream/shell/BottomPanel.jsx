/**
 * BottomPanel.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Tab container: Output / Console / Logs / Feedback / History / AI Notes.
 * Per the shell's "never fetch data" rule (see WorkspaceShell.jsx's own
 * header), every tab reads only from the `workspace` prop already passed
 * down — it never calls an API itself.
 *
 * Only "Feedback" has real upstream data today:
 * `submission.result.ai_feedback` — the exact field SqlWorkspace.jsx
 * already renders inline as its own "🤖 AI Coach" box, reused here as
 * plain data, not re-implemented. Output/Console/Logs/History/AI Notes
 * have no matching field on `workspace` — each workspace type (SQL today)
 * still renders its own output/result UI inline in its center panel; this
 * phase does not lift that state out (would mean editing SqlWorkspace.jsx,
 * explicitly frozen). Honest "coming soon" placeholders instead of
 * duplicating or guessing at a shape.
 */
import { memo, useState } from "react"
import { useShellTokens } from "./tokens"

const TABS = [
  { id: "output", label: "Output" },
  { id: "console", label: "Console" },
  { id: "logs", label: "Logs" },
  { id: "feedback", label: "Feedback" },
  { id: "history", label: "History" },
  { id: "notes", label: "AI Notes" },
]

function Placeholder({ label }) {
  const ws = useShellTokens()
  return <div style={{ fontSize: 12, color: ws.ink4 }}>{label} isn't wired into the shell yet — this workspace still renders it inline.</div>
}

function TabContent({ id, workspace }) {
  const ws = useShellTokens()
  if (id === "feedback") {
    const feedback = workspace?.submission?.result?.ai_feedback
    if (!feedback) return <div style={{ fontSize: 12, color: ws.ink4 }}>Submit your work to receive AI feedback.</div>
    return (
      <div style={{ background: ws.info + "22", border: `1px solid ${ws.info}`, borderRadius: 10, padding: 12, fontSize: 13, color: ws.ink2, lineHeight: 1.6 }}>
        🤖 {feedback}
      </div>
    )
  }
  const labels = { output: "Output", console: "Console", logs: "Logs", history: "History", notes: "AI Notes" }
  return <Placeholder label={labels[id] || id} />
}

function BottomPanel({ workspace, activeTab, onActiveTabChange }) {
  const ws = useShellTokens()
  const [localTab, setLocalTab] = useState("output")
  const tab = activeTab ?? localTab
  const setTab = onActiveTabChange ?? setLocalTab

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: ws.bgCard }}>
      <div role="tablist" aria-label="Bottom panel" style={{ display: "flex", borderBottom: `1px solid ${ws.border}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 12px", fontSize: 11, fontWeight: tab === t.id ? 800 : 500,
              color: tab === t.id ? ws.ink : ws.ink3,
              background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t.id ? ws.accent : "transparent"}`, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 12, overflow: "auto", flex: 1 }}>
        <TabContent id={tab} workspace={workspace} />
      </div>
    </div>
  )
}

export default memo(BottomPanel)
