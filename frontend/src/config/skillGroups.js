/**
 * Capabilio Skills System Configuration
 * skillGroups.js — group definitions, domain taxonomy, level thresholds, AI rules
 */

// ─── Skill Group Types ────────────────────────────────────────────────────────

export const SKILL_GROUPS = {
  CORE:              "core",
  DOMAIN:            "domain",
  PROOF:             "proof",
  TOOL_STACK:        "tool_stack",
  GROWTH:            "growth",
  VERIFIED_STRENGTH: "verified_strength",
  CAREER_SIGNAL:     "career_signal",
}

export const SKILL_GROUP_CONFIG = {
  [SKILL_GROUPS.CORE]: {
    label:        "Core Skills",
    icon:         "⭐",
    description:  "Your top skills — proof-backed and proof-ready",
    maxItems:     10,
    minProof:     1,        // at least one proof link required
    userEditable: true,
    systemManaged: false,
    sortable:     true,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "card_full",   // card_full | card_compact | pill | tag
    color:        "#3B82F6",
  },
  [SKILL_GROUPS.DOMAIN]: {
    label:        "Domain Skills",
    icon:         "🔧",
    description:  "Deep technical skills within your specialty",
    maxItems:     null,     // unlimited
    minProof:     0,
    userEditable: true,
    systemManaged: false,
    sortable:     false,    // grouped by sub-domain
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "grouped_grid",
    color:        "#6366F1",
  },
  [SKILL_GROUPS.PROOF]: {
    label:        "Proof-Backed Skills",
    icon:         "📎",
    description:  "Skills with verified artifacts — auto-populated from your timeline",
    maxItems:     null,
    minProof:     1,
    userEditable: false,    // system auto-populates
    systemManaged: true,
    sortable:     false,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "card_full",
    color:        "#14B8A6",
    autoPopulate: true,     // from career_timeline tech_stack + proof_links
  },
  [SKILL_GROUPS.TOOL_STACK]: {
    label:        "Tool Stack",
    icon:         "🛠",
    description:  "Tools, platforms, and environments you work with",
    maxItems:     30,
    minProof:     0,
    userEditable: true,
    systemManaged: false,
    sortable:     false,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "tag_cloud",
    color:        "#8B5CF6",
  },
  [SKILL_GROUPS.GROWTH]: {
    label:        "Growth Skills",
    icon:         "🌱",
    description:  "Skills you are actively learning or targeting",
    maxItems:     5,
    minProof:     0,
    userEditable: true,
    systemManaged: false,
    sortable:     false,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "card_compact",
    color:        "#22C55E",
    honorLabel:   "Learning",   // badge text on each item
  },
  [SKILL_GROUPS.VERIFIED_STRENGTH]: {
    label:        "Verified Strengths",
    icon:         "✓",
    description:  "Competencies derived from your Arena performance",
    maxItems:     8,
    minProof:     0,
    userEditable: false,
    systemManaged: true,        // arena-derived, not user-added
    sortable:     false,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "pill_with_score",
    color:        "#F59E0B",
    userCanHide:  true,         // user can hide individual strengths
    userCanDispute: true,
  },
  [SKILL_GROUPS.CAREER_SIGNAL]: {
    label:        "Career Signals",
    icon:         "📡",
    description:  "What your complete profile says about you",
    maxItems:     6,
    minProof:     0,
    userEditable: false,
    systemManaged: true,
    sortable:     false,
    showInPublic: true,
    showInRecruiter: true,
    displayMode:  "badge_with_rationale",
    color:        "#EC4899",
    refreshCycle: "weekly",     // recomputed every Sunday
  },
}

// ─── Skill Levels ─────────────────────────────────────────────────────────────

export const SKILL_LEVELS = {
  LEARNING:    "learning",
  BEGINNER:    "beginner",
  DEVELOPING:  "developing",
  PROFICIENT:  "proficient",
  ADVANCED:    "advanced",
  EXPERT:      "expert",
}

