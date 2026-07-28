// ArenaV2MedicalBiotechPilot.jsx — Arena V2, eleventh role workspace (Medical Biotechnology Specialist)
// ---------------------------------------------------------------------------
// Same shared shell as the ten earlier role pages (RolePilotShell, itself a
// thin wrapper around ArenaV2ChallengeShell + the shared
// ArenaV2WorkspaceShell) — proving the pattern generalizes an eleventh
// time, to a clinical/medical biotech domain: an ELISA assay lab
// (MedicalBiotechWorkstationV2) instead of a notebook, IDE, SOC desk, cloud
// console, DB lab, analog signal lab, power lab, structural lab, drivetrain
// lab, or bioreactor lab, same submission -> validator -> assessment -> ELO
// -> skill -> proof pipeline underneath.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2MedicalBiotechPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Medical Biotechnology Specialist"
      careerFamily="MedicalBiotech"
      title="Medical Biotechnology Specialist Workspace"
      subtitle="A real clinical assay lab — ELISA workflow, plate readout probing, incubation-time simulation, AI review, real ELO."
    />
  )
}
