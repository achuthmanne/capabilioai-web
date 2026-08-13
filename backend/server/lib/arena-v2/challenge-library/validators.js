/**
 * challenge-library/validators.js — Milestone 2
 * ---------------------------------------------------------------------------
 * Pure, dependency-free validation functions for every Content table created
 * in Milestone 1 (arena_v2_migration/001_schema.sql). No I/O here — these
 * throw a ValidationError (with a machine-readable `issues` array) or return
 * a cleaned object. Kept pure specifically so they're unit-testable without a
 * database (see validators.test.js) and reusable by both the CRUD routes
 * (Milestone 2) and, later, the Challenge Payload Validator (Milestone 4) —
 * the schema-shape gate there is the same shape this module already enforces
 * at authoring time, not a second, divergent definition of "valid."
 *
 * Spec sources: arena_content_spec/04-workstations.md (workstation IDs),
 * arena_content_spec/05-validators.md (validator type IDs),
 * arena_content_spec/08-challenge-templates-and-payload.md (payload schema,
 * difficulty tiers, reward-rules ELO/XP split).
 */

export class ValidationError extends Error {
  constructor(issues) {
    super(`Validation failed: ${issues.join("; ")}`)
    this.name = "ValidationError"
    this.issues = issues
  }
}

// ── Canonical enums, mirrored from the frozen content spec ──────────────────

export const WORKSTATION_IDS = [
  "code", "sql", "notebook", "react_frontend", "api", "terminal",
  "excel", "dashboard", "report", "system_design", "embedded",
  "calculator", "full_stack",
  // Added for the SAP domain (functional consultant + ABAP developer roles)
  // — every other existing componentKey was already claimed by a distinct
  // role workspace by the twelfth phase (see ClinicalLabWorkstationV2.jsx's
  // header), so there was no free slot left to reuse this time. This is an
  // additive-only enum entry: nothing existing is renamed or removed, and
  // registry.js's own consistency guard fails the module load if this ever
  // drifts from the backend/frontend registries below.
  "sap_console",
]

export const VALIDATOR_TYPES = [
  "test_case_judge", "ground_truth_compare", "published_result_compare",
  "live_render_probe", "http_assertion", "command_output_match",
  "formula_result_check", "kpi_compare", "rubric_review",
  "numeric_tolerance", "register_match",
]

export const UI_MODULE_IDS = [
  "code_editor", "sql_editor", "notebook_cell", "excel_grid",
  "dashboard_builder", "browser_live_preview", "terminal", "api_client",
  "report_editor", "diagram_canvas", "console_output", "file_explorer",
  "register_serial_panel", "answer_panel",
]

export const DIFFICULTY_TIERS = ["Easy", "Medium", "Hard", "Expert"]
export const CHALLENGE_TYPES  = ["common", "domain"]
export const ARTIFACT_TYPES   = ["code", "report", "dashboard", "design", "diagram"]

// ── helpers ───────────────────────────────────────────────────────────────

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0
const isPlainObject     = (v) => typeof v === "object" && v !== null && !Array.isArray(v)

function collectIssues(fn) {
  const issues = []
  fn(issues)
  if (issues.length) throw new ValidationError(issues)
}

// ── 1. Role Capabilities (Capability Registry, blueprint §1.1) ──────────────

