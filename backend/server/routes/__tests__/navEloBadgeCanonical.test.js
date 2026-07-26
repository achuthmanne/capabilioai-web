/**
 * Regression guard (2026-07-26): the global top-nav ELO badge (App.jsx) must
 * source the Professional Skill Rating from the real, verification-gated
 * engine (GET /api/pro/elo/professional -> professional_elo_state) for the
 * professional path, not the legacy profiles.elo_rating field.
 *
 * Bug this guards against: a completed Weekly Skill Pulse correctly wrote a
 * -13 delta to professional_elo_events/professional_elo_state, but the nav
 * badge kept showing a stale legacy elo_rating value (1050) because it read
 * userData.eloRating unconditionally for every path.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendSrc = path.join(__dirname, "../../../../frontend/src")
const frontendPresent = existsSync(frontendSrc)

describe("App.jsx nav ELO badge — professional path must use the real engine", () => {
  test("professional path badge reads proNavElo (professionalEloApi.status()), not legacy eloRating", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "App.jsx"), "utf8")
    assert.ok(src.includes("proNavElo"), "App.jsx must track professional ELO engine state for the nav badge")
    assert.ok(src.includes("professionalEloApi.status()"), "must fetch from the real Professional ELO status endpoint")
    assert.ok(/navPath === "professional" && proNavElo/.test(src), "badge must branch on navPath === professional using proNavElo")
  })

  test("non-professional paths (student/authority/institution/recruiter) still use legacy eloRating unchanged", { skip: !frontendPresent }, () => {
    const src = readFileSync(path.join(frontendSrc, "App.jsx"), "utf8")
    assert.ok(/navPath !== "professional" && userData\?\.eloRating/.test(src), "non-professional paths must keep the original Arena-linked eloRating badge")
  })
})
