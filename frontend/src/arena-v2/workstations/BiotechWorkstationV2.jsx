// BiotechWorkstationV2.jsx — Arena V2, tenth role workspace (Bioprocess Engineer)
// ---------------------------------------------------------------------------
// A bioprocess lab, deliberately nothing like any of the nine workstations
// before it: an SVG process-flow diagram (feed -> bioreactor -> sensors ->
// harvest/assay), a parameter explorer, an on-demand culture/assay
// inspector reading as gauge bars (pH and DO each shown against an optimum
// band, not a pass/fail threshold — this is an optimum-seeking problem, not
// a "clear the bar" problem), and a candidate-setpoint simulation
// mechanic. Same "reveal only on demand, simulate with real math, not a
// canned toggle" discipline as every domain workstation before it.
//
// Unlike the physics-formula domains before it (Ohm's law, beam
// deflection, drivetrain torque), a bioprocess does not have a clean
// closed-form yield equation — real bioprocess engineers characterize
// yield against pH/DO using empirical response-surface models from
// design-of-experiments data, not first-principles kinetics. This
// workstation models that honestly: titer = baselineTiter x pHFactor(pH) x
// doFactor(DO), where pHFactor is a symmetric penalty around the pH
// optimum (moving off-optimum in either direction hurts) and doFactor
// saturates at the DO optimum (more agitation past the optimum does not
// help further, and in reality risks shear stress on the cells). This is a
// simplified, illustrative empirical model, not a validated DOE surface
// from real process data, and the workstation says so directly.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// pH/DO setpoints plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which parameters were inspected, whether the
// culture was assayed, which candidate setpoints were simulated). This
// reuses rubricReview.js's existing generalized fields exactly as the
// eight earlier domain phases did — this phase required ZERO backend code
// changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: process-flow diagram, parameter explorer, culture
// inspector, measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other nine workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function ProcessFlowViewer({ blocks = [] }) {
  const w = 140, h = 70, gap = 50
  const width = blocks.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Process Flow — Feed to Harvest</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={140}>
          {blocks.map((b, i) => {
            const x = gap + i * (w + gap)
            const y = 35
            return (
              <g key={b.id}>
                {i > 0 && (
                  <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrow4)" />
                )}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={b.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={b.flagged ? "#f87171" : "#334155"} strokeWidth={b.flagged ? 2 : 1} />
                <text x={x + 8} y={y + 20} fontSize={11} fontWeight={700} fill="#e2e8f0">{b.label}</text>
                <text x={x + 8} y={y + 36} fontSize={9.5} fill="#94a3b8">{b.detail1}</text>
                {b.detail2 && <text x={x + 8} y={y + 50} fontSize={9.5} fill={b.flagged ? "#f87171" : "#94a3b8"}>{b.detail2}</text>}
              </g>
            )
          })}
          <defs>
            <marker id="arrow4" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="#334155" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function ParameterExplorer({ components = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Parameter Explorer</div>
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

function GaugeBar({ label, value, unit, min, max, okMin, okMax, passed }) {
  const width = 300, height = 34, pad = 8
  const pos = (v) => pad + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (width - 2 * pad)
  const bandX1 = pos(okMin), bandX2 = pos(okMax)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>
        {label}: <span style={{ color: passed ? "#4ade80" : "#f87171", fontWeight: 700 }}>{value} {unit}</span>
      </div>
      <svg width={width} height={height}>
        <rect x={pad} y={12} width={width - 2 * pad} height={10} rx={5} fill="#1e293b" />
        <rect x={bandX1} y={12} width={Math.max(bandX2 - bandX1, 2)} height={10} rx={5} fill="rgba(74,222,128,0.25)" />
        <line x1={pos(value)} y1={4} x2={pos(value)} y2={30} stroke={passed ? "#4ade80" : "#f87171"} strokeWidth={3} />
      </svg>
    </div>
  )
}

function CultureAssayInspector({ before, after, probed, onProbe }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Culture / Assay Inspector</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Run Culture Assay
        </button>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Before (installed)</div>
            <GaugeBar label="pH" value={before.pH} unit="" min={6.5} max={7.5} okMin={6.95} okMax={7.05} passed={before.pH >= 6.95 && before.pH <= 7.05} />
            <GaugeBar label="Dissolved oxygen" value={before.doPct} unit="%" min={0} max={70} okMin={40} okMax={70} passed={before.doPct >= 40} />
            <GaugeBar label="Titer" value={before.titer} unit="g/L" min={0} max={3.5} okMin={before.threshold} okMax={3.5} passed={before.titer >= before.threshold} />
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Viability: {before.viability}% · Contamination: {before.contamination}</div>
          </div>
          {after && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>After (simulated)</div>
              <GaugeBar label="pH" value={after.pH} unit="" min={6.5} max={7.5} okMin={6.95} okMax={7.05} passed={after.pH >= 6.95 && after.pH <= 7.05} />
              <GaugeBar label="Dissolved oxygen" value={after.doPct} unit="%" min={0} max={70} okMin={40} okMax={70} passed={after.doPct >= 40} />
              <GaugeBar label="Titer" value={after.titer} unit="g/L" min={0} max={3.5} okMin={after.threshold} okMax={3.5} passed={after.titer >= after.threshold} />
              <div style={{ fontSize: 11, color: "#94a3b8" }}>Viability: {after.viability}% · Contamination: {after.contamination}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Run the culture assay to see measurements.</div>
  const rows = [{ label: "Before", m: before }, ...(after ? [{ label: "After", m: after }] : [])]
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Measurement Summary</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["state", "pH", "DO", "titer", "meets target?"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{r.label}</td>
                <td style={{ padding: "3px 6px", color: "#cbd5e1" }}>{r.m.pH}</td>
                <td style={{ padding: "3px 6px", color: "#cbd5e1" }}>{r.m.doPct}%</td>
                <td style={{ padding: "3px 6px", color: r.m.titer >= r.m.threshold ? "#cbd5e1" : "#f87171" }}>{r.m.titer.toFixed(2)} g/L</td>
                <td style={{ padding: "3px 6px", color: r.m.titer >= r.m.threshold ? "#4ade80" : "#f87171" }}>{r.m.titer >= r.m.threshold ? "yes" : "no"}</td>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Setpoints</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>{c.label}</div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this setpoint"}
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
 *                      acceptanceCriteria?: string[], baselineTiter?: number,
 *                      recoveryThreshold?: number, installedPh?: number,
 *                      installedDoPct?: number, processBlocks?: Array,
 *                      components?: Array, candidateSetpoints?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function BiotechWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const baselineTiter = payload?.baselineTiter ?? 3.2
  const threshold = payload?.recoveryThreshold ?? baselineTiter * 0.85
  const installedPh = payload?.installedPh ?? 7.35
  const installedDo = payload?.installedDoPct ?? 15
  const blocks = payload?.processBlocks || []
  const components = payload?.components || []
  const candidates = payload?.candidateSetpoints || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven empirical yield model (see file header): titer =
  // baseline x pHFactor(pH) x doFactor(DO). pHFactor is a symmetric penalty
  // around pH 7.0; doFactor saturates at DO 40% (more agitation past
  // optimum does not help further). A different candidate setpoint pair
  // produces a genuinely different, formula-derived titer, not a canned
  // toggle. Viability is a secondary, informational readout only — not part
  // of the graded titer threshold.
  const assayFor = useCallback((pH, doPct) => {
    const pHFactor = Math.max(0, 1 - 4 * Math.pow(pH - 7.0, 2))
    const doFactor = Math.min(1, doPct / 40)
    const titer = baselineTiter * pHFactor * doFactor
    const viability = Math.min(95, Math.round(60 + 35 * Math.min(1, doPct / 40)))
    return { pH, doPct, titer, threshold, viability, contamination: "negative" }
  }, [baselineTiter, threshold])

  const before = useMemo(() => assayFor(installedPh, installedDo), [assayFor, installedPh, installedDo])
  const after = useMemo(() => (simulated ? assayFor(simulated.pH, simulated.doPct) : null), [simulated, assayFor])

  const probeAssay = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "RUN culture assay (pH, DO, titer, viability, contamination)"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE setpoints=${c.label}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <ProcessFlowViewer blocks={blocks} />
      <ParameterExplorer components={components} />
      <CultureAssayInspector before={before} after={after} probed={probed} onProbe={probeAssay} />
      <MeasurementTable before={before} after={after} probed={probed} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended pH/DO setpoints and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Correct the pH setpoint to 7.00 and raise dissolved oxygen to about 45% by increasing sparge/agitation. That brings titer back to about 3.2 g/L, matching the historical baseline, because the culture is no longer penalized by pH drift or oxygen limitation…"}
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
        The titer numbers above come from a real, disclosed-as-simplified empirical yield model, titer equals
        baseline titer times a pH penalty factor times a dissolved-oxygen factor, applied honestly to the installed
        setpoints and each candidate — not a validated design-of-experiments surface from real process data, and the
        workstation does not claim otherwise. Your investigation sequence is sent with your answer as evidence for
        the AI Reviewer, and Submit posts a real score update.
      </div>
    </div>
  )
}
