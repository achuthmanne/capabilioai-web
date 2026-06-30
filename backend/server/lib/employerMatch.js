/**
 * Employer Alias Resolution & Fuzzy Matching
 *
 * Handles the brand-name vs legal-name gap:
 *   display  → "Capabilio"
 *   legal    → "CAPABILIO VENTURES PRIVATE LIMITED"
 *
 * Pipeline:
 *   1. Normalize both names (strip suffixes, lowercase, remove punctuation)
 *   2. Exact / contains / word-overlap scoring
 *   3. Date range overlap check
 *   4. Groq AI fallback for low-confidence name pairs (optional)
 */

import { groq, GROQ_FAST } from "./groq.js"

// ─── Corporate suffix strip ───────────────────────────────────────────────────
const SUFFIX_PATTERN = /\b(private limited|pvt\.?\s*ltd\.?|p\.?\s*ltd\.?|limited|ltd\.?|inc\.?|corp\.?|llp|llc|& co\.?|co\.?|plc|gmbh|ag|sa|bv|nv|pty|sdn bhd|pte\.?\s*ltd\.?|llc\.?)\b\.?/gi

export function normalizeCompany(name = "") {
  return name
    .toLowerCase()
    .replace(SUFFIX_PATTERN, " ")      // remove legal suffixes
    .replace(/[^a-z0-9\s]/g, " ")     // strip punctuation
    .replace(/\s+/g, " ")             // collapse whitespace
    .trim()
}

// ─── Word-level Jaccard similarity ───────────────────────────────────────────
function wordSimilarity(a, b) {
  const wa = new Set(a.split(/\s+/).filter(w => w.length > 1))
  const wb = new Set(b.split(/\s+/).filter(w => w.length > 1))
  if (wa.size === 0 || wb.size === 0) return 0
  const intersection = [...wa].filter(w => wb.has(w)).length
  const union = new Set([...wa, ...wb]).size
  return intersection / union
}

// ─── Core name matcher ────────────────────────────────────────────────────────
/**
 * @param {string} epfoName   — legal name from EPFO (ALL CAPS usually)
 * @param {string} resumeName — display name from resume
 * @param {string[]} aliases  — user-approved brand aliases
 * @returns {{ matched: boolean, confidence: number, method: string }}
 */
export function matchEmployerNames(epfoName, resumeName, aliases = []) {
  const epfoNorm   = normalizeCompany(epfoName)
  const resumeNorm = normalizeCompany(resumeName)

  // 1. Exact match after normalization
  if (epfoNorm === resumeNorm && epfoNorm.length > 0)
    return { matched: true, confidence: 1.0, method: "exact" }

  // 2. Contains match (one fully inside the other)
  if (epfoNorm.length > 2 && resumeNorm.length > 2) {
    if (epfoNorm.includes(resumeNorm) || resumeNorm.includes(epfoNorm))
      return { matched: true, confidence: 0.92, method: "contains" }
  }

  // 3. Alias match
  for (const alias of aliases) {
    const aliasNorm = normalizeCompany(alias)
    if (!aliasNorm) continue
    if (epfoNorm === aliasNorm || epfoNorm.includes(aliasNorm) || aliasNorm.includes(epfoNorm))
      return { matched: true, confidence: 0.88, method: "alias" }
  }

  // 4. Word similarity
  const sim = wordSimilarity(epfoNorm, resumeNorm)
  if (sim >= 0.65) return { matched: true,  confidence: sim, method: "word_overlap" }
  if (sim >= 0.40) return { matched: false, confidence: sim, method: "partial_overlap" }

  return { matched: false, confidence: sim, method: "no_match" }
}

// ─── Date range overlap ───────────────────────────────────────────────────────
/**
 * Returns true if the two date ranges overlap within a 90-day tolerance.
 * "Present" / empty end date = today.
 */
export function datesOverlap(epfoStart, epfoEnd, expStart, expEnd, toleranceDays = 90) {
  const toMs = (d, fallback) => {
    if (!d) return fallback
    const parsed = new Date(d)
    return isNaN(parsed) ? fallback : parsed.getTime()
  }
  const now  = Date.now()
  const tol  = toleranceDays * 24 * 60 * 60 * 1000

  const eS = toMs(epfoStart, null)
  const eE = toMs(epfoEnd,   now)
  const rS = toMs(expStart,  null)
  const rE = toMs(expEnd,    now)

  if (!eS || !rS) return true   // if either start is unknown, don't disqualify on dates

  // Ranges overlap if one starts before the other ends (with tolerance)
  return eS <= rE + tol && rS <= eE + tol
}

