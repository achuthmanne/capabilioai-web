# Arena Mission Compiler — Architecture & Roadmap

## The problem it fixes

Non-code Arena workstations (Circuit Lab, and every other structured stream) render a real engine but were **starved of data**. The Daily Mission generator (`POST /api/arena/daily`) only produces generic, code-oriented content via the LLM — it never emits the structured `simulation` payload these workstations require. So an ECE "Voltage Divider Design" opened the Circuit Lab and showed *"Challenge requires a `simulation` field with circuit data"*, with a generic `function solve()` JS starter in the answer box.

Root cause (evidence):
- `ArenaWorkstations.jsx:6448` — Circuit Lab reads `mission.simulation.circuit` (needs `components` + `nodes`); absent → empty state (`:6675`).
- `arena.js:/daily` — Gemini/Groq JSON schema has no `simulation` field; `workstation` defaults to `code_editor`, `starterCode` is a generic stub.
- Real templates existed only as **static, unparameterized** frontend config (`domainChallenges.js:3848 ECE_CIRCUIT_CHALLENGES`) and were never served by the generator.

## The architecture (implemented for circuits)

Deterministic pipeline — **not** LLM-invented JSON:

```
topic → pick TEMPLATE (fixed topology)
      → randomize PARAMETERS (never topology)
      → derive a consistent TARGET
      → VALIDATE against the real solver
      → return a COMPLETE, workstation-ready mission
```

Implemented in `backend/server/lib/arena/missionCompiler.js`:
- **Template library** (`CIRCUIT_TEMPLATES`): fixed topologies with ranged parameters — `voltage_divider`, `current_divider` (series–parallel). Values are randomized on E24 resistor steps; topology is constant.
- **Compiler** (`compileCircuitMission`): fills a template, computes a consistent `target` from the chosen values, and assembles a complete mission (`simulation.circuit`, `target`, `test_cases`, `question`, `hints`, `workstation:"circuit_lab"`) matching the exact schema the Circuit Lab consumes.
- **Validator** (`validateCircuitMission`): ports the DC Modified Nodal Analysis solver and **proves a solution exists** — the compiled circuit must solve to its target within tolerance, or compilation throws. Every mission that ships is guaranteed complete and solvable.
- **Router hook** (`isCircuitDomain`): `arena.js:/daily` compiles a circuit mission for ECE/circuit requests and returns it; the LLM path remains the fallback.

Verified: 400/400 random compilations passed validation; syntax + imports clean.

Schema (authoritative — mirrors `CircuitLabWorkstation`):
```
simulation: {
  type: "dc_circuit",
  circuit: {
    nodes: ["A","B","GND"],
    components: [{ id, type:"resistor"|"voltage_source", value, unit,
                   node_a/node_b (or node_plus/node_minus),
                   editable?, min?, max?, step?, description? }],
    layout: { NODE:{x,y,extra?}, wires:[{x1,y1,x2,y2}] },
    probe: "B"
  },
  target: { type:"voltage_at_probe"|"current", node?, component?, value, tolerance }
}
```

## Still to do (follow-ups)

1. **Empty-workstation guard (frontend):** if a mission resolves to a structured workstation but lacks its payload, fall back to a compiled/seeded challenge instead of the empty state — belt-and-braces.
2. **Workstation-aware starters:** never ship a JS `solve()` stub to a non-code workstation.
3. **Staging validation:** exercise an ECE Circuit Lab daily mission live to confirm the render + the target-check + ELO write; then extend.

## Roadmap — every non-IT stream (same compile→validate contract)

Each stream needs a template library + a validator that proves the mission is complete and gradable before it reaches the workstation. The DC solver covers resistive circuits; other physics need their own validators.

| Stream | Workstation payload | Compiler templates | Validator |
|--------|--------------------|--------------------|-----------|
| ECE (done) | `simulation.circuit` (DC) | voltage/current divider (+ ladder, bridge) | DC MNA solve → target |
| ECE (next) | AC / time-domain | RC/RL filter, rectifier, 555 | transient/AC solver (new) |
| EEE | power sim, waveforms | load-flow, 3-phase, PLC ladder | power-flow solver |
| Mechanical | parts, constraints, assembly | gearbox ratio, beam, linkage | statics/kinematics check |
| Civil | structure, materials, loads | beam/truss, bridge | FEA/statics check |
| PCB | nets, pads, routing | schematic → netlist | DRC / netlist rules |
| Cybersecurity | logs, packets, SIEM, VM, network | log-analysis, packet capture | expected-finding match |

**Principle:** the Mission Compiler is the single choke point — no mission reaches a workstation unless its payload is present, parameter-randomized, and validated as solvable/gradable. That turns Arena from "AI → random JSON" into "AI picks topic → compiler guarantees a complete, valid, deterministic mission."
