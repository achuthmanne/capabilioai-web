// arenaV2Delivery.js — Arena V2, Milestone 7: frontend API client for the
// Challenge Delivery API (backend Milestone 6).
// ---------------------------------------------------------------------------
// This is the ONLY file the rest of the Arena V2 frontend should import to
// talk to the Delivery API. Every component downstream (ArenaV2ChallengeShell,
// workstations) works with the DTO this file returns — never with raw fetch
// calls, never with backend-internal concepts (Challenge Engine, Payload
// Validator, repository layer). That boundary is deliberate, per the
// "keep the frontend unaware of internal engine concepts" instruction.
//
// Milestone 8 update: requestJson/authHeaders moved to the shared
// arenaV2Client.js (a second client, arenaV2Submission.js, needed the exact
// same logic — see that file's header). This file's own exports
// (fetchNextChallenge, fetchActiveChallenge, EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION,
// SchemaVersionMismatchError) are unchanged.
import { requestJson } from "./arenaV2Client.js"
import { assertSchemaVersion } from "./schemaVersion.js"

export { EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION, SchemaVersionMismatchError } from "./schemaVersion.js"

/**
 * Issues the next challenge (or resumes an existing active one — the backend
 * decides which, per Milestone 6's resume-or-issue semantics; the frontend
 * doesn't need to know or care which happened beyond the `resumed` flag).
 */
export async function fetchNextChallenge({ challengeType, role = null, industry = null, skill = null, difficulty = null, scenarioId = null }) {
  const dto = await requestJson("/api/av2/challenges/next", {
    method: "POST",
    body: { challengeType, role, industry, skill, difficulty, scenarioId },
  })
  return assertSchemaVersion(dto)
}

/**
 * Peeks for an existing active instance without issuing a new one. Returns
 * null if there isn't one (a 404 from the backend) — this is a normal,
 * expected outcome for a student who has no in-progress challenge, not an error.
 */
export async function fetchActiveChallenge({ challengeType, role = null }) {
  const params = new URLSearchParams({ challengeType })
  if (role) params.set("role", role)
  const dto = await requestJson(`/api/av2/challenges/active?${params.toString()}`)
  return dto ? assertSchemaVersion(dto) : null
}
