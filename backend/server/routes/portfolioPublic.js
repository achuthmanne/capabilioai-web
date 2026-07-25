/**
 * Public Portfolio Lookup — CAREER OS TRANCHE 6 / PRIORITY 6A privacy fix
 *
 * GET /api/portfolio/lookup/:identifier
 *
 * Problem this replaces: frontend/src/pages/Portfolio.jsx previously did
 * `supabase.from("profiles").select("*")` directly from the browser across
 * 6 different lookup strategies (by UUID, by username, by display_name
 * ilike full/word, by auth-session fallback, by own-portfolio fallback).
 * The `profiles` table's RLS SELECT policy is row-level only
 * (`auth.uid() = id OR (verified = true AND auth.role() = 'authenticated')`)
 * — it cannot restrict which COLUMNS come back. `select("*")` on a ~180
 * column legacy table meant any authenticated user viewing any verified
 * user's portfolio also received that user's real `email` and `uan_number`
 * (a government ID column), regardless of any consent/visibility toggle.
 *
 * Fix: move the entire lookup server-side behind this one narrow route.
 * The server still queries `profiles.*` (via service role, needed to
 * replicate the multi-strategy fallback search), but the HTTP response is
 * built from an explicit field whitelist — only the fields Portfolio.jsx
 * actually renders. No `select("*")` result ever reaches the client.
 *
 * This intentionally mirrors the *existing* Portfolio.jsx lookup order and
 * ud-construction field list exactly (see load() in Portfolio.jsx) so
 * portfolio behavior is unchanged for legitimate users — only the transport
 * changed from "browser reads the row" to "server reads the row, browser
 * gets a filtered projection of it."
 *
 * Visibility rules enforced here (previously only client-side dead toggles,
 * see career_os_ws0_privacy_toggle_columns migration / Tranche 3):
 *   - Non-owner viewers only ever see a row where `verified === true`
 *     (mirrors what the old RLS policy would have allowed through).
 *   - `certificates`/`certifications` are omitted for non-owner viewers
 *     when `cert_visible === false`.
 *   - Owners (viewer.id === row.id) always see their own full portfolio
 *     regardless of verified/cert_visible.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"

const router = Router()

const mkSlug = s => (s || "").toLowerCase().trim()
  .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")

const isUUID = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

// Explicit allowlist — only fields Portfolio.jsx's ud={} construction reads.
// Deliberately excludes: email, uan_number, phone, subscription_order_id,
// epfo_uan, and every other column not on this list (of the ~180 on the
// live `profiles` table).
function toPortfolioSafeFields(row, { includeCerts }) {
  return {
    id:                 row.id,
    display_name:       row.display_name ?? null,
    displayName:        row.displayName ?? null,
    full_name:          row.full_name ?? null,
    name:               row.name ?? null,
    username:           row.username ?? null,
    path:               row.path ?? null,
    keyword:            row.keyword ?? null,
    elo_rating:         row.elo_rating ?? null,
    eloRating:          row.eloRating ?? null,
    arena_streak:       row.arena_streak ?? null,
    arenaStreak:        row.arenaStreak ?? null,
    arena_completed:    row.arena_completed ?? null,
    arenaCompleted:     row.arenaCompleted ?? null,
    job_readiness:      row.job_readiness ?? null,
    jobReadiness:       row.jobReadiness ?? null,
    skill_graph:        row.skill_graph ?? null,
    skillGraph:         row.skillGraph ?? null,
    skills:             row.skills ?? null,
    strengths:          row.strengths ?? null,
    weak_areas:         row.weak_areas ?? null,
    weakAreas:          row.weakAreas ?? null,
    profile_summary:    row.profile_summary ?? null,
    profileSummary:     row.profileSummary ?? null,
    experiences:        row.experiences ?? null,
    resumeProjects:     row.resumeProjects ?? null,
    resume_projects:    row.resume_projects ?? null,
    education:          row.education ?? null,
    githubUsername:     row.githubUsername ?? null,
    github_username:    row.github_username ?? null,
    linkedInUrl:        row.linkedInUrl ?? null,
    linkedin_url:       row.linkedin_url ?? null,
    githubUrl:          row.githubUrl ?? null,
    github_url:         row.github_url ?? null,
    profilePhotoURL:    row.profilePhotoURL ?? null,
    profile_photo_url:  row.profile_photo_url ?? null,
    avatarUrl:          row.avatarUrl ?? null,
    location:           row.location ?? null,
    city:               row.city ?? null,
    createdAt:          row.createdAt ?? null,
    created_at:         row.created_at ?? null,
    // certificates/certifications are the one field on this list gated by
    // an explicit consent toggle (cert_visible) rather than always shown —
    // see career_os_ws0_privacy_toggle_columns migration (Tranche 3).
    certificates:       includeCerts ? (row.certificates ?? null)   : null,
    certifications:     includeCerts ? (row.certifications ?? null) : null,
    testimonials:       row.testimonials ?? null,
    recommendations:    row.recommendations ?? null,
    portfolioUrl:        row.portfolioUrl ?? null,
    portfolio_url:      row.portfolio_url ?? null,
    websiteUrl:         row.websiteUrl ?? null,
    website_url:        row.website_url ?? null,
    job_role:           row.job_role ?? null,
    verified:           !!row.verified,
  }
}

router.get("/portfolio/lookup/:identifier", async (req, res) => {
  try {
    const raw = decodeURIComponent(req.params.identifier || "").trim()
    if (!raw) return res.status(400).json({ error: "Missing identifier" })
    const lower = raw.toLowerCase()

    // Resolve viewer (optional — portfolios are public pages, but we need
    // the viewer's identity for the owner-fallback strategies and for the
    // owner-bypass on the verified/cert_visible gates below).
    let viewer = null
    const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
    if (token) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token)
        viewer = user || null
      } catch { /* invalid/expired token — treat as anonymous viewer */ }
    }

    let row = null

    // 0. UUID in URL — direct ID lookup
    if (isUUID(raw)) {
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("id", raw).maybeSingle()
      if (data) row = data
    }

    // 1. Exact username column match
    if (!row) {
      const { data } = await supabaseAdmin.from("profiles").select("*").eq("username", lower).maybeSingle()
      if (data) row = data
    }

    // 2. display_name slug match
    if (!row) {
      const nameQuery = lower.replace(/-/g, " ")
      const { data, error } = await supabaseAdmin.from("profiles").select("*")
        .ilike("display_name", `%${nameQuery}%`).limit(20)
      if (!error && data?.length) {
        row = data.find(p => mkSlug(p.display_name || "") === lower)
          || (data.length === 1 ? data[0] : null)
      }
    }

    // 3. Per-word partial name match
    if (!row) {
      const words = lower.split("-").filter(w => w.length > 2)
      for (const word of words) {
        const { data } = await supabaseAdmin.from("profiles").select("*")
          .ilike("display_name", `%${word}%`).limit(30)
        if (data?.length) {
          const match = data.find(p => mkSlug(p.display_name || "") === lower)
          if (match) { row = match; break }
        }
      }
    }

    // 4. Auth session fallback — covers camelCase-only profiles for the
    // viewer's OWN portfolio (matching against real DB fields, not email —
    // email never needs to leave the DB for this comparison).
    if (!row && viewer?.id) {
      const { data: bySession } = await supabaseAdmin.from("profiles").select("*")
        .eq("id", viewer.id).maybeSingle()
      if (bySession) {
        const authMeta = viewer.user_metadata || {}
        const allNames = [
          bySession.display_name, bySession.displayName,
          bySession.username, bySession.name,
          authMeta.full_name, authMeta.name, authMeta.display_name,
        ].filter(Boolean)
        const slugs = allNames.map(mkSlug)
        const firstWord = lower.split("-")[0]
        const nameMatch = slugs.some(s => s === lower)
          || allNames.some(n => (n || "").toLowerCase().startsWith(firstWord))
        if (nameMatch || lower === viewer.id) row = bySession
      }
    }

    // 5. Last resort — session user's own portfolio, matched via their real
    // auth email (available on the viewer object, never read off the row).
    if (!row && viewer?.id) {
      const { data: mine } = await supabaseAdmin.from("profiles").select("*")
        .eq("id", viewer.id).maybeSingle()
      if (mine) {
        const authMeta = viewer.user_metadata || {}
        const emailUser = mkSlug((viewer.email || "").split("@")[0])
        const possibleSlugs = [
          mkSlug(mine.display_name || ""), mkSlug(mine.displayName || ""),
          mkSlug(mine.username || ""), emailUser, mine.id,
          mkSlug(authMeta.full_name || ""), mkSlug(authMeta.name || ""),
        ].filter(Boolean)
        if (possibleSlugs.some(s => lower.includes(s.slice(0, 5)) || s.includes(lower.slice(0, 5)))) {
          row = mine
        }
      }
    }

    if (!row) return res.status(404).json({ error: "Portfolio not found." })

    const isOwner = !!viewer?.id && viewer.id === row.id

    // Visibility gate — replicates what the old RLS row policy would have
    // allowed a non-owner to see (verified=true), now actually enforced at
    // the column level too via the whitelist above.
    if (!isOwner && row.verified !== true) {
      return res.status(404).json({ error: "Portfolio not found." })
    }

    const includeCerts = isOwner || row.cert_visible !== false

    res.json({ profile: toPortfolioSafeFields(row, { includeCerts }) })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
