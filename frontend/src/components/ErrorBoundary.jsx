import { Component } from "react"

// Guard key used to make sure we only force one silent auto-reload per
// browser session. Without this, a genuinely broken chunk (not just a
// stale-cache issue) would reload forever in a tight loop.
const RELOAD_GUARD_KEY = "capabilio_chunk_reload_attempted"

function isChunkLoadError(error) {
  const msg = String(error?.message || error || "")
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Failed to load module script/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /ChunkLoadError/i.test(msg)
  )
}

/**
 * Catches render-time errors thrown anywhere below it in the tree —
 * most commonly a lazy-loaded page chunk that 404s because the browser's
 * cached index.html still points at a chunk hash from a previous deploy.
 *
 * Without this boundary, React unmounts the entire app to a blank white
 * screen on ANY such error, with no recovery path for the user other than
 * knowing to hard-refresh. This is what was happening to Skill Studio (and
 * would happen identically for any other lazy route) after every deploy
 * until every open tab was manually refreshed.
 *
 * Behavior:
 *  - Chunk-load errors: reload once automatically (this is the normal,
 *    expected case right after a new deploy — the fix is just a fresh
 *    index.html, no user action needed). Guarded so a real, persistent
 *    error can't cause a reload loop.
 *  - Any other render error: show a visible fallback with a manual
 *    "Reload page" action instead of a silent blank screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, chunkError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, chunkError: isChunkLoadError(error), error: error }
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] caught render error:", error, info?.componentStack)

    if (isChunkLoadError(error)) {
      let alreadyTried = false
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1"
      } catch (_) { /* sessionStorage unavailable (private mode edge cases) */ }

      if (!alreadyTried) {
        try { sessionStorage.setItem(RELOAD_GUARD_KEY, "1") } catch (_) {}
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.chunkError) {
        // We already triggered (or attempted) an auto-reload above.
        // Show a lightweight holding message instead of a blank screen
        // in the brief window before the reload happens/completes.
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 24, textAlign: "center", fontFamily: "inherit" }}>
            <p style={{ fontSize: 15, color: "#555", marginBottom: 16 }}>
              Loading the latest version of Capabilio…
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
            >
              Refresh now
            </button>
          </div>
        )
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", padding: 24, textAlign: "center", fontFamily: "inherit" }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Something went wrong.</p>
          <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
            This page hit an unexpected error. Refreshing usually fixes it.
          </p>
          <p style={{ fontSize: 12, color: "red", marginBottom: 16, maxWidth: "600px", wordBreak: "break-all" }}>
            {this.state.error?.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
          >
            Refresh page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
