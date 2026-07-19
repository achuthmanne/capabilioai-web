/**
 * challenge-delivery/service.js — Milestone 6
 * ---------------------------------------------------------------------------
 * The integration milestone: turns five already-built, already-tested
 * backend modules into one consumable operation.
 *
 *   getActiveInstanceForUser (this milestone)
 *          │ found + not expired → reuse
 *          │ found + expired     → mark expired, fall through
 *          │ not found           → fall through
 *          ▼
 *   selectAndGenerateChallenge   (Milestone 3 — Challenge Engine)
 *          ▼
 *   validateAndIssue             (Milestone 4 — Payload Validator, persists)
 *          ▼
 *   routeToWorkstation            (Milestone 5 — Workstation Router)
 *          ▼
 *   { instance, routing, resumed }
 *
 * This file adds ZERO new business logic beyond "resume vs. issue" — every
 * decision about skill/difficulty/template/scenario selection, schema/
 * capability validation, and workstation lookup still belongs entirely to
 * Milestones 3-5. Dependency-injected, same pattern as every prior milestone.
 */
import { selectAndGenerateChallenge, defaultDeps as engineDefaultDeps } from "../challenge-engine/engine.js"
import { validateAndIssue, defaultDeps as validatorDefaultDeps } from "../challenge-payload-validator/validator.js"
import { routeToWorkstation } from "../workstation-router/router.js"
import { isInstanceExpired } from "./expiry.js"
import * as repo from "./repository.js"

export const defaultDeps = {
  getActiveInstanceForUser: repo.getActiveInstanceForUser,
  markInstanceExpired: repo.markInstanceExpired,
  selectAndGenerateChallenge,
  engineDeps: engineDefaultDeps,
  validateAndIssue,
  validatorDeps: validatorDefaultDeps,
  routeToWorkstation,
}

export async function getOrIssueChallenge(input, deps = defaultDeps) {
  const { userId, challengeType, role = null } = input
  if (!userId) throw new Error("getOrIssueChallenge: userId is required")
  if (!["common", "domain"].includes(challengeType)) throw new Error("getOrIssueChallenge: challengeType must be 'common' or 'domain'")

  const existing = await deps.getActiveInstanceForUser(userId, { challengeType, role })

  if (existing) {
    if (!isInstanceExpired(existing)) {
      const routing = deps.routeToWorkstation(existing)
      return { instance: existing, routing, resumed: true }
    }
    await deps.markInstanceExpired(existing.id)
    // fall through — issue a fresh one below
  }

  const { payload } = await deps.selectAndGenerateChallenge(input, deps.engineDeps)
  const instance = await deps.validateAndIssue(payload, { userId }, deps.validatorDeps)
  const routing = deps.routeToWorkstation(instance)

  return { instance, routing, resumed: false }
}
