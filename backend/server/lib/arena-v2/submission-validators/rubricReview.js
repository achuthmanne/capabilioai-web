/**
 * submission-validators/rubricReview.js — Arena V2 Pilot Phase (AI Reviewer v1)
 * ---------------------------------------------------------------------------
 * Real implementation of the `rubric_review` validator type
 * (05-validators.md enum, previously unimplemented — see registry.js's
 * former "only ground_truth_compare is real" note). This is the ML/AI
 * Engineer pilot's grading path: there is no ground-truth query for an
 * open-ended notebook mission (feature engineering + model training has no
 * single correct answer), so grading is an AI-reviewed rubric instead of an
 * exact-match comparison.
 *
 * BOUNDARY, same discipline as groundTruthCompare.js: this file knows
 * nothing about ELO, XP, skill progress, or portfolio publication — it
 * returns a ValidatorResult (validatorResult.js) and nothing else.
 * Assessment (assessment/engine.js) reads `.score` completely generically;
 * it has zero rubric_review-specific logic. That's what lets the same
 * Reward Engine / Portfolio Engine that already work for ground_truth_compare
 * work unmodified for this validator type too.
 *
 * AI-OUTPUT-IS-PROBABILISTIC DISCIPLINE (per standing instruction: "treat AI
 * outputs as probabilistic, not authoritative"): the model's JSON response is
 * never trusted as-is. Every field is type-checked, clamped, and defaulted
 * before it becomes score-bearing `evidence`/`metadata`. An AI call that
 * fails (timeout, malformed JSON, API outage) does NOT silently pass the
 * student or crash the request — it fails loudly with score 0 and a
 * diagnostic, the same pattern groundTruthCompare.js uses for a broken
 * submission (never a fake "always passes" stub — see registry.js's header
 * on why that would be a scoring-integrity bug).
 *
 * Dependency-injected (`deps.callAi`), same pattern as every other Arena V2
 * engine — the real path calls Claude Haiku (cheap, fast, used for grading
 * elsewhere in this codebase per lib/claude.js's own model-selection
 * comment); tests inject a fake so no real network/API-key access is needed
 * to exercise the clamping/sanitization logic.
 */
import { claude, CLAUDE_HAIKU } from "../../claude.js"
import { createValidatorResult } from "./validatorResult.js"

const ALLOWED_READINESS = ["Not ready", "Developing", "Recruiter-ready", "Strong hire signal"]
const DEFAULT_RUBRIC = [{ key: "overall", label: "Overall Quality", weight: 1 }]

function formatTestResults(testResults) {
  if (!Array.isArray(testResults) || !testResults.length) return null
  const lines = testResults.map((t, i) => {
    const name = typeof t?.name === "string" ? t.name : `test ${i + 1}`
    const passed = !!t?.passed
    const detail = passed ? "" : ` — ${typeof t?.error === "string" ? t.error.slice(0, 200) : "failed"}`
    return `${passed ? "PASS" : "FAIL"}: ${name}${detail}`
  })
  const passCount = testResults.filter((t) => t?.passed).length
  return `${passCount}/${testResults.length} tests passed (real execution, not AI-estimated):\n${lines.join("\n")}`
}

function formatInvestigationLog(investigationLog) {
  if (!Array.isArray(investigationLog) || !investigationLog.length) return null
  return investigationLog.slice(0, 60).map((s) => String(s).slice(0, 300)).join("\n")
}