export const SKILL_LEVEL_CONFIG = {
  [SKILL_LEVELS.LEARNING]:   { label: "Learning",   score: 0,   bar: 0,   color: "#94A3B8" },
  [SKILL_LEVELS.BEGINNER]:   { label: "Beginner",   score: 10,  bar: 15,  color: "#64748B" },
  [SKILL_LEVELS.DEVELOPING]: { label: "Developing", score: 30,  bar: 35,  color: "#3B82F6" },
  [SKILL_LEVELS.PROFICIENT]: { label: "Proficient", score: 55,  bar: 60,  color: "#14B8A6" },
  [SKILL_LEVELS.ADVANCED]:   { label: "Advanced",   score: 75,  bar: 80,  color: "#8B5CF6" },
  [SKILL_LEVELS.EXPERT]:     { label: "Expert",     score: 90,  bar: 95,  color: "#F59E0B" },
}

/**
 * Compute skill level from score (0–100)
 */
export function scoreTolevel(score) {
  if (score >= 90) return SKILL_LEVELS.EXPERT
  if (score >= 75) return SKILL_LEVELS.ADVANCED
  if (score >= 55) return SKILL_LEVELS.PROFICIENT
  if (score >= 30) return SKILL_LEVELS.DEVELOPING
  if (score >= 10) return SKILL_LEVELS.BEGINNER
  return SKILL_LEVELS.LEARNING
}

/**
 * Compute a skill's composite score from its evidence.
 */
export function computeSkillScore({ arenaAvg = 0, proofCount = 0, endorsements = 0, selfRating = 0 }) {
  return Math.min(100, Math.round(
    arenaAvg * 0.5 +
    Math.min(proofCount * 4, 20) +
    Math.min(endorsements, 10) +
    selfRating * 10
  ))
}

// ─── Domain Taxonomy ──────────────────────────────────────────────────────────

export const DOMAINS = {
  FRONTEND:  "frontend",
  BACKEND:   "backend",
  FULLSTACK: "fullstack",
  DEVOPS:    "devops",
  DATA:      "data",
  ML:        "ml",
  DESIGN:    "design",
  MOBILE:    "mobile",
  PM:        "product",
  SECURITY:  "security",
  OTHER:     "other",
}

