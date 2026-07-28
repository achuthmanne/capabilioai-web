// ArenaV2MLPilot.jsx — Arena V2 Pilot Phase (ML/AI Engineer)
// ---------------------------------------------------------------------------
// Thin role-specific wrapper around the shared RolePilotShell (extracted
// when the second role workspace, Software Engineer, was added — see
// arena-v2/RolePilotShell.jsx's header). Public props/behavior unchanged
// from before the extraction, so App.jsx's existing wiring needed no edits.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2MLPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="ML Engineer"
      careerFamily="IT"
      title="ML/AI Engineer Pilot Workspace"
      subtitle="Real Python notebook, real dataset, real AI review, real ELO — Arena V2 pilot slice."
    />
  )
}
