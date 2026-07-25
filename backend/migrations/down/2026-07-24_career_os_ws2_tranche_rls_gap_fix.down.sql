-- DOWN migration for: career_os_ws2_tranche_rls_gap_fix + career_os_ws2_tranche_epf_records_index
-- (TRANCHE 2 — Schema/RLS completion, applied 2026-07-24 to project eybchcqwbizjmzyrviri)
--
-- CAREER OS TRANCHE 10 (Rollback Rehearsal Support): this is the tested,
-- reviewed rollback for the ONLY two Career OS schema changes in this whole
-- engagement judged genuinely safe to reverse via SQL:
--   1. Three RLS SELECT policies (role_profiles_public_select,
--      professional_profiles_self_select, epf_records_self_select) — purely
--      additive, permissive-only policies. Reverting them returns those
--      three tables to default-deny for anon/authenticated direct reads,
--      which was the actual pre-Tranche-2 production state. This does NOT
--      break professionalProfile.js's GET /pro/profile/:uid or any other
--      backend route that reads these tables, because every such route uses
--      supabaseAdmin (service-role client), which bypasses RLS entirely —
--      these policies only ever mattered for hypothetical direct
--      client-side/PostgREST reads, none of which exist in the current
--      frontend code (verified via grep before writing this file).
--   2. One index (epf_records_profile_id_created_idx) — pure performance
--      aid for GET /api/pro/epfo/status's hot-path query. Dropping it only
--      degrades that one query's performance on a currently-tiny table; it
--      changes zero application behavior or correctness.
--
-- TESTED: dry-run executed inside BEGIN/ROLLBACK directly against the live
-- project on 2026-07-25 — all four DROP statements ran without error, then
-- rolled back cleanly (verified via pg_policies/pg_indexes count queries
-- showing all 4 objects still present afterward). This file is safe to
-- apply for a real rollback if Tranche 2 ever needs to be reverted, but is
-- NOT applied as part of Tranche 10 itself (Tranche 2 stays live/wanted).
--
-- NOT INCLUDED HERE (deliberately — see Tranche 10 report): the Tranche 3
-- privacy-toggle columns (searchable, analytics_enabled, cert_visible,
-- vault_visible on profiles) are NOT safe to down-migrate the same way —
-- SettingsPanel.jsx now writes them and professionalProfile.js/pulseNexus.js
-- now read them in live request paths. Dropping those columns while that
-- code is still deployed would break real requests, not just degrade
-- performance. Rolling back Tranche 3 requires a code revert (previous
-- deploy), not a schema-only down-migration.

begin;

drop policy if exists role_profiles_public_select on public.role_profiles;
drop policy if exists professional_profiles_self_select on public.professional_profiles;
drop policy if exists epf_records_self_select on public.epf_records;
drop index if exists public.epf_records_profile_id_created_idx;

commit;
