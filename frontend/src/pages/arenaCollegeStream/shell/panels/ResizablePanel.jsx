/**
 * ResizablePanel.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Thin re-export of react-resizable-panels' `Panel`, forwarding a
 * `panelRef` so callers (the toolbar's collapse/expand buttons,
 * shell/a11y/useWorkspaceShortcuts.js) can drive a panel imperatively
 * without every shell component importing the library directly — see
 * ResizablePanelGroup.jsx's header for why that matters.
 *
 * Also re-exports `usePanelRef` — WorkspaceShell.jsx needs it to drive
 * collapse/expand for Focus Mode and the Mission/Bottom/Right panels, and
 * should only ever import from shell/panels/*, never the library itself
 * (see the shell's component dependency graph in the plan).
 */
import { Panel, usePanelRef } from "react-resizable-panels"

export { usePanelRef }

export default function ResizablePanel({ id, defaultSize, minSize, maxSize, collapsible, collapsedSize, panelRef, style, className, children }) {
  return (
    <Panel
      id={id}
      defaultSize={defaultSize}
      minSize={minSize}
      maxSize={maxSize}
      collapsible={collapsible}
      collapsedSize={collapsedSize}
      panelRef={panelRef}
      style={{ overflow: "auto", ...style }}
      className={className}
    >
      {children}
    </Panel>
  )
}
