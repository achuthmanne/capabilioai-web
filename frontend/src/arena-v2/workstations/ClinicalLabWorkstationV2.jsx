// ClinicalLabWorkstationV2.jsx — Arena V2, twelfth role workspace (Clinical Laboratory Specialist)
// ---------------------------------------------------------------------------
// componentKey note (read this before touching workstationRegistry.js):
// all 12 non-reserved backend WORKSTATION_IDS componentKeys were already
// wired to distinct frontend components by the eleventh phase (Medical
// Biotechnology). The only remaining unwired key, CalculatorWorkstation, is
// annotated in the backend's own workstation-router/registry.js as
// "Common Challenges only" (content_spec/04) — but that annotation is a
// static-metadata comment, not an enforced runtime constraint: no code in
// challenge-engine, workstation-router, or the submission pipeline
// special-cases "calculator" beyond registry.test.js asserting its static
// artifactType stays null, which this phase does not touch. Reusing this
// key (a) adds zero backend schema, (b) does not violate any enforced
// contract, and (c) is the same category of action ("wire an existing,
// previously-unused registry slot to a brand-new frontend component") used
// in all eleven prior phases. Adding a new WORKSTATION_IDS entry instead
// would be an actual schema/contract change, which the standing "do not
// add schema" instruction forbids. This was the safer of the two options
// and is flagged here and in the delivery memory.
//
// A clinical/diagnostic assay-operations lab, deliberately presented with a
// different visual metaphor than the Medical Biotechnology workspace (an
// SVG process-flow diagram there) even though both domains involve
// antibody-based immunoassays: this workspace centers on a literal 96-well
// plate map (control wells vs. patient sample wells) plus a protocol
// timeline strip showing each processing step's spec vs. actual duration,
// rather than a flow-block diagram. The reasoning emphasis is also
// different — sample handling and control interpretation across a batch of
// patient samples, not just single-control assay validity.
//
// Mission shape: a secondary (conjugate) incubation step ran short during a
// clinical ELISA batch. The positive control OD falls below the CLIA-style
// validity threshold, invalidating the entire plate (including real patient
// samples on it) under CLSI/CAP-style QC rules — the candidate must
// recognize that ALL patient results on an invalid plate are unreportable,
// identify the out-of-spec step from the protocol timeline, and determine
// the corrected incubation time needed to restore control validity before
// patient samples can be reported.
//
// Same saturating-binding OD(t) = ODmax x (1 - e^(-t/tau)) signal-
// development model as the sibling Medical Biotechnology workstation (this
// is the real functional form for antibody-antigen binding kinetics, so
// reusing it is scientifically honest, not lazy reuse) but applied here to
// BOTH plate controls AND a set of patient sample wells, so the candidate
// also has to reason about which patient results are affected versus
// merely which control passed or failed.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (corrected
// incubation time, plate disposition, and reasoning — rubricReview.js
// already accepts this as an alias for `code`) plus `investigationLog`.
// Zero backend code changes required — reuses rubricReview.js's existing
// generalized fields exactly as all eleven prior phases did.
//
// Center-panel-only component: mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: plate map, protocol timeline, sample explorer,
// result inspector, measurement table, the answer editor, and Submit.
//
// ANTI-PASTE RULE, same honesty note as the other eleven workstations:
// paste is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function PlateMapViewer({ wells = [], flaggedStepAffectsAll }) {
  const cols = 12, rows = 8
  const cell = 26, pad = 30
  const width = pad + cols * cell + 10
  const height = pad + rows * cell + 10
  const colLabels = Array.from({ length: cols }, (_, i) => i + 1)
  const rowLabels = "ABCDEFGH".split("")
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Plate Map — 96-Well Layout</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220", padding: 6 }}>
        <svg width={width} height={height}>
          {colLabels.map((c, i) => (
            <text key={`c${c}`} x={pad + i * cell + cell / 2} y={16} fontSize={9} fill="#64748b" textAnchor="middle">{c}</text>
          ))}
          {rowLabels.map((r, i) => (
            <text key={`r${r}`} x={12} y={pad + i * cell + cell / 2 + 4} fontSize={9} fill="#64748b" textAnchor="middle">{r}</text>
          ))}
          {wells.map((w) => {
            const rowIdx = rowLabels.indexOf(w.row)
            const colIdx = w.col - 1
            const x = pad + colIdx * cell
            const y = pad + rowIdx * cell
            const fill = w.type === "posControl" ? "rgba(248,113,113,0.18)" : w.type === "negControl" ? "rgba(96,165,250,0.18)" : "#0f172a"
            const stroke = w.type === "posControl" || w.type === "negControl" ? "#f87171" : "#334155"
            return (
              <g key={w.id}>
                <rect x={x + 2} y={y + 2} width={cell - 4} height={cell - 4} rx={4} fill={fill} stroke={w.type === "posControl" ? "#f87171" : w.type === "negControl" ? "#60a5fa" : stroke} strokeWidth={w.type !== "sample" ? 1.5 : 1} />
                <text x={x + cell / 2} y={y + cell / 2 + 3} fontSize={7} fill={w.type === "sample" ? "#64748b" : "#e2e8f0"} textAnchor="middle">
                  {w.type === "posControl" ? "PC" : w.type === "negControl" ? "NC" : w.sampleId}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      {flaggedStepAffectsAll && (
        <div style={{ fontSize: 10.5, color: "#f87171", marginTop: 4 }}>
          PC = positive control, NC = negative control. All other wells are patient samples on this same plate.
        </div>
      )}
    </div>
  )
}

function ProtocolTimeline({ steps = [] }) {
  const w = 148, h = 62, gap = 26
  const width = steps.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Protocol Timeline — Spec vs. Actual</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={128}>
          {steps.map((s, i) => {
            const x = gap + i * (w + gap)
            const y = 26
            return (
              <g key={s.id}>
                {i > 0 && <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrowClinical)" />}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={s.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={s.flagged ? "#f87171" : "#334155"} strokeWidth={s.flagged ? 2 : 1} />
                <text x={x + 8} y={y + 16} fontSize={10.5} fontWeight={700} fill="#e2e8f0">{s.label}</text>
                <text x={x + 8} y={y + 32} fontSize={9} fill="#94a3b8">Spec: {s.specMin} min</text>
                <text x={x + 8} y={y + 46} fontSize={9} fill={s.flagged ? "#f87171" : "#94a3b8"}>Actual: {s.actualMin} min</text>
              </g>
            )
          })}
          <defs>
            <marker id="arrowClinical" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="#334155" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function SampleExplorer({ samples = [] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Patient Sample Explorer</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["sample", "well", "quality flag", "on plate with invalid controls?"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {samples.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px", fontWeight: 700, color: "#e2e8f0" }}>{s.id}</td>
                <td style={{ padding: "3px 6px", color: "#94a3b8", fontFamily: "monospace" }}>{s.well}</td>
                <td style={{ padding: "3px 6px", color: s.qualityFlag === "none" ? "#94a3b8" : "#facc15" }}>{s.qualityFlag}</td>
                <td style={{ padding: "3px 6px", color: "#f87171" }}>Yes — affected</td>
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

function RunInspector({ before, after, probed, onProbe }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Run / Control Inspector</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Read Control Wells
        </button>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>As-run (installed)</div>
            <GaugeBar label="Positive control OD" value={before.posOd} unit="OD" min={0} max={2} okMin={before.posThreshold} okMax={2} passed={before.posOd >= before.posThreshold} />
            <GaugeBar label="Negative control OD" value={before.negOd} unit="OD" min={0} max={0.4} okMin={0} okMax={before.negCeiling} passed={before.negOd <= before.negCeiling} />
            <div style={{ fontSize: 12, fontWeight: 700, color: before.valid ? "#4ade80" : "#f87171", marginTop: 4 }}>
              Plate status: {before.valid ? "VALID — patient results reportable" : "INVALID — patient results NOT reportable"}
            </div>
          </div>
          {after && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Corrected re-run (simulated)</div>
              <GaugeBar label="Positive control OD" value={after.posOd} unit="OD" min={0} max={2} okMin={after.posThreshold} okMax={2} passed={after.posOd >= after.posThreshold} />
              <GaugeBar label="Negative control OD" value={after.negOd} unit="OD" min={0} max={0.4} okMin={0} okMax={after.negCeiling} passed={after.negOd <= after.negCeiling} />
              <div style={{ fontSize: 12, fontWeight: 700, color: after.valid ? "#4ade80" : "#f87171", marginTop: 4 }}>
                Plate status: {after.valid ? "VALID — patient results reportable" : "INVALID — patient results NOT reportable"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Read the control wells to see measurements.</div>
  const rows = [{ label: "As-run", m: before }, ...(after ? [{ label: "Corrected re-run", m: after }] : [])]
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Measurement Summary</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["run", "conjugate incubation", "pos control OD", "neg control OD", "plate status"].map((c) => (
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

function RepeatRunManager({ candidates = [], simulatedId, onSimulate }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Repeat-Run Candidates</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>{c.label}</div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this repeat run"}
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
 *                      protocolSteps?: Array, wells?: Array, samples?: Array,
 *                      candidateIncubationTimes?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function ClinicalLabWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const posOdMax = payload?.posOdMax ?? 1.55
  const posTau = payload?.posTau ?? 25
  const negOdMax = payload?.negOdMax ?? 0.14
  const negTau = payload?.negTau ?? 12
  const posThreshold = payload?.posThreshold ?? 1.0
  const negCeiling = payload?.negCeiling ?? 0.2
  const installedMin = payload?.installedIncubationMin ?? 12
  const steps = payload?.protocolSteps || []
  const wells = payload?.wells || []
  const samples = payload?.samples || []
  const candidates = payload?.candidateIncubationTimes || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven signal-development model (see file header): a
  // saturating-binding curve, OD(t) = ODmax x (1 - e^(-t/tau)), applied to
  // both plate controls. A different repeat-run conjugate incubation time
  // produces a genuinely different, formula-derived OD and plate validity
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
    setActionLog((log) => [...log, "READ control wells (positive control, negative control, plate validity)"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE repeat run conjugate-incubation=${c.label}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <PlateMapViewer wells={wells} flaggedStepAffectsAll />
      <ProtocolTimeline steps={steps} />
      <SampleExplorer samples={samples} />
      <RunInspector before={before} after={after} probed={probed} onProbe={probeReadout} />
      <MeasurementTable before={before} after={after} probed={probed} />
      <RepeatRunManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — corrected incubation time, plate disposition, and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. The conjugate incubation ran only 12 minutes against a validated 45 minute protocol. The positive control read 0.72 OD, below the 1.00 OD validity threshold, so the entire plate is invalid under CLSI-style QC rules and none of the patient samples on it can be reported. Repeat the run at the validated 45 minute incubation, which brings the positive control to about 1.32 OD while the negative control stays under 0.20 OD, then re-test all affected patient samples…"}
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
        one minus e to the negative t over tau, applied honestly to the installed and each repeat-run incubation
        time — illustrative constants, not calibrated against a specific real assay kit, and the workstation does
        not claim otherwise. Your investigation sequence is sent with your answer as evidence for the AI Reviewer,
        and Submit posts a real score update.
      </div>
    </div>
  )
}
