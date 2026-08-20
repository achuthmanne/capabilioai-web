/**
 * FrontendWorkspace.jsx — Vision Reset (2026-08-20).
 *
 * The panel-registry architecture's fourth real workspace implementation.
 * Registered under panel_type "frontend_runner" in ../registry.js. Same
 * `workspace` contract as ../node/NodeWorkspace.jsx (`state.code` holds
 * the CSS text — reusing the same field name every code-execution
 * workspace already uses, not a new one) PLUS a real, live, sandboxed
 * browser preview: `mission.html` (fixed, read-only markup) rendered
 * with the student's live CSS inside an `<iframe sandbox="">` — no
 * scripts, no same-origin, no forms; the sandbox attribute is
 * deliberately empty (strictest possible) since these missions are
 * CSS-only by construction (see prompts/domainRole.js's
 * frontendMissionGeneration: "no <script>").
 *
 * Grading is real but structural (see lib/domainRole/cssRuleChecker.js's
 * header for why — no headless browser in this stack) — the preview here
 * is for the student's own visual feedback while they work; it plays no
 * role in scoring.
 */
import { useMemo, useState } from "react"
import FrontendEditor from "./FrontendEditor"
import { T, MONO, BODY, DIFFICULTY_COLOR } from "../../shared/tokens"
import { Eyebrow, StatChip, ChecklistPanel } from "../../shared/primitives"
import { useCountdown } from "../../shared/useCountdown"

