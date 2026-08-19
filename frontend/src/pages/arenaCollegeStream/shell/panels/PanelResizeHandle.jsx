/**
 * PanelResizeHandle.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Thin, styled wrapper around react-resizable-panels' `Separator` — it
 * already renders `role="separator"` plus the correct WAI-ARIA attributes
 * and full keyboard support (arrow keys / Home / End / Enter) out of the
 * box, which is most of shell/a11y's ARIA requirement for panel dividers
 * satisfied by the library itself, not hand-built here.
 *
 * Uses `--ws-*` theme variables (shell/theme/workspaceTheme.css, added in
 * the next commit) with safe fallbacks, so this file needs no revisit once
 * that CSS lands — it just picks up real values automatically.
 */
import { Separator } from "react-resizable-panels"

export default function PanelResizeHandle({ direction = "horizontal" }) {
  const isHorizontal = direction === "horizontal"
  return (
    <Separator
      style={{
        flexShrink: 0,
        background: "var(--ws-border, #d8d2c4)",
        cursor: isHorizontal ? "col-resize" : "row-resize",
        width: isHorizontal ? 5 : "100%",
        height: isHorizontal ? "100%" : 5,
        transition: "background 120ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--ws-accent, #FF5701)" }}
      onMouseLeave={e => { e.currentTarget.style.background = "var(--ws-border, #d8d2c4)" }}
    />
  )
}
