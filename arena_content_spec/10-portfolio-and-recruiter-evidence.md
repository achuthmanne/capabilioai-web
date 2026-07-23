# Arena V2 Content Spec — 10. Portfolio & Recruiter Evidence

Package 10 of 10. See `00-conventions-and-versioning.md` for shared versioning rules.

## Portfolio artifact types

| Artifact type | Produced by | Shown to recruiters as |
|---|---|---|
| `code` | Code, React/Frontend, API, Terminal, Embedded, Full Stack Workstations | Repository-style code snippet + pass/fail summary |
| `report` | Report, Notebook (analysis writeups), SOC/QA report-style challenges | Formatted written analysis |
| `dashboard` | Dashboard, Excel Workstations | Rendered chart/KPI snapshot |
| `design` | React/Frontend Workstation (UI/UX-tagged challenges) | Rendered component/screen preview |
| `diagram` | System Design Workstation | Rendered architecture diagram + rationale |

Every artifact carries its Portfolio Decision provenance (auto-published at score X, or manually published by the student below threshold) — the recruiter-facing honesty mechanism from blueprint §5, not just an internal flag.

## Recruiter Skill Evidence

Structured metadata attached to every Portfolio artifact above, carried on the payload as `portfolioDecision.recruiterEvidence` (`08-challenge-templates-and-payload.md`). This is what a recruiter viewing a candidate's portfolio actually sees per artifact — not just the artifact content, but the evidence trail behind it. Worked example, reproduced exactly as specified:

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

`Verification` is either `Verified` (auto-published, met `minScoreToAutoPublish`) or `Self-Selected` (student manually opted to publish below threshold, per the Portfolio Decision gate, blueprint §5) — this field is what keeps the self-selected path honest for recruiters instead of presenting it as equivalent to a verified pass. `Skills Demonstrated` is drawn from the Challenge Template's declared skill tags (`08-challenge-templates-and-payload.md`), not free text, so it stays consistent across every artifact of the same template.

## Sign-off

- [ ] Portfolio artifact types — approved, or amend
- [ ] Recruiter Skill Evidence fields — approved, or amend

Cross-references: `06-scenario-packs-and-datasets.md` (`scenario` field), `07-industries.md` (`industry` field), `08-challenge-templates-and-payload.md` (`recruiterEvidence` schema, `portfolioDecision` gate).
