/**
 * prompts/domainRole.js — Content-expansion pass (2026-08-19).
 *
 * Moves scripts/generateDomainRoleMissions.mjs's two Groq call sites onto
 * AIService — prompt text and quality-review rubric are unchanged from the
 * script's original buildPrompt()/reviewMissionQuality(), just relocated
 * here per the platform-wide "no prompt strings in business code" rule
 * (see prompts/arena.js). The script's own generation-integrity gates
 * (sandbox re-execution, fixed economics, dedup, difficulty-shape) are
 * unaffected — this only replaces the transport + JSON-parsing layer.
 */
import { registerPrompt } from "./promptManager.js"
import { z } from "../responseValidator.js"

const MissionSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  dataset: z.object({
    tableName: z.string().min(1),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(z.any())).min(1),
  }).refine(d => d.rows.every(r => r.length === d.columns.length), {
    message: "dataset row/column length mismatch",
  }),
  referenceQuery: z.string().min(1),
  expected_result: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.any())),
  }),
  match_mode: z.enum(["unordered_rows", "ordered_rows"]),
  company: z.string().optional().default(""),
  manager: z.string().optional().default(""),
  sprint: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.sqlMissionGeneration",
  version: 1,
  owner: "domain-role-missions",
  description: "Generates one entry-level SQL Runner mission (scenario + dataset + reference query + claimed expected result) for a given domain_role/difficulty — content only, never scoring. See scripts/generateDomainRoleMissions.mjs for the sandbox re-execution that verifies this claim before anything is inserted.",
  variables: ["roleLabel", "difficulty", "fewShotBlock", "datasetGuidance"],
  expectedOutputFormat: "JSON object: {title, prompt, dataset{tableName,columns,rows}, referenceQuery, expected_result{columns,rows}, match_mode, company, manager, sprint}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are writing an entry-level SQL practice mission for the "${vars.roleLabel}" job role, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

