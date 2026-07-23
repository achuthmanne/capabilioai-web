-- ══════════════════════════════════════════════════════════════════════════════
-- CAPABILIO ARENA V2 — MILESTONE 2 SUPPLEMENT: admin flag
--
-- Why this exists: Milestone 2 (Challenge Library CRUD) needs a write gate
-- stronger than "any authenticated user." The codebase has no admin/role
-- model anywhere today. Rather than block Milestone 2 on designing a full
-- roles/permissions system (out of scope for the frozen spec, and a genuine
-- future improvement — see docs/future-improvements.md), this adds the
-- smallest possible primitive: one boolean column, default false, additive
-- and fully backward-compatible with every existing query against `profiles`.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin;

-- No RLS policy changes needed — profiles' existing RLS already restricts
-- writes to the owning user, and `is_admin` is set only via direct DB access
-- (Supabase dashboard / service-role script), never through any client-facing
-- profile-update endpoint. Confirm no existing "update my profile" route
-- accepts an arbitrary column set that could let a user flip their own flag —
-- flagged as a verification item, not assumed safe.
