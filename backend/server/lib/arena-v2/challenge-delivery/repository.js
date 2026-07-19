/**
 * challenge-delivery/repository.js — Milestone 6
 * ---------------------------------------------------------------------------
 * Data-access for the two things this milestone actually owns: finding a
 * student's existing active instance (so "next challenge" doesn't spawn a
 * new one every time the page refreshes), and expiring abandoned ones.
 *
 * Everything else (issuing a fresh instance) is already owned by Milestones
 * 3-5 and reused as-is via service.js — this file doesn't duplicate any of
 * that.
 */
import { supabaseAdmin } from "../../supabase.js"

const ACTIVE_STATUSES = ["issued", "in_progress"]

export async function getActiveInstanceForUser(userId, { challengeType, role = null }) {
  let q = supabaseAdmin
    .from("av2_challenge_instances")
    .select("*")
    .eq("user_id", userId)
    .eq("challenge_type", challengeType)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)

  // Domain Challenges are scoped to the requested role; Common Challenges are
  // role-agnostic (role is null on every common instance, content_spec/01),
  // so no role filter is applied at all for them — there's exactly one
  // "active common instance" concept per user, not one per role.
  if (challengeType === "domain") {
    q = q.eq("role", role)
  }

  const { data, error } = await q
  if (error) throw error
  return data?.[0] || null
}

export async function markInstanceExpired(instanceId) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .update({ status: "expired" })
    .eq("id", instanceId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Bulk sweep for a future cron job (not built here — see
// docs/future-improvements.md). Exposed via an admin-only route so it's
// callable manually or by an external scheduler without new infra now.
export async function expireAbandonedInstances(now = new Date()) {
  const { data, error } = await supabaseAdmin
    .from("av2_challenge_instances")
    .update({ status: "expired" })
    .in("status", ACTIVE_STATUSES)
    .lt("expires_at", now.toISOString())
    .select("id")
  if (error) throw error
  return data || []
}
