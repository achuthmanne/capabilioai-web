// ArenaV2MechanicalPilot.jsx — Arena V2, ninth role workspace (Mechanical Engineer)
// ---------------------------------------------------------------------------
// Same shared shell as the eight earlier role pages (RolePilotShell, itself
// a thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes a ninth time, to
// a mechanical/drivetrain engineering domain: a speed/torque motion lab
// (MechanicalWorkstationV2) instead of a notebook, IDE, SOC desk, cloud
// console, DB lab, analog signal lab, power lab, or structural lab, same
// submission -> validator -> assessment -> ELO -> skill -> proof pipeline
// underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2MechanicalPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Mechanical Engineer"
      careerFamily="Mechanical"
      title="Mechanical Engineer Workspace"
      subtitle="A real drivetrain lab — speed/torque probing, gearbox-ratio simulation, AI review, real ELO."
    />
  )
}
