// EceWorkstationV2.jsx — Arena V2, sixth role workspace (Electronics Engineer / ECE)
// ---------------------------------------------------------------------------
// An analog electronics lab, deliberately nothing like the ML notebook, the
// Software IDE, the SOC desk, the DevOps console, or the DBA lab: a
// schematic viewer, a component explorer, an on-demand probe of the op-amp
// output waveform (before/after), a feedback-resistor simulation mechanic,
// and a measurement table — same "simulated is fine, must feel real, reveal
// only on demand" discipline as the DBA query-plan viewer, applied here to
// circuit measurements instead of EXPLAIN ANALYZE output. There is no live
// SPICE simulation here on purpose — the mission's payload pre-computes
// honest, physically-consistent numbers (Ohm's-law gain math a real
// engineer would derive), not a fabricated pass/fail.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// component value plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which components were inspected, whether the
// output was probed, which candidate resistor was simulated). This reuses
// rubricReview.js's existing generalized fields exactly as the four earlier
// domain phases did — this phase required ZERO backend code changes, only
// new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: schematic, component explorer, signal inspector,
// measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other five workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function SchematicViewer({ blocks = [] }) {
  const w = 150, h = 70, gap = 60
  const width = blocks.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Schematic — Signal Path</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={140}>
          {blocks.map((b, i) => {
            const x = gap + i * (w + gap)
            const y = 35
            return (
              <g key={b.id}>
                {i > 0 && (
                  <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrow)" />
                )}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={b.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={b.flagged ? "#f87171" : "#334155"} strokeWidth={b.flagged ? 2 : 1} />
                <text x={x + 10} y={y + 20} fontSize={11} fontWeight={700} fill="#e2e8f0">{b.label}</text>
                <text x={x + 10} y={y + 36} fontSize={10} fill="#94a3b8">{b.detail1}</text>
                {b.detail2 && <text x={x + 10} y={y + 50} fontSize={10} fill={b.flagged ? "#f87171" : "#94a3b8"}>{b.detail2}</text>}
              </g>
            )
          })}
          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="#334155" />
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Component Explorer</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["ref", "role", "value"].map((c) => (
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

function SignalChart({ points, rail, afterPoints }) {
  const width = 380, height = 160, pad = 30
  const maxV = rail + 0.5
  const xScale = (psi) => pad + (psi / 100) * (width - 2 * pad)
  const yScale = (v) => height - pad - (Math.min(v, maxV) / maxV) * (height - 2 * pad)
  const path = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.psi)},${yScale(p.vout)}`).join(" ")
  return (
    <svg width={width} height={height} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 6 }}>
      <line x1={pad} y1={yScale(rail)} x2={width - pad} y2={yScale(rail)} stroke="#f87171" strokeDasharray="4 3" strokeWidth={1} />
      <text x={width - pad - 60} y={yScale(rail) - 4} fontSize={9} fill="#f87171">rail ({rail}V)</text>
      <path d={path(points)} fill="none" stroke="#f87171" strokeWidth={2} />
      {afterPoints && <path d={path(afterPoints)} fill="none" stroke="#4ade80" strokeWidth={2} />}
      <text x={pad} y={height - 8} fontSize={9} fill="#64748b">0 PSI</text>
      <text x={width - pad - 30} y={height - 8} fontSize={9} fill="#64748b">100 PSI</text>
    </svg>
  )
}

function SignalInspector({ measurements, rail, probed, onProbe, afterMeasurements }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Signal Inspector — Op-Amp Output vs Pressure</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Probe Op-Amp Output
        </button>
      ) : (
        <div>
          <SignalChart
            points={measurements.map((m) => ({ psi: m.psi, vout: m.voutBefore }))}
            rail={rail}
            afterPoints={afterMeasurements ? afterMeasurements.map((m) => ({ psi: m.psi, vout: m.voutAfter })) : null}
          />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
            <span style={{ color: "#f87171" }}>■</span> before (installed) {afterMeasurements && <><span style={{ marginLeft: 10, color: "#4ade80" }}>■</span> after (simulated)</>}
          </div>
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ measurements, probed, afterMeasurements, rail }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Probe the output to see node measurements.</div>
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Probe Panel — Node Measurements</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["PSI", "Vin (sensor)", "Vout before", "clipped?", ...(afterMeasurements ? ["Vout after"] : [])].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {measurements.map((m, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{m.psi}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{m.vin.toFixed(3)} V</td>
                <td style={{ padding: "3px 6px", color: m.voutBefore >= rail ? "#f87171" : "#cbd5e1" }}>{m.voutBefore.toFixed(2)} V</td>
                <td style={{ padding: "3px 6px", color: m.voutBefore >= rail ? "#f87171" : "#4ade80" }}>{m.voutBefore >= rail ? "yes" : "no"}</td>
                {afterMeasurements && (
                  <td style={{ padding: "3px 6px", color: "#4ade80" }}>{afterMeasurements[i].voutAfter.toFixed(2)} V</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CandidateManager({ candidates = [], simulatedId, onSimulate }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Feedback Resistors</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>
              Rf = {c.rf} → gain ≈ {c.gain}x
            </div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this value"}
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
 *                      acceptanceCriteria?: string[], schematicBlocks?: Array,
 *                      components?: Array, measurements?: Array, rail?: number,
 *                      candidateResistors?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function EceWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const blocks = payload?.schematicBlocks || []
  const components = payload?.components || []
  const measurements = payload?.measurements || []
  const rail = payload?.rail ?? 3.3
  const candidates = payload?.candidateResistors || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  const afterMeasurements = useMemo(() => {
    if (!simulated) return null
    return measurements.map((m) => ({ ...m, voutAfter: Math.min(m.vin * simulated.gain, rail) }))
  }, [simulated, measurements, rail])

  const probeOutput = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "PROBE op-amp output vs pressure sweep"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE Rf=${c.rf} (gain≈${c.gain}x)`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <SchematicViewer blocks={blocks} />
      <ComponentExplorer components={components} />
      <SignalInspector measurements={measurements} rail={rail} probed={probed} onProbe={probeOutput} afterMeasurements={afterMeasurements} />
      <MeasurementTable measurements={measurements} probed={probed} afterMeasurements={afterMeasurements} rail={rail} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended feedback resistor value and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Replace Rf (currently 180 kΩ) with approximately 51 kΩ. With R1 = 10 kΩ this sets a gain of about 6.1, mapping the full 0-0.5V sensor range to about 0-3.05V without exceeding the 3.3V single-supply rail…"}
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
        The measurements above are the mission&apos;s real pre-computed gain-stage math for the installed circuit and
        each candidate resistor — nothing here is a canned pass/fail. Your investigation sequence (components
        inspected, output probed, candidate simulated) is sent with your answer as evidence for the AI Reviewer, and
        Submit posts a real score update.
      </div>
    </div>
  )
}