Write ONE new mission for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- ${vars.datasetGuidance}
- The dataset must have 6-10 rows, a short realistic tableName, and 4-7 columns.
- The prompt must describe the table's columns inline (like the examples) and ask a clear, single, unambiguous SQL task.
- referenceQuery must be a single valid SQLite SELECT statement that actually solves the prompt against your dataset.
- expected_result must be EXACTLY what referenceQuery produces when run against your dataset — columns and rows, in the same order the query would return them if match_mode is "ordered_rows", or any order if "unordered_rows".
- match_mode: "ordered_rows" only if the task inherently requires a specific order (e.g. "highest first"); otherwise "unordered_rows".
- Use a realistic Indian company name, manager name, and sprint label, matching the examples' tone.
- difficulty "easy" = single WHERE filter. "medium" = GROUP BY with an aggregate. "hard" = GROUP BY + aggregate + ORDER BY/LIMIT for a "top/highest/lowest" style question.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "dataset": {"tableName": string, "columns": [string], "rows": [[...]]}, "referenceQuery": string, "expected_result": {"columns": [string], "rows": [[...]]}, "match_mode": "unordered_rows" | "ordered_rows", "company": string, "manager": string, "sprint": string}`,
    },
  ],
  responseSchema: MissionSchema,
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 1400, temperature: 0.8, json: true },
})

const ReviewSchema = z.object({
  realistic_dataset: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  role_match: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.sqlMissionReview",
  version: 1,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already sandbox-validated SQL mission before it's eligible to ship — curation, not student scoring (never touches how a real submission is graded).",
  variables: ["roleLabel", "difficulty", "title", "prompt", "tableName", "columns"],
  expectedOutputFormat: "JSON object: {realistic_dataset, junior_appropriate, teaches_measurable_skill, skill_taught, role_match, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform. Review this SQL mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
Dataset table: ${vars.tableName} (columns: ${vars.columns})

Answer honestly — reject generic or mismatched content, don't rubber-stamp:
1. realistic_dataset: would this table plausibly exist in "${vars.roleLabel}"'s real day-to-day work (or work they'd realistically touch)?
2. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
3. teaches_measurable_skill: does solving it require one identifiable SQL skill (e.g. "WHERE filtering", "GROUP BY aggregation", "multi-column ORDER BY")? Name it in skill_taught.
4. role_match: does the scenario genuinely fit "${vars.roleLabel}" specifically, not a generic unrelated business (e.g. a security role's mission should involve security-adjacent data, not random retail sales)?

Return ONLY JSON: {"realistic_dataset": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "role_match": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: ReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})

// Career Workspace refactor (2026-08-19) — python_runner was the second
// real Domain Role panel type. arena.sqlFeedback's wording ("Submitted
// SQL", result tables) is wrong for a code submission — reusing it would
// produce actively confusing feedback, not just imperfect. Renamed from
// domainRole.pythonMissionFeedback (Phase 6, node_runner) — the wording
// never actually said "Python" anywhere except one now-removed adjective,
// so this is the second real case justifying a generic name instead of a
// pasted node-flavored duplicate (same reasoning as evaluateStdoutMatch
// in evaluateMission.js). Same contract/discipline as sqlFeedback:
// best-effort *explanation* of an already-final, deterministic verdict —
// never decides pass/fail itself.
registerPrompt({
  id: "domainRole.codeMissionFeedback",
  version: 1,
  owner: "domain-role-missions",
  description: "Best-effort AI *explanation* layered on top of an already-final, deterministic code mission score/passed verdict (Python or Node) — never decides the verdict itself. See lib/domainRole/evaluateMission.js's evaluateStdoutMatch for the actual grading authority.",
  variables: ["prompt", "code", "passed", "score", "reason", "stdout", "stderr"],
  expectedOutputFormat: "Plain text, 2-3 short sentences — not JSON.",
  buildMessages: (vars) => [
    {
      role: "system",
      content: "You coach students on coding mission attempts. In 2-3 short sentences, explain the result plainly — what their code did, and what it actually printed vs. what was expected — using ONLY the facts given. Never invent a pass/fail verdict or a score; those are already decided and given to you as fact. If the result FAILED, your tone must be direct and unambiguous that it failed — never encouraging, never softened to sound like a near-success, never vague about whether it worked. If it PASSED, be genuinely positive and specific about what was done right.",
    },
    {
      role: "user",
      content: `Mission: ${vars.prompt}\nSubmitted code:\n${vars.code}\nResult: ${vars.passed ? "PASSED" : "FAILED"} (score ${vars.score}/100)\nDeterministic reason: ${vars.reason || "n/a"}\nActual stdout: ${vars.stdout || "(empty)"}\n${vars.stderr ? `stderr: ${vars.stderr}` : ""}`,
    },
  ],
  responseSchema: null,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 150, temperature: 0.4, json: false },
})

// ── python_runner mission generation (Career Workspace refactor) ──────────
// Sibling to sqlMissionGeneration, for roles whose real skill graph is
// Python/ML-shaped, not SQL-shaped (see the Career Workspace Audit —
// scripts/generatePythonDomainMissions.mjs is the caller, same
// generate-then-really-execute integrity discipline as
// generateCollegeStreamContent.mjs: the AI's claimed output is never
// trusted, only its code — the generator runs referenceSolution for real
// and uses ITS captured stdout as the grading rubric.
const PythonMissionSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  referenceSolution: z.string().min(1),
  usePackages: z.boolean(),
})

registerPrompt({
  id: "domainRole.pythonMissionGeneration",
  version: 1,
  owner: "domain-role-missions",
  description: "Generates one entry-level Python job-task mission (problem + Python reference solution) for a role whose real skill graph is Python/ML-shaped — content only. The generator script executes referenceSolution for real and uses its actual stdout as the grading rubric; it never trusts an AI-claimed answer.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, referenceSolution, usePackages}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are writing an entry-level, real-world job-task mission for the "${vars.roleLabel}" role, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

This role's ACTUAL required skills (grounded in real job requirements, not generic programming): ${vars.roleSkillsList}

Write ONE new mission for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- The task must exercise one of this role's real skills above — never a generic SQL/business-database task, never unrelated to what this role actually does day to day.
- Pose a concrete, self-contained problem with specific inputs (numbers, a small embedded dataset, or synthetic values defined directly in the reference solution) so the answer is a single determinate result, not open-ended.
- referenceSolution must be a short, real, runnable Python 3 script: no stdin, no file/network access, no imports beyond the standard library UNLESS the task genuinely needs numpy/pandas/scikit-learn/Pillow (set usePackages true in that case — e.g. training/evaluating a small classical model, feature engineering on a small embedded dataset, basic image array manipulation). Prefer stdlib-only (usePackages: false) whenever the task doesn't genuinely need those libraries.
- If usePackages is true, keep any model-training step tiny (a few hundred rows at most, a classical scikit-learn model like LogisticRegression/DecisionTree/KMeans — never a deep-learning framework) so it finishes in a few seconds.
- The prompt must state the problem clearly enough that a student reading only the prompt (not your solution) could write their own correct Python script and get the same output.
- difficulty "easy" = a single, direct application of one skill/technique. "medium" = two chained steps (e.g. preprocess then evaluate). "hard" = a small multi-step pipeline (e.g. engineer a feature, train, then report a metric).
- Do not use random numbers, current time/date, or anything non-deterministic — the same script must always print the same output. If a scikit-learn model is involved, always pass a fixed random_state.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "referenceSolution": string, "usePackages": boolean}`,
    },
  ],
  responseSchema: PythonMissionSchema,
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 1400, temperature: 0.8, json: true },
})

