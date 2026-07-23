// ArenaV2ChallengeShell.jsx — Arena V2, Milestones 7 & 8
// ---------------------------------------------------------------------------
// The ONLY component that talks to the Challenge Delivery API (Milestone 6)
// AND the ONLY component that talks to the Submission API (Milestone 8).
// Everything downstream of this component works with DTOs alone —
// componentKey, uiModules, payload, submissionRules, rewardRules,
// portfolioDecision, and (Milestone 8) the Feedback DTO. It never imports or
// knows about Challenge Engine, Payload Validator, Submission Engine, the
// Validator/Assessment stages, or repository layers — those are backend
// implementation details, per your explicit instruction to keep the
// frontend unaware of them.
//
// MILESTONE 8 LAYERING RULE, enforced by construction: workstation
// components (SqlWorkstationV2.jsx today) are handed an `onSubmit` callback
// by THIS component — they never import arenaV2Submission.js themselves and
// never call the Submission API directly:
//
//   SqlWorkstation -> ChallengeShell -> Submission Client -> Submission API
//
// This is the same centralization the Delivery side already has (only this
// shell calls fetchNextChallenge); Milestone 8 extends it to the return path.
//
// Responsibilities, and nothing more:
//   1. Fetch (issue-or-resume) a challenge instance via arenaV2Delivery.js
//   2. Handle loading / error / schema-mismatch / "not yet integrated" states
//   3. Look up the workstation component for payload.componentKey
//   4. Render it, passing only the DTO fields it needs, plus `onSubmit`
//   5. Own the submit lifecycle (loading/error/feedback) and call the
//      Submission Client — never let a workstation manage this itself
//
// It does NOT render workstation-specific UI itself — that's each
// workstation component's job (SqlWorkstationV2.jsx today; the rest follow
// the same pattern once built, per docs/future-improvements.md).
import { Suspense, lazy, useCallback, useEffect, useState } from "react"
import { fetchNextChallenge, SchemaVersionMismatchError } from "../api/arenaV2Delivery.js"
import { submitChallenge } from "../api/arenaV2Submission.js"
import { FRONTEND_WORKSTATION_REGISTRY, isWorkstationReady } from "./workstationRegistry.js"

const workstationComponentCache = {}
function loadWorkstationComponent(componentKey) {
  if (!workstationComponentCache[componentKey]) {
    const entry = FRONTEND_WORKSTATION_REGISTRY[componentKey]
    // dynamic import path must be a literal-ish pattern for bundlers; since
    // only one workstation is wired today, this is an explicit switch on the
    // small "ready" set, NOT a role/career branch — it's purely "which local
    // module implements this already-decided componentKey."
    if (componentKey === "SqlWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/SqlWorkstationV2.jsx"))
    }
  }
  return workstationComponentCache[componentKey] || null
}

function NotIntegratedNotice({ componentKey }) {
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
        This workstation isn't wired up in Arena V2 yet
      </div>
      <div style={{ fontSize: 13 }}>
        The backend issued a real, validated challenge for <code>{componentKey}</code>, but the
        frontend component for it hasn't been built in this milestone. See{" "}
        <code>docs/future-improvements.md</code> for the remaining workstation list.
      </div>
    </div>
  )
}

