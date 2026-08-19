/**
 * WorkspaceToolbar.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Presentational action row. Only wires buttons to real, already-existing
 * actions on the `workspace` prop (`actions.onPreview`, `actions.onSubmit`
 * — see workspaces/sql/SqlWorkspace.jsx's documented contract). "Run",
 * "Reset", "Format", and "Validate" have no upstream equivalent for any
 * workspace built today — they render visibly disabled with an honest
 * tooltip, never a fake no-op click handler, matching the same "no
 * fabricated behavior" discipline as WorkspaceRenderer's UnsupportedPanel.
 * A future workspace type that DOES support one of these just needs to
 * populate the matching `workspace.actions.*`/`workspace.permissions.*`
 * field — this file's mapping is generic, not sql_runner-specific.
 *
 * `fontScale`/`onFontScaleChange` are optional controlled props (Settings
 * popover) — uncontrolled local state when omitted, so this component is
 * fully testable standalone before shell/state/useWorkspaceLayout.js
 * (persistence) exists, and upgrades to persisted control later with zero
 * internal changes.
 */
import { memo, useState } from "react"
import { useShellTokens } from "./tokens"

function ToolbarButton({ label, icon, onClick, disabled, title, active }) {
  const ws = useShellTokens()
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title || label}
      aria-pressed={active}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
        background: active ? ws.accent : "transparent",
        color: active ? "#fff" : disabled ? ws.ink4 : ws.ink2,
        border: `1px solid ${active ? ws.accent : ws.border}`,
        borderRadius: 8, fontSize: 12, fontWeight: 700, fontFamily: ws.body,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span aria-hidden="true">{icon}</span>{label}
    </button>
  )
}

function WorkspaceToolbar({ workspace, onFullscreenToggle, isFullscreen, onFocusModeToggle, isFocusMode, fontScale, onFontScaleChange }) {
  const ws = useShellTokens()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [localFontScale, setLocalFontScale] = useState(1)
  const scale = fontScale ?? localFontScale
  const setScale = onFontScaleChange ?? setLocalFontScale

  const { actions = {}, permissions = {} } = workspace || {}

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      padding: "8px 16px", background: ws.bgCard, borderBottom: `1px solid ${ws.border}`, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <ToolbarButton label="Run" icon="▶" disabled title="Not available for this workspace yet" />
        <ToolbarButton
          label="Preview"
          icon="👁"
          onClick={actions.onPreview}
          disabled={!actions.onPreview || permissions.canPreview === false}
          title={actions.onPreview ? "Run without scoring" : "Not available for this workspace yet"}
        />
        <ToolbarButton label="Reset" icon="↺" disabled title="Not available for this workspace yet" />
        <ToolbarButton label="Format" icon="{ }" disabled title="Not available for this workspace yet" />
        <ToolbarButton label="Validate" icon="✓" disabled title="Not available for this workspace yet" />
        <ToolbarButton
          label="Submit"
          icon="⏎"
          onClick={actions.onSubmit}
          disabled={!actions.onSubmit || permissions.canSubmit === false}
          title={actions.onSubmit ? "Submit for scoring" : "Not available for this workspace yet"}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <ToolbarButton label="" icon="⛶" onClick={onFullscreenToggle} active={isFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen center panel"} />
        <ToolbarButton label="" icon="◱" onClick={onFocusModeToggle} active={isFocusMode} title={isFocusMode ? "Exit focus mode" : "Focus mode — collapse side/bottom panels"} />
        <div style={{ position: "relative" }}>
          <ToolbarButton label="" icon="⚙" onClick={() => setSettingsOpen(o => !o)} active={settingsOpen} title="Settings" />
          {settingsOpen && (
            <div
              role="menu"
              style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 20,
                background: ws.bgCard, border: `1px solid ${ws.border}`, borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: 12, minWidth: 180,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: ws.ink4, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Font Size</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button type="button" onClick={() => setScale(s => Math.max(0.8, +(s - 0.1).toFixed(1)))} style={{ padding: "2px 8px", cursor: "pointer" }}>A-</button>
                <span style={{ fontSize: 12, fontFamily: ws.mono, color: ws.ink2 }}>{Math.round(scale * 100)}%</span>
                <button type="button" onClick={() => setScale(s => Math.min(1.4, +(s + 0.1).toFixed(1)))} style={{ padding: "2px 8px", cursor: "pointer" }}>A+</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(WorkspaceToolbar)