function LivePreview({ html, css }) {
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>* { box-sizing: border-box; } body { margin: 0; padding: 16px; font-family: system-ui, sans-serif; }\n${css || ""}</style></head><body>${html || ""}</body></html>`,
    [html, css]
  )
  return (
    <iframe
      title="Live preview"
      srcDoc={srcDoc}
      sandbox=""
      style={{ width: "100%", height: 260, border: `1px solid ${T.border}`, borderRadius: 10, background: "#fff" }}
    />
  )
}

export default function FrontendWorkspace({ workspace }) {
  const { mission, submission, state, actions, permissions, navigation, timer } = workspace
  const { code, setCode } = state
  const { missions } = navigation
  const [showHtml, setShowHtml] = useState(false)

  const currentIndex = missions.findIndex(m => m.id === mission.id)
  const nextMission = currentIndex >= 0 ? missions[currentIndex + 1] : null
  const countdown = useCountdown(submission.result ? null : timer.deadline)
  const listEntry = missions.find(m => m.id === mission.id)
  const alreadyCompleted = !!listEntry?.passed

  const missionInfo = (
    <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontFamily: MONO, fontSize: 11, marginBottom: 10 }}>
        <span style={{ color: DIFFICULTY_COLOR[mission.difficulty] || T.ink3, fontWeight: 700, textTransform: "uppercase" }}>
          {mission.difficulty}
        </span>
        <span style={{ color: T.indigo, fontWeight: 700 }}>+{mission.elo_reward} ELO on pass</span>
      </div>
      {alreadyCompleted && (
        <div style={{ display: "inline-block", padding: "3px 9px", borderRadius: 6, background: T.green2, color: T.green, fontWeight: 800, fontSize: 11, marginBottom: 10 }}>
          ✓ Completed
        </div>
      )}
      {countdown.text && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1 }}>Time Target</div>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: countdown.expired ? T.red : T.ink }}>
            {countdown.expired ? "Time's up" : countdown.text}
          </div>
        </div>
      )}
      <div style={{ fontSize: 12, color: T.ink4 }}>Graded against the same structural CSS checks a reviewer would verify — the markup is fixed, only your CSS is scored.</div>
    </>
  )

  return (
    <div>
      <style>{`@media (max-width: 900px) { .domain-workspace-grid-frontend { grid-template-columns: 1fr !important; } }`}</style>

      <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", boxShadow: T.shadow, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: T.ink, fontSize: 18, marginBottom: 10 }}>{mission.title}</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, fontFamily: MONO, color: T.ink4 }}>
          {mission.company && <span><b style={{ color: T.ink }}>Company</b> {mission.company}</span>}
          <span><b style={{ color: T.ink }}>Difficulty</b> <span style={{ color: DIFFICULTY_COLOR[mission.difficulty], textTransform: "uppercase" }}>{mission.difficulty}</span></span>
          {mission.estimated_minutes && <span><b style={{ color: T.ink }}>Est. Time</b> {mission.estimated_minutes} min</span>}
          <span><b style={{ color: T.ink }}>Reward</b> <span style={{ color: T.indigo }}>+{mission.elo_reward} ELO</span></span>
          <span><b style={{ color: T.ink }}>Status</b> <span style={{ color: alreadyCompleted ? T.green : T.amber }}>{alreadyCompleted ? "Completed" : "In Progress"}</span></span>
        </div>
      </div>

      <div className="domain-workspace-grid-frontend" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
          <Eyebrow color={T.ink3}>Ticket</Eyebrow>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: T.ink, whiteSpace: "pre-wrap" }}>{mission.prompt}</div>
          {mission.html && (
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => setShowHtml(s => !s)}
                style={{ background: "none", border: "none", color: T.indigo, fontWeight: 700, cursor: "pointer", fontFamily: BODY, fontSize: 12, padding: 0 }}
              >
                {showHtml ? "Hide" : "View"} the page markup (fixed — not editable)
              </button>
              {showHtml && (
                <pre style={{ marginTop: 8, background: T.cream, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12, fontSize: 12, fontFamily: MONO, color: T.ink2, overflow: "auto" }}>
                  {mission.html}
                </pre>
              )}
            </div>
          )}
        </div>

        <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
          <Eyebrow color={T.ink3}>CSS Editor</Eyebrow>
          <div style={{ marginBottom: 12 }}>
            <FrontendEditor value={code} onChange={setCode} disabled={submission.submitting} T={T} MONO={MONO} />
          </div>
          <Eyebrow color={T.ink3}>Live Preview</Eyebrow>
          <div style={{ marginBottom: 12 }}>
            <LivePreview html={mission.html} css={code} />
          </div>
          {submission.error && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{submission.error}</div>}
          <button
            onClick={actions.onSubmit}
            disabled={!permissions.canSubmit}
            style={{
              padding: "10px 20px", borderRadius: 10, border: "none",
              background: !permissions.canSubmit ? T.border : T.indigo,
              color: !permissions.canSubmit ? T.ink3 : "#fff",
              fontWeight: 700, fontFamily: BODY, cursor: !permissions.canSubmit ? "default" : "pointer",
            }}
          >
            {submission.submitting ? "Checking…" : "Submit"}
          </button>
        </div>

        {submission.result && (
          <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <Eyebrow color={submission.result.passed ? T.green : T.red}>
                {submission.result.passed ? "All Checks Passed" : "Some Checks Failed"}
              </Eyebrow>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StatChip label="Status" value={submission.result.passed ? "Passed" : "Failed"} />
                <StatChip label="Score" value={`${submission.result.score}/100`} />
              </div>
            </div>

            {submission.result.checklist && (
              <div>
                <Eyebrow color={T.ink3}>Requirements</Eyebrow>
                <ChecklistPanel checklist={submission.result.checklist} />
              </div>
            )}

            {submission.result.ai_feedback && (
              <div style={{ background: T.indigo3, borderRadius: 10, padding: 14 }}>
                <Eyebrow color={T.indigo}>🤖 AI Coach</Eyebrow>
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{submission.result.ai_feedback}</div>
              </div>
            )}

            {!submission.result.passed && submission.result.feedback && (
              <div style={{ fontSize: 13, color: T.red }}>{submission.result.feedback}</div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 13, color: T.ink4 }}>
                ELO {submission.result.elo_delta > 0 ? `+${submission.result.elo_delta}` : submission.result.elo_delta}
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <button
                  onClick={actions.onBackToMissions}
                  style={{ background: "none", border: "none", color: T.ink4, fontWeight: 700, cursor: "pointer", fontFamily: BODY, fontSize: 13, padding: 0 }}
                >
                  ← All missions
                </button>
                {submission.result.passed && nextMission && (
                  <button
                    onClick={() => actions.onOpenMission(nextMission)}
                    style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: T.indigo, color: "#fff", fontWeight: 700, fontFamily: BODY, cursor: "pointer", fontSize: 13 }}
                  >
                    Continue: {nextMission.title} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 18, boxShadow: T.shadow, height: "fit-content" }}>
        <Eyebrow color={T.ink3}>Mission</Eyebrow>
        {missionInfo}
      </div>
      </div>
    </div>
  )
}
