// FrontendWorkstationV2.jsx — Arena V2, Frontend Developer role workspace
// ---------------------------------------------------------------------------
// A real, live-rendered browser preview — HTML/CSS/JS, deliberately NOT
// React/JSX. A real in-browser transpiler (Babel standalone) would be a
// separately-sized, separately-risked addition; vanilla HTML/CSS/JS still
// satisfies the actual product requirement ("frontend -> a running
// interface, not plain text") via a genuinely rendered, genuinely
// interactive sandboxed iframe — not a screenshot, not a fake mock.
//
// SANDBOXING: the preview iframe uses `sandbox="allow-scripts"` only — no
// `allow-same-origin`, so the candidate's HTML/CSS/JS can never read
// cookies, localStorage, or reach across into the parent app, even though
// it runs real, interactive script. Console output is captured by a small
// script injected into the same srcDoc that overrides console.log/warn/
// error and forwards them to the parent via postMessage — genuine console
// output from genuinely executed code, not simulated.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop handed down by ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js or calls the Submission API directly.
//
// ANTI-PASTE RULE (scoped to this pilot editor only, matching
// CodeWorkstationV2.jsx's identical note): only the three code editors and
// the written-explanation box block paste.
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

function buildSrcDoc(html, css, js) {
  // The console-capture script runs INSIDE the sandboxed iframe (so it has
  // access to that frame's real console/window), forwarding every call to
  // the parent frame via postMessage — the parent never executes candidate
  // code itself, only receives already-executed results.
  const consoleCapture = `
<script>
(function () {
  function send(level, args) {
    try {
      var msg = args.map(function (a) {
        if (a instanceof Error) return a.message
        try { return typeof a === "object" ? JSON.stringify(a) : String(a) } catch (e) { return String(a) }
      }).join(" ")
      parent.postMessage({ __arenaV2Console: true, level: level, message: msg }, "*")
    } catch (e) {}
  }
  var real = { log: console.log, warn: console.warn, error: console.error }
  console.log = function () { send("log", Array.prototype.slice.call(arguments)); real.log.apply(console, arguments) }
  console.warn = function () { send("warn", Array.prototype.slice.call(arguments)); real.warn.apply(console, arguments) }
  console.error = function () { send("error", Array.prototype.slice.call(arguments)); real.error.apply(console, arguments) }
  window.onerror = function (message, source, lineno, colno, error) { send("error", [message + " (line " + lineno + ")"]); return false }
})()
</script>`
  return `<!DOCTYPE html><html><head><style>${css || ""}</style></head><body>${html || ""}${consoleCapture}<script>${js || ""}</script></body></html>`
}

