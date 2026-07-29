import { test } from "node:test"
import assert from "node:assert/strict"
import { contentCacheKey } from "./contentGenerator.js"

test("contentCacheKey is deterministic for the same (skill, level, mode) tuple", () => {
  const a = contentCacheKey("react-hooks", "intermediate", "code")
  const b = contentCacheKey("react-hooks", "intermediate", "code")
  assert.equal(a, b, "same tuple must always hash to the same cache key — this IS the real sticky-cache mechanism")
})

test("contentCacheKey differs when any part of the tuple differs", () => {
  const base = contentCacheKey("react-hooks", "intermediate", "code")
  assert.notEqual(base, contentCacheKey("react-hooks", "advanced", "code"))
  assert.notEqual(base, contentCacheKey("react-hooks", "intermediate", "eli5"))
  assert.notEqual(base, contentCacheKey("system-design", "intermediate", "code"))
})
