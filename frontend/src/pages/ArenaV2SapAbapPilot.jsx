// ArenaV2SapAbapPilot.jsx — Arena V2 (SAP ABAP Developer)
// ---------------------------------------------------------------------------
// Thin role-specific wrapper around the shared RolePilotShell, same pattern
// as every other role page (ArenaV2MLPilot.jsx etc.). Renders
// SapConsoleWorkstationV2.jsx in its "abap" mode (AI-reviewed, not
// executed — see that file's header for why).
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2SapAbapPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="SAP ABAP Developer"
      careerFamily="IT"
      title="SAP ABAP Developer Workspace"
      subtitle="A real ABAP coding mission, AI-reviewed against a real weighted rubric — Arena V2 pilot slice."
    />
  )
}
