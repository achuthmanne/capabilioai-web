/**
 * MissionSidebar.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Tab container: Brief / Attachments / Requirements / Acceptance Criteria /
 * Hints / Reference Docs / Submission Checklist. Real, upstream data exists
 * for exactly two of these today — everything else renders an honest
 * "not available for this mission" placeholder (matching
 * WorkspaceRenderer.jsx's UnsupportedPanel precedent), never fabricated
 * content:
 *   - Brief: `mission.prompt` — real, always present.
 *   - Submission Checklist: `submission.result.checklist` — real, but only
 *     populated after a submission (see workspaces/sql/SqlWorkspace.jsx's
 *     own `<ChecklistPanel checklist={submission.result.checklist} />`
 *     usage — same field, same shared component, reused here rather than
 *     re-implemented).
 * Attachments/Requirements/Acceptance Criteria/Hints/Reference Docs have no
 * matching column on domain_missions or experiments today — confirmed, not
 * assumed.
 *
 * `activeTab`/`onActiveTabChange` are optional controlled props (same
 * uncontrolled-fallback pattern as WorkspaceToolbar's fontScale) — local
 * state until shell/state/useWorkspaceLayout.js persists it.
 */
import { memo, useState } from "react"
import { useShellTokens } from "./tokens"
import { ChecklistPanel } from "../shared/primitives"

const TABS = [
  { id: "brief", label: "Brief" },
  { id: "attachments", label: "Attachments" },
  { id: "requirements", label: "Requirements" },
  { id: "acceptance", label: "Acceptance Criteria" },
  { id: "hints", label: "Hints" },
  { id: "docs", label: "Reference Docs" },
  { id: "checklist", label: "Checklist" },
]

function Placeholder({ label }) {
  const ws = useShellTokens()
  return <div style={{ fontSize: 12, color: ws.ink4, lineHeight: 1.6 }}>{label} isn't available for this mission yet.</div>
}

function TabContent({ id, workspace }) {
  const ws = useShellTokens()
  const { mission, submission } = workspace

  if (id === "brief") {
    return <div style={{ fontSize: 13, color: ws.ink2, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{mission?.prompt || "No brief available."}</div>
  }
  if (id === "checklist") {
    const checklist = submission?.result?.checklist
    if (!checklist) return <div style={{ fontSize: 12, color: ws.ink4 }}>Submit your work to see the checklist.</div>
    return <ChecklistPanel checklist={checklist} />
  }
  const labels = { attachments: "Attachments", requirements: "Requirements", acceptance: "Acceptance criteria", hints: "Hints", docs: "Reference docs" }
  return <Placeholder label={labels[id] || id} />
}

function MissionSidebar({ workspace, activeTab, onActiveTabChange }) {
  const ws = useShellTokens()
  const [localTab, setLocalTab] = useState("brief")
  const tab = activeTab ?? localTab
  const setTab = onActiveTabChange ?? setLocalTab

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: ws.bgPanel }}>
      <div role="tablist" aria-label="Mission info" style={{ display: "flex", flexDirection: "column", borderBottom: `1px solid ${ws.border}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: tab === t.id ? 800 : 500,
              color: tab === t.id ? ws.ink : ws.ink3, background: tab === t.id ? ws.bgCard : "transparent",
              border: "none", borderLeft: `2px solid ${tab === t.id ? ws.accent : "transparent"}`, cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ padding: 14, overflow: "auto", flex: 1 }}>
        <TabContent id={tab} workspace={workspace} />
      </div>
    </div>
  )
}

export default memo(MissionSidebar)
