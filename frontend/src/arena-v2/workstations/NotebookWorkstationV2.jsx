// NotebookWorkstationV2.jsx — Arena V2 Pilot Phase (ML/AI Engineer)
// ---------------------------------------------------------------------------
// The pilot vertical-slice workspace: real Python execution via Pyodide
// (pandas + matplotlib + scikit-learn, actually running in-browser — reusing
// the proven `loadPython` loader from services/workstationEngine.js rather
// than a scaffold/fake runner, per the standing "real execution engine,
// never static dummies" requirement), a live dataset preview, a mission
// checklist, and (after submit) the AI Reviewer's structured findings.
//
// Same layering discipline as SqlWorkstationV2.jsx: this component never
// imports arenaV2Submission.js or calls the Submission API itself — it only
// calls the `onSubmit` prop handed down by ArenaV2ChallengeShell.jsx, which
// owns auth, timing, and the network call.
//
// ANTI-PASTE RULE (scoped to this pilot editor only, per instruction — not a
// global editor lock): paste is blocked with onPaste/onDrop preventDefault
// on the answer textarea specifically. This is a UX nudge, not a security
// boundary — a determined student can still type from a second window — but
// it's honest about that: no claim of unbypassable enforcement is made
// anywhere in this component or its copy.
import { useCallback, useEffect, useRef, useState } from "react"
import { loadPython } from "../../services/workstationEngine.js"

const PY_RUNNER = `
import sys, io, json, base64, traceback
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

plt.close('all')
__buf = io.StringIO()
__old_stdout = sys.stdout
sys.stdout = __buf
__error = None
try:
    exec(compile(__USER_CODE, '<your code>', 'exec'), globals())
except Exception:
    __error = traceback.format_exc()
finally:
    sys.stdout = __old_stdout

__images = []
for __n in plt.get_fignums():
    __b = io.BytesIO()
    plt.figure(__n).savefig(__b, format='png', dpi=110, bbox_inches='tight')
    __images.append(base64.b64encode(__b.getvalue()).decode())
plt.close('all')

json.dumps({'stdout': __buf.getvalue(), 'error': __error, 'images': __images})
`

function parseCsvPreview(csv, maxRows = 8) {
  if (!csv) return { columns: [], rows: [] }
  const lines = csv.trim().split("\n")
  const columns = (lines[0] || "").split(",")
  const rows = lines.slice(1, 1 + maxRows).map((line) => line.split(","))
  return { columns, rows, totalRows: lines.length - 1 }
}

function DatasetPreview({ csv }) {
  const { columns, rows, totalRows } = parseCsvPreview(csv)
  if (!columns.length) return null
  return (
    <div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
        Dataset preview — {rows.length} of {totalRows} row(s) shown (real data, mounted at <code>/data/customers.csv</code>)
      </div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} style={{ padding: "5px 8px", textAlign: "left", fontWeight: 700, borderBottom: "1px solid #334155", background: "#0f172a" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                {r.map((cell, ci) => <td key={ci} style={{ padding: "4px 8px" }}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, checklist?: string[], acceptanceCriteria?: string[],
 *                      starterCode?: string, datasetSchemaDescription?: string, datasetCsv?: string },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 *
 * Center-panel-only component — the mission header, ticket/prompt box, and
 * mission checklist that used to live here now come from the shared
 * ArenaV2WorkspaceShell (top bar / left brief panel / right mission-control
 * panel respectively). This component owns exactly the notebook: dataset
 * preview, code editor + Run Cell, console output, and the notes field —
 * plus the Submit button, since assembling `{code, notes}` is domain logic
 * that belongs here, not in the shared shell.
 */
export default function NotebookWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const [code, setCode] = useState(payload?.starterCode || "")
  const [notes, setNotes] = useState("")
  const [pyStatus, setPyStatus] = useState("Real Python (pandas + scikit-learn) loads on first run — this workstation never simulates output.")
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const pyRef = useRef(null)

  const runCode = useCallback(async () => {
    if (!code.trim() || running) return
    setRunning(true)
    setRunResult(null)
    try {
      if (!pyRef.current) {
        pyRef.current = await loadPython(setPyStatus)
        setPyStatus("Loading scikit-learn (first run only)…")
        await pyRef.current.loadPackage(["scikit-learn"])
      }
      const py = pyRef.current
      setPyStatus("Running your code…")
      try { py.FS.mkdir("/data") } catch { /* already exists */ }
      py.FS.writeFile("/data/customers.csv", payload?.datasetCsv || "")
      py.globals.set("__USER_CODE", code)
      const raw = await py.runPythonAsync(PY_RUNNER)
      setRunResult(JSON.parse(raw))
      setPyStatus("Ready.")
    } catch (e) {
      setRunResult({ stdout: "", error: e.message || String(e), images: [] })
      setPyStatus("Ready.")
    }
    setRunning(false)
  }, [code, running, payload])

  useEffect(() => {
    // Warm the Pyodide download in the background as soon as the mission
    // loads, so the student's first "Run" doesn't eat the full download
    // time — same courtesy the legacy notebook mission gives students.
    loadPython(() => {}).then((py) => { pyRef.current = py }).catch(() => {})
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!code.trim() || isSubmitting) return
    onSubmit?.({ code, notes })
  }, [code, notes, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
        <DatasetPreview csv={payload?.datasetCsv} />

        {payload?.datasetSchemaDescription && (
          <details style={{ fontSize: 12, color: "#94a3b8" }}>
            <summary style={{ cursor: "pointer" }}>Dataset schema</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>{payload.datasetSchemaDescription}</pre>
          </details>
        )}

        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            Notebook cell — type your solution (paste is disabled in this pilot editor)
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            placeholder="Write your Python here…"
            spellCheck={false}
            style={{ width: "100%", minHeight: 260, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={runCode} disabled={running || !code.trim()} style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700 }}>
            {running ? "Running…" : "▶ Run Cell"}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!code.trim() || isSubmitting}
            style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none" }}
          >
            {isSubmitting ? "Submitting for AI review…" : "Submit for AI Review"}
          </button>
        </div>

        <div style={{ fontSize: 11, color: "#64748b" }}>{pyStatus}</div>

        {runResult && (
          <div style={{ padding: 12, background: "#0b1220", borderRadius: 8, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Console output</div>
            {runResult.error && (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#fca5a5", margin: 0 }}>{runResult.error}</pre>
            )}
            {runResult.stdout && (
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#e2e8f0", margin: 0 }}>{runResult.stdout}</pre>
            )}
            {!runResult.error && !runResult.stdout && (
              <div style={{ fontSize: 12, color: "#64748b" }}>(no output — try adding print() statements)</div>
            )}
            {runResult.images?.map((img, i) => (
              <img key={i} src={`data:image/png;base64,${img}`} alt={`chart ${i + 1}`} style={{ maxWidth: "100%", marginTop: 8, borderRadius: 6 }} />
            ))}
          </div>
        )}

        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
            Written takeaway (2-3 sentences — this is graded as part of Communication)
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            placeholder="e.g. Customers on month-to-month contracts with 3+ support tickets are far more likely to churn…"
            style={{ width: "100%", minHeight: 70, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>

        <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
          This is real CPython (Pyodide) running pandas, matplotlib, and scikit-learn in your browser against the
          dataset above — nothing here is simulated. Run Cell to iterate freely; Submit sends your code and notes
          to the AI Reviewer, which grades against the mission rubric and posts a real ELO update.
        </div>
    </div>
  )
}
