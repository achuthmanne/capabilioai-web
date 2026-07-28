import { test } from "node:test"
import assert from "node:assert/strict"
import { runRubricReview } from "./rubricReview.js"

const RUBRIC = [
  { key: "correctness", label: "Correctness & Approach", weight: 0.4 },
  { key: "feature_engineering", label: "Feature Engineering", weight: 0.2 },
  { key: "code_quality", label: "Code Quality", weight: 0.2 },
  { key: "communication", label: "Communication", weight: 0.2 },
]
const CONFIG = { rubric: RUBRIC }
const CONTEXT = { payload: { prompt: "Predict customer churn from the seeded dataset." } }

test("fails cleanly (score 0, no AI call) when no code was submitted", async () => {
  let called = false
  const deps = { callAi: async () => { called = true; return {} } }
  const result = await runRubricReview(CONFIG, { code: "" }, CONTEXT, deps)
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
  assert.deepEqual(result.evidence, [])
  assert.match(result.diagnostics[0], /No solution was submitted/)
  assert.equal(called, false)
})

test("maps a well-formed AI review into a passing ValidatorResult with per-criterion evidence", async () => {
  const fakeReview = {
    overallScore: 82,
    criteriaScores: { correctness: 85, feature_engineering: 75, code_quality: 80, communication: 90 },
    strengths: ["Engineered a meaningful avg_charge_per_month feature", "Model trained without errors"],
    suggestions: ["Try a train/test split to validate generalization"],
    taskQuality: "Solid first-pass model with real feature engineering.",
    recruiterReadiness: "Recruiter-ready",
    recruiterReadinessNote: "Demonstrates real end-to-end ML workflow.",
  }
  const deps = { callAi: async () => fakeReview }
  const result = await runRubricReview(CONFIG, { code: "df['x'] = df.a / df.b\nmodel.fit(X, y)", notes: "Used logistic regression." }, CONTEXT, deps)

  assert.equal(result.passed, true)
  assert.equal(result.score, 82)
  assert.equal(result.evidence.length, 4)
  assert.equal(result.evidence[0].metric, "Correctness & Approach")
  assert.equal(result.evidence[0].actual, "85/100")
  assert.equal(result.evidence[0].passed, true)
  assert.equal(result.metadata.recruiterReadiness, "Recruiter-ready")
  assert.equal(result.metadata.strengths.length, 2)
  assert.equal(result.metadata.suggestions.length, 1)
  assert.deepEqual(result.diagnostics, [])
})

test("never trusts the AI's output blindly — clamps out-of-range scores and rejects malformed fields", async () => {
  const fakeReview = {
    overallScore: 250,               // out of range — must clamp to 100
    criteriaScores: { correctness: -40, feature_engineering: "not a number", code_quality: 60 }, // missing communication key entirely
    strengths: "not an array",       // wrong type — must become []
    suggestions: [1, 2, "a real one"], // non-strings filtered out
    taskQuality: 12345,              // wrong type — must become ""
    recruiterReadiness: "Definitely hire immediately!!!", // not in the allowed enum — must fall back
  }
  const deps = { callAi: async () => fakeReview }
  const result = await runRubricReview(CONFIG, { code: "print('hi')" }, CONTEXT, deps)

  assert.equal(result.score, 100) // clamped
  assert.equal(result.evidence.find((e) => e.metric === "Correctness & Approach").actual, "0/100") // clamped from -40
  assert.equal(result.evidence.find((e) => e.metric === "Feature Engineering").actual, "not scored by AI reviewer")
  assert.equal(result.evidence.find((e) => e.metric === "Communication").actual, "not scored by AI reviewer")
  assert.deepEqual(result.metadata.strengths, [])
  assert.deepEqual(result.metadata.suggestions, ["a real one"])
  assert.equal(result.metadata.taskQuality, "")
  assert.equal(result.metadata.recruiterReadiness, "Developing") // fallback default
})

test("fails loudly with score 0 and a diagnostic (never fabricates a review) when the AI call itself fails", async () => {
  const deps = { callAi: async () => { throw new Error("upstream timeout") } }
  const result = await runRubricReview(CONFIG, { code: "df.head()" }, CONTEXT, deps)
  assert.equal(result.passed, false)
  assert.equal(result.score, 0)
  assert.deepEqual(result.evidence, [])
  assert.match(result.diagnostics[0], /AI review could not be generated: upstream timeout/)
  assert.equal(result.metadata.aiError, true)
})

