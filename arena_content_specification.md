# Arena V2 — Content Specification

**Status: content contract, not code.** This is the companion document to `arena_v2_blueprint.md` (revision 3). Once both are signed off, Phase 1 (Architecture) begins. Nothing here is implemented — this is what implementation gets built against, so Phase 2 (Challenge Library authoring) doesn't require guessing.

---

## 1. Common Challenge categories

Unlimited practice, curated, no AI generation, never touches ELO (XP + streak + skill mastery only, per the blueprint's ELO/XP split).

| Category | Skills covered | Workstation | Validator |
|---|---|---|---|
| DSA / Programming | Arrays, strings, hashing, trees, graphs, DP, complexity analysis | Code Workstation | Test-case judge |
| SQL | Joins, aggregation, window functions, CTEs, query optimization | SQL Workstation | Ground-truth compare |
| Python | Syntax, OOP, standard library, scripting | Code Workstation | Test-case judge |
| Java | Syntax, OOP, collections, concurrency basics | Code Workstation | Test-case judge |
| JavaScript | ES6+, async, closures, array methods | Code Workstation | Test-case judge |
| C++ | Memory management, STL, pointers | Code Workstation | Test-case judge |
| React | Components, hooks, state, props | React/Frontend Workstation | Live-render probe |
| Backend/API Design | REST conventions, status codes, auth patterns | API Workstation | HTTP assertion |
| DevOps | Docker, CI/CD YAML, basic Kubernetes manifests | Terminal Workstation | Command-output match |
| Cloud (AWS/Azure/GCP) | IAM, serverless functions, IaC snippets | Code Workstation, Terminal Workstation | Test-case judge, command-output match |
| Cybersecurity | OWASP Top 10, secure coding fixes | Code Workstation | Test-case judge |
| Linux | Shell scripting, permissions, process management | Terminal Workstation | Command-output match |
| Git | Branching, merge conflicts, rebase | Terminal Workstation | Command-output match |
| Networking | Subnetting, OSI layers, firewall rules | Terminal Workstation, Calculator Workstation | Command-output match, numeric check |
| Statistics | Descriptive stats, hypothesis testing, distributions | Notebook Workstation, Calculator Workstation | Published-result compare, numeric check |
| Excel | Formulas, VLOOKUP/XLOOKUP, pivot tables | Excel Workstation | Formula-result check |
| Power BI | DAX, measures, relationships | Dashboard Workstation | Published KPI compare |
| Pandas | DataFrame ops, cleaning, groupby | Notebook Workstation | Published-result compare |
| Machine Learning | Model selection, evaluation metrics, feature engineering basics | Notebook Workstation | Published-result compare |
| Testing/QA | Test design, assertions, mocking | Code Workstation | Test-case judge |
| System Design | API design, data modeling, scaling tradeoffs | System Design Workstation | Rubric review |

Every Common Challenge category above maps 1:1 onto an existing REUSE-flagged workstation from the audit — no new UI-module work is required to launch Common Challenges.

---

## 2. Workstation compositions (canonical, from blueprint §3)

| UI Module | Renders |
|---|---|
| Code Editor | Monaco-style editor, language-aware, multi-file |
| SQL Editor | Query input + result grid (sql.js WASM) |
| Notebook Cell | Python execution (Pyodide) + inline output |
| Excel Grid | Spreadsheet grid, formulas, pivot |
| Dashboard Builder | KPI cards, chart builder |
| Browser / Live Preview | Sandboxed iframe live-render |
| Terminal | Shell/bash console |
| API Client | Request builder + response viewer |
| Report Editor | Rich text / markdown editor |
| Diagram Canvas | System-design / architecture canvas |
| Console / Output Panel | Captured stdout/stderr/console |
| File Explorer | Multi-file tab strip |
| Register / Serial Panel | Embedded register map + serial monitor |
| Answer Panel | Numeric or multiple-choice entry |

| Workstation | Composed of | Validator type | Produces |
|---|---|---|---|
| Code Workstation | Code Editor + Console/Output + File Explorer | Test-case judge | code artifact |
| SQL Workstation | SQL Editor + Console/Output | Ground-truth compare | code artifact (query) |
| Notebook Workstation | Notebook Cell + Console/Output | Published-result compare | report artifact (analysis + charts) |
| React/Frontend Workstation | Code Editor + File Explorer + Browser/Live Preview + Console/Output | Live-render probe | code artifact |
| API Workstation | API Client + Console/Output | HTTP assertion | code artifact (endpoint spec/impl) |
| Terminal Workstation | Terminal + Console/Output | Command-output pattern match | code artifact (script/config) |
| Excel Workstation | Excel Grid | Formula-result check | dashboard artifact (workbook) |
| Dashboard Workstation | Dashboard Builder + SQL Editor | Published KPI/trend/breakdown compare | dashboard artifact |
| Report Workstation | Report Editor | Rubric review | report artifact |
| System Design Workstation | Diagram Canvas + Report Editor | Rubric review + structural checklist | diagram artifact |
| Embedded Workstation | Code Editor + Register/Serial Panel + Console/Output | Register/output value match | code artifact |
| Calculator Workstation | Answer Panel | Numeric-tolerance check | (no artifact — Common Challenges only) |
| Full Stack Workstation | Code Editor + Browser/Live Preview + API Client + SQL Editor | Combination, per sub-task | code artifact |

---

## 3. Validator contracts

Every validator is a pure function: `(submission, config) → { passed: boolean, score: number(0-100), detail: [...] }`. None of them ever writes ELO/XP directly — that's the ELO/XP Engine's job, downstream of Assessment.

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
| `rubric_review` | `{ rubric: [{criterion, weight}], aiReviewWeightCap }` | Structured checklist scoring + capped AI qualitative pass (never sole authority — enforced by Assessment, §6 of blueprint) | `[{ criterion, score, note }]` |
| `numeric_tolerance` | `{ expectedValue, tolerance }` | Numeric answer within tolerance | `[{ expected, actual, diff, passed }]` |
| `register_match` | `{ expectedRegisterValues, expectedSerialOutput }` | Compares embedded register state / serial monitor output to expected values | `[{ register, expected, actual, passed }]` |

---

## 4. Challenge Payload schema (canonical — same as blueprint §10 FROZEN v1.0, reproduced here as the single source of truth)

```json
{
  "challengeInstanceId": "string, unique",
  "challengeType": "common | domain",
  "careerFamily": "string — reserved root, IT only implemented (§14)",
  "role": "string — one of the 40 roles (§6)",
  "industry": "string | null",
  "scenarioPackId": "string | null",
  "scenarioPackVersion": "string | null (§10)",
  "scenarioId": "string | null",
  "challengeTemplateId": "string",
  "challengeTemplateVersion": "string (§10)",
  "datasetId": "string | null (§12)",
  "datasetVersion": "string | null (§12)",
  "difficulty": "Easy | Medium | Hard | Expert",
  "skill": "string",
  "skillGraphVersion": "string (§10)",
  "workstation": "string — must resolve to a composition in §2",
  "workstationVersion": "string (§10)",
  "payload": { "// workstation-specific, schema declared per workstation": "" },
  "validator": { "type": "one of §3", "version": "string (§10)", "config": "validator-specific" },
  "assessmentRules": {
    "rubric": "criteria + weights",
    "aiReviewWeight": "capped, supplement only",
    "timingWeight": "small modifier",
    "codeQualityChecks": "workstation-specific static checks"
  },
  "submissionRules": { "timeLimitSecs": "number|null", "maxAttempts": "number|null", "integrityChecks": ["paste_detection","tab_switch","screen_share"] },
  "progressionRules": { "prerequisiteSkills": ["..."], "cooldownDays": "number" },
  "rewardRules": {
    "common": { "xp": "number", "streak": true, "skillMastery": true, "elo": false },
    "domain": { "xp": "number", "streak": true, "skillMastery": true, "elo": true, "baseEloGain": "number" }
  },
  "portfolioDecision": {
    "eligibleFor": "domain only",
    "minScoreToAutoPublish": "number",
    "allowManualPublishBelowThreshold": "boolean",
    "artifactType": "code|report|dashboard|design|diagram",
    "recruiterEvidence": {
      "skill": "string",
      "status": "Completed | In Progress",
      "scorePct": "number",
      "verification": "Verified | Self-Selected",
      "difficulty": "Easy | Medium | Hard | Expert",
      "industry": "string | null",
      "scenario": "string | null",
      "skillsDemonstrated": ["..."]
    }
  }
}
```

Hard gate: unchanged in substance, but now owned by a first-class pipeline step — the **Challenge Payload Validator** (blueprint §0/diagram) — sitting between Challenge Engine and Workstation Router. Missing/invalid `payload`, `validator`, or `rewardRules` is rejected there, nothing reaches the Workstation Router or frontend. Every rejection is itself an analytics event (§11).

---

## 5. Difficulty Variants — worked examples beyond SQL Joins

**SQL Joins** (from the blueprint, repeated for completeness):
Easy = 2 tables, INNER JOIN · Medium = 4 tables, mixed JOIN types · Hard = adds window functions · Expert = adds CTEs + window functions + a performance target (e.g. "under 200ms on 5M rows").

**React Component Build** (Frontend Developer):
Easy = static component, hardcoded props, no state · Medium = adds local state + one side effect (`useEffect` fetch) · Hard = adds loading/error/empty states + prop-driven variants · Expert = adds accessibility requirements (keyboard nav, ARIA) + a performance constraint (no unnecessary re-renders, verified via the live-render probe's re-render count).

**DevOps Pipeline Fix** (DevOps Engineer):
Easy = fix one broken YAML step · Medium = fix a multi-stage pipeline with a dependency ordering bug · Hard = add caching/parallelization requirements · Expert = full pipeline redesign under a stated constraint (e.g. "must finish in under 3 minutes").

**Vulnerability Fix** (Cybersecurity Analyst):
Easy = 1 vulnerability (e.g. SQL injection only) · Medium = 3 vulnerabilities (adds missing auth, rate limiting) · Hard = 5 vulnerabilities (today's Arena V1 seed content, `cy-001`, reused as the Hard tier) · Expert = adds a requirement to write the accompanying security advisory/report alongside the fix.

Each Challenge Template in the Content Library declares which of the four tiers it actually supports — not every template needs all four (a "write an incident postmortem" template may only need one tier, per the blueprint's note).

---

## 6. Skill Dependency Graphs — all 40 roles

Notation: `A → B` means B unlocks once A has been attempted (not necessarily mastered). `A → {B, C}` means both B and C unlock once A is attempted, independently of each other.

### Software Engineering

1. **Frontend Developer**: `HTML/CSS Fundamentals → React Components → State Management → {Accessibility, Web Performance} → Design Systems`
2. **Backend Developer**: `REST Conventions → Auth Patterns → DB Design → {Rate Limiting, Error Handling}`
3. **Full Stack Developer**: `Frontend Developer skills + Backend Developer skills → Feature Build (end-to-end) → Deployment`
4. **Software Engineer (DSA)**: `Data Structures → Algorithms → {Big-O Analysis, System Design} → Code Review`
5. **Java Developer**: `Java Syntax → Collections → Concurrency → Spring Basics`
6. **Python Developer**: `Python Syntax → OOP → {Async, Packaging}`
7. **C++ Developer**: `C++ Syntax → Memory Management → STL → Performance Profiling`
8. **Game Developer**: `C++/C# Syntax → Game Loop Design → Physics Basics → Collision Systems`

### Data & Analytics

9. **Data Analyst**: `Statistics → SQL → {Excel, Python} → Power BI → Business Cases`
10. **Business Intelligence Analyst**: `SQL → DAX/Power BI → KPI Design → Executive Reporting`
11. **Data Engineer**: `Python → SQL → ETL Concepts → {Airflow, dbt} → Pipeline Optimization`
12. **Database Administrator**: `SQL → Indexing → Query Optimization → {Backup/Recovery, Replication}`
13. **Data Scientist**: `Statistics → Python → Pandas → {Hypothesis Testing, Feature Engineering} → Model Evaluation`
14. **Machine Learning Engineer**: `Python → Statistics → Data Scientist skills → Model Serving → MLOps`

### Cloud, Platform & DevOps

15. **DevOps Engineer**: `Linux/Bash → Docker → CI/CD → Kubernetes → Infrastructure as Code`
16. **Site Reliability Engineer**: `Linux → Observability Basics → Incident Response → SLO Design → Postmortem Writing`
17. **Cloud Engineer (AWS)**: `IAM Basics → Serverless (Lambda) → {VPC/Networking, Cost Management} → IaC (CloudFormation/Terraform)`
18. **Cloud Engineer (Azure)**: `IAM Basics (RBAC) → Bicep/ARM → {Azure Networking, Cost Management}`
19. **Cloud Engineer (GCP)**: `IAM Basics → Cloud Functions → Terraform`
20. **Platform Engineer**: `DevOps Engineer skills → Internal Tooling Design → Service Catalog / Golden Paths`

### Security

21. **Cybersecurity Analyst**: `OWASP Top 10 → Secure Coding → Threat Modeling`
22. **SOC Analyst / Incident Response**: `Linux/Networking Basics → Log Analysis → Alert Triage → Incident Reporting`
23. **Penetration Tester**: `Networking Basics → Recon Techniques → Exploitation Basics → Reporting`
24. **Security Engineer**: `Cybersecurity Analyst skills → Auth Hardening → Secrets Management → AppSec Tooling`
25. **Network Engineer**: `Subnetting → Routing → Firewalls → VPN Design`

### QA & Testing

26. **QA / Test Automation Engineer**: `Test Design → {Selenium/Playwright, CI Integration} → Flaky Test Diagnosis`
27. **Manual QA Tester**: `Test Case Design → Bug Reporting → Exploratory Testing`
28. **API Test Engineer**: `HTTP/REST Basics → Contract Testing → Schema Validation`

### Mobile & Emerging Platforms

29. **Android Developer**: `Kotlin/Java Syntax → Lifecycle → Jetpack → Gradle/Build Config`
30. **iOS Developer**: `Swift Syntax → Lifecycle → SwiftUI/UIKit → Memory Management`
31. **Embedded/IoT Software Engineer**: `Embedded C → Sensors/Protocols → RTOS Basics → Driver Development`
32. **Blockchain Developer**: `JavaScript/Solidity Syntax → Smart Contract Basics → Gas Optimization`

### Business, Data-Adjacent & IT Support

33. **Business Analyst (Tech)**: `SQL Basics → Requirements Gathering → Process Mapping → Metric Definition`
34. **Product Analyst**: `SQL → Statistics → Funnel Analysis → {A/B Testing, Cohort Analysis}`
35. **IT Support / Helpdesk Engineer**: `Networking Basics → Troubleshooting Method → Ticketing/Diagnostics`
36. **System Administrator**: `Linux Admin → Scripting → {Patching, Backups} → Cron Automation`
37. **SAP Functional/Technical Consultant**: `SQL Basics → Module Config → ABAP Basics → Report Build`
38. **Technical Writer / Docs Engineer**: `Information Architecture → API Docs → Tutorial Writing`
39. **Technical Program/Project Manager**: `Planning Fundamentals → Tradeoff Analysis → Risk Management`
40. **UI/UX Engineer (Design Systems)**: `Frontend Developer skills → Design Tokens → Component API Design → Accessibility Audit`

---

## 7. Scenario Packs — worked examples across role families

**"Amazon" (E-Commerce, Data & Analytics family)**
```
Customer Orders (Scenario) → SQL Challenge Template → Dashboard Template → Report Template → Presentation Template
Inventory (Scenario)       → Forecast Template → Power BI Template
```

**"PayFast" (Banking/Fintech, Backend + Security family)**
```
Payments API (Scenario)   → API Design Template → Auth Hardening Template → Rate Limiting Template
Fraud Review (Scenario)   → SQL Template (transaction anomalies) → Report Template (fraud case writeup)
```

**"MedCore" (Healthcare, Data & Analytics family)**
```
Patient Records (Scenario) → SQL Template (privacy-aware queries) → Python/Pandas Template (cohort analysis) → Report Template
Appointment Ops (Scenario) → Dashboard Template (no-show rate, utilization)
```

**"CloudNine" (SaaS/B2B, Cloud/DevOps family)**
```
Deployment Pipeline (Scenario) → DevOps Pipeline Fix Template → IaC Template
Incident Response (Scenario)   → SRE Incident Triage Template → Postmortem Template
```

Every Scenario Pack is industry-tagged (§8) and role-family-tagged, so Challenge Progression can rotate a student across packs without ever mixing incompatible content (a Data Analyst won't be handed "PayFast: Auth Hardening").

---

## 8. Industry catalog and per-family applicability

| Industry | Applies strongly to | Applies loosely / optional |
|---|---|---|
| E-Commerce | Data & Analytics, Frontend, Backend, Full Stack | QA, Business/Support |
| Banking/Fintech | Backend, Security, Data & Analytics | DevOps, QA |
| Healthcare | Data & Analytics, Business/Support | Backend |
| EdTech | Frontend, Full Stack, Data & Analytics | — |
| Logistics/Supply Chain | Data & Analytics, Backend | DevOps |
| SaaS/B2B | DevOps/Cloud, Backend, Full Stack, QA | Security |
| Telecom | Networking-heavy roles (Network Engineer, SOC), Cloud | Data & Analytics |
| Government/Public Sector | Security, Business/Support | Data & Analytics |

Roles like Embedded/IoT Software Engineer, Android/iOS Developer, and most QA/Testing roles are treated as **industry-light** — their Domain Challenges vary primarily by Scenario Pack narrative flavor, not by a deep industry-specific business-logic change, since the underlying technical work (fix this driver bug, fix this lifecycle bug) doesn't meaningfully differ by industry the way a Data Analyst's or Business Analyst's work does.

---

## 9. Portfolio artifact types

| Artifact type | Produced by | Shown to recruiters as |
|---|---|---|
| `code` | Code, React/Frontend, API, Terminal, Embedded, Full Stack Workstations | Repository-style code snippet + pass/fail summary |
| `report` | Report, Notebook (analysis writeups), SOC/QA report-style challenges | Formatted written analysis |
| `dashboard` | Dashboard, Excel Workstations | Rendered chart/KPI snapshot |
| `design` | React/Frontend Workstation (UI/UX-tagged challenges) | Rendered component/screen preview |
| `diagram` | System Design Workstation | Rendered architecture diagram + rationale |

Every artifact carries its Portfolio Decision provenance (auto-published at score X, or manually published by the student below threshold) — this is the recruiter-facing honesty mechanism from the blueprint's §5, not just an internal flag.

---

## 10. Versioning (content layers)

Every content layer that Phase 2+ authoring will touch is independently versioned, mirroring blueprint §7:

| Layer | Versioned unit | Resolution rule |
|---|---|---|
| Challenge Template | `challengeTemplateId` + `challengeTemplateVersion` | New challenge starts resolve to latest version; a student mid-attempt stays pinned to the version they started (`challenge_template_versions` table, blueprint Phase 1 DB list) |
| Workstation | `workstation` + `workstationVersion` | Same pin-on-start rule — a UI-module recomposition (e.g. adding a new panel to the React workstation) never changes the workstation underneath a student mid-challenge |
| Validator | `validator.type` + `validator.version` | Changing a validator's grading logic (e.g. tightening a rubric) requires a version bump; in-flight submissions grade against the version recorded on the payload, not the latest |
| Skill Graph | `skillGraphVersion` | Adding/reordering prerequisites (§6) bumps this; a student's unlocked-skill state is evaluated against the graph version active when they unlocked it, so a retroactive graph edit can't silently lock or unlock skills for existing students |
| Scenario Pack | `scenarioPackVersion` | New scenarios added to a pack (e.g. "Amazon" pack gains a third scenario) bump this; doesn't affect students already inside a scenario |
| Dataset | `datasetId` + `datasetVersion` | Detailed in §12 |

Rule of thumb used throughout: **version bumps affect only new starts; every in-progress student is pinned to the version snapshot recorded on their `challengeInstanceId` at creation time.** This is what makes the payload schema (§4) carry a version field next to nearly every ID — it's not decoration, it's the mechanism that keeps grading deterministic even as content evolves under it.

---

## 11. Analytics (telemetry)

Analytics taps every pipeline stage in parallel (blueprint §8) and writes to `challenge_analytics_events` (Phase 1 DB list). Metrics tracked, and where each one is sourced from:

| Metric | Source stage | Notes |
|---|---|---|
| Average completion time | Submission Engine (`startedAt` → `submittedAt`) | Segmented by role, challenge, difficulty |
| Pass rate | Assessment (final score vs. `minScoreToAutoPublish` / rubric pass threshold) | Segmented by challenge template + difficulty variant, surfaces templates that are miscalibrated |
| Most failed validator | Validator layer (per-check pass/fail array, §3's output shapes) | Aggregated by validator type + config, flags a specific check (not just "the challenge") that's tripping students |
| Hint usage | Challenge Engine / Workstation (hint-request events, if/when hints exist per template) | Feeds Difficulty Variant tuning (§5) |
| Abandonment rate | Submission Engine (challenge started, never submitted, session ended) | Distinct from `isZeroEffortTimeout`-style zero-score submissions — abandonment is "never submitted at all" |
| AI feedback frequency | Assessment (`aiReviewWeight` invocation count) | Monitors how much the rubric is leaning on AI vs. deterministic checks — a rising trend here is a signal to add more deterministic validator coverage, not a target to hit |
| Workstation performance | Workstation Router + client-side timing (load time, compile/render latency for live-render-probe workstations) | Ops-facing, not student-facing |
| Challenge Payload Validator rejection rate | Challenge Payload Validator (new first-class step, §4) | Every rejected payload (missing/invalid `payload`, `validator`, or `rewardRules`) is logged here — a non-zero rate flags a Challenge Engine or authoring bug before it ever reaches a student |

Feeds an internal ops dashboard only — none of this is student- or recruiter-facing. It exists to catch miscalibrated content and pipeline regressions early, not to gamify anything for the student.

---

## 12. Dataset Versioning

A sub-case of §10, called out separately because Scenario Packs (§7) often ship with backing datasets that evolve independently of the scenario narrative itself. Worked example:

**"Amazon" Scenario Pack dataset lineage:**
- `datasetId: amazon-orders`, `datasetVersion: v1` — original seed dataset (small, hand-authored)
- `datasetVersion: v2` — expanded row count + added a data-quality issue (duplicate order IDs) specifically for a Hard-tier SQL Joins variant (§5) that tests dedup logic
- `datasetVersion: v3` — added a new `returns` table to support a new Scenario ("Returns Analysis") without touching `v1`/`v2`, which existing in-progress students remain pinned to

Same resolution rule as §10: new challenge starts get the latest `datasetVersion` for a given `datasetId`; in-progress students keep the version recorded on their payload. This also means a dataset bug fix (e.g. correcting a wrong total in `v2`) ships as `v3` rather than mutating `v2` in place — mutating a dataset a student is actively querying against would silently invalidate their in-flight `ground_truth_compare`/`kpi_compare` validator expectations.

---

## 13. Recruiter Skill Evidence

Structured metadata attached to every Portfolio artifact (§9), carried on the payload as `portfolioDecision.recruiterEvidence` (§4). This is what a recruiter viewing a candidate's portfolio actually sees per artifact — not just the artifact content, but the evidence trail behind it. Worked example, reproduced exactly as specified:

| Field | Example value |
|---|---|
| Skill | SQL |
| Status | Completed |
| Score | 92% |
| Verification | Verified |
| Difficulty | Hard |
| Industry | Banking |
| Scenario | Fraud Detection |
| Skills Demonstrated | SQL, Window Functions, CTE, Optimization |

`Verification` is either `Verified` (auto-published, met `minScoreToAutoPublish`) or `Self-Selected` (student manually opted to publish below threshold, per the Portfolio Decision gate, blueprint §5) — this field is what keeps the self-selected path honest for recruiters instead of presenting it as equivalent to a verified pass. `Skills Demonstrated` is drawn from the Challenge Template's declared skill tags, not free text, so it stays consistent across every artifact of the same template.

---

## 14. Future Extension Point — Career Family

Reserved root taxonomy above Career Role, matching blueprint §0. Not implemented beyond the reservation itself:

```
Arena
 └─ Career Family
     ├─ IT              (only implemented family — all 40 roles in §6 live here)
     ├─ ECE             (reserved)
     ├─ EEE             (reserved)
     ├─ Mechanical      (reserved)
     ├─ Civil            (reserved)
     ├─ MBA             (reserved)
     ├─ Healthcare      (reserved)
     └─ ...
```

Every Challenge Payload already carries `careerFamily` (§4, hardcoded to `"IT"` for all Phase 2/3/4 work). No non-IT content, workstation, or validator is being authored now — this section exists purely so that when a future family (e.g. ECE) is added, it's a new branch under an existing root rather than a schema migration across every existing challenge payload, skill graph, and portfolio record.

---

## Sign-off checklist

- [ ] Common Challenge categories (§1) — approved as listed, or amend
- [ ] Workstation compositions (§2) — approved as listed, or amend
- [ ] Validator contracts (§3) — approved as listed, or amend
- [ ] Challenge Payload schema, versioning-inclusive (§4) — approved as final, or amend
- [ ] Difficulty Variant framework (§5) — approved, or amend the worked examples
- [ ] Skill Dependency Graphs, all 40 roles (§6) — approved, or flag specific roles to redraw
- [ ] Scenario Pack model + 4 worked examples (§7) — approved, or request more/different packs before Phase 2 authoring begins
- [ ] Industry catalog + applicability matrix (§8) — approved, or amend
- [ ] Portfolio artifact types (§9) — approved, or amend
- [ ] Versioning model (§10) — approved, or amend
- [ ] Analytics/telemetry (§11) — approved, or amend metric list
- [ ] Dataset Versioning (§12) — approved, or amend
- [ ] Recruiter Skill Evidence (§13) — approved, or amend fields
- [ ] Future Extension Point / Career Family (§14) — approved, or amend

Once this checklist is clear, Phase 0.5 is fully locked (FROZEN v1.0, matching the blueprint) and **Phase 1: Backend architecture** begins per the approved 4-phase build order — still no code, just the technical design for the 10 backend modules and the revised frontend structure, built against this content contract instead of assumptions.
