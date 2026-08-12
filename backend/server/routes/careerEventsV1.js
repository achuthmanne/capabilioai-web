/**
 * careerEventsV1.js — Career OS Workstream 2: the single unified timeline
 * endpoint for Career Timeline and Career Replay. docs/career-os-
 * implementation-plan.md §5c/§5b/§Workstream 2 Deliverable 2.
 *
 * GET /api/pro/v1/career/timeline
 *   - auth required, always scoped to the authenticated user (req.user.id)
 *   - "owner" context only in this workstream — no employer/public consumer
 *     exists yet (no consent table, see plan §1.4), so this route never
 *     serves another user's data. That's a deliberate, documented scope
 *     limit, not an oversight.
 *   - cursor pagination via `?cursor=<occurred_at>_<id>&limit=n`
 *   - default sort: occurred_at DESC (most recent first)
 *   - optional filters: `?event_type=`, `?visibility=`
 *   - lazily syncs profiles.experiences / profiles.certifications /
 *     career_timeline rows into career_events for this user before reading,
 *     via an idempotent upsert (see careerEventSync.js + backfill plan in
 *     the implementation doc) — never a side-effecting write on any table
 *     other than career_events itself.
 *
 * The frontend must never join profiles/experiences/certifications/
 * career_timeline itself — this endpoint is the only place that happens.
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { buildSyncRows } from "../lib/careerEventSync.js"

const router = Router()

const ALLOWED_EVENT_TYPES = new Set([
  "first_job", "company_join", "company_exit_clean", "company_exit_involuntary",
  "tenure_6m", "tenure_1y", "tenure_2y", "tenure_3y", "tenure_yearly",
  "promotion_verified", "promotion_self", "leadership_entry", "international_role",
  "company_switch_upward", "company_switch_lateral", "project_outcome",
  "skill_verified", "gap_short", "gap_long", "arena_professional",
  "certification_earned", "achievement_added", "weekly_pulse_milestone",
  "mentor_approved", "mentor_session_completed", "opportunity_transition",
  "company_review_submitted",
])
const ALLOWED_VISIBILITY = new Set(["public", "recruiter", "private", "confidential"])
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

async function syncUserCareerEvents(uid) {
  const [{ data: profile }, { data: legacyRows }] = await Promise.all([
    supabaseAdmin.from("profiles").select("experiences,certifications").eq("id", uid).single(),
    supabaseAdmin.from("career_timeline").select("id,user_id,category,title,start_date,end_date,visibility,verification_level,source,impact_summary,description").eq("user_id", uid),
  ])

  const experiences    = Array.isArray(profile?.experiences)    ? profile.experiences    : []
  const certifications = Array.isArray(profile?.certifications) ? profile.certifications : []

  const rows = buildSyncRows(uid, { experiences, certifications, legacyTimelineRows: legacyRows || [] })
  if (rows.length === 0) return { inserted: 0, attempted: 0 }

  // BUG FIX: career_events' idempotency guarantee is a PARTIAL unique index
  // (user_id, source_type, source_id, event_type) WHERE source_id IS NOT
  // NULL AND deleted_at IS NULL — not a plain unique constraint. PostgREST's
  // .upsert({ onConflict: "..." }) generates `ON CONFLICT (columns) DO
  // NOTHING` with no WHERE predicate, which Postgres cannot match against a
  // partial index (42P10: no unique or exclusion constraint matching the ON
  // CONFLICT specification) — this was throwing on every single sync call
  // for any user with real experiences/certifications data, surfaced to
  // users as "Couldn't load your timeline." A plpgsql function can express
  // the same partial-index-matching ON CONFLICT ... WHERE ... that the REST
  // upsert endpoint can't, so the sync goes through supabaseAdmin.rpc()
  // instead of .upsert() here. See migration fix_career_events_sync_upsert.
  const { error, data } = await supabaseAdmin.rpc("upsert_career_events_sync", { p_rows: rows })

  if (error) {
    console.error("[career/timeline sync]", error)
    return { inserted: 0, attempted: rows.length, error: error.message }
  }
  return { inserted: (data || []).length, attempted: rows.length }
}

function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const occurredAt = Buffer.from(cursor, "base64").toString("utf8")
    return occurredAt || null
  } catch {
    return null
  }
}
function encodeCursor(row) {
  return Buffer.from(row.occurred_at, "utf8").toString("base64")
}

router.get("/pro/v1/career/timeline", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT))
    const cursor = decodeCursor(req.query.cursor)

    const eventType = req.query.event_type
    if (eventType && !ALLOWED_EVENT_TYPES.has(eventType)) {
      return res.status(400).json({ error: "Invalid event_type filter" })
    }
    const visibilityFilter = req.query.visibility
    if (visibilityFilter && !ALLOWED_VISIBILITY.has(visibilityFilter)) {
      return res.status(400).json({ error: "Invalid visibility filter" })
    }

    // Sync before read — additive/idempotent only, see syncUserCareerEvents.
    const syncResult = await syncUserCareerEvents(uid)

    let q = supabaseAdmin
      .from("career_events")
      .select("id,event_type,source_type,evidence_source,verification_status,visibility,occurred_at,start_date,end_date,title,summary,payload,company_name,role_title")
      .eq("user_id", uid) // server-side visibility enforcement: owner context only, always scoped to self — see file header
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1)

    if (eventType) q = q.eq("event_type", eventType)
    if (visibilityFilter) q = q.eq("visibility", visibilityFilter)
    // Cursor pagination keyed on occurred_at only (not a compound occurred_at+id
    // key) — simpler and avoids fragile PostgREST .or() filter string
    // construction. Known limitation: two events sharing the exact same
    // occurred_at timestamp that straddle a page boundary could in theory
    // cause one to be skipped or repeated across pages. Acceptable for this
    // workstream's data volumes (§5c: 3 users, 1 experience, 1 certification
    // in production today); revisit with a compound keyset cursor if/when
    // event volume makes exact-timestamp collisions at a page boundary likely.
    if (cursor) q = q.lt("occurred_at", cursor)

    const { data, error } = await q
    if (error) throw error

    const hasMore = data.length > limit
    const page = hasMore ? data.slice(0, limit) : data
    const nextCursor = hasMore ? encodeCursor(page[page.length - 1]) : null

    res.json({
      events: page,
      pagination: { hasMore, nextCursor },
      ...(process.env.NODE_ENV !== "production" ? { _sync: syncResult } : {}),
    })
  } catch (err) {
    console.error("[career/timeline]", err)
    res.status(500).json({ error: "Failed to load career timeline" })
  }
})

export default router