export function validateRoleCapabilities(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.role)) issues.push("role is required")
    if (body.careerFamily && !isNonEmptyString(body.careerFamily)) issues.push("careerFamily must be a non-empty string if provided")

    for (const field of ["workstations", "validators", "uiModules"]) {
      if (!Array.isArray(body[field])) issues.push(`${field} must be an array`)
    }
    if (Array.isArray(body.workstations)) {
      for (const w of body.workstations) {
        if (!WORKSTATION_IDS.includes(w)) issues.push(`unknown workstation id "${w}" — must be one of ${WORKSTATION_IDS.join(", ")}`)
      }
    }
    if (Array.isArray(body.validators)) {
      for (const v of body.validators) {
        if (!VALIDATOR_TYPES.includes(v)) issues.push(`unknown validator type "${v}" — must be one of ${VALIDATOR_TYPES.join(", ")}`)
      }
    }
    if (Array.isArray(body.uiModules)) {
      for (const m of body.uiModules) {
        if (!UI_MODULE_IDS.includes(m)) issues.push(`unknown UI module id "${m}" — must be one of ${UI_MODULE_IDS.join(", ")}`)
      }
    }
  })

  return {
    career_family: body.careerFamily || "IT",
    role: body.role.trim(),
    workstations: body.workstations,
    validators: body.validators,
    ui_modules: body.uiModules,
  }
}

// ── 2. Skill Dependency Graph (content_spec/03-learning-paths.md) ───────────

export function validateSkillGraph(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.role)) issues.push("role is required")
    if (!isNonEmptyString(body.version)) issues.push("version is required")
    if (!isPlainObject(body.graph)) {
      issues.push("graph must be an object with { nodes, edges }")
    } else {
      if (!Array.isArray(body.graph.nodes) || body.graph.nodes.length === 0) issues.push("graph.nodes must be a non-empty array of skill names")
      if (!Array.isArray(body.graph.edges)) issues.push("graph.edges must be an array")
      if (Array.isArray(body.graph.nodes) && Array.isArray(body.graph.edges)) {
        const nodeSet = new Set(body.graph.nodes)
        for (const edge of body.graph.edges) {
          if (!isPlainObject(edge) || !("from" in edge) || !("to" in edge)) {
            issues.push(`edge ${JSON.stringify(edge)} must be { from, to }`)
            continue
          }
          if (!nodeSet.has(edge.from)) issues.push(`edge references unknown node "${edge.from}" as "from"`)
          if (!nodeSet.has(edge.to)) issues.push(`edge references unknown node "${edge.to}" as "to"`)
        }
      }
    }
  })

  return {
    career_family: body.careerFamily || "IT",
    role: body.role.trim(),
    version: body.version.trim(),
    graph: body.graph,
    is_active: body.isActive !== false,
  }
}

// ── 3. Scenario Pack (content_spec/06-scenario-packs-and-datasets.md) ───────

export function validateScenarioPack(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.slug)) issues.push("slug is required")
    if (!isNonEmptyString(body.name)) issues.push("name is required")
    if (!isNonEmptyString(body.version)) issues.push("version is required")
    if (!Array.isArray(body.roleFamilies) || body.roleFamilies.length === 0) issues.push("roleFamilies must be a non-empty array")
    if (!Array.isArray(body.scenarios) || body.scenarios.length === 0) {
      issues.push("scenarios must be a non-empty array")
    } else {
      body.scenarios.forEach((s, i) => {
        if (!isPlainObject(s) || !isNonEmptyString(s.scenarioId) || !isNonEmptyString(s.name)) {
          issues.push(`scenarios[${i}] must have { scenarioId, name, templateChain }`)
        }
      })
    }
  })

  return {
    slug: body.slug.trim(),
    name: body.name.trim(),
    industry: body.industry || null,
    role_families: body.roleFamilies,
    version: body.version.trim(),
    scenarios: body.scenarios,
    status: body.status || "active",
  }
}

// ── 4. Dataset + Dataset Version ────────────────────────────────────────────

export function validateDataset(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.datasetId)) issues.push("datasetId is required")
    if (!isNonEmptyString(body.name)) issues.push("name is required")
  })
  return {
    dataset_id: body.datasetId.trim(),
    scenario_pack_id: body.scenarioPackId || null,
    name: body.name.trim(),
    description: body.description || null,
  }
}

