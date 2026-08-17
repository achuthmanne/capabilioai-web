/**
 * portfolioVisibility.js — shared portfolio-visibility gate.
 *
 * Extracted from routes/portfolioPublic.js's GET /portfolio/lookup/:identifier
 * (the original implementation, with its full history of production
 * fixes — see the 2026-08-08/2026-08-10 comments preserved below) so every
 * endpoint that reads portfolio-scoped data (profile fields, Arena task
 * detail, etc.) enforces the exact same access rule, permanently in sync.
 * A visibility-check bug here is a real data-exposure risk (a candidate's
 * private portfolio becoming readable to a stranger), so this must never
 * have two independently-drifting copies.
 *
 * Rule: a non-owner, non-linked-institution-staff viewer may only see a
 * portfolio-scoped row when profiles.verified === true. Owners and staff
 * (or the admin/owner) of an institution the candidate is actually linked
 * to via institution_students — the same relationship the roster is built
 * on — always pass, regardless of verified.
 */
import { supabaseAdmin } from "./supabase.js"

// Resolves the requesting viewer from an optional bearer token — portfolios
// are public pages, so an absent/invalid token means "anonymous viewer",
// never a 401.
export async function resolvePortfolioViewer(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return null
  try {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    return user || null
  } catch {
    return null // invalid/expired token — treat as anonymous viewer
  }
}

// `row` must include at least { id, verified }. Returns
// { allowed, isOwner, isInstitutionStaffViewer }.
//
// 2026-08-08: institution staff bypass — placement cell / college admin
// need to open a linked student's real portfolio (e.g. from the roster),
// even when that student hasn't completed the separate "verified" review
// this gate otherwise requires for the general public. This is scoped, not
// a general bypass: it only applies when the viewer is an ACTIVE staff
// member of an institution the student is actually linked to via
// institution_students — an institution can't use this to view a student
// they have no roster relationship with.
//
// 2026-08-10 fix: this only ever checked the institution_staff table, but
// an institution's OWNER (institutions.admin_user_id) isn't necessarily
// also given a row there — institution_staff is for invited staff
// (professors, dept heads, placement officers), while ownership is
// tracked separately. Every other place in the codebase that checks this
// relationship (the canonical is_institution_staff()/is_institution_admin()
// SQL functions, used throughout RLS policies) already OR's both paths
// together — this now does too, matching the rest of the platform.
export async function checkPortfolioAccess(row, viewer) {
  const isOwner = !!viewer?.id && viewer.id === row.id
  let isInstitutionStaffViewer = false

  if (!isOwner && viewer?.id && row.verified !== true) {
    const { data: links } = await supabaseAdmin
      .from("institution_students")
      .select("institution_id")
      .eq("student_user_id", row.id)
    const institutionIds = [...new Set((links || []).map(l => l.institution_id))]
    if (institutionIds.length) {
      const [{ data: staffRow }, { data: ownedInstitution }] = await Promise.all([
        supabaseAdmin
          .from("institution_staff")
          .select("id")
          .eq("user_id", viewer.id)
          .eq("status", "active")
          .in("institution_id", institutionIds)
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("institutions")
          .select("id")
          .eq("admin_user_id", viewer.id)
          .in("id", institutionIds)
          .limit(1)
          .maybeSingle(),
      ])
      isInstitutionStaffViewer = !!staffRow || !!ownedInstitution
    }
  }

  const allowed = isOwner || isInstitutionStaffViewer || row.verified === true
  return { allowed, isOwner, isInstitutionStaffViewer }
}
