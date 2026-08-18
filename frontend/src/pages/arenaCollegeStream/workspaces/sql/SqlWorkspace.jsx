/**
 * SqlWorkspace.jsx — Phase 2.5, standardized onto the single `workspace`
 * prop contract in Phase 2.6 (Task 1: Standardize Workspace API).
 *
 * The panel-registry architecture's first real workspace implementation.
 * Registered under panel_type "sql_runner" in ../registry.js.
 *
 * Receives exactly one prop — `workspace` — shaped:
 *   { mission, submission: {result, submitting, error},
 *     preview: {validateResult, validateError, validating},
 *     state: {sql, setSql}, actions: {onSubmit, onPreview, onOpenMission, onBackToMissions},
 *     permissions: {canSubmit, canPreview}, navigation: {missions}, timer: {deadline} }
 * This top-level shape is meant to stay stable across every future
 * workspace type — `state`'s own contents are workspace-specific (a
 * Python workspace's `state` would hold different fields entirely).
 *
 * Owns zero state of its own — everything above is still owned by
 * ArenaCollegeStream.jsx and passed down. A future workspace (Python,
 * Cyber, SAP, ...) follows the same contract: import shared primitives
 * from ../../shared/*, own no state, receive `{ workspace }`.
 */
import SqlEditor from "./SqlEditor"
import { T, MONO, BODY, DIFFICULTY_COLOR } from "../../shared/tokens"
import { Eyebrow, StatChip, ResultTable, ChecklistPanel } from "../../shared/primitives"
import { useCountdown } from "../../shared/useCountdown"

