# Arena V2 — Blueprint (Phase 0.5 — FROZEN v1.1)

**Status: planning only. No code, no files under a `v2/` folder yet. This document + the `arena-content-spec/` package set are now the frozen Arena V2 specification** per your sign-off. v1.0 added versioning, analytics, a first-class Challenge Payload Validator step, and a Career Family extension point, on top of the five changes from the round before that (Industry Layer, Difficulty Variants, Scenario Packs, Skill Dependencies, Assessment Layer) and the "Mission"→**Challenge Payload** rename. v1.1 (this revision) adds the Capability Registry (§1.1) and formalizes the Arena Engine / Arena Content package boundary (§1.2) — both scoped as the last content-model additions before Phase 1 begins, not a re-opening of architecture review.

---

## 0. Root taxonomy — Career Family (your future extension point)

Reserved now, not implemented now:

```
Arena
   │
   ▼
Career Family
   │
   ├── IT               ← the only family Arena V2 builds against (all 40 roles)
   ├── ECE              ← reserved
   ├── EEE               ← reserved
   ├── Mechanical        ← reserved
   ├── Civil             ← reserved
   ├── MBA               ← reserved
   ├── Healthcare        ← reserved
   └── ...                ← reserved
```

This costs nothing to reserve and saves a refactor later: every table and payload field in this spec that references "role" is scoped to `careerFamily = "IT"` implicitly. Adding a second family later means adding a new `arena-content/` package tree (§1.2) under that family — it does not touch the 11 backend modules (§1), because none of them are IT-specific in their logic, only in their content (that's the entire point of the Arena Engine / Arena Content split, §1.2).

---

## 1. Confirmed architecture — Arena Engine

```
Student
   │
   ▼
Career Role                  (scoped within Career Family = IT, per §0)
   │
   ▼
Industry                    (business-domain context — Healthcare, E-Commerce, Banking, etc.)
   │
   ▼
Skill Matrix                 (per-skill proficiency record — skill mastery is industry-agnostic)
   │
   ▼
Skill Engine                 (mastery / weak-area / unattempted / next-best-challenge signals)
   │
   ▼
Challenge Progression        (skill-dependency-aware unlocking, difficulty ladder, anti-repetition,
                               industry rotation, coverage across the role's full skill graph)
   │
   ▼
Challenge Library            (Scenario Packs → Scenarios → Challenge Templates → Difficulty Variants,
                               every layer versioned — see §7)
   │
   ▼
Challenge Engine              (assembles the selected Difficulty Variant into a standardized Challenge Payload)
   │
   ▼
Challenge Payload Validator   (first-class step, not an implicit Challenge Engine responsibility — rejects
                               any payload that fails its workstation's declared schema before it can be routed)
   │
   ▼
Workstation Router           (Challenge Payload.workstation → UI-module composition, never guesses)
   │
   ▼
Workstation                  (assembled from reusable UI modules — §3)
   │
   ▼
Validator                    (server-authoritative pass/fail/score/feedback signal)
   │
   ▼
Submission Engine            (queue-based, async submit+poll)
   │
   ▼
Assessment                   (combines validator result + rubric + AI qualitative supplement + timing +
                               code quality + completion — never AI-only)
   │
   ▼
Feedback                     (what the student sees: what passed, what didn't, why, and what to try next)
   │
   ▼
Score
   │
   ▼
Portfolio Decision            (threshold check, or explicit user opt-in)
   │
   ▼
Portfolio                    (proof_artifacts — only what passed the decision gate)
   │
   ▼
ELO / XP Engine                (Domain Challenges → ELO; Common Challenges → XP + streak + skill mastery only)
```

Every challenge interaction — shown, started, hint used, abandoned, submitted — emits an event to the **Analytics** collector in parallel with the main pipeline (it's a side-channel tap, not a sequential step, since abandonment and hint-usage data has to be captured even when a submission never happens). See §8.

**Terminology cleanup (your final note):** "Mission" is removed everywhere. The Challenge Engine now assembles a **Challenge Payload**, not a Mission. `missionId` becomes `challengeInstanceId`. Every occurrence of "Mission Control," "Mission payload," etc. in the eventual frontend copy should follow suit — flagging this now so Phase 1's UI-copy pass doesn't reintroduce it by habit.

**Where Industry lives architecturally:** it is not its own backend module. It's a dimension on Scenario Packs inside the Challenge Library (§4), and Challenge Progression is extended to rotate across industries the same way it already rotates across categories — so a Data Analyst doesn't always land in the same business domain. No new module needed for this; it's more responsibility on an existing one, stated explicitly so it isn't invented as hidden behavior later.

**Backend module count is now 11, up from 10 — an honest update, not silent scope creep.** Your review's one addition, the Capability Registry (§1.1 below), genuinely needs its own module: it's a distinct data source (per-role capability list) queried by the Challenge Payload Validator, not a side effect of an existing module. Neither Industry, Versioning, nor Dataset Versioning need new modules — they're content-model and config changes inside `challenge-library`.

```
backend/arena/
├── challenge-library/            # Scenario Packs → Scenarios → Challenge Templates → Difficulty Variants
│                                  # (Common + Domain), all versioned (§7), datasets versioned independently (§7.1)
├── capability-registry/          # per-role capability list (§1.1) — which workstations/validators/UI-modules
│                                  # a role is allowed to use; queried by challenge-payload-validator, never guessed
├── skill-engine/                 # mastery/weak/unattempted signals + "what's next" recommendation
├── challenge-progression/        # skill-dependency graph unlocking, difficulty ladder, anti-repetition,
│                                  # industry rotation, skill-graph coverage
├── challenge-engine/             # selected Difficulty Variant → Challenge Payload assembly
│                                  # (Arena Content consumer — §1.2 — knows nothing about SQL/React/AWS itself)
├── challenge-payload-validator/  # first-class schema gate — Challenge Payload in, valid-or-rejected out;
│                                  # also checks payload.workstation against capability-registry for payload.role
├── workstation-router/           # Challenge Payload.workstation → UI-module composition, single source of truth
├── validators/                   # one validator module per workstation type
├── submission-engine/            # queue + worker; runs Assessment, then Portfolio Decision, on the same submission
├── elo-engine/                    # the only ELO/XP writer — Domain→ELO, Common→XP+mastery
└── analytics/                     # event collector + aggregation queries feeding the internal content-health dashboard
```

### 1.1 Capability Registry (your addition)

A new small module, not a rename of anything existing. One record per role:

```json
{
  "role": "Frontend Developer",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["react_frontend", "code", "api"],
    "validators": ["live_render_probe", "test_case_judge", "http_assertion"],
    "uiModules": ["code_editor", "file_explorer", "browser_live_preview", "console_output", "api_client"]
  }
}
```

```json
{
  "role": "Data Analyst",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["sql", "notebook", "dashboard", "excel", "report"],
    "validators": ["ground_truth_compare", "published_result_compare", "kpi_compare", "formula_result_check", "rubric_review"],
    "uiModules": ["sql_editor", "notebook_cell", "dashboard_builder", "excel_grid", "report_editor", "console_output"]
  }
}
```

**Where it sits in the pipeline:** the Challenge Payload Validator (already a first-class step, per your prior round) gains one more check — it looks up `payload.role`'s Capability Registry entry and rejects the payload if `payload.workstation` or `payload.validator.type` isn't in that role's registered list. This is in addition to, not instead of, the existing schema-shape gate. A rejection here is logged as its own Analytics event (§8), distinguishable from a schema-shape rejection, so a miscalibrated Capability Registry entry is visible the same way a miscalibrated schema is.

**Why this belongs in Content, not Engine (ties directly to §1.2):** the registry itself — which workstations a role is allowed to use — is role-specific data, authored the same way Skill Graphs (§5) and Scenario Packs (§4) are authored. The Engine only knows "check the payload's workstation/validator against this role's registry entry," never "Frontend Developer gets react_frontend." That distinction is what makes the registry additive to new roles (Phase 4) and new Career Families (§0) without touching engine code — adding ECE's "Circuit Designer" role is authoring one new registry record, not writing new validation logic.

### 1.2 Package boundary — Arena Engine vs. Arena Content (your addition)

Formalizing a separation that was already implicit in the pipeline diagram above, made explicit so it's enforced rather than assumed:

**Arena Engine** (the 11 modules in the tree above) knows only about: Challenge Payload, Validator (as a type + contract, §3 of the content spec), Workstation (as a UI-module composition, §2/§3 of the content spec), Progression, Rewards, Capability Registry lookups. It contains **zero** references to SQL, React, AWS, OWASP, Kubernetes, or any other domain-specific term. Every one of those lives in **Arena Content**:

```
arena-content/                      # NOT under backend/arena/ — a separate content package tree,
│                                    # mirroring the 10-package split in arena_content_specification
├── roles/                          # 01-roles
├── skills-and-capabilities/        # 02 — includes each role's Capability Registry record (§1.1)
├── learning-paths/                 # 03 — Skill Dependency Graphs
├── workstations/                   # 04 — UI-module composition declarations
├── validators/                     # 05 — validator config templates (not validator engine code)
├── scenario-packs/                 # 06 — + dataset versions
├── industries/                     # 07
├── challenge-templates/            # 08 — Difficulty Variants + payload-shape declarations per template
├── analytics-definitions/          # 09 — metric definitions, not the collector itself (collector is Engine)
└── portfolio-and-recruiter/        # 10
```

This split is what makes "the same Arena Engine powers every Career Family" (your long-term roadmap, all four phases) an enforceable constraint instead of an aspiration: a future ECE package under `arena-content/` is new data, and if the Engine ever needs a code change to consume it, that's a signal the boundary was violated somewhere, not a normal cost of adding a family.

---

## 2. Industry Layer (your change #1)

Sits between Career Role and Skill Matrix. It answers: *which business domain is this student practicing in right now, for this role?* Skills themselves stay industry-agnostic (SQL mastery is SQL mastery), but the **scenario** wrapped around a skill changes with industry — same validator, same underlying query pattern, different business story and dataset shape.

**Industry catalog (initial set — extend later, don't need all of these for every role):**

`E-Commerce, Banking/Fintech, Healthcare, EdTech, Logistics/Supply Chain, SaaS/B2B, Telecom, Government/Public Sector`

Worked example (your own):
```
Data Analyst → Healthcare   → Patient Analytics
Data Analyst → E-Commerce   → Customer Purchase Analysis
Data Analyst → Banking      → Fraud Detection
```

Not every role needs every industry — a Network Engineer's "Firewall Rule Fix" domain challenge doesn't meaningfully change across Healthcare vs. E-Commerce, while a Data Analyst's or Business Analyst's challenges change a great deal. The Content Specification (the follow-up document you asked for) is where each role gets an explicit industry applicability list instead of assuming all 8 apply everywhere.

---

## 3. Workstations = UI-module compositions (carried over from rev 2, unchanged)

Same 14 UI modules → 13 named workstation compositions as revision 2. Not repeating the full tables here to keep this document focused on what changed — full detail lives in the companion **Arena Content Specification** document (delivered alongside this revision).

---

## 4. Challenge Library — now a real content hierarchy (your changes #2 and #3)

Revision 2 treated "Domain Challenges" as a flat, ordered Learning Path of categories. That collapses two different ideas that need to be modeled separately:

```
Scenario Pack
   │
   ▼
Scenario
   │
   ▼
Challenge Template
   │
   ▼
Difficulty Variant (Easy | Medium | Hard | Expert)
```

**Scenario Pack** — one company/organization simulation, reused across multiple skills so the student experiences continuity instead of isolated exercises. Your example:
```
Amazon (Scenario Pack)
  ├─ Customer Orders (Scenario) → SQL Challenge Template → Dashboard Template → Report Template → Presentation Template
  └─ Inventory (Scenario)       → Forecast Template → Power BI Template
```
Everything under "Amazon" shares the same fictional company context, dataset lineage, and narrative voice, whether the student is doing a SQL step or a Power BI step three weeks later.

**Challenge Template** — one reusable exercise shape (e.g. "SQL Joins"), authored once, expressed at up to four difficulty levels rather than as four separate hand-written challenges. Your example, fully specified:

| Difficulty | Variant definition |
|---|---|
| Easy | 2 tables, simple INNER JOIN |
| Medium | 4 tables, mixed JOIN types |
| Hard | adds window functions on top of the Medium join set |
| Expert | adds CTEs + window functions + a performance-optimization requirement (e.g. "under 200ms on 5M rows") |

One template authored, four experiences generated from it — this is the same principle as today's Circuit Lab Mission Compiler (parameterize, don't hand-author every variant), generalized to every Challenge Template rather than just circuits. This answers open question #2 from revision 2: **templated, not fixed-per-difficulty**, for any template where that's feasible; a few Challenge Templates (e.g. a one-off "write an incident postmortem" Report-type challenge) may only need one difficulty and that's fine — the model supports both.

---

## 5. Skill Dependencies — DAG instead of linear path (your change #4)

Challenge Progression no longer walks a role's skills in a fixed left-to-right order. It walks a **prerequisite graph**, unlocking a skill only once its prerequisites are attempted (not necessarily mastered — "attempted" is enough to unlock, mastery is what raises difficulty within it, per the existing Skill Engine signals).

Your example, as the actual model:
```
Statistics
    │
    ▼
   SQL
    │
    ▼
  Python
   ╱    ╲
Power BI   ML
```

This means a Data Analyst's "Learning Path" from revision 2 (`SQL → Excel → Power BI → Statistics → Python → Business Cases`) needs re-expressing as a graph, not a line — e.g. Statistics and SQL both feasibly gate Excel and Power BI, while Python gates both Power BI (advanced) and a future ML branch. The full dependency graph for all 40 roles is exactly the kind of thing that belongs in the Content Specification rather than being redrawn ad hoc here — see that document's Skill Dependency Graphs section.

Challenge Progression's unlock rule, stated precisely: a skill node becomes available once **all** its direct prerequisite nodes have at least one attempted (not necessarily passed) Challenge in `arena_history`. This is a deliberately low bar for *unlocking* — the Skill Engine's mastery/weak-area signals are what actually drive difficulty and repetition within an unlocked skill, so a student isn't blocked from trying something just because they haven't mastered the prerequisite yet, only from skipping straight to it with zero grounding.

---

## 6. Assessment Layer (your change #5)

Inserted between Submission Engine and Score:

```
Submission → Validator → Assessment → Feedback → Score → Portfolio Decision → Portfolio
```

Assessment combines, per submission:

| Signal | Source | Role in final score |
|---|---|---|
| Validator result | pass/fail + partial-credit detail from the workstation's declared validator | Primary — the floor and ceiling of the score |
| Rubric evaluation | role-specific rubric criteria (already modeled in Arena V1's `domain.rubric`, worth reusing) | Weighted sub-scores within the validator's bounds |
| AI qualitative review | Claude/Groq review, same as today's `gradeSubmission()` | **Supplement only** — can explain *why*, can nudge a sub-score within the validator-set range, cannot override a failing validator result into a passing score |
| Timing | time-on-task vs. estimated time | Minor modifier (fast-and-correct vs. slow-and-correct), never a majority of the score |
| Code quality | static checks (the kind already added to the rebuilt React workstation this session — missing alt text, console.log left in, etc.), extended per workstation | Minor modifier, rubric-linked |
| Completion | did the submission address the challenge's declared requirements at all, independent of correctness | Gate — an empty or off-topic submission caps here regardless of what the other signals say (this is exactly the zero-effort-timeout fix already shipped in Arena V1 this session; V2 keeps that principle as a first-class Assessment input rather than a bolted-on guard) |

Assessment's output feeds **Feedback** (student-facing: what passed, what didn't, why, and what's next — sourced from all of the above, not just the AI text) and **Score** (the number that drives Portfolio Decision and the ELO/XP Engine). This is the structural fix for the standing instruction that AI output must never be authoritative alone — it's now enforced by the pipeline shape, not by a code review catching it after the fact.

---

## 7. Versioning (your addition #1)

Every content layer is versioned from day one, not retrofitted later:

`Challenge Template`, `Workstation definition`, `Validator`, `Skill Graph`, `Scenario Pack`, `Industry Dataset` — each gets an incrementing `version` field and its own row history, never an in-place overwrite.

**The rule that matters operationally**: a student who is mid-progress on `challengeTemplateId=X, version=2` stays pinned to version 2 for that in-progress item even if version 3 ships while they're working — Challenge Engine resolves the payload by the exact version referenced in the `challengeInstanceId` it already issued, not "latest." New challenge starts always resolve to the latest version at issue time. This is what lets content improve continuously without invalidating anyone's in-flight work or retroactively changing what a completed Portfolio artifact was actually validated against.

### 7.1 Dataset Versioning (your addition #3 — modeled as a special case of the same mechanism)

Datasets (the seeded data behind SQL/Power BI/Pandas/Data Science challenges — e.g. "Amazon Dataset") version independently of the Scenario Pack/Scenario/Template structure around them: `Amazon Dataset v1 → v2 → v3`. This means the same "Customer Orders" scenario can get a refreshed dataset (new date range, new edge cases, new data-quality issues to catch) without touching the Challenge Template, validator, or narrative — keeping content feeling fresh at near-zero authoring cost. The ground-truth values a validator compares against are always computed live from the exact dataset version the student's instance was seeded with (this is exactly today's `workstationEngine.js` pattern — ground truth computed from the same seeded DB the student queried — extended to be version-aware instead of assuming one eternal dataset).

---

## 8. Analytics (your addition #2)

```
Challenge → Analytics → Dashboard
```

Every challenge interaction emits a telemetry event (shown, started, hint used, validator run, submitted, abandoned) to the `analytics` module, independent of whether the interaction ever reaches Submission. Captured per Challenge Template (and rolled up per Scenario Pack, per role, per industry):

- Average completion time
- Pass rate (first-attempt and eventual)
- Most-frequently-failed validator check (which specific assertion within the validator, not just pass/fail)
- Hint usage rate
- Abandonment rate (started, never submitted)
- AI qualitative feedback frequency/content patterns (useful for spotting where the Assessment layer's AI supplement is being leaned on heavily — a signal the validator or rubric may be under-specified)
- Workstation performance (client-side compile/render time, e.g. the React workstation's Babel compile latency)

This data flows to an internal content-health dashboard, not the student-facing product — its job is telling you which Challenge Templates need revision, which is exactly the kind of thing that was structurally impossible to know in Arena V1 (no unified telemetry existed across the three fragmented pipelines the audit found).

---

## 9. What stays exactly as revision 2 defined it

Skill Engine's four questions, Portfolio Decision's auto/manual/never-published branches, the ELO-vs-XP split (Domain→ELO, Common→XP+streak+mastery), the subscription rules table, and the "carried over from audit REUSE list" infrastructure (SQL/Notebook/React/API/Terminal workstations, `workstationEngine.js`, the queue-based submission pattern, Proof Artifacts, Streaks, Leaderboards, `apply_arena_result` RPC). None of those are touched by this round's changes — repeating them here would just be noise; they're preserved in full in the Content Specification document instead of duplicated across two files.

---

## 10. Challenge Payload schema (final — adds versioning + career family; renamed, extended for Industry/Scenario Pack/Difficulty Variant)

```json
{
  "challengeInstanceId": "string, unique",
  "challengeType": "common | domain",
  "careerFamily": "string — 'IT' for the entire V2 build; reserved field for future families (§0)",
  "role": "string — one of the 40 roles",
  "industry": "string | null — null for Common Challenges and industry-agnostic Domain Challenges",
  "scenarioPackId": "string | null", "scenarioPackVersion": "number | null",
  "scenarioId": "string | null",
  "challengeTemplateId": "string", "challengeTemplateVersion": "number",
  "datasetId": "string | null", "datasetVersion": "number | null — for SQL/Power BI/Pandas/Data Science challenges",
  "difficulty": "Easy | Medium | Hard | Expert",
  "skill": "string — the specific skill node being assessed", "skillGraphVersion": "number",
  "workstation": "string — one of the named workstations, MUST resolve to a real UI-module composition",
  "workstationVersion": "number",
  "payload": {
    "// workstation-specific, each workstation declares its own required schema": ""
  },
  "validator": {
    "type": "test_case_judge | ground_truth_compare | published_result_compare | live_render_probe | http_assertion | command_output_match | formula_result_check | kpi_compare | rubric_review | numeric_tolerance | register_match",
    "version": "number",
    "config": "validator-specific config"
  },
  "assessmentRules": {
    "rubric": "role-specific rubric criteria + weights",
    "aiReviewWeight": "number, capped — supplement only, never overrides validator floor/ceiling",
    "timingWeight": "number, small",
    "codeQualityChecks": "array of static-check rules, workstation-specific"
  },
  "submissionRules": {
    "timeLimitSecs": "number | null",
    "maxAttempts": "number | null",
    "integrityChecks": ["paste_detection", "tab_switch", "screen_share"]
  },
  "progressionRules": {
    "prerequisiteSkills": ["skill ids that must be attempted before this unlocks"],
    "cooldownDays": "number — anti-repetition window"
  },
  "rewardRules": {
    "common": { "xp": "number", "streak": true, "skillMastery": true, "elo": false },
    "domain": { "xp": "number", "streak": true, "skillMastery": true, "elo": true, "baseEloGain": "number" }
  },
  "portfolioDecision": {
    "eligibleFor": "domain only",
    "minScoreToAutoPublish": "number, role-specific",
    "allowManualPublishBelowThreshold": "boolean, plan-dependent",
    "artifactType": "code | report | dashboard | design | diagram",
    "recruiterEvidence": "structured skill/score/difficulty/industry/scenario evidence — see Content Spec §13"
  }
}
```

**Hard gate, unchanged in principle, now a named pipeline step (§1) instead of an implicit one**: the Challenge Payload Validator rejects any payload where `payload`, `validator`, or `rewardRules` is missing or fails its workstation's declared schema. It never reaches the Workstation Router, let alone the frontend.

---

## FROZEN — this document + the `arena-content-spec/` package set (10 packages, §1.2) are the Arena V2 specification

No further architecture iteration planned. Per your direction, the path forward is:

- **Phase 1 — Backend architecture**: concrete folder structure for the 11 modules in §1 (including `capability-registry/`, §1.1), module interfaces/contracts between them, the API surface (REST routes replacing today's fragmented `arena.js`/`arenaV2.js`), and the database schema (new tables — `challenge_templates`, `challenge_template_versions`, `scenario_packs`, `datasets`, `dataset_versions`, `skill_graphs`, `challenge_analytics_events`, `domain_challenge_grants`, `role_capabilities` — plus which of the audit's existing tables get reused vs. replaced).
- **Phase 2 — Common Challenge engine**: the simpler of the two systems (no Industry, no Scenario Pack, no Skill Dependency unlocking — just Challenge Library → Challenge Engine → Workstation Router → Validator → Submission → XP), built and proven first.
- **Phase 3 — One complete Domain Role, end-to-end**: Frontend Developer, per your recommendation — it exercises the React workstation, the live-render probe validator, Industry variation (E-Commerce/EdTech), a real Scenario Pack, and the full Skill Dependency graph from §6 of the Content Spec. If this role works correctly end-to-end (Career Role → Industry → Skill Engine → Progression → Challenge Library → Challenge Engine → Payload Validator → Workstation Router → Workstation → Validator → Submission → Assessment → Feedback → Score → Portfolio Decision → Portfolio → ELO), the framework is proven, not just designed.
- **Phase 4 — Replicate to the remaining 39 roles**, reusing the proven Phase 3 framework rather than evolving architecture and content simultaneously.

Waiting for your go-ahead to start Phase 1.
