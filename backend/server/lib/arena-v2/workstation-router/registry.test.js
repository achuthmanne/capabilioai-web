import { test } from "node:test"
import assert from "node:assert/strict"
import { WORKSTATION_REGISTRY } from "./registry.js"
import { WORKSTATION_IDS } from "../challenge-library/validators.js"

test("WORKSTATION_REGISTRY has exactly one entry per WORKSTATION_ID, no more, no fewer", () => {
  const registryKeys = Object.keys(WORKSTATION_REGISTRY)
  assert.equal(registryKeys.length, WORKSTATION_IDS.length)
  for (const id of WORKSTATION_IDS) {
    assert.ok(registryKeys.includes(id), `missing registry entry for "${id}"`)
  }
  for (const key of registryKeys) {
    assert.ok(WORKSTATION_IDS.includes(key), `registry has an entry "${key}" not in WORKSTATION_IDS`)
  }
})

test("every registry entry declares componentKey and a non-empty uiModules array", () => {
  for (const [id, entry] of Object.entries(WORKSTATION_REGISTRY)) {
    assert.ok(typeof entry.componentKey === "string" && entry.componentKey.length > 0, `${id} missing componentKey`)
    assert.ok(Array.isArray(entry.uiModules) && entry.uiModules.length > 0, `${id} missing uiModules`)
  }
})

test("only the calculator workstation has a null artifactType (Common Challenges only, per content_spec/04)", () => {
  const nullArtifacts = Object.entries(WORKSTATION_REGISTRY).filter(([, e]) => e.artifactType === null)
  assert.equal(nullArtifacts.length, 1)
  assert.equal(nullArtifacts[0][0], "calculator")
})

test("componentKey values are unique across the registry", () => {
  const keys = Object.values(WORKSTATION_REGISTRY).map((e) => e.componentKey)
  assert.equal(new Set(keys).size, keys.length)
})
