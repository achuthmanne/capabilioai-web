/**
 * RightSidebar.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Tab container: AI Mentor / Mission Progress / Skill Progress / Related
 * Skills / Career Tip / Next Mission. Real data exists for two of these:
 *   - Mission Progress: difficulty/reward/pass-state, already on `mission`
 *     and derivable from `submission`/`navigation` the exact same way
 *     WorkspaceHeader.jsx derives status — small, intentional overlap
 *     with the header, presented as a dedicated progress summary here.
 *   - Next Mission: the SAME derivation and action
 *     (`navigation.missions[currentIndex + 1]` +
 *     `actions.onOpenMission(nextMission)`) workspaces/sql/SqlWorkspace.jsx
 *     already uses for its own "Continue: {title} →" CTA — reused, not
 *     reimplemented, and SqlWorkspace's own copy is left untouched.
 * AI Mentor / Skill Progress / Related Skills / Career Tip have no
 * upstream data source today (no skill_graph wiring into Domain Role or
 * College Stream submissions, no career-tip endpoint) — honest
 * placeholders, not fabricated content.
 */
import { memo, useState } from "react"
import { useShellTokens } from "./tokens"

const TABS = [
  { id: "mentor", label: "AI Mentor" },
  { id: "progress", label: "Progress" },
  { id: "skills", label: "Skills" },
  { id: "related", label: "Related" },
  { id: "tip", label: "Tip" },
  { id: "next", label: "Next" },
]

function Placeholder({ label }) {
  const ws = useShellTokens()
  return <div style={{ fontSize: 12, color: ws.ink4, lineHeight: 1.6 }}>{label} isn't available yet.</div>
}

function TabContent({ id, workspace }) {
  const ws = useShellTokens()
  const { mission, submission, navigation, actions } = workspace

  if (id === "progress") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: ws.ink4, textTransform: "uppercase" }}>Difficulty</div>
          <div style={{ fontSize: 14, color: ws.ink2, textTransform: "capitalize" }}>{mission?.difficulty || "—"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: ws.ink4, textTransform: "uppercase" }}>Reward</div>
          <div style={{ fontSize: 14, color: ws.accent, fontWeight: 800 }}>+{mission?.elo_reward ?? 0} ELO</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: ws.ink4, textTransform: "uppercase" }}>Result</div>
          <div style={{ fontSize: 14, color: submission?.result ? (submission.result.passed ? ws.success : ws.danger) : ws.ink3 }}>
            {submission?.result ? (submission.result.passed ? "Passed" : "Not yet passed") : "Not attempted"}
          </div>
        </div>
      </div>
    )
  }

  if (id === "next") {
    const missions = navigation?.missions || []
    const currentIndex = missions.findIndex(m => m.id === mission?.id)
    const nextMission = currentIndex >= 0 ? missions[currentIndex + 1] : null
    if (!nextMission) return <div style={{ fontSize: 12, color: ws.ink4 }}>No further mission queued.</div>
    return (
      <button
        type="button"
        onClick={() => actions?.onOpenMission?.(nextMission)}
        disabled={!actions?.onOpenMission}
        style={{
          width: "100%", textAlign: "left", padding: 12, borderRadius: 10,
          background: ws.accent + "18", border: `1px solid ${ws.accent}`, color: ws.ink,
          cursor: actions?.onOpenMission ? "pointer" : "not-allowed", fontSize: 13,
        }}
      >
        Continue: {nextMission.title} →
      </button>
    )
  }

  const labels = { mentor: "AI Mentor", skills: "Skill progress", related: "Related skills", tip: "Career tip" }
  return <Placeholder label={labels[id] || id} />
}

function RightSidebar({ workspace, activeTab, onActiveTabChange }) {
  const ws = useShellTokens()
  const [localTab, setLocalTab] = useState("progress")
  const tab = activeTab ?? localTab
  const setTab = onActiveTabChange ?? setLocalTab

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: ws.bgPanel }}>
      <div role="tablist" aria-label="Mission companion" style={{ display: "flex", flexWrap: "wrap", borderBottom: `1px solid ${ws.border}` }}>
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "6px 10px", fontSize: 11, fontWeight: tab === t.id ? 800 : 500,
              color: tab === t.id ? ws.ink : ws.ink3, background: "transparent", border: "none",
              borderBottom: `2px solid ${tab === t.id ? ws.accent : "transparent"}`, cursor: "pointer",
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

export default memo(RightSidebar)
