# Arena V2 Content Spec — 00. Conventions & Versioning

**Status: content contract, not code.** This package is one of 10 in the Arena Content Specification, split from a single document per your review, plus this shared conventions file. Companion to `arena_v2_blueprint.md` (FROZEN v1.1). Once the sign-off checklist across all 10 packages is clear, Phase 1 (Backend architecture) begins.

## Why a split, and why this file exists on its own

The original spec was one ~400-line document covering roles, skills, workstations, validators, payload schema, scenario packs, industries, portfolio, versioning, analytics, and recruiter evidence. Your review flagged that this doesn't scale once Arena covers 40 IT roles today and potentially 100+ roles across ECE/Mechanical/Civil/MBA/Healthcare in future Career Families (blueprint §0) — a single document becomes hard to version and maintain independently.

The 10 packages, matching your requested list exactly:

| # | Package | File |
|---|---|---|
| 01 | Roles | `01-roles.md` |
| 02 | Skills (+ Capability Registry) | `02-skills-and-capabilities.md` |
| 03 | Learning Paths | `03-learning-paths.md` |
| 04 | Workstations | `04-workstations.md` |
| 05 | Validators | `05-validators.md` |
| 06 | Scenario Packs (+ Datasets) | `06-scenario-packs-and-datasets.md` |
| 07 | Industries | `07-industries.md` |
| 08 | Challenge Templates (+ Payload schema) | `08-challenge-templates-and-payload.md` |
| 09 | Analytics | `09-analytics.md` |
| 10 | Portfolio (+ Recruiter Evidence) | `10-portfolio-and-recruiter-evidence.md` |

**One engineering judgment call, flagged rather than silently made:** Versioning (previously §10 of the single document) and Dataset Versioning (previously §12) don't belong to any single package — they're a cross-cutting rule that every other package's version fields depend on. Rather than force-fitting the general versioning rule into one of your 10 named packages, it lives here in `00-conventions-and-versioning.md` as a zeroth, shared file that every other package references. Dataset Versioning specifically (the Amazon-dataset example) still lives in `06-scenario-packs-and-datasets.md` since it's tied directly to Scenario Packs — this file states only the general rule.

## The versioning rule (applies to every package below)

Every content layer that Phase 2+ authoring will touch is independently versioned:

| Layer | Versioned unit | Declared in package | Resolution rule |
|---|---|---|---|
| Challenge Template | `challengeTemplateId` + `challengeTemplateVersion` | 08 | New challenge starts resolve to latest version; a student mid-attempt stays pinned to the version they started (`challenge_template_versions` table) |
| Workstation | `workstation` + `workstationVersion` | 04 | Same pin-on-start rule — a UI-module recomposition never changes the workstation underneath a student mid-challenge |
| Validator | `validator.type` + `validator.version` | 05 | Changing a validator's grading logic requires a version bump; in-flight submissions grade against the version recorded on the payload, not the latest |
| Skill Graph | `skillGraphVersion` | 03 | Adding/reordering prerequisites bumps this; a student's unlocked-skill state is evaluated against the graph version active when they unlocked it |
| Scenario Pack | `scenarioPackVersion` | 06 | New scenarios added to a pack bump this; doesn't affect students already inside a scenario |
| Dataset | `datasetId` + `datasetVersion` | 06 | Detailed in `06-scenario-packs-and-datasets.md` |
| Capability Registry entry | implicit — registry is a lookup table, not versioned per-instance | 02 | A role's registry entry is read fresh at Challenge Payload Validator time (not pinned), since it gates what's allowed to be authored/routed going forward, not a specific student's in-flight grading contract |

Rule of thumb used throughout: **version bumps affect only new starts; every in-progress student is pinned to the version snapshot recorded on their `challengeInstanceId` at creation time.** This is why the Challenge Payload schema (08) carries a version field next to nearly every ID — it's the mechanism that keeps grading deterministic even as content evolves under it.

## Sign-off

- [ ] Package split (10 files + this conventions file) — approved as structured, or amend groupings
- [ ] Versioning rule (this file) — approved, or amend

Once all 10 packages + this file are signed off, Phase 0.5 is fully locked and **Phase 1: Backend architecture** begins per the blueprint's frozen 4-phase build order.
