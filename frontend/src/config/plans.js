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
    tagline: "Start proving your skills — no cost, no fluff.",
    description: "Get your ELO score, complete daily missions, and build a verified skill profile from day one.",
    featureGroups: [
      {
        label: "⚔️ Arena",
        items: [
          "1 daily mission — refreshes every 24 hrs",
          "Live ELO score after every submission",
          "All difficulty tiers: Easy · Medium · Hard",
        ],
      },
      {
        label: "🧠 Profile & Portfolio",
        items: [
          "Public verified skill profile",
          "ELO-ranked skill radar (6 domains)",
          "Auto-generated portfolio page",
        ],
      },
      {
        label: "📊 Market Intel",
        items: [
          "Community Pulse feed",
          "Market analysis reports at ₹49 each",
        ],
      },
    ],
    notIncluded: [
      "AI mock interviews",
      "Skill gap deep-dive",
      "Personal branding video",
    ],
    features: [
      "1 daily mission (refreshes every 24 hrs)",
      "Live ELO score after every submission",
      "Public verified skill profile",
      "ELO-ranked skill radar (6 domains)",
      "Auto-generated portfolio page",
      "Community Pulse feed",
      "Market reports at ₹49/report",
    ],
  },
  pro: {
    id: "pro", label: "Pro", price: 299, color: "#3D4EAC", colorBg: "#EEF0FB",
    arenaTasks: 3, arenaFrequency: "per day", arenaIntervalDays: 1,
    interviewSessions: 3, marketReports: 1, reportPrice: 49,
    badge: null, highlight: false,
    tagline: "Serious about getting hired? This is where it starts.",
    description: "3× more daily missions, real AI interviews with feedback, and a market report every month.",
    featureGroups: [
      {
        label: "⚔️ Arena",
        items: [
          "3 daily missions — 3× more ELO velocity",
          "Full submission history with AI review",
          "Cross-domain missions unlocked",
        ],
      },
      {
        label: "🎤 AI Interview",
        items: [
          "3 AI mock interview sessions / month",
          "Role-specific question bank (50+ roles)",
          "Transcript + structured feedback report",
        ],
      },
      {
        label: "📊 Market Intel",
        items: [
          "1 market analysis report / month (₹599 value)",
          "Skill gap deep-dive vs. market benchmarks",
          "Salary range by seniority + location",
        ],
      },
      {
        label: "✦ Capi Copilot",
        items: [
          "Unlimited career questions",
          "Interview prep & skill gap guidance",
        ],
      },
    ],
    notIncluded: [
      "Personal branding video",
      "Advanced Hard+ missions",
    ],
    features: [
      "3 daily missions (3× ELO velocity)",
      "3 AI mock interview sessions/month with feedback",
      "1 market analysis report included/month",
      "Skill gap deep-dive vs. market benchmarks",
      "Unlimited Capi Career Copilot",
      "Full submission history with AI review",
      "Salary range by seniority + location",
    ],
  },
  elite: {
    id: "elite", label: "Elite", price: 599, color: "#B8620A", colorBg: "#FDF3E7",
    arenaTasks: 6, arenaFrequency: "per day", arenaIntervalDays: 1,
    interviewSessions: 5, marketReports: 2, reportPrice: 49,
    badge: "Best Value", highlight: true,
    tagline: "Built for candidates who refuse to be average.",
    description: "Maximum ELO growth, 5 AI interviews, 2 market reports, and a personal brand video — everything to stand out.",
    featureGroups: [
      {
        label: "⚔️ Arena",
        items: [
          "6 daily missions — maximum ELO acceleration",
          "Advanced Hard+ missions unlocked",
          "AI-powered post-submission code review",
        ],
      },
      {
        label: "🎤 AI Interview",
        items: [
          "5 AI mock interview sessions / month",
          "System design + behavioural rounds",
          "Recruiter-style scoring rubric",
        ],
      },
      {
        label: "📊 Market Intel",
        items: [
          "2 market analysis reports / month",
          "Competitor candidate benchmarking",
          "Role-specific negotiation data",
        ],
      },
      {
        label: "🎬 Personal Brand",
        items: [
          "Personal branding video (AI-generated)",
          "ELO growth story narration",
          "Share to LinkedIn & Twitter in one click",
        ],
      },
      {
        label: "✦ Capi Copilot",
        items: [
          "Unlimited career guidance",
          "90-day career roadmap generation",
        ],
      },
    ],
    features: [
      "6 daily missions (maximum ELO acceleration)",
      "5 AI mock interview sessions/month",
      "2 market analysis reports/month",
      "Personal branding video (AI-generated)",
      "Advanced Hard+ missions unlocked",
      "AI post-submission code review",
      "Role-specific negotiation data",
      "90-day career roadmap via Capi",
      "Competitor candidate benchmarking",
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
