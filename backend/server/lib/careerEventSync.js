/**
 * careerEventSync.js — Career OS Workstream 2: pure mapping functions that
 * turn real source records (profiles.experiences, profiles.certifications,
 * legacy career_timeline rows) into `career_events` rows.
 *
 * docs/career-os-implementation-plan.md §5c (audit) / §5b (architecture
 * decision). Kept pure and dependency-free (no Supabase calls in here) so
 * the mapping logic is unit-testable without a DB — see careerEventSync.test.js.
 *
 * HARD RULES (from the trigger audit in §5c — do not violate):
 *   - Every row this module produces sets elo_delta: 0. career_events has a
 *     BEFORE UPDATE trigger that applies ELO deltas to profiles when
 *     elo_delta != 0 and verification_level >= 2. Sync/backfill must never
 *     cause that side effect — ELO application is explicitly out of scope
 *     for this workstream.
 *   - Never emit event_type: 'first_job'. career_events has an AFTER INSERT
 *     trigger that flips profiles.path_status to 'professional' when it
 *     sees a 'first_job' event with verification_level >= 3. That's reserved
 *     for a real first-job-detection flow, not a data-sync job.
 */

const EVENT_TYPES = new Set([
  "first_job", "company_join", "company_exit_clean", "company_exit_involuntary",
  "tenure_6m", "tenure_1y", "tenure_2y", "tenure_3y", "tenure_yearly",
  "promotion_verified", "promotion_self", "leadership_entry", "international_role",
  "company_switch_upward", "company_switch_lateral", "project_outcome",
  "skill_verified", "gap_short", "gap_long", "arena_professional",
  "certification_earned", "achievement_added", "weekly_pulse_milestone",
  "mentor_approved", "mentor_session_completed", "opportunity_transition",
  "company_review_submitted",
])

const EVIDENCE_SOURCES = new Set([
  "self_claimed", "resume_derived", "employer_verified", "document_verified", "capabilio_verified",
])

// Real production experience entries store dates as "MM/YYYY" (confirmed by
// querying live profiles.experiences during this workstream's audit — NOT
// ISO strings), which `new Date("08/2017").toISOString()` throws on
// (Invalid Date). This parser accepts ISO ("2022-01-01"), "YYYY-MM",
// "MM/YYYY", and "Present"/empty (→ null), and NEVER throws — an
// unparseable date means "skip this event, it can't be placed on a
// chronological timeline," not "crash the whole sync."
export function parseFlexibleDate(input) {
  if (!input || typeof input !== "string") return null
  const s = input.trim()
  if (!s || /^present$/i.test(s)) return null

  // MM/YYYY (real production experience-entry format)
  let m = s.match(/^(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, mm, yyyy] = m
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1))
    return isNaN(d.getTime()) ? null : d
  }
  // YYYY-MM
  m = s.match(/^(\d{4})-(\d{1,2})$/)
  if (m) {
    const [, yyyy, mm] = m
    const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, 1))
    return isNaN(d.getTime()) ? null : d
  }
  // ISO / anything Date can parse natively (YYYY-MM-DD, full ISO timestamps)
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

// Deterministic, human-readable source ids — no stable primary key exists on
// profiles.experiences[]/certifications[] entries (they're plain JSONB
// objects), so the idempotency key is built from stable-enough fields
// instead. Two entries with identical company+role+startDate collapse into
// the same synced event, which is the correct behavior (they're the same
// real-world fact even if entered twice).
function slug(...parts) {
  return parts.map(p => String(p ?? "").trim().toLowerCase().replace(/\s+/g, "-")).join("|")
}

function baseRow(uid, { eventType, sourceType, sourceId, occurredAt, startDate, endDate, title, summary, evidenceSource, verified, visibility, payload }) {
  if (!EVENT_TYPES.has(eventType)) throw new Error(`careerEventSync: unknown event_type "${eventType}"`)
  if (evidenceSource && !EVIDENCE_SOURCES.has(evidenceSource)) throw new Error(`careerEventSync: unknown evidence_source "${evidenceSource}"`)
  return {
    user_id: uid,
    event_type: eventType,
    source_type: sourceType,
    source_id: sourceId,
    occurred_at: occurredAt,
    start_date: startDate || null,
    end_date: endDate || null,
    title: title || null,
    summary: summary || null,
    payload: payload || {},
    evidence_source: evidenceSource || "self_claimed",
    verification_status: verified ? "verified" : "self_claimed",
    visibility: visibility || "recruiter",
    elo_delta: 0, // hard rule — see file header
  }
}

/**
 * One experience entry → 1 or 2 events (join, and exit if it has ended).
 * `entry` matches the shape written by Orbit.jsx/Aura.jsx's experience form:
 * { title|role, company, startDate, endDate, isCurrent|current, description,
 *   skills|tags, verified, _source }.
 */
