/**
 * Company Module — Career OS Workstream 5 (SCOPED, MINIMAL, REAL pass).
 *
 * Mounted at /api/pro/v1/company in server.js. Every route is gated by
 * COMPANY_MODULE_V1_ENABLED (backend flag, mirrors skillPulseV2.js's
 * V2_FLAG_ENABLED / mentorMarketplace.js's MENTOR_MARKETPLACE_V1_ENABLED
 * pattern) — while off, every route in this file 404s (not 403 — a company
 * directory being "not found" leaks less than a 403 that confirms the
 * feature exists but is locked).
 *
 * This is the scoped, minimal version of the Company module: reuses the
 * existing (0-row, now-RLS'd) `companies` table as-is, the 3 additive
 * `profiles` columns, and the one new `company_memberships` table — no
 * fuzzy-matching/reconciliation engine, no alias table. See
 * career_os_ws5_company_module_migration.sql header for the full scope note
 * and docs/company-module-ws5-design-proposal.md for the deferred full design.
 *
 *   GET   /:id               — public company overview (name/domain/sector/logo)
 *   GET   /me                — caller's own company_id/link_state/visibility (+ overview if linked)
 *   POST  /me/link            — link the caller to a company (linked_independently)
 *   POST  /create             — create a brand-new company row (409 if a
 *                               normalized-name match already exists), then
 *                               link the caller to it in the same request
 *   PATCH /me/visibility      — toggle company_visibility_public
 *   GET   /search?q=          — ilike search on companies.name/normalized_name
 *
 * Rate limiting: no dedicated per-route limiter here. This codebase's only
 * rate-limit primitive is server.js's createRateLimiter (a custom in-house
 * implementation, not express-rate-limit) applied broadly via
 * `app.use("/api", generalLimiter)` (60s / 100 req) — that blanket limiter
 * already covers every route in this file, including the two mutating ones
 * (link, visibility). A tighter dedicated limiter for just those two would
 * be new infra beyond what this scoped pass calls for; if abuse is observed
 * in practice, add `app.use("/api/pro/v1/company/me", strictLimiter)` in
 * server.js (same pattern already used for /api/verify) rather than
 * inventing a new limiter here.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { checkIdempotencyKey, recordIdempotentResponse, hashRequestBody } from "../lib/company/idempotency.js"
import { normalizeCompanyName, findDuplicateCompany } from "../lib/company/normalize.js"

const router = Router()

// Backend release gate. Default false — mirrors frontend/src/config/
// featureFlags.js's career_os_company default (false) so the two can't drift
// out of sync by accident. Env var name intentionally distinct from the
// frontend's VITE_FF_CAREER_OS_COMPANY (this is the backend-authoritative
// check; the frontend flag only hides the nav item / stops data-fetching —
// this is the real gate).
export const COMPANY_MODULE_V1_ENABLED = process.env.COMPANY_MODULE_V1_ENABLED === "true"

function requireFlag(req, res, next) {
  if (!COMPANY_MODULE_V1_ENABLED) {
    // 404, not 403 — see file header rationale.
    return res.status(404).json({ error: "not_found" })
  }
  next()
}

router.use(requireFlag, requireAuth)

// Fields safe to expose publicly for a company overview. Deliberately no
// epfo_codes (internal reconciliation data) or tier (internal partner tier).
const PUBLIC_COMPANY_FIELDS = "id, name, domain, sector, logo_url"

function toOverview(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    domain: row.domain || null,
    industry: row.sector || null, // `sector` in the existing schema maps to "industry" in the API surface
    size_band: null, // not present in the existing companies table in this pass — placeholder for a future column, never fabricated
    logo_url: row.logo_url || null,
  }
}

// Never expose the raw enum to a client that might render it verbatim by
// mistake — the frontend also translates it, but the backend response
// includes both the raw value (for any programmatic caller) and this plain
// sentence so the frontend doesn't have to duplicate the copy logic.
function linkStateSentence(state, companyName) {
  switch (state) {
    case "joined_via_capabilio":
      return companyName ? `You joined ${companyName} through Capabilio.` : "You joined your current employer through Capabilio."
    case "linked_independently":
      return companyName ? `You've linked yourself to ${companyName}.` : "You've linked yourself to a company."
    case "employer_not_partner":
      return companyName ? `${companyName} isn't a Capabilio partner yet, but you're linked to it.` : "Your employer isn't a Capabilio partner yet, but you're linked to it."
    case "employer_verified_partner":
      return companyName ? `${companyName} is a verified Capabilio partner, and your employment there is verified.` : "Your employer is a verified Capabilio partner."
    case "unemployed":
    default:
      return "You're not linked to a company yet."
  }
}

// NOTE ON ROUTE ORDER: Express matches routes in registration order, and
// "/me" and "/search" would otherwise be swallowed by the "/:id" wildcard
// below (a GET to /me would match :id="me" first). All literal-path routes
// (/me, /me/link, /me/visibility, /search) are registered before the /:id
// catch-all for exactly this reason — do not move /:id above them.

// ── GET /me — caller's own link state ────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("company_id, company_link_state, company_visibility_public")
      .eq("id", req.user.id)
      .maybeSingle()
    if (error) throw error
    if (!profile) return res.status(404).json({ error: "profile_not_found" })

    let company = null
    if (profile.company_id) {
      const { data: companyRow, error: companyErr } = await supabaseAdmin
        .from("companies")
        .select(PUBLIC_COMPANY_FIELDS)
        .eq("id", profile.company_id)
        .maybeSingle()
      if (companyErr) throw companyErr
      company = toOverview(companyRow)
    }

    const linkState = profile.company_link_state || "unemployed"
    res.json({
      company_id: profile.company_id || null,
      company_link_state: linkState,
      company_link_state_sentence: linkStateSentence(linkState, company?.name),
      company_visibility_public: !!profile.company_visibility_public,
      company,
    })
  } catch (e) {
    console.error("[company:me]", e.message)
    res.status(500).json({ error: "internal_error" })
  }
})

// Shared by /me/link and /create — links a profile to an already-resolved
// company row. Always lands on 'linked_independently' in this scoped
// build (no fuzzy-matching / reconciliation engine); promotion to
// joined_via_capabilio / employer_verified_partner is future work.
async function linkProfileToCompany(userId, company) {
  const { data: updated, error: updateErr } = await supabaseAdmin
    .from("profiles")
    .update({ company_id: company.id, company_link_state: "linked_independently" })
    .eq("id", userId)
    .select("company_id, company_link_state")
    .single()
  if (updateErr) throw updateErr
  return {
    success: true,
    company_id: updated.company_id,
    company_link_state: updated.company_link_state,
    company_link_state_sentence: linkStateSentence(updated.company_link_state, company.name),
  }
}

// ── POST /me/link — link caller to a company ─────────────────────────────
router.post("/me/link", async (req, res) => {
  const endpoint = "/pro/v1/company/me/link"
  const idempotencyKey = req.headers["idempotency-key"]
  if (!idempotencyKey) return res.status(400).json({ error: "Idempotency-Key header is required" })

  try {
    const check = checkIdempotencyKey({ idempotencyKey, userId: req.user.id, endpoint, requestBody: req.body })
    if (check.conflict) return res.status(409).json({ error: "Idempotency-Key reused with a different request" })
    if (check.replay) return res.status(check.status).json(check.payload)

    const { company_id } = req.body || {}
    if (!company_id) {
      const body = { error: "company_id is required" }
      recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 400, payload: body })
      return res.status(400).json(body)
    }

    const { data: company, error: companyErr } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .eq("id", company_id)
      .maybeSingle()
    if (companyErr) throw companyErr
    if (!company) {
      const body = { error: "company_not_found" }
      recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 404, payload: body })
      return res.status(404).json(body)
    }

    const body = await linkProfileToCompany(req.user.id, company)
    recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 200, payload: body })
    return res.status(200).json(body)
  } catch (e) {
    console.error("[company:link]", e.message)
    return res.status(500).json({ error: "internal_error" })
  }
})

// ── POST /create — create a brand-new company + link caller to it ────────
// Body: { name (required), domain?, sector? }. Server-side precondition,
// NOT client-trusted: re-runs the same normalized-name check /search relies
// on before inserting, and rejects with 409 + the existing match if one is
// found — a client cannot trivially create "Acme Inc" and "acme inc " as
// two separate rows. If genuinely no match, inserts via the service-role
// client (normalized_name computed server-side by the same function
// /search's normalization logic is built on) and immediately links the
// caller in the same request, avoiding a second round-trip.
router.post("/create", async (req, res) => {
  const endpoint = "/pro/v1/company/create"
  const idempotencyKey = req.headers["idempotency-key"]
  if (!idempotencyKey) return res.status(400).json({ error: "Idempotency-Key header is required" })

  try {
    const check = checkIdempotencyKey({ idempotencyKey, userId: req.user.id, endpoint, requestBody: req.body })
    if (check.conflict) return res.status(409).json({ error: "Idempotency-Key reused with a different request" })
    if (check.replay) return res.status(check.status).json(check.payload)

    const { name, domain, sector } = req.body || {}
    const trimmedName = typeof name === "string" ? name.trim() : ""
    if (!trimmedName) {
      const body = { error: "name is required" }
      recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 400, payload: body })
      return res.status(400).json(body)
    }

    const normalized = normalizeCompanyName(trimmedName)

    // Precondition check — exact-normalized-match only (no fuzzy/trigram
    // matching in this scoped build; see normalize.js header). Query by the
    // computed normalized value directly rather than fetching the whole
    // table, then run it through the same pure findDuplicateCompany used in
    // tests, for one source of truth on "what counts as a duplicate".
    const { data: candidates, error: dupErr } = await supabaseAdmin
      .from("companies")
      .select("id, name, normalized_name, domain, sector, logo_url")
      .eq("normalized_name", normalized)
      .limit(1)
    if (dupErr) throw dupErr

    const existingMatch = findDuplicateCompany(trimmedName, candidates || [])
    if (existingMatch) {
      const body = { error: "company_already_exists", company: toOverview(existingMatch) }
      recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 409, payload: body })
      return res.status(409).json(body)
    }

    const { data: created, error: insertErr } = await supabaseAdmin
      .from("companies")
      .insert({
        name: trimmedName,
        normalized_name: normalized,
        domain: typeof domain === "string" && domain.trim() ? domain.trim() : null,
        sector: typeof sector === "string" && sector.trim() ? sector.trim() : null,
      })
      .select("id, name, domain, sector, logo_url")
      .single()
    if (insertErr) throw insertErr

    const linkResult = await linkProfileToCompany(req.user.id, created)
    const body = { ...linkResult, company: toOverview(created) }
    recordIdempotentResponse({ idempotencyKey, userId: req.user.id, endpoint, requestHash: check.requestHash, status: 201, payload: body })
    return res.status(201).json(body)
  } catch (e) {
    console.error("[company:create]", e.message)
    return res.status(500).json({ error: "internal_error" })
  }
})

// ── PATCH /me/visibility — toggle company_visibility_public ─────────────
router.patch("/me/visibility", async (req, res) => {
  try {
    const { company_visibility_public } = req.body || {}
    if (typeof company_visibility_public !== "boolean") {
      return res.status(400).json({ error: "company_visibility_public must be a boolean" })
    }
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ company_visibility_public })
      .eq("id", req.user.id)
      .select("company_visibility_public")
      .single()
    if (error) throw error
    res.json({ success: true, company_visibility_public: data.company_visibility_public })
  } catch (e) {
    console.error("[company:visibility]", e.message)
    res.status(500).json({ error: "internal_error" })
  }
})

// ── GET /search?q= — simple ilike search, up to 20 results ───────────────
router.get("/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim()
    if (!q) return res.json({ companies: [] })
    // No separate alias table in this scoped build — matches against name
    // and normalized_name only, case-insensitive substring.
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select("id, name, logo_url")
      .or(`name.ilike.%${q}%,normalized_name.ilike.%${q}%`)
      .limit(20)
    if (error) throw error
    res.json({ companies: data || [] })
  } catch (e) {
    console.error("[company:search]", e.message)
    res.status(500).json({ error: "internal_error" })
  }
})

// ── GET /:id — public company overview (registered LAST — see route-order note above) ──
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("companies")
      .select(PUBLIC_COMPANY_FIELDS)
      .eq("id", req.params.id)
      .maybeSingle()
    if (error) throw error
    if (!data) return res.status(404).json({ error: "company_not_found" })
    res.json({ company: toOverview(data) })
  } catch (e) {
    console.error("[company:get]", e.message)
    res.status(500).json({ error: "internal_error" })
  }
})

export default router
