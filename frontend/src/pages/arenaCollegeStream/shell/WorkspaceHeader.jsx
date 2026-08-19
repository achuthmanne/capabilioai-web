/**
 * WorkspaceHeader.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Presentational only — reads the SAME `workspace` prop every registered
 * workspace already receives (see workspaces/sql/SqlWorkspace.jsx's own
 * header comment for the documented shape), never fetches anything of its
 * own. Zero Domain Role/evaluation logic — every value below is either
 * already present on `mission`/`submission`/`timer`, or an honest
 * placeholder for a concept (autosave, workspace-type metadata) that
 * genuinely doesn't exist upstream yet.
 *
 * `workspace.meta` is an OPTIONAL, shell-specific extension point:
 * `{ workspaceTypeLabel, workspaceTypeIcon }`. The shell deliberately does
 * NOT import workspaces/panelMetadata.js itself (see shell's component
 * dependency graph — shell/* never imports workspaces/* except through the
 * children slot) — the integration point in ArenaCollegeStream.jsx is
 * expected to compute this via the existing getPanelMetadata() and pass it
 * through. Falls back to the raw `mission.panel_type` string when absent,
 * never a fabricated label.
 */
import { memo } from "react"
import { useShellTokens } from "./tokens"
import { useCountdown } from "../shared/useCountdown"

function statusOf(workspace) {
  const { mission, submission, navigation } = workspace
  const listEntry = navigation?.missions?.find(m => m.id === mission.id)
  if (listEntry?.passed) return { label: "Completed", tone: "success" }
  if (submission?.result) return { label: submission.result.passed ? "Completed" : "Attempted", tone: submission.result.passed ? "success" : "warning" }
  return { label: "In Progress", tone: "info" }
}

function WorkspaceHeader({ workspace, theme, onToggleTheme, onOpenAIMentor }) {
  const ws = useShellTokens()
  const { mission, timer, submission, meta } = workspace
  const countdown = useCountdown(submission?.result ? null : timer?.deadline)
  const status = statusOf(workspace)
  const toneColor = { success: ws.success, warning: ws.warning, info: ws.info }[status.tone]

  const field = (label, value) => value ? (
    <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: ws.ink4, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: ws.mono, color: ws.ink2 }}>{value}</span>
    </span>
  ) : null

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      padding: "10px 16px", background: ws.bgPanel, borderBottom: `1px solid ${ws.border}`,
      fontFamily: ws.body, flexWrap: "wrap", rowGap: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: ws.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {mission?.title || "Untitled Mission"}
        </span>
        {field("Company", mission?.company)}
        {field("Sprint", mission?.sprint)}
        {field("Difficulty", mission?.difficulty)}
        {field("Est. Time", mission?.estimated_minutes ? `${mission.estimated_minutes} min` : null)}
        {field("Reward", mission?.elo_reward ? `+${mission.elo_reward} ELO` : null)}
        {countdown.text && field("Timer", countdown.expired ? "Time's up" : countdown.text)}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: toneColor }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor, display: "inline-block" }} />
          {status.label}
        </span>
        {/* Honest, not fabricated — no autosave/draft mechanism exists
            upstream today; this reflects real current behavior (nothing
            persists until Submit), not a fake "Saved ✓" state. */}
        <span title="This workspace has no autosave yet — work is kept in-memory until you submit." style={{ fontSize: 11, color: ws.ink4, fontFamily: ws.mono }}>
          Session only
        </span>
        <span title={meta?.workspaceTypeLabel || mission?.panel_type} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, color: ws.ink3 }}>
          {meta?.workspaceTypeIcon || "🧩"} <span style={{ fontSize: 11, fontFamily: ws.mono }}>{meta?.workspaceTypeLabel || mission?.panel_type}</span>
        </span>
        <button
          type="button"
          onClick={onOpenAIMentor}
          title="AI Mentor"
          style={{ background: "transparent", border: `1px solid ${ws.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: ws.ink2, fontSize: 13 }}
        >
          🤖
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          style={{ background: "transparent", border: `1px solid ${ws.border}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", color: ws.ink2, fontSize: 13 }}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </div>
  )
}

export default memo(WorkspaceHeader)
