/**
 * challenge-engine/aiScenarioGenerator.js — AI-generated scenario content
 * ---------------------------------------------------------------------------
 * Replaces static, hand-authored difficulty-variant content with a fresh,
 * real Claude call per attempt, scoped to the SAME skill+difficulty+
 * workstation selection.js already resolves from the student's real
 * av2_skill_progress mastery state (pickNextSkill/pickDifficulty — unchanged,
 * not duplicated here). This file only replaces WHAT the content says, never
 * WHICH skill/difficulty the student gets — personalization-by-weak-skill
 * already existed before this file; this makes the content itself stop
 * being hardcoded.
 *
 * INTEGRATION CONTRACT, deliberately minimal-risk: engine.js calls
 * `generateAiScenario()` AFTER it has already resolved a real, valid static
 * `template`/`templateVersion` (so a real av2_challenge_templates FK always
 * exists for av2_challenge_instances.challenge_template_id — that column is
 * NOT NULL with a hard FK, confirmed against 001_schema.sql, so this file
 * never tries to invent a template row). On success, engine.js overlays the
 * AI content onto that real templateVersion's difficulty_variants[difficulty]
 * and validator.config.rubric before calling the existing, untouched
 * payloadGenerator.js. On ANY failure — network, timeout, invalid JSON,
 * failed shape validation — this returns `null` and engine.js falls back to
 * the pre-existing static difficulty_variant content, exactly as it worked
 * before this file existed. No caller ever sees a broken/empty challenge
 * because of an AI failure; failures are logged, never silently hidden and
 * never allowed to block practice either.
 *
 * "Fully unique per attempt" was an explicit product decision (not a
 * default): no caching table, no reuse across students or across a single
 * student's repeated attempts. Real generation cost is incurred every call.
 *
 * AI-OUTPUT-IS-PROBABILISTIC DISCIPLINE, same as rubricReview.js: every
 * field is type-checked, length-clamped, and shape-validated before use.
 * Nothing from the model is trusted blindly, and this module never invents
 * a groundTruth/rubric it can silently grade against unfairly — the exact
 * rubric this call generates is the exact rubric rubricReview.js will use
 * to grade the same attempt, so a fairness reviewer can always pull up
 * `payload.validator.config.rubric` and see precisely what a submission was
 * judged against, generated fresh alongside the mission itself.
 */
import { claude, CLAUDE_SONNET } from "../../claude.js"

// ── Per-workstation extra-field specs ───────────────────────────────────────
// Every domain challenge in this codebase uses the rubric_review validator
// (confirmed against the live database before writing this file — zero
// ground_truth_compare/other validator types in production data), so the
// CORE fields below (prompt/ticket/checklist/acceptanceCriteria/answerLabel/
// groundTruth/rubric) are universal across every role. Only the workstation-
// specific extra fields differ, and only for the workstations whose exact
// field shape is already known from reading their real components
// (NotebookWorkstationV2.jsx, CodeWorkstationV2.jsx, TerminalWorkstationV2.jsx,
// SapConsoleWorkstationV2.jsx). Workstations without a dedicated spec here
// still get a fully real, unique, AI-generated core scenario — they just
// don't get workstation-specific extras (e.g. a generated dataset table),
// which is a known, explicitly-flagged limitation, not a fake fallback.
const WORKSTATION_SPECS = {
  notebook: {
    extraFieldsPrompt: `"starterCode": "<a short Python starter snippet, 2-4 lines, e.g. imports and a pd.read_csv('/data/customers.csv') call>",
  "datasetCsv": "<a real, realistic CSV with a header row and 15-40 data rows relevant to the mission — comma-separated, no markdown fences>",
  "datasetSchemaDescription": "<1-3 sentences describing each column>"`,
    requiredExtra: ["starterCode", "datasetCsv"],
  },
  code: {
    extraFieldsPrompt: `"starterCode": "<a short, deliberately buggy or incomplete JS function the candidate must fix/complete, 5-20 lines>",
  "testCases": [{"name": "<test name>", "code": "<a JS assertion statement calling the function, e.g. 'if (fn(2,3)!==5) throw new Error(\\"expected 5\\")'"}] (2-5 test cases)`,
    requiredExtra: ["starterCode", "testCases"],
  },
  terminal: {
    extraFieldsPrompt: `"logs": {"auth": [{"time":"HH:MM:SS","user":"...","event":"...","result":"...","sourceIp":"..."}], "alerts": [{"id":"ALT-....","severity":"...","summary":"...","sourceIp":"...","timestamp":"..."}]},
  "iocDatabase": [{"ip":"...","verdict":"Malicious|Clean","notes":"..."}],
  "mitreReference": [{"id":"T....","name":"...","tactic":"..."}]`,
    requiredExtra: ["logs"],
  },
  sap_console: {
    extraFieldsPrompt: `"sapMode": "<exactly 'gui_config' or 'abap'>",
  "tcode": "<a real, plausible SAP transaction code for this scenario>",
  "menuPath": ["<SAP Easy Access menu path segments>"],
  "sapScreen": [{"label":"<field label>","value":"<field value>"}] (4-7 rows, only when sapMode is gui_config),
  "starterCode": "<a short ABAP snippet with a real bug, only when sapMode is abap>"`,
    requiredExtra: [],
  },
}

