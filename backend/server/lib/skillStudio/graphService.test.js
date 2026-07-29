import { test } from "node:test"
import assert from "node:assert/strict"
import { slugify, scoreRecommendation, evaluatePrerequisites } from "./graphService.js"

test("slugify matches skillGraph.js's makeSlug exactly (no taxonomy drift)", () => {
  assert.equal(slugify("React Hooks"), "react-hooks")
  assert.equal(slugify("  System Design! "), "system-design")
  assert.equal(slugify("C++"), "c")
})

test("scoreRecommendation ranks a decayed, role-relevant, hub skill above a fresh, irrelevant leaf skill", () => {
  const decayedHub = scoreRecommendation({ decayedConfidence: 0.2, matchesTargetRole: true, outEdgeCount: 5, recentlyArenaValidated: false })
  const freshLeaf = scoreRecommendation({ decayedConfidence: 0.95, matchesTargetRole: false, outEdgeCount: 0, recentlyArenaValidated: false })
  assert.ok(decayedHub > freshLeaf, "urgency + role relevance + hub leverage should outrank a fresh irrelevant leaf")
})

test("scoreRecommendation applies a recency penalty for recently Arena-validated skills", () => {
  const notRecentlyValidated = scoreRecommendation({ decayedConfidence: 0.5, matchesTargetRole: true, outEdgeCount: 2, recentlyArenaValidated: false })
  const recentlyValidated = scoreRecommendation({ decayedConfidence: 0.5, matchesTargetRole: true, outEdgeCount: 2, recentlyArenaValidated: true })
  assert.ok(recentlyValidated < notRecentlyValidated, "a skill just proven in Arena should rank lower than an otherwise-identical unproven one")
})

test("evaluatePrerequisites blocks when the learner's level_score is below the edge threshold", () => {
  const edges = [{ from_node_id: "n1", threshold: 60 }]
  const userSkillsBySlug = { react: { level_score: 40 } }
  const nodeBySlugFromId = (id) => (id === "n1" ? { slug: "react" } : null)
  const result = evaluatePrerequisites(edges, userSkillsBySlug, nodeBySlugFromId)
  assert.equal(result.met, false)
  assert.equal(result.unmet.length, 1)
  assert.equal(result.unmet[0].current, 40)
})

test("evaluatePrerequisites passes when every prerequisite threshold is met", () => {
  const edges = [{ from_node_id: "n1", threshold: 60 }]
  const userSkillsBySlug = { react: { level_score: 80 } }
  const nodeBySlugFromId = (id) => (id === "n1" ? { slug: "react" } : null)
  const result = evaluatePrerequisites(edges, userSkillsBySlug, nodeBySlugFromId)
  assert.equal(result.met, true)
  assert.equal(result.unmet.length, 0)
})

test("evaluatePrerequisites defaults threshold to 60 when unset on the edge", () => {
  const edges = [{ from_node_id: "n1", threshold: null }]
  const userSkillsBySlug = { react: { level_score: 59 } }
  const nodeBySlugFromId = (id) => (id === "n1" ? { slug: "react" } : null)
  const result = evaluatePrerequisites(edges, userSkillsBySlug, nodeBySlugFromId)
  assert.equal(result.met, false)
})
