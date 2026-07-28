// ArenaV2DevOpsPilot.jsx — Arena V2, fourth role workspace (DevOps Engineer)
// ---------------------------------------------------------------------------
// Same shared shell as ArenaV2MLPilot.jsx / ArenaV2SoftwarePilot.jsx /
// ArenaV2CyberPilot.jsx (RolePilotShell, itself now a thin wrapper around
// ArenaV2ChallengeShell + the shared ArenaV2WorkspaceShell) — proving the
// pattern generalizes a fourth time, this time to a non-coding,
// infrastructure/operations domain: a cloud console (DevOpsConsoleWorkstationV2)
// instead of a notebook, IDE, or SOC desk, same submission -> validator ->
// assessment -> ELO -> skill -> proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2DevOpsPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="DevOps Engineer"
      careerFamily="IT"
      title="DevOps Engineer Workspace"
      subtitle="A real cloud/infrastructure console — deployments, pods, pipeline, Terraform drift, AI review, real ELO."
    />
  )
}
