// SapConsoleWorkstationV2.jsx — Arena V2, SAP role workspace
// (Functional Consultant: FI/CO, MM/SD — and ABAP Developer)
// ---------------------------------------------------------------------------
// HONESTY NOTE (read before extending this file): there is no real SAP
// system to embed in-browser, unlike Pyodide (real Python) or the Web
// Worker JS runner (real execution) used elsewhere in Arena V2. This
// workstation does NOT claim to run real SAP transactions or real ABAP.
// It has two modes, both graded by the same real rubric_review AI reviewer
// every other workstation uses (rubricReview.js) — no new grading infra:
//
//   - "gui_config" mode: an SAP Easy Access-style shell (T-code bar, menu
//     tree) around a mock transaction screen built from real, authored
//     field data (payload.sapScreen). The candidate proposes the
//     configuration/navigation steps and a written justification — this is
//     a decision/reasoning exercise, the same shape as
//     TerminalWorkstationV2.jsx's incident-report pattern, not a live SAP
//     instance.
//   - "abap" mode: a code editor for ABAP syntax, explicitly labeled
//     "AI-reviewed, not executed" in the UI itself — no fabricated compiler
//     output, no fake "0 errors" message. If real ABAP execution is wanted
//     later, that's a separate, much larger engineering effort (there is no
//     existing ABAP-in-browser runtime to reuse) and should be scoped on
//     its own, not silently implied here.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx, never the Submission API
// directly. Same anti-paste UX nudge (not a security boundary) as
// NotebookWorkstationV2.jsx / CodeWorkstationV2.jsx.
import { useCallback, useState } from "react"

function SapChrome({ tcode, menuPath }) {
  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
      <div style={{ background: "#0f172a", padding: "6px 10px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1e293b" }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>Transaction code</span>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#4ade80", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 4, padding: "2px 8px" }}>{tcode}</span>
      </div>
      {menuPath && (
        <div style={{ background: "#0b1220", padding: "5px 10px", fontSize: 11, color: "#94a3b8" }}>
          {menuPath.join(" › ")}
        </div>
      )}
    </div>
  )
}

function SapFieldGrid({ fields = [] }) {
  if (!fields.length) return null
  return (
    <div style={{ border: "1px solid #1e293b", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 12, background: "#0b1220", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {fields.map((f, i) => (
        <div key={i}>
          <div style={{ fontSize: 10.5, color: "#64748b", marginBottom: 2 }}>{f.label}</div>
          <div style={{ fontSize: 12.5, color: "#e2e8f0", fontFamily: "monospace", background: "#0f172a", border: "1px solid #1e293b", borderRadius: 5, padding: "5px 8px" }}>{f.value}</div>
        </div>
      ))}
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, checklist?: string[], acceptanceCriteria?: string[],
 *                      sapMode?: "gui_config" | "abap", tcode?: string, menuPath?: string[],
 *                      sapScreen?: Array<{label:string,value:string}>, starterCode?: string,
 *                      answerLabel?: string },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function SapConsoleWorkstationV2({ payload, onSubmit, isSubmitting = false }) {
  const mode = payload?.sapMode === "abap" ? "abap" : "gui_config"
  const [steps, setSteps] = useState("")
  const [justification, setJustification] = useState("")
  const [code, setCode] = useState(payload?.starterCode || "")
  const [notes, setNotes] = useState("")

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmitConfig = useCallback(() => {
    if (!steps.trim() || isSubmitting) return
    // The AI reviewer grades free text against the mission's real rubric —
    // `code` doubles as the generic "candidate answer" field rubricReview.js
    // already reads (see its `submissionData.code` fallback), so the
    // structured steps + justification are combined into one submitted
    // answer rather than inventing a parallel submission shape.
    onSubmit?.({ code: `Proposed steps:\n${steps}\n\nJustification:\n${justification}`, notes: justification })
  }, [steps, justification, isSubmitting, onSubmit])

  const handleSubmitAbap = useCallback(() => {
    if (!code.trim() || isSubmitting) return
    onSubmit?.({ code, notes })
  }, [code, notes, isSubmitting, onSubmit])

  if (mode === "abap") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
        <SapChrome tcode={payload?.tcode || "SE38"} menuPath={payload?.menuPath} />
        <div style={{ fontSize: 11, color: "#fbbf24", background: "#78350f22", border: "1px solid #78350f55", borderRadius: 6, padding: "6px 10px" }}>
          AI-reviewed, not executed — there is no in-browser ABAP runtime today, so this editor does not compile or run your code. The AI Reviewer grades your logic, syntax, and approach against the mission rubric.
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>ABAP editor — type your solution (paste is disabled in this pilot editor)</div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            placeholder="REPORT z_example.&#10;..."
            spellCheck={false}
            style={{ width: "100%", minHeight: 300, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Written notes (approach, edge cases you considered)</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={blockPaste}
            onDrop={blockPaste}
            style={{ width: "100%", minHeight: 70, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
          />
        </div>
        <button
          onClick={handleSubmitAbap}
          disabled={!code.trim() || isSubmitting}
          style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none", alignSelf: "flex-start" }}
        >
          {isSubmitting ? "Submitting for AI review…" : "Submit for AI Review"}
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0, padding: 16 }}>
      <SapChrome tcode={payload?.tcode || "SPRO"} menuPath={payload?.menuPath} />
      <SapFieldGrid fields={payload?.sapScreen} />
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Proposed configuration / navigation steps — list each T-code and field change you&apos;d make, in order
        </div>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          placeholder={"1. Go to T-code ...\n2. Change field ... to ...\n3. Save and verify ..."}
          style={{ width: "100%", minHeight: 160, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
        />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          {payload?.answerLabel || "Written justification"} (2-4 sentences — why this fixes the ticket, graded as part of Communication)
        </div>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          style={{ width: "100%", minHeight: 90, fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
        />
      </div>
      <button
        onClick={handleSubmitConfig}
        disabled={!steps.trim() || isSubmitting}
        style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none", alignSelf: "flex-start" }}
      >
        {isSubmitting ? "Submitting for AI review…" : "Submit for AI Review"}
      </button>
      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        This is a config/decision exercise, not a live SAP system — the screen above shows real authored field data for this mission, and your proposed steps + justification are graded by the AI Reviewer against the mission rubric.
      </div>
    </div>
  )
}
