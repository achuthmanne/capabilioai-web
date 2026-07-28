// RolePilotShell.jsx — Arena V2, shared pilot-workspace page shell
// ---------------------------------------------------------------------------
// Outer page chrome ONLY: title, subtitle, back button, and a card wrapper
// around ArenaV2ChallengeShell. Every role-specific page (ArenaV2MLPilot.jsx,
// ArenaV2SoftwarePilot.jsx, ArenaV2CyberPilot.jsx) is a thin wrapper around
// this shell, parameterized by role/careerFamily/title/subtitle.
//
// As of the shared-workspace-shell refactor, the mission bar, brief panel,
// mission-control/review panel, rewards, Career Skills radar, and the
// recruiter-evidence link all moved into ArenaV2WorkspaceShell.jsx (rendered
// by ArenaV2ChallengeShell.jsx, once per graded mission) — this file no
// longer fetches skill-graph/progress data itself and no longer renders
// that chrome directly. That removed a second, redundant data-fetch path
// (this file previously ran its own fetchSkillGraph/fetchMyProgress calls
// in parallel with the shell's) and collapsed the "onGraded bumps a
// refreshKey passed down two components" wiring into the workspace shell
// simply refetching off its own submissionState.feedback identity.
//
// The actual workspace UI (NotebookWorkstationV2, CodeWorkstationV2,
// TerminalWorkstationV2) is still decided entirely by the backend's
// Workstation Router (payload.componentKey) via ArenaV2ChallengeShell —
// this shell never branches on role itself.
import ArenaV2ChallengeShell from "./ArenaV2ChallengeShell.jsx"

/**
 * @param {{ role: string, careerFamily?: string, title: string, subtitle: string,
 *           user?: object, userData?: object, onBack?: () => void,
 *           onViewRecruiterEvidence?: (userId: string) => void }} props
 */
export default function RolePilotShell({ role, careerFamily = "IT", title, subtitle, user, userData, onBack, onViewRecruiterEvidence }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{subtitle}</div>
        </div>
        {onBack && (
          <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: 6, background: "transparent", color: "#94a3b8", border: "1px solid #334155" }}>
            ← Back
          </button>
        )}
      </div>

      <div style={{ background: "#0b1220", borderRadius: 10, border: "1px solid #1e293b" }}>
        <ArenaV2ChallengeShell
          challengeType="domain"
          role={role}
          careerFamily={careerFamily}
          userId={user?.id}
          onViewRecruiterEvidence={onViewRecruiterEvidence}
        />
      </div>
    </div>
  )
}