export const DOMAIN_CONFIG = {
  [DOMAINS.FRONTEND]: {
    label: "Frontend",
    color: "#3B82F6",
    subDomains: {
      languages:    { label: "Languages",    skills: ["JavaScript", "TypeScript", "HTML", "CSS"] },
      frameworks:   { label: "Frameworks",   skills: ["React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt", "Remix", "Astro"] },
      styling:      { label: "Styling",      skills: ["Tailwind CSS", "CSS Modules", "Styled Components", "Sass/SCSS", "Emotion"] },
      state:        { label: "State Mgmt",   skills: ["Redux", "Zustand", "Jotai", "MobX", "React Query", "SWR"] },
      testing:      { label: "Testing",      skills: ["Vitest", "Jest", "React Testing Library", "Playwright", "Cypress"] },
      performance:  { label: "Performance",  skills: ["Web Vitals", "Lighthouse", "Bundle Analysis", "Lazy Loading"] },
      tooling:      { label: "Tooling",      skills: ["Vite", "Webpack", "Babel", "ESLint", "Prettier"] },
    },
  },
  [DOMAINS.BACKEND]: {
    label: "Backend",
    color: "#22C55E",
    subDomains: {
      languages:    { label: "Languages",    skills: ["Node.js", "Python", "Go", "Java", "Rust", "Ruby", "PHP", "C#"] },
      frameworks:   { label: "Frameworks",   skills: ["Express", "Fastify", "NestJS", "Django", "FastAPI", "Spring Boot", "Rails"] },
      databases:    { label: "Databases",    skills: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "DynamoDB", "Cassandra"] },
      apis:         { label: "APIs",         skills: ["REST", "GraphQL", "gRPC", "WebSockets", "tRPC"] },
      auth:         { label: "Auth",         skills: ["JWT", "OAuth 2.0", "SAML", "Supabase Auth", "Auth0", "Clerk"] },
      testing:      { label: "Testing",      skills: ["Jest", "pytest", "Go test", "Supertest"] },
    },
  },
  [DOMAINS.DEVOPS]: {
    label: "DevOps / Cloud",
    color: "#F59E0B",
    subDomains: {
      cloud:        { label: "Cloud",        skills: ["AWS", "GCP", "Azure", "Vercel", "Fly.io", "Railway"] },
      containers:   { label: "Containers",   skills: ["Docker", "Kubernetes", "Helm", "Docker Compose"] },
      ci_cd:        { label: "CI/CD",        skills: ["GitHub Actions", "CircleCI", "Jenkins", "GitLab CI", "ArgoCD"] },
      iac:          { label: "IaC",          skills: ["Terraform", "Pulumi", "AWS CDK", "CloudFormation"] },
      monitoring:   { label: "Monitoring",   skills: ["Datadog", "Grafana", "Prometheus", "Sentry", "New Relic"] },
    },
  },
  [DOMAINS.DATA]: {
    label: "Data / Analytics",
    color: "#14B8A6",
    subDomains: {
      languages:    { label: "Languages",    skills: ["Python", "SQL", "R", "Scala"] },
      frameworks:   { label: "Frameworks",   skills: ["Pandas", "NumPy", "Spark", "dbt", "Airflow"] },
      warehouses:   { label: "Warehouses",   skills: ["Snowflake", "BigQuery", "Redshift", "Databricks"] },
      viz:          { label: "Visualization",skills: ["Tableau", "Power BI", "Looker", "Plotly", "D3.js"] },
    },
  },
  [DOMAINS.DESIGN]: {
    label: "Design",
    color: "#EC4899",
    subDomains: {
      tools:        { label: "Tools",        skills: ["Figma", "Sketch", "Adobe XD", "Framer", "Webflow"] },
      disciplines:  { label: "Disciplines",  skills: ["UI Design", "UX Design", "Product Design", "Motion Design", "Design Systems"] },
      research:     { label: "Research",     skills: ["User Interviews", "Usability Testing", "A/B Testing", "Card Sorting"] },
    },
  },
  [DOMAINS.ML]: {
    label: "ML / AI",
    color: "#8B5CF6",
    subDomains: {
      frameworks:   { label: "Frameworks",   skills: ["PyTorch", "TensorFlow", "Scikit-learn", "HuggingFace", "LangChain"] },
      disciplines:  { label: "Disciplines",  skills: ["Computer Vision", "NLP", "Generative AI", "MLOps", "Data Science"] },
    },
  },
  [DOMAINS.MOBILE]: {
    label: "Mobile",
    color: "#6366F1",
    subDomains: {
      frameworks:   { label: "Frameworks",   skills: ["React Native", "Flutter", "SwiftUI", "Jetpack Compose", "Expo"] },
      native:       { label: "Native",       skills: ["iOS/Swift", "Android/Kotlin", "iOS/Objective-C"] },
    },
  },
}

// ─── Tool Stack Categories ────────────────────────────────────────────────────

export const TOOL_CATEGORIES = {
  DEV:      { label: "Dev Tools",       icon: "💻", tools: ["VS Code", "JetBrains", "Neovim", "Cursor", "GitHub Copilot", "Postman", "Insomnia"] },
  DESIGN:   { label: "Design Tools",    icon: "🎨", tools: ["Figma", "Adobe CC", "Framer", "Lottie"] },
  CLOUD:    { label: "Cloud / Infra",   icon: "☁️", tools: ["AWS Console", "GCP", "Vercel", "Cloudflare", "Supabase", "PlanetScale", "Neon"] },
  CICD:     { label: "CI/CD",           icon: "🔄", tools: ["GitHub Actions", "CircleCI", "Jenkins"] },
  COMM:     { label: "Communication",   icon: "💬", tools: ["Slack", "Notion", "Linear", "Jira", "Confluence", "Loom"] },
  DATA:     { label: "Data / Analytics",icon: "📊", tools: ["dbt", "Airflow", "Tableau", "Metabase", "Retool"] },
  AI:       { label: "AI Tools",        icon: "🤖", tools: ["Claude", "ChatGPT", "Cursor", "GitHub Copilot", "Midjourney"] },
  OTHER:    { label: "Other",           icon: "⚡", tools: [] },
}

