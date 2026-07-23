# Arena V2 Content Spec — 06. Scenario Packs & Datasets

Package 6 of 10. See `00-conventions-and-versioning.md` for shared versioning rules (`scenarioPackVersion`, `datasetId`/`datasetVersion`).

## Scenario Packs — worked examples across role families

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

Every Scenario Pack is industry-tagged (`07-industries.md`) and role-family-tagged, so Challenge Progression can rotate a student across packs without ever mixing incompatible content (a Data Analyst won't be handed "PayFast: Auth Hardening").

## Dataset Versioning

Scenario Packs often ship with backing datasets that evolve independently of the scenario narrative itself. Worked example:

**"Amazon" Scenario Pack dataset lineage:**
- `datasetId: amazon-orders`, `datasetVersion: v1` — original seed dataset (small, hand-authored)
- `datasetVersion: v2` — expanded row count + added a data-quality issue (duplicate order IDs) specifically for a Hard-tier SQL Joins variant (`08-challenge-templates-and-payload.md`) that tests dedup logic
- `datasetVersion: v3` — added a new `returns` table to support a new Scenario ("Returns Analysis") without touching `v1`/`v2`, which existing in-progress students remain pinned to

Same resolution rule as `00-conventions-and-versioning.md`: new challenge starts get the latest `datasetVersion` for a given `datasetId`; in-progress students keep the version recorded on their payload. This also means a dataset bug fix (e.g. correcting a wrong total in `v2`) ships as `v3` rather than mutating `v2` in place — mutating a dataset a student is actively querying against would silently invalidate their in-flight `ground_truth_compare`/`kpi_compare` validator expectations (`05-validators.md`).

## Sign-off

- [ ] Scenario Pack model + 4 worked examples — approved, or request more/different packs before Phase 2 authoring begins
- [ ] Dataset Versioning model — approved, or amend

Cross-references: `01-roles.md` (role-family tagging), `07-industries.md` (industry tagging), `08-challenge-templates-and-payload.md` (`scenarioPackId`/`scenarioPackVersion`/`datasetId`/`datasetVersion` fields on the payload).
