# Arena V2 Content Spec — 05. Validators

Package 5 of 10. See `00-conventions-and-versioning.md` for shared versioning rules (`validator.version`).

Every validator is a pure function: `(submission, config) → { passed: boolean, score: number(0-100), detail: [...] }`. None of them ever writes ELO/XP directly — that's the ELO/XP Engine's job, downstream of Assessment (blueprint §6).

| Validator type | Input (`config`) | What it checks | Output detail shape |
|---|---|---|---|
| `test_case_judge` | `{ testCases: [{input, expectedOutput}], language, timeoutMs }` | Runs submitted code against each test case via the sandboxed `child_process` pattern (audit-confirmed real, reused as-is) | `[{ input, expected, actual, passed }]` |
| `ground_truth_compare` | `{ seedDatasetId, groundTruthQuery, tolerancePct }` | Executes the ground-truth query against the same seeded sql.js DB the student queried, compares published result | `[{ metric, expected, actual, passed }]` |
| `published_result_compare` | `{ seedDatasetId, expectedSeries or expectedValue, tolerancePct }` | Compares a published notebook result (KPI/series/chart data) against precomputed ground truth from the same seed | `[{ metric, expected, actual, passed }]` |
| `live_render_probe` | `{ propScenarios: [{props, expectedText/expectedAbsence}] }` | Mounts the compiled component with each prop scenario in the sandboxed iframe, inspects rendered text/HTML via postMessage | `[{ scenario, expected, actual, passed }]` |
| `http_assertion` | `{ requestSpec, expectedStatus, expectedBodySchema }` | Sends the request the student built, checks status code + body shape | `[{ check, expected, actual, passed }]` |
| `command_output_match` | `{ command or expectedOutputPattern }` | Matches terminal output or config-file diff against an expected pattern/regex | `[{ check, expected, actual, passed }]` |
| `formula_result_check` | `{ cellRefs, expectedValues, tolerancePct }` | Reads computed cell values from the Excel Grid state, compares to expected | `[{ cell, expected, actual, passed }]` |
| `kpi_compare` | `{ expectedKpis: [{name, value, tolerancePct}] }` | Compares published dashboard KPI cards/trend/breakdown to ground truth | `[{ kpi, expected, actual, passed }]` |
| `rubric_review` | `{ rubric: [{criterion, weight}], aiReviewWeightCap }` | Structured checklist scoring + capped AI qualitative pass (never sole authority — enforced by Assessment, blueprint §6) | `[{ criterion, score, note }]` |
| `numeric_tolerance` | `{ expectedValue, tolerance }` | Numeric answer within tolerance | `[{ expected, actual, diff, passed }]` |
| `register_match` | `{ expectedRegisterValues, expectedSerialOutput }` | Compares embedded register state / serial monitor output to expected values | `[{ register, expected, actual, passed }]` |

## Sign-off

- [ ] Validator contracts (11 types) — approved as listed, or amend

Cross-references: `02-skills-and-capabilities.md` (Capability Registry `validators` field must resolve to entries here), `04-workstations.md` (validator type per workstation), `08-challenge-templates-and-payload.md` (`validator.type`/`validator.version` on the Challenge Payload).
