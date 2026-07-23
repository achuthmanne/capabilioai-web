/**
 * missionCompiler.js — Arena Mission Compiler (structured workstations)
 * ---------------------------------------------------------------------------
 * PROBLEM this solves: the Daily Mission generator (/api/arena/daily) only
 * produces generic code missions via the LLM — it never emits the structured
 * `simulation` payload that non-code workstations (Circuit Lab, etc.) require,
 * so ECE/EEE/Mech/... missions render empty ("requires a simulation field").
 *
 * ARCHITECTURE (per design):
 *   topic → pick TEMPLATE (fixed topology) → randomize PARAMETERS (never
 *   topology) → derive a consistent TARGET → VALIDATE against the real solver
 *   → return a COMPLETE, workstation-ready mission. Deterministic, not LLM JSON.
 *
 * This module covers the DC-resistive Circuit Lab family (solvable by the
 * frontend's DC MNA solver). Other streams (Civil/Mech/EEE/PCB/Cyber) plug in
 * as additional libraries behind the same compile→validate contract.
 * Schema mirrors ArenaWorkstations.jsx CircuitLabWorkstation exactly.
 */

// ── DC Modified Nodal Analysis (port of the frontend solver, for validation) ──
function solveLinear(A, b) {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let mx = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[mx][col])) mx = r
    ;[M[col], M[mx]] = [M[mx], M[col]]
    if (Math.abs(M[col][col]) < 1e-15) continue
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col] / M[col][col]
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c]
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-15 ? 0 : row[n] / row[i]))
}
function solveDc(components, params = {}) {
  const nodeSet = new Set()
  components.forEach(c => {
    const na = c.node_a || c.node_plus, nb = c.node_b || c.node_minus
    if (na && na !== "GND") nodeSet.add(na)
    if (nb && nb !== "GND") nodeSet.add(nb)
  })
  const nodes = [...nodeSet], N = nodes.length, idx = {}
  nodes.forEach((n, i) => (idx[n] = i))
  const R = components.filter(c => c.type === "resistor" || c.type === "R")
  const V = components.filter(c => c.type === "voltage_source" || c.type === "VS")
  const B = V.length, size = N + B
  const out = { nodeVoltages: { GND: 0 }, branchCurrents: {} }
  if (size === 0) return out
  const G = Array.from({ length: size }, () => new Array(size).fill(0))
  const rhs = new Array(size).fill(0)
  R.forEach(c => {
    const r = params[c.id] !== undefined ? params[c.id] : c.value
    if (!r || r <= 0) return
    const g = 1 / r, na = c.node_a || c.node_plus, nb = c.node_b || c.node_minus
    const i = idx[na] ?? -1, j = idx[nb] ?? -1
    if (i >= 0) G[i][i] += g
    if (j >= 0) G[j][j] += g
    if (i >= 0 && j >= 0) { G[i][j] -= g; G[j][i] -= g }
  })
  V.forEach((c, k) => {
    const v = params[c.id] !== undefined ? params[c.id] : c.value
    const np = c.node_plus || c.node_a, nm = c.node_minus || c.node_b
    const pi = idx[np] ?? -1, mi = idx[nm] ?? -1
    if (pi >= 0) { G[pi][N + k] += 1; G[N + k][pi] += 1 }
    if (mi >= 0) { G[mi][N + k] -= 1; G[N + k][mi] -= 1 }
    rhs[N + k] = v
  })
  const sol = solveLinear(G, rhs)
  nodes.forEach((n, i) => (out.nodeVoltages[n] = sol[i]))
  return out
}

// ── helpers ───────────────────────────────────────────────────────────────
const E24 = [1.0,1.1,1.2,1.3,1.5,1.6,1.8,2.0,2.2,2.4,2.7,3.0,3.3,3.6,3.9,4.3,4.7,5.1,5.6,6.2,6.8,7.5,8.2,9.1]
const rand = arr => arr[Math.floor(Math.random() * arr.length)]
const eResistor = () => Math.round(rand(E24) * rand([100,1000,10000])) // 100Ω–91kΩ
const round2 = x => Math.round(x * 100) / 100

