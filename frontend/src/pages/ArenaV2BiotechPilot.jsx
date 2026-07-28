// ArenaV2BiotechPilot.jsx — Arena V2, tenth role workspace (Bioprocess Engineer)
// ---------------------------------------------------------------------------
// Same shared shell as the nine earlier role pages (RolePilotShell, itself
// a thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes a tenth time, to
// a bioprocess engineering domain: a bioreactor culture/assay lab
// (BiotechWorkstationV2) instead of a notebook, IDE, SOC desk, cloud
// console, DB lab, analog signal lab, power lab, structural lab, or
// drivetrain lab, same submission -> validator -> assessment -> ELO ->
// skill -> proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2BiotechPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Bioprocess Engineer"
      careerFamily="Biotech"
      title="Bioprocess Engineer Workspace"
      subtitle="A real bioreactor lab — process flow, culture assay probing, pH/DO setpoint simulation, AI review, real ELO."
    />
  )
}
