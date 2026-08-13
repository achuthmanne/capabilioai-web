// ArenaV2SapMmSdPilot.jsx — Arena V2 (SAP MM/SD Functional Consultant)
// ---------------------------------------------------------------------------
// Thin role-specific wrapper around the shared RolePilotShell, same pattern
// as every other role page (ArenaV2MLPilot.jsx etc.).
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2SapMmSdPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="SAP MM/SD Consultant"
      careerFamily="IT"
      title="SAP MM/SD Consultant Workspace"
      subtitle="A real config-decision mission graded by the AI Reviewer against a real weighted rubric — Arena V2 pilot slice."
    />
  )
}