// ── TEMPLATE LIBRARY (topology fixed; parameters ranged) ─────────────────────
// Each: build() picks parameters, returns a complete `simulation` + metadata.
const CIRCUIT_TEMPLATES = {
  voltage_divider: {
    title: "Voltage Divider Design",
    topic: "voltage division",
    build() {
      const Vin = rand([5, 9, 12])
      // choose a target output between 20% and 80% of Vin, then solvable R pair
      const R1 = eResistor(), R2 = eResistor()
      const Vout = round2(Vin * R2 / (R1 + R2))
      // defaults deliberately off-target so the student must adjust
      const d1 = eResistor(), d2 = eResistor()
      return {
        simulation: {
          type: "dc_circuit",
          circuit: {
            nodes: ["A", "B", "GND"],
            components: [
              { id: "V1", type: "voltage_source", value: Vin, unit: "V", node_plus: "A", node_minus: "GND", editable: false },
              { id: "R1", type: "resistor", value: d1, unit: "Ω", node_a: "A", node_b: "B",   editable: true, min: 100, max: 100000, step: 100, description: "Upper resistor" },
              { id: "R2", type: "resistor", value: d2, unit: "Ω", node_a: "B", node_b: "GND", editable: true, min: 100, max: 100000, step: 100, description: "Lower resistor" },
            ],
            layout: {
              "A": { x: 60, y: 70 }, "B": { x: 320, y: 70 },
              "GND": { x: 60, y: 230, extra: [{ x: 320, y: 230 }] },
              wires: [{ x1: 60, y1: 230, x2: 320, y2: 230 }, { x1: 320, y1: 70, x2: 320, y2: 230 }],
            },
            probe: "B",
          },
          target: { type: "voltage_at_probe", node: "B", value: Vout, tolerance: 0.05, unit: "V" },
        },
        solution: { R1, R2 },
        scenario: `A sensor needs ${Vout} V but only a ${Vin} V rail is available.`,
        objective: `Adjust R1 and R2 so the probe at node B reads ${Vout} V (±5%).`,
        question: `Which relationship sets the output of a voltage divider?`,
        test_cases: [{
          options: [
            "Vout = Vin × R2 / (R1 + R2)",
            "Vout = Vin × R1 / (R1 + R2)",
            "Vout = Vin × (R1 + R2) / R2",
            "Vout = Vin − R1 − R2",
          ],
          correct: 0,
          explanation: `Vout = Vin·R2/(R1+R2). Here a pair such as R1≈${R1}Ω, R2≈${R2}Ω yields ≈${Vout} V from ${Vin} V.`,
        }],
        hints: ["What fraction of Vin appears across the lower resistor?", "How does increasing R2 relative to R1 change V(B)?"],
      }
    },
  },

  current_divider: {
    title: "Series–Parallel Node Voltage",
    topic: "series-parallel resistor networks",
    build() {
      const Vin = rand([9, 12, 15])
      const R1 = eResistor(), R2 = eResistor(), R3 = eResistor()
      const comps = [
        { id: "V1", type: "voltage_source", value: Vin, unit: "V", node_plus: "A", node_minus: "GND", editable: false },
        { id: "R1", type: "resistor", value: R1, unit: "Ω", node_a: "A", node_b: "B", editable: false, description: "Series resistor" },
        { id: "R2", type: "resistor", value: R2, unit: "Ω", node_a: "B", node_b: "GND", editable: false, description: "Parallel branch 1" },
        { id: "R3", type: "resistor", value: R3, unit: "Ω", node_a: "B", node_b: "GND", editable: false, description: "Parallel branch 2" },
      ]
      const VB = round2(solveDc(comps).nodeVoltages["B"])
      return {
        simulation: {
          type: "dc_circuit",
          circuit: {
            nodes: ["A", "B", "GND"], components: comps,
            layout: {
              "A": { x: 60, y: 70 }, "B": { x: 320, y: 70 },
              "GND": { x: 60, y: 230, extra: [{ x: 320, y: 230 }] },
              wires: [{ x1: 60, y1: 230, x2: 320, y2: 230 }, { x1: 320, y1: 70, x2: 320, y2: 230 }],
            },
            probe: "B",
          },
          target: { type: "voltage_at_probe", node: "B", value: VB, tolerance: 0.05, unit: "V" },
        },
        solution: {},
        scenario: `A ${Vin} V supply drives R1 in series with R2‖R3.`,
        objective: `Read the probe at node B and identify V(B) for this series-parallel network.`,
        question: `What is V(B) in this series–parallel network (R2 ‖ R3 below R1)?`,
        test_cases: [{
          options: [
            `${VB} V`, `${round2(VB * 1.4)} V`, `${round2(VB * 0.6)} V`, `${round2(Vin - VB)} V`,
          ],
          correct: 0,
          explanation: `R2‖R3 forms the lower leg; V(B) = Vin·(R2‖R3)/(R1 + R2‖R3) = ${VB} V.`,
        }],
        hints: ["Combine the two parallel resistors first.", "Then treat it as a two-resistor divider."],
      }
    },
  },
}

