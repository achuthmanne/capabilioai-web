// ArenaV2CyberPilot.jsx — Arena V2, third role workspace (Cybersecurity Analyst)
// ---------------------------------------------------------------------------
// Same shared shell as ArenaV2MLPilot.jsx / ArenaV2SoftwarePilot.jsx
// (RolePilotShell) — proving the pattern generalizes a third time: a
// different workstation (TerminalWorkstation), different mission content
// and validation style (AI-graded investigation report against a real
// answer key, not code execution), same submission -> validator ->
// assessment -> ELO -> skill -> proof pipeline.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2CyberPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Cybersecurity Analyst"
      careerFamily="IT"
      title="Cybersecurity Analyst Workspace"
      subtitle="A real SOC investigation desk — alerts, logs, PCAP, MITRE mapping, AI review, real ELO."
    />
  )
}
