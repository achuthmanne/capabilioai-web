// ArenaV2EeePilot.jsx — Arena V2, seventh role workspace (Electrical Engineer / EEE)
// ---------------------------------------------------------------------------
// Same shared shell as the six earlier role pages (RolePilotShell, itself a
// thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes a seventh time,
// to a power-systems engineering domain: a rail-droop/transient lab
// (EeeWorkstationV2) instead of a notebook, IDE, SOC desk, cloud console,
// DB lab, or analog signal lab, same submission -> validator -> assessment
// -> ELO -> skill -> proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2EeePilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Electrical Engineer"
      careerFamily="EEE"
      title="Electrical Engineer Workspace"
      subtitle="A real power-systems lab — power-path diagram, transient probing, bulk-capacitor simulation, AI review, real ELO."
    />
  )
}
