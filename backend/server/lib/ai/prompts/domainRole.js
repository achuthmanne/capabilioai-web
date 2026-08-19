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
