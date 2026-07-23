import { test } from "node:test"
import assert from "node:assert/strict"
import { assertSchemaVersion, SchemaVersionMismatchError, EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION, EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION } from "./schemaVersion.js"

test("assertSchemaVersion passes a matching version through unchanged", () => {
  const dto = { schemaVersion: "v1", foo: "bar" }
  assert.deepEqual(assertSchemaVersion(dto), dto)
})

test("assertSchemaVersion throws SchemaVersionMismatchError on a mismatched version", () => {
  assert.throws(() => assertSchemaVersion({ schemaVersion: "v2" }), SchemaVersionMismatchError)
})

test("assertSchemaVersion passes through null/undefined without throwing (caller handles absence separately)", () => {
  assert.equal(assertSchemaVersion(null), null)
  assert.equal(assertSchemaVersion(undefined), undefined)
})

test("EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION matches the backend's current CHALLENGE_DTO_SCHEMA_VERSION ('v1')", () => {
  // Kept as a literal string comparison (not a cross-package import) since
  // frontend and backend are separate bundling contexts here — this test is
  // the tripwire: bump both together, or this fails and tells you why.
  assert.equal(EXPECTED_CHALLENGE_DTO_SCHEMA_VERSION, "v1")
})

test("EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION matches the backend's current FEEDBACK_DTO_SCHEMA_VERSION ('v1')", () => {
  // Same tripwire pattern, for Milestone 8's Feedback DTO.
  assert.equal(EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION, "v1")
})

test("assertSchemaVersion works against a Feedback-DTO-shaped object using the feedback expected version", () => {
  const dto = { schemaVersion: "v1", submissionId: "s1", finalScore: 90 }
  assert.deepEqual(assertSchemaVersion(dto, EXPECTED_FEEDBACK_DTO_SCHEMA_VERSION), dto)
})
