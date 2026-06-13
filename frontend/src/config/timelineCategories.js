/**
 * Capabilio Career Timeline Architecture
 * timelineCategories.js — data model, verification system, category configs
 *
 * Core rule: Never mix tracks. Each item has exactly one category.
 * College projects ≠ Professional Experience. Arena ≠ Employment.
 */

// ─── Category Constants ───────────────────────────────────────────────────────

export const CATEGORIES = {
  EDUCATION:           "education",
  ACADEMIC_PROJECT:    "academic_project",
  INTERNSHIP:          "internship",
  PROFESSIONAL:        "professional_experience",
  PERSONAL_PROJECT:    "personal_project",
  ARENA:               "arena_challenge",
  CERTIFICATION:       "certification",
}

// ─── Verification Levels ──────────────────────────────────────────────────────

export const VERIFICATION = {
  SELF_CLAIMED:          0,   // V0 — no proof at all
  ARTIFACT_BACKED:       1,   // V1 — document/URL uploaded
  EXTERNALLY_LINKED:     2,   // V2 — LinkedIn/GitHub cross-ref
  PLATFORM_VERIFIED:     3,   // V3 — Capabilio-native or issuer API
  REFERENCE_CONFIRMED:   4,   // V4 — human reference confirmed
}

export const VERIFICATION_CONFIG = {
  [VERIFICATION.SELF_CLAIMED]: {
    label:       "Self-claimed",
    shortLabel:  "Unverified",
    icon:        "⚠",
    color:       "#94A3B8",
    bgColor:     "rgba(148,163,184,0.1)",
    borderColor: "rgba(148,163,184,0.3)",
    showWarning: true,
    warningText: "This item has not been verified. Recruiters can see this disclaimer.",
  },
  [VERIFICATION.ARTIFACT_BACKED]: {
    label:       "Artifact-backed",
    shortLabel:  "Artifact",
    icon:        "📎",
    color:       "#3B82F6",
    bgColor:     "rgba(59,130,246,0.1)",
    borderColor: "rgba(59,130,246,0.3)",
    showWarning: false,
    badge:       "Artifact Added",
  },
  [VERIFICATION.EXTERNALLY_LINKED]: {
    label:       "Externally linked",
    shortLabel:  "Linked",
    icon:        "🔗",
    color:       "#14B8A6",
    bgColor:     "rgba(20,184,166,0.1)",
    borderColor: "rgba(20,184,166,0.3)",
    showWarning: false,
    badge:       "Cross-verified",
  },
  [VERIFICATION.PLATFORM_VERIFIED]: {
    label:       "Platform-verified",
    shortLabel:  "Verified",
    icon:        "✓",
    color:       "#22C55E",
    bgColor:     "rgba(34,197,94,0.12)",
    borderColor: "rgba(34,197,94,0.4)",
    showWarning: false,
    badge:       "Capabilio Verified",
    glowEffect:  true,
  },
  [VERIFICATION.REFERENCE_CONFIRMED]: {
    label:       "Reference-confirmed",
    shortLabel:  "Confirmed",
    icon:        "⭐",
    color:       "#F59E0B",
    bgColor:     "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.4)",
    showWarning: false,
    badge:       "Reference Confirmed",
    glowEffect:  true,
  },
}

// ─── Item Status System ───────────────────────────────────────────────────────

export const ITEM_STATUS = {
  ACTIVE:         "active",
  COMPLETED:      "completed",
  DRAFT:          "draft",
  NEEDS_PROOF:    "needs_proof",
  EXPIRED:        "expired",
  DISPUTED:       "disputed",
  ARCHIVED:       "archived",
}

export const ITEM_STATUS_CONFIG = {
  [ITEM_STATUS.ACTIVE]:       { label: "Current",      color: "#22C55E", dot: true },
  [ITEM_STATUS.COMPLETED]:    { label: "Completed",    color: "#3B82F6", dot: false },
  [ITEM_STATUS.DRAFT]:        { label: "Draft",        color: "#94A3B8", dot: false },
  [ITEM_STATUS.NEEDS_PROOF]:  { label: "Needs Proof",  color: "#F59E0B", dot: false, pulse: true },
  [ITEM_STATUS.EXPIRED]:      { label: "Expired",      color: "#64748B", dot: false, muted: true },
  [ITEM_STATUS.DISPUTED]:     { label: "Disputed",     color: "#EF4444", dot: false },
  [ITEM_STATUS.ARCHIVED]:     { label: "Archived",     color: "#64748B", dot: false, muted: true },
}