export function validateDatasetVersion(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.datasetId)) issues.push("datasetId is required")
    if (!isNonEmptyString(body.version)) issues.push("version is required")
    if (!isNonEmptyString(body.seedSql)) issues.push("seedSql is required — a dataset version with no way to seed the sql.js DB is not usable by any validator")
  })
  return {
    dataset_id: body.datasetId.trim(),
    version: body.version.trim(),
    schema: body.schema || {},
    seed_sql: body.seedSql,
    is_active: body.isActive !== false,
  }
}

// ── 5. Challenge Template + Version ─────────────────────────────────────────

export function validateChallengeTemplate(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.slug)) issues.push("slug is required")
    if (!CHALLENGE_TYPES.includes(body.challengeType)) issues.push(`challengeType must be one of ${CHALLENGE_TYPES.join(", ")}`)
    if (!isNonEmptyString(body.skill)) issues.push("skill is required")
    if (!WORKSTATION_IDS.includes(body.workstation)) issues.push(`unknown workstation id "${body.workstation}"`)
    if (body.challengeType === "domain" && !isNonEmptyString(body.role)) {
      issues.push("role is required for domain challenges (content_spec/08 constraint: chk_domain_has_role)")
    }
  })

  return {
    slug: body.slug.trim(),
    challenge_type: body.challengeType,
    career_family: body.careerFamily || "IT",
    role: body.role || null,
    skill: body.skill.trim(),
    workstation: body.workstation,
    scenario_pack_id: body.scenarioPackId || null,
    scenario_id: body.scenarioId || null,
    status: body.status || "active",
  }
}

export function validateChallengeTemplateVersion(body) {
  collectIssues((issues) => {
    if (!isNonEmptyString(body.version)) issues.push("version is required")

    if (!isPlainObject(body.difficultyVariants) || Object.keys(body.difficultyVariants).length === 0) {
      issues.push("difficultyVariants must declare at least one tier")
    } else {
      for (const tier of Object.keys(body.difficultyVariants)) {
        if (!DIFFICULTY_TIERS.includes(tier)) issues.push(`unknown difficulty tier "${tier}" — must be one of ${DIFFICULTY_TIERS.join(", ")}`)
      }
    }

    if (!isPlainObject(body.validator) || !isNonEmptyString(body.validator.type) || !isNonEmptyString(body.validator.version)) {
      issues.push("validator must be { type, version, config } with type/version set")
    } else if (!VALIDATOR_TYPES.includes(body.validator.type)) {
      issues.push(`unknown validator type "${body.validator.type}"`)
    }

    // Frozen business-rule invariant (blueprint §1, ELO/XP split): Common
    // Challenges never award ELO. Enforced here at authoring time so a
    // miscalibrated template can't reach a student at all, rather than
    // relying only on the runtime Payload Validator to catch it later.
    if (isPlainObject(body.rewardRules)) {
      if (isPlainObject(body.rewardRules.common) && body.rewardRules.common.elo !== false) {
        issues.push("rewardRules.common.elo must be false — Common Challenges never award ELO (frozen ELO/XP split)")
      }
      if (isPlainObject(body.rewardRules.domain) && body.rewardRules.domain.elo !== true) {
        issues.push("rewardRules.domain.elo must be true — Domain Challenges always award ELO (frozen ELO/XP split)")
      }
    } else {
      issues.push("rewardRules is required, with both common and domain sub-objects")
    }

    if (body.portfolioDecision && !ARTIFACT_TYPES.includes(body.portfolioDecision.artifactType)) {
      issues.push(`portfolioDecision.artifactType must be one of ${ARTIFACT_TYPES.join(", ")}`)
    }
  })

  return {
    version: body.version.trim(),
    difficulty_variants: body.difficultyVariants,
    validator: body.validator,
    assessment_rules: body.assessmentRules || {},
    submission_rules: body.submissionRules || {},
    progression_rules: body.progressionRules || {},
    reward_rules: body.rewardRules,
    portfolio_decision: body.portfolioDecision || {},
    is_active: body.isActive !== false,
  }
}
