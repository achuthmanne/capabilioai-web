/**
 * useFocusMode.js — Phase 3.0 (Professional Workspace Shell).
 *
 * Owns just the boolean — WorkspaceShell.jsx reacts to `focusMode` by
 * calling `.collapse()`/`.expand()` on the Mission Sidebar / Bottom Panel /
 * Right Sidebar's imperative panel refs, same division of responsibility
 * as useFullscreenPanel.js (state here, real panel manipulation in the
 * one place that already imports react-resizable-panels' ref types).
 */
import { useCallback, useEffect, useState } from "react"

export function useFocusMode() {
  const [focusMode, setFocusMode] = useState(false)
  const toggleFocusMode = useCallback(() => setFocusMode(v => !v), [])
  const exitFocusMode = useCallback(() => setFocusMode(false), [])

  useEffect(() => {
    if (!focusMode) return
    function onKeyDown(e) {
      if (e.key === "Escape") exitFocusMode()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [focusMode, exitFocusMode])

  return { focusMode, toggleFocusMode, exitFocusMode }
}
