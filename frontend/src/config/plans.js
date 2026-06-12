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
    features: [
      "1 Arena task per day (refreshes every 24 hrs)",
      "Portfolio generation",
      "ELO skill radar",
      "Market analysis at ₹49/report",
    ],
  },
  pro: {
    id: "pro", label: "Pro", price: 299, color: "#3D4EAC", colorBg: "#EEF0FB",
    arenaTasks: 3, arenaFrequency: "per day", arenaIntervalDays: 1,
    interviewSessions: 3, marketReports: 1, reportPrice: 49,
    badge: null, highlight: false,
    features: [
      "3 Arena tasks per day",
      "3 AI mock interview sessions/month",
      "Portfolio generation",
      "1 market analysis report/month",
      "Full Arena access",
    ],
  },
  elite: {
    id: "elite", label: "Elite", price: 599, color: "#B8620A", colorBg: "#FDF3E7",
    arenaTasks: 6, arenaFrequency: "per day", arenaIntervalDays: 1,
    interviewSessions: 5, marketReports: 2, reportPrice: 49,
    badge: "Best Value", highlight: true,
    features: [
      "6 Arena tasks per day",
      "5 AI mock interview sessions/month",
      "Portfolio generation",
      "2 market analysis reports/month",
      "Personal branding video access",
      "Full advanced Arena access",
    ],
  },
}

// ─── PROFESSIONAL (Orbit) plans — matches landing page exactly ───────────────
const PROFESSIONAL_PLANS = {
  free: {
    id: "free", label: "Free", price: 0, color: "#111827", colorBg: "#F9FAFB",
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
    id: "orbit_pro", label: "Orbit Pro", price: 399, color: "#6D28D9", colorBg: "#F5F3FF",
    arenaTasks: 999, arenaFrequency: "unlimited", arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 3, reportPrice: 49,
    badge: "Recommended", highlight: true,
    ctaLabel: "Go Orbit Pro",
    yearlyPrice: 3999, yearlySaving: "save 16%",
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
    id: "orbit_elite", label: "Orbit Elite", price: 799, color: "#6D28D9", colorBg: "#F5F3FF",
    arenaTasks: 999, arenaFrequency: "unlimited", arenaIntervalDays: 0,
    interviewSessions: 5, marketReports: 999, reportPrice: 0,
    badge: null, highlight: false,
    ctaLabel: "Go Orbit Elite",
    yearlyPrice: 7999, yearlySaving: "save 17%",
    features: [
      "Everything in Orbit Pro",
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
const ORGANISATION_PLANS = {
  startup: {
    id: "startup", label: "Startup", price: 1499, color: "#0F766E", colorBg: "#F0FDFA",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 2, reportPrice: 49,
    badge: null, highlight: false,
    features: [
      "Up to 10 seats",
      "Hiring dashboard",
      "Candidate ELO assessment",
      "2 market reports/month",
      "Basic placement tracking",
    ],
  },
  campus: {
    id: "campus", label: "Campus", price: 2499, color: "#1D4ED8", colorBg: "#EFF6FF",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 5, reportPrice: 49,
    badge: "Most Popular", highlight: true,
    features: [
      "Up to 50 student seats",
      "Placement tracking & analytics",
      "Bulk ELO assessments",
      "5 market reports/month",
      "Recruiter portal access",
      "Cohort performance dashboard",
    ],
  },
  university: {
    id: "university", label: "University", price: 6999, color: "#7C3AED", colorBg: "#F5F3FF",
    arenaTasks: 0, arenaFrequency: null, arenaIntervalDays: 0,
    interviewSessions: 0, marketReports: 999, reportPrice: 0,
    badge: "Enterprise", highlight: false,
    features: [
      "Unlimited student seats",
      "Full placement intelligence",
      "Unlimited market reports",
      "API + LMS integration",
      "Dedicated account manager",
      "Custom branding",
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
  professional: ["free", "orbit_pro", "orbit_elite"],
  authority:    ["authority", "luminary", "legacy"],
  institution:  ["startup", "campus", "university"],
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
  if (path === "institution") return "startup"
  return "free"
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
