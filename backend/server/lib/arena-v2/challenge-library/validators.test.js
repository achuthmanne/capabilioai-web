/**
 * validators.test.js — Milestone 2
 * Run with: node --test backend/server/lib/arena-v2/challenge-library/validators.test.js
 * (Node's built-in test runner — no new dependency added to the project.)
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import {
  ValidationError,
  validateRoleCapabilities,
  validateSkillGraph,
  validateScenarioPack,
  validateDataset,
  validateDatasetVersion,
  validateChallengeTemplate,
  validateChallengeTemplateVersion,
} from "./validators.js"

// ── Role Capabilities ────────────────────────────────────────────────────────

test("validateRoleCapabilities accepts a well-formed Frontend Developer entry", () => {
  const clean = validateRoleCapabilities({
    role: "Frontend Developer",
    workstations: ["react_frontend", "code", "api"],
    validators: ["live_render_probe", "test_case_judge", "http_assertion"],
    uiModules: ["code_editor", "file_explorer", "browser_live_preview", "console_output", "api_client"],
  })
  assert.equal(clean.career_family, "IT")
  assert.equal(clean.role, "Frontend Developer")
  assert.deepEqual(clean.workstations, ["react_frontend", "code", "api"])
})

test("validateRoleCapabilities rejects an unknown workstation id", () => {
  assert.throws(
    () => validateRoleCapabilities({ role: "X", workstations: ["not_a_real_workstation"], validators: [], uiModules: [] }),
    ValidationError
  )
})

test("validateRoleCapabilities rejects missing role", () => {
  assert.throws(() => validateRoleCapabilities({ workstations: [], validators: [], uiModules: [] }), ValidationError)
})

// ── Skill Dependency Graph ───────────────────────────────────────────────────

test("validateSkillGraph accepts a valid DAG", () => {
  const clean = validateSkillGraph({
    role: "Frontend Developer",
    version: "v1",
    graph: {
      nodes: ["HTML/CSS Fundamentals", "React Components", "State Management", "Accessibility", "Web Performance"],
      edges: [
        { from: "HTML/CSS Fundamentals", to: "React Components" },
        { from: "React Components", to: "State Management" },
        { from: "State Management", to: "Accessibility" },
        { from: "State Management", to: "Web Performance" },
      ],
    },
  })
  assert.equal(clean.version, "v1")
  assert.equal(clean.is_active, true)
})

test("validateSkillGraph rejects an edge referencing an undeclared node", () => {
  assert.throws(() => validateSkillGraph({
    role: "X", version: "v1",
    graph: { nodes: ["A", "B"], edges: [{ from: "A", to: "C" }] },
  }), ValidationError)
})

test("validateSkillGraph rejects empty nodes", () => {
  assert.throws(() => validateSkillGraph({ role: "X", version: "v1", graph: { nodes: [], edges: [] } }), ValidationError)
})

// ── Scenario Pack ─────────────────────────────────────────────────────────────

test("validateScenarioPack accepts the Amazon worked example shape", () => {
  const clean = validateScenarioPack({
    slug: "amazon", name: "Amazon", industry: "E-Commerce",
    roleFamilies: ["Data & Analytics"], version: "v1",
    scenarios: [{ scenarioId: "customer-orders", name: "Customer Orders", templateChain: ["sql", "dashboard", "report"] }],
  })
  assert.equal(clean.slug, "amazon")
  assert.equal(clean.status, "active")
})

test("validateScenarioPack rejects empty scenarios array", () => {
  assert.throws(() => validateScenarioPack({
    slug: "x", name: "X", roleFamilies: ["A"], version: "v1", scenarios: [],
  }), ValidationError)
})

// ── Datasets ──────────────────────────────────────────────────────────────────

test("validateDataset requires datasetId and name", () => {
  assert.throws(() => validateDataset({ name: "Amazon Orders" }), ValidationError)
  const clean = validateDataset({ datasetId: "amazon-orders", name: "Amazon Orders" })
  assert.equal(clean.dataset_id, "amazon-orders")
})

test("validateDatasetVersion requires seedSql", () => {
  assert.throws(() => validateDatasetVersion({ datasetId: "amazon-orders", version: "v1" }), ValidationError)
  const clean = validateDatasetVersion({ datasetId: "amazon-orders", version: "v1", seedSql: "CREATE TABLE orders (...);" })
  assert.equal(clean.dataset_id, "amazon-orders")
  assert.equal(clean.is_active, true)
})

// ── Challenge Templates ───────────────────────────────────────────────────────

test("validateChallengeTemplate requires role for domain challenges", () => {
  assert.throws(() => validateChallengeTemplate({
    slug: "react-build", challengeType: "domain", skill: "React", workstation: "react_frontend",
  }), ValidationError)

  const clean = validateChallengeTemplate({
    slug: "react-build", challengeType: "domain", role: "Frontend Developer",
    skill: "React", workstation: "react_frontend",
  })
  assert.equal(clean.role, "Frontend Developer")
})

test("validateChallengeTemplate allows null role for common challenges", () => {
  const clean = validateChallengeTemplate({
    slug: "sql-joins-practice", challengeType: "common", skill: "SQL", workstation: "sql",
  })
  assert.equal(clean.role, null)
})

test("validateChallengeTemplate rejects unknown workstation id", () => {
  assert.throws(() => validateChallengeTemplate({
    slug: "x", challengeType: "common", skill: "SQL", workstation: "not_a_workstation",
  }), ValidationError)
})

// ── Challenge Template Versions — the ELO/XP invariant is the important one ──

test("validateChallengeTemplateVersion accepts a correct common-challenge reward split", () => {
  const clean = validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Easy: {}, Medium: {} },
    validator: { type: "ground_truth_compare", version: "v1", config: {} },
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: false },
      domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
    },
  })
  assert.equal(clean.reward_rules.common.elo, false)
})

test("validateChallengeTemplateVersion rejects rewardRules.common.elo = true (frozen ELO/XP split)", () => {
  assert.throws(() => validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Easy: {} },
    validator: { type: "test_case_judge", version: "v1", config: {} },
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: true },
      domain: { xp: 10, streak: true, skillMastery: true, elo: true, baseEloGain: 20 },
    },
  }), ValidationError)
})

test("validateChallengeTemplateVersion rejects rewardRules.domain.elo = false (frozen ELO/XP split)", () => {
  assert.throws(() => validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Easy: {} },
    validator: { type: "test_case_judge", version: "v1", config: {} },
    rewardRules: {
      common: { xp: 10, streak: true, skillMastery: true, elo: false },
      domain: { xp: 10, streak: true, skillMastery: true, elo: false },
    },
  }), ValidationError)
})

test("validateChallengeTemplateVersion rejects an unknown difficulty tier", () => {
  assert.throws(() => validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Legendary: {} },
    validator: { type: "test_case_judge", version: "v1", config: {} },
    rewardRules: {
      common: { elo: false }, domain: { elo: true },
    },
  }), ValidationError)
})

test("validateChallengeTemplateVersion rejects an unknown validator type", () => {
  assert.throws(() => validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Easy: {} },
    validator: { type: "not_a_real_validator", version: "v1", config: {} },
    rewardRules: { common: { elo: false }, domain: { elo: true } },
  }), ValidationError)
})

test("validateChallengeTemplateVersion rejects missing rewardRules entirely", () => {
  assert.throws(() => validateChallengeTemplateVersion({
    version: "v1",
    difficultyVariants: { Easy: {} },
    validator: { type: "test_case_judge", version: "v1", config: {} },
  }), ValidationError)
})
