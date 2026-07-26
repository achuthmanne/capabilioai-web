/**
 * UI redesign regression guard (2026-07-26) — Professional Path surfaces
 * must not silently regress back to the old "dummy-dashboard" visual
 * language the user explicitly flagged: bare "Profile Health" / "Layoff
 * Risk: High" / "Recruiter Visibility" cards leading the page with no
 * canonical score above them.
 *
 * Product rule this protects: ProfessionalScoreHero (the real,
 * assessment-driven Professional ELO — components/careeros/CareerOSUI.jsx)
 * must be the first visible headline on Orbit's embedded dashboard and on
 * Professional Home, and the old profile-completeness diagnostics
 * (RecruiterCard/RiskCard/HealthCard/the 4-signal grid/"Career Health"
 * panel) must render only inside SecondaryDiagnosticsPanel, never ahead of
 * it. Also guards against the exact alarming copy ("Layoff Risk: High")
 * called out by name in the redesign brief.
 *
 * Source-scan tests (same pattern as professionalEloCanonical.test.js) —
 * skip cleanly if the frontend directory isn't present alongside backend/.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendSrc = path.join(__dirname, '../../../../frontend/src')
const frontendPresent = existsSync(frontendSrc)

describe('2026-07-26 UI redesign — canonical hero must lead, legacy diagnostics must be demoted', () => {
  test('CareerOSUI.jsx exports ProfessionalScoreHero and SecondaryDiagnosticsPanel', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'components/careeros/CareerOSUI.jsx'), 'utf8')
    assert.ok(/export function ProfessionalScoreHero/.test(src), 'ProfessionalScoreHero must be a real exported component, not inlined per-page')
    assert.ok(/export function SecondaryDiagnosticsPanel/.test(src), 'SecondaryDiagnosticsPanel must be a real exported component, not inlined per-page')
  })

  test('ProfessionalScoreHero never renders a bare score with no explanation', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'components/careeros/CareerOSUI.jsx'), 'utf8')
    const start = src.indexOf('export function ProfessionalScoreHero')
    const end = src.indexOf('\nexport function SecondaryDiagnosticsPanel')
    const body = src.slice(start, end)
    assert.ok(body.includes('change.reason') || body.includes('No Weekly Skill Pulse activity'), 'hero must always render a reason, real or honest-empty')
    assert.ok(body.includes('next_action') || body.includes("Start this week"), 'hero must always render a next action, real or a fallback CTA')
  })

  test('Orbit.jsx renders ProfessionalScoreHero ahead of RecruiterCard/RiskCard/HealthCard in source order', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Orbit.jsx'), 'utf8')
    const heroIdx = src.indexOf('<ProfessionalScoreHero')
    const recruiterIdx = src.indexOf('<RecruiterCard')
    const riskIdx = src.indexOf('<RiskCard')
    const healthIdx = src.indexOf('<HealthCard')
    assert.ok(heroIdx !== -1, 'OrbitDash must render ProfessionalScoreHero')
    assert.ok(recruiterIdx !== -1 && riskIdx !== -1 && healthIdx !== -1, 'legacy diagnostic cards must still exist (demoted, not deleted)')
    assert.ok(heroIdx < recruiterIdx, 'ProfessionalScoreHero must appear before RecruiterCard in source order')
    assert.ok(heroIdx < riskIdx, 'ProfessionalScoreHero must appear before RiskCard in source order')
    assert.ok(heroIdx < healthIdx, 'ProfessionalScoreHero must appear before HealthCard in source order')
  })

  test('RecruiterCard/RiskCard/HealthCard/the 4-signal grid render inside SecondaryDiagnosticsPanel, not ahead of it', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Orbit.jsx'), 'utf8')
    const panelOpen = src.indexOf('<SecondaryDiagnosticsPanel')
    const panelClose = src.indexOf('</SecondaryDiagnosticsPanel>')
    assert.ok(panelOpen !== -1 && panelClose !== -1, 'OrbitDash must wrap legacy diagnostics in SecondaryDiagnosticsPanel')
    for (const marker of ['<RecruiterCard', '<RiskCard', '<HealthCard', '<EloCard']) {
      const idx = src.indexOf(marker)
      assert.ok(idx > panelOpen && idx < panelClose, `${marker} must render inside SecondaryDiagnosticsPanel (found at ${idx}, panel is [${panelOpen},${panelClose}])`)
    }
  })

  test('the alarming "Layoff Risk: High"-style raw headline is gone', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Orbit.jsx'), 'utf8')
    assert.ok(!/Layoff Risk:\s*\{/.test(src), 'RiskCard must not headline with the raw "Layoff Risk: {risk}" pattern — reword to non-alarming, evidence-first framing')
  })

  test('the stale "Career Health" tab label is gone from the Career nav (content is Career Readiness)', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Orbit.jsx'), 'utf8')
    assert.ok(!src.includes('label:"Career Health"'), 'the "readiness" tab must not be labeled "Career Health" — it renders ReadinessTab (Career Readiness)')
  })

  test('Skills.jsx renders the shared ProfessionalScoreHero rather than a local duplicate card', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Skills.jsx'), 'utf8')
    assert.ok(src.includes('ProfessionalScoreHero'), 'Skills.jsx must import/use the shared hero component')
    assert.ok(!/function ProfessionalEloCard/.test(src), 'the old local ProfessionalEloCard duplicate must be removed once the shared hero replaces it')
  })

  test('ProfessionalHome.jsx renders ProfessionalScoreHero directly, ahead of the embedded OrbitDash', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/ProfessionalHome.jsx'), 'utf8')
    const heroIdx = src.indexOf('<ProfessionalScoreHero')
    const orbitDashIdx = src.indexOf('<OrbitDash')
    assert.ok(heroIdx !== -1, 'ProfessionalHome.jsx must render ProfessionalScoreHero directly, not rely solely on the embedded OrbitDash')
    assert.ok(orbitDashIdx !== -1 && heroIdx < orbitDashIdx, 'the Home hero must appear before the embedded OrbitDash in source order')
    assert.ok(src.includes('hideHero'), 'the embedded OrbitDash must suppress its own duplicate hero via hideHero — the canonical score must never render twice on one screen')
  })
})
