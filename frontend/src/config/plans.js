// ─── Capabilio Subscription Plans ────────────────────────────────────────────
// Single source of truth — path-aware plans for all four user types.
//
// DB field: profiles.subscription → plan id string
// Use getPlansByPath(path) on the plan selection screen.
// Use getPlan(userData) everywhere else.

// ─── STUDENT plans ────────────────────────────────────────────────────────────
const STUDENT_PLANS = {
    free: {
      id: "free", label: "Free", price: 0, color: "#6B7280", colorBg: "#F6F6F1",
      arenaTasks: 1, arenaFrequency: "per day", arenaIntervalDays: 1,
      interviewSessions: 0, marketReports: 0, reportPrice: 49,
      badge: null, highlight: false,
      ctaLabel: "START FREE",
      subtitle: "100% Free Forever",
      features: [
        "1 Arena task per day (IST reset)",
        "Basic profile & sharing",
        "Limited skill tracking & graph",
        "Basic portfolio & evidence",
        "Basic job & internship discovery",
        "Basic opportunity browsing"
      ],
    },
    pro: {
      id: "pro", label: "Pro", price: 299, color: "#3D4EAC", colorBg: "#EEF0FB",
      arenaTasks: 3, arenaFrequency: "per day", arenaIntervalDays: 1,
      interviewSessions: 3, marketReports: 1, reportPrice: 49,
      badge: "Best Value", highlight: false,
      ctaLabel: "GO PRO",
      subtitle: "Billed monthly • Cancel anytime",
      features: [
        "3 Arena tasks per day (IST reset)",
        "1 monthly skill report & diagnostics",
        "3 AI interview sessions / month",
        "Internship readiness score & tracking",
        "1 monthly market analysis report",
        "Interview feedback & improvement areas"
      ],
    },
    elite: {
      id: "elite", label: "Elite", price: 499, color: "#B8620A", colorBg: "#FDF3E7",
      arenaTasks: 6, arenaFrequency: "per day", arenaIntervalDays: 1,
      interviewSessions: 5, marketReports: 2, reportPrice: 49,
      badge: null, highlight: true,
      ctaLabel: "GO ELITE",
      subtitle: "BEST FOR SERIOUS CAREER BUILDING",
      features: [
        "6 Arena tasks per day (IST reset)",
        "2 monthly skill reports",
        "5 AI interview sessions / month",
        "Personal branding video (Included)",
        "2 monthly market analysis reports",
        "Priority access & Elite profile badge"
      ],
    },
  }
  
// 🪐🪐🪐 PROFESSIONAL (Orbit) plans — matches landing page exactly 🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐🪐
const PROFESSIONAL_PLANS = {
  orbit_free: {
    id: "orbit_free", label: "Free", price: 0, color: "#111827", colorBg: "#F9FAFB",
    arenaTasks: 1, arenaFrequency: "per day", arenaIntervalDays: 1,
    interviewSessions: 0, marketReports: 0, reportPrice: 49,
    badge: null, highlight: false,
    ctaLabel: "Start Free",
    yearlyPrice: null, yearlySaving: null,
    features: [
      "Basic Orbit dashboard",
      "1 Forge challenge/week",
      "Public verified profile",
      "UAN verification",
    ],
  },
  orbit_pro: {
    id: "orbit_pro", label: "Capabilio Pro", price: 499, color: "#6D28D9", colorBg: "#F5F3FF",
    arenaTasks: 999, arenaFrequency: "unlimited", arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 3, reportPrice: 49,
    badge: "Recommended", highlight: true,
    ctaLabel: "Go Capabilio Pro",
    yearlyPrice: 3999, yearlySaving: "save 33%",
    features: [
      "Full Orbit — all 4 career signals",
      "Unlimited Forge challenges",
      "Signal — 3 market reports/mo",
      "Compensation Intelligence",
      "Gap Mode + Gap Narrative Engine",
      "Vault full verification",
      "Nexus verified network",
    ],
  },
  orbit_elite: {
    id: "orbit_elite", label: "Capabilio Elite", price: 999, color: "#6D28D9", colorBg: "#F5F3FF",
    arenaTasks: 999, arenaFrequency: "unlimited", arenaIntervalDays: 0,
    interviewSessions: 5, marketReports: 999, reportPrice: 0,
    badge: null, highlight: false,
    ctaLabel: "Go Capabilio Elite",
    yearlyPrice: 7999, yearlySaving: "save 33%",
    features: [
      "Everything in Capabilio Pro",
      "AI Interview — 5 sessions/mo",
      "Mentor Hub listing (15% commission)",
      "Transition Tracks access",
      "Return-Ready Sprint",
      "Signal — unlimited reports",
      "Priority Launchpad matching",
    ],
  },
}

// ─── EXECUTIVE (Authority) plans ─────────────────────────────────────────────
const EXECUTIVE_PLANS = {
  authority: {
    id: "authority", label: "Authority", price: 1499, color: "#1D4ED8", colorBg: "#EFF6FF",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 3, reportPrice: 49,
    badge: null, highlight: false,
    features: [
      "Thought leadership toolkit",
      "Signal Room (up to 50 participants)",
      "3 market analysis reports/month",
      "Executive profile & portfolio",
      "AI ghostwriter for LinkedIn posts",
    ],
  },
  luminary: {
    id: "luminary", label: "Luminary", price: 2999, color: "#B8620A", colorBg: "#FDF3E7",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 10, reportPrice: 49,
    badge: "Most Popular", highlight: true,
    features: [
      "Everything in Authority",
      "Signal Room (up to 500 participants)",
      "Newsletter broadcasting",
      "10 market analysis reports/month",
      "Personal brand analytics dashboard",
      "Priority AI content generation",
    ],
  },
  legacy: {
    id: "legacy", label: "Legacy", price: 7999, color: "#7C3AED", colorBg: "#F5F3FF",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 999, reportPrice: 0,
    badge: "Enterprise", highlight: false,
    features: [
      "Everything in Luminary",
      "Unlimited Signal Room",
      "White-label branding",
      "Unlimited market reports",
      "Dedicated success manager",
      "API access",
    ],
  },
}

