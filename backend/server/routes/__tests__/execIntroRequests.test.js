/**
 * Regression guard (2026-07-26) for the Executive Path "Introductions"
 * feature — the first real slice of the Executive Path V2 blueprint
 * (EXECUTIVE_PATH_V2_MASTER_BLUEPRINT.md §J/§Q) actually implemented in
 * code, replacing ExecutiveNetwork.jsx's previously-honest-but-unbuilt
 * "Introductions isn't wired up yet" EmptyState.
 *
 * Source-scan style, consistent with the other regression tests added
 * during this engagement (portfolioNoRawEloAndProCleanup.test.js,
 * weeklyPulseLockdownAndUiCleanup.test.js) — asserts the contract at the
 * file-content level so a future edit can't silently reintroduce a fake/
 * unbuilt state or break the server-side enforcement this route relies on.
 */
import { test, describe } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const routesDir = path.join(__dirname, "..")
const execIntrosSrc = readFileSync(path.join(routesDir, "execIntros.js"), "utf8")
const serverSrc = readFileSync(path.join(routesDir, "../../server.js"), "utf8")

const frontendSrc = path.join(__dirname, "../../../../frontend/src")
const frontendPresent = existsSync(frontendSrc)

describe("execIntros.js — routes exist and enforce server-side rules", () => {
  test("all three routes are defined", () => {
    assert.ok(execIntrosSrc.includes('router.post("/exec/intro-requests"'))
    assert.ok(execIntrosSrc.includes('router.get("/exec/intro-requests"'))
    assert.ok(execIntrosSrc.includes('router.patch("/exec/intro-requests/:id"'))
  })

  test("every route requires auth — never trusts a client-supplied user id", () => {
    const postLine  = execIntrosSrc.match(/router\.post\("\/exec\/intro-requests",\s*(\w+)/)
    const getLine   = execIntrosSrc.match(/router\.get\("\/exec\/intro-requests",\s*(\w+)/)
    const patchLine = execIntrosSrc.match(/router\.patch\("\/exec\/intro-requests\/:id",\s*(\w+)/)
    assert.equal(postLine?.[1], "requireAuth")
    assert.equal(getLine?.[1], "requireAuth")
    assert.equal(patchLine?.[1], "requireAuth")
    // The actor is always req.user.id, never req.body.requester_id or similar
    assert.ok(execIntrosSrc.includes("requester_id: req.user.id"))
    assert.ok(!/requester_id:\s*req\.body/.test(execIntrosSrc))
  })

  test("rejects self-requests and validates reason/message server-side (not just UI)", () => {
    assert.ok(execIntrosSrc.includes('target_id === req.user.id'))
    assert.ok(execIntrosSrc.includes("VALID_REASONS.includes(reason)"))
    assert.ok(execIntrosSrc.includes("message?.trim()"))
    assert.ok(execIntrosSrc.includes("message.length > 500"))
  })

  test("only the request's target may accept/decline it — enforced in the route, not the client", () => {
    assert.ok(execIntrosSrc.includes("reqRow.target_id !== req.user.id"))
    assert.ok(execIntrosSrc.includes('res.status(403)'))
    // Can't re-respond to an already-answered request
    assert.ok(execIntrosSrc.includes('reqRow.status !== "pending"'))
  })

  test("stale pending requests are lazily expired on read, not left dangling forever", () => {
    assert.ok(execIntrosSrc.includes("expireStaleRequests"))
    assert.ok(execIntrosSrc.includes('status: "expired"'))
  })

  test("mounted in server.js", () => {
    assert.ok(serverSrc.includes('execIntrosRoutes'))
    assert.ok(serverSrc.includes('execIntrosRoutes)') && serverSrc.includes('app.use("/api",              execIntrosRoutes)'))
  })
})

describe("Frontend — Introductions is real, not a fabricated/unbuilt state", () => {
  if (!frontendPresent) {
    test("frontend not present in this checkout — skipping source scan", () => { assert.ok(true) })
    return
  }

  const networkSrc = readFileSync(path.join(frontendSrc, "pages/ExecutiveNetwork.jsx"), "utf8")
  const homeSrc     = readFileSync(path.join(frontendSrc, "pages/ExecutiveHome.jsx"), "utf8")
  const apiSrc      = readFileSync(path.join(frontendSrc, "lib/api.js"), "utf8")

  test("execIntroApi exists with request/list/respond", () => {
    assert.ok(apiSrc.includes("export const execIntroApi"))
    assert.ok(apiSrc.includes('"/exec/intro-requests"'))
  })

  test("ExecutiveNetwork.jsx no longer shows the unbuilt EmptyState for Introductions", () => {
    assert.ok(!/Introductions isn't wired up yet/.test(networkSrc), "the old honest-unbuilt copy must be gone now that it's real")
    assert.ok(networkSrc.includes("useIntroRequests"))
    assert.ok(networkSrc.includes("RequestIntroModal"))
    assert.ok(networkSrc.includes("execIntroApi"))
  })

  test("Venture Radar / Board Seats remain honest 'coming soon' states (not fabricated to match)", () => {
    assert.ok(networkSrc.includes("Venture Radar isn't wired up yet"))
    assert.ok(networkSrc.includes("Board Seats isn't wired up yet"))
  })

  test("ExecutiveHome.jsx surfaces real pending intro requests, gated to non-empty (no placeholder card)", () => {
    assert.ok(homeSrc.includes("useIntroRequests"))
    assert.ok(homeSrc.includes("intros.pending.length > 0"))
    assert.ok(homeSrc.includes("Introduction Requests"))
  })
})
