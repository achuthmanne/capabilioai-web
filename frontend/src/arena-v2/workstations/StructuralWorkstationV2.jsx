// StructuralWorkstationV2.jsx — Arena V2, eighth role workspace (Structural / Civil Engineer)
// ---------------------------------------------------------------------------
// A structural engineering lab, deliberately nothing like the ML notebook,
// the Software IDE, the SOC desk, the DevOps console, the DBA lab, the ECE
// analog lab, or the EEE power lab: a framing diagram, a beam-section
// component explorer, an on-demand deflection inspector (a bowed-beam
// shape, not a time-series waveform — this is a static-load problem, not a
// transient one), and a candidate-beam simulation mechanic — same "reveal
// only on demand, simulate with real physics, not a canned toggle"
// discipline as every domain workstation before it. There is no live FEA
// here on purpose — the deflection model is the same classical formula a
// structural engineer would reach for in a first-pass hand check for a
// simply supported beam under uniform load: delta = 5wL^4 / (384EI). This
// is a simplified check (it ignores self-weight, shear deformation, and
// load factors a full code check would apply), and the workstation says so
// directly rather than implying a full code-compliant analysis.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// beam section plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which parameters were inspected, whether the
// deflection was probed, which candidate section was simulated). This
// reuses rubricReview.js's existing generalized fields exactly as the six
// earlier domain phases did — this phase required ZERO backend code
// changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: framing diagram, component explorer, deflection
// inspector, measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other seven workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function FramingDiagram({ spanFt, flagged }) {
  const width = 420, height = 130, pad = 40
  const beamY = 60
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Framing Diagram — Simply Supported Floor Beam</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, background: "#0b1220" }}>
        <svg width={width} height={height}>
          {Array.from({ length: 9 }).map((_, i) => {
            const x = pad + (i / 8) * (width - 2 * pad)
            return <line key={i} x1={x} y1={beamY - 22} x2={x} y2={beamY - 6} stroke="#60a5fa" strokeWidth={1.5} markerEnd="url(#arrowDown)" />
          })}
          <text x={width / 2 - 60} y={beamY - 26} fontSize={10} fill="#60a5fa">uniform live load</text>
          <line x1={pad} y1={beamY} x2={width - pad} y2={beamY} stroke={flagged ? "#f87171" : "#e2e8f0"} strokeWidth={4} />
          <polygon points={`${pad},${beamY + 4} ${pad - 10},${beamY + 22} ${pad + 10},${beamY + 22}`} fill="#334155" />
          <polygon points={`${width - pad},${beamY + 4} ${width - pad - 10},${beamY + 22} ${width - pad + 10},${beamY + 22}`} fill="#334155" />
          <text x={width / 2 - 20} y={beamY + 40} fontSize={11} fill="#94a3b8">span = {spanFt} ft</text>
          <defs>
            <marker id="arrowDown" markerWidth="6" markerHeight="6" refX="3" refY="6" orient="auto">
              <path d="M0,0 L6,0 L3,6 Z" fill="#60a5fa" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function ComponentExplorer({ components = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Component / Parameter Explorer</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["parameter", "role", "value"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #1e293b", background: c.flagged ? "rgba(248,113,113,0.06)" : "transparent" }}>
                <td style={{ padding: "3px 6px", fontWeight: 700, color: c.flagged ? "#f87171" : "#e2e8f0" }}>{c.id}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{c.role}</td>
                <td style={{ padding: "3px 6px", color: c.flagged ? "#f87171" : "#cbd5e1", fontFamily: "monospace" }}>{c.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BowedBeamShape({ label, deflectionIn, limitIn, color }) {
  const width = 320, height = 90, pad = 20
  const overLimit = deflectionIn > limitIn
  // Sag is exaggerated for visibility, scaled relative to the limit so
  // "over limit" always visibly sags more than "within limit" — a real
  // proportion, not a fixed prop.
  const sagPx = Math.min((deflectionIn / limitIn) * 22, 60)
  const midX = width / 2
  const path = `M${pad},${pad} Q${midX},${pad + sagPx} ${width - pad},${pad}`
  return (
    <div style={{ flex: 1, minWidth: 220 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      <svg width={width} height={height} style={{ background: "#0b1220", border: `1px solid ${overLimit ? "#7f1d1d" : "#14532d"}`, borderRadius: 6 }}>
        <path d={path} fill="none" stroke={color} strokeWidth={3} />
        <text x={pad} y={height - 8} fontSize={10} fill={overLimit ? "#f87171" : "#4ade80"}>
          δ = {deflectionIn.toFixed(3)} in {overLimit ? "(exceeds L/360)" : "(within L/360)"}
        </text>
      </svg>
    </div>
  )
}

function DeflectionInspector({ before, after, limitIn, probed, onProbe }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Deflection Inspector — Midspan</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Probe Midspan Deflection
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <BowedBeamShape label="Before (installed)" deflectionIn={before} limitIn={limitIn} color="#f87171" />
          {after != null && <BowedBeamShape label="After (simulated)" deflectionIn={after} limitIn={limitIn} color="#4ade80" />}
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, limitIn, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Probe the midspan deflection to see measurements.</div>
  const marginPct = (v) => (((limitIn - v) / limitIn) * 100).toFixed(0)
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Measurement Summary</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["state", "deflection", "L/360 limit", "margin", "status"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #1e293b" }}>
              <td style={{ padding: "3px 6px" }}>Before</td>
              <td style={{ padding: "3px 6px", color: before > limitIn ? "#f87171" : "#cbd5e1" }}>{before.toFixed(3)} in</td>
              <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{limitIn.toFixed(3)} in</td>
              <td style={{ padding: "3px 6px", color: before > limitIn ? "#f87171" : "#4ade80" }}>{marginPct(before)}%</td>
              <td style={{ padding: "3px 6px", color: before > limitIn ? "#f87171" : "#4ade80" }}>{before > limitIn ? "exceeds limit" : "ok"}</td>
            </tr>
            {after != null && (
              <tr>
                <td style={{ padding: "3px 6px" }}>After</td>
                <td style={{ padding: "3px 6px", color: after > limitIn ? "#f87171" : "#cbd5e1" }}>{after.toFixed(3)} in</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{limitIn.toFixed(3)} in</td>
                <td style={{ padding: "3px 6px", color: after > limitIn ? "#f87171" : "#4ade80" }}>{marginPct(after)}%</td>
                <td style={{ padding: "3px 6px", color: after > limitIn ? "#f87171" : "#4ade80" }}>{after > limitIn ? "exceeds limit" : "ok"}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CandidateManager({ candidates = [], simulatedId, onSimulate }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Beam Sections</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>
              {c.label} — I ≈ {c.momentOfInertia} in⁴
            </div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this section"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * @param {{ challengeInstanceId: string, skill?: string, difficulty?: string,
 *           payload: { prompt?: string, ticket?: object, checklist?: string[],
 *                      acceptanceCriteria?: string[], spanFt?: number,
 *                      loadLbPerFt?: number, modulusPsi?: number,
 *                      installedMomentOfInertia?: number, deflectionLimitIn?: number,
 *                      components?: Array, candidateSections?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function StructuralWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const spanFt = payload?.spanFt ?? 20
  const loadLbPerFt = payload?.loadLbPerFt ?? 0
  const modulusPsi = payload?.modulusPsi ?? 29000000
  const installedI = payload?.installedMomentOfInertia ?? 1
  const limitIn = payload?.deflectionLimitIn ?? (spanFt * 12) / 360
  const components = payload?.components || []
  const candidates = payload?.candidateSections || []
  const flagged = components.some((c) => c.flagged)

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven deflection model (see file header): a classical
  // simply-supported-beam-under-uniform-load hand check, delta = 5wL^4 /
  // (384 E I). A different candidate I produces a genuinely different,
  // physically-derived deflection, not a canned toggle.
  const deflectionFor = useCallback((momentOfInertia) => {
    const wLbPerIn = loadLbPerFt / 12
    const lIn = spanFt * 12
    return (5 * wLbPerIn * Math.pow(lIn, 4)) / (384 * modulusPsi * momentOfInertia)
  }, [loadLbPerFt, spanFt, modulusPsi])

  const beforeDeflection = useMemo(() => deflectionFor(installedI), [deflectionFor, installedI])
  const afterDeflection = useMemo(() => (simulated ? deflectionFor(simulated.momentOfInertia) : null), [simulated, deflectionFor])

  const probeDeflection = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "PROBE midspan deflection under rated live load"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE section=${c.label} (I≈${c.momentOfInertia} in^4)`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <FramingDiagram spanFt={spanFt} flagged={flagged} />
      <ComponentExplorer components={components} />
      <DeflectionInspector before={beforeDeflection} after={afterDeflection} limitIn={limitIn} probed={probed} onProbe={probeDeflection} />
      <MeasurementTable before={beforeDeflection} after={afterDeflection} limitIn={limitIn} probed={probed} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended beam section and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Specify a W8x13 (I ≈ 39.6 in^4) in place of the installed W8x10. Deflection under the 200 lb/ft live load over the 20 ft span drops to about 0.63 in, within the L/360 limit of about 0.67 in with a reasonable margin…"}
          style={{ width: "100%", minHeight: 140, fontFamily: "monospace", fontSize: 13, padding: 10, borderRadius: 8, background: "#0b1220", color: "#e2e8f0", border: "1px solid #1e293b" }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!answer.trim() || isSubmitting}
        style={{ padding: "6px 14px", borderRadius: 6, fontWeight: 700, background: "#4ade80", color: "#0f172a", border: "none", alignSelf: "flex-start" }}
      >
        {isSubmitting ? "Submitting for AI review…" : "Submit Fix for AI Review"}
      </button>

      <div style={{ fontSize: 12, color: "#64748b", borderTop: "1px solid #1e293b", paddingTop: 10 }}>
        The deflection numbers above come from a real classical beam-deflection formula, delta = 5wL^4 / (384EI),
        applied honestly to the installed section and each candidate — this is a simplified hand-check model (no
        self-weight, shear deformation, or code load factors), not a full FEA analysis, and the workstation does not
        claim otherwise. Your investigation sequence is sent with your answer as evidence for the AI Reviewer, and
        Submit posts a real score update.
      </div>
    </div>
  )
}
