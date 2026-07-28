// EeeWorkstationV2.jsx — Arena V2, seventh role workspace (Electrical Engineer / EEE)
// ---------------------------------------------------------------------------
// A power-systems lab, deliberately nothing like the ML notebook, the
// Software IDE, the SOC desk, the DevOps console, the DBA lab, or the ECE
// analog lab: a power-path block diagram, a component explorer, an
// on-demand transient inspector (rail droop vs. time during a motor
// turn-on), and a bulk-capacitor simulation mechanic — same "reveal only on
// demand, simulate with real physics, not a canned toggle" discipline as
// the DBA query-plan viewer and the ECE signal inspector. There is no live
// SPICE simulation here on purpose — the droop model is the same
// first-order capacitor-droop relationship a power engineer would actually
// reach for in a design review: droop = (load step current x regulator
// response time) / bulk capacitance. It is a simplified model (ESR and the
// regulator's control-loop dynamics are not modeled), and the workstation
// says so directly rather than implying SPICE-grade precision.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// capacitor value plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which components were inspected, whether the
// rail was probed, which candidate capacitor was simulated). This reuses
// rubricReview.js's existing generalized fields exactly as the five earlier
// domain phases did — this phase required ZERO backend code changes, only
// new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: power-path diagram, component explorer, transient
// inspector, measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other six workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function PowerPathViewer({ blocks = [] }) {
  const w = 150, h = 70, gap = 55
  const width = blocks.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Power Path — Supply to Load</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={150}>
          {blocks.map((b, i) => {
            const x = gap + i * (w + gap)
            const y = 35
            return (
              <g key={b.id}>
                {i > 0 && (
                  <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrow2)" />
                )}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={b.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={b.flagged ? "#f87171" : "#334155"} strokeWidth={b.flagged ? 2 : 1} />
                <text x={x + 10} y={y + 20} fontSize={11} fontWeight={700} fill="#e2e8f0">{b.label}</text>
                <text x={x + 10} y={y + 36} fontSize={10} fill="#94a3b8">{b.detail1}</text>
                {b.detail2 && <text x={x + 10} y={y + 50} fontSize={10} fill={b.flagged ? "#f87171" : "#94a3b8"}>{b.detail2}</text>}
                {b.probe && <text x={x + w / 2 - 22} y={y - 8} fontSize={10} fill="#60a5fa">▼ probe: {b.probe}</text>}
              </g>
            )
          })}
          <defs>
            <marker id="arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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

