# Arena V2 Content Spec — 08. Challenge Templates & Payload Schema

Package 8 of 10. See `00-conventions-and-versioning.md` for shared versioning rules (`challengeTemplateVersion`).

## Common Challenge categories

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

Every category above maps 1:1 onto an existing REUSE-flagged workstation from the audit (`04-workstations.md`) — no new UI-module work is required to launch Common Challenges.

## Difficulty Variants — worked examples

**SQL Joins**: Easy = 2 tables, INNER JOIN · Medium = 4 tables, mixed JOIN types · Hard = adds window functions · Expert = adds CTEs + window functions + a performance target (e.g. "under 200ms on 5M rows").

**React Component Build** (Frontend Developer): Easy = static component, hardcoded props, no state · Medium = adds local state + one side effect (`useEffect` fetch) · Hard = adds loading/error/empty states + prop-driven variants · Expert = adds accessibility requirements (keyboard nav, ARIA) + a performance constraint (no unnecessary re-renders, verified via the live-render probe's re-render count).

**DevOps Pipeline Fix** (DevOps Engineer): Easy = fix one broken YAML step · Medium = fix a multi-stage pipeline with a dependency ordering bug · Hard = add caching/parallelization requirements · Expert = full pipeline redesign under a stated constraint (e.g. "must finish in under 3 minutes").

**Vulnerability Fix** (Cybersecurity Analyst): Easy = 1 vulnerability (e.g. SQL injection only) · Medium = 3 vulnerabilities (adds missing auth, rate limiting) · Hard = 5 vulnerabilities (today's Arena V1 seed content, `cy-001`, reused as the Hard tier) · Expert = adds a requirement to write the accompanying security advisory/report alongside the fix.

Each Challenge Template declares which of the four tiers it actually supports — not every template needs all four (a "write an incident postmortem" template may only need one tier).

## Challenge Payload schema (canonical — matches blueprint §10 FROZEN v1.1, single source of truth)

```json
{
  "challengeInstanceId": "string, unique",
  "challengeType": "common | domain",
  "careerFamily": "string — reserved root, IT only implemented (01-roles.md)",
  "role": "string — one of the 40 roles (01-roles.md)",
  "industry": "string | null",
  "scenarioPackId": "string | null",
  "scenarioPackVersion": "string | null (00-conventions-and-versioning.md)",
  "scenarioId": "string | null",
  "challengeTemplateId": "string",
  "challengeTemplateVersion": "string",
  "datasetId": "string | null (06-scenario-packs-and-datasets.md)",
  "datasetVersion": "string | null",
  "difficulty": "Easy | Medium | Hard | Expert",
  "skill": "string",
  "skillGraphVersion": "string (03-learning-paths.md)",
  "workstation": "string — must resolve to a composition in 04-workstations.md",
  "workstationVersion": "string",
  "payload": { "// workstation-specific, schema declared per workstation": "" },
  "validator": { "type": "one of 05-validators.md", "version": "string", "config": "validator-specific" },
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

## Challenge Payload Validator gate (blueprint §1/§1.1)

Two independent checks, both must pass before a payload reaches the Workstation Router:

1. **Schema-shape gate** (original hard gate): missing/invalid `payload`, `validator`, or `rewardRules` → rejected.
2. **Capability Registry gate** (new, `02-skills-and-capabilities.md`): `payload.workstation`/`payload.validator.type` not registered for `payload.role` → rejected.

Every rejection — either kind — is logged as its own Analytics event (`09-analytics.md`), distinguishable by which gate rejected it, so a miscalibrated schema and a miscalibrated Capability Registry entry are diagnosable separately rather than both showing up as one generic "rejection rate."

## Sign-off

- [ ] Common Challenge categories — approved as listed, or amend
- [ ] Difficulty Variant framework — approved, or amend the worked examples
- [ ] Challenge Payload schema, versioning-inclusive — approved as final, or amend
- [ ] Challenge Payload Validator two-gate model — approved, or amend

Cross-references: `01-roles.md`, `02-skills-and-capabilities.md`, `03-learning-paths.md`, `04-workstations.md`, `05-validators.md`, `06-scenario-packs-and-datasets.md`, `09-analytics.md`, `10-portfolio-and-recruiter-evidence.md` — this package's schema references nearly every other package by design, since it's the one payload that flows through the entire pipeline.
