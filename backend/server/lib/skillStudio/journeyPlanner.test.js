import { test } from "node:test"
import assert from "node:assert/strict"
import { listJourneysForUser, hasAnyJourneyEver, JOURNEY_LIST_SELECT } from "./journeyPlanner.js"

// ─── BUG FIX REGRESSION (2026-07-29) ────────────────────────────────────────
// A real production incident: listJourneysForUser's embedded
// skill_graph_nodes(...) select omitted `id`. The frontend reads that
// relation as `journey.skill_graph_nodes.id` for skillGraphNodeId on every
// journey it opens — with `id` silently missing, Quiz (POST /quiz/start),
// Arena readiness, and module generation all received skillGraphNodeId:
// undefined. Module generation had an unrelated skillName-based fallback
// that masked it; Quiz had no such fallback and hard-400'd with
// "skillGraphNodeId and skillLabel required".

test("JOURNEY_LIST_SELECT always requests the node's own id, not just label/slug/domain_key", () => {
  assert.match(JOURNEY_LIST_SELECT, /skill_graph_nodes\([^)]*\bid\b/, "the embedded relation must select id — dropping it breaks every skillGraphNodeId reference downstream (Quiz, Arena gate, module generation)")
})

function fakeSupabase(rows) {
  const calls = []
  return {
    supabaseAdmin: {
      from: (table) => ({
        select: (cols) => { calls.push(["select", table, cols]); return {
          eq: () => ({ eq: () => ({ order: () => ({ then: (resolve) => resolve({ data: rows, error: null }) }) }) }),
          eq_count: null,
        } },
      }),
    },
    _calls: calls,
  }
}

test("listJourneysForUser returns the node id in the embedded relation so the frontend can use it as skillGraphNodeId", async () => {
  const rows = [{ id: "journey-1", skill_graph_nodes: { id: "node-1", label: "Scikit-learn", slug: "scikit-learn", domain_key: "ml" } }]
  const deps = fakeSupabase(rows)
  const journeys = await listJourneysForUser("user-1", "active", deps)
  assert.equal(journeys[0].skill_graph_nodes.id, "node-1")
  const selectCall = deps._calls.find((c) => c[0] === "select" && c[1] === "skill_journeys")
  assert.match(selectCall[2], /skill_graph_nodes\([^)]*\bid\b/)
})

test("hasAnyJourneyEver counts across ALL statuses, not just active (must not filter by status)", async () => {
  const calls = []
  const deps = {
    supabaseAdmin: {
      from: () => ({
        select: (_cols, opts) => {
          calls.push(["select", opts])
          return { eq: () => Promise.resolve({ count: 2, error: null }) }
        },
      }),
    },
  }
  const result = await hasAnyJourneyEver("user-1", deps)
  assert.equal(result, true)
  assert.equal(calls[0][1].count, "exact")
  assert.equal(calls[0][1].head, true)
})

test("hasAnyJourneyEver returns false for a genuinely new user with zero rows", async () => {
  const deps = {
    supabaseAdmin: {
      from: () => ({ select: () => ({ eq: () => Promise.resolve({ count: 0, error: null }) }) }),
    },
  }
  const result = await hasAnyJourneyEver("user-1", deps)
  assert.equal(result, false)
})
