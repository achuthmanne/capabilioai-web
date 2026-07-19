/**
 * challenge-payload-validator/validator.js — Milestone 4
 * ---------------------------------------------------------------------------
 * The first-class Challenge Payload Validator step (blueprint §0/§1/§1.1),
 * sitting between Challenge Engine (Milestone 3) and Workstation Router
 * (Milestone 5, not built yet). This completes the front half of the
 * pipeline: Challenge Library -> Challenge Engine -> Challenge Payload ->
 * Challenge Payload Validator -> Challenge Instance.
 *
 * Two independent gates, run in order (schema first — no point checking
 * Capability Registry against a structurally broken payload):
 *   1. Schema-shape gate  (schemaValidator.js)
 *   2. Capability Registry gate (capabilityValidator.js)
 *
 * On rejection: logs to av2_challenge_payload_rejections with the failing
 * gate name (so schema bugs and Capability Registry gaps are diagnosable
 * separately, per content_spec/09-analytics.md), emits an analytics event,
 * and throws PayloadRejectedError — never returns a half-issued instance.
 *
 * On success: persists the payload as an av2_challenge_instances row
 * (status='issued') via Milestone 3's insertChallengeInstance, emits a
 * 'validator_passed' analytics event, and returns the instance row.
 *
 * Dependency-injected, same pattern as engine.js — `deps` defaults to the
 * real Supabase-backed repository, fully fakeable in tests.
 */
import { validatePayloadShape } from "./schemaValidator.js"
import { validateCapabilityRegistry } from "./capabilityValidator.js"
import * as repo from "./repository.js"

export class PayloadRejectedError extends Error {
  constructor(gate, issues) {
    super(`Challenge payload rejected at ${gate} gate: ${issues.join("; ")}`)
    this.name = "PayloadRejectedError"
    this.gate = gate
    this.issues = issues
  }
}

export const defaultDeps = {
  getRoleCapabilities: repo.getRoleCapabilities,
  insertChallengeInstance: repo.insertChallengeInstance,
  logRejection: repo.logRejection,
  emitAnalyticsEvent: repo.emitAnalyticsEvent,
}

export async function validateAndIssue(payload, { userId }, deps = defaultDeps) {
  if (!userId) throw new Error("validateAndIssue: userId is required")

  // ── Gate 1: schema shape ────────────────────────────────────────────────
  const schemaResult = validatePayloadShape(payload)
  if (!schemaResult.valid) {
    await repo_log(deps, {
      attemptedRole: payload?.role,
      gate: "schema_shape",
      reason: schemaResult.issues.join("; "),
      payload,
      userId,
      eventType: "validator_rejected",
      eventData: { gate: "schema_shape", issues: schemaResult.issues },
    })
    throw new PayloadRejectedError("schema_shape", schemaResult.issues)
  }

  // ── Gate 2: Capability Registry (Domain Challenges only — no-op pass for
  //    Common, per capabilityValidator.js's header note) ───────────────────
  let roleCapabilitiesRow = null
  if (payload.challengeType === "domain") {
    roleCapabilitiesRow = await deps.getRoleCapabilities(payload.role, payload.careerFamily)
  }
  const capabilityResult = validateCapabilityRegistry(payload, roleCapabilitiesRow)
  if (!capabilityResult.valid) {
    await repo_log(deps, {
      attemptedRole: payload.role,
      gate: "capability_registry",
      reason: capabilityResult.issues.join("; "),
      payload,
      userId,
      eventType: "validator_rejected",
      eventData: { gate: "capability_registry", issues: capabilityResult.issues },
    })
    throw new PayloadRejectedError("capability_registry", capabilityResult.issues)
  }

  // ── Both gates passed — issue the instance ───────────────────────────────
  const instance = await deps.insertChallengeInstance(payload, userId)
  await deps.emitAnalyticsEvent({
    userId,
    instanceId: instance.id,
    eventType: "validator_passed",
    eventData: { challengeType: payload.challengeType, role: payload.role, skill: payload.skill },
  })

  return instance
}

// Small helper so both rejection branches above stay identical — log then
// emit, in that order, and never let a logging failure mask the original
// rejection (if logging itself throws, the PayloadRejectedError still wins
// since this is awaited before the throw, not wrapped in a way that swallows it).
async function repo_log(deps, { attemptedRole, gate, reason, payload, userId, eventType, eventData }) {
  await deps.logRejection({ attemptedRole, gate, reason, payload })
  await deps.emitAnalyticsEvent({ userId, instanceId: null, eventType, eventData })
}
