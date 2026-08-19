/**
 * useWorkspaceShortcuts.js — Phase 3.0 (Professional Workspace Shell).
 *
 * No keyboard-shortcut library exists anywhere in this app (confirmed) —
 * this is a small, shell-local `keydown` listener, not a new dependency.
 * Deliberately callback-based (not tied to panel refs itself) so
 * WorkspaceShell.jsx stays the single place that actually drives
 * react-resizable-panels' imperative API — this hook only decides WHEN a
 * shortcut fired, never HOW a panel responds.
 *
 * Shortcuts (documented in the plan, Section 12):
 *   Cmd/Ctrl+B          toggle Mission Sidebar
 *   Cmd/Ctrl+J          toggle Bottom Panel
 *   Cmd/Ctrl+Shift+F    fullscreen the Center Panel
 * (Escape-exits-fullscreen already lives in useFullscreenPanel.js, and
 * Escape-exits-focus-mode in useFocusMode.js — each hook owns the Escape
 * behavior for the state it's actually responsible for, rather than one
 * hook trying to know about every other one's state.)
 */
import { useEffect } from "react"

export function useWorkspaceShortcuts({ onToggleMissionSidebar, onToggleBottomPanel, onToggleFullscreen } = {}) {
  useEffect(() => {
    function onKeyDown(e) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      // Ignore shortcuts while typing in an editor/input — a future
      // workspace's code editor should keep Cmd/Ctrl+B etc. for its own
      // use if it ever needs them; this hook only listens at the window
      // level as a fallback, so it explicitly backs off inside form
      // controls and anything CodeMirror renders (`.cm-editor`).
      const target = e.target
      const isEditable = target?.closest?.("input, textarea, [contenteditable='true'], .cm-editor")
      if (isEditable) return

      if (e.key.toLowerCase() === "b" && !e.shiftKey) {
        e.preventDefault()
        onToggleMissionSidebar?.()
      } else if (e.key.toLowerCase() === "j" && !e.shiftKey) {
        e.preventDefault()
        onToggleBottomPanel?.()
      } else if (e.key.toLowerCase() === "f" && e.shiftKey) {
        e.preventDefault()
        onToggleFullscreen?.()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onToggleMissionSidebar, onToggleBottomPanel, onToggleFullscreen])
}
