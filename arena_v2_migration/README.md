# Arena V2 — Milestone 1: Database Schema

Implements the frozen spec (`arena_v2_blueprint.md` v1.1 + `arena_content_spec/`) as a runnable Supabase/Postgres migration. No architecture decisions here — this is a literal translation of the blueprint's pipeline diagram and the content spec's schema into tables.

## Running it

Supabase Dashboard → SQL Editor → paste `001_schema.sql` → Run. Idempotent (`IF NOT EXISTS` / `duplicate_object`-guarded), safe to re-run. Does not touch any existing table — Arena V1 (`challenges`, `challenge_attempts`, `streak_events`, `elo_history`, `leaderboard_snapshots`, `proof_artifacts`) is untouched and keeps running exactly as it does today.

## What's in it

**18 new tables**, all prefixed `av2_` to guarantee zero collision with Arena V1 or any other existing feature (there's already an unrelated per-user `skill_graph` table from the professional-path migration — ours is `av2_skill_dependency_graphs`, a static per-role content table, a different concept entirely).

Two groups:

**Content tables** (8) — authored, versioned, read-only to the client, written only by the service role: `av2_role_capabilities` (Capability Registry), `av2_skill_dependency_graphs`, `av2_scenario_packs`, `av2_datasets` + `av2_dataset_versions`, `av2_challenge_templates` + `av2_challenge_template_versions`, `av2_domain_challenge_grants`.

**Execution tables** (10) — written as students actually play, RLS-scoped to the owning user: `av2_challenge_instances` (the issued Challenge Payload snapshot — this is the row every version-pin rule in the spec depends on), `av2_submissions`, `av2_assessments`, `av2_portfolio_artifacts`, `av2_elo_ledger`, `av2_xp_ledger`, `av2_skill_progress`, `av2_challenge_progression_state`, `av2_challenge_payload_rejections`, `av2_challenge_analytics_events`.

Full table-to-spec mapping and the reasoning for every naming/scoping decision is documented inline in `001_schema.sql`'s header comment.

## Security posture

Every table has RLS enabled. No table has an `authenticated` INSERT/UPDATE policy — every write (issuing an instance, grading a submission, posting ELO/XP, publishing a portfolio artifact, granting Domain Challenge access) goes through a backend route using the service-role key, server-side, after validation. This mirrors the fix applied in the 2026-07-16 certification audit (no anon-executable RPC backdoors) rather than reopening that risk for Arena V2.

## What's next (Milestone 2)

Challenge Library CRUD + APIs, built against these tables. Nothing here is wired to a route yet — this milestone is schema only, per the agreed build order.
