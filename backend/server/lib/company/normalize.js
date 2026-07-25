/**
 * normalize.js — Company Module (Career OS Workstream 5, create-flow pass).
 *
 * Pure, DB-free normalization + duplicate-detection helpers for
 * POST /api/pro/v1/company/create. Scoped deliberately: this is NOT a real
 * fuzzy/trigram matcher (no pg_trgm, no Levenshtein, no alias table — see
 * career_os_ws5_company_module_migration.sql's header for why the alias
 * table was deferred). It only guarantees that whitespace/case variants of
 * the same literal name ("Acme Inc", "acme inc ", "  ACME   INC") collapse
 * to the same `normalized_name`, so the create endpoint can reject a
 * trivial duplicate before insert. Anything beyond exact-normalized-match
 * (typos, legal-suffix variants like "Acme Incorporated" vs "Acme Inc",
 * abbreviations) is real, acknowledged future work — not built here.
 *
 * `normalizeCompanyName` is also the single source of truth `/search` and
 * `/create` both use to compute `normalized_name`, so a company inserted
 * via `/create` is findable via `/search` using the same rules.
 */

/**
 * Normalize a company name for exact-duplicate comparison: lowercase, trim,
 * and collapse any run of whitespace to a single space. Deliberately does
 * NOT strip legal suffixes (Inc/Ltd/Pvt/LLC) or punctuation — that would be
 * a step toward fuzzy matching, out of scope for this pass.
 */
export function normalizeCompanyName(name) {
  if (typeof name !== "string") return ""
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

/**
 * Given a candidate raw name and a list of existing company rows (each with
 * at least `id`, `name`, and `normalized_name`), return the existing row
 * whose normalized_name exactly matches the candidate's normalized form, or
 * null if there's no match. Pure — the caller is responsible for fetching
 * `existingCompanies` (typically a single-row lookup by normalized_name,
 * but this function accepts a list so it's testable without a DB and so a
 * caller doing a broader pre-fetch can reuse it).
 */
export function findDuplicateCompany(candidateName, existingCompanies) {
  const normalized = normalizeCompanyName(candidateName)
  if (!normalized || !Array.isArray(existingCompanies)) return null
  return existingCompanies.find(c => normalizeCompanyName(c.normalized_name || c.name) === normalized) || null
}
