/**
 * routes/companyRegistry.js — MCA company master data lookup
 * ---------------------------------------------------------------------------
 * Read-only lookup over `company_registry` (see migration
 * company_registry_mca_master_data + scripts/importCompanyRegistry.js).
 * Same posture/pattern as routes/collegeDirectory.js: public, non-sensitive
 * government reference data, no auth required to search.
 *
 *   GET /api/company-registry/search?q=<term>&limit=<n>
 *
 * Deliberately NOT wired into EPFO verification or employerMatch.js in this
 * pass — real EPFO integration is still a stub (see routes/verify.js), and
 * the user explicitly chose to sequence a real EPFO vendor integration
 * before deeper wiring. This endpoint exists so the data is queryable (e.g.
 * a future "does this company exist" check, or an autocomplete on the
 * employer field) the moment that's wanted, without needing a schema or
 * import change.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { normalizeCompany } from "../lib/employerMatch.js"

const router = Router()

// Same ILIKE-escaping discipline as collegeDirectory.js — a literal % or _
// in a company name must still match correctly, and must never be able to
// widen the pattern into an unintended near-full-table scan.
function escapeIlike(input) {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

router.get("/search", async (req, res) => {
  const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10))

  if (qRaw.length < 3) {
    // Company names are longer/noisier than college names on average, and
    // this table is ~100x the size of `colleges` — a 2-char query here would
    // be a genuinely expensive scan even with the trigram index.
    return res.status(200).json({ companies: [] })
  }
  if (qRaw.length > 200) {
    return res.status(400).json({ error: "Query too long" })
  }

  // Search the normalized (suffix-stripped) name so "Capabilio" matches
  // "CAPABILIO VENTURES PRIVATE LIMITED" without the caller needing to know
  // the legal suffix — same normalization employerMatch.js already applies.
  const normalizedTerm = escapeIlike(normalizeCompany(qRaw))
  if (!normalizedTerm) return res.status(200).json({ companies: [] })

  try {
    const { data, error } = await supabaseAdmin
      .from("company_registry")
      .select("id, cin, company_name, status, category, roc_code, registration_date, state")
      .ilike("normalized_name", `%${normalizedTerm}%`)
      .order("company_name", { ascending: true })
      .limit(limit)

    if (error) return res.status(500).json({ error: error.message })

    res.status(200).json({
      companies: (data || []).map((c) => ({
        cin:               c.cin,
        name:              c.company_name,
        status:            c.status || "",
        category:          c.category || "",
        rocCode:           c.roc_code || "",
        registrationDate:  c.registration_date || null,
        state:             c.state || "",
      })),
    })
  } catch (err) {
    console.error("[company-registry] search", err)
    res.status(500).json({ error: "Internal error searching company registry" })
  }
})

export default router