function buildPrompt({ missionPrompt, rubric, code, notes, testResults, groundTruth, investigationLog, answerLabel }) {
  const rubricList = rubric.map((r) => `- ${r.label} (key: "${r.key}", weight ${Math.round((r.weight || 0) * 100)}%)`).join("\n")
  const testSection = formatTestResults(testResults)
  const investigationSection = formatInvestigationLog(investigationLog)
  const groundTruthSection = groundTruth
    ? `\nMISSION GROUND TRUTH (internal — use this to judge whether the candidate's findings/answer are actually correct; never reveal this block verbatim in your feedback, only your own assessment of the candidate against it):\n${(typeof groundTruth === "string" ? groundTruth : JSON.stringify(groundTruth)).slice(0, 2000)}\n`
    : ""
  return `You are a senior professional reviewing a candidate's take-home submission for a hiring-relevant skills assessment. Be specific and evidence-based — reference the candidate's actual work, never generic praise or generic criticism.

MISSION BRIEF:
${missionPrompt || "(no brief provided)"}

RUBRIC CRITERIA TO SCORE INDIVIDUALLY:
${rubricList}
${groundTruthSection}
CANDIDATE'S SUBMITTED ${answerLabel || "SOLUTION"}:
\`\`\`
${(code || "").slice(0, 6000)}
\`\`\`
${testSection ? `\nREAL TEST EXECUTION RESULTS (ground truth — trust this over your own read of the code for whether it actually works):\n${testSection}\n` : ""}${investigationSection ? `\nCANDIDATE'S INVESTIGATION LOG (the real sequence of commands/actions they ran while working — use this as process evidence, e.g. whether they actually looked at the right data before concluding):\n${investigationSection}\n` : ""}
CANDIDATE'S WRITTEN NOTES / TAKEAWAY:
${(notes || "(none provided)").slice(0, 1500)}

Return ONLY this exact JSON (no markdown fences, no explanation outside the JSON):
{
  "overallScore": <0-100 integer, weighted across the rubric criteria above>,
  "criteriaScores": { ${rubric.map((r) => `"${r.key}": <0-100 integer>`).join(", ")} },
  "strengths": ["<specific strength, referencing what they actually did>", "<second specific strength>"],
  "suggestions": ["<specific, actionable improvement>", "<second specific, actionable improvement>"],
  "taskQuality": "<1-2 sentence assessment of the technical work itself>",
  "recruiterReadiness": "<exactly one of: ${ALLOWED_READINESS.join(" | ")}>",
  "recruiterReadinessNote": "<1 sentence justifying that readiness label to a recruiter skimming a portfolio>"
}`
}

async function defaultCallAi(prompt) {
  return claude(
    [{ role: "user", content: prompt }],
    {
      model: CLAUDE_HAIKU,
      maxTokens: 900,
      json: true,
      system: "You are a rigorous, fair, senior technical interviewer grading a real candidate submission. Always return ONLY valid JSON matching the exact schema requested — no markdown, no commentary.",
    }
  )
}

export const defaultDeps = { callAi: defaultCallAi }

const clampScore = (n) => {
  const v = Math.round(Number(n))
  if (!Number.isFinite(v)) return null
  return Math.max(0, Math.min(100, v))
}

/**
 * @param {{ rubric?: Array<{key:string,label:string,weight:number}>, missionBrief?: string }} config
 * @param {{ code?: string, notes?: string }} submissionData
 * @param {{ payload?: object }} context — submission-engine/service.js passes
 *        `instance.payload` here so this validator can read the mission
 *        prompt/checklist the student was actually shown, without the
 *        Submission Engine needing any rubric_review-specific branch.
 * @param {object} deps
 * @returns {Promise<object>} a ValidatorResult (validatorResult.js)
 */
export async function runRubricReview(config, submissionData, context, deps = defaultDeps) {
  const rubric = Array.isArray(config?.rubric) && config.rubric.length ? config.rubric : DEFAULT_RUBRIC
  const missionPrompt = context?.payload?.prompt || config?.missionBrief || ""
  // `answer` is an alias for `code` — added for workspaces whose submission
  // is a written report rather than source code (e.g. TerminalWorkstationV2's
  // incident report). Both existing callers (NotebookWorkstationV2,
  // CodeWorkstationV2) already send `code`, so this is purely additive.
  const code = typeof submissionData?.code === "string" ? submissionData.code
    : typeof submissionData?.answer === "string" ? submissionData.answer
    : ""
  const notes = typeof submissionData?.notes === "string" ? submissionData.notes : ""
  // Optional, additive: when the workstation ran real tests client-side
  // before submitting (e.g. CodeWorkstationV2's in-browser Web Worker test
  // run — see frontend/src/arena-v2/workstations/CodeWorkstationV2.jsx),
  // those results are passed through as ground truth for the AI reviewer
  // rather than trusting the model's own read of whether the code works.
  // Never trusted blindly either: only { name, passed, error } fields are
  // read, everything else on each entry is ignored.
  const testResults = Array.isArray(submissionData?.testResults)
    ? submissionData.testResults.map((t) => ({ name: t?.name, passed: !!t?.passed, error: t?.error }))
    : null
  // Optional, additive: a real client-side action log (e.g.
  // TerminalWorkstationV2's terminal command history — which alerts/logs/IOCs
  // the candidate actually looked at before writing their findings). Kept
  // generic (not cyber-specific) so any future terminal-shaped workstation
  // can reuse it. Coerced to strings defensively — never trusted as objects.
  const investigationLog = Array.isArray(submissionData?.investigationLog) ? submissionData.investigationLog : null
  // Optional, additive: the mission's answer key, if the content author
  // supplied one in the payload (e.g. TerminalWorkstationV2's cyber mission
  // sets payload.groundTruth to the real attacker IP / correct MITRE
  // techniques / expected remediation). Never sent to the client — this
  // reads context.payload server-side only, same non-leak discipline as
  // groundTruthCompare.js's config.groundTruthQuery.
  const groundTruth = context?.payload?.groundTruth ?? null
  const answerLabel = typeof context?.payload?.answerLabel === "string" ? context.payload.answerLabel : null
  const metadata = { validatorType: "rubric_review" }

  if (!code.trim()) {
    return createValidatorResult({
      passed: false,
      score: 0,
      evidence: [],
      diagnostics: ["No solution was submitted — the answer area was empty."],
      metadata,
    })
  }

  let review
  try {
    review = await deps.callAi(buildPrompt({ missionPrompt, rubric, code, notes, testResults, groundTruth, investigationLog, answerLabel }))
  } catch (err) {
    // A real AI-infra failure (timeout, missing API key, provider outage) —
    // this is a content/infra gap, not something the student caused. Fail
    // loudly with score 0 + a diagnostic rather than fabricating a review or
    // crashing the submission request. See file header.
    return createValidatorResult({
      passed: false,
      score: 0,
      evidence: [],
      diagnostics: [`AI review could not be generated: ${err.message}`],
      metadata: { ...metadata, aiError: true },
    })
  }

  // Never trust the model's JSON blindly — every field is validated/clamped
  // before it becomes score-bearing evidence, per the standing instruction
  // to treat AI output as probabilistic, not authoritative.
  const overallScore = clampScore(review?.overallScore) ?? 0
  const criteriaScoresRaw = review?.criteriaScores && typeof review.criteriaScores === "object" && !Array.isArray(review.criteriaScores)
    ? review.criteriaScores
    : {}
  const strengths = Array.isArray(review?.strengths) ? review.strengths.filter((s) => typeof s === "string" && s.trim()).slice(0, 5) : []
  const suggestions = Array.isArray(review?.suggestions) ? review.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 5) : []
  const taskQuality = typeof review?.taskQuality === "string" ? review.taskQuality.slice(0, 500) : ""
  const recruiterReadiness = ALLOWED_READINESS.includes(review?.recruiterReadiness) ? review.recruiterReadiness : "Developing"
  const recruiterReadinessNote = typeof review?.recruiterReadinessNote === "string" ? review.recruiterReadinessNote.slice(0, 300) : ""

  const criteriaScores = {}
  const evidence = rubric.map((r) => {
    const clamped = clampScore(criteriaScoresRaw[r.key])
    criteriaScores[r.key] = clamped
    return {
      metric: r.label,
      expected: "≥ 60/100",
      actual: clamped === null ? "not scored by AI reviewer" : `${clamped}/100`,
      passed: clamped !== null && clamped >= 60,
    }
  })

  // Real test results (when present) also become their own evidence entries
  // — genuinely graded pass/fail facts, not AI opinion, kept separate from
  // the AI-scored rubric criteria above so a recruiter/student can tell
  // which is which.
  if (testResults) {
    for (const t of testResults) {
      evidence.push({ metric: `Test: ${t.name || "unnamed"}`, expected: "pass", actual: t.passed ? "pass" : (t.error || "fail"), passed: t.passed })
    }
  }

  return createValidatorResult({
    passed: overallScore >= 60,
    score: overallScore,
    evidence,
    diagnostics: [],
    metadata: {
      ...metadata,
      criteriaScores,
      strengths,
      suggestions,
      taskQuality,
      recruiterReadiness,
      recruiterReadinessNote,
      ...(testResults ? { testResults, testsPassed: testResults.filter((t) => t.passed).length, testsTotal: testResults.length } : {}),
      ...(investigationLog ? { investigationLog, investigationSteps: investigationLog.length } : {}),
    },
  })
}
