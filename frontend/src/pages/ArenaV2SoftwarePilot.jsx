// ArenaV2SoftwarePilot.jsx — Arena V2, second role workspace (Software Engineer)
// ---------------------------------------------------------------------------
// Same shared shell as ArenaV2MLPilot.jsx (RolePilotShell), proving the
// pattern generalizes to a second, distinct role: different workstation
// (CodeWorkstation, not NotebookWorkstation), different mission content,
// same submission -> validator -> assessment -> ELO -> skill -> proof pipeline.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2SoftwarePilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Software Engineer"
      careerFamily="IT"
      title="Software Engineer Workspace"
      subtitle="Real in-browser test execution, real AI code review, real ELO — Arena V2 second role slice."
    />
  )
}
