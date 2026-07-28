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
import ArenaV2WorkspaceShell from "./ArenaV2WorkspaceShell.jsx"

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
    // ML/AI Engineer pilot (Arena V2 pilot phase) — same explicit,
    // one-key-at-a-time wiring discipline as SqlWorkstation above, not a
    // role/career branch.
    if (componentKey === "NotebookWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/NotebookWorkstationV2.jsx"))
    }
    // Software Engineer, second role workspace — same wiring discipline.
    if (componentKey === "CodeWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/CodeWorkstationV2.jsx"))
    }
    // Cybersecurity / SOC Analyst, third role workspace — same wiring discipline.
    if (componentKey === "TerminalWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/TerminalWorkstationV2.jsx"))
    }
    // DevOps Engineer, fourth role workspace — same wiring discipline. Reuses
    // the "ApiWorkstation" componentKey (unused until now) for a cloud/infra
    // console; the componentKey is just a registry identifier, not a literal
    // claim about the UI, same as TerminalWorkstation above.
    if (componentKey === "ApiWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/DevOpsConsoleWorkstationV2.jsx"))
    }
    // Database Administrator, fifth role workspace — same wiring discipline.
    // Reuses the "DashboardWorkstation" componentKey (unused until now,
    // and a natural semantic fit since its backend uiModules already
    // include sql_editor) for a database operations lab.
    if (componentKey === "DashboardWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/DbaWorkstationV2.jsx"))
    }
    // Electronics Engineer (ECE), sixth role workspace — same wiring
    // discipline. Reuses the "EmbeddedWorkstation" componentKey (unused
    // until now, and a natural semantic fit — its backend uiModules already
    // include register_serial_panel) for an analog circuit lab.
    if (componentKey === "EmbeddedWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/EceWorkstationV2.jsx"))
    }
    // Electrical Engineer (EEE), seventh role workspace — same wiring
    // discipline. Reuses the "SystemDesignWorkstation" componentKey (unused
    // until now) for a power-systems/transient lab.
    if (componentKey === "SystemDesignWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/EeeWorkstationV2.jsx"))
    }
    // Structural / Civil Engineer, eighth role workspace — same wiring
    // discipline. Reuses the "ReportWorkstation" componentKey (unused until
    // now) for a beam-deflection engineering lab.
    if (componentKey === "ReportWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/StructuralWorkstationV2.jsx"))
    }
    // Mechanical Engineer, ninth role workspace — same wiring discipline.
    // Reuses the "ExcelWorkstation" componentKey (unused until now) for a
    // drivetrain speed/torque lab.
    if (componentKey === "ExcelWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/MechanicalWorkstationV2.jsx"))
    }
    // Bioprocess Engineer, tenth role workspace — same wiring discipline.
    // Reuses the "ReactFrontendWorkstation" componentKey (unused until now)
    // for a bioreactor culture/assay lab.
    if (componentKey === "ReactFrontendWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/BiotechWorkstationV2.jsx"))
    }
    // Medical Biotechnology Specialist, eleventh role workspace — same
    // wiring discipline. Reuses the "FullStackWorkstation" componentKey
    // (unused until now) for a clinical assay/ELISA lab.
    if (componentKey === "FullStackWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/MedicalBiotechWorkstationV2.jsx"))
    }
    // Clinical Laboratory Specialist, twelfth role workspace. All other
    // non-reserved componentKeys were already wired by phase eleven, so
    // this reuses "CalculatorWorkstation" — the one remaining key, whose
    // backend "Common Challenges only" note is a content-spec label, not
    // an enforced constraint (see ClinicalLabWorkstationV2.jsx header).
    if (componentKey === "CalculatorWorkstation" && entry?.status === "ready") {
      workstationComponentCache[componentKey] = lazy(() => import("./workstations/ClinicalLabWorkstationV2.jsx"))
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
 * @param {{ challengeType: 'common'|'domain', role?: string, careerFamily?: string,
 *           industry?: string, skill?: string, difficulty?: string, scenarioId?: string,
 *           userId?: string, onViewRecruiterEvidence?: (userId: string) => void,
 *           onGraded?: (feedback: object) => void }} props
 *   `onGraded` (additive, optional — every existing caller that omits it
 *   behaves exactly as before) fires once per successful graded submission,
 *   after the feedback state is already set. Kept for callers that still
 *   want their own hook into grading events; the shared
 *   ArenaV2WorkspaceShell no longer needs it to refresh its Career Skills
 *   radar (it refetches off the feedback object itself), so this is now
 *   optional plumbing rather than load-bearing.
 *
 *   `careerFamily`, `userId`, and `onViewRecruiterEvidence` are passed
 *   straight through to ArenaV2WorkspaceShell (bottom evidence area) — this
 *   component still never renders that chrome itself, just wires the DTO
 *   and submission lifecycle into whichever shell/workstation combo the
 *   backend decided on.
 */
export default function ArenaV2ChallengeShell({ challengeType, role = null, careerFamily = "IT", industry = null, skill = null, difficulty = null, scenarioId = null, userId = null, onViewRecruiterEvidence = null, onGraded = null }) {
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
      onGraded?.(feedback)
    } catch (error) {
      setSubmissionState({ status: "error", feedback: null, error })
    }
  }, [state, onGraded])

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
    <ArenaV2WorkspaceShell
      dto={dto}
      submissionState={submissionState}
      role={role}
      careerFamily={careerFamily}
      userId={userId}
      onViewRecruiterEvidence={onViewRecruiterEvidence}
    >
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
    </ArenaV2WorkspaceShell>
  )
}
