/**
 * Regression guard (2026-07-26) for the "EXECUTION MODE" fix pass:
 *   - Pulse/Skills/Launchpad/Career quick-nav cards removed from ProfessionalHome
 *   - Target Role UI removed from the professional path
 *   - 45s timer + anti-cheat event logging wired into Weekly Skill Pulse
 *   - Skill Test History + suspicious-activity routes exist
 *
 * Source-scan style, same pattern as professionalEloCanonical.test.js —
 * asserts the contract at the file-content level so a future edit that
 * reintroduces any of these can't slip back in silently.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "..")
const weeklyPulseSrc = readFileSync(path.join(routesDir, "weeklyPulse.js"), "utf8")

const frontendSrc = path.join(__dirname, "../../../../frontend/src")
const frontendPresent = existsSync(frontendSrc)

describe("Weekly Skill Pulse — timer, anti-cheat, and history routes exist", () => {
  test("flag-suspicious route exists and validates event type", () => {
    assert.ok(weeklyPulseSrc.includes('/pro/weekly/:pulseId/flag-suspicious'))
    assert.ok(weeklyPulseSrc.includes("SUSPICIOUS_EVENT_TYPES"))
  })
  test("timeout route exists and is idempotent (checks for an existing answer first)", () => {
    assert.ok(weeklyPulseSrc.includes('/pro/weekly/:pulseId/timeout'))
    assert.ok(weeklyPulseSrc.includes("existingAnswer"))
  })
  test("history route exists and joins professional_elo_events by pulse_id", () => {
    assert.ok(weeklyPulseSrc.includes('/pro/weekly/history'))
    assert.ok(weeklyPulseSrc.includes('.from("professional_elo_events")'))
    assert.ok(weeklyPulseSrc.includes("suspicious_events"))
  })
})

describe("Frontend — nav-card removal, target-role removal, timer/anti-cheat wiring", () => {
  test("ProfessionalHome.jsx no longer renders the Career/Skills/Pulse/Launchpad quick-nav card grid", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/ProfessionalHome.jsx"), "utf8")
    assert.ok(!/label:\s*"Career",\s*page:\s*"orbit"/.test(src), "the old quick-nav card array must be gone")
    assert.ok(src.includes("AdvancedProfessionalInsight"), "replaced by a real, backend-driven insight module")
  })

  test("ProfessionalHome.jsx ActionGaps no longer prompts to set a target role", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/ProfessionalHome.jsx"), "utf8")
    assert.ok(!/Target role not set/.test(src))
    assert.ok(!/hasTarget/.test(src))
  })

  test("Orbit.jsx Settings panel no longer has a manual Target Role input", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/Orbit.jsx"), "utf8")
    assert.ok(!/label="Target Role"/.test(src), "manual Target Role field must be removed from the professional Settings panel")
    assert.ok(!/Set Target Role/.test(src), "no CTA should offer to manually set a target role")
  })

  test("WeeklyCareerCheck.jsx has a 45s per-question timer and auto-timeout handling", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/WeeklyCareerCheck.jsx"), "utf8")
    assert.ok(src.includes("QUESTION_SECONDS = 45"))
    assert.ok(src.includes("handleTimeout"))
    assert.ok(src.includes("weeklyCheckApi.timeout"))
  })

  test("WeeklyCareerCheck.jsx blocks copy/paste/cut/context-menu and logs tab-blur/visibility suspicious events", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/WeeklyCareerCheck.jsx"), "utf8")
    for (const evt of ["copy", "paste", "cut", "contextmenu"]) {
      assert.ok(src.includes(`"${evt}"`), `must register a ${evt} handler`)
    }
    assert.ok(src.includes("visibilitychange"))
    assert.ok(src.includes('logSuspicious("tab_blur")'))
  })

  test("WeeklyCareerCheck.jsx surfaces the Professional ELO delta (in both directions) on the done screen", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/WeeklyCareerCheck.jsx"), "utf8")
    assert.ok(src.includes("summary.professionalElo"))
    assert.ok(src.includes('delta > 0 ? "+" : ""'))
  })

  test("Skills.jsx renders Skill Test History from real history API data", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "pages/Skills.jsx"), "utf8")
    assert.ok(src.includes("SkillTestHistory"))
    assert.ok(src.includes("weeklyCheckApi.history"))
  })
})
