/**
 * domainInference.js — Career OS Workstream 3: maps a free-text skill name
 * to one of the fixed question_bank domains (see questionBankGate.js
 * TOP_10_DOMAINS).
 *
 * Why this exists: user_skills.domain is a free-text nullable column that is
 * 100% null on every real production row today (Workstream 3 audit,
 * career-os-implementation-plan.md §5d). There is no real per-user domain
 * data to key the coverage gate off of, so this heuristic keyword mapper is
 * the bridge between "the skills a user actually has" and "the fixed domain
 * taxonomy question_bank uses" until real domain tagging exists on
 * user_skills. This is a known, documented limitation, not a silent gap —
 * revisit once user_skills.domain is actually populated (e.g. once the
 * Skills page lets users set it, or role_profiles.domain_key is
 * consistently backfilled).
 */

const KEYWORD_TO_DOMAIN = [
  { domain: "data_analytics", keywords: ["sql", "python", "excel", "tableau", "power bi", "vba", "data", "statistic", "pandas", "numpy", "spark", "analytics", "etl"] },
  { domain: "software_engineering", keywords: ["javascript", "typescript", "java", "react", "node", "api", "docker", "kubernetes", "git", "microservices", "backend", "frontend", "software", "code", "engineer"] },
  { domain: "product_management", keywords: ["product", "roadmap", "prd", "user story", "backlog", "prioritization"] },
  { domain: "design_ux", keywords: ["design", "ux", "ui", "figma", "wireframe", "prototyp"] },
  { domain: "sales", keywords: ["sales", "crm", "pipeline", "quota", "negotiation", "account executive"] },
  { domain: "marketing", keywords: ["marketing", "seo", "campaign", "content", "social media", "brand"] },
  { domain: "finance_accounting", keywords: ["finance", "accounting", "audit", "budget", "gaap", "reconcil", "tax"] },
  { domain: "operations_supply_chain", keywords: ["operations", "supply chain", "logistics", "inventory", "procurement"] },
  { domain: "hr_people", keywords: ["hr", "recruit", "people ops", "onboarding", "payroll", "talent"] },
  { domain: "customer_success", keywords: ["customer success", "support", "onboarding", "retention", "csat"] },
]

/**
 * @param {string} skillName
 * @returns {string} one of TOP_10_DOMAINS, or "other" if nothing matches
 */
export function inferDomainForSkill(skillName) {
  const s = String(skillName || "").toLowerCase()
  if (!s) return "other"
  for (const { domain, keywords } of KEYWORD_TO_DOMAIN) {
    if (keywords.some(k => s.includes(k))) return domain
  }
  return "other"
}

/**
 * @param {Array<{name: string}>} userSkills
 * @returns {string[]} unique inferred domains across all of a user's skills
 */
export function inferRelevantDomains(userSkills) {
  const domains = new Set((userSkills || []).map(s => inferDomainForSkill(s.name)))
  return [...domains]
}
