// ArenaV2CivilPilot.jsx — Arena V2, eighth role workspace (Structural / Civil Engineer)
// ---------------------------------------------------------------------------
// Same shared shell as the seven earlier role pages (RolePilotShell, itself
// a thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes an eighth time,
// to a structural/civil engineering domain: a beam-deflection lab
// (StructuralWorkstationV2) instead of a notebook, IDE, SOC desk, cloud
// console, DB lab, analog signal lab, or power lab, same submission ->
// validator -> assessment -> ELO -> skill -> proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2CivilPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Structural Engineer"
      careerFamily="Civil"
      title="Structural Engineer Workspace"
      subtitle="A real structural engineering lab — framing diagram, deflection probing, beam-section simulation, AI review, real ELO."
    />
  )
}
