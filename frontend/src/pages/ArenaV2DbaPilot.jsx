// ArenaV2DbaPilot.jsx — Arena V2, fifth role workspace (Database Administrator)
// ---------------------------------------------------------------------------
// Same shared shell as the four earlier role pages (RolePilotShell, itself a
// thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes a fifth time, to
// a database operations domain: a schema/ER/query-plan/index lab
// (DbaWorkstationV2) instead of a notebook, IDE, SOC desk, or cloud
// console, same submission -> validator -> assessment -> ELO -> skill ->
// proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2DbaPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Database Administrator"
      careerFamily="IT"
      title="Database Administrator Workspace"
      subtitle="A real database operations lab — schema explorer, ER diagram, query plans, index simulation, AI review, real ELO."
    />
  )
}
