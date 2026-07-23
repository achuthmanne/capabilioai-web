/**
 * backup_v1_tables.mjs — one-off pre-Arena-V2-migration backup attempt (NOT RUN SUCCESSFULLY HERE)
 * ---------------------------------------------------------------------------
 * This script attempts a full row-level JSON export of every Arena V1 table
 * via the Supabase REST API, ahead of applying arena_v2_migration/001_schema.sql
 * and 002_admin_flag.sql. It failed to run in the environment it was written
 * in (`TypeError: fetch failed` on every table) because that sandbox's
 * outbound network access is restricted to an allowlist that does not
 * include the real Supabase project's REST endpoint.
 *
 * The actual pre-migration safety check that WAS completed instead is a
 * row-count + MD5-checksum fingerprint of every non-empty table, taken via
 * the Supabase MCP's execute_sql tool (which has its own allowlisted
 * channel) — see docs/backups/pre-arena-v2-migration-checksums.json.
 *
 * This file is left here as a genuinely usable script for anyone who DOES
 * have direct network access to the Supabase project (e.g. running it from
 * a real developer machine or CI runner) and wants an actual restorable
 * JSON export rather than just an integrity fingerprint. Run with:
 *   node backup_v1_tables.mjs
 * from the repo root, with SUPABASE_URL and SUPABASE_SERVICE_KEY set in .env.
 */
import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"
import { writeFileSync } from "node:fs"
dotenv.config({ path: "./.env" })

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const tables = [
  "profiles", "skill_assessments", "arena_submissions", "arena_missions",
  "arena_leaderboard", "pulse_posts", "jobs", "job_applications",
  "company_ratings", "problems", "arena_history", "post_interactions",
  "post_comments", "connections", "follows", "notifications",
  "role_profiles", "skills", "user_skill_scores", "studio_modules",
  "module_progress", "proof_artifacts", "skill_recommendations",
  "learning_events", "weak_topic_signals", "domain_intelligence",
  "career_timeline", "user_skills", "skill_endorsements", "companies",
  "career_events", "path_transitions", "professional_elo_history",
  "copilot_usage", "copilot_conversations", "copilot_sessions",
  "vault_documents", "org_members", "org_tasks", "org_events",
  "org_opportunities", "org_audit_log", "employment_history",
  "integrity_warnings", "arena_grading_jobs", "leaderboard_cache",
  "referral_codes", "streak_events", "career_tracks",
]

const backup = {
  takenAt: new Date().toISOString(),
  project: "eybchcqwbizjmzyrviri (capabilio)",
  reason: "pre-Arena-V2-migration snapshot (001_schema.sql + 002_admin_flag.sql)",
  tables: {},
}

const results = await Promise.all(tables.map(async (table) => {
  const { data, error } = await supabase.from(table).select("*")
  return { table, data, error }
}))

const summary = []
for (const { table, data, error } of results) {
  if (error) {
    summary.push(`${table}: ERROR — ${error.message}`)
    backup.tables[table] = { error: error.message }
    continue
  }
  backup.tables[table] = data
  summary.push(`${table}: ${data.length} rows`)
}

writeFileSync("./docs/backups/pre-arena-v2-migration-backup.json", JSON.stringify(backup, null, 2))
console.log(summary.join("\n"))
console.log("\nWrote docs/backups/pre-arena-v2-migration-backup.json")
