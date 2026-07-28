// ArenaV2ClinicalLabPilot.jsx — Arena V2, twelfth role workspace (Clinical Laboratory Specialist)
// ---------------------------------------------------------------------------
// Same shared shell as the eleven earlier role pages (RolePilotShell, itself
// a thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — a twelfth time, to a clinical/diagnostic lab
// operations domain: a 96-well plate map + protocol timeline lab
// (ClinicalLabWorkstationV2) instead of any prior workstation, same
// submission -> validator -> assessment -> ELO -> skill -> proof pipeline
// underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2ClinicalLabPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Clinical Laboratory Specialist"
      careerFamily="ClinicalLab"
      title="Clinical Laboratory Specialist Workspace"
      subtitle="A real diagnostic lab bench — plate map, protocol timeline, control interpretation, AI review, real ELO."
    />
  )
}
