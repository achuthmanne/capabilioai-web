/**
 * submission-validators/registry.js — Milestone 8, normalized pre-M9
 * ---------------------------------------------------------------------------
 * The Validator stage of the return pipeline (Submission -> Submission
 * Engine -> Validator -> Assessment). Maps a validator `type` (one of the 11
 * enum values frozen in challenge-library/validators.js's VALIDATOR_TYPES,
 * cross-referenced against 05-validators.md) to a real grading implementation.
 *
 * TIMING, STAMPED HERE ONCE FOR EVERY VALIDATOR TYPE: `runValidator` wraps
 * whichever implementation runs and measures wall-clock duration itself,
 * then merges `timing.durationMs` onto whatever the implementation
 * returned. This means every validator type gets consistent, real timing
 * data for free — an implementation never has to remember to time itself,
 * and Assessment/Reward Engine can rely on `timing.durationMs` always being
 * present regardless of which validator produced the result. An
 * implementation MAY still report its own finer-grained timing under this
 * key; this wrapper only fills in the total wall-clock figure alongside it.
 *
 * SCOPE, mirroring Milestone 7's own honest-placeholder discipline: only
 * `ground_truth_compare` has a real implementation in this milestone,
 * because it's the only validator type any wired-up workstation (SqlWorkstation,
 * Milestone 7) actually needs. The other 10 throw NotImplementedValidatorError
 * — an explicit, typed, loggable failure — rather than a fake "always
 * passes" stub. A fake stub would be worse than no implementation: it would
 * silently hand out full credit for challenges nothing has actually graded,
 * which is a scoring-integrity bug, not a shortcut. As each additional
 * workstation gets built (Milestone 7's remaining 12), add its validator
 * implementation here the same way ground_truth_compare was added, and
 * remove it from the "not implemented" set below — building it with
 * `createValidatorResult` (validatorResult.js) so every validator type
 * keeps producing the same normalized shape Assessment consumes.
 */
import { runGroundTruthCompare } from "./groundTruthCompare.js"

export class NotImplementedValidatorError extends Error {
  constructor(type) {
    super(`No submission-validator implementation exists yet for validator type "${type}" — this workstation's grading isn't wired up in Milestone 8.`)
    this.name = "NotImplementedValidatorError"
    this.type = type
  }
}

const VALIDATOR_IMPLEMENTATIONS = {
  ground_truth_compare: runGroundTruthCompare,
}

/**
 * @param {{ validatorConfig: { type: string, version: string, config: object },
 *           submissionData: object, context: object }} args
 * @returns {Promise<object>} a ValidatorResult (validatorResult.js), with
 *          `timing.durationMs` always present regardless of the implementation
 */
export async function runValidator({ validatorConfig, submissionData, context }) {
  const type = validatorConfig?.type
  const impl = VALIDATOR_IMPLEMENTATIONS[type]
  if (!impl) throw new NotImplementedValidatorError(type)

  const startedAt = new Date().toISOString()
  const t0 = performance.now()
  const result = await impl(validatorConfig.config, submissionData, context)
  const durationMs = Math.round(performance.now() - t0)

  return { ...result, timing: { ...result.timing, startedAt, durationMs } }
}

export function isValidatorImplemented(type) {
  return type in VALIDATOR_IMPLEMENTATIONS
}
