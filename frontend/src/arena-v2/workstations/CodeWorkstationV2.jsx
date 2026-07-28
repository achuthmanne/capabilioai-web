// CodeWorkstationV2.jsx — Arena V2, second role workspace (Software Engineer)
// ---------------------------------------------------------------------------
// IDE-shaped counterpart to NotebookWorkstationV2.jsx (the ML/AI pilot's
// workspace): file explorer, editor, a real in-browser test run (a Web
// Worker actually executes the candidate's JS against real assertions —
// same "real execution engine, never a scaffold/dummy" discipline as
// Pyodide/sql.js elsewhere in Arena V2), a computed git-style diff against
// the starter code, and a CI pipeline panel derived from that same real
// execution — nothing here is a fabricated pass/fail.
//
// Same layering discipline as every other workstation: this component only
// calls the `onSubmit` prop handed down by ArenaV2ChallengeShell.jsx; it
// never imports arenaV2Submission.js or calls the Submission API itself.
//
// ANTI-PASTE RULE (scoped to this pilot editor only, per instruction — not a
// global editor lock, same honesty note as NotebookWorkstationV2.jsx): only
// the main code editor and the written-explanation box block paste.
import { useCallback, useMemo, useState } from "react"

// ── Real, sandboxed (Worker = no DOM/page access) JS execution ─────────────
// Runs the candidate's actual submitted code, then each test case's actual
// assertion code, in a fresh Worker per run. A hung test (infinite loop) is
// terminated after a timeout and reported as a real failure, not silently
// dropped.
function runInWorker(code, testCases, timeoutMs = 4000) {
  return new Promise((resolve) => {
    const workerSrc = `
self.onmessage = function (e) {
  var code = e.data.code, testCases = e.data.testCases
  var loadError = null
  try { (0, eval)(code) } catch (err) { loadError = err.message || String(err) }
  var results = []
  if (loadError) {
    for (var i = 0; i < testCases.length; i++) {
      results.push({ name: testCases[i].name, passed: false, error: 'Code failed to load: ' + loadError })
    }
  } else {
    for (var i = 0; i < testCases.length; i++) {
      try {
        (0, eval)(testCases[i].code)
        results.push({ name: testCases[i].name, passed: true })
      } catch (err) {
        results.push({ name: testCases[i].name, passed: false, error: err.message || String(err) })
      }
    }
  }
  self.postMessage({ results: results, loadError: loadError })
}
`
    const blob = new Blob([workerSrc], { type: "application/javascript" })
    const url = URL.createObjectURL(blob)
    const worker = new Worker(url)
    let done = false
    const cleanup = () => { worker.terminate(); URL.revokeObjectURL(url) }
    const timer = setTimeout(() => {
      if (done) return
      done = true
      cleanup()
      resolve({
        results: testCases.map((t) => ({ name: t.name, passed: false, error: "Timed out — possible infinite loop" })),
        timedOut: true,
      })
    }, timeoutMs)
    worker.onmessage = (e) => {
      if (done) return
      done = true
      clearTimeout(timer)
      cleanup()
      resolve(e.data)
    }
    worker.onerror = (e) => {
      if (done) return
      done = true
      clearTimeout(timer)
      cleanup()
      resolve({ results: testCases.map((t) => ({ name: t.name, passed: false, error: e.message || "Worker error" })), workerError: true })
    }
    worker.postMessage({ code, testCases })
  })
}

// ── Small LCS-based line diff (no external dependency) ─────────────────────
function computeLineDiff(oldStr, newStr) {
  const oldLines = (oldStr || "").split("\n")
  const newLines = (newStr || "").split("\n")
  const m = oldLines.length, n = newLines.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] === newLines[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (oldLines[i] === newLines[j]) { out.push({ type: "same", text: oldLines[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: "removed", text: oldLines[i] }); i++ }
    else { out.push({ type: "added", text: newLines[j] }); j++ }
  }
  while (i < m) { out.push({ type: "removed", text: oldLines[i] }); i++ }
  while (j < n) { out.push({ type: "added", text: newLines[j] }); j++ }
  return out
}

function FileExplorer({ files, activeFile, targetFile, onSelect }) {
  return (
    <div style={{ borderRight: "1px solid #1e293b", paddingRight: 10, minWidth: 170 }}>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Explorer</div>
      {Object.keys(files).map((f) => (
        <div
          key={f}
          onClick={() => onSelect(f)}
          style={{
            fontSize: 12, padding: "4px 6px", borderRadius: 4, cursor: "pointer", marginBottom: 2,
            background: f === activeFile ? "#1e293b" : "transparent",
            color: f === targetFile ? "#e2e8f0" : "#94a3b8",
            fontWeight: f === targetFile ? 700 : 400,
          }}
        >
          {f === targetFile ? "✎ " : ""}{f}
        </div>
      ))}
    </div>
  )
}

function DiffView({ starter, current }) {
  const diff = useMemo(() => computeLineDiff(starter, current), [starter, current])
  return (
    <pre style={{ fontSize: 11, fontFamily: "monospace", margin: 0, overflow: "auto", maxHeight: 220 }}>
      {diff.map((line, i) => (
        <div
          key={i}
          style={{
            background: line.type === "added" ? "rgba(74,222,128,0.12)" : line.type === "removed" ? "rgba(248,113,113,0.12)" : "transparent",
            color: line.type === "added" ? "#4ade80" : line.type === "removed" ? "#f87171" : "#94a3b8",
            padding: "0 4px",
          }}
        >
          {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}{line.text}
        </div>
      ))}
    </pre>
  )
}

