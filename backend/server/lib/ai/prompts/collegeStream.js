/**
 * prompts/collegeStream.js — Content-expansion pass (2026-08-19).
 *
 * Generates Academic (College) Stream experiments — deterministic,
 * code-execution-graded content, same shape as the real, live CSE
 * experiments (challenge_type: "coding", rubric.type: "python_stdout_match",
 * graded by lib/collegeStream/pythonSandbox.js via routes/
 * arenaCollegeStream.js). See scripts/generateCollegeStreamContent.mjs for
 * the integrity pipeline that runs the AI's reference_solution for real
 * and uses ITS captured stdout as the rubric's expected_stdout — the AI's
 * claimed answer is never trusted, only its code, exactly mirroring
 * generateDomainRoleMissions.mjs's "never trust the claim, verify by
 * execution" rule for the SQL Runner branch.
 */
import { registerPrompt } from "./promptManager.js"
import { z } from "../responseValidator.js"

const ExperimentSchema = z.object({
  title: z.string().min(1),
  prompt: z.string().min(1),
  referenceSolution: z.string().min(1),
})

registerPrompt({
  id: "collegeStream.experimentGeneration",
  version: 1,
  owner: "college-stream-experiments",
  description: "Generates one Academic Stream coding experiment (a concrete numeric problem + a Python reference solution) for a given subject/unit/difficulty — content only. The generator script executes referenceSolution for real and uses its actual stdout as the grading rubric's expected value; it never trusts an AI-claimed answer.",
  variables: ["subjectName", "unitTitle", "difficulty", "fewShotBlock"],
  expectedOutputFormat: "JSON object: {title, prompt, referenceSolution}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are writing an entry-level, auto-graded coding experiment for the "${vars.subjectName}" subject, unit "${vars.unitTitle}", matching the style of these real, already-shipped examples exactly:

${vars.fewShotBlock}

Write ONE new experiment at difficulty "${vars.difficulty}". Requirements:
- Pose a single, concrete, numeric engineering/analytical problem from "${vars.unitTitle}" — give specific numbers (dimensions, loads, values, rates) directly in the prompt so the answer is a single determinate result, not open-ended or a matter of opinion.
- referenceSolution must be a short, real, runnable, self-contained Python 3 script: no stdin, no imports beyond the standard library, no file/network access. It must compute the answer from the exact numbers stated in the prompt and print() the final result (a number or short line of text) — nothing else printed.
- The prompt must state the problem clearly enough that a student reading only the prompt (not your solution) could write their own correct Python script and get the same output.
- difficulty "easy" = a single direct formula/lookup applied once. "medium" = two chained calculation steps (e.g. compute an intermediate value, then use it).
- Do not use random numbers, current time/date, or anything non-deterministic — the same script must always print the same output.

Return ONLY a JSON object with EXACTLY these keys, no other text:
{"title": string, "prompt": string, "referenceSolution": string}`,
    },
  ],
  responseSchema: ExperimentSchema,
  defaultOpts: { capability: "generateText", modelTier: "quality", maxTokens: 1200, temperature: 0.8, json: true },
})

const ReviewSchema = z.object({
  is_standard_curriculum_problem: z.boolean(),
  difficulty_appropriate: z.boolean(),
  teaches_one_clear_concept: z.boolean(),
  concept_taught: z.string().optional().default(""),
  natural_python_framing: z.boolean(),
  reason: z.string().optional().default(""),
})

registerPrompt({
  id: "collegeStream.experimentReview",
  version: 1,
  owner: "college-stream-experiments",
  description: "Strict content-quality review of an already execution-verified Academic Stream experiment before it's eligible to ship — curation, not student scoring.",
  variables: ["subjectName", "unitTitle", "difficulty", "title", "prompt"],
  expectedOutputFormat: "JSON object: {is_standard_curriculum_problem, difficulty_appropriate, teaches_one_clear_concept, concept_taught, natural_python_framing, reason}",
  buildMessages: (vars) => [
    {
      role: "user",
      content: `You are a strict content reviewer for an engineering/academic training platform. Review this coding experiment written for "${vars.subjectName}" > "${vars.unitTitle}" at "${vars.difficulty}" difficulty:

Title: ${vars.title}
Prompt: ${vars.prompt}

Answer honestly — reject generic, mismatched, or contrived content, don't rubber-stamp:
1. is_standard_curriculum_problem: is this a real, standard problem type actually taught in "${vars.unitTitle}" (not a fabricated or unrelated topic)?
2. difficulty_appropriate: does the problem's complexity genuinely match "${vars.difficulty}" for this unit?
3. teaches_one_clear_concept: does solving it require one identifiable concept/technique from this unit? Name it in concept_taught.
4. natural_python_framing: is "write a script that computes and prints this" a natural way to pose this problem — not a forced or contrived shoehorning of a conceptual/qualitative question into a numeric one?

Return ONLY JSON: {"is_standard_curriculum_problem": boolean, "difficulty_appropriate": boolean, "teaches_one_clear_concept": boolean, "concept_taught": string, "natural_python_framing": boolean, "reason": string}
"reason" is required and must explain which check(s) failed, if any — empty string if all pass.`,
    },
  ],
  responseSchema: ReviewSchema,
  defaultOpts: { capability: "generateText", modelTier: "fast", maxTokens: 300, temperature: 0.3, json: true },
})