test("passes real test-execution results through to the AI prompt and appends them as their own evidence entries", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 90, criteriaScores: { correctness: 95, feature_engineering: 80, code_quality: 90, communication: 85 } }
    },
  }
  const submissionData = {
    code: "function applyDiscount(amount) { return amount > 100 ? amount * 0.9 : amount }",
    testResults: [
      { name: "discounts orders over 100", passed: true },
      { name: "does not discount small orders", passed: false, error: "expected 50, got 45" },
    ],
  }
  const result = await runRubricReview(CONFIG, submissionData, CONTEXT, deps)

  assert.match(sentPrompt, /REAL TEST EXECUTION RESULTS/)
  assert.match(sentPrompt, /1\/2 tests passed/)
  assert.match(sentPrompt, /PASS: discounts orders over 100/)
  assert.match(sentPrompt, /FAIL: does not discount small orders — expected 50, got 45/)

  const testEvidence = result.evidence.filter((e) => e.metric.startsWith("Test:"))
  assert.equal(testEvidence.length, 2)
  assert.equal(testEvidence[0].passed, true)
  assert.equal(testEvidence[1].passed, false)
  assert.equal(testEvidence[1].actual, "expected 50, got 45")
  assert.equal(result.metadata.testsPassed, 1)
  assert.equal(result.metadata.testsTotal, 2)
})

test("omits the test-execution section from the prompt entirely when no testResults were provided (e.g. the ML pilot)", async () => {
  let sentPrompt = null
  const deps = { callAi: async (prompt) => { sentPrompt = prompt; return { overallScore: 70 } } }
  await runRubricReview(CONFIG, { code: "df.head()" }, CONTEXT, deps)
  assert.doesNotMatch(sentPrompt, /REAL TEST EXECUTION RESULTS/)
})

test("accepts submissionData.answer as an alias for submissionData.code (report-shaped workspaces, e.g. TerminalWorkstationV2)", async () => {
  const deps = { callAi: async () => ({ overallScore: 75 }) }
  const result = await runRubricReview(CONFIG, { answer: "The attacker IP was 203.0.113.77, correlated via failed-login spike." }, CONTEXT, deps)
  assert.equal(result.score, 75)
  assert.notEqual(result.diagnostics[0], "No solution was submitted — the answer area was empty.")
})

test("fails cleanly when neither code nor answer is present", async () => {
  const deps = { callAi: async () => { throw new Error("should not be called") } }
  const result = await runRubricReview(CONFIG, {}, CONTEXT, deps)
  assert.equal(result.score, 0)
  assert.match(result.diagnostics[0], /answer area was empty/)
})

test("includes mission ground truth and the investigation log in the prompt when the payload/submission provide them", async () => {
  let sentPrompt = null
  const deps = { callAi: async (prompt) => { sentPrompt = prompt; return { overallScore: 80 } } }
  const context = {
    payload: {
      prompt: "Investigate the brute-force alert.",
      groundTruth: { attackerIp: "203.0.113.77", correctTechniques: ["T1110"] },
      answerLabel: "INCIDENT REPORT",
    },
  }
  const submissionData = {
    answer: "Findings: 203.0.113.77 is the attacker.",
    investigationLog: ["grep 203.0.113.77 auth.log", "ioc-lookup 203.0.113.77", "mitre T1110"],
  }
  await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /203\.0\.113\.77/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /ioc-lookup 203\.0\.113\.77/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED INCIDENT REPORT/)
})

test("handles a fourth, infra-console-shaped submission (DevOps rollout incident) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = { callAi: async (prompt) => { sentPrompt = prompt; return { overallScore: 88, criteriaScores: { correctness: 90, investigation_quality: 85, remediation_quality: 88, communication: 90 } } } }
  const context = {
    payload: {
      prompt: "Diagnose the checkout-service rollout crash-loop.",
      groundTruth: {
        rootCause: "The revision 14 configmap push dropped the DB_POOL_SIZE key.",
        correctActions: ["Roll back to revision 13", "Restore DB_POOL_SIZE in the configmap"],
      },
      answerLabel: "INCIDENT REPORT & REMEDIATION PLAN",
    },
  }
  const submissionData = {
    answer: "Root cause: DB_POOL_SIZE was dropped from the checkout-env configmap in revision 14, so the DB pool fails to init and the pod exits. Rolling back to revision 13 restores service; the configmap fix should be validated in staging before redeploying v2.4.0 behind a canary.",
    investigationLog: ["get pods", "logs checkout-service-7f9c4-abcde", "terraform plan", "rollout history checkout-service"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /DB_POOL_SIZE/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /terraform plan/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED INCIDENT REPORT & REMEDIATION PLAN/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 88)
})