function PipelineStage({ label, status }) {
  const color = status === "pass" ? "#4ade80" : status === "fail" ? "#f87171" : "#64748b"
  const icon = status === "pass" ? "✓" : status === "fail" ? "✗" : "○"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span style={{ color, fontWeight: 700 }}>{icon}</span>
      <span style={{ color: "#cbd5e1" }}>{label}</span>
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], files?: Record<string,string>,
 *                      targetFile?: string, testCases?: Array<{name:string, code:string}> },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 *
 * Center-panel-only component — the mission header, ticket box, prompt, and
 * checklist that used to live here now come from the shared
 * ArenaV2WorkspaceShell. This component owns the IDE itself: file explorer,
 * editor, Run Tests, diff, CI panel, and the Submit button (submission
 * payload assembly — code/notes/testResults — stays domain logic here).
 */
export default function CodeWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const files = payload?.files || {}
  const targetFile = payload?.targetFile || Object.keys(files)[0]
  const [activeFile, setActiveFile] = useState(targetFile)
  const [code, setCode] = useState(files[targetFile] || "")
  const [notes, setNotes] = useState("")
  const [running, setRunning] = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [showDiff, setShowDiff] = useState(false)

  const runTests = useCallback(async () => {
    if (running) return
    setRunning(true)
    const testCases = payload?.testCases || []
    const out = await runInWorker(code, testCases)
    setTestResults(out.results || [])
    setRunning(false)
  }, [code, running, payload])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const passCount = testResults ? testResults.filter((t) => t.passed).length : null
  const totalCount = testResults ? testResults.length : (payload?.testCases?.length || 0)
  const allPassed = testResults && testResults.length > 0 && passCount === totalCount
  const hasLoadError = testResults && testResults.some((t) => t.error?.startsWith("Code failed to load"))
  const lintClean = !/console\.log|debugger;?\s*$/m.test(code.split("\n").slice(0, -1).join("\n") || "")

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isSubmitting) return
    onSubmit?.({ code, notes, testResults: testResults || [] })
  }, [code, notes, testResults, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <FileExplorer files={files} activeFile={activeFile} targetFile={targetFile} onSelect={setActiveFile} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
              {activeFile}{activeFile === targetFile ? " — editable (paste disabled in this pilot editor)" : " — read-only context file"}
            </div>
            {activeFile === targetFile ? (
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onPaste={blockPaste}
                onDrop={blockPaste}
                spellCheck={false}
                style={{ width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
              />
            ) : (
              <pre style={{ width: "100%", minHeight: 220, fontFamily: "monospace", fontSize: 12, padding: 10, borderRadius: 8, background: "#0b1220", color: "#94a3b8", border: "1px solid #1e293b", overflow: "auto", margin: 0 }}>
                {files[activeFile]}
              </pre>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={runTests} disabled={running || !code.trim()} style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700 }}>
            {running ? "Running tests…" : "▶ Run Tests"}
          </button>
          <button onClick={() => setShowDiff((v) => !v)} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
            {showDiff ? "Hide diff" : "View git diff"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || isSubmitting}
            style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none" }}
          >
            {isSubmitting ? "Submitting for AI review…" : "Submit for AI Review"}
          </button>
        </div>

        {showDiff && (
          <div style={{ padding: 10, background: "#0b1220", borderRadius: 8, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Diff vs. starter code — {targetFile}</div>
            <DiffView starter={files[targetFile] || ""} current={code} />
          </div>
        )}

        <div style={{ padding: 12, background: "#0b1220", borderRadius: 8, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>Terminal / Test output</div>
          {!testResults && <div style={{ fontSize: 12, color: "#64748b" }}>Run Tests to execute your code against the real test suite.</div>}
          {testResults && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {testResults.map((t, i) => (
                <div key={i} style={{ fontSize: 12, color: t.passed ? "#4ade80" : "#f87171" }}>
                  {t.passed ? "✓ PASS" : "✗ FAIL"} — {t.name}{!t.passed && t.error ? `: ${t.error}` : ""}
                </div>
              ))}
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{passCount}/{totalCount} tests passed</div>
            </div>
          )}
        </div>

        <div style={{ padding: 12, background: "#0b1220", borderRadius: 8, border: "1px solid #1e293b" }}>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>CI / CD Pipeline</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <PipelineStage label="Lint" status={testResults ? (lintClean ? "pass" : "fail") : "pending"} />
            <PipelineStage label="Test" status={!testResults ? "pending" : hasLoadError ? "fail" : allPassed ? "pass" : "fail"} />
            <PipelineStage label="Build" status={!testResults ? "pending" : hasLoadError ? "fail" : "pass"} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            Root-cause / approach explanation (graded as part of Communication)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            placeholder="e.g. The discount threshold check was comparing against the wrong constant…"
            style={{ width: "100%", minHeight: 70, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>

        <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          Run Tests executes your actual code in a real, isolated JS worker against the mission's real test cases —
          nothing here is simulated. Those results are handed to the AI Reviewer as ground truth alongside your code,
          and Submit posts a real ELO update.
        </div>
    </div>
  )
}