function DroopChart({ before, after, rail, brownout }) {
  const width = 380, height = 160, pad = 30
  const maxT = Math.max(...before.map((p) => p.t))
  const minV = brownout - 0.8
  const xScale = (t) => pad + (t / maxT) * (width - 2 * pad)
  const yScale = (v) => height - pad - ((v - minV) / (rail + 0.1 - minV)) * (height - 2 * pad)
  const path = (pts) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.t)},${yScale(p.v)}`).join(" ")
  return (
    <svg width={width} height={height} style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 6 }}>
      <line x1={pad} y1={yScale(brownout)} x2={width - pad} y2={yScale(brownout)} stroke="#f87171" strokeDasharray="4 3" strokeWidth={1} />
      <text x={width - pad - 90} y={yScale(brownout) - 4} fontSize={9} fill="#f87171">brownout ({brownout}V)</text>
      <path d={path(before)} fill="none" stroke="#f87171" strokeWidth={2} />
      {after && <path d={path(after)} fill="none" stroke="#4ade80" strokeWidth={2} />}
      <text x={pad} y={height - 8} fontSize={9} fill="#64748b">t=0 (motor on)</text>
      <text x={width - pad - 60} y={height - 8} fontSize={9} fill="#64748b">recovered</text>
    </svg>
  )
}

function TransientInspector({ before, after, rail, brownout, probed, onProbe }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Transient Inspector — Rail Voltage During Motor Turn-On</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Probe Rail During Motor Turn-On
        </button>
      ) : (
        <div>
          <DroopChart before={before} after={after} rail={rail} brownout={brownout} />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
            <span style={{ color: "#f87171" }}>■</span> before (installed) {after && <><span style={{ marginLeft: 10, color: "#4ade80" }}>■</span> after (simulated)</>}
          </div>
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, brownout, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Probe the rail to see node measurements.</div>
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Probe Panel — Rail Voltage vs Time</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["t (µs)", "V before", "brownout?", ...(after ? ["V after"] : [])].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {before.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{p.t}</td>
                <td style={{ padding: "3px 6px", color: p.v < brownout ? "#f87171" : "#cbd5e1" }}>{p.v.toFixed(2)} V</td>
                <td style={{ padding: "3px 6px", color: p.v < brownout ? "#f87171" : "#4ade80" }}>{p.v < brownout ? "yes" : "no"}</td>
                {after && (
                  <td style={{ padding: "3px 6px", color: after[i].v < brownout ? "#f87171" : "#4ade80" }}>{after[i].v.toFixed(2)} V</td>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Bulk Capacitors</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>
              {c.label}
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
 *                      acceptanceCriteria?: string[], powerPathBlocks?: Array,
 *                      components?: Array, rail?: number, brownoutThreshold?: number,
 *                      loadStepAmps?: number, regulatorResponseUs?: number,
 *                      dipShape?: Array, installedCapacitanceUf?: number,
 *                      candidateCapacitors?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function EeeWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const blocks = payload?.powerPathBlocks || []
  const components = payload?.components || []
  const rail = payload?.rail ?? 5.0
  const brownout = payload?.brownoutThreshold ?? 4.5
  const loadStepAmps = payload?.loadStepAmps ?? 0
  const responseUs = payload?.regulatorResponseUs ?? 0
  const dipShape = payload?.dipShape || []
  const installedUf = payload?.installedCapacitanceUf ?? 1
  const candidates = payload?.candidateCapacitors || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven droop model (see file header): droop = (loadStep *
  // responseTime) / capacitance, applied against the mission's dip-shape
  // curve. Not a canned toggle — a different candidate produces a
  // genuinely different, physically-derived curve.
  const droopFor = useCallback((capacitanceUf) => (loadStepAmps * responseUs) / capacitanceUf, [loadStepAmps, responseUs])

  const beforeCurve = useMemo(
    () => dipShape.map((p) => ({ t: p.t, v: rail - p.frac * droopFor(installedUf) })),
    [dipShape, rail, installedUf, droopFor]
  )

  const afterCurve = useMemo(() => {
    if (!simulated) return null
    const d = droopFor(simulated.capacitanceUf)
    return dipShape.map((p) => ({ t: p.t, v: rail - p.frac * d }))
  }, [simulated, dipShape, rail, droopFor])

  const probeRail = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "PROBE rail voltage during motor turn-on"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE C_BULK=${c.label}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <PowerPathViewer blocks={blocks} />
      <ComponentExplorer components={components} />
      <TransientInspector before={beforeCurve} after={afterCurve} rail={rail} brownout={brownout} probed={probed} onProbe={probeRail} />
      <MeasurementTable before={beforeCurve} after={afterCurve} brownout={brownout} probed={probed} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended bulk capacitor value and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Replace the 22 uF bulk capacitor with approximately 100 uF. That limits the droop during the 2.8A motor turn-on step to about 0.28V, keeping the rail at about 4.72V, comfortably above the 4.5V brownout threshold, without oversizing the capacitor bank…"}
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
        The droop numbers above come from a real first-order capacitor-droop model, droop = load step x regulator
        response time / capacitance, applied honestly to the installed part and each candidate — this is a
        simplified model (no ESR or control-loop dynamics), not a SPICE-grade simulation, and the workstation does
        not claim otherwise. Your investigation sequence is sent with your answer as evidence for the AI Reviewer,
        and Submit posts a real score update.
      </div>
    </div>
  )
}
