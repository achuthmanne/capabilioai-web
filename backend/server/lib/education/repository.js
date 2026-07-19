/**
 * education/repository.js — Education redesign, Phase 1
 * ---------------------------------------------------------------------------
 * Data access for the new `education_profile` table (one row per user —
 * see migration create_education_profile_and_proof_type). Uses
 * supabaseAdmin exclusively — same backend-writes-only integrity pattern as
 * proof_objects: no client-writable RLS policy, only backend pipelines
 * write here.
 *
 * Deliberately holds ONLY identity facts (institution, degree, CGPA, etc.)
 * — academic projects/certifications/achievements are proof_objects, not
 * columns here. See academicBuilder.js for that half.
 */
import { supabaseAdmin } from "../supabase.js"

const TABLE = "education_profile"

const FIELD_MAP = {
  institution: "institution",
  university: "university",
  degree: "degree",
  branch: "branch",
  admissionYear: "admission_year",
  graduationYear: "graduation_year",
  cgpa: "cgpa",
  relevantCoursework: "relevant_coursework",
}

export async function getProfile(userId) {
  const { data, error } = await supabaseAdmin.from(TABLE).select("*").eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data
}

/**
 * Merges `fields` (camelCase, FIELD_MAP keys) into the user's education
 * profile, creating the row if it doesn't exist yet. Only fields that are
 * actually present and non-empty in `fields` overwrite existing values —
 * a resume upload with a blank CGPA never clobbers a CGPA the user already
 * entered manually, or one already tagged a higher-trust source (that
 * source-precedence check happens one level up, in routes/education.js,
 * since it needs to compare against field_sources).
 *
 * @param {string} userId
 * @param {object} fields camelCase FIELD_MAP keys
 * @param {string} source one of resume_import|transcript|user_added|institution_verified|capabilio_verified|ai_extracted|recruiter_verified
 */
export async function upsertProfile(userId, fields, source) {
  const existing = await getProfile(userId)
  const row = { user_id: userId, updated_at: new Date().toISOString() }
  const fieldSources = { ...(existing?.field_sources || {}) }

  for (const [camelKey, snakeKey] of Object.entries(FIELD_MAP)) {
    const incoming = fields[camelKey]
    const isEmpty = incoming === undefined || incoming === null || incoming === "" ||
      (Array.isArray(incoming) && incoming.length === 0)
    if (isEmpty) continue
    row[snakeKey] = incoming
    fieldSources[camelKey] = source
  }

  if (Object.keys(row).length <= 2) {
    // Nothing but user_id/updated_at — every field was empty. Don't write a
    // blank row over nothing, and don't touch an existing row for no reason.
    return existing
  }

  row.field_sources = fieldSources

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .upsert(row, { onConflict: "user_id" })
    .select().single()
  if (error) throw error
  return data
}
