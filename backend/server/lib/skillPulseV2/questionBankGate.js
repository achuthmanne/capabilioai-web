/**
 * questionBankGate.js — Career OS Workstream 3, Part A: the coverage gate
 * that decides whether a user gets the 15-question v2 flow or the existing
 * 5-question v1 flow. Pure — takes counts, returns a decision; the caller
 * is responsible for actually counting approved rows in `question_bank`.
 *
 * Fixed domain taxonomy (matches the CHECK constraint on question_bank.domain
 * — see career_os_ws3_skill_pulse_v2_question_bank_migration.sql). This is a
 * deliberate substitute for user_skills.domain, which is free-text and 100%
 * null in production today (see docs/career-os-implementation-plan.md §5d) —
 * there is no real per-user domain taxonomy to gate against, so the release
 * gate is computed against this fixed list instead.
 */

export const TOP_10_DOMAINS = Object.freeze([
  "software_engineering",
  "data_analytics",
  "product_management",
  "design_ux",
  "sales",
  "marketing",
  "finance_accounting",
  "operations_supply_chain",
  "hr_people",
  "customer_success",
])

export const MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN = 30

/**
 * Global release gate: v2 may be turned on for anyone only once every one
 * of the top 10 domains has at least MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN
 * approved questions. This is intentionally strict/global — it's the
 * master switch, not a per-user check (that's `hasSufficientCoverageForUser`
 * below, which is what actually decides an individual pulse's flow version).
 *
 * @param {Record<string, number>} approvedCountsByDomain
 */
export function checkGlobalCoverageGate(approvedCountsByDomain) {
  const perDomain = TOP_10_DOMAINS.map(domain => {
    const count = approvedCountsByDomain?.[domain] || 0
    return { domain, count, meets: count >= MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN }
  })
  return {
    eligible: perDomain.every(d => d.meets),
    minimumRequired: MINIMUM_APPROVED_QUESTIONS_PER_DOMAIN,
    perDomain,
  }
}

/**
 * Per-user check: even if the global gate is open, an individual user only
 * gets v2 if there's enough approved coverage across the specific domains
 * relevant to THEM (their skills' domains + any target-role-gap domains).
 * This is what actually runs at request time — the global gate is a release
 * precondition, this is the per-pulse decision.
 *
 * @param {string[]} relevantDomains — domains touching this user's skills/target role
 * @param {Record<string, number>} approvedCountsByDomain
 * @param {number} [minimumTotalQuestions] — how many approved questions must
 *   exist across the relevant domains combined to safely build a 15-question,
 *   max-3-per-skill, anti-repeat-respecting set. Default is deliberately
 *   generous (45 = 15 questions x 3, giving real headroom over the anti-repeat
 *   and max-per-skill constraints) rather than the bare minimum of 15.
 */
export function hasSufficientCoverageForUser(relevantDomains, approvedCountsByDomain, minimumTotalQuestions = 45) {
  const domains = relevantDomains?.length ? relevantDomains : ["other"]
  const total = domains.reduce((sum, d) => sum + (approvedCountsByDomain?.[d] || 0), 0)
  return {
    sufficient: total >= minimumTotalQuestions,
    totalApproved: total,
    minimumRequired: minimumTotalQuestions,
    domainsChecked: domains,
  }
}

/**
 * Combined decision used by the route: v2 requires BOTH the global release
 * gate AND sufficient per-user coverage. Fails safe to v1 on any doubt.
 */
/**
 * Server-enforced validation gate a question must pass before it can move
 * from 'draft'/'in_review' to 'approved' (Part B — "server-enforced
 * workflow"). Missing/empty explanation, fewer than 2 options, or a
 * correct_option_id that doesn't match any option id are all hard blockers —
 * an approver action calling this and getting `valid:false` must not be able
 * to set review_status='approved' regardless of what the request body says.
 */
export function validateQuestionForApproval(row) {
  const errors = []
  if (!row?.prompt?.trim()) errors.push("prompt is required")
  if (!Array.isArray(row?.options) || row.options.length < 2) errors.push("at least 2 options are required")
  const optionIds = new Set((row?.options || []).map(o => o?.id))
  if (!row?.correct_option_id || !optionIds.has(row.correct_option_id)) {
    errors.push("correct_option_id must match one of the provided options")
  }
  if (!row?.explanation?.trim()) errors.push("explanation is required for an approved question")
  if (!row?.domain) errors.push("domain is required")
  if (!Number.isInteger(row?.difficulty) || row.difficulty < 1 || row.difficulty > 5) {
    errors.push("difficulty must be an integer 1-5")
  }
  return { valid: errors.length === 0, errors }
}

export function decideFlowVersion({ v2FlagEnabled, approvedCountsByDomain, relevantDomains }) {
  if (!v2FlagEnabled) {
    return { flow_version: "v1", reason: "flag_off" }
  }
  const globalGate = checkGlobalCoverageGate(approvedCountsByDomain)
  if (!globalGate.eligible) {
    return { flow_version: "v1", reason: "global_coverage_gate_not_met", globalGate }
  }
  const userGate = hasSufficientCoverageForUser(relevantDomains, approvedCountsByDomain)
  if (!userGate.sufficient) {
    return { flow_version: "v1", reason: "insufficient_user_domain_coverage", globalGate, userGate }
  }
  return { flow_version: "v2", reason: "eligible", globalGate, userGate }
}