const CORE_FIELDS_SPEC = `{
  "ticket": {"id": "<TICKET-ID style string>", "title": "<short title>", "priority": "Low|Medium|High|Critical"},
  "prompt": "<2-5 sentence realistic workplace scenario the candidate must resolve>",
  "checklist": ["<step 1>", "<step 2>", "..."] (4-6 items),
  "acceptanceCriteria": ["<criterion 1>", "..."] (3-6 items),
  "answerLabel": "<short label for what the candidate submits, e.g. 'INCIDENT REPORT'>",
  "groundTruth": {"rootCause": "<the real underlying cause a correct answer should identify>", "correctFix": "<what a correct answer should propose>"},
  "rubric": [{"key":"<snake_case_key>","label":"<Human Label>","weight":<number>}] (3-5 items, weights are numbers that sum to exactly 1.0, weight index 0 should be labeled around correctness/root-cause and weigh 0.35-0.45, include a "communication"-style item weighing 0.15)
}`

function buildPrompt({ role, skill, difficulty, workstation, industry }) {
  const spec = WORKSTATION_SPECS[workstation]
  const extra = spec ? `\n\nALSO include these workstation-specific fields in the same JSON object (workstation type: "${workstation}"):\n{\n  ${spec.extraFieldsPrompt}\n}` : ""
  return `You are authoring a realistic, hands-on practice mission for Capabilio Arena — a skills-verification workstation where entry-level candidates practice real on-the-job scenarios before applying to jobs.

Generate ONE new, original mission for:
- Role: ${role}
- Skill being tested: ${skill}
- Difficulty: ${difficulty} (Easy = a junior/first-week task with a fairly obvious fix; Medium = realistic ambiguity requiring real investigation; Hard = multiple plausible-looking wrong answers, requires distinguishing symptom from root cause; Expert = production-incident-grade complexity)
- Industry context: ${industry || "general"}

The mission must be internally consistent: the numbers/data you invent in the scenario must actually support the groundTruth you specify (do not describe a scenario and then claim an unsupported root cause). Do not reuse a well-known textbook example verbatim — invent specific, concrete details (real-sounding company/customer names, real-sounding numbers, timestamps).

Return ONLY this exact JSON shape (no markdown fences, no explanation outside the JSON):
${CORE_FIELDS_SPEC}${extra}`
}

async function defaultCallAi(prompt) {
  return claude(
    [{ role: "user", content: prompt }],
    {
      model: CLAUDE_SONNET,
      maxTokens: 1800,
      json: true,
      system: "You are a rigorous instructional designer authoring realistic, internally-consistent hands-on job-skill assessments. Always return ONLY valid JSON matching the exact schema requested — no markdown, no commentary, no trailing text.",
    }
  )
}

export const defaultDeps = { callAi: defaultCallAi }

const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0
const clampStr = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "")

function validateRubric(raw) {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) return null
  const cleaned = []
  let weightSum = 0
  for (const r of raw) {
    const key = typeof r?.key === "string" ? r.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40) : null
    const label = clampStr(r?.label, 80)
    const weight = Number(r?.weight)
    if (!key || !label || !Number.isFinite(weight) || weight <= 0) return null
    cleaned.push({ key, label, weight })
    weightSum += weight
  }
  if (weightSum <= 0) return null
  // Normalize to sum to exactly 1 regardless of what the model actually
  // returned — never trust the model's arithmetic, only its relative
  // emphasis between criteria.
  return cleaned.map((r) => ({ ...r, weight: Math.round((r.weight / weightSum) * 1000) / 1000 }))
}

function validateCoreFields(raw) {
  const ticket = raw?.ticket
  if (!isNonEmptyString(ticket?.id) || !isNonEmptyString(ticket?.title)) return null
  const priority = ["Low", "Medium", "High", "Critical"].includes(ticket?.priority) ? ticket.priority : "Medium"

  const prompt = clampStr(raw?.prompt, 2000)
  if (!prompt) return null

  const checklist = Array.isArray(raw?.checklist) ? raw.checklist.filter(isNonEmptyString).map((s) => clampStr(s, 200)).slice(0, 8) : []
  if (checklist.length < 2) return null

  const acceptanceCriteria = Array.isArray(raw?.acceptanceCriteria) ? raw.acceptanceCriteria.filter(isNonEmptyString).map((s) => clampStr(s, 200)).slice(0, 8) : []
  if (acceptanceCriteria.length < 1) return null

  const answerLabel = clampStr(raw?.answerLabel, 60) || "YOUR ANSWER"

  const groundTruth = raw?.groundTruth && typeof raw.groundTruth === "object" && !Array.isArray(raw.groundTruth)
    ? { rootCause: clampStr(raw.groundTruth.rootCause, 1000), correctFix: clampStr(raw.groundTruth.correctFix, 1000) }
    : null
  if (!groundTruth?.rootCause || !groundTruth?.correctFix) return null

  const rubric = validateRubric(raw?.rubric)
  if (!rubric) return null

  return {
    ticket: { id: clampStr(ticket.id, 30), title: clampStr(ticket.title, 150), priority },
    prompt, checklist, acceptanceCriteria, answerLabel, groundTruth, rubric,
  }
}