test("handles a fifth, DB-lab-shaped submission (DBA index optimization) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 92, criteriaScores: { correctness: 95, query_reasoning: 90, performance_improvement: 92, communication: 88 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the slow customer order-history query.",
      groundTruth: {
        correctIndexDdl: "CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);",
        reasoning: "A composite index on (customer_id, created_at DESC) satisfies both the filter and the ORDER BY in one index scan.",
      },
      answerLabel: "INDEX RECOMMENDATION & PERFORMANCE ANALYSIS",
    },
  }
  const submissionData = {
    answer: "CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);\n\nThis composite index matches the equality filter on customer_id and the range filter on created_at in a single index scan, and satisfies the ORDER BY so no extra sort is needed. Execution time drops from about 814ms to under 1ms.",
    investigationLog: ["DESCRIBE orders", "EXPLAIN ANALYZE SELECT ...", "SIMULATE CREATE INDEX idx_orders_customer_created ON orders (customer_id, created_at DESC);"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /idx_orders_customer_created/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /EXPLAIN ANALYZE/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED INDEX RECOMMENDATION & PERFORMANCE ANALYSIS/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 92)
})

test("handles a sixth, analog-lab-shaped submission (ECE gain-stage fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 90, criteriaScores: { correctness: 92, circuit_reasoning: 88, measurement_reasoning: 90, communication: 90 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the clipped pressure sensor gain stage.",
      groundTruth: {
        correctRf: "approximately 51 kOhm, giving a gain near 6.1 with the existing 10 kOhm R1",
        reasoning: "180 kOhm sets a gain of 19, which clips against the 3.3V rail above about 35 PSI.",
      },
      answerLabel: "COMPONENT FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Replace Rf, currently 180 kOhm, with approximately 51 kOhm. With R1 = 10 kOhm this sets a gain of about 6.1, mapping the full 0-0.5V sensor range to about 0-3.05V without exceeding the 3.3V rail, while still using nearly the full ADC input range for good resolution.",
    investigationLog: ["PROBE op-amp output vs pressure sweep", "SIMULATE Rf=51 kOhm (gain≈6.1x)"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /51 kOhm/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE Rf/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED COMPONENT FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 90)
})

test("handles a seventh, power-lab-shaped submission (EEE bulk-capacitor fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 91, criteriaScores: { correctness: 93, power_path_reasoning: 89, measurement_reasoning: 92, communication: 90 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the motor turn-on rail droop.",
      groundTruth: {
        correctCapacitance: "approximately 100 uF",
        reasoning: "22 uF droops the rail to about 3.73V, well below the 4.5V brownout threshold.",
      },
      answerLabel: "COMPONENT FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Replace the 22 uF bulk capacitor with approximately 100 uF. That limits the droop during the 2.8A motor turn-on step to about 0.28V, keeping the rail at about 4.72V, comfortably above the 4.5V brownout threshold, without oversizing the capacitor bank.",
    investigationLog: ["PROBE rail voltage during motor turn-on", "SIMULATE C_BULK=100 uF"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /100 uF/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE C_BULK/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED COMPONENT FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 91)
})

test("handles an eighth, structural-lab-shaped submission (Civil beam-section fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 89, criteriaScores: { correctness: 92, system_reasoning: 87, measurement_reasoning: 88, communication: 88 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the mezzanine beam deflection.",
      groundTruth: {
        correctBeam: "W8x13, moment of inertia about 39.6 in^4",
        reasoning: "The installed W8x10 deflects about 0.81 in, exceeding the L/360 limit of about 0.67 in.",
      },
      answerLabel: "COMPONENT FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Specify a W8x13 (I about 39.6 in^4) in place of the installed W8x10. Deflection under the 200 lb/ft live load over the 20 ft span drops to about 0.63 in, within the L/360 limit of about 0.67 in with a reasonable margin.",
    investigationLog: ["PROBE midspan deflection under rated live load", "SIMULATE section=W8x13 (I≈39.6 in^4)"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /W8x13/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE section/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED COMPONENT FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 89)
})

test("handles a ninth, drivetrain-lab-shaped submission (Mechanical gearbox-ratio fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 90, criteriaScores: { correctness: 93, mechanical_reasoning: 88, measurement_reasoning: 90, communication: 89 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the conveyor speed and torque mismatch.",
      groundTruth: {
        correctRatio: "approximately 45 to 1",
        reasoning: "The installed 30:1 ratio overspeeds the belt to about 91.6 ft/min and undertorques to about 81 lb-ft.",
      },
      answerLabel: "COMPONENT FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Replace the 30:1 gearbox with approximately 45:1. That brings belt speed to about 61 ft/min, within the 60 ft/min target band, and raises drum torque to about 121.5 lb-ft, just clearing the 120 lb-ft peak-load requirement.",
    investigationLog: ["PROBE belt speed and drum torque", "SIMULATE ratio=45:1"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /45 to 1/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE ratio/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED COMPONENT FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 90)
})

