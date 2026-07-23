// schemaVersion.js — Arena V2, Milestones 7 & 8
// ---------------------------------------------------------------------------
// Deliberately isolated from arenaV2Delivery.js/arenaV2Submission.js: those
// files depend on Vite's `import.meta.env` and the Supabase client, neither
// of which exist under plain Node — so they can only be verified by Babel
// AST parse (no frontend test runner is installed in this project; same
// constraint noted when ArenaWorkstations.jsx was last edited). This file
// has zero such dependencies, so the one piece of real logic worth
// unit-testing — the schema-version guard — lives here where node:test can
// actually run it.
//
// Milestone 8 adds a second expected version constant for the Feedback DTO
// (backend submission-engine/dto.js's FEEDBACK_DTO_SCHEMA_VERSION) — same
// guard function, `assertSchemaVersion` already takes `expected` as a
// parameter, so no new logic is needed, just a second named constant so
// callers don't have to pass the literal string "v1" by hand.
export const EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION = "v1"
export const EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION = "v1"

export class SchemaVersionMismatchError extends Error {
  constructor(received, expected) {
    super(`Challenge Delivery API returned schemaVersion "${received}", frontend expects "${expected}". Refusing to render rather than risk mis-rendering an incompatible shape.`)
    this.name = "SchemaVersionMismatchError"
    this.received = received
    this.expected = expected
  }
}

export function assertSchemaVersion(dto, expected = EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION) {
  if (dto && dto.schemaVersion !== expected) {
    throw new SchemaVersionMismatchError(dto.schemaVersion, expected)
  }
  return dto
}
