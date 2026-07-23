# Arena V2 Content Spec — 09. Analytics

Package 9 of 10. See `00-conventions-and-versioning.md` for shared versioning rules.

Analytics taps every pipeline stage in parallel (blueprint §8) and writes to `challenge_analytics_events` (Phase 1 DB list). Metrics tracked, and where each one is sourced from:

| Metric | Source stage | Notes |
|---|---|---|
| Average completion time | Submission Engine (`startedAt` → `submittedAt`) | Segmented by role, challenge, difficulty |
| Pass rate | Assessment (final score vs. `minScoreToAutoPublish` / rubric pass threshold) | Segmented by challenge template + difficulty variant, surfaces templates that are miscalibrated |
| Most failed validator | Validator layer (per-check pass/fail array, `05-validators.md` output shapes) | Aggregated by validator type + config, flags a specific check (not just "the challenge") that's tripping students |
| Hint usage | Challenge Engine / Workstation (hint-request events, if/when hints exist per template) | Feeds Difficulty Variant tuning (`08-challenge-templates-and-payload.md`) |
| Abandonment rate | Submission Engine (challenge started, never submitted, session ended) | Distinct from zero-effort-timeout-style zero-score submissions — abandonment is "never submitted at all" |
| AI feedback frequency | Assessment (`aiReviewWeight` invocation count) | Monitors how much the rubric is leaning on AI vs. deterministic checks — a rising trend here is a signal to add more deterministic validator coverage, not a target to hit |
| Workstation performance | Workstation Router + client-side timing (load time, compile/render latency for live-render-probe workstations) | Ops-facing, not student-facing |
| Challenge Payload Validator rejection rate | Challenge Payload Validator (`08-challenge-templates-and-payload.md`) | Split into schema-gate rejections vs. Capability Registry rejections (`02-skills-and-capabilities.md`) so the two failure modes are diagnosable separately |

Feeds an internal ops dashboard only — none of this is student- or recruiter-facing. It exists to catch miscalibrated content and pipeline regressions early, not to gamify anything for the student.

## Sign-off

- [ ] Analytics/telemetry metric list — approved, or amend

Cross-references: `08-challenge-templates-and-payload.md` (Challenge Payload Validator two-gate model), `02-skills-and-capabilities.md` (Capability Registry rejections), `05-validators.md` (per-check output shapes feeding "Most failed validator").
