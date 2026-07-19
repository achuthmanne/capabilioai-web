/**
 * submission-engine/service.js — Milestones 8, 9 & 10
 * ---------------------------------------------------------------------------
 * The integration point for the return path, mirroring challenge-delivery/
 * service.js's role on the issuance side. Turns already-built,
 * already-tested modules into one consumable operation:
 *
 *   getInstanceForSubmission   (Milestone 8 — ownership-scoped lookup)
 *          │ not found → InstanceNotFoundError
 *          ▼
 *   checkSubmissionAllowed      (rules.js — status/attempts/timing gate)
 *          │ not allowed → SubmissionNotAllowedError
 *          ▼
 *   insertSubmission (status='running')
 *          ▼
 *   runValidator                (submission-validators/registry.js)
 *          │ NotImplementedValidatorError → propagates (a real gap, not swallowed)
 *          ▼
 *   updateSubmissionResult (status='validated' | 'failed_to_validate')
 *          ▼
 *   assembleAssessment          (assessment/engine.js — persists av2_assessments)
 *          ▼
 *   createAssessmentCompletedEvent (events/assessmentCompletedEvent.js, pre-Milestone 10)
 *          ▼
 *   applyRewards                (reward-engine/engine.js, Milestone 9 — ELO/XP/Skill Progress)
 *          ▼
 *   recordPortfolioOutcome      (portfolio/engine.js, Milestone 10 — Portfolio Decision/Artifact)
 *          ▼
 *   markInstanceStatus('graded')
 *          ▼
 *   buildFeedbackResponseDto    (dto.js)
 *
 * MILESTONE 9/10 BOUNDARY, deliberately preserved here rather than blurred:
 * Reward Engine and Portfolio Engine are both independent consumers of the
 * SAME AssessmentCompletedEvent — this file constructs it once, right after
 * Assessment completes, and hands the identical object to both. Neither
 * engine calls the other; Reward Engine does not decide portfolio
 * publication, and Portfolio Decision does not compute ELO/XP. If a future
 * consumer (Analytics, Notifications, Certificates, Recruiter feeds) needs
 * the same "assessment completed" moment, it takes the same event object —
 * this file's call sites don't change to accommodate it.
 *
 * This file adds zero new grading, reward, OR portfolio logic of its own —
 * every decision about whether a submission is allowed, how it's graded,
 * how it's scored, how ELO/XP/skill progress are computed, and whether a
 * portfolio artifact is created still belongs entirely to rules.js /
 * submission-validators / assessment / reward-engine / portfolio.
 * Dependency-injected, same pattern as every prior milestone.
 */
import * as repo from "./repository.js"
import { checkSubmissionAllowed, SubmissionNotAllowedError } from "./rules.js"
import { runValidator } from "../submission-validators/registry.js"
import { createValidatorResult } from "../submission-validators/validatorResult.js"
import { assembleAssessment, defaultDeps as assessmentDefaultDeps } from "../assessment/engine.js"
import { applyRewards, defaultDeps as rewardEngineDefaultDeps } from "../reward-engine/engine.js"
import { createAssessmentCompletedEvent } from "../events/assessmentCompletedEvent.js"
import { recordPortfolioOutcome, defaultDeps as portfolioDefaultDeps } from "../portfolio/engine.js"
import { buildFeedbackResponseDto } from "./dto.js"

export class SubmissionEngineError extends Error {}
export class InstanceNotFoundError extends SubmissionEngineError {}

export const defaultDeps = {
  getInstanceForSubmission: repo.getInstanceForSubmission,
  getAttemptCount: repo.getAttemptCount,
  insertSubmission: repo.insertSubmission,
  updateSubmissionResult: repo.updateSubmissionResult,
  markInstanceStatus: repo.markInstanceStatus,
  runValidator,
  assembleAssessment,
  assessmentDeps: assessmentDefaultDeps,
  applyRewards,
  rewardEngineDeps: rewardEngineDefaultDeps,
  recordPortfolioOutcome,
  portfolioDeps: portfolioDefaultDeps,
}

/**
 * @param {{ userId: string, instanceId: string, submissionData: object,
 *           timeTakenSecs?: number }} input
 * @param {object} deps
 * @returns {Promise<object>} the Feedback DTO
 */