// ─── Visibility System ────────────────────────────────────────────────────────

export const VISIBILITY = {
  PUBLIC:    "public",
  RECRUITER: "recruiter",
  PRIVATE:   "private",
}

// ─── Category Configuration ───────────────────────────────────────────────────

export const CATEGORY_CONFIG = {

  [CATEGORIES.EDUCATION]: {
    label:        "Education",
    pluralLabel:  "Education",
    icon:         "🎓",
    color:        "#3B82F6",
    bgColor:      "#EFF6FF",
    badgeColor:   "#1D4ED8",
    order:        1,
    honestLabel:  "Studied at",
    description:  "Degrees, diplomas, bootcamps, and accredited programs",
    sourceTypes:  ["institutional"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,   // V0 min, V1 strongly encouraged
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: null,
    requiredFields: ["institution_name", "degree", "field_of_study", "start_date", "end_date"],
    optionalFields: ["grade", "description", "proof_link"],
    auraWeight: 12,
    auraCap: 24,
  },

  [CATEGORIES.ACADEMIC_PROJECT]: {
    label:        "Academic Project",
    pluralLabel:  "Academic Projects",
    icon:         "📚",
    color:        "#6366F1",
    bgColor:      "#EEF2FF",
    badgeColor:   "#4338CA",
    order:        2,
    honestLabel:  "Built during studies",
    description:  "Projects for academic credit, final year projects, research",
    sourceTypes:  ["student_work"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: "must_have_education_entry",  // Enforced: must link to an Education entry
    requiredFields: ["title", "institution", "start_date", "end_date", "description", "tech_stack"],
    optionalFields: ["course", "team_size", "role_in_team", "github_url", "live_url", "demo_video_url", "grade_received"],
    auraWeight: 5,
    auraCap: 25,
    // Proof bonus points
    proofBonus: { github_url: 3, live_url: 2, demo_video_url: 2 },
    portfolioDisclaimer: "Built during studies — not professional experience",
  },

  [CATEGORIES.INTERNSHIP]: {
    label:        "Internship",
    pluralLabel:  "Internships",
    icon:         "🏢",
    color:        "#14B8A6",
    bgColor:      "#F0FDFA",
    badgeColor:   "#0D9488",
    order:        3,
    honestLabel:  "Interned at",
    description:  "Paid or unpaid internships, co-ops, research internships",
    sourceTypes:  ["role_based"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: "cannot_be_fulltime",  // duration check + employment_type check
    requiredFields: ["company_name", "role", "start_date", "end_date", "description", "skills_used"],
    optionalFields: ["company_domain", "team", "location", "stipend_type", "proof_links", "impact_summary"],
    auraWeight: 10,
    auraCap: 40,
    auraBonus: { verified_v2_plus: 5, duration_3mo_plus: 4 },
    maxDurationMonthsForLabel: 12,  // If > 12 months, suggest reclassification to Professional
  },

  [CATEGORIES.PROFESSIONAL]: {
    label:        "Professional Experience",
    pluralLabel:  "Experience",
    icon:         "💼",
    color:        "#059669",
    bgColor:      "#ECFDF5",
    badgeColor:   "#047857",
    order:        4,
    honestLabel:  "Worked at",
    description:  "Full-time, part-time, contract, and consulting roles",
    sourceTypes:  ["employment"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: null,
    requiredFields: ["company_name", "role", "employment_type", "start_date", "description", "skills_used"],
    optionalFields: ["seniority_level", "team", "company_domain", "location", "responsibilities", "achievements", "impact_summary"],
    auraWeight: 15,
    auraCap: null,  // No cap — primary proof track for professionals
    auraBonus: { verified_v2_plus: 8, per_year_yoe: 2, is_current: 5 },
    employmentTypes: ["full_time", "part_time", "contract", "consulting"],
    seniorityLevels: ["IC", "Senior", "Lead", "Staff", "Principal", "Manager", "Director", "VP", "C-Suite"],
  },

  [CATEGORIES.PERSONAL_PROJECT]: {
    label:        "Personal Project",
    pluralLabel:  "Personal Projects",
    icon:         "⚡",
    color:        "#8B5CF6",
    bgColor:      "#F5F3FF",
    badgeColor:   "#7C3AED",
    order:        5,
    honestLabel:  "Built independently",
    description:  "Side projects, open source, products, freelance work",
    sourceTypes:  ["self_initiated"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: null,
    requiredFields: ["title", "sub_type", "start_date", "description", "tech_stack"],
    optionalFields: ["status", "end_date", "github_url", "live_url", "product_url", "impact_summary", "client_name"],
    subTypes: ["personal_project", "freelance", "open_source", "product", "hackathon", "research"],
    statusOptions: ["idea", "in_progress", "shipped", "archived", "maintained"],
    auraWeight: 7,
    auraCap: 35,
    auraBonus: { shipped_or_live: 4, open_source_stars_per_100: 1, open_source_stars_max: 10 },
  },

  [CATEGORIES.ARENA]: {
    label:        "Arena Challenge",
    pluralLabel:  "Arena Proof",
    icon:         "⚔️",
    color:        "#3B82F6",
    bgColor:      "#EFF6FF",
    badgeColor:   "#1D4ED8",
    order:        6,
    honestLabel:  "Verified challenge",
    description:  "Capabilio Arena challenges — platform-verified proof",
    sourceTypes:  ["capabilio_native"],
    verificationRequired: VERIFICATION.PLATFORM_VERIFIED,  // Always V3
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: "system_generated_only",  // Users cannot manually create these
    requiredFields: [],  // All auto-populated
    optionalFields: ["visibility"],
    auraWeight: null,  // Uses ELO delta directly
    auraCap: null,     // No cap — primary differentiator
    scoreBonus: { above_80: 8, range_60_79: 4, below_60: 1, hard_expert: 3 },
    difficulties: ["Easy", "Medium", "Hard", "Expert"],
    grades: ["A+", "A", "B+", "B", "C", "D"],
    isSystemManaged: true,
    capabilioVerifiedSeal: true,
    uniqueToCapabilio: true,
  },

  [CATEGORIES.CERTIFICATION]: {
    label:        "Certification",
    pluralLabel:  "Certifications",
    icon:         "🏅",
    color:        "#F59E0B",
    bgColor:      "#FFFBEB",
    badgeColor:   "#B45309",
    order:        7,
    honestLabel:  "Certified",
    description:  "Industry certs, platform badges, external assessments",
    sourceTypes:  ["assessment", "badge"],
    verificationRequired: VERIFICATION.SELF_CLAIMED,
    showInPortfolio: true,
    showInRecruiterView: true,
    separationRule: null,
    requiredFields: ["title", "issuer", "issued_date"],
    optionalFields: ["expiry_date", "credential_id", "credential_url", "score", "proof_link", "is_featured"],
    certCategories: ["cloud", "security", "frontend", "backend", "data", "design", "pm", "language", "other"],
    auraWeight: 6,
    auraCap: 30,
    auraBonus: { featured: 4, auto_verified_api: 4 },
    autoVerifiableIssuers: ["aws", "google_cloud", "microsoft", "credly", "badgr", "accredible"],
  },
}

// ─── Separation Enforcement ───────────────────────────────────────────────────

/**
 * Enforces track-level separation rules at save time.
 * Returns { valid: true } or { valid: false, reason: string, suggestion: string }
 */
export function enforceTrackSeparation(item, existingTimeline = []) {
  const { category, sub_type, start_date, end_date, employment_type } = item

  // Rule 1: Academic projects must link to an Education entry
  if (category === CATEGORIES.ACADEMIC_PROJECT) {
    const hasEducation = existingTimeline.some(i => i.category === CATEGORIES.EDUCATION)
    if (!hasEducation) {
      return {
        valid: false,
        reason: "Academic projects require an Education entry.",
        suggestion: "Please add your degree or course first, then add the project.",
      }
    }
  }

  // Rule 2: Internships cannot be described as full-time employment
  if (category === CATEGORIES.INTERNSHIP && employment_type === "full_time") {
    return {
      valid: false,
      reason: "Internships cannot be marked as full-time employment.",
      suggestion: "If this was a full-time role, use Professional Experience instead.",
    }
  }

  // Rule 3: Internships > 12 months trigger reclassification suggestion
  if (category === CATEGORIES.INTERNSHIP && start_date && end_date) {
    const start = new Date(start_date)
    const end = new Date(end_date)
    const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
    if (months > 12) {
      return {
        valid: false,
        reason: "This duration exceeds 12 months — longer than a typical internship.",
        suggestion: "Would you like to add this as Professional Experience instead?",
        reclassifyTo: CATEGORIES.PROFESSIONAL,
      }
    }
  }

  // Rule 4: Arena items are system-managed only
  if (category === CATEGORIES.ARENA) {
    return {
      valid: false,
      reason: "Arena challenges are automatically recorded when you complete them.",
      suggestion: "Complete a challenge in the Arena to add it to your timeline.",
    }
  }

  return { valid: true }
}

// ─── Onboarding Flow Configuration ───────────────────────────────────────────

export const ONBOARDING_PATHS = {
  STUDENT:       "student",
  RECENT_GRAD:   "recent_graduate",
  PROFESSIONAL:  "professional",
  BOTH:          "both",
  EXPLORING:     "exploring",
}

export const ONBOARDING_PATH_CONFIG = {
  [ONBOARDING_PATHS.STUDENT]: {
    label:             "Student / Still in college",
    icon:              "🎓",
    priorityTracks:    [CATEGORIES.EDUCATION, CATEGORIES.ACADEMIC_PROJECT, CATEGORIES.ARENA, CATEGORIES.PERSONAL_PROJECT],
    portfolioArchetype: "student",
    auraWeightProfile: "student",
    defaultVisibility: VISIBILITY.RECRUITER,
  },
  [ONBOARDING_PATHS.RECENT_GRAD]: {
    label:             "Recent graduate (< 1 year out)",
    icon:              "👨‍💻",
    priorityTracks:    [CATEGORIES.ACADEMIC_PROJECT, CATEGORIES.INTERNSHIP, CATEGORIES.ARENA, CATEGORIES.PERSONAL_PROJECT],
    portfolioArchetype: "student",
    auraWeightProfile: "recent_grad",
    defaultVisibility: VISIBILITY.RECRUITER,
  },
  [ONBOARDING_PATHS.PROFESSIONAL]: {
    label:             "Working professional",
    icon:              "💼",
    priorityTracks:    [CATEGORIES.PROFESSIONAL, CATEGORIES.CERTIFICATION, CATEGORIES.ARENA, CATEGORIES.PERSONAL_PROJECT],
    portfolioArchetype: "professional",
    auraWeightProfile: "professional",
    defaultVisibility: VISIBILITY.PUBLIC,
  },
  [ONBOARDING_PATHS.BOTH]: {
    label:             "Both — studying + working",
    icon:              "⚡",
    priorityTracks:    [CATEGORIES.PROFESSIONAL, CATEGORIES.EDUCATION, CATEGORIES.ACADEMIC_PROJECT, CATEGORIES.ARENA],
    portfolioArchetype: "professional",
    auraWeightProfile: "both",
    defaultVisibility: VISIBILITY.RECRUITER,
  },
  [ONBOARDING_PATHS.EXPLORING]: {
    label:             "Exploring / Career transition",
    icon:              "🔍",
    priorityTracks:    [CATEGORIES.ARENA, CATEGORIES.PERSONAL_PROJECT, CATEGORIES.CERTIFICATION, CATEGORIES.PROFESSIONAL],
    portfolioArchetype: "default",
    auraWeightProfile: "exploring",
    defaultVisibility: VISIBILITY.PRIVATE,
  },
}

// Onboarding wizard questions — classify item type before form opens
export const ONBOARDING_QUESTIONS = {
  WHAT_ARE_YOU_ADDING: {
    id:       "what_are_you_adding",
    question: "What are you adding?",
    options: [
      { value: CATEGORIES.EDUCATION,        label: "A degree or course", icon: "🎓" },
      { value: CATEGORIES.ACADEMIC_PROJECT, label: "A project I built during college", icon: "📚" },
      { value: CATEGORIES.INTERNSHIP,       label: "An internship I did", icon: "🏢" },
      { value: CATEGORIES.PROFESSIONAL,     label: "A full-time or part-time job", icon: "💼" },
      { value: CATEGORIES.PERSONAL_PROJECT, label: "A personal project or side project", icon: "⚡" },
      { value: CATEGORIES.PERSONAL_PROJECT, label: "Freelance work", icon: "🤝", subType: "freelance" },
      { value: CATEGORIES.CERTIFICATION,    label: "A certification or badge", icon: "🏅" },
    ],
  },
  ACADEMIC_PROJECT_CLARIFY: {
    id:       "academic_project_clarify",
    question: "Was this project built specifically for a class or college requirement?",
    appliesTo: CATEGORIES.ACADEMIC_PROJECT,
    options: [
      { value: true,  label: "Yes — it was part of a course / final year project", stayAs: CATEGORIES.ACADEMIC_PROJECT },
      { value: false, label: "No — I built it on my own time while in college",   reclassifyTo: CATEGORIES.PERSONAL_PROJECT },
    ],
  },
  INTERNSHIP_CLARIFY: {
    id:       "internship_clarify",
    question: "Was this a paid or structured internship with a company?",
    appliesTo: CATEGORIES.INTERNSHIP,
    options: [
      { value: "yes",          label: "Yes — I had an offer letter or contract" },
      { value: "no",           label: "No — it was more like freelance / ad hoc work", reclassifyTo: CATEGORIES.PERSONAL_PROJECT, subType: "freelance" },
      { value: "prefer_not",   label: "Prefer not to say" },
    ],
  },
  PROOF_AVAILABLE: {
    id:       "proof_available",
    question: "What proof do you have for this item?",
    multiSelect: true,
    options: [
      { value: "github",    label: "GitHub repository",        icon: "💻" },
      { value: "live_url",  label: "Live URL / deployed link", icon: "🌐" },
      { value: "document",  label: "Certificate / offer letter (upload)", icon: "📄" },
      { value: "linkedin",  label: "LinkedIn work history",    icon: "🔗" },
      { value: "video",     label: "Video demo",               icon: "🎥" },
      { value: "none",      label: "No proof right now",       icon: "⚠", setLevel: VERIFICATION.SELF_CLAIMED },
    ],
  },
  VISIBILITY: {
    id:       "visibility",
    question: "Who should see this?",
    options: [
      { value: VISIBILITY.PUBLIC,    label: "Public", description: "Anyone with the portfolio link" },
      { value: VISIBILITY.RECRUITER, label: "Recruiter-visible", description: "Only when shared with recruiters" },
      { value: VISIBILITY.PRIVATE,   label: "Private", description: "Only you" },
    ],
  },
  AUTO_UPDATE: {
    id:       "auto_update",
    question: "Should this appear on your portfolio?",
    options: [
      { value: "portfolio_and_timeline", label: "Yes — add to timeline and portfolio" },
      { value: "timeline_only",          label: "Yes — timeline only, not portfolio" },
      { value: "records_only",           label: "No — just save for my records" },
    ],
  },
}

// ─── Proof Type → Verification Level Mapping ─────────────────────────────────

export const PROOF_TO_VERIFICATION = {
  none:     VERIFICATION.SELF_CLAIMED,
  video:    VERIFICATION.ARTIFACT_BACKED,
  document: VERIFICATION.ARTIFACT_BACKED,
  github:   VERIFICATION.EXTERNALLY_LINKED,
  live_url: VERIFICATION.EXTERNALLY_LINKED,
  linkedin: VERIFICATION.EXTERNALLY_LINKED,
  // Arena is always V3, set by system
  capabilio: VERIFICATION.PLATFORM_VERIFIED,
}

/**
 * Compute verification level from provided proof types array.
 * Returns the highest level achieved.
 */
export function computeVerificationLevel(proofTypes = []) {
  if (!proofTypes || proofTypes.length === 0) return VERIFICATION.SELF_CLAIMED
  return Math.max(...proofTypes.map(p => PROOF_TO_VERIFICATION[p] ?? VERIFICATION.SELF_CLAIMED))
}

// ─── Aura Score Computation ───────────────────────────────────────────────────

/**
 * Compute Aura point contribution for a single timeline item.
 * Returns number of points this item contributes.
 */
export function computeItemAuraPoints(item) {
  const config = CATEGORY_CONFIG[item.category]
  if (!config) return 0

  // Arena items use ELO delta directly — not this function
  if (item.category === CATEGORIES.ARENA) return 0

  let pts = config.auraWeight

  // Verification bonus
  if (item.verification_level >= VERIFICATION.EXTERNALLY_LINKED) pts += 5
  if (item.verification_level >= VERIFICATION.PLATFORM_VERIFIED) pts += 3

  // Category-specific bonuses
  if (item.category === CATEGORIES.ACADEMIC_PROJECT && config.proofBonus) {
    if (item.github_url) pts += config.proofBonus.github_url
    if (item.live_url)   pts += config.proofBonus.live_url
  }

  if (item.category === CATEGORIES.PROFESSIONAL && config.auraBonus) {
    const { start_date, end_date, is_current } = item
    if (is_current) pts += config.auraBonus.is_current
    if (start_date) {
      const years = ((end_date ? new Date(end_date) : new Date()) - new Date(start_date)) / (1000 * 60 * 60 * 24 * 365)
      pts += Math.min(years * config.auraBonus.per_year_yoe, 20)
    }
    if (item.verification_level >= VERIFICATION.EXTERNALLY_LINKED) pts += config.auraBonus.verified_v2_plus
  }

  if (item.category === CATEGORIES.PERSONAL_PROJECT && config.auraBonus) {
    if (["shipped", "maintained"].includes(item.status)) pts += config.auraBonus.shipped_or_live
  }

  if (item.category === CATEGORIES.CERTIFICATION) {
    if (item.is_featured) pts += config.auraBonus.featured
    if (item.verification_level >= VERIFICATION.EXTERNALLY_LINKED) pts += config.auraBonus.auto_verified_api
  }

  return Math.max(0, pts)
}

/**
 * Compute total Aura points from all timeline items (excludes Arena — handled via ELO).
 * Respects per-category caps.
 */
export function computeTimelineAuraTotal(items = []) {
  const totals = {}
  for (const cat of Object.values(CATEGORIES)) totals[cat] = 0

  for (const item of items) {
    if (item.category === CATEGORIES.ARENA) continue
    const pts = computeItemAuraPoints(item)
    const cap = CATEGORY_CONFIG[item.category]?.auraCap ?? Infinity
    totals[item.category] = Math.min(totals[item.category] + pts, cap)
  }

  return Object.values(totals).reduce((sum, v) => sum + v, 0)
}

// ─── Portfolio Classification ─────────────────────────────────────────────────

/**
 * Given a user's timeline items, separate them into the correct portfolio sections.
 * Returns an object keyed by category with sorted arrays.
 * Rule: never cross-contaminate tracks.
 */
export function classifyForPortfolio(items = [], visibilityFilter = [VISIBILITY.PUBLIC]) {
  const classified = {}
  for (const cat of Object.values(CATEGORIES)) classified[cat] = []

  for (const item of items) {
    // Filter by visibility
    if (!visibilityFilter.includes(item.visibility)) continue
    // Filter by status (hide archived, private drafts)
    if ([ITEM_STATUS.ARCHIVED, ITEM_STATUS.DISPUTED].includes(item.status)) continue
    // Place in correct track — no cross-contamination
    classified[item.category].push(item)
  }

  // Sort each track by end_date desc (current items first)
  for (const cat of Object.values(CATEGORIES)) {
    classified[cat].sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date) : new Date()
      const dateB = b.end_date ? new Date(b.end_date) : new Date()
      return dateB - dateA
    })
  }

  return classified
}

/**
 * Returns display order for portfolio sections based on user path.
 */
export function getPortfolioSectionOrder(path = ONBOARDING_PATHS.PROFESSIONAL) {
  const config = ONBOARDING_PATH_CONFIG[path]
  if (!config) return Object.values(CATEGORIES)
  // Priority tracks first, then rest
  const rest = Object.values(CATEGORIES).filter(c => !config.priorityTracks.includes(c))
  return [...config.priorityTracks, ...rest]
}

// ─── Supabase Schema Reference ────────────────────────────────────────────────
// Table: career_timeline
// Mirrors the TimelineItem interface from the spec.
// Migration SQL is in /supabase/migrations/xxx_career_timeline.sql

export const CAREER_TIMELINE_TABLE = "career_timeline"

export const CAREER_TIMELINE_SCHEMA = {
  tableName: CAREER_TIMELINE_TABLE,
  columns: {
    id:                   "uuid primary key default gen_random_uuid()",
    user_id:              "uuid not null references profiles(id) on delete cascade",
    category:             "text not null",
    title:                "text not null",
    role:                 "text",
    sub_type:             "text",
    domain:               "text",
    institution:          "text",
    company:              "text",
    company_domain:       "text",
    start_date:           "date not null",
    end_date:             "date",
    is_current:           "boolean default false",
    proof_links:          "jsonb default '[]'::jsonb",
    verification_level:   "smallint not null default 0",
    verified_at:          "timestamptz",
    verifier_source:      "text",
    description:          "text",
    impact_summary:       "text",
    responsibilities:     "text[] default '{}'",
    achievements:         "text[] default '{}'",
    tech_stack:           "text[] default '{}'",
    tags:                 "text[] default '{}'",
    visibility:           "text not null default 'private'",
    is_highlighted:       "boolean default false",
    is_featured:          "boolean default false",
    status:               "text not null default 'draft'",
    aura_contribution:    "integer default 0",
    affects_skill_graph:  "boolean default true",
    created_at:           "timestamptz default now()",
    updated_at:           "timestamptz default now()",
    source:               "text not null default 'manual'",
  },
}