// ─── Verified Strengths Definitions ──────────────────────────────────────────

export const VERIFIED_STRENGTHS = [
  {
    key:        "problem_decomposition",
    label:      "Problem Decomposition",
    icon:       "🧩",
    rationale:  "Multi-step challenge solutions with high structure scores",
    arenaSignal: "solution_structure_score",
    threshold:  65,
  },
  {
    key:        "clean_code_habits",
    label:      "Clean Code Habits",
    icon:       "✨",
    rationale:  "Consistent linting compliance across submitted solutions",
    arenaSignal: "linter_score",
    threshold:  75,
  },
  {
    key:        "fast_iteration",
    label:      "Fast Iteration",
    icon:       "⚡",
    rationale:  "Multiple successful attempts within short time windows",
    arenaSignal: "velocity_score",
    threshold:  70,
  },
  {
    key:        "systematic_debugging",
    label:      "Systematic Debugging",
    icon:       "🔍",
    rationale:  "High scores in debugging-specific challenge scenarios",
    arenaSignal: "debug_challenge_avg",
    threshold:  70,
  },
  {
    key:        "architectural_thinking",
    label:      "Architectural Thinking",
    icon:       "🏗",
    rationale:  "Strong performance in system design challenges",
    arenaSignal: "system_design_avg",
    threshold:  75,
  },
  {
    key:        "communication_quality",
    label:      "Communication Quality",
    icon:       "💬",
    rationale:  "High explanation quality scores in challenge writeups",
    arenaSignal: "explanation_quality_score",
    threshold:  70,
  },
  {
    key:        "consistency",
    label:      "Consistent Performer",
    icon:       "📈",
    rationale:  "Low score variance across 10+ challenges",
    arenaSignal: "score_consistency",   // computed as 100 - stddev
    threshold:  70,
  },
  {
    key:        "growth_mindset",
    label:      "Growth Mindset",
    icon:       "🌱",
    rationale:  "Repeated attempts with measurable improvement",
    arenaSignal: "improvement_rate",
    threshold:  15,   // % improvement from first to latest attempt
  },
]

// ─── Career Signal Definitions ────────────────────────────────────────────────

export const CAREER_SIGNALS = [
  {
    key:       "fullstack_ready",
    label:     "Full-Stack Ready",
    icon:      "🏗",
    rationale: "Strong frontend + backend skills with shipped projects",
    condition: (profile) =>
      profile.skills.some(s => s.domain === "frontend" && s.level_score >= 60) &&
      profile.skills.some(s => s.domain === "backend" && s.level_score >= 60) &&
      profile.projectCount >= 1,
  },
  {
    key:       "fast_learner",
    label:     "Fast Learner",
    icon:      "⚡",
    rationale: "3+ new skills verified in last 90 days",
    condition: (profile) => profile.skills90Days >= 3,
  },
  {
    key:       "domain_expert",
    label:     "Domain Expert",
    icon:      "🎯",
    rationale: "Top 15% ELO in primary domain category",
    condition: (profile) => profile.domainPercentile >= 85,
  },
  {
    key:       "ships_independently",
    label:     "Ships Independently",
    icon:      "📦",
    rationale: "5+ personal projects, 3+ shipped",
    condition: (profile) => profile.personalProjects >= 5 && profile.shippedProjects >= 3,
  },
  {
    key:       "active_builder",
    label:     "Active Builder",
    icon:      "🔨",
    rationale: "Arena challenges or project activity in last 30 days",
    condition: (profile) => profile.daysSinceLastActivity <= 30,
  },
  {
    key:       "career_transition",
    label:     "Career Transition",
    icon:      "🔄",
    rationale: "Growth skills in new domain + arena activity in that domain",
    condition: (profile) =>
      profile.growthSkills.length >= 2 &&
      profile.newDomainArenaCount >= 3,
  },
]

