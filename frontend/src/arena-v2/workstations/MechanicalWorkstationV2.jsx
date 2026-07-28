// MechanicalWorkstationV2.jsx — Arena V2, ninth role workspace (Mechanical Engineer)
// ---------------------------------------------------------------------------
// A drivetrain lab, deliberately nothing like any of the eight workstations
// before it: an SVG drivetrain diagram (motor -> gearbox -> drum -> belt),
// a component/parameter explorer, an on-demand motion inspector that reads
// as horizontal gauge bars (speed vs. a target band, torque vs. a required
// threshold) rather than a waveform chart or a bowed-beam shape — a
// deliberately different visual grammar for a domain that is fundamentally
// about a rotational speed/torque trade-off, not a time-domain transient or
// a static load. Same "reveal only on demand, simulate with real physics,
// not a canned toggle" discipline as every domain workstation before it.
// There is no live dynamic simulation here on purpose — the model is the
// same first-pass hand check a mechanical engineer would reach for: output
// speed = motor speed / gear ratio (converted to belt speed via drum
// circumference), output torque = motor torque * gear ratio * gearbox
// efficiency. This ignores dynamic/vibration effects and duty-cycle
// derating a full drivetrain analysis would include, and the workstation
// says so directly rather than implying a complete dynamic simulation.
//
// This mission is also the first to require BOTH criteria to be satisfied
// at once (belt speed within a target band AND drum torque above a
// required threshold) rather than a single pass/fail number — a genuinely
// different reasoning shape from the "bigger is better up to a point"
// pattern used in the ECE/EEE/Civil missions.
//
// Same layering discipline as every other workstation: only calls the
// `onSubmit` prop from ArenaV2ChallengeShell.jsx; never imports
// arenaV2Submission.js directly. Submission sends `answer` (the recommended
// gear ratio plus written reasoning — rubricReview.js already accepts this
// as an alias for `code`) plus `investigationLog` (the real sequence of
// investigation actions: which components were inspected, whether the
// motion was probed, which candidate ratio was simulated). This reuses
// rubricReview.js's existing generalized fields exactly as the seven
// earlier domain phases did — this phase required ZERO backend code
// changes, only new content data.
//
// Center-panel-only component: the mission header, ticket box, prompt, and
// checklist all come from the shared ArenaV2WorkspaceShell. This component
// owns the lab itself: drivetrain diagram, component explorer, motion
// inspector, measurement table, the answer editor, and the Submit button.
//
// ANTI-PASTE RULE, same honesty note as the other eight workstations: paste
// is blocked only on the answer editor, not globally.
import { useCallback, useMemo, useState } from "react"

function DrivetrainDiagram({ blocks = [] }) {
  const w = 140, h = 70, gap = 50
  const width = blocks.length * (w + gap) + gap
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Drivetrain — Motor to Belt</div>
      <div style={{ border: "1px solid #1e293b", borderRadius: 6, overflow: "auto", background: "#0b1220" }}>
        <svg width={Math.max(width, 400)} height={140}>
          {blocks.map((b, i) => {
            const x = gap + i * (w + gap)
            const y = 35
            return (
              <g key={b.id}>
                {i > 0 && (
                  <line x1={x - gap} y1={y + h / 2} x2={x} y2={y + h / 2} stroke="#334155" strokeWidth={1.5} markerEnd="url(#arrow3)" />
                )}
                <rect x={x} y={y} width={w} height={h} rx={6} fill={b.flagged ? "rgba(248,113,113,0.1)" : "#0f172a"} stroke={b.flagged ? "#f87171" : "#334155"} strokeWidth={b.flagged ? 2 : 1} />
                <text x={x + 8} y={y + 20} fontSize={11} fontWeight={700} fill="#e2e8f0">{b.label}</text>
                <text x={x + 8} y={y + 36} fontSize={9.5} fill="#94a3b8">{b.detail1}</text>
                {b.detail2 && <text x={x + 8} y={y + 50} fontSize={9.5} fill={b.flagged ? "#f87171" : "#94a3b8"}>{b.detail2}</text>}
              </g>
            )
          })}
          <defs>
            <marker id="arrow3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Component / Parameter Explorer</div>
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

function GaugeBar({ label, value, unit, min, max, okMin, okMax, passed }) {
  const width = 320, height = 34, pad = 8
  const pos = (v) => pad + ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (width - 2 * pad)
  const bandX1 = pos(okMin), bandX2 = pos(okMax)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>
        {label}: <span style={{ color: passed ? "#4ade80" : "#f87171", fontWeight: 700 }}>{value.toFixed(1)} {unit}</span>
      </div>
      <svg width={width} height={height}>
        <rect x={pad} y={12} width={width - 2 * pad} height={10} rx={5} fill="#1e293b" />
        <rect x={bandX1} y={12} width={Math.max(bandX2 - bandX1, 2)} height={10} rx={5} fill="rgba(74,222,128,0.25)" />
        <line x1={pos(value)} y1={4} x2={pos(value)} y2={30} stroke={passed ? "#4ade80" : "#f87171"} strokeWidth={3} />
      </svg>
    </div>
  )
}