// ─── Full experience match ────────────────────────────────────────────────────
/**
 * Match a single EPFO employer record against a list of resume experiences.
 * Returns the best match (if any above threshold).
 *
 * @param {{ legal_name, estab_code, date_of_joining, date_of_exit }} epfoEntry
 * @param {Array} experiences — from profiles.experiences
 * @returns {{ expIdx: number|null, confidence: number, matched: boolean, legalName: string }}
 */
export function matchEpfoEntry(epfoEntry, experiences) {
  const { legal_name, date_of_joining, date_of_exit } = epfoEntry

  let best = { expIdx: null, confidence: 0, matched: false }

  experiences.forEach((exp, idx) => {
    const company  = exp.company || exp.displayCompany || ""
    const aliases  = exp.aliasNames || exp.alias_names || []
    const expStart = exp.startDate || exp.start_date || ""
    const expEnd   = exp.endDate   || exp.end_date   || (exp.isCurrent ? null : "")

    const nameResult = matchEmployerNames(legal_name, company, aliases)
    const dateMatch  = datesOverlap(date_of_joining, date_of_exit, expStart, expEnd)

    // Combined confidence: name contributes 70%, date overlap 30%
    const combined = nameResult.confidence * 0.70 + (dateMatch ? 0.30 : 0)

    if (combined > best.confidence) {
      best = {
        expIdx:     idx,
        confidence: combined,
        matched:    nameResult.matched && dateMatch && combined >= 0.60,
        nameMethod: nameResult.method,
        legalName:  legal_name,
      }
    }
  })

  return best
}

// ─── Groq AI fallback (for ambiguous pairs) ──────────────────────────────────
/**
 * Ask Groq whether two company names refer to the same entity.
 * Only called when word similarity is 0.30–0.64 (the grey zone).
 */
export async function aiEmployerMatch(epfoName, resumeName) {
  try {
    const prompt = `Do these two company names refer to the same employer?
EPFO / legal name: "${epfoName}"
Resume / brand name: "${resumeName}"

Reply with ONLY valid JSON: {"same_entity": true|false, "confidence": 0.0-1.0, "reason": "one sentence"}`

    const raw = await groq(
      [{ role: "user", content: prompt }],
      { model: GROQ_FAST, max_tokens: 80, json: true }
    )
    const parsed = JSON.parse(raw)
    return {
      matched:    !!parsed.same_entity,
      confidence: parsed.confidence ?? (parsed.same_entity ? 0.75 : 0.25),
      method:     "ai",
      reason:     parsed.reason || "",
    }
  } catch {
    return { matched: false, confidence: 0, method: "ai_error" }
  }
}

// ─── Batch match all EPFO entries against all experiences ─────────────────────
/**
 * Main entry point.
 * Returns `updatedExperiences` — same array with verificationStatus / legalName updated.
 *
 * @param {Array} epfoEmployers   — from EPFO API / stub
 * @param {Array} experiences     — from profiles.experiences
 * @param {boolean} useAI         — whether to use Groq for grey-zone matches
 */
export async function matchEpfoToExperiences(epfoEmployers, experiences, useAI = true) {
  // Clone so we don't mutate the original
  const updated = experiences.map(e => ({ ...e }))
  const matchLog = []

  for (const epfoEmp of epfoEmployers) {
    const result = matchEpfoEntry(epfoEmp, updated)

    // Grey zone: try AI
    let finalResult = result
    if (useAI && !result.matched && result.confidence >= 0.30 && result.expIdx !== null) {
      const expCompany = updated[result.expIdx]?.company || ""
      const aiResult   = await aiEmployerMatch(epfoEmp.legal_name, expCompany)
      if (aiResult.matched && aiResult.confidence >= 0.65) {
        finalResult = { ...result, matched: true, confidence: aiResult.confidence, nameMethod: "ai", aiReason: aiResult.reason }
      }
    }

    if (finalResult.matched && finalResult.expIdx !== null) {
      const exp = updated[finalResult.expIdx]
      exp.verificationStatus = "verified"
      exp.verificationSource = "UAN/EPFO"
      exp.legalName          = epfoEmp.legal_name
      exp.epfoEstabCode      = epfoEmp.estab_code || null
      exp.verifiedAt         = new Date().toISOString()
      exp.matchConfidence    = Math.round(finalResult.confidence * 100)

      matchLog.push({
        epfo_name:   epfoEmp.legal_name,
        resume_name: exp.company,
        confidence:  finalResult.confidence,
        method:      finalResult.nameMethod,
        status:      "verified",
      })
    } else {
      matchLog.push({
        epfo_name:  epfoEmp.legal_name,
        confidence: finalResult.confidence,
        status:     "no_match",
      })
    }
  }

  return { updatedExperiences: updated, matchLog }
}
