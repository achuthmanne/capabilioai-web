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
  starterQuery: z.string().min(1),
  referenceQuery: z.string().min(1),
  expected_result: z.object({
    columns: z.array(z.string()),
    rows: z.array(z.array(z.any())),
  }),
  match_mode: z.enum(["unordered_rows", "ordered_rows"]),
  requirements: z.array(z.string().min(1)).min(2),
  acceptanceCriteria: z.array(z.string().min(1)).min(2),
  company: z.string().min(1),
  manager: z.string().min(1),
  sprint: z.string().min(1),
})

// Vision Reset (2026-08-20) — "Arena is a Virtual Company, not a coding
// platform." A from-scratch "write a SELECT that computes X" spec reads as
// a SQLZoo exercise no matter how realistic the dataset is. Real DBA/data
// work is almost always: someone hands you a query that's ALREADY WRONG or
// ALREADY SLOW, framed as an incident/ticket, and you fix it. starterQuery
// is that broken artifact — shown to the student instead of a blank editor
// (see scripts/generateDomainRoleMissions.mjs + SqlWorkspace.jsx) —
// referenceQuery is the correction, and its real re-executed output (never
// the AI's claim) stays the grading rubric exactly as before.
registerPrompt({
  id: "domainRole.sqlMissionGeneration",
  version: 2,
  owner: "domain-role-missions",
  description: "Generates one entry-level SQL Runner mission framed as a company ticket: a broken/slow starterQuery a junior was handed, plus dataset + corrected referenceQuery + claimed expected result. Content only, never scoring. See scripts/generateDomainRoleMissions.mjs for the sandbox re-execution that verifies this claim before anything is inserted.",
  variables: ["roleLabel", "difficulty", "fewShotBlock", "datasetGuidance"],
  expectedOutputFormat: "JSON object: {title, prompt, dataset{tableName,columns,rows}, starterQuery, referenceQuery, expected_result{columns,rows}, match_mode, requirements, acceptanceCriteria, company, manager, sprint}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `Arena is a virtual company, not a quiz site. You are writing a ticket a real manager would hand a junior "${vars.roleLabel}" on their first or second week, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

Write ONE new ticket for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- ${vars.datasetGuidance}
- The dataset must have 6-10 rows, a short realistic tableName, and 4-7 columns.
- The prompt must read like a ticket/incident report from a colleague or manager (e.g. "The weekly report query is timing out," "This query is returning duplicate rows," "Finance flagged that this query undercounts X") — describe the table's columns inline, then hand off the broken query and ask the student to fix it. Never phrase it as "write a query that computes X" from nothing.
- starterQuery must be a SINGLE valid-to-parse SQLite query that is WRONG in exactly one identifiable way for the stated ticket (wrong filter, missing GROUP BY, wrong JOIN condition, off-by-one in a LIMIT/OFFSET, wrong aggregate function, missing DISTINCT causing duplicates, etc.) — it must run without a syntax error but produce an incorrect or incomplete result against your dataset.
- referenceQuery must be a single valid SQLite SELECT statement — the corrected version of starterQuery — that actually solves the ticket against your dataset.
- expected_result must be EXACTLY what referenceQuery produces when run against your dataset — columns and rows, in the same order the query would return them if match_mode is "ordered_rows", or any order if "unordered_rows".
- match_mode: "ordered_rows" only if the task inherently requires a specific order (e.g. "highest first"); otherwise "unordered_rows".
- requirements: 2-4 short bullet strings stating what the fixed query must do (from the ticket's perspective, e.g. "Must not return duplicate customer rows", "Must only include orders from the current quarter").
- acceptanceCriteria: 2-4 short bullet strings a manager would check before closing the ticket (e.g. "Query returns exactly one row per customer", "Result matches the finance team's manual count of 42").
- Use a realistic Indian company name, manager name, and sprint label, matching the examples' tone.
- difficulty "easy" = the bug is a single WHERE/filter mistake. "medium" = the bug involves a GROUP BY/aggregate mistake. "hard" = the bug involves a multi-condition JOIN/GROUP BY/ORDER BY/LIMIT combination.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "dataset": {"tableName": string, "columns": [string], "rows": [[...]]}, "starterQuery": string, "referenceQuery": string, "expected_result": {"columns": [string], "rows": [[...]]}, "match_mode": "unordered_rows" | "ordered_rows", "requirements": [string], "acceptanceCriteria": [string], "company": string, "manager": string, "sprint": string}`,
    },
  ],
  responseSchema: MissionSchema,
  // 2200, not 1800 — live generation showed frequent schema-validation
  // failures (dataset/starterQuery missing entirely) once starterQuery/
  // requirements/acceptanceCriteria were added on top of the original
  // fields, especially under the weaker fallback model (see Groq rate-
  // limit fallback in aiService.js) — the same truncation pattern the
  // Node generator's own maxTokens comment already documents.
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 2200, temperature: 0.8, json: true },
})

const ReviewSchema = z.object({
  realistic_dataset: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  role_match: z.boolean(),
  feels_like_a_ticket: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.sqlMissionReview",
  version: 2,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already sandbox-validated SQL mission before it's eligible to ship — curation, not student scoring (never touches how a real submission is graded).",
  variables: ["roleLabel", "difficulty", "title", "prompt", "tableName", "columns"],
  expectedOutputFormat: "JSON object: {realistic_dataset, junior_appropriate, teaches_measurable_skill, skill_taught, role_match, feels_like_a_ticket, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform whose product goal is "Arena is a Virtual Company" — every mission must feel like a real assigned work ticket, never a quiz question. Review this SQL mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
Dataset table: ${vars.tableName} (columns: ${vars.columns})

Answer honestly — reject generic, mismatched, or quiz-shaped content, don't rubber-stamp:
1. realistic_dataset: would this table plausibly exist in "${vars.roleLabel}"'s real day-to-day work (or work they'd realistically touch)?
2. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
3. teaches_measurable_skill: does solving it require one identifiable SQL skill (e.g. "WHERE filtering", "GROUP BY aggregation", "multi-column ORDER BY")? Name it in skill_taught.
4. role_match: does the scenario genuinely fit "${vars.roleLabel}" specifically, not a generic unrelated business (e.g. a security role's mission should involve security-adjacent data, not random retail sales)?
5. feels_like_a_ticket: does the prompt read like an incident/bug report handed to the student to FIX an existing broken query — not like "write a SELECT that computes X" from a blank slate?

Return ONLY JSON: {"realistic_dataset": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "role_match": boolean, "feels_like_a_ticket": boolean, "reason": string}
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
  starterCode: z.string().min(1),
  referenceSolution: z.string().min(1),
  usePackages: z.boolean(),
  requirements: z.array(z.string().min(1)).min(2),
  acceptanceCriteria: z.array(z.string().min(1)).min(2),
  company: z.string().min(1),
  manager: z.string().min(1),
  sprint: z.string().min(1),
})

// Vision Reset (2026-08-20) — same "starter artifact + ticket" shift as
// domainRole.sqlMissionGeneration above, applied to Python/ML-shaped
// roles. "Write a function that computes X" is a HackerRank problem no
// matter how well it maps to the role's skill graph; "this notebook cell
// mislabels every row where X — fix the preprocessing step" is a Week-1
// task a real ML engineer gets handed. starterCode is what ships in the
// editor instead of a blank buffer (see PythonWorkspace.jsx); it is
// EXPECTED to run and produce the wrong output — that mismatch is the bug
// the student fixes. referenceSolution is the corrected version, and its
// real re-executed stdout (never the AI's claim) stays the grading rubric.
registerPrompt({
  id: "domainRole.pythonMissionGeneration",
  version: 2,
  owner: "domain-role-missions",
  description: "Generates one entry-level Python job-task mission framed as a company ticket: broken/incomplete starterCode a junior inherited, plus a corrected referenceSolution, for a role whose real skill graph is Python/ML-shaped. Content only. The generator script executes referenceSolution for real and uses its actual stdout as the grading rubric; it never trusts an AI-claimed answer.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, starterCode, referenceSolution, usePackages, requirements, acceptanceCriteria, company, manager, sprint}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `Arena is a virtual company, not a quiz site. You are writing a ticket a real manager would hand a junior "${vars.roleLabel}" on their first or second week, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

This role's ACTUAL required skills (grounded in real job requirements, not generic programming): ${vars.roleSkillsList}

Write ONE new ticket for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- The task must exercise one of this role's real skills above — never a generic SQL/business-database task, never unrelated to what this role actually does day to day.
- The prompt must read like a ticket from a colleague or manager describing something ALREADY WRONG or INCOMPLETE (e.g. "This preprocessing step is dropping valid rows," "The model's accuracy dropped after the last data refresh — find and fix the bug," "This feature-engineering function throws on empty inputs," "QA found the confusion-matrix helper miscounts false positives") — never phrase it as "write a function that computes X" from nothing.
- starterCode must be a short, real, runnable-as-is Python 3 script containing the SAME functions/structure as referenceSolution but with exactly one identifiable bug or missing piece (wrong condition, off-by-one, missing edge-case handling, wrong formula/aggregation, mis-scaled feature, etc.) — it must run without crashing and must print something DIFFERENT from (or fail before reaching) the correct output. Do not leave a syntax error or a crash as "the bug" — the bug must be a logic error a student can read and reason about.
- referenceSolution must be a short, real, runnable Python 3 script — the corrected version of starterCode: no stdin, no file/network access, no imports beyond the standard library UNLESS the task genuinely needs numpy/pandas/scikit-learn/Pillow (set usePackages true in that case). Prefer stdlib-only (usePackages: false) whenever the task doesn't genuinely need those libraries.
- If usePackages is true, keep any model-training step tiny (a few hundred rows at most, a classical scikit-learn model like LogisticRegression/DecisionTree/KMeans — never a deep-learning framework) so it finishes in a few seconds.
- The prompt must state the problem clearly enough that a student reading only the prompt and starterCode (not your reference solution) could identify and fix the bug themselves.
- requirements: 2-4 short bullet strings stating what the fixed code must do (from the ticket's perspective).
- acceptanceCriteria: 2-4 short bullet strings a manager would check before closing the ticket (concrete, checkable outcomes).
- Use a realistic Indian company name, manager name, and sprint label.
- difficulty "easy" = the bug is a single, localized logic error. "medium" = the bug involves an edge case or a second interacting step. "hard" = the bug is a multi-step pipeline issue (e.g. a feature-engineering step feeding a training/evaluation step incorrectly).
- Do not use random numbers, current time/date, or anything non-deterministic — the same script must always print the same output. If a scikit-learn model is involved, always pass a fixed random_state.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "starterCode": string, "referenceSolution": string, "usePackages": boolean, "requirements": [string], "acceptanceCriteria": [string], "company": string, "manager": string, "sprint": string}`,
    },
  ],
  responseSchema: PythonMissionSchema,
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 2000, temperature: 0.8, json: true },
})

const PythonMissionReviewSchema = z.object({
  matches_real_skill: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  not_generic_sql: z.boolean(),
  feels_like_a_ticket: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.pythonMissionReview",
  version: 2,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already execution-verified Python job-task mission before it's eligible to ship — curation, not student scoring.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {matches_real_skill, junior_appropriate, teaches_measurable_skill, skill_taught, not_generic_sql, feels_like_a_ticket, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform whose product goal is "Arena is a Virtual Company" — every mission must feel like a real assigned work ticket, never a quiz question. Review this Python mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
This role's real required skills: ${vars.roleSkillsList}

Answer honestly — reject generic, quiz-shaped, or mismatched content, don't rubber-stamp:
1. matches_real_skill: does this genuinely exercise one of the role's REAL required skills listed above (not a generic programming exercise unrelated to the role)?
2. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
3. teaches_measurable_skill: does solving it require one identifiable technique? Name it in skill_taught.
4. not_generic_sql: confirm this is NOT a disguised SQL/business-database query task (revenue, orders, products, sales, invoices) — this role's real skills rarely include that.
5. feels_like_a_ticket: does the prompt read like a bug report / incident handed to the student to FIX existing broken code — not like "write a function that computes X" from a blank slate?

Return ONLY JSON: {"matches_real_skill": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "not_generic_sql": boolean, "feels_like_a_ticket": boolean, "reason": string}
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
  starterCode: z.string().min(1),
  referenceSolution: z.string().min(1),
  requirements: z.array(z.string().min(1)).min(2),
  acceptanceCriteria: z.array(z.string().min(1)).min(2),
  company: z.string().min(1),
  manager: z.string().min(1),
  sprint: z.string().min(1),
})

// Vision Reset (2026-08-20) — "Arena is a Virtual Company. Every mission
// must feel like a Jira ticket, not a coding challenge." Even a fully
// realistic-sounding spec ("implement a rate limiter class") still reads
// as LeetCode/HackerRank if the student starts from a blank file. Real
// Week-1/Week-2 engineering work is almost always: inherit someone else's
// code, something is broken or half-done, fix/finish it. starterCode below
// is that inherited artifact — it ships pre-loaded in the editor (see
// NodeWorkspace.jsx) instead of an empty buffer, and is EXPECTED to run
// and print the WRONG thing; that gap is the bug the student closes.
// referenceSolution is the corrected/completed version, and its real
// re-executed stdout (never the AI's claim) stays the grading rubric,
// unchanged from before.
registerPrompt({
  id: "domainRole.nodeMissionGeneration",
  version: 2,
  owner: "domain-role-missions",
  description: "Generates one entry-level Node.js/JavaScript job-task mission framed as a company ticket: broken/incomplete starterCode a junior inherited, plus a corrected referenceSolution, for a Software Engineering role. Content only. The generator script executes referenceSolution for real and uses its actual stdout as the grading rubric; it never trusts an AI-claimed answer.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, starterCode, referenceSolution, requirements, acceptanceCriteria, company, manager, sprint}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `Arena is a virtual company, not a coding-challenge site. You are writing a ticket a real engineering manager would hand a junior "${vars.roleLabel}" during their first or second week on the job, matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

This role's ACTUAL required skills (grounded in real job requirements): ${vars.roleSkillsList}

Write ONE new ticket for "${vars.roleLabel}" at difficulty "${vars.difficulty}". Requirements:
- The task must exercise one of this role's real skills above, framed as a ticket describing something ALREADY BROKEN, ALREADY SLOW, or ALREADY INCOMPLETE in existing code — e.g. "The login endpoint's JWT check passes even for expired tokens — find and fix the bug in the verification function," "The rate limiter is letting through more requests than the configured limit under bursty traffic — fix the logic," "This cache eviction is evicting the wrong entry — QA found stale data being served," "The pagination helper skips the last page under certain totals — fix it," "This retry-with-backoff implementation retries forever on a non-retryable error — bound and fix it." NEVER phrase it as "implement a class/function that does X" from a blank file — the student is debugging/fixing/completing SOMEONE ELSE'S code, not writing fresh code to a spec.
- ABSOLUTELY DO NOT write: toy textbook problems (FizzBuzz, reverse-a-string-style puzzles with no real-world framing), generic CRUD boilerplate, or ANY task involving a sales/orders/products/invoices/customers business database. Every task must read like a real, specific engineering ticket someone already triaged.
- Since this runs in a plain Node.js sandbox (no HTTP server, no real network/filesystem, no npm packages beyond Node's own built-in modules that don't touch fs/net/http/child_process), frame server/API-shaped tasks as testable PURE FUNCTIONS or IN-MEMORY SIMULATIONS — e.g. "the middleware FUNCTION that validates a JWT payload object and returns {valid, reason}" rather than "an Express server," or "a rate-limiter class with a .allow(key) method exercised against a sequence of calls" rather than "a deployed rate limiter." The engineering substance stays completely real; only the execution harness is a plain function call, never a live server/network/file operation.
- starterCode must be a short, real, runnable-as-is Node.js script containing the SAME functions/classes/structure as referenceSolution but with exactly one identifiable bug or missing piece (wrong comparison operator, off-by-one, missing edge-case branch, wrong formula, stale/incorrectly-updated state, etc.) — it must run without crashing and must print something DIFFERENT from the correct output (or handle the test sequence incorrectly). The bug must be a logic error a student can read and reason about, never a syntax error or crash.
- Pose a concrete, self-contained scenario with specific inputs (a small embedded array/object of test data, or values defined directly in the code) so the correct answer is a single determinate result, not open-ended.
- referenceSolution must be a short, real, runnable Node.js script — the corrected version of starterCode: plain JavaScript, no require()/import of fs/net/http/child_process/dgram/cluster, no process.env, no eval/Function constructor, must console.log() the final result and nothing else.
- The prompt must state the ticket clearly enough that a student reading only the prompt and starterCode (not your reference solution) could identify and fix the bug themselves.
- requirements: 2-4 short bullet strings stating what the fixed code must do (from the ticket's perspective, e.g. "Must reject tokens where exp is in the past", "Must not let more than N requests through in any rolling window").
- acceptanceCriteria: 2-4 short bullet strings a manager would check before closing the ticket (concrete, checkable outcomes, e.g. "verifyJwt returns {valid:false, reason:'expired'} for the sample expired token").
- Use a realistic Indian company name, manager name, and sprint label.
- difficulty "easy" = the bug is a single, localized logic error. "medium" = the bug involves an edge case or a second interacting step. "hard" = the bug is a multi-step interaction (e.g. validation + transformation + a computed result feeding each other incorrectly).
- Do not use random numbers, current time/date, or anything non-deterministic — the same script must always print the same output.
- Keep the printed output SIMPLE — a plain number, a plain string, or a short comma-separated line (e.g. console.log(results.join(","))). Avoid designs whose reference solution must console.log(JSON.stringify(...)) a nested array/object, and avoid embedding example code blocks (fenced with backticks) inside the "prompt" string itself — both of these have caused real, observed JSON-formatting failures in this exact pipeline. Describe any test sequence in plain prose instead of a fenced code sample.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "starterCode": string, "referenceSolution": string, "requirements": [string], "acceptanceCriteria": [string], "company": string, "manager": string, "sprint": string}`,
    },
  ],
  responseSchema: NodeMissionSchema,
  // 2200, not 2000 — starterCode is new content on top of the fields that
  // already needed 2000 (see the prior version's comment: real Node
  // missions run longer than Python/SQL and were observed hitting
  // max_tokens mid-JSON before this field existed).
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 2200, temperature: 0.8, json: true },
})

const NodeMissionReviewSchema = z.object({
  matches_real_skill: z.boolean(),
  is_realistic_production_task: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  not_toy_problem: z.boolean(),
  feels_like_a_ticket: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.nodeMissionReview",
  version: 2,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already execution-verified Node.js job-task mission before it's eligible to ship — curation, not student scoring.",
  variables: ["roleLabel", "roleSkillsList", "difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {matches_real_skill, is_realistic_production_task, junior_appropriate, teaches_measurable_skill, skill_taught, not_toy_problem, feels_like_a_ticket, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform whose product goal is "Arena is a Virtual Company" — every mission must feel like a real Jira ticket handed to a new hire, never a coding-challenge-site puzzle. Review this Node.js mission written for the "${vars.roleLabel}" role at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}
This role's real required skills: ${vars.roleSkillsList}

Answer honestly — reject generic, toy, or mismatched content, don't rubber-stamp:
1. matches_real_skill: does this genuinely exercise one of the role's REAL required skills listed above?
2. is_realistic_production_task: does this read like a real engineering ticket (a bug fix, a utility a real codebase would need, a specific technical scenario) rather than an abstract puzzle?
3. junior_appropriate: would a real junior/entry-level employee in this role actually be asked to do this?
4. teaches_measurable_skill: does solving it require one identifiable technique? Name it in skill_taught.
5. not_toy_problem: confirm this is NOT FizzBuzz-style, NOT a disguised sales/orders/products/invoices database task, NOT a generic textbook algorithm puzzle with no real-world framing.
6. feels_like_a_ticket: does the student inherit EXISTING (buggy/incomplete) code to fix, rather than writing a fresh implementation to a spec from a blank file? A mission whose prompt says "implement X" with no bug to find should fail this check.

Return ONLY JSON: {"matches_real_skill": boolean, "is_realistic_production_task": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "not_toy_problem": boolean, "feels_like_a_ticket": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: NodeMissionReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})

// ── frontend_runner mission generation (Vision Reset, 2026-08-20) ─────────
// The product spec's own verbatim Frontend Developer example: "Marketing
// reported the pricing cards break on mobile. Fix the responsive layout
// without changing desktop behaviour. Commit your changes." — a CSS bug
// ticket against EXISTING markup, never a from-scratch build. See
// cssRuleChecker.js's header for why grading is structural (parsed CSS
// declarations inside/outside specific @media breakpoints), not a real
// rendered-pixel diff — that would need a headless browser, a materially
// larger and riskier piece of new infrastructure this phase deliberately
// does not add (documented there, not silently skipped here).
const CssCheckSchema = z.object({
  description: z.string().min(1),
  selector: z.string().min(1),
  property: z.string().min(1),
  expectedValue: z.string().min(1),
  mediaMaxWidth: z.number().nullable(),
})

const FrontendMissionSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  html: z.string().min(1),
  starterCss: z.string().min(1),
  referenceCss: z.string().min(1),
  checks: z.array(CssCheckSchema).min(2).max(5),
  requirements: z.array(z.string().min(1)).min(2),
  acceptanceCriteria: z.array(z.string().min(1)).min(2),
  company: z.string().min(1),
  manager: z.string().min(1),
  sprint: z.string().min(1),
})

registerPrompt({
  id: "domainRole.frontendMissionGeneration",
  version: 2,
  owner: "domain-role-missions",
  description: "Generates one entry-level Frontend Developer CSS bug-fix ticket: fixed HTML markup, a broken starterCss a junior inherited, a corrected referenceCss, and a small set of structural CSS checks. Content only — the generator script re-parses referenceCss with the SAME checker that grades students and requires every check to pass, and re-parses starterCss and requires at least one check to fail, before anything is inserted.",
  variables: ["difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, html, starterCss, referenceCss, checks[{description,selector,property,expectedValue,mediaMaxWidth}], requirements, acceptanceCriteria, company, manager, sprint}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `Arena is a virtual company, not a coding-challenge site. You are writing a CSS bug-fix ticket a real engineering manager would hand a junior Frontend Developer during their first or second week, matching the style of this real, already-shipped example exactly:

${vars.fewShotBlock}

Write ONE new ticket at difficulty "${vars.difficulty}". Requirements:
- The prompt must read like a real ticket describing a VISUAL/LAYOUT bug already reported by a colleague (marketing, QA, a designer, a support ticket) — e.g. "the pricing cards don't stack on mobile," "the nav overlaps the logo below 480px," "the footer columns collapse into an unreadable single line on tablet," "the modal doesn't center vertically on small screens." Never phrase it as "build a component that does X" from nothing.
- html must be a small (roughly 10-30 lines), realistic, self-contained HTML fragment (a handful of nested divs/elements with sensible class names — a pricing section, a card grid, a nav bar, a footer, etc.) — no <script>, no external resources, no <html>/<head>/<body> wrapper (it gets embedded into a preview shell). This html is FIXED — the same for starterCss and referenceCss — only the CSS changes.
- starterCss must be a real, complete stylesheet for that html that looks correct at desktop width but has EXACTLY ONE identifiable responsive/layout bug relative to referenceCss (a missing or wrong @media breakpoint, wrong flex-direction/display value inside a breakpoint, a wrong max-width, an overflow issue, etc.).
- referenceCss must be the corrected version of starterCss — the same stylesheet with only the bug fixed. Desktop-only (no @media block) rules should be IDENTICAL between starterCss and referenceCss unless the ticket is explicitly about desktop behavior — "fix mobile without changing desktop" is the default expectation.
- checks: 2-4 structural assertions a real reviewer would verify, each with: description (plain English), selector (a CSS class/id selector that appears in html), property (a CSS property name), expectedValue (the exact value referenceCss sets for that property in the relevant context), and mediaMaxWidth (a number in px if the check applies inside a "max-width: Npx" media query, or null if it applies at the top level / outside any media query — e.g. a "desktop behaviour is unchanged" check). At least one check must have a non-null mediaMaxWidth (the actual responsive fix), and if the ticket says desktop must stay the same, include one check with mediaMaxWidth: null verifying that.
- CRITICAL grading constraint: checks are graded by a literal CSS declaration search, NOT a rendered browser — for EVERY check, referenceCss MUST contain that exact selector, inside that exact media context (top-level if mediaMaxWidth is null, inside a "max-width: Npx" block with Npx <= the check's mediaMaxWidth otherwise), with a declaration setting EXACTLY that property to EXACTLY that value — written explicitly, even if it happens to equal a CSS default (e.g. still write "flex-direction: row" explicitly even though row is flex's initial value; never omit a declaration because "the browser already defaults to that"). Only use "max-width" media queries — never "min-width" — and never nest a mediaMaxWidth:null check's selector/property inside ANY @media block, including a min-width one. Before finalizing, mentally re-check every single check against your own referenceCss line by line — every check must be trivially findable as a literal declaration.
- requirements: 2-4 short bullet strings stating what the fixed CSS must do.
- acceptanceCriteria: 2-4 short bullet strings a manager would check before closing the ticket.
- Use a realistic Indian company name, manager name, and sprint label.
- difficulty "easy" = one straightforward breakpoint fix. "medium" = the fix involves two related properties (e.g. flex-direction AND width). "hard" = the fix spans two different breakpoints or a layout technique change (e.g. grid-template-columns changing at two widths).

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "html": string, "starterCss": string, "referenceCss": string, "checks": [{"description": string, "selector": string, "property": string, "expectedValue": string, "mediaMaxWidth": number|null}], "requirements": [string], "acceptanceCriteria": [string], "company": string, "manager": string, "sprint": string}`,
    },
  ],
  responseSchema: FrontendMissionSchema,
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 2200, temperature: 0.8, json: true },
})

const FrontendMissionReviewSchema = z.object({
  is_realistic_production_task: z.boolean(),
  junior_appropriate: z.boolean(),
  teaches_measurable_skill: z.boolean(),
  skill_taught: z.string().optional().default(""),
  feels_like_a_ticket: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "domainRole.frontendMissionReview",
  version: 1,
  owner: "domain-role-missions",
  description: "Strict content-quality review of an already checker-verified Frontend CSS mission before it's eligible to ship — curation, not student scoring.",
  variables: ["difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {is_realistic_production_task, junior_appropriate, teaches_measurable_skill, skill_taught, feels_like_a_ticket, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an entry-level professional training platform whose product goal is "Arena is a Virtual Company" — every mission must feel like a real Jira ticket handed to a new hire. Review this Frontend Developer CSS mission at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}

Answer honestly — reject generic, toy, or mismatched content, don't rubber-stamp:
1. is_realistic_production_task: does this read like a real reported UI/layout bug, not an abstract exercise?
2. junior_appropriate: would a real junior/entry-level Frontend Developer actually be asked to do this?
3. teaches_measurable_skill: does solving it require one identifiable CSS/responsive-design technique? Name it in skill_taught.
4. feels_like_a_ticket: does the prompt describe something ALREADY BROKEN in existing markup/styles that needs fixing, not "build this component from scratch"?

Return ONLY JSON: {"is_realistic_production_task": boolean, "junior_appropriate": boolean, "teaches_measurable_skill": boolean, "skill_taught": string, "feels_like_a_ticket": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: FrontendMissionReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})

registerPrompt({
  id: "domainRole.frontendMissionFeedback",
  version: 1,
  owner: "domain-role-missions",
  description: "Best-effort AI *explanation* layered on top of an already-final, deterministic frontend_runner (CSS checklist) score/passed verdict — never decides the verdict itself.",
  variables: ["prompt", "css", "passed", "score", "reason", "checklistSummary"],
  expectedOutputFormat: "Plain text, 2-3 short sentences — not JSON.",
  buildMessages: (vars) => [
    {
      role: "system",
      content: "You coach students on frontend CSS bug-fix mission attempts. In 2-3 short sentences, explain the result plainly — which required styles are in place and which are still missing — using ONLY the facts given. Never invent a pass/fail verdict or a score; those are already decided and given to you as fact. If the result FAILED, your tone must be direct and unambiguous that it failed — never encouraging, never softened to sound like a near-success. If it PASSED, be genuinely positive and specific about what was done right.",
    },
    {
      role: "user",
      content: `Mission: ${vars.prompt}\nSubmitted CSS:\n${vars.css}\nResult: ${vars.passed ? "PASSED" : "FAILED"} (score ${vars.score}/100)\nDeterministic reason: ${vars.reason || "n/a"}\nChecklist: ${vars.checklistSummary}`,
    },
  ],
  responseSchema: null,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 150, temperature: 0.4, json: false },
})