// ── COMPILER ─────────────────────────────────────────────────────────────────
function compileCircuitMission({ templateId, difficulty = "Easy", eloGain = 10 } = {}) {
  const ids = Object.keys(CIRCUIT_TEMPLATES)
  const id  = templateId && CIRCUIT_TEMPLATES[templateId] ? templateId : rand(ids)
  const tpl = CIRCUIT_TEMPLATES[id]
  const b   = tpl.build()

  const mission = {
    id: `circuit-${id}-${Date.now().toString(36)}`,
    title: tpl.title,
    company: "Capabilio",
    difficulty,
    type: "ECE / Circuit Analysis",
    category: "Circuit Analysis",
    missionType: "circuit_lab",
    workstation: "circuit_lab",
    scenario: b.scenario,
    taskDescription: b.objective,
    objective: b.objective,
    question: b.question,
    simulation: b.simulation,
    test_cases: b.test_cases,
    tags: ["ece", "circuits", tpl.topic],
    hints: b.hints,
    starterCode: "",
    timeLimit: difficulty === "Hard" ? 40 : difficulty === "Medium" ? 30 : 20,
    eloGain,
    _compiled: true,
  }

  const check = validateCircuitMission(mission, b.solution)
  if (!check.ok) throw new Error(`Mission compile validation failed: ${check.reason}`)
  return mission
}

// Completeness + solvability validation — the "Mission Compiler" guarantee.
function validateCircuitMission(mission, solution = {}) {
  const c = mission?.simulation?.circuit
  const t = mission?.simulation?.target
  if (!c?.components?.length || !c?.nodes?.length) return { ok: false, reason: "missing components/nodes" }
  if (!c.components.some(x => x.node_plus || x.node_a)) return { ok: false, reason: "components missing node refs" }
  if (!t || typeof t.value !== "number") return { ok: false, reason: "missing/invalid target" }
  // Prove a solution exists: solve with the known-good params and check the target.
  const res = solveDc(c.components, solution)
  const probe = c.probe || t.node
  const v = res.nodeVoltages[probe]
  if (v === undefined || isNaN(v)) return { ok: false, reason: "probe node unsolved" }
  const tol = (t.tolerance ?? 0.05)
  const absTol = tol < 1 ? Math.abs(t.value) * tol + 0.01 : tol
  if (Math.abs(v - t.value) > absTol) return { ok: false, reason: `target unreachable (got ${round2(v)} vs ${t.value})` }
  return { ok: true }
}

// Route helper: is this daily-mission request a circuit workstation?
function isCircuitDomain(domainKey = "", keyword = "") {
  const s = `${domainKey} ${keyword}`.toLowerCase()
  return /\bece\b|circuit|electronic|analog|voltage|resistor/.test(s)
}

export { compileCircuitMission, validateCircuitMission, isCircuitDomain, solveDc }
