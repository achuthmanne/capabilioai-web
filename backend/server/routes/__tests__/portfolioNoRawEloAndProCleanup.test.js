/**
 * Regression guard (2026-07-26) for the Portfolio page product rules:
 *
 *   1. Portfolios never show a bare/raw ELO number to either students or
 *      professionals — only the qualitative tier label (e.g. "Advanced")
 *      may be shown. This applies to the hero, stats bar, AI identity
 *      card, Performance Summary, the AI-generated summary sentence, and
 *      every archetype's recruiterSummary() in portfolioArchetypes.js.
 *   2. Professionals have no Arena challenges/streak, so Challenges/Day
 *      Streak/Arena-Rating UI must be gated off for the professional path
 *      and replaced with real, verification-gated recruiter signals
 *      (UAN/employment verification, verified certification count, years
 *      of experience).
 *
 * Source-scan style, consistent with the other regression tests added
 * during this engagement (professionalEloCanonical.test.js,
 * weeklyPulseLockdownAndUiCleanup.test.js) — asserts the contract at the
 * file-content level so a future edit can't silently reintroduce a raw
 * ELO digit or Arena-only content into the professional path.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendSrc = path.join(__dirname, "../../../../frontend/src")
const frontendPresent = existsSync(frontendSrc)

describe("Portfolio.jsx — no raw ELO number, professional path gated off Arena content", () => {
  if (!frontendPresent) {
    test("frontend not present in this checkout — skipping source scan", () => { assert.ok(true) })
    return
  }

  const portfolioSrc = readFileSync(path.join(frontendSrc, "pages/Portfolio.jsx"), "utf8")
  const archetypesSrc = readFileSync(path.join(frontendSrc, "config/portfolioArchetypes.js"), "utf8")
  const portfolioPublicSrc = readFileSync(
    path.join(__dirname, "../portfolioPublic.js"), "utf8"
  )

  test("no raw ELO digit interpolation left in Portfolio.jsx render paths", () => {
    // These are the exact patterns that used to render a bare number —
    // ud.eloRating interpolated directly into JSX/template text.
    assert.ok(!/value:ud\.eloRating/.test(portfolioSrc), "metric card must not render raw eloRating as its value")
    assert.ok(!/tier\.label\}\s*·\s*\$\{ud\.eloRating\}/.test(portfolioSrc), "tier progress line must not include raw eloRating")
    assert.ok(!/ELO to <strong/.test(portfolioSrc), "'{n} ELO to {tier}' progress copy must be removed")
    assert.ok(!/ELO rating of \$\{ud\.eloRating\}/.test(portfolioSrc), "AI summary sentence must not state the raw ELO rating")
    assert.ok(!/From \$\{eloData\[0\]\?\.elo\}/.test(portfolioSrc), "ELO Journey sparkline (raw-number chart) must be removed")
  })

  test("archetype recruiterSummary() functions no longer interpolate a raw ELO number", () => {
    assert.ok(!/ELO \$\{elo\}/.test(archetypesSrc), "no archetype summary may render 'ELO {number}'")
    assert.ok(!/ELO \$\{ud\.eloRating\}/.test(archetypesSrc), "no archetype summary may render 'ELO {number}'")
    assert.ok(/tier\.label\} tier/.test(archetypesSrc), "archetype summaries should fall back to the qualitative tier label")
  })

  test("AI-Assigned Professional Identity card doesn't reference Arena for professionals (2026-07-26 fix)", () => {
    // Regression for user report: the card's "What this means" copy said
    // "analyzed your Arena scores" and its "Your level" badge showed the
    // Arena ELO tier (e.g. "Mid · Proficient") even for professionals, who
    // have no Arena challenges at all — confusing and not recruiter-useful.
    assert.ok(portfolioSrc.includes("isPro"), "identity card must branch on isPro")
    assert.ok(
      /isPro\s*\?\s*"Capabilio's AI analyzed your real skills, work experience, and Weekly Skill Pulse assessments/.test(portfolioSrc),
      "professional branch of the explanation text must not mention Arena"
    )
    assert.ok(portfolioSrc.includes("getProStage"), "professional path must use a real, Arena-independent career-stage function")
    assert.ok(portfolioSrc.includes("Career stage:"), "professional path must show a career-stage label instead of an Arena tier")
    assert.ok(portfolioSrc.includes("Employment Verified"), "professional path should surface real verification signals here")
  })

  test("professional path (isPro) gates off Arena-only Performance Summary / Activity Heatmap", () => {
    assert.ok(/\{!isPro\s*&&\s*\(/.test(portfolioSrc) || /!isPro && tasks\.length>0&&/.test(portfolioSrc),
      "Performance Summary / Activity Heatmap must be conditioned on !isPro")
    assert.ok(portfolioSrc.includes("PerformanceSummary"), "PerformanceSummary component should still exist for the student/Arena path")
  })

  test("professional path renders a Verified Credibility replacement using real, verification-gated fields", () => {
    assert.ok(portfolioSrc.includes("Verified Credibility"), "professional path should show a Verified Credibility section")
    assert.ok(portfolioSrc.includes("ud.uanVerified"), "must use real uan_verified-derived field, not a placeholder")
    assert.ok(portfolioSrc.includes("ud.verifiedCertsCount"), "must use real verified-certifications count, not self-reported certs")
    assert.ok(portfolioSrc.includes("ud.yearsOfExperience"), "must surface real years_of_experience when present")
  })

  test("portfolioPublic.js whitelist includes the new professional recruiter-signal fields, still no raw ELO leak of extra columns", () => {
    assert.ok(portfolioPublicSrc.includes("uan_verified"))
    assert.ok(portfolioPublicSrc.includes("years_of_experience"))
    assert.ok(portfolioPublicSrc.includes("verified_certifications_count"))
    // Guard against reintroducing select("*") being returned directly (the
    // original Tranche 6 Priority 6A vulnerability this file fixed).
    assert.ok(portfolioPublicSrc.includes("toPortfolioSafeFields"), "response must still go through the explicit field whitelist")
  })
})