const PythonMissionReviewSchema = z.object({
  matches_real_skill: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  not_generic_sql: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.pythonMissionReview",
  version: 1,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already execution-verified Python job-task mission before it's eligible to ship — curation, not student scoring.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {matches_real_skill, junior_appropriate, teaches_measurable_skill, skill_taught, not_generic_sql, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform. Review this Python mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
This role's real required skills: ${vars.roleSkillsList}

Answer honestly — reject generic or mismatched content, don't rubber-stamp:
1. matches_real_skill: does this genuinely exercise one of the role's REAL required skills listed above (not a generic programming exercise unrelated to the role)?
2. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
3. teaches_measurable_skill: does solving it require one identifiable technique? Name it in skill_taught.
4. not_generic_sql: confirm this is NOT a disguised SQL/business-database query task (revenue, orders, products, sales, invoices) — this role's real skills rarely include that.

Return ONLY JSON: {"matches_real_skill": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "not_generic_sql": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: PythonMissionReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})

// ── node_runner mission generation (Phase 6, Software Engineering roles) ──
// Sibling to pythonMissionGeneration for roles whose real skill graph is
// JS/Node-shaped (SWE, Backend, Full Stack, Frontend-as-logic) — kept as
// its own prompt rather than parameterizing the Python one, since the
// package/library guidance genuinely differs per language (see
// scripts/generatePythonDomainMissions.mjs's own header on why
// generateForRole is the reusable shape, not the prompt content). Same
// generate-then-really-execute integrity discipline: the AI's claimed
// output is never trusted, only its code.
const NodeMissionSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  referenceSolution: z.string().min(1),
})

