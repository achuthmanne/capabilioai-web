/**
 * challenge-payload-validator/capabilityValidator.js — Milestone 4
 * ---------------------------------------------------------------------------
 * Gate 2 of 2: the Capability Registry check (blueprint §1.1). Pure function
 * — takes the payload and an already-fetched av2_role_capabilities row (or
 * null), returns { valid, issues }. Never fetches anything itself, so it's
 * testable with plain fixtures.
 *
 * Common Challenges are role-agnostic by design (content_spec/01 — role is
 * null on the payload), so this gate does not apply to them at all — only
 * Domain Challenges carry a role, and only roles carry a Capability Registry
 * entry. Calling this for a Common payload is a no-op pass, not a skipped
 * check — validator.js still calls it uniformly rather than branching on
 * challengeType, so there's exactly one path through the two gates.
 */
const isPlainObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

export function validateCapabilityRegistry(payload, roleCapabilitiesRow) {
  if (payload.challengeType === "common") {
    return { valid: true, issues: [] }
  }

  const issues = []

  if (!roleCapabilitiesRow) {
    return { valid: false, issues: [`no Capability Registry entry exists for role "${payload.role}" — nothing is authorized for this role yet`] }
  }

  if (!isPlainObject(roleCapabilitiesRow)) {
    return { valid: false, issues: ["Capability Registry entry is malformed"] }
  }

  const workstations = roleCapabilitiesRow.workstations || []
  const validators    = roleCapabilitiesRow.validators || []

  if (!workstations.includes(payload.workstation)) {
    issues.push(`workstation "${payload.workstation}" is not registered for role "${payload.role}" (registered: ${workstations.join(", ") || "none"})`)
  }
  if (!payload.validator || !validators.includes(payload.validator.type)) {
    issues.push(`validator type "${payload.validator?.type}" is not registered for role "${payload.role}" (registered: ${validators.join(", ") || "none"})`)
  }

  return { valid: issues.length === 0, issues }
}
