// ArenaV2EcePilot.jsx — Arena V2, sixth role workspace (Electronics Engineer / ECE)
// ---------------------------------------------------------------------------
// Same shared shell as the five earlier role pages (RolePilotShell, itself a
// thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes a sixth time, to
// a non-IT engineering domain: an analog circuit lab (EceWorkstationV2)
// instead of a notebook, IDE, SOC desk, cloud console, or DB lab, same
// submission -> validator -> assessment -> ELO -> skill -> proof pipeline
// underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2EcePilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Electronics Engineer"
      careerFamily="ECE"
      title="Electronics Engineer Workspace"
      subtitle="A real analog circuit lab — schematic, component explorer, signal probing, gain-stage simulation, AI review, real ELO."
    />
  )
}
