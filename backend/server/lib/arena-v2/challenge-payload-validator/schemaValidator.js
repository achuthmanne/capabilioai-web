/**
 * challenge-payload-validator/schemaValidator.js — Milestone 4
 * ---------------------------------------------------------------------------
 * Gate 1 of 2 (content_spec/08's "Challenge Payload Validator gate"): the
 * schema-shape check. Pure function, no I/O — reuses the same enums Milestone
 * 2's `challenge-library/validators.js` already exports (WORKSTATION_IDS,
 * VALIDATOR_TYPES, DIFFICULTY_TIERS, CHALLENGE_TYPES, ARTIFACT_TYPES) rather
 * than redeclaring them, so "valid" means the same thing at authoring time
 * and at issue time — one definition, not two that can drift apart.
 *
 * This re-checks the payload independently of whatever produced it. Even
 * though today's only producer is our own Challenge Engine (Milestone 3),
 * the whole point of a first-class Validator step (blueprint §0/§1) is that
 * it doesn't trust its callers — a future second producer (an admin "issue a
 * test challenge" tool, a migration script backfilling instances, etc.)
 * gets the exact same gate.
 */
import {
  WORKSTATION_IDS,
  VALIDATOR_TYPES,
  DIFFICULTY_TIERS,
  CHALLENGE_TYPES,
} from "../challenge-library/validators.js"

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0
const isPlainObject    = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

/**
 * Returns { valid: boolean, issues: string[] }. Never throws — the whole
 * point of this module is to produce a rejection *reason*, not an exception,
 * since a rejection is an expected, loggable outcome (av2_challenge_payload_
 * rejections), not a bug.
 */
export function validatePayloadShape(payload) {
  const issues = []

  if (!isPlainObject(payload)) {
    return { valid: false, issues: ["payload must be an object"] }
  }

  if (!isNonEmptyString(payload.challengeInstanceId)) issues.push("challengeInstanceId is required")
  if (!CHALLENGE_TYPES.includes(payload.challengeType)) issues.push(`challengeType must be one of ${CHALLENGE_TYPES.join(", ")}`)
  if (!isNonEmptyString(payload.careerFamily)) issues.push("careerFamily is required")

  if (payload.challengeType === "domain" && !isNonEmptyString(payload.role)) {
    issues.push("role is required for domain challenges")
  }

  if (!isNonEmptyString(payload.challengeTemplateId)) issues.push("challengeTemplateId is required")
  if (!isNonEmptyString(payload.challengeTemplateVersion)) issues.push("challengeTemplateVersion is required")

  if (!DIFFICULTY_TIERS.includes(payload.difficulty)) issues.push(`difficulty must be one of ${DIFFICULTY_TIERS.join(", ")}`)
  if (!isNonEmptyString(payload.skill)) issues.push("skill is required")

  if (!WORKSTATION_IDS.includes(payload.workstation)) issues.push(`unknown workstation id "${payload.workstation}"`)
  if (!isNonEmptyString(payload.workstationVersion)) issues.push("workstationVersion is required")

  // The hard gate the blueprint has called out since round 1: missing/invalid
  // payload, validator, or rewardRules must never reach the Workstation Router.
  if (!isPlainObject(payload.payload) || Object.keys(payload.payload).length === 0) {
    issues.push("payload.payload (workstation-specific content) is missing or empty")
  }

  if (!isPlainObject(payload.validator) || !isNonEmptyString(payload.validator.type) || !isNonEmptyString(payload.validator.version)) {
    issues.push("payload.validator must be { type, version, config } with type/version set")
  } else if (!VALIDATOR_TYPES.includes(payload.validator.type)) {
    issues.push(`unknown validator type "${payload.validator.type}"`)
  }

  if (!isPlainObject(payload.rewardRules)) {
    issues.push("payload.rewardRules is required")
  } else {
    if (!isPlainObject(payload.rewardRules.common) || payload.rewardRules.common.elo !== false) {
      issues.push("rewardRules.common.elo must be false — Common Challenges never award ELO (frozen ELO/XP split)")
    }
    if (!isPlainObject(payload.rewardRules.domain) || payload.rewardRules.domain.elo !== true) {
      issues.push("rewardRules.domain.elo must be true — Domain Challenges always award ELO (frozen ELO/XP split)")
    }
  }

  if (!isPlainObject(payload.portfolioDecision)) {
    issues.push("payload.portfolioDecision is required (even if recruiterEvidence is still null pre-assessment)")
  }

  return { valid: issues.length === 0, issues }
}