function EditorTabs({ active, onChange }) {
  const tabs = [["html", "index.html"], ["css", "styles.css"], ["js", "script.js"]]
  return (
    <div style={{ display: "flex", gap: 2, borderBottom: "1px solid #1e293b" }}>
      {tabs.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            padding: "6px 12px", fontSize: 12, fontFamily: "monospace", cursor: "pointer",
            background: active === key ? "#0b1220" : "transparent",
            color: active === key ? "#e2e8f0" : "#64748b",
            border: "none", borderBottom: active === key ? "2px solid #4ade80" : "2px solid transparent",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], starterHtml?: string,
 *                      starterCss?: string, starterJs?: string },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 *
 * Center-panel-only component, same contract as every other workstation —
 * the mission header/ticket/prompt/checklist come from the shared
 * ArenaV2WorkspaceShell. This component owns the editor, the live preview,
 * the console panel, and the Submit button.
 */
export default function FrontendWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const [html, setHtml] = useState(payload?.starterHtml || "")
  const [css, setCss] = useState(payload?.starterCss || "")
  const [js, setJs] = useState(payload?.starterJs || "")
  const [activeTab, setActiveTab] = useState("html")
  const [notes, setNotes] = useState("")
  const [consoleLines, setConsoleLines] = useState([])
  const [previewDoc, setPreviewDoc] = useState(() => buildSrcDoc(payload?.starterHtml, payload?.starterCss, payload?.starterJs))
  const [hasRun, setHasRun] = useState(false)
  const iframeRef = useRef(null)

  useEffect(() => {
    function onMessage(e) {
      if (!e.data || !e.data.__arenaV2Console) return
      // Only accept messages from our own preview iframe, not from
      // anywhere else on the page — cheap origin-of-source check via the
      // iframe's own contentWindow reference.
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      setConsoleLines((prev) => [...prev.slice(-49), { level: e.data.level, message: e.data.message }])
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [])

  const runPreview = useCallback(() => {
    setConsoleLines([])
    setPreviewDoc(buildSrcDoc(html, css, js))
    setHasRun(true)
  }, [html, css, js])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const editorValue = activeTab === "html" ? html : activeTab === "css" ? css : js
  const setEditorValue = activeTab === "html" ? setHtml : activeTab === "css" ? setCss : setJs

  const errorCount = useMemo(() => consoleLines.filter((l) => l.level === "error").length, [consoleLines])

  const handleSubmit = useCallback(() => {
    if (!html.trim() || isSubmitting) return
    onSubmit?.({ html, css, js, notes, ranPreview: hasRun, consoleErrorCount: errorCount })
  }, [html, css, js, notes, hasRun, errorCount, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <EditorTabs active={activeTab} onChange={setActiveTab} />
          <textarea
            value={editorValue}
            onChange={(e) => setEditorValue(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            spellCheck={false}
            placeholder={activeTab === "css" ? "/* styles.css may be empty */" : ""}
            style={{ width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: "0 0 8px 8px", background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b", borderTop: "none" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Live preview</div>
          <iframe
            ref={iframeRef}
            title="Arena V2 frontend preview"
            sandbox="allow-scripts"
            srcDoc={previewDoc}
            style={{ width: "100%", minHeight: 220, borderRadius: 8, border: "1px solid #1e293b", background: "#fff" }}
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={runPreview} style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700 }}>
          ▶ Run Preview
        </button>
        <button
          onClick={handleSubmit}
          disabled={!html.trim() || isSubmitting}
          style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none" }}
        >
          {isSubmitting ? "Submitting for AI review…" : "Submit for AI Review"}
        </button>
      </div>

      <div style={{ padding: 12, background: "#0b1220", borderRadius: 8, border: "1px solid #1e293b" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Console</div>
          {errorCount > 0 && <div style={{ fontSize: 12, color: "#f87171", fontWeight: 700 }}>{errorCount} error{errorCount > 1 ? "s" : ""}</div>}
        </div>
        {!hasRun && <div style={{ fontSize: 12, color: "#64748b" }}>Run Preview to execute your HTML/CSS/JS in a real sandboxed browser frame.</div>}
        {hasRun && consoleLines.length === 0 && <div style={{ fontSize: 12, color: "#64748b" }}>No console output.</div>}
        {consoleLines.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 120, overflow: "auto" }}>
            {consoleLines.map((l, i) => (
              <div key={i} style={{ fontSize: 12, fontFamily: "monospace", color: l.level === "error" ? "#f87171" : l.level === "warn" ? "#fbbf24" : "#cbd5e1" }}>
                {l.level === "error" ? "✗ " : l.level === "warn" ? "⚠ " : "› "}{l.message}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Approach explanation (graded as part of Communication)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          placeholder="e.g. The click handler was never attached because the script ran before the button existed…"
          style={{ width: "100%", minHeight: 70, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
        />
      </div>

      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        Run Preview renders your actual HTML/CSS/JS in a real, sandboxed iframe (script-only — no access to this
        page&apos;s cookies or storage) — nothing here is a static mock. Submit posts your real code, console output,
        and explanation to the AI Reviewer.
      </div>
    </div>
  )
}
