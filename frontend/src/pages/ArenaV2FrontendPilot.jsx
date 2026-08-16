// ArenaV2FrontendPilot.jsx — Arena V2, Frontend Developer role workspace
// ---------------------------------------------------------------------------
// Same shared shell pattern as every other role page (RolePilotShell). Role
// resolves to the "frontend_preview" workstation (FrontendWorkstationV2.jsx)
// — a real, live-rendered HTML/CSS/JS preview in a sandboxed iframe.
//
// 2026-08-14: added as an explicit, opt-in addition to the existing V1
// "Open workstation ->" pattern (see v1ToV2RoleMap.js) — NOT wired into
// ARENA_V2_DEFAULT_DOMAINS, so Frontend Developer students keep landing on
// V1's Arena by default exactly like every other role.
import RolePilotShell from "../arena-v2/RolePilotShell.jsx"

export default function ArenaV2FrontendPilot(props) {
  return (
    <RolePilotShell
      {...props}
      role="Frontend Developer"
      careerFamily="IT"
      title="Frontend Developer Workspace"
      subtitle="Real HTML/CSS/JS in a live, sandboxed browser preview — your work is graded on what actually renders and runs, not just the code you wrote."
    />
  )
}