registerPrompt({
  id: "domainRole.nodeMissionGeneration",
  version: 1,
  owner: "domain-role-missions",
  description: "Generates one entry-level, realistic Node.js/JavaScript job-task mission (problem + reference solution) for a Software Engineering role — content only. The generator script executes referenceSolution for real and uses its actual stdout as the grading rubric; it never trusts an AI-claimed answer.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, referenceSolution}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are writing an entry-level, REALISTIC PRODUCTION job-task mission for the "${vars.roleLabel}" role, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

This role's ACTUAL required skills (grounded in real job requirements): ${vars.roleSkillsList}

Write ONE new mission for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- The task must exercise one of this role's real skills above, framed as REAL WORK a working engineer would actually be assigned — e.g. "fix a hydration mismatch," "implement a debounce/throttle utility," "write a JWT verification middleware," "implement pagination for an API response," "resolve a race condition," "optimize a slow function," "implement a rate limiter," "process a webhook payload," "implement a small LRU cache," "validate and sanitize user input," "implement retry-with-backoff for a flaky call."
- ABSOLUTELY DO NOT write: toy textbook problems (FizzBuzz, reverse-a-string-style puzzles with no real-world framing), generic CRUD boilerplate, or ANY task involving a sales/orders/products/invoices/customers business database. Every task must read like a real, specific engineering ticket.
- Since this runs in a plain Node.js sandbox (no HTTP server, no real network/filesystem, no npm packages beyond Node's own built-in modules that don't touch fs/net/http/child_process), frame server/API-shaped tasks as testable PURE FUNCTIONS or IN-MEMORY SIMULATIONS — e.g. "write the middleware FUNCTION that validates a JWT payload object and returns {valid, reason}" rather than "start an Express server," or "write a rate-limiter class with a .allow(key) method tested against a sequence of calls" rather than "deploy a real rate limiter." The engineering substance stays completely real; only the execution harness is a plain function call, never a live server/network/file operation.
- Pose a concrete, self-contained problem with specific inputs (a small embedded array/object of test data, or values defined directly in the reference solution) so the answer is a single determinate result, not open-ended.
- referenceSolution must be a short, real, runnable Node.js script: plain JavaScript, no require()/import of fs/net/http/child_process/dgram/cluster, no process.env, no eval/Function constructor, must console.log() the final result and nothing else.
- The prompt must state the problem clearly enough that a student reading only the prompt (not your solution) could write their own correct script and get the same output.
- difficulty "easy" = a single, direct application of one technique. "medium" = two chained steps or an edge case to handle correctly. "hard" = a small multi-step scenario (e.g. combine validation + transformation + a computed result) resembling a real production fix.
- Do not use random numbers, current time/date, or anything non-deterministic — the same script must always print the same output.
- Keep the printed output SIMPLE — a plain number, a plain string, or a short comma-separated line (e.g. console.log(results.join(","))). Avoid designs whose reference solution must console.log(JSON.stringify(...)) a nested array/object, and avoid embedding example code blocks (fenced with backticks) inside the "prompt" string itself — both of these have caused real, observed JSON-formatting failures in this exact pipeline. Describe any test sequence in plain prose instead of a fenced code sample.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "referenceSolution": string}`,
    },
  ],
  responseSchema: NodeMissionSchema,
  // 2000, not 1400 like the Python/SQL siblings — live generation runs
  // showed real-world Node missions (JWT verification, sliding-window
  // rate limiters) running noticeably longer than those, hitting
  // max_tokens mid-JSON and failing Groq's own json_validate_failed
  // check. Confirmed via the actual failed_generation payloads, not
  // guessed.
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 2000, temperature: 0.8, json: true },
})

const NodeMissionReviewSchema = z.object({
  matches_real_skill: z.boolean(),
  is_realistic_production_task: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  not_toy_problem: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.nodeMissionReview",
  version: 1,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already execution-verified Node.js job-task mission before it's eligible to ship — curation, not student scoring.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {matches_real_skill, is_realistic_production_task, junior_appropriate, teaches_measurable_skill, skill_taught, not_toy_problem, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform. Review this Node.js mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
This role's real required skills: ${vars.roleSkillsList}

Answer honestly — reject generic, toy, or mismatched content, don't rubber-stamp:
1. matches_real_skill: does this genuinely exercise one of the role's REAL required skills listed above?
2. is_realistic_production_task: does this read like a real engineering ticket (a bug fix, a utility a real codebase would need, a specific technical scenario) rather than an abstract puzzle?
3. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
4. teaches_measurable_skill: does solving it require one identifiable technique? Name it in skill_taught.
5. not_toy_problem: confirm this is NOT FizzBuzz-style, NOT a disguised sales/orders/products/invoices database task, NOT a generic textbook algorithm puzzle with no real-world framing.

Return ONLY JSON: {"matches_real_skill": boolean, "is_realistic_production_task": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "not_toy_problem": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: NodeMissionReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})
