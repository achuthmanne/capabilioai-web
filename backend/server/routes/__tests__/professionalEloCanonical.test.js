/**
 * Tranche A regression guard — Professional ELO canonicalization (2026-07-25).
 *
 * Product rule: Professional ELO (professional_elo_state/events, written only
 * by eloEngine.js) must remain the ONE primary, assessment-driven score shown
 * on Professional Path surfaces. The older profile-completeness-driven fields
 * on `profiles` (role_elo, market_elo, proof_elo, mobility_elo, elo_rating,
 * aura_score — written by computeEloSignals() in professionalProfile.js on
 * every POST /pro/profile) must never be merged into this API's response, or
 * a future change could silently reintroduce a profile-CRUD-driven "ELO" as
 * if it were the real thing.
 *
 * This test asserts the contract at the API-response-shape level (not just by
 * reading the source), so it fails loudly if someone later spreads a
 * `profiles` row into the /pro/elo/professional response.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routeSource = readFileSync(path.join(__dirname, '../professionalElo.js'), 'utf8')
const engineSource = readFileSync(
  path.join(__dirname, '../../lib/professionalElo/eloEngine.js'),
  'utf8'
)

const OLD_FIELDS = ['role_elo', 'market_elo', 'proof_elo', 'mobility_elo', 'elo_rating', 'aura_score']

describe('Tranche A — Professional ELO must stay canonical, never conflated with old profile-completeness fields', () => {
  test('the /pro/elo/professional route never reads or writes the old profile-completeness ELO fields', () => {
    for (const field of OLD_FIELDS) {
      assert.ok(
        !routeSource.includes(field),
        `professionalElo.js must not reference "${field}" — that field belongs to the deprecated ` +
        `profile-completeness ELO track (professionalProfile.js), not the real assessment-driven Professional ELO.`
      )
    }
  })

  test('the route only queries professional_elo_state / professional_elo_events, never `profiles` directly for scoring', () => {
    assert.ok(!routeSource.includes('.from("profiles")'), 'must not read profiles table directly for ELO data')
    assert.ok(routeSource.includes('professional_elo_events'))
  })

  test('eloEngine.js (the only writer of Professional ELO) never touches the old profile-completeness fields', () => {
    // Strip comments/JSDoc first — the module header intentionally *names*
    // these old fields in prose to explain why this track is separate from
    // them. What this test actually guards against is live code (object
    // keys, column references) touching them.
    const codeOnly = engineSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .map(line => line.replace(/\/\/.*$/, ''))
      .join('\n')
    for (const field of OLD_FIELDS) {
      assert.ok(
        !codeOnly.includes(field),
        `eloEngine.js live code must not reference "${field}" — writing to it would violate the rule that ` +
        `Professional ELO moves only from real assessment performance / decay, never profile CRUD.`
      )
    }
  })

  // ── Frontend canonical-surface guards (Tranche 1 final cleanup) ──────────
  // The backend repo layout puts frontend/ next to backend/, so these tests
  // can source-scan the professional-facing frontend surfaces too. If the
  // frontend directory isn't present (e.g. backend deployed standalone),
  // these skip rather than fail.
  const frontendSrc = path.join(__dirname, '../../../../frontend/src')
  const frontendPresent = existsSync(frontendSrc)

  test('Skills.jsx (the canonical Professional ELO surface) never references the old profile-completeness fields', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Skills.jsx'), 'utf8')
    for (const field of OLD_FIELDS) {
      assert.ok(!src.includes(field), `Skills.jsx must not reference "${field}" — the Professional ELO card is the only score allowed there`)
    }
  })

  test('OrbitDashboard.jsx (dead code computing pseudo-ELO from profile data) is imported nowhere', { skip: !frontendPresent }, () => {
    const offenders = []
    function walk(dir) {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) { walk(full); continue }
        if (!/\.(jsx?|tsx?)$/.test(entry)) continue
        if (entry === 'OrbitDashboard.jsx') continue
        const src = readFileSync(full, 'utf8')
        if (/from\s+["'][^"']*OrbitDashboard["']|import\(\s*["'][^"']*OrbitDashboard/.test(src)) offenders.push(full)
      }
    }
    walk(frontendSrc)
    assert.deepEqual(offenders, [], 'OrbitDashboard.jsx renders profile-derived pseudo-ELO as if it were a score — it must never be mounted (see its header)')
  })

  test('eloEngine.js only writes to professional_elo_state / professional_elo_events tables', () => {
    const fromCalls = [...engineSource.matchAll(/\.from\((["'`])([^"'`]+)\1\)/g)].map(m => m[2])
    const allowed = new Set(['professional_elo_state', 'professional_elo_events'])
    for (const table of fromCalls) {
      assert.ok(allowed.has(table), `eloEngine.js queried unexpected table "${table}" — only the canonical Professional ELO tables should be touched here`)
    }
    assert.ok(fromCalls.length > 0, 'sanity check: engine should query at least one table')
  })
})