// ─── AI Suggestion Rules ──────────────────────────────────────────────────────

/**
 * Generate skill suggestions for a user based on their arena history,
 * timeline tech stacks, and current skill gaps.
 *
 * Returns array of suggestion objects.
 */
export function generateSkillSuggestions({ skills, arenaTasks, timelineItems }) {
  const suggestions = []
  const currentSlugs = new Set(skills.map(s => s.slug))

  // 1. Arena-derived suggestions
  const arenaBySkill = {}
  for (const task of arenaTasks) {
    for (const skill of (task.skills_tested || [])) {
      if (!arenaBySkill[skill]) arenaBySkill[skill] = []
      arenaBySkill[skill].push(task.score || 0)
    }
  }
  for (const [skillName, scores] of Object.entries(arenaBySkill)) {
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    const slug = skillName.toLowerCase().replace(/\s+/g, "_")
    if (scores.length >= 3 && avg >= 70 && !currentSlugs.has(slug)) {
      suggestions.push({
        type: "add_to_core",
        skillName,
        reason: `You scored ${Math.round(avg)}+ in ${scores.length} challenges covering ${skillName}`,
        confidence: Math.min(1, scores.length / 5),
        source: "arena",
      })
    }
  }

  // 2. Timeline tech stack suggestions
  const techCounts = {}
  for (const item of timelineItems) {
    for (const tech of (item.tech_stack || [])) {
      techCounts[tech] = (techCounts[tech] || 0) + 1
    }
  }
  for (const [tech, count] of Object.entries(techCounts)) {
    const slug = tech.toLowerCase().replace(/\s+/g, "_")
    if (count >= 2 && !currentSlugs.has(slug)) {
      suggestions.push({
        type: "add_to_domain",
        skillName: tech,
        reason: `Found in ${count} of your projects`,
        confidence: Math.min(1, count / 4),
        source: "timeline",
      })
    }
  }

  // 3. Growth skill upgrades (if arena scores now support promotion)
  const growthSkills = skills.filter(s => s.group_type === "growth")
  for (const growth of growthSkills) {
    const arenaScores = arenaBySkill[growth.name] || []
    if (arenaScores.length >= 2) {
      const avg = arenaScores.reduce((s, v) => s + v, 0) / arenaScores.length
      if (avg >= 65) {
        suggestions.push({
          type: "upgrade_growth",
          skillId: growth.id,
          skillName: growth.name,
          reason: `You completed ${arenaScores.length} challenges in ${growth.name} with avg score ${Math.round(avg)}`,
          confidence: 0.9,
          source: "arena",
          targetGroup: "domain",
        })
      }
    }
  }

  // Sort by confidence desc, cap at 5 suggestions
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
}

// ─── Endorsement Weights ──────────────────────────────────────────────────────

export const ENDORSEMENT_WEIGHTS = {
  arena_validated:   10,
  cert_backed:       8,
  employer_verified: 7,
  peer:              2,
  self_noted:        0,
}

export const MAX_ENDORSEMENT_SCORE = 30

export function computeEndorsementScore(endorsements = []) {
  const raw = endorsements.reduce((sum, e) => sum + (ENDORSEMENT_WEIGHTS[e.endorsement_type] || 0), 0)
  return Math.min(raw, MAX_ENDORSEMENT_SCORE)
}

// ─── Profile Field Limits ─────────────────────────────────────────────────────

export const PROFILE_LIMITS = {
  headline:         { max: 120, min: 0, recommendedMin: 30 },
  bio:              { max: 600, min: 0, recommendedMin: 100 },
  skillName:        { max: 50 },
  growthTarget:     { max: 100 },
  growthResource:   { max: 200 },
  featuredProofs:   { max: 3 },
  portfolioHighlights: { max: 6 },
  coreSkills:       { max: 10 },
  toolStack:        { max: 30 },
  growthSkills:     { max: 5 },
  careerSignals:    { max: 6 },
  verifiedStrengths: { max: 8 },
}
