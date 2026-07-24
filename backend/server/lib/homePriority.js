/**
 * homePriority.js — Career OS Workstream 1: server-side priority-ranking
 * service for Home's "Today's Priority" card.
 *
 * docs/career-os-implementation-plan.md §Workstream 1. Pure, dependency-free
 * scoring function so it's unit-testable without a DB (see homePriority.test.js)
 * — the route (backend/server/routes/homeV1.js) does the data fetching and
 * hands this function a plain `ctx` object.
 *
 * Priority order (per product decision, highest tier wins):
 *   1. required privacy/security actions
 *   2. time-sensitive opportunity actions
 *   3. weekly Skill Pulse due
 *   4. verification / profile-completeness gaps
 *   5. promotion or compensation actions
 *   6. mentor requests or sessions
 *   7. company review eligibility
 *
 * IMPORTANT: tiers 1, 2, 5, 6, 7 have no real, per-user backing data yet in
 * this codebase (no security-nudge tracking, no opportunity-matching engine,
 * no promotion-plan/compensation module, no mentor tables, no company-review
 * tables — see docs/career-os-implementation-plan.md §1.4/§3). This function
 * therefore only ever emits candidates for tier 3 and tier 4 today, plus an
 * activation candidate ahead of everything (nothing else can be computed
 * without a resume/timeline) and an honest "all caught up" fallback. Do NOT
 * add fabricated candidates for the unbuilt tiers — wire them in only once
 * their owning workstream ships real data (Workstream 2/4/5/6/7).
 */

// Each candidate: { tier, id, title, whyItMatters, expectedOutcome,
//                    estimatedMinutes, ctaLabel, ctaTarget: {page, tab?} }
export function computeTodayPriority(ctx) {
  const {
    hasResumeOrTimeline, // vaultFiles.length>0 || experiences.length>0
    weeklyPulseStatus,   // "due" | "in_progress" | "done" | "none" | "unknown"
    hasTargetRole,
    isEmploymentVerified,
    skillsCount,
    hasSummary,
  } = ctx

  const candidates = []

  // Activation gate — nothing below can be computed meaningfully without a
  // resume or at least one career entry, so this always wins if true.
  if (!hasResumeOrTimeline) {
    candidates.push({
      tier: 0,
      id: "activate_resume",
      title: "Upload your resume to activate your Career OS",
      whyItMatters: "Your resume seeds your career timeline, skill graph, and target role — nothing else on Home can be personalized without it.",
      expectedOutcome: "Timeline, skills, and target role auto-filled from your resume.",
      estimatedMinutes: 3,
      ctaLabel: "Upload resume",
      ctaTarget: { page: "aura", tab: "vault" },
    })
  }

  // Tier 3 — Weekly Skill Pulse due/in-progress (real: weekly_pulses table).
  if (weeklyPulseStatus === "due") {
    candidates.push({
      tier: 3,
      id: "weekly_pulse_due",
      title: "This week's Skill Pulse is ready",
      whyItMatters: "A few scenario questions keep your skill confidence signals current — skipped weeks make your skill graph go stale.",
      expectedOutcome: "Skill confidence refreshed for this week.",
      estimatedMinutes: 5,
      ctaLabel: "Start Skill Pulse",
      ctaTarget: { page: "weeklycheck" },
    })
  } else if (weeklyPulseStatus === "in_progress") {
    candidates.push({
      tier: 3,
      id: "weekly_pulse_resume",
      title: "Finish this week's Skill Pulse",
      whyItMatters: "You started this week's check-in — a couple of questions are left before it counts.",
      expectedOutcome: "Skill confidence refreshed for this week.",
      estimatedMinutes: 2,
      ctaLabel: "Continue Skill Pulse",
      ctaTarget: { page: "weeklycheck" },
    })
  }

  // Tier 4 — verification / profile-completeness gaps, ordered by impact.
  if (hasResumeOrTimeline && !isEmploymentVerified) {
    candidates.push({
      tier: 4,
      id: "verify_employment",
      title: "Verify your employment",
      whyItMatters: "Verified employment increases recruiter trust and unlocks accurate career-health signals.",
      expectedOutcome: "Your current role marked verified on your profile.",
      estimatedMinutes: 4,
      ctaLabel: "Verify now",
      ctaTarget: { page: "aura", tab: "vault" },
    })
  }
  if (hasResumeOrTimeline && !hasTargetRole) {
    candidates.push({
      tier: 4,
      id: "set_target_role",
      title: "Set your target role",
      whyItMatters: "Your target role drives skill-gap analysis, the weekly Skill Pulse question mix, and promotion readiness — without it those stay generic.",
      expectedOutcome: "Skill Pulse and skill gaps tuned to your target role.",
      estimatedMinutes: 1,
      ctaLabel: "Set target role",
      ctaTarget: { page: "orbit" },
    })
  }
  if (hasResumeOrTimeline && skillsCount === 0) {
    candidates.push({
      tier: 4,
      id: "add_skills",
      title: "Add your skills",
      whyItMatters: "Your skill graph is empty, so gap analysis and the weekly Skill Pulse have nothing real to work from yet.",
      expectedOutcome: "A populated skill graph with confidence tracking.",
      estimatedMinutes: 3,
      ctaLabel: "Add skills",
      ctaTarget: { page: "skills" },
    })
  }
  if (hasResumeOrTimeline && !hasSummary) {
    candidates.push({
      tier: 4,
      id: "add_summary",
      title: "Add a profile summary",
      whyItMatters: "A strong summary improves how recruiters and your public portfolio present your experience.",
      expectedOutcome: "A complete, recruiter-ready profile summary.",
      estimatedMinutes: 5,
      ctaLabel: "Add summary",
      ctaTarget: { page: "aura", tab: "vault" },
    })
  }

  if (candidates.length === 0) {
    // Honest positive state — never fabricate an action just to fill the slot.
    return {
      id: "all_caught_up",
      title: "You're all caught up",
      whyItMatters: "No pending actions right now — your profile, verification, and this week's Skill Pulse are current.",
      expectedOutcome: "Keep your skill graph fresh by checking in next week.",
      estimatedMinutes: 0,
      ctaLabel: "Review your skills",
      ctaTarget: { page: "skills" },
      insufficientData: false,
    }
  }

  candidates.sort((a, b) => a.tier - b.tier)
  const top = candidates[0]
  return {
    id: top.id,
    title: top.title,
    whyItMatters: top.whyItMatters,
    expectedOutcome: top.expectedOutcome,
    estimatedMinutes: top.estimatedMinutes,
    ctaLabel: top.ctaLabel,
    ctaTarget: top.ctaTarget,
    insufficientData: top.id === "activate_resume",
  }
}
