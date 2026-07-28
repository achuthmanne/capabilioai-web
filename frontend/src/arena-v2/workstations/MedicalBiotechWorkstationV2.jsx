// MedicalBiotechWorkstationV2.jsx — Arena V2, eleventh role workspace (Medical Biotechnology Specialist)
// ---------------------------------------------------------------------------
// A clinical assay lab, deliberately nothing like any of the ten
// workstations before it: an SVG assay workflow (sample prep -> primary
// antibody incubation -> secondary antibody incubation -> substrate
// development -> plate reader), a parameter explorer, an on-demand result
// inspector reading as control-OD gauge bars plus a VALID/INVALID assay
// badge, and a candidate-incubation-time simulation mechanic. Same "reveal
// only on demand, simulate with real math, not a canned toggle" discipline
// as every domain workstation before it.
//
// The reasoning shape here is threshold/validity-based, not optimum-seeking
// (unlike the sibling Biotech/Bioprocess workstation) and not dual-band
// (unlike Mechanical): a single positive-control OD value must clear a
// single minimum threshold for the run to be valid, which is exactly how a
// real ELISA's built-in QC works. Signal development over incubation time
// is modeled with a real saturating-binding curve, OD(t) = ODmax x (1 -
// e^(-t/tau)) — the same functional form real antibody-antigen binding
// kinetics and enzymatic color development actually follow — with
// illustrative constants, not calibrated against a specific real assay kit,
// and the workstation says so directly.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// incubation time plus written reasoning — rubricReview.js already accepts
// this as an alias for `code`) plus `investigationLog` (the real sequence
// of investigation actions: which parameters were inspected, whether the
// plate was read, which candidate incubation time was simulated). This
// reuses rubricReview.js's existing generalized fields exactly as the nine
// earlier domain phases did — this phase required ZERO backend code
// changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: assay workflow, parameter explorer, result
// inspector, measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other ten workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function AssayWorkflowViewer({ blocks = [] }) {
  const w = 130, h = 70, gap = 40
  const width = blocks.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Assay Workflow — Sample to Readout</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={140}>
          {blocks.map((b, i) => {
            const x = gap + i * (w + gap)
            const y = 35
            return (
              <g key={b.id}>
                {i > 0 && (
                  <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrow5)" />
                )}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={b.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={b.flagged ? "#f87171" : "#334155"} strokeWidth={b.flagged ? 2 : 1} />
                <text x={x + 7} y={y + 18} fontSize={10.5} fontWeight={700} fill="#e2e8f0">{b.label}</text>
                <text x={x + 7} y={y + 34} fontSize={9} fill="#94a3b8">{b.detail1}</text>
                {b.detail2 && <text x={x + 7} y={y + 48} fontSize={9} fill={b.flagged ? "#f87171" : "#94a3b8"}>{b.detail2}</text>}
              </g>
            )
          })}
          <defs>
            <marker id="arrow5" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
        {label}: <span style={{ color: passed ? "#4ade80" : "#f87171", fontWeight: 700 }}>{value.toFixed(2)} {unit}</span>
      </div>
      <svg width={width} height={height}>
        <rect x={pad} y={12} width={width - 2 * pad} height={10} rx={5} fill="#1e293b" />
        <rect x={bandX1} y={12} width={Math.max(bandX2 - bandX1, 2)} height={10} rx={5} fill="rgba(74,222,128,0.25)" />
        <line x1={pos(value)} y1={4} x2={pos(value)} y2={30} stroke={passed ? "#4ade80" : "#f87171"} strokeWidth={3} />
      </svg>
    </div>
  )
}

