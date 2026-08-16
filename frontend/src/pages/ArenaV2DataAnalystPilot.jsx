// ArenaV2DataAnalystPilot.jsx — Arena V2, Data Analyst role workspace
// ---------------------------------------------------------------------------
// Same shared shell pattern as every other role page (RolePilotShell) — the
// only thing that changes is `role`, which the backend resolves to the real
// "Data Analyst" / sql-total-revenue domain template (workstation: "sql",
// rendered by SqlWorkstationV2.jsx, graded by the deterministic
// ground_truth_compare validator rather than the AI rubric_review path the
// other roles use — SqlWorkstationV2 already handles that transparently).
//
// This page existed as a real, working template + workstation combo before
// this file did — the template (`sql-total-revenue`) and its frontend
// wiring (workstationRegistry.js's SqlWorkstation -> SqlWorkstationV2.jsx)
// were already there. The only thing missing was a page to actually reach
// it through, the same gap flagged in v1ToV2RoleMap.js's header comment.
//
// 2026-08-14: reintroduced as an explicit, opt-in addition to the existing
// V1 "Open workstation ->" pattern (see v1ToV2RoleMap.js) — NOT wired into
// ARENA_V2_DEFAULT_DOMAINS, so Data Analyst students keep landing on V1's
// Arena by default exactly like every other role; this only makes the
// V2 workstation reachable via the same opt-in button DBA/Cyber/DevOps/ML/
// SWE/ECE/EEE/Mechanical/Civil already use. See challenge-engine/engine.js's
// isAiScenarioSafe guard (same commit) for the correctness fix this role
// specifically needed before being made reachable — Data Analyst's template
// is ground_truth_compare, so it must never receive the AI-scenario overlay.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2DataAnalystPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Data Analyst"
      careerFamily="IT"
      title="Data Analyst Workspace"
      subtitle="Real SQL against a real seeded database — your query is graded by actually running it, not by AI guesswork."
    />
  )
}
