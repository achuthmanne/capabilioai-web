import { test } from "node:test"
import assert from "node:assert/strict"
import { validateCapabilityRegistry } from "./capabilityValidator.js"

const frontendPayload = {
  challengeType: "domain", role: "Frontend Developer",
  workstation: "react_frontend", validator: { type: "live_render_probe" },
}
const frontendCapabilities = {
  role: "Frontend Developer",
  workstations: ["react_frontend", "code", "api"],
  validators: ["live_render_probe", "test_case_judge", "http_assertion"],
}

test("validateCapabilityRegistry passes when both workstation and validator are registered", () => {
  const { valid, issues } = validateCapabilityRegistry(frontendPayload, frontendCapabilities)
  assert.equal(valid, true)
  assert.deepEqual(issues, [])
})

test("validateCapabilityRegistry rejects when the workstation isn't registered for the role", () => {
  const payload = { ...frontendPayload, workstation: "embedded" }
  const { valid, issues } = validateCapabilityRegistry(payload, frontendCapabilities)
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes('workstation "embedded" is not registered')))
})

test("validateCapabilityRegistry rejects when the validator type isn't registered for the role", () => {
  const payload = { ...frontendPayload, validator: { type: "register_match" } }
  const { valid, issues } = validateCapabilityRegistry(payload, frontendCapabilities)
  assert.equal(valid, false)
  assert.ok(issues.some((i) => i.includes('validator type "register_match" is not registered')))
})

test("validateCapabilityRegistry rejects outright when no registry entry exists for the role", () => {
  const { valid, issues } = validateCapabilityRegistry(frontendPayload, null)
  assert.equal(valid, false)
  assert.ok(issues[0].includes("no Capability Registry entry exists"))
})

test("validateCapabilityRegistry is a no-op pass for Common Challenges regardless of registry state", () => {
  const commonPayload = { challengeType: "common", role: null, workstation: "sql", validator: { type: "ground_truth_compare" } }
  const { valid, issues } = validateCapabilityRegistry(commonPayload, null)
  assert.equal(valid, true)
  assert.deepEqual(issues, [])
})

test("validateCapabilityRegistry reports both failures at once when neither is registered", () => {
  const payload = { challengeType: "domain", role: "Frontend Developer", workstation: "embedded", validator: { type: "register_match" } }
  const { valid, issues } = validateCapabilityRegistry(payload, frontendCapabilities)
  assert.equal(valid, false)
  assert.equal(issues.length, 2)
})
