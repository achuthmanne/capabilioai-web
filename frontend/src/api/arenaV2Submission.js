// arenaV2Submission.js — Arena V2, Milestone 8: Submission Client
// ---------------------------------------------------------------------------
// The ONLY frontend module allowed to call the Submission API
// (POST /api/av2/submissions, backend Milestone 8). Per your instruction:
//
//   SqlWorkstation -> ChallengeShell -> Submission Client -> Submission API
//
// Individual workstation components must NEVER import this file or call the
// Submission API directly — only ArenaV2ChallengeShell.jsx does, via the
// `onSubmit` callback it hands down to whichever workstation is mounted.
// This keeps auth, retries, loading states, and error handling centralized
// in exactly one place rather than duplicated across every workstation, the
// same way arenaV2Delivery.js is the sole caller of the Delivery API.
//
// Shares its fetch/auth/timeout plumbing with arenaV2Delivery.js via
// arenaV2Client.js (Milestone 8 extraction) rather than re-implementing it.
import { requestJson } from "./arenaV2Client.js"
import { assertSchemaVersion, EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION } from "./schemaVersion.js"

export { EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION, SchemaVersionMismatchError } from "./schemaVersion.js"

/**
 * Submits an attempt for an already-issued challenge instance and returns
 * the graded Feedback DTO. Grading happens synchronously on the backend in
 * this milestone (no polling needed) — see backend's submission-engine/
 * service.js header for why.
 *
 * @param {{ challengeInstanceId: string, submissionData: object, startedAt?: string }} args
 *   `startedAt` (the DTO's `startedAt` from the issued challenge) is used to
 *   compute `timeTakenSecs` here, in the one centralized place, so no
 *   workstation has to track its own timing.
 */
export async function submitChallenge({ challengeInstanceId, submissionData, startedAt = null }) {
  const timeTakenSecs = startedAt
    ? Math.max(0, Math.round((Date.now() - new Date(startedAt).getTime()) / 1000))
    : null

  const dto = await requestJson("/api/av2/submissions", {
    method: "POST",
    body: { instanceId: challengeInstanceId, submissionData, timeTakenSecs },
    timeoutMs: 30000, // grading can involve real SQL execution server-side — a little more headroom than the Delivery API's default
  })
  return assertSchemaVersion(dto, EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION)
}