function ResultInspector({ before, after, probed, onProbe }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Result / Quality Inspector</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Read Plate
        </button>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Before (installed)</div>
            <GaugeBar label="Positive control OD" value={before.posOd} unit="OD" min={0} max={2} okMin={before.posThreshold} okMax={2} passed={before.posOd >= before.posThreshold} />
            <GaugeBar label="Negative control OD" value={before.negOd} unit="OD" min={0} max={0.4} okMin={0} okMax={before.negCeiling} passed={before.negOd <= before.negCeiling} />
            <div style={{ fontSize: 12, fontWeight: 700, color: before.valid ? "#4ade80" : "#f87171", marginTop: 4 }}>
              Assay status: {before.valid ? "VALID" : "INVALID"}
            </div>
          </div>
          {after && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>After (simulated)</div>
              <GaugeBar label="Positive control OD" value={after.posOd} unit="OD" min={0} max={2} okMin={after.posThreshold} okMax={2} passed={after.posOd >= after.posThreshold} />
              <GaugeBar label="Negative control OD" value={after.negOd} unit="OD" min={0} max={0.4} okMin={0} okMax={after.negCeiling} passed={after.negOd <= after.negCeiling} />
              <div style={{ fontSize: 12, fontWeight: 700, color: after.valid ? "#4ade80" : "#f87171", marginTop: 4 }}>
                Assay status: {after.valid ? "VALID" : "INVALID"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Read the plate to see measurements.</div>
  const rows = [{ label: "Before", m: before }, ...(after ? [{ label: "After", m: after }] : [])]
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Measurement Summary</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["state", "incubation", "pos control OD", "neg control OD", "assay status"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{r.label}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8" }}>{r.m.incubationMin} min</td>
                <td style={{ padding: "3px 6px", color: r.m.posOd >= r.m.posThreshold ? "#cbd5e1" : "#f87171" }}>{r.m.posOd.toFixed(2)}</td>
                <td style={{ padding: "3px 6px", color: r.m.negOd <= r.m.negCeiling ? "#cbd5e1" : "#f87171" }}>{r.m.negOd.toFixed(2)}</td>
                <td style={{ padding: "3px 6px", color: r.m.valid ? "#4ade80" : "#f87171" }}>{r.m.valid ? "VALID" : "INVALID"}</td>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Incubation Times</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>{c.label}</div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this time"}
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
 *                      acceptanceCriteria?: string[], posOdMax?: number, posTau?: number,
 *                      negOdMax?: number, negTau?: number, posThreshold?: number,
 *                      negCeiling?: number, installedIncubationMin?: number,
 *                      workflowBlocks?: Array, components?: Array,
 *                      candidateIncubationTimes?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function MedicalBiotechWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const posOdMax = payload?.posOdMax ?? 1.6
  const posTau = payload?.posTau ?? 30
  const negOdMax = payload?.negOdMax ?? 0.15
  const negTau = payload?.negTau ?? 15
  const posThreshold = payload?.posThreshold ?? 1.0
  const negCeiling = payload?.negCeiling ?? 0.2
  const installedMin = payload?.installedIncubationMin ?? 20
  const blocks = payload?.workflowBlocks || []
  const components = payload?.components || []
  const candidates = payload?.candidateIncubationTimes || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven signal-development model (see file header): a
  // classic saturating-binding curve, OD(t) = ODmax x (1 - e^(-t/tau)),
  // applied to both controls. A different candidate incubation time
  // produces a genuinely different, formula-derived OD and assay validity
  // outcome, not a canned toggle.
  const readoutFor = useCallback((incubationMin) => {
    const posOd = posOdMax * (1 - Math.exp(-incubationMin / posTau))
    const negOd = negOdMax * (1 - Math.exp(-incubationMin / negTau))
    const valid = posOd >= posThreshold && negOd <= negCeiling
    return { incubationMin, posOd, negOd, posThreshold, negCeiling, valid }
  }, [posOdMax, posTau, negOdMax, negTau, posThreshold, negCeiling])

  const before = useMemo(() => readoutFor(installedMin), [readoutFor, installedMin])
  const after = useMemo(() => (simulated ? readoutFor(simulated.minutes) : null), [simulated, readoutFor])

  const probeReadout = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "READ plate (positive control, negative control, assay validity)"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE incubation=${c.label}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <AssayWorkflowViewer blocks={blocks} />
      <ParameterExplorer components={components} />
      <ResultInspector before={before} after={after} probed={probed} onProbe={probeReadout} />
      <MeasurementTable before={before} after={after} probed={probed} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended incubation time and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Restore the secondary antibody incubation to the validated 60 minute protocol time. That brings the positive control to about 1.38 OD, comfortably above the 1.00 OD validity threshold, while the negative control stays well under its 0.20 OD ceiling…"}
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
        The OD numbers above come from a real saturating-binding signal-development curve, OD(t) equals max OD times
        one minus e to the negative t over tau, applied honestly to the installed and each candidate incubation
        time — illustrative constants, not calibrated against a specific real assay kit, and the workstation does
        not claim otherwise. Your investigation sequence is sent with your answer as evidence for the AI Reviewer,
        and Submit posts a real score update.
      </div>
    </div>
  )
}
