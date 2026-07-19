/**
 * setupTestDb.js — E2E test infra, TEST-ONLY
 * ---------------------------------------------------------------------------
 * Boots a real, disposable Postgres (via @electric-sql/pglite — Postgres
 * compiled to WASM, running in-process, no docker/root/network required) and
 * applies the ACTUAL Milestone 1 schema migrations
 * (arena_v2_migration/001_schema.sql + 002_admin_flag.sql) against it
 * unmodified, so the E2E test proves those exact SQL files are valid and
 * internally consistent — not a hand-written approximation of the schema.
 *
 * WHY THIS EXISTS: the real Supabase project this app runs on does not have
 * Supabase branching available (requires the Pro plan), so an isolated,
 * disposable copy of the real project isn't available. Rather than either
 * risk writing test data into the live production database, or skip
 * real-database integration testing entirely, this stands up a genuine
 * Postgres engine locally for the test to run against.
 *
 * Two things this schema assumes that a real Supabase project provides for
 * free, and this file stubs minimally so the migration SQL applies as-is:
 *   - Postgres roles `anon` / `authenticated` / `service_role` (referenced by
 *     `CREATE POLICY ... TO authenticated`)
 *   - `auth.uid()` (referenced by every RLS policy's USING clause) — stubbed
 *     to return NULL. This is fine for this test's purposes: the adapter
 *     connects as the table owner/superuser, and Postgres's RLS does not
 *     apply to the owner by default (no `FORCE ROW LEVEL SECURITY` is used
 *     anywhere in this schema), so RLS is bypassed exactly the way the real
 *     backend's service-role key bypasses it in production — the policies
 *     just need to exist, not actually evaluate true, for CREATE POLICY
 *     itself to succeed.
 *   - `public.profiles` — a minimal stand-in (just `id`, for every av2_*
 *     table's `REFERENCES profiles(id)` FK) rather than the real profiles
 *     table's full column set, which this schema doesn't need.
 */
import { PGlite } from "@electric-sql/pglite"
import { readFileSync } from "node:fs"

export async function setupTestDb({ schema001Path, schema002Path }) {
  const db = new PGlite()

  await db.exec(`
    DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;

    CREATE TABLE IF NOT EXISTS profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text,
      created_at timestamptz DEFAULT now()
    );
  `)

  await db.exec(readFileSync(schema001Path, "utf8"))
  await db.exec(readFileSync(schema002Path, "utf8"))

  return db
}
