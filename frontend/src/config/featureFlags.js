/**
 * featureFlags.js — Career OS rollout flags (Workstream 0)
 *
 * Every new Career OS surface ships behind a flag so it can be turned off
 * instantly (no destructive DB rollback, no redeploy) if it regresses
 * something live. Flags read from Vite env vars first (so ops can flip them
 * per-environment without a code change), falling back to the default below.
 *
 * To disable a flag in an environment, set the matching env var to "false"
 * in Vercel/`.env` — e.g. VITE_FF_CAREER_OS_COMPANY=false.
 *
 * See docs/career-os-implementation-plan.md for what each flag gates and
 * which workstream turns it on for the first time.
 */

function envFlag(name, fallback) {
  const raw = import.meta.env[`VITE_FF_${name}`]
  if (raw === undefined || raw === "") return fallback
  return raw === "true" || raw === "1"
}

// Defaults reflect actual implementation status as of this workstream.
// Flip a default to true only in the same PR that finishes its workstream.
export const FLAGS = {
  // Workstream 0 — nav split (Career + Skills back to top-level, local tab
  // state fix). Real, implemented, on by default.
  career_os_nav: envFlag("CAREER_OS_NAV", true),

  // Workstream 1 — Home command-center sections (Promotion Readiness, Salary
  // Position, Company Status, Mentor Area, etc.). Off until built.
  career_os_home: envFlag("CAREER_OS_HOME", false),

  // Workstream 5 — Company module. Off until real company-link data model +
  // routes exist; keeps the nav item hidden rather than shipping a dead page.
  career_os_company: envFlag("CAREER_OS_COMPANY", false),

  // Workstream 6 — Anonymous company reviews. Off until the k-anonymity
  // aggregate views and eligibility jobs are built and tested.
  career_os_company_reviews: envFlag("CAREER_OS_COMPANY_REVIEWS", false),

  // Workstream 4 — Mentor marketplace. Off until mentor_profiles/bookings/
  // payouts tables + Razorpay Route payout flow are built (current
  // mentorHub.js references these tables but they don't exist yet in
  // Supabase — see audit in docs/career-os-implementation-plan.md).
  career_os_mentor_marketplace: envFlag("CAREER_OS_MENTOR_MARKETPLACE", false),

  // Workstream 2 (Career Replay) — premium visual career timeline. Off until built.
  career_os_career_replay: envFlag("CAREER_OS_CAREER_REPLAY", false),

  // Workstream 3 — Weekly Skill Pulse V2 (15 questions, reviewed question
  // bank). Off until the question_bank table has approved coverage; current
  // 5-question weeklyPulse.js keeps running unaffected either way.
  career_os_skill_pulse_v2: envFlag("CAREER_OS_SKILL_PULSE_V2", false),
}

export function isEnabled(flag) {
  return !!FLAGS[flag]
}