test("handles a tenth, bioprocess-lab-shaped submission (Biotech pH/DO setpoint fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 91, criteriaScores: { correctness: 94, process_reasoning: 89, measurement_reasoning: 90, communication: 90 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the low-titer bioreactor batch.",
      groundTruth: {
        correctSetpoints: "pH about 7.00, dissolved oxygen about 40 to 45 percent",
        reasoning: "The installed pH 7.35 and DO 15 percent yield only about 0.61 g/L against a 3.2 g/L baseline.",
      },
      answerLabel: "PROCESS FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Correct the pH setpoint to 7.00 and raise dissolved oxygen to about 45 percent. That brings titer back to about 3.2 g/L, matching the historical baseline, because the culture is no longer penalized by pH drift or oxygen limitation.",
    investigationLog: ["RUN culture assay (pH, DO, titer, viability, contamination)", "SIMULATE setpoints=Correct fix (pH 7.00, DO 45%)"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /pH about 7\.00/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE setpoints/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED PROCESS FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 91)
})

test("handles an eleventh, clinical-assay-lab-shaped submission (Medical Biotech incubation fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 92, criteriaScores: { correctness: 95, assay_reasoning: 90, measurement_reasoning: 91, communication: 90 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose and fix the invalid ELISA positive control.",
      groundTruth: {
        correctIncubationMin: "60 minutes, the validated protocol time",
        reasoning: "The installed 20 minute incubation yields a positive control OD of about 0.78, below the 1.00 threshold.",
      },
      answerLabel: "ASSAY FIX & REASONING",
    },
  }
  const submissionData = {
    answer: "Restore the secondary antibody incubation to the validated 60 minute protocol time. That brings the positive control to about 1.38 OD, comfortably above the 1.00 OD validity threshold, while the negative control stays well under its 0.20 OD ceiling.",
    investigationLog: ["READ plate (positive control, negative control, assay validity)", "SIMULATE incubation=60 min (validated protocol)"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /60 minutes/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE incubation/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED ASSAY FIX & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 92)
})

test("handles a twelfth, plate-map-and-protocol-timeline-shaped submission (Clinical Lab conjugate incubation fix) via the same generalized fields — no new code path", async () => {
  let sentPrompt = null
  const deps = {
    callAi: async (prompt) => {
      sentPrompt = prompt
      return { overallScore: 90, criteriaScores: { correctness: 92, assay_reasoning: 88, measurement_reasoning: 90, workflow_reasoning: 89, communication: 90 } }
    },
  }
  const context = {
    payload: {
      prompt: "Diagnose the invalid plate and determine patient sample disposition.",
      groundTruth: {
        correctIncubationMin: "45 minutes, the validated protocol time, with all six patient samples re-run and reported only from the corrected, valid plate",
        reasoning: "The installed 12 minute conjugate incubation yields a positive control OD of about 0.59, well below the 1.00 threshold, invalidating the plate and all six patient samples on it.",
      },
      answerLabel: "CLINICAL DISPOSITION & REASONING",
    },
  }
  const submissionData = {
    answer: "Restore the conjugate incubation to the validated 45 minute protocol time. That brings the positive control to about 1.29 OD, comfortably above the 1.00 OD validity threshold, while the negative control stays under its 0.20 OD ceiling. All six patient samples on the invalid plate, S-101 through S-106, are unreportable and must be re-run from the corrected plate.",
    investigationLog: ["READ control wells (positive control, negative control, plate validity)", "SIMULATE repeat run conjugate-incubation=45 min (validated protocol)"],
  }
  const result = await runRubricReview(CONFIG, submissionData, context, deps)

  assert.match(sentPrompt, /MISSION GROUND TRUTH/)
  assert.match(sentPrompt, /45 minutes/)
  assert.match(sentPrompt, /INVESTIGATION LOG/)
  assert.match(sentPrompt, /SIMULATE repeat run/)
  assert.match(sentPrompt, /CANDIDATE'S SUBMITTED CLINICAL DISPOSITION & REASONING/)
  assert.equal(result.passed, true)
  assert.equal(result.score, 90)
})

test("falls back to a single default criterion when the template's config has no rubric declared", async () => {
  const deps = { callAi: async () => ({ overallScore: 70, criteriaScores: { overall: 70 } }) }
  const result = await runRubricReview({}, { code: "x = 1" }, CONTEXT, deps)
  assert.equal(result.evidence.length, 1)
  assert.equal(result.evidence[0].metric, "Overall Quality")
})
