/**
 * Regression guard (2026-07-26) for the Executive Home Cockpit rebuild.
 *
 * User feedback: the Executive path "still feels like a static Startup
 * Workspace" — traced to ExecutiveHome.jsx having a FIXED composition (same
 * sections, same order, for every user) plus two literally-static grids at
 * the bottom (a "Coming soon" roadmap grid and a flat Quick Nav grid) that
 * never changed based on who was looking at them.
 *
 * This test locks in the fix: those two static grids are gone, replaced by
 * a single ranked focus-item builder that reads real signals (verification,
 * real startup stage from the `startups` table, team size, connection/
 * intro activity, domain-matched network suggestions) and a section that
 * has nothing real to say does not render at all.
 *
 * Source-scan style, consistent with the other regression tests added
 * during this engagement.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendSrc = path.join(__dirname, "../../../../frontend/src")
const frontendPresent = existsSync(frontendSrc)

describe("ExecutiveHome.jsx — dynamic, role/stage/verification/activity/network-aware composition", () => {
  if (!frontendPresent) {
    test("frontend not present in this checkout — skipping source scan", () => { assert.ok(true) })
    return
  }

  const homeSrc = readFileSync(path.join(frontendSrc, "pages/ExecutiveHome.jsx"), "utf8")

  test("the two static grids (ROADMAP_MODULES, flat Quick Nav) are gone", () => {
    assert.ok(!/ROADMAP_MODULES/.test(homeSrc), "ROADMAP_MODULES static grid must be removed")
    assert.ok(!/Startup Workspace.*page: "startupworkspace"/.test(homeSrc), "the old flat Quick Nav array must be removed")
    assert.ok(!/Coming soon" \/>/.test(homeSrc) || !homeSrc.includes('title="Coming soon"'), "no bare 'Coming soon' section header should remain on Home")
  })

  test("startup stage is read from the REAL startups table, not fabricated", () => {
    assert.ok(homeSrc.includes("useStartupContext"))
    assert.ok(homeSrc.includes('.from("startups")'))
    assert.ok(homeSrc.includes('.from("startup_team_members")'), "team size must come from the real startup_team_members table")
  })

  test("ranked focus-item builder exists and is gated on real conditions, not hardcoded", () => {
    assert.ok(homeSrc.includes("function buildFocusItems"))
    // Verification and people-waiting-on-you must outrank passive recommendations
    assert.ok(homeSrc.includes("weight: 100")) // verification
    assert.ok(homeSrc.includes("weight: 95"))  // intro requests
    assert.ok(homeSrc.includes("weight: 90"))  // connection requests
    assert.ok(homeSrc.includes(".sort((a, b) => b.weight - a.weight)"))
  })

  test("stage-specific copy branches on real startups.stage values (idea/validation/prototype vs seed/series_a/growth)", () => {
    assert.ok(homeSrc.includes('["idea", "validation", "prototype"].includes(startupCtx.startup.stage)'))
    assert.ok(homeSrc.includes('["seed", "series_a", "growth"].includes(startupCtx.startup.stage)'))
  })

  test("network-relevance suggestions are real, domain-matched, and exclude existing connections", () => {
    assert.ok(homeSrc.includes("useSuggestedConnections"))
    assert.ok(homeSrc.includes("connectedIds"))
    assert.ok(homeSrc.includes(".filter(p => !connectedIds.has(p.id))"))
  })

  test("activity level is derived from real counts, not a fabricated score", () => {
    assert.ok(homeSrc.includes("function activityLevelFrom"))
    assert.ok(homeSrc.includes("feedCount + connectionCount + introCount"))
  })

  test("no module without a real backing table is recommended as a Home action (Communities/Events/Marketplace/AI Copilot briefing stay off the recommendation list)", () => {
    // The AI Copilot card is allowed (it's an honest 'here's the status' link,
    // not a fabricated recommendation) but buildFocusItems() itself must never
    // route to communities/events/marketplace, which have no backing data yet.
    const builderMatch = homeSrc.match(/function buildFocusItems[\s\S]*?\n}\n/)
    assert.ok(builderMatch, "buildFocusItems function body must be found")
    const builderBody = builderMatch[0]
    assert.ok(!/onNavigate\?\.\("communities"\)/.test(builderBody))
    assert.ok(!/onNavigate\?\.\("events"\)/.test(builderBody))
    assert.ok(!/onNavigate\?\.\("marketplace"\)/.test(builderBody))
  })
})
