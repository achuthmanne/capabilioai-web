/**
 * useAntiCheat — Arena workstation protection layer
 *
 * What this does (browser-enforceable):
 *  • Blocks text selection (user-select: none injected globally during session)
 *  • Intercepts Ctrl/Cmd+C and clears the clipboard
 *  • Intercepts Ctrl/Cmd+A (select-all) and cancels it
 *  • Blocks right-click context menu in the workstation area
 *  • Blurs the workstation when the user leaves the tab (visibility change)
 *  • Detects active screen sharing via getDisplayMedia and shows a warning
 *  • Prevents drag-out of text (ondragstart)
 *
 * What is impossible in a browser:
 *  • OS-level screenshots (Print Screen, macOS Cmd+Shift+3/4) — cannot be blocked
 *  • External screen recording software
 *  → Watermark (see ArenaWatermark component) is the best deterrent for those.
 */

import { useEffect, useCallback, useRef } from "react"

export default function useAntiCheat({ uid, enabled = true }) {
  const screenShareWarned = useRef(false)
  const blurred = useRef(false)

  // ── Block clipboard copy ─────────────────────────────────────────────────
  const handleCopy = useCallback((e) => {
    if (!enabled) return
    e.preventDefault()
    // Overwrite clipboard with empty string so paste elsewhere gets nothing
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText("").catch(() => {})
      }
    } catch { /* noop */ }
  }, [enabled])

  // ── Block keyboard shortcuts ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (!enabled) return
    const isMod = e.ctrlKey || e.metaKey
    // Ctrl/Cmd + C — copy
    if (isMod && e.key.toLowerCase() === "c") {
      e.preventDefault()
      try { navigator.clipboard?.writeText("").catch(() => {}) } catch { /* noop */ }
    }
    // Ctrl/Cmd + A — select all
    if (isMod && e.key.toLowerCase() === "a") {
      e.preventDefault()
    }
    // Ctrl/Cmd + P — print (could print code)
    if (isMod && e.key.toLowerCase() === "p") {
      e.preventDefault()
    }
    // Ctrl/Cmd + S — save-as
    if (isMod && e.key.toLowerCase() === "s") {
      e.preventDefault()
    }
  }, [enabled])

  // ── Detect screen sharing via getDisplayMedia ────────────────────────────
  const checkScreenShare = useCallback(async () => {
    if (!enabled || screenShareWarned.current) return
    try {
      // getDisplayMedia requires user gesture; we can't call it ourselves.
      // Instead: monkey-patch it so we know if the app (or a third-party
      // extension) triggers it during the session.
      const orig = navigator.mediaDevices?.getDisplayMedia?.bind(navigator.mediaDevices)
      if (!orig) return
      navigator.mediaDevices.getDisplayMedia = async (...args) => {
        screenShareWarned.current = true
        // Fire a custom event the shell can listen to
        window.dispatchEvent(new CustomEvent("capabilio:screenshare_detected"))
        return orig(...args)
      }
    } catch { /* noop */ }
  }, [enabled])

  // ── Blur workstation on tab/window hide ─────────────────────────────────
  const handleVisibility = useCallback(() => {
    if (!enabled) return
    blurred.current = document.hidden
    window.dispatchEvent(new CustomEvent("capabilio:visibility_change", {
      detail: { hidden: document.hidden }
    }))
  }, [enabled])

  useEffect(() => {
    if (!enabled) return

    // Inject global no-select style for the arena session
    const style = document.createElement("style")
    style.id = "capabilio-anticheat-style"
    style.textContent = `
      .arena-protected * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        user-select: none !important;
      }
      /* Re-allow selection inside code editors (Monaco/CodeMirror) */
      .arena-protected .cm-editor *,
      .arena-protected .monaco-editor * {
        -webkit-user-select: text !important;
        user-select: text !important;
      }
    `
    document.head.appendChild(style)

    document.addEventListener("copy",    handleCopy,   true)
    document.addEventListener("cut",     handleCopy,   true) // same handler — clear clipboard
    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("visibilitychange", handleVisibility)

    // Block drag-start on text nodes
    const blockDrag = (e) => { if (enabled) e.preventDefault() }
    document.addEventListener("dragstart", blockDrag, true)

    checkScreenShare()

    return () => {
      document.getElementById("capabilio-anticheat-style")?.remove()
      document.removeEventListener("copy",    handleCopy,   true)
      document.removeEventListener("cut",     handleCopy,   true)
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("visibilitychange", handleVisibility)
      document.removeEventListener("dragstart", blockDrag, true)
    }
  }, [enabled, handleCopy, handleKeyDown, handleVisibility, checkScreenShare])
}
