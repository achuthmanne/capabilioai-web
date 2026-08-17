import { test } from "node:test"
import assert from "node:assert/strict"
import { ELO_TIERS as backendTiers, getTier as backendGetTier } from "./eloTiers.js"
import { ELO_TIERS as frontendTiers } from "../../../frontend/src/theme.js"

// Guards against exactly the failure mode that caused a six-scheme ELO
// tier naming fragmentation across the frontend earlier (Aura.jsx,
// StudentHome.jsx, Portfolio.jsx, copilotConfig.js, theme.js, Header.jsx
// all independently hand-rolled tier boundaries/labels) — a code comment
// alone did not prevent that drift, so this test imports BOTH copies
// directly and fails loudly the moment they diverge, rather than relying
// on someone noticing the comment.
test("backend eloTiers.js stays byte-for-byte in sync with frontend theme.js's ELO_TIERS", () => {
  assert.deepStrictEqual(backendTiers, frontendTiers)
})

test("getTier boundaries match across both copies for representative ELO values", () => {
  for (const elo of [-100, 0, 599, 600, 799, 800, 999, 1000, 1199, 1200, 1499, 1500, 5000]) {
    const backend = backendGetTier(elo)
    const expected = frontendTiers.find(t => elo >= t.min && elo < t.max) || frontendTiers[0]
    assert.deepStrictEqual(backend, expected, `mismatch at elo=${elo}`)
  }
})
