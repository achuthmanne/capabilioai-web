/**
 * routes/collegeDirectory.js — Public Indian college/university lookup
 * ---------------------------------------------------------------------------
 * Backs the onboarding "College / University" typeahead. Distinct from
 * routes/college.js, which is the College Path institution-admin API
 * (roster/leaderboard/stats, auth-gated, keyed off the `institutions` table).
 * This one is a read-only public directory keyed off the `colleges` table —
 * no FK relationship to institutions, no auth required (same "public,
 * non-sensitive read" posture as routes/proofs.js and education.js's
 * GET /profile/:userId).
 *
 *   GET /api/college-directory/search?q=<term>&limit=<n>
 *
 * Data source: AICTE-derived public dataset (see colleges.source column),
 * imported via scripts/import-colleges.mjs. Designed to be re-seeded from
 * the official AISHE dataset later without any endpoint or schema change.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

// Postgres ILIKE special characters that would otherwise let a user's query
// string change the meaning of the pattern (e.g. "%" matching everything).
// Escaped, never stripped, so a literal "%" or "_" in a college name still
// matches correctly if a user actually types one.
function escapeIlike(input) {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

router.get("/search", async (req, res) => {
  const qRaw = typeof req.query.q === "string" ? req.query.q.trim() : ""
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 10))

  if (qRaw.length < 2) {
    // Too short to search meaningfully against ~39k rows — avoid a wasteful
    // near-full-table scan and a noisy dropdown of near-random matches.
    return res.status(200).json({ colleges: [] })
  }
  if (qRaw.length > 200) {
    return res.status(400).json({ error: "Query too long" })
  }

  const term = escapeIlike(qRaw)

  try {
    const { data, error } = await supabaseAdmin
      .from("colleges")
      .select("id, institute_name, state, district, institution_type")
      .ilike("institute_name", `%${term}%`)
      .order("institute_name", { ascending: true })
      .limit(limit)

    if (error) return res.status(500).json({ error: error.message })

    res.status(200).json({
      colleges: (data || []).map((c) => ({
        id: c.id,
        name: c.institute_name,
        state: c.state || "",
        district: c.district || "",
        type: c.institution_type || "",
      })),
    })
  } catch (err) {
    console.error("[college-directory] search", err)
    res.status(500).json({ error: "Internal error searching colleges" })
  }
})

export default router