function validateWorkstationExtras(raw, workstation) {
  const spec = WORKSTATION_SPECS[workstation]
  if (!spec) return {}
  const extras = {}

  if (workstation === "notebook") {
    if (!isNonEmptyString(raw?.starterCode) || !isNonEmptyString(raw?.datasetCsv)) return null
    const csvLines = raw.datasetCsv.trim().split("\n")
    if (csvLines.length < 3) return null // header + at least 2 data rows
    extras.starterCode = clampStr(raw.starterCode, 2000)
    extras.datasetCsv = raw.datasetCsv.trim().slice(0, 20000)
    extras.datasetSchemaDescription = clampStr(raw.datasetSchemaDescription, 500)
  } else if (workstation === "code") {
    if (!isNonEmptyString(raw?.starterCode) || !Array.isArray(raw?.testCases) || raw.testCases.length < 1) return null
    const testCases = raw.testCases
      .filter((t) => isNonEmptyString(t?.name) && isNonEmptyString(t?.code))
      .map((t) => ({ name: clampStr(t.name, 100), code: clampStr(t.code, 500) }))
      .slice(0, 8)
    if (!testCases.length) return null
    extras.starterCode = clampStr(raw.starterCode, 3000)
    extras.testCases = testCases
  } else if (workstation === "terminal") {
    if (!raw?.logs || typeof raw.logs !== "object") return null
    extras.logs = raw.logs
    if (Array.isArray(raw?.iocDatabase)) extras.iocDatabase = raw.iocDatabase.slice(0, 20)
    if (Array.isArray(raw?.mitreReference)) extras.mitreReference = raw.mitreReference.slice(0, 20)
  } else if (workstation === "sap_console") {
    const sapMode = raw?.sapMode === "abap" ? "abap" : "gui_config"
    extras.sapMode = sapMode
    extras.tcode = clampStr(raw?.tcode, 20) || (sapMode === "abap" ? "SE38" : "SPRO")
    extras.menuPath = Array.isArray(raw?.menuPath) ? raw.menuPath.filter(isNonEmptyString).map((s) => clampStr(s, 60)).slice(0, 6) : []
    if (sapMode === "abap") {
      if (!isNonEmptyString(raw?.starterCode)) return null
      extras.starterCode = clampStr(raw.starterCode, 3000)
    } else {
      const sapScreen = Array.isArray(raw?.sapScreen)
        ? raw.sapScreen.filter((f) => isNonEmptyString(f?.label) && isNonEmptyString(f?.value)).map((f) => ({ label: clampStr(f.label, 60), value: clampStr(f.value, 120) })).slice(0, 10)
        : []
      if (!sapScreen.length) return null
      extras.sapScreen = sapScreen
    }
  }
  return extras
}

/**
 * @param {{ role: string, careerFamily?: string, skill: string, difficulty: string,
 *           workstation: string, industry?: string }} ctx
 * @param {object} deps
 * @returns {Promise<{ content: object, rubric: Array } | null>} `content` is
 *   the difficulty-variant-shaped object (prompt/ticket/checklist/etc, same
 *   shape a static av2_challenge_template_versions.difficulty_variants entry
 *   already has) to overlay onto the real template's difficulty_variants;
 *   `rubric` is the validator.config.rubric to overlay. Returns null on any
 *   failure — callers MUST fall back to the existing static content, never
 *   treat null as "show nothing."
 */
export async function generateAiScenario(ctx, deps = defaultDeps) {
  const { role, skill, difficulty, workstation } = ctx
  if (!role || !skill || !difficulty || !workstation) return null

  let raw
  try {
    raw = await deps.callAi(buildPrompt(ctx))
  } catch (err) {
    console.error("[arena-v2 ai-scenario] generation call failed", { role, skill, difficulty, workstation, error: err.message })
    return null
  }

  const core = validateCoreFields(raw)
  if (!core) {
    console.error("[arena-v2 ai-scenario] generated content failed core validation", { role, skill, difficulty, workstation })
    return null
  }

  const extras = validateWorkstationExtras(raw, workstation)
  if (extras === null) {
    console.error("[arena-v2 ai-scenario] generated content failed workstation-shape validation", { role, skill, difficulty, workstation })
    return null
  }

  const { rubric, ...content } = core
  return { content: { ...content, ...extras }, rubric }
}