// ─── ORGANISATION plans ───────────────────────────────────────────────────────
// Single free-trial plan — full access for all org types (college + company).
// Pricing tiers will be added once ready; swap PLANS_BY_PATH.institution to
// the paid plan IDs and they appear automatically on the plan screen.
const ORGANISATION_PLANS = {
  org_trial: {
    id: "org_trial", label: "All Features — Free Trial", price: 0,
    color: "#06B6D4", colorBg: "rgba(6,182,212,0.08)",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 999, reportPrice: 0,
    badge: "All Features Included", highlight: true,
    ctaLabel: "Start Free Trial",
    tagline: "Everything unlocked during the free trial. No credit card. No limits.",
    features: [
      // College features
      "Live cohort ELO dashboard — per student, per batch, per dept",
      "Professor Task Engine — AI-graded tasks → student ELO",
      "Placement Command Center — real-time offer tracking",
      "One-click NAAC report — auto-populated from placement data",
      "Recruiter portal — companies filter & reach your batch directly",
      "Student invite link — one link, instant onboarding",
      // Company features
      "Verified talent pool access from Launchpad",
      "Company ELO — built from anonymous verified ratings",
      "Anonymous Day-30 + exit review system (6 dimensions)",
      "ATS integration — Workday, Greenhouse, Keka, Darwinbox",
      // Platform
      "Unlimited admins and seats",
      "Priority onboarding support",
    ],
  },
}

// ─── Master plan registry ─────────────────────────────────────────────────────
export const PLANS = {
  ...STUDENT_PLANS,
  ...PROFESSIONAL_PLANS,
  ...EXECUTIVE_PLANS,
  ...ORGANISATION_PLANS,
}

// ─── Path → plan list ─────────────────────────────────────────────────────────
export const PLANS_BY_PATH = {
  student:      ["free", "pro", "elite"],
  professional: ["orbit_free", "orbit_pro", "orbit_elite"],
  authority:    ["authority", "luminary", "legacy"],
  institution:  ["org_trial"],
}

export const getPlansByPath = (path) =>
  (PLANS_BY_PATH[path] || PLANS_BY_PATH.student).map(id => PLANS[id])

// ─── Helper: resolve active plan from userData ────────────────────────────────
export const getPlan = (userData) => {
  const id = userData?.subscription || "free"
  return PLANS[id] ?? PLANS.free
}

// ─── Helper: default free plan id per path ───────────────────────────────────
export const getDefaultPlanForPath = (path) => {
  if (path === "authority")   return "authority"
  if (path === "institution") return "org_trial"
  if (path === "professional") return "orbit_free"
  return "free"
}

// ─── Invite-code discount helpers ─────────────────────────────────────────────
// Rounds discounted price to clean Indian price anchors (…49, …99, …149, …199 …)
// Formula: Math.ceil(raw / 50) * 50 - 1
// Examples: 299 @ 50% → 149 | 599 @ 50% → 299 | 299 @ 33% → 199
export const applyDiscount = (originalPrice, discountPct = 50) => {
  if (!originalPrice || originalPrice === 0) return 0
  const raw = originalPrice * (1 - discountPct / 100)
  return Math.ceil(raw / 50) * 50 - 1
}

// Returns plan list with college_price injected when an invite context exists.
// Use instead of getPlansByPath() on the plan selection screen for students.
export const getPlansByPathWithDiscount = (path, inviteContext = null) => {
  const plans = getPlansByPath(path)
  if (!inviteContext?.discount_pct) return plans
  return plans.map(plan => ({
    ...plan,
    college_price:    plan.price === 0 ? 0 : applyDiscount(plan.price, inviteContext.discount_pct),
    original_price:   plan.price,
    discount_pct:     inviteContext.discount_pct,
    discount_label:   inviteContext.institution_label ?? "College Discount",
  }))
}

// Read invite context stored by JoinPage — returns null when not from an invite link.
export const getInviteContext = () => {
  try {
    const raw = sessionStorage.getItem("capabilio_invite")
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ─── Usage helpers ────────────────────────────────────────────────────────────
export const interviewsUsedThisMonth = (userData) => {
  const cycleStart = userData?.subscriptionCycleStart ? new Date(userData.subscriptionCycleStart) : null
  const transcripts = userData?.interviewTranscripts || []
  if (!transcripts.length) return 0
  const cutoff = cycleStart ?? (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })()
  return transcripts.filter(t => t.date && new Date(t.date) >= cutoff).length
}

export const reportsUsedThisMonth = (userData) => {
  const cycleStart = userData?.subscriptionCycleStart ? new Date(userData.subscriptionCycleStart) : null
  const reports = userData?.marketReports || []
  if (!reports.length) return 0
  const cutoff = cycleStart ?? (() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })()
  return reports.filter(r => r.date && new Date(r.date) >= cutoff).length
}

export const daysSinceLastArenaTask = (userData) => {
  const last = userData?.arenaLastActive
  if (!last) return 999
  return Math.floor((Date.now() - new Date(last).getTime()) / (1000 * 60 * 60 * 24))
}
