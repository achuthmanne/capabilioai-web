/**
 * workstation-router/router.js — Milestone 5
 * ---------------------------------------------------------------------------
 * "Boring on purpose" (your instruction, verbatim). This module does exactly
 * one thing: payload.workstation -> routing descriptor. No AI, no business
 * logic, no difficulty logic, no capability logic, no progression logic.
 *
 * HARD RULE, enforced by construction rather than just by convention: this
 * function's implementation touches only `payload.workstation` and
 * `payload.payload`. It never reads `payload.role`, `payload.challengeType`,
 * `payload.difficulty`, `payload.industry`, or anything else career-shaped —
 * there is no `if role === ...` anywhere in this file, and there never
 * should be. router.test.js includes a test that proves this empirically:
 * two payloads with the same workstation but different roles/challengeTypes
 * must produce byte-identical routing output.
 *
 * Input is assumed to already be a validated instance (post Milestone 4's
 * Payload Validator) — `payload.workstation` is guaranteed to be one of
 * WORKSTATION_IDS by that point. This function re-checks anyway (never trust
 * upstream blindly, same principle schemaValidator.js's header states) and
 * throws a clearly-typed error rather than silently returning undefined.
 */
import { WORKSTATION_REGISTRY } from "./registry.js"

export class UnknownWorkstationError extends Error {
  constructor(workstation) {
    super(`No Workstation Router entry for workstation "${workstation}"`)
    this.name = "UnknownWorkstationError"
    this.workstation = workstation
  }
}

export function routeToWorkstation(payload) {
  const workstation = payload?.workstation
  const entry = WORKSTATION_REGISTRY[workstation]

  if (!entry) {
    throw new UnknownWorkstationError(workstation)
  }

  return {
    workstation,
    componentKey: entry.componentKey,
    uiModules: entry.uiModules,
    artifactType: entry.artifactType,
    // The workstation-specific content the component actually renders —
    // passed through untouched, never inspected or branched on here.
    payload: payload.payload,
  }
}