export function mapExperienceToEvents(uid, entry) {
  if (!entry?.company && !entry?.title && !entry?.role) return []
  const company  = entry.company || entry.org || "Unknown company"
  const roleName = entry.title || entry.role || "Role"
  const isCurrent = entry.isCurrent || entry.current || !entry.endDate || entry.endDate === "Present"
  const evidenceSource = entry._source === "resume" ? "resume_derived" : "self_claimed"
  const sourceIdRoot = slug("exp", company, roleName, entry.startDate)

  const events = []
  const startParsed = parseFlexibleDate(entry.startDate)
  if (startParsed) {
    events.push(baseRow(uid, {
      eventType: "company_join",
      sourceType: "experiences_sync",
      sourceId: `${sourceIdRoot}:join`,
      occurredAt: startParsed.toISOString(),
      startDate: startParsed.toISOString().slice(0, 10),
      title: `Joined ${company}`,
      summary: `Started as ${roleName} at ${company}`,
      evidenceSource,
      verified: !!entry.verified,
      visibility: "recruiter",
      payload: { company, role: roleName, skills: entry.skills || entry.tags || [] },
    }))
  }
  const endParsed = parseFlexibleDate(entry.endDate)
  if (!isCurrent && endParsed && startParsed) {
    events.push(baseRow(uid, {
      eventType: "company_exit_clean",
      sourceType: "experiences_sync",
      sourceId: `${sourceIdRoot}:exit`,
      occurredAt: endParsed.toISOString(),
      endDate: endParsed.toISOString().slice(0, 10),
      title: `Left ${company}`,
      summary: `Ended tenure as ${roleName} at ${company}`,
      evidenceSource,
      verified: !!entry.verified,
      visibility: "recruiter",
      payload: { company, role: roleName },
    }))
  }
  return events
}

/**
 * One certification entry → certification_earned event.
 * `cert` matches the shape written by resume import (this session's earlier
 * fixes): { name, issuer, date, credentialId, verificationStatus, _source }.
 */
export function mapCertificationToEvent(uid, cert) {
  const name = typeof cert === "string" ? cert : cert?.name
  if (!name) return null
  const dateStr = (typeof cert === "object" && cert?.date) || null
  const parsedDate = parseFlexibleDate(dateStr)
  const verified = typeof cert === "object" && cert?.verificationStatus === "verified"
  const evidenceSource = verified
    ? "document_verified"
    : (typeof cert === "object" && cert?._source === "resume") ? "resume_derived" : "self_claimed"

  return baseRow(uid, {
    eventType: "certification_earned",
    sourceType: "certifications_sync",
    sourceId: slug("cert", name, dateStr || "undated"),
    occurredAt: (parsedDate || new Date()).toISOString(),
    title: `Earned ${name}`,
    summary: (typeof cert === "object" && cert?.issuer) ? `Issued by ${cert.issuer}` : null,
    evidenceSource,
    verified,
    visibility: "private", // certs default private until the user opts to share (blueprint privacy-by-default rule)
    payload: { name, issuer: (typeof cert === "object" ? cert?.issuer : null) || null },
  })
}

/**
 * Legacy career_timeline row → one career_events row. Table is empty in
 * production today (§5c), but this must still be correct for any future
 * writer of career_timeline (its API/route remain live) or a different
 * environment's data.
 */
const TIMELINE_CATEGORY_TO_EVENT_TYPE = {
  professional_experience: "company_join",
  internship: "company_join",
  certification: "certification_earned",
  personal_project: "project_outcome",
  academic_project: "project_outcome",
  arena_challenge: "arena_professional",
  education: "project_outcome", // no dedicated education event type exists yet; safe catch-all
}

export function mapLegacyTimelineRowToEvent(row) {
  if (!row?.id || !row?.user_id) return null
  const startParsed = parseFlexibleDate(row.start_date)
  if (!startParsed) return null // no valid date — can't place it on a timeline, skip rather than crash
  const eventType = TIMELINE_CATEGORY_TO_EVENT_TYPE[row.category] || "project_outcome"
  const evidenceSource =
    row.verification_level >= 3 ? "document_verified" :
    (row.source === "linkedin_import" || row.source === "github_import") ? "resume_derived" :
    "self_claimed"

  return baseRow(row.user_id, {
    eventType,
    sourceType: "career_timeline_backfill",
    sourceId: row.id, // real stable uuid — unlike experiences/certs, no slug needed
    occurredAt: startParsed.toISOString(),
    startDate: row.start_date,
    endDate: row.end_date,
    title: row.title,
    summary: row.impact_summary || row.description || null,
    evidenceSource,
    verified: row.verification_level >= 3,
    visibility: ["public", "recruiter", "private"].includes(row.visibility) ? row.visibility : "private",
    payload: { category: row.category, company: row.company || null, role: row.role || null, migrated_from: "career_timeline" },
  })
}

/**
 * Compose every source into one flat row list ready for an idempotent
 * upsert on (user_id, source_type, source_id, event_type).
 */
export function buildSyncRows(uid, { experiences = [], certifications = [], legacyTimelineRows = [] } = {}) {
  const rows = []
  for (const e of experiences) rows.push(...mapExperienceToEvents(uid, e))
  for (const c of certifications) {
    const row = mapCertificationToEvent(uid, c)
    if (row) rows.push(row)
  }
  for (const t of legacyTimelineRows) {
    const row = mapLegacyTimelineRowToEvent(t)
    if (row) rows.push(row)
  }
  return rows
}
