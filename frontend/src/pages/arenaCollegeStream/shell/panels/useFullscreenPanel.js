/**
 * useFullscreenPanel.js — Phase 3.0 (Professional Workspace Shell).
 *
 * "Fullscreen a panel" isn't a react-resizable-panels feature (it only
 * resizes/collapses within a group) — this is a shell-level concern: when
 * a panel id is set as fullscreen, WorkspaceShell.jsx conditionally
 * renders ONLY that panel's content at 100% width/height instead of the
 * full PanelGroup tree. This hook owns just that boolean-ish piece of
 * state; it does not touch the DOM Fullscreen API (that's for video/canvas
 * elements taking over the whole browser viewport, not "maximize this one
 * panel within the page" — a different, narrower feature).
 */
import { useCallback, useEffect, useState } from "react"

export function useFullscreenPanel() {
  const [fullscreenPanelId, setFullscreenPanelId] = useState(null)

  const enterFullscreen = useCallback((panelId) => setFullscreenPanelId(panelId), [])
  const exitFullscreen = useCallback(() => setFullscreenPanelId(null), [])
  const toggleFullscreen = useCallback((panelId) => {
    setFullscreenPanelId(current => (current === panelId ? null : panelId))
  }, [])

  // Escape exits fullscreen from anywhere — matches shell/a11y's documented
  // shortcut list (Escape exits fullscreen/focus mode).
  useEffect(() => {
    if (!fullscreenPanelId) return
    function onKeyDown(e) {
      if (e.key === "Escape") exitFullscreen()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fullscreenPanelId, exitFullscreen])

  return {
    fullscreenPanelId,
    isFullscreen: (panelId) => fullscreenPanelId === panelId,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