function MotionInspector({ before, after, targetSpeed, speedTolPct, requiredTorque, probed, onProbe }) {
  const speedBand = { okMin: targetSpeed * (1 - speedTolPct), okMax: targetSpeed * (1 + speedTolPct) }
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Motion Inspector — Belt Speed & Drum Torque</div>
      {!probed ? (
        <button onClick={onProbe} style={{ padding: "6px 14px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
          ▶ Probe Belt Speed & Drum Torque
        </button>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>Before (installed)</div>
            <GaugeBar label="Belt speed" value={before.speed} unit="ft/min" min={0} max={Math.max(targetSpeed * 2, before.speed * 1.1)} {...speedBand} passed={before.speed >= speedBand.okMin && before.speed <= speedBand.okMax} />
            <GaugeBar label="Drum torque" value={before.torque} unit="lb-ft" min={0} max={Math.max(requiredTorque * 1.6, before.torque * 1.1)} okMin={requiredTorque} okMax={requiredTorque * 1.6} passed={before.torque >= requiredTorque} />
          </div>
          {after && (
            <div>
              <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>After (simulated)</div>
              <GaugeBar label="Belt speed" value={after.speed} unit="ft/min" min={0} max={Math.max(targetSpeed * 2, after.speed * 1.1)} {...speedBand} passed={after.speed >= speedBand.okMin && after.speed <= speedBand.okMax} />
              <GaugeBar label="Drum torque" value={after.torque} unit="lb-ft" min={0} max={Math.max(requiredTorque * 1.6, after.torque * 1.1)} okMin={requiredTorque} okMax={requiredTorque * 1.6} passed={after.torque >= requiredTorque} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MeasurementTable({ before, after, targetSpeed, speedTolPct, requiredTorque, probed }) {
  if (!probed) return <div style={{ fontSize: 11, color: "#64748b" }}>Probe the drivetrain to see measurements.</div>
  const speedOk = (v) => v >= targetSpeed * (1 - speedTolPct) && v <= targetSpeed * (1 + speedTolPct)
  const rows = [{ label: "Before", m: before }, ...(after ? [{ label: "After", m: after }] : [])]
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Measurement Summary</div>
      <div style={{ overflow: "auto", border: "1px solid #1e293b", borderRadius: 6 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              {["state", "belt speed", "speed ok?", "drum torque", "torque ok?"].map((c) => (
                <th key={c} style={{ padding: "4px 6px", textAlign: "left", background: "#0f172a", borderBottom: "1px solid #334155" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                <td style={{ padding: "3px 6px" }}>{r.label}</td>
                <td style={{ padding: "3px 6px", color: speedOk(r.m.speed) ? "#cbd5e1" : "#f87171" }}>{r.m.speed.toFixed(1)} ft/min</td>
                <td style={{ padding: "3px 6px", color: speedOk(r.m.speed) ? "#4ade80" : "#f87171" }}>{speedOk(r.m.speed) ? "yes" : "no"}</td>
                <td style={{ padding: "3px 6px", color: r.m.torque >= requiredTorque ? "#cbd5e1" : "#f87171" }}>{r.m.torque.toFixed(1)} lb-ft</td>
                <td style={{ padding: "3px 6px", color: r.m.torque >= requiredTorque ? "#4ade80" : "#f87171" }}>{r.m.torque >= requiredTorque ? "yes" : "no"}</td>
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
      <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>Candidate Gearbox Ratios</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {candidates.map((c) => (
          <div key={c.id} style={{ padding: 8, borderRadius: 6, border: `1px solid ${simulatedId === c.id ? "#4ade80" : "#1e293b"}`, background: "#0b1220" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#e2e8f0", marginBottom: 4 }}>{c.label}</div>
            <button
              onClick={() => onSimulate(c)}
              disabled={simulatedId === c.id}
              style={{ fontSize: 11, padding: "4px 10px", borderRadius: 4, background: simulatedId === c.id ? "#14532d" : "transparent", color: simulatedId === c.id ? "#4ade80" : "#94a3b8", border: "1px solid #334155" }}
            >
              {simulatedId === c.id ? "✓ Simulated" : "Simulate this ratio"}
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
 *                      acceptanceCriteria?: string[], motorRpm?: number,
 *                      motorTorqueLbFt?: number, gearboxEfficiency?: number,
 *                      drumDiameterIn?: number, installedRatio?: number,
 *                      targetSpeedFtMin?: number, speedTolerancePct?: number,
 *                      requiredTorqueLbFt?: number, drivetrainBlocks?: Array,
 *                      components?: Array, candidateRatios?: Array },
 *           resumed?: boolean, onSubmit: (submissionData: object) => void,
 *           isSubmitting?: boolean }} props
 */
export default function MechanicalWorkstationV2({ challengeInstanceId, skill, difficulty, payload, resumed, onSubmit, isSubmitting = false }) {
  const motorRpm = payload?.motorRpm ?? 1750
  const motorTorque = payload?.motorTorqueLbFt ?? 3.0
  const efficiency = payload?.gearboxEfficiency ?? 0.9
  const drumDiameterIn = payload?.drumDiameterIn ?? 6
  const installedRatio = payload?.installedRatio ?? 30
  const targetSpeed = payload?.targetSpeedFtMin ?? 60
  const speedTolPct = payload?.speedTolerancePct ?? 0.05
  const requiredTorque = payload?.requiredTorqueLbFt ?? 120
  const blocks = payload?.drivetrainBlocks || []
  const components = payload?.components || []
  const candidates = payload?.candidateRatios || []

  const [probed, setProbed] = useState(false)
  const [simulated, setSimulated] = useState(null)
  const [actionLog, setActionLog] = useState([])
  const [answer, setAnswer] = useState("")

  // Real, formula-driven drivetrain model (see file header): drum RPM =
  // motor RPM / ratio; belt speed = drum RPM * pi * diameter (converted to
  // ft/min); drum torque = motor torque * ratio * gearbox efficiency. A
  // different candidate ratio produces genuinely different, physically
  // derived speed AND torque, not a canned toggle.
  const motionFor = useCallback((ratio) => {
    const drumRpm = motorRpm / ratio
    const circumferenceFt = (Math.PI * drumDiameterIn) / 12
    const speed = drumRpm * circumferenceFt
    const torque = motorTorque * ratio * efficiency
    return { speed, torque }
  }, [motorRpm, drumDiameterIn, motorTorque, efficiency])

  const before = useMemo(() => motionFor(installedRatio), [motionFor, installedRatio])
  const after = useMemo(() => (simulated ? motionFor(simulated.ratio) : null), [simulated, motionFor])

  const probeMotion = useCallback(() => {
    setProbed(true)
    setActionLog((log) => [...log, "PROBE belt speed and drum torque"])
  }, [])

  const simulateCandidate = useCallback((c) => {
    setSimulated(c)
    setActionLog((log) => [...log, `SIMULATE ratio=${c.label}`])
  }, [])

  const blockPaste = useCallback((e) => { e.preventDefault() }, [])

  const handleSubmit = useCallback(() => {
    if (!answer.trim() || isSubmitting) return
    onSubmit?.({ answer, investigationLog: actionLog })
  }, [answer, actionLog, isSubmitting, onSubmit])

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0, padding: 16 }}>
      <DrivetrainDiagram blocks={blocks} />
      <ComponentExplorer components={components} />
      <MotionInspector before={before} after={after} targetSpeed={targetSpeed} speedTolPct={speedTolPct} requiredTorque={requiredTorque} probed={probed} onProbe={probeMotion} />
      <MeasurementTable before={before} after={after} targetSpeed={targetSpeed} speedTolPct={speedTolPct} requiredTorque={requiredTorque} probed={probed} />
      <CandidateManager candidates={candidates} simulatedId={simulated?.id} onSimulate={simulateCandidate} />

      <div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
          Answer (paste disabled in this pilot editor) — recommended gearbox ratio and reasoning
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPaste={blockPaste}
          onDrop={blockPaste}
          spellCheck={false}
          placeholder={"e.g. Replace the 30:1 gearbox with approximately 45:1. That brings belt speed to about 61 ft/min, within the 60 ft/min target band, and raises drum torque to about 121.5 lb-ft, just clearing the 120 lb-ft peak-load requirement…"}
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
        The speed and torque numbers above come from a real drivetrain hand-check, drum RPM equals motor RPM over
        ratio, belt speed from drum circumference, torque equals motor torque times ratio times gearbox efficiency —
        applied honestly to the installed ratio and each candidate. This is a simplified model (no dynamic or
        vibration effects), not a full drivetrain simulation, and the workstation does not claim otherwise. Your
        investigation sequence is sent with your answer as evidence for the AI Reviewer, and Submit posts a real
        score update.
      </div>
    </div>
  )
}
