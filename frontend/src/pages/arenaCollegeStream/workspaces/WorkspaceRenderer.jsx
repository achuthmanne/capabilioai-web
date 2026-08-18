/**
 * WorkspaceRenderer.jsx — Phase 2.5.
 *
 * Looks up the right workspace component for a mission's panel_type and
 * renders it. Owns zero state — pure lookup + pass-through render, so
 * ArenaCollegeStream.jsx keeps owning every piece of mission/submission
 * state exactly as before; this component never touches it.
 *
 * Currently unreachable in production (every seeded mission is
 * "sql_runner"), but the fallback below must never crash — a mission
 * whose panel_type has no registered workspace yet should degrade to a
 * plain message, not a blank screen.
 */
import { PANEL_REGISTRY } from "./registry"
import { T } from "../shared/tokens"
import { Eyebrow } from "../shared/primitives"

function UnsupportedPanel({ panelType }) {
  return (
    <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
      <Eyebrow color={T.ink3}>Workspace Unavailable</Eyebrow>
      <div style={{ color: T.ink2, fontSize: 14 }}>
        This mission's workspace type ("{panelType}") isn't built yet.
      </div>
    </div>
  )
}

export default function WorkspaceRenderer({ mission, ...workspaceProps }) {
  const Workspace = PANEL_REGISTRY[mission.panel_type]
  if (!Workspace) return <UnsupportedPanel panelType={mission.panel_type} />
  return <Workspace mission={mission} {...workspaceProps} />
}