function FeedbackPanel({ submissionState, onDismiss }) {
  if (submissionState.status === "idle") return null

  if (submissionState.status === "submitting") {
    return (
      <div style={{ padding: 16, textAlign: "center", color: "#94a3b8", borderTop: "1px solid #1e293b" }}>
        Grading your submission…
      </div>
    )
  }

  if (submissionState.status === "error") {
    return (
      <div style={{ padding: 16, borderTop: "1px solid #1e293b", color: "#f87171" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Couldn't submit your attempt</div>
        <div style={{ fontSize: 13 }}>{submissionState.error?.message}</div>
      </div>
    )
  }

  const fb = submissionState.feedback
  return (
    <div style={{ padding: 16, borderTop: "1px solid #1e293b" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, color: fb.passed ? "#4ade80" : "#f87171" }}>
          {fb.passed ? "✓ Passed" : "✗ Not yet"} — {fb.finalScore}/100
          {fb.isZeroEffort ? " (capped — submitted after the time limit)" : ""}
        </div>
        <button onClick={onDismiss} style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer" }}>
          Dismiss
        </button>
      </div>
      <div style={{ fontSize: 13, color: "#cbd5e1", marginBottom: 8 }}>{fb.feedback?.summary}</div>
      {fb.feedback?.detail?.length > 0 && (
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <tbody>
            {fb.feedback.detail.map((d, i) => (
              <tr key={i} style={{ borderTop: "1px solid #1e293b" }}>
                <td style={{ padding: "4px 6px", color: d.passed ? "#4ade80" : "#f87171" }}>{d.passed ? "✓" : "✗"}</td>
                <td style={{ padding: "4px 6px" }}>{d.metric}</td>
                <td style={{ padding: "4px 6px", color: "#94a3b8" }}>expected {String(d.expected)}</td>
                <td style={{ padding: "4px 6px", color: "#94a3b8" }}>{String(d.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ErrorNotice({ error }) {
  const isSchemaMismatch = error instanceof SchemaVersionMismatchError
  return (
    <div style={{ padding: 24, textAlign: "center", color: "#f87171" }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
        {isSchemaMismatch ? "This version of Arena is out of date" : "Couldn't load your next challenge"}
      </div>
      <div style={{ fontSize: 13 }}>{error.message}</div>
      {isSchemaMismatch && (
        <div style={{ fontSize: 13, marginTop: 8 }}>Please refresh the page to get the latest version.</div>
      )}
    </div>
  )
}

/**
 * @param {{ challengeType: 'common'|'domain', role?: string, industry?: string,
 *           skill?: string, difficulty?: string, scenarioId?: string }} props
 */
export default function ArenaV2ChallengeShell({ challengeType, role = null, industry = null, skill = null, difficulty = null, scenarioId = null }) {
  const [state, setState] = useState({ status: "loading", dto: null, error: null })
  const [submissionState, setSubmissionState] = useState({ status: "idle", feedback: null, error: null })

  useEffect(() => {
    let alive = true
    setState({ status: "loading", dto: null, error: null })
    setSubmissionState({ status: "idle", feedback: null, error: null })
    fetchNextChallenge({ challengeType, role, industry, skill, difficulty, scenarioId })
      .then((dto) => { if (alive) setState({ status: "ready", dto, error: null }) })
      .catch((error) => { if (alive) setState({ status: "error", dto: null, error }) })
    return () => { alive = false }
  }, [challengeType, role, industry, skill, difficulty, scenarioId])

  // The single point where a workstation's submission reaches the network —
  // no workstation component calls arenaV2Submission.js itself. `startedAt`
  // comes from the issued challenge's own DTO, so timing is computed
  // centrally here rather than tracked per-workstation.
  const handleSubmit = useCallback(async (submissionData) => {
    if (state.status !== "ready") return
    setSubmissionState({ status: "submitting", feedback: null, error: null })
    try {
      const feedback = await submitChallenge({
        challengeInstanceId: state.dto.challengeInstanceId,
        submissionData,
        startedAt: state.dto.startedAt,
      })
      setSubmissionState({ status: "done", feedback, error: null })
    } catch (error) {
      setSubmissionState({ status: "error", feedback: null, error })
    }
  }, [state])

  const dismissFeedback = useCallback(() => {
    setSubmissionState({ status: "idle", feedback: null, error: null })
  }, [])

  if (state.status === "loading") {
    return <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading your next challenge…</div>
  }

  if (state.status === "error") {
    return <ErrorNotice error={state.error} />
  }

  const { dto } = state
  const componentKey = dto.componentKey

  if (!isWorkstationReady(componentKey)) {
    return <NotIntegratedNotice componentKey={componentKey} />
  }

  const WorkstationComponent = loadWorkstationComponent(componentKey)
  if (!WorkstationComponent) {
    return <NotIntegratedNotice componentKey={componentKey} />
  }

  return (
    <div>
      <Suspense fallback={<div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>Loading workstation…</div>}>
        <WorkstationComponent
          challengeInstanceId={dto.challengeInstanceId}
          skill={dto.skill}
          difficulty={dto.difficulty}
          payload={dto.payload}
          uiModules={dto.uiModules}
          artifactType={dto.artifactType}
          submissionRules={dto.submissionRules}
          assessmentRules={dto.assessmentRules}
          rewardRules={dto.rewardRules}
          portfolioDecision={dto.portfolioDecision}
          resumed={dto.resumed}
          onSubmit={handleSubmit}
          isSubmitting={submissionState.status === "submitting"}
        />
      </Suspense>
      <FeedbackPanel submissionState={submissionState} onDismiss={dismissFeedback} />
    </div>
  )
}
