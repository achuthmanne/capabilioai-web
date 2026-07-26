/**
 * Pulse redesign regression guard (2026-07-26).
 *
 * Product rule this protects: Pulse must never ship hardcoded/raw sample
 * content on a production-facing surface — no seeded "People you may know"
 * list, no static hashtag/news arrays presented as live, no fake per-domain
 * stats (hiring %, salary, open-role counts) masquerading as real data. Every
 * visible Pulse surface must come from a real backend/Supabase call or an
 * honest, explicitly-labeled empty/fallback state.
 *
 * These are source-scan tests (same pattern as professionalUiRedesign.test.js)
 * — they check the actual shipped source for the identifiers/strings that
 * would indicate the old dummy-data patterns have returned, and that the new
 * real API surface (pulse/trending-tags, market-insights `source` field,
 * pulse/builders reuse) is actually wired up. Skip cleanly if frontend/
 * isn't present alongside backend/.
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendSrc = path.join(__dirname, '../../../../frontend/src')
const frontendPresent = existsSync(frontendSrc)
const routeSource = readFileSync(path.join(__dirname, '../pulseNexus.js'), 'utf8')

describe('2026-07-26 Pulse redesign — no hardcoded feed/people content, real APIs only', () => {
  test('pulseNexus.js exposes a real trending-tags aggregation route over pulse_posts', () => {
    assert.ok(/router\.get\(["']\/pulse\/trending-tags["']/.test(routeSource), 'must expose GET /pulse/trending-tags')
    assert.ok(routeSource.includes('pulse_posts'), 'trending-tags must be computed from the real pulse_posts table')
  })

  test('market-insights response is honestly labeled — live_search vs ai_estimate vs unavailable', () => {
    assert.ok(routeSource.includes('source: hasGemini ? "live_search" : "ai_estimate"'), 'must label whether the report came from real search grounding or an LLM estimate')
    assert.ok(routeSource.includes('source: "unavailable"'), 'the last-resort error path must explicitly say data is unavailable, not silently return empty-but-unlabeled data')
  })

  test('market-insights computes companies_hiring_count from the real report, not a fabricated figure', () => {
    assert.ok(/companies_hiring_count:\s*Array\.isArray\(data\.hiring_companies\)/.test(routeSource), 'the open-roles-style stat must be a real count derived from the report')
  })

  test('Pulse.jsx no longer contains the old hardcoded feed/people arrays', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Pulse.jsx'), 'utf8')
    for (const identifier of ['const TECH_NEWS', 'const SUGGESTIONS', 'const TRENDING =', 'const ROLE_NEWS', 'const GITHUB_REPOS', 'const COMMUNITIES', 'const TRENDING_TOPICS', 'const STATIC_DOMAIN_STATS', 'const STATIC_TRENDING_TAGS']) {
      assert.ok(!src.includes(identifier), `Pulse.jsx must not reintroduce "${identifier}" — Pulse content must come from real APIs or an honest empty state`)
    }
  })

  test('Pulse.jsx never renders a fake "stats.projects" field (silently-blank ghost stat)', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Pulse.jsx'), 'utf8')
    assert.ok(!/value:\s*stats\.projects/.test(src), 'stats.projects was never defined anywhere — a leftover rendered reference means a stat silently renders blank')
  })

  test('the "Orbit — check your career score" quick-link is gone from Pulse', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Pulse.jsx'), 'utf8')
    assert.ok(!src.includes('Orbit — check your career score'), 'Pulse must not contain an embedded Orbit-style quick link/section')
  })

  test('Professional Pulse RightSidebar sources people from the real ELO-ranked pulse/builders endpoint', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Pulse.jsx'), 'utf8')
    const start = src.indexOf('function RightSidebar')
    const end = src.indexOf('\n// ─── Post Composer')
    const body = start !== -1 && end !== -1 ? src.slice(start, end) : src
    assert.ok(body.includes('pulseApi.builders'), 'RightSidebar must fetch real people via pulseApi.builders, not a hardcoded list')
    assert.ok(body.includes('pulseApi.trendingTags'), 'RightSidebar must fetch real trending tags via pulseApi.trendingTags')
    assert.ok(body.includes('peopleLoading') && body.includes('peopleError'), 'RightSidebar must have honest loading/error states for the people section')
  })

  test('ProfileSidebar reflects real search-visibility state instead of a hardcoded "Active" claim', { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, 'pages/Pulse.jsx'), 'utf8')
    assert.ok(!src.includes('>Recruiter visibility<'), 'must not hardcode a "Recruiter visibility" label with a fixed always-Active value')
    assert.ok(src.includes('userData?.searchable'), 'search visibility must be derived from the real profiles.searchable field')
  })

  test('pulseApi exposes trendingTags and marketInsights accepts skills for personalization', { skip: !frontendPresent }, () => {
    const apiSrc = readFileSync(path.join(frontendSrc, 'lib/api.js'), 'utf8')
    assert.ok(apiSrc.includes('trendingTags:'), 'pulseApi must expose trendingTags()')
    assert.ok(/marketInsights:\s*\(domain[^)]*skills/.test(apiSrc), 'marketInsights must accept a skills parameter for personalization')
  })
})