export default function SqlWorkspace({ workspace }) {
  const { mission, submission, preview, state, actions, permissions, navigation, timer } = workspace
  const { sql, setSql } = state
  const { missions } = navigation

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
      {mission.dataset_preview?.columns && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.ink3, textTransform: "uppercase", letterSpacing: 1 }}>Dataset</div>
          <div style={{ fontSize: 12, color: T.ink2, fontFamily: MONO }}>{mission.dataset_preview.columns.length} columns</div>
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
      <div style={{ fontSize: 12, color: T.ink4 }}>Scored deterministically against the expected result set — no AI in the loop.</div>
    </>
  )

  return (
    <div>
      {/* Same pattern as PortalCard's @keyframes tag in ArenaCollegeStream.jsx
          — the file has no CSS-in-JS system, so a scoped <style> tag is how
          a media query gets in at all. Collapses the 1fr/300px workspace
          grid to a single column below tablet width; the editor itself
          doesn't need to be mobile-first, but the layout shouldn't force
          horizontal scrolling on a narrow screen either. */}
      <style>{`@media (max-width: 900px) { .domain-workspace-grid { grid-template-columns: 1fr !important; } }`}</style>
      {/* Workspace header strip — title + full company/team/sprint context
          in one place, promoted out of a small inline card so it reads
          like a real work ticket, not a footnote. */}
      <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 22px", boxShadow: T.shadow, marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: T.ink, fontSize: 18, marginBottom: 10 }}>{mission.title}</div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 12, fontFamily: MONO, color: T.ink4 }}>
          {mission.company && <span><b style={{ color: T.ink }}>Company</b> {mission.company}</span>}
          {mission.manager && <span><b style={{ color: T.ink }}>Manager</b> {mission.manager}</span>}
          {mission.sprint && <span><b style={{ color: T.ink }}>Sprint</b> {mission.sprint}</span>}
          <span><b style={{ color: T.ink }}>Difficulty</b> <span style={{ color: DIFFICULTY_COLOR[mission.difficulty], textTransform: "uppercase" }}>{mission.difficulty}</span></span>
          {mission.estimated_minutes && <span><b style={{ color: T.ink }}>Est. Time</b> {mission.estimated_minutes} min</span>}
          <span><b style={{ color: T.ink }}>Reward</b> <span style={{ color: T.indigo }}>+{mission.elo_reward} ELO</span></span>
          <span><b style={{ color: T.ink }}>Status</b> <span style={{ color: alreadyCompleted ? T.green : T.amber }}>{alreadyCompleted ? "Completed" : "In Progress"}</span></span>
        </div>
      </div>

      <div className="domain-workspace-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Problem statement + schema */}
        <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
          <Eyebrow color={T.ink3}>Problem Statement</Eyebrow>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: T.ink, marginBottom: 16 }}>{mission.prompt}</div>

          {mission.dataset_preview && (
            <div style={{ marginBottom: 4, overflowX: "auto" }}>
              <Eyebrow color={T.ink3}>Schema (sample rows)</Eyebrow>
              <ResultTable columns={mission.dataset_preview.columns} rows={mission.dataset_preview.rows} />
            </div>
          )}
        </div>

        {/* SQL editor */}
        <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow }}>
          <Eyebrow color={T.ink3}>SQL Editor</Eyebrow>
          <div style={{ marginBottom: 12 }}>
            <SqlEditor value={sql} onChange={setSql} disabled={submission.submitting || preview.validating} T={T} MONO={MONO} />
          </div>
          {submission.error && <div style={{ color: T.red, fontSize: 13, marginBottom: 10 }}>{submission.error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={actions.onPreview}
              disabled={!permissions.canPreview}
              title="Run against the sandbox without scoring — iterate freely, this never counts as an attempt."
              style={{
                padding: "10px 20px", borderRadius: 10, border: `1px solid ${T.border}`,
                background: !permissions.canPreview ? T.border : T.cream,
                color: !permissions.canPreview ? T.ink3 : T.ink,
                fontWeight: 700, fontFamily: BODY, cursor: !permissions.canPreview ? "default" : "pointer",
              }}
            >
              {preview.validating ? "Running…" : "▶ Run (Preview)"}
            </button>
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
              {submission.submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>

        {/* Preview panel — non-scoring "Run" output, visually distinct
            (dashed border, explicit "not scored" label) from the real
            submission result below, so it can never be mistaken for one. */}
        {(preview.validateResult || preview.validateError) && !submission.result && (
          <div style={{ background: T.cream, border: `1px dashed ${T.ink3}`, borderRadius: 16, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Eyebrow color={T.ink3}>Preview — Not Scored</Eyebrow>
              {preview.validateResult && (
                <div style={{ display: "flex", gap: 8 }}>
                  <StatChip label="Executed" value={`${preview.validateResult.executionTimeMs} ms`} />
                  <StatChip label="Rows" value={preview.validateResult.rowCount} />
                </div>
              )}
            </div>
            {preview.validateError && <div style={{ fontSize: 13, color: T.red }}>{preview.validateError}</div>}
            {preview.validateResult && (
              <>
                <ResultTable columns={preview.validateResult.columns} rows={preview.validateResult.rows} />
                {preview.validateResult.warnings?.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {preview.validateResult.warnings.map((w, i) => (
                      <div key={i} style={{ fontSize: 12, color: T.amber }}>⚠ {w}</div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Output workspace — only appears after a run */}
        {submission.result && (
          <div style={{ background: T.cream2, border: `1px solid ${T.border}`, borderRadius: 16, padding: 22, boxShadow: T.shadow, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <Eyebrow color={submission.result.passed ? T.green : T.red}>
                {submission.result.passed ? "Query Executed Successfully" : "Query Executed — Output Didn't Match"}
              </Eyebrow>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StatChip label="Status" value={submission.result.passed ? "Success" : "Mismatch"} />
                {submission.result.execution_time_ms != null && <StatChip label="Executed" value={`${submission.result.execution_time_ms} ms`} />}
                {submission.result.result && <StatChip label="Rows" value={submission.result.result.rows.length} />}
                <StatChip label="Score" value={`${submission.result.score}/100`} />
              </div>
            </div>

            {submission.result.result && (
              <div>
                <Eyebrow color={T.ink3}>Result Table</Eyebrow>
                <ResultTable columns={submission.result.result.columns} rows={submission.result.result.rows} />
              </div>
            )}

            {submission.result.insight && (
              <div>
                <Eyebrow color={T.ink3}>Business Insight</Eyebrow>
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{submission.result.insight}</div>
              </div>
            )}

            {submission.result.ai_feedback && (
              <div style={{ background: T.indigo3, borderRadius: 10, padding: 14 }}>
                <Eyebrow color={T.indigo}>🤖 AI Coach</Eyebrow>
                <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6 }}>{submission.result.ai_feedback}</div>
              </div>
            )}

            {submission.result.checklist && (
              <div>
                <Eyebrow color={T.ink3}>Validation</Eyebrow>
                <ChecklistPanel checklist={submission.result.checklist} />
              </div>
            )}

            {!submission.result.result && submission.result.feedback && (
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
