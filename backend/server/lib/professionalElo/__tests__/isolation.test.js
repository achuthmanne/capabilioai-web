/**
 * Skill Rating v2 isolation guard (2026-07-26).
 *
 * Product rule (see docs/elo-engine-v2-architecture.md §D, professionalProfile.js
 * DEPRECATED comment): the legacy profile-completeness pseudo-ELO
 * (computeEloSignals() / profiles.role_elo,market_elo,proof_elo,mobility_elo,
 * aura_score,profile_completeness) must NEVER write to the new bounded,
 * verification-gated modifiers (professional_elo_state.experience_bonus_elo /
 * cert_bonus_elo), and no profile-CRUD route may mutate those columns
 * directly. This test source-scans the relevant files so a future edit that
 * violates the isolation is caught immediately, not discovered in production.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "../../../routes")

const profileSrc = readFileSync(path.join(routesDir, "professionalProfile.js"), "utf8")
const bonusSrc = readFileSync(path.join(__dirname, "../verifiedBonuses.js"), "utf8")
const certRoutesSrc = readFileSync(path.join(routesDir, "professionalCertifications.js"), "utf8")

const NEW_MODIFIER_FIELDS = ["experience_bonus_elo", "cert_bonus_elo"]

describe("Skill Rating v2 — legacy/new track isolation", () => {
  test("professionalProfile.js only touches the new bonus columns through the one explicit recomputeExperienceBonus() import/call", () => {
    // Strip comments/JSDoc (which legitimately *name* the new fields in
    // prose to explain the isolation rule) and the one sanctioned call site,
    // so we can assert there is no OTHER direct reference in live code (i.e.
    // no one adds a second, uncontrolled write path here later).
    const withoutSanctionedUsage = profileSrc
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map(line => line.replace(/\/\/.*$/, ""))
      .filter(line => !line.includes('import { recomputeExperienceBonus }') && !line.includes("recomputeExperienceBonus(supabaseAdmin"))
      .join("\n")

    for (const field of NEW_MODIFIER_FIELDS) {
      assert.ok(
        !withoutSanctionedUsage.includes(field),
        `professionalProfile.js must not directly reference "${field}" outside the sanctioned recomputeExperienceBonus() call — ` +
        `all writes to Skill Rating v2 bonus columns must go through verifiedBonuses.js`
      )
    }
  })

  test("computeEloSignals() (legacy pseudo-ELO) never references the new bounded modifier fields", () => {
    const fnMatch = profileSrc.match(/function computeEloSignals\([\s\S]*?\n}\n/)
    assert.ok(fnMatch, "computeEloSignals function should still exist (frozen, not deleted)")
    const fnBody = fnMatch[0]
    for (const field of NEW_MODIFIER_FIELDS) {
      assert.ok(!fnBody.includes(field), `computeEloSignals() must not reference "${field}"`)
    }
  })

  test("professionalProfile.js is marked DEPRECATED for the legacy pseudo-ELO track", () => {
    assert.ok(/DEPRECATED/.test(profileSrc), "expected a DEPRECATED marker comment above computeEloSignals()")
  })

  test("verifiedBonuses.js (the only writer of the new bonus columns) never writes to the legacy profiles ELO fields", () => {
    const codeOnly = bonusSrc.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(l => l.replace(/\/\/.*$/, "")).join("\n")
    const LEGACY_FIELDS = ["role_elo", "market_elo", "proof_elo", "mobility_elo", "elo_rating", "aura_score", "profile_completeness"]
    for (const field of LEGACY_FIELDS) {
      assert.ok(!codeOnly.includes(field), `verifiedBonuses.js must not reference legacy field "${field}"`)
    }
  })

  test("verifiedBonuses.js only writes to professional_elo_state / professional_elo_events / reads from the tables it needs", () => {
    const fromCalls = [...bonusSrc.matchAll(/\.from\((["'`])([^"'`]+)\1\)/g)].map(m => m[2])
    const allowed = new Set([
      "professional_profiles", "epf_records", "profiles",
      "professional_elo_state", "professional_elo_events", "professional_certifications",
    ])
    for (const table of fromCalls) {
      assert.ok(allowed.has(table), `verifiedBonuses.js queried unexpected table "${table}"`)
    }
  })

  test("professional_certifications RLS-facing routes never let a user set their own verification_status to verified", () => {
    // The only place verification_status: "verified" may be assigned is
    // inside the /upload route's server-computed nextStatus branch, never
    // taken directly from req.body.
    assert.ok(!/verification_status:\s*req\.body/.test(certRoutesSrc), "verification_status must never be assigned directly from req.body")
  })

  test("no route outside professionalElo.js / verifiedBonuses.js / professionalCertifications.js writes to professional_elo_state", () => {
    const offenders = []
    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) { walk(full); continue }
        if (!entry.endsWith(".js") || entry.includes(".test.")) continue
        if (["professionalElo.js", "professionalCertifications.js"].includes(entry)) continue
        const src = readFileSync(full, "utf8")
        if (src.includes('.from("professional_elo_state")')) offenders.push(full)
      }
    }
    walk(routesDir)
    assert.deepEqual(offenders, [], "only professionalElo.js/professionalCertifications.js (routes) and verifiedBonuses.js/eloEngine.js (lib) may touch professional_elo_state directly")
  })
})