export async function submitChallenge(input, deps = defaultDeps) {
  const { userId, instanceId, submissionData, timeTakenSecs = null } = input
  if (!userId) throw new SubmissionEngineError("submitChallenge: userId is required")
  if (!instanceId) throw new SubmissionEngineError("submitChallenge: instanceId is required")

  const instance = await deps.getInstanceForSubmission(instanceId, userId)
  if (!instance) throw new InstanceNotFoundError("No such challenge instance for this user")

  const attemptCount = await deps.getAttemptCount(instanceId)
  const check = checkSubmissionAllowed({ instance, attemptCount, timeTakenSecs })
  if (!check.allowed) throw new SubmissionNotAllowedError(check.reason)

  const submission = await deps.insertSubmission({
    instanceId,
    userId,
    attemptNumber: attemptCount + 1,
    submissionData,
    isTimedOut: check.isTimedOut,
    timeTakenSecs,
  })

  // This milestone grades synchronously (no queue/worker) — the intermediate
  // 'submitted' status exists in the schema for a future async grading path
  // (see docs/future-improvements.md) but isn't used as a distinct step here;
  // the instance goes straight from its current status to either
  // 'in_progress' (retries remain) or 'graded' (done) once Assessment
  // completes, below.

  let validatorResult
  let updatedSubmission
  try {
    validatorResult = await deps.runValidator({
      validatorConfig: instance.validator,
      submissionData,
      context: { datasetSeedSql: instance.payload?.datasetSeedSql },
    })
    updatedSubmission = await deps.updateSubmissionResult(submission.id, {
      status: "validated",
      validatorResult,
    })
  } catch (err) {
    // The validator itself failed to run (content bug, e.g. a broken
    // groundTruthQuery, or an unimplemented type) — record that plainly
    // rather than pretending the student was graded, then re-throw so the
    // route layer returns a real error instead of a fabricated result.
    // Uses the same canonical ValidatorResult shape every real validator
    // produces (validatorResult.js) — even this failure-fallback stays
    // consistent, since it's stored in the exact same validator_result
    // column a real grading run would populate.
    await deps.updateSubmissionResult(submission.id, {
      status: "failed_to_validate",
      validatorResult: createValidatorResult({
        passed: false,
        score: 0,
        diagnostics: [`Grading could not run: ${err.message}`],
        metadata: { crashed: true },
      }),
    })
    throw err
  }

  const assessment = await deps.assembleAssessment(
    { submission: updatedSubmission, instance, validatorResult },
    deps.assessmentDeps
  )

  // Reward Engine receives ONLY { assessment, instance } — the same
  // boundary Assessment itself has, one level down. It never sees
  // validatorResult or submissionData, so it structurally cannot contain
  // any validator-specific logic. A reward-posting failure propagates
  // (fails loudly) rather than being swallowed — the assessment row is
  // already durably persisted at this point, which is a real, correct
  // grade; failing here surfaces a genuine data-integrity gap (graded but
  // unrewarded) rather than silently hiding it. See
  // docs/future-improvements.md for the retry/idempotency trade-off this
  // accepts.
  const rewardResult = await deps.applyRewards({ assessment, instance }, deps.rewardEngineDeps)

  // The single "assessment completed" event, built once, handed identically
  // to Portfolio Decision (and, in the future, any other consumer) — see
  // events/assessmentCompletedEvent.js's header for why this exists instead
  // of threading four separate parameters through every downstream call.
  const assessmentCompletedEvent = createAssessmentCompletedEvent({
    assessment, instance, submission: updatedSubmission, rewardResult,
  })

  // Portfolio Decision runs from the SAME event Reward Engine consumed, but
  // Portfolio Engine never calls Reward Engine and vice versa — each reads
  // what it needs from the event independently. A portfolio-recording
  // failure propagates for the same "fail loudly, don't hide a data gap"
  // reason as reward-posting failures do, above.
  const portfolioOutcome = await deps.recordPortfolioOutcome(assessmentCompletedEvent, deps.portfolioDeps)

  // Only close out the instance once there's genuinely nothing left to retry
  // — passed, or attempts exhausted. Marking it 'graded' unconditionally
  // would be a real retry-flow bug: 'graded' is a terminal status that
  // rules.js's checkSubmissionAllowed rejects future submissions against, so
  // a student on attempt 1 of an allowed 3 would be locked out of attempts
  // 2 and 3 even though they still had retries left.
  const maxAttempts = instance.submission_rules?.maxAttempts
  const attemptsExhausted = typeof maxAttempts === "number" && submission.attempt_number >= maxAttempts
  const nextInstanceStatus = validatorResult.passed || attemptsExhausted ? "graded" : "in_progress"
  await deps.markInstanceStatus(instanceId, nextInstanceStatus)

  return buildFeedbackResponseDto({ submission: updatedSubmission, assessment, rewardResult, portfolioOutcome })
}
