# Question Bank Reviewer Checklist

For anyone with admin access (`profiles.is_admin = true`) reviewing draft questions in
`question_bank` before approval. This checklist exists because approval is a one-way trust
signal: once a question is `approved`, it becomes eligible for real users to be scored against
in Weekly Skill Pulse v2. Nothing here is auto-approved — every row, including the 300
AI-generated drafts from 2026-07-24, needs a human reviewer to work through this list before
`review_status` moves to `approved`.

## Before you start

- You need `profiles.is_admin = true` on your account. The admin routes in
  `backend/server/routes/questionBankAdmin.js` reject any request without it.
- Work through the review queue: `GET /admin/question-bank?review_status=draft&domain=<domain>`
  (or `in_review` once you've started a batch — see workflow below).
- Do not batch-approve. Read every question individually. A question that looks fine at a glance
  can still fail on a specific check below.

## Workflow states

`draft → in_review → approved` (or `rejected`, or back to `draft` via "request changes").
`approved → retired` when a question is pulled from active rotation (still visible in version
history, no longer selectable). Editing an approved question creates a **new draft row** with
`parent_id` pointing at the old one and `version` incremented — it does not silently mutate a
question that may already be in someone's in-flight pulse.

## Per-question checklist

For every question, confirm all of the following before approving:

1. **Prompt is a real, well-formed scenario.** Not a trivia fact lookup, not a trick question,
   not ambiguous enough that two reasonable people would pick different "correct" answers for
   different valid reasons.
2. **Exactly one option is unambiguously correct.** Re-read all four options as if you didn't
   know the answer — if a second option is arguably just as defensible, send it back with
   `request-changes` rather than approving.
3. **The three distractors are plausible, not absurd.** A distractor that no reasonable person
   would ever pick isn't testing anything — it's padding. Distractors should represent common
   real mistakes or misconceptions, not strawmen.
4. **No trick wording.** Double negatives, "which of the following is NOT," or answers that hinge
   on a technicality in phrasing rather than actual understanding should be rejected or rewritten.
5. **`explanation` actually explains the *why*, not just restates the answer.** "A is correct" is
   not an explanation. "A is correct because X causes Y, which rules out B and C" is.
6. **`difficulty` matches the actual reasoning load.** 1-2 (easy) should be answerable from basic
   familiarity with the skill; 3 (medium) requires connecting two ideas; 4-5 (hard) requires
   weighing a real trade-off or reasoning through a non-obvious second-order effect. If a
   "hard" question is actually easy once you read it, downgrade it via request-changes rather
   than approving the mislabeled difficulty.
7. **`skill_tags` and `domain` are accurate.** The question should genuinely test the tagged
   skill, not just mention it in passing.
8. **`question_type` matches the question's actual shape** (`scenario`, `reasoning`,
   `bug_finding`, `dashboard_interpretation`, `operational_decision`, `work_situation`,
   `architecture_interpretation`). Mislabeling this breaks the selection engine's attempt to
   balance question types within a pulse.
9. **No real-world bias, stereotype, or inappropriate content.** Scenarios should be
   professionally neutral — no gendered assumptions about roles, no culturally specific
   references that would confuse or alienate part of the user base.
10. **Not a duplicate or near-duplicate of an already-approved question** for the same skill.
    The selection engine already excludes questions a *user* has seen in the past 8 weeks, but
    that doesn't protect against near-identical questions being served to *different* users in
    the same week, which would make the pulse feel repetitive at scale.

## Explicitly out of scope for reviewers to fix silently

If a question fails checks 1-10 above, use **request-changes** (which creates a new draft
version) rather than hand-editing and approving in the same pass — this preserves the audit
trail showing what was flagged and what changed, per `question_bank_audit_log`.

## Batch review guidance for the 2026-07-24 draft set (300 questions)

- These are AI-generated (`source = 'ai_generated'`), authored from 10 template "frames" per
  domain, each instantiated 3 times (once per skill tag in that domain) — expect very similar
  phrasing and structure across the 3 skill variants within a domain. This is expected and not
  itself a defect, but review each variant independently since template reuse can occasionally
  produce a phrase that reads oddly for one specific skill even if it reads fine for the other two.
- Distractor option ordering was deterministically shuffled per-question (not always "A" as the
  correct answer) — verify the correct option truly matches `correct_option_id`, don't assume
  position.
- `customer_success` has a heavier easy-tier skew (15 easy vs the 9-12 typical elsewhere) — flag
  for a follow-up authoring pass if you want a more even spread, but this alone is not a rejection
  reason for the individual questions.
- `architecture_interpretation` question type only appears 3 times total, all under
  `software_engineering` — expected, not a defect, but don't expect to find this type in other
  domains yet.

## Sign-off

Track your own review pace against the release gate: **each domain needs ≥30 approved questions**
before `career_os_skill_pulse_v2` can be considered for that domain's users, and **all 10 domains**
need to clear that bar before the global coverage gate (`checkGlobalCoverageGate`) returns true.
Partial approval (e.g. 25 of 30 approved in one domain) keeps that domain — and therefore the
whole global gate — below threshold; the selection engine falls back to the v1 5-question flow
until the bar is cleared.
