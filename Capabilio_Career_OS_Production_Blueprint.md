# Capabilio Career OS — Production Deployment Blueprint

**Status:** Production-ready specification for staged rollout onto the live Capabilio platform (capabilio.online).
**Grounding:** This blueprint is written against Capabilio's actual current architecture — Vite/React frontend (no router, page-id navigation), Node/Express backend, Supabase/PostgreSQL, Groq/Gemini AI integrations — not a greenfield concept. Every module below states what already exists and is being extended, versus what is genuinely new. Nothing here proposes deleting a capability that already delivers value; existing modules are renamed, reorganized, or absorbed.

---

## 1. Executive Product Decision

Capabilio repositions from **"a platform with career-related features"** to **the Career Operating System a working professional opens every week, whether or not they are job-hunting.**

Three decisions anchor everything below:

1. **Every score becomes a sentence.** No internal metric (ELO, Layoff Shield, Market Value, Career Velocity, Proof Strength) ships to a professional-path screen without being translated into a plain-language outcome statement with a driver breakdown and a next action. ELO is retained internally as a computation primitive (it already powers Arena/skill scoring for the Student path and is wired through `profiles.elo_rating`) but is never surfaced by that name to the Professional or Company-linked user. Where a professional-facing number is shown, it is a *derived, explained* number (Promotion Readiness %, Salary Position, Career Resilience), never a raw internal score.
2. **Navigation reflects outcomes, not modules.** Eight top-level items: Home, Career, Skills, Launchpad, Pulse, Connect, Company, Profile. This is a change from Capabilio's current shipped nav (Home / Launchpad / Pulse / Connect / Profile, with Career and Skills folded into Profile tabs) — see §20 for the exact migration path back out to standalone Career and Skills modules, and the net-new Company module.
3. **Retention does not depend on job-search intent.** Weekly Skill Pulse (already built — `weekly_pulses`/`weekly_questions`/`weekly_answers` tables and `backend/server/routes/weeklyPulse.js`), Career Replay, Company module, and Mentor economy are the four pillars that give a professional a reason to open Capabilio while employed and not searching.

---

## 2. Product Positioning

**Category:** Career Operating System (not job board, not LinkedIn clone, not LMS, not assessment platform).

**One-line positioning:** *Capabilio is the professional command center that tells you what to do for your career this week, proves what you've done, and connects you to the people and opportunities that move you forward.*

**Positioning against category anchors:**

| Category | What they optimize for | What Capabilio optimizes for |
|---|---|---|
| Job boards (Naukri, Indeed) | Application volume | Fit-explained, always-on opportunity matching, not just active search |
| LinkedIn | Broadcast/visibility | Verified, private-by-default professional record |
| Assessment platforms (HackerRank, student-facing Arena-style tools) | One-time scoring | Continuous, low-friction skill maintenance (Weekly Skill Pulse) |
| Generic analytics dashboards | Metrics for their own sake | Every number answers a real question with a next action |
| LMS | Course completion | Skill evidence tied to real career outcomes (promotion, salary, mobility) |

---

## 3. Core Redesign Principles

1. **Outcome-first metric translation** (see Product Problem in the brief — implemented as a hard UI rule in §5 and enforced via a shared `OutcomeCard` component contract, not left to per-page discretion).
2. **One highest-impact action per surface.** Home's "Today's Priority" is a hard single-recommendation slot, not a list.
3. **Explainability is mandatory, not optional.** Every score/confidence value ships with a "why" affordance (driver list + link to evidence) before it ships with the number itself. This is enforced at the design-system level: the `ScoreCard` design-system component *requires* a `drivers: string[]` prop and a `basis: string` prop — it cannot render a bare number.
4. **Consent-first data flow.** Any surface that could expose a user's data to an employer, recruiter, or mentor requires an explicit, revocable consent record (`consent` table, §12), not an implicit default-on setting.
5. **Backward compatibility.** Every existing real data source (profiles.*, user_skills, weekly_pulses, arena_history, EPFO verification, resume parsing pipeline) is reused, not replaced. New tables are additive.
6. **No fabricated confidence.** Where Capabilio doesn't have enough real data to answer a question (e.g., 0 skills mapped, no salary data for a region), the product says so explicitly rather than generating a plausible-sounding but ungrounded answer — this is already an established pattern in the current Skill Gap Analysis (`skillGraph.js`) and AI Coach must inherit it.

---

## 4. Final Information Architecture

### 4.1 Top-level navigation (desktop header + mobile bottom nav / drawer)

| # | Item | Landing page id | Absorbs / replaces |
|---|---|---|---|
| 1 | 🏠 Home | `home` | Existing `professionalHome` |
| 2 | 📈 Career | `career` | Existing Orbit dashboard (`orbit`) + "Career & Vault" tab currently inside Profile |
| 3 | 🧠 Skills | `skills` | Existing `Skills.jsx` page + "Skills"/"Skill Graph Pro" tabs currently inside Profile |
| 4 | 🚀 Launchpad | `launchpad` | Existing Launchpad, expanded tab set |
| 5 | 📰 Pulse | `pulse` | Existing Pulse, restructured into topic tabs |
| 6 | 🤝 Connect | `connect` | Existing Nexus, expanded with Mentor economy |
| 7 | 🏢 Company | `company` | **New module** — pulls employment-linked data already in `profiles.experiences`/EPFO verification into a first-class surface |
| 8 | 👤 Profile | `profile` | Existing Aura.jsx, re-scoped to identity/documents/visibility only (Career and Skills content moves out to their own modules) |

Mobile: bottom nav shows Home / Career / Skills / More (drawer with Launchpad, Pulse, Connect, Company, Profile). Desktop: full 8-item horizontal nav, consistent with the existing `PROFESSIONAL_HEADER_NAV` pattern in `App.jsx` (path-keyed nav arrays already exist — this is an extension of that mechanism, not a new one).

### 4.2 Sub-navigation map

| Module | Sub-tabs |
|---|---|
| Career | Overview · Timeline · Employment · Promotions · Achievements · Compensation · Career Health · Reputation · Company Reviews · Career Replay |
| Skills | Weekly Skill Pulse · Skill Graph · Skill Confidence · Skill Decay · Market Demand · Learning · Certifications · Skill Evidence |
| Launchpad | Jobs · Referrals · Internal Jobs · Consulting · Freelancing · Remote · Teaching · Startup Roles · Speaking · Saved · Applied · My Opportunities |
| Pulse | Industry · Technology · Company News · Salary · Hiring · Research · Government · AI |
| Connect | Discover · Mentors · Apply as Mentor · Book Session · My Sessions · Reviews · Community · Notifications |
| Company | Overview · My Team · Manager · Projects · Learning · Internal Mobility · Benefits · Policies · Performance · Reviews |
| Profile | Overview · Portfolio · Resume · Documents & Verification · Employment & Education · Certifications · Projects & Proof · Public Visibility · Privacy & Sharing · Account & Security |

### 4.3 Routing model

Capabilio's frontend has no router (Vite/React, `currentPage`/`setCurrentPage` state in `App.jsx`). This blueprint preserves that model rather than forcing a React Router migration mid-flight (a router migration is a legitimate future modernization but is out of scope for this redesign and would multiply regression risk across every existing page). Each module gets:
- a top-level `page` id (as today),
- an internal `activeTab` state **owned by the page component itself**, not the shared global `App.jsx` state.

> **Critical fix carried into this blueprint:** the current implementation has a single global `activeTab` state in `App.jsx` shared across Profile, Career, and Home — this was directly responsible for a production bug where student-only dashboard content leaked onto the Professional path (root-caused and patched this session). The IA in this blueprint requires **each module to own its own tab state locally**, with `App.jsx` passing only a one-shot deep-link target (e.g. `{page:"career", tab:"promotions"}`) that the module consumes once on mount and then owns. This is a mandatory architectural correction, not a style preference.

---

## 5. Full Screen-by-Screen UX Specification

Format per screen: Purpose · User story · Primary CTA · Empty state · Error state · Success state · Permissions · Analytics events · Privacy considerations.

### 5.1 Home

**Purpose:** Single daily decision surface. Answers "what should I do right now."
**User story:** *As a working professional, I open Capabilio and immediately know the one thing worth doing today, without hunting across tabs.*

| Section | Spec |
|---|---|
| Today's Priority | One recommendation only. Fields: `title`, `why_it_matters`, `expected_outcome`, `estimated_minutes`, `cta_label`, `cta_target`. Source: a priority-ranking job (§16) over pending actions (weekly pulse due, unverified employment, promotion evidence gap, mentor request pending, opportunity match ≥ threshold, joining/exit review eligible). Ties broken by: safety/compliance actions > time-boxed opportunities > skill maintenance > growth actions. |
| Weekly Career Check | Existing feature, kept as-is under a clearer subtitle ("5 quick questions, under 5 minutes"). Reuses `weeklyCheckApi` (`/pro/weekly/*`) unchanged. |
| Promotion Readiness | New computed card. Shows target role (from `profiles.target_role`, now reliably populated per this session's fixes), readiness %, top 2 evidence gaps, one CTA into Career → Promotions. |
| Weekly Skill Pulse status | Reuses existing pulse-status component pattern (`WeeklyPulseBanner`), relabeled consistently. |
| Salary Position | New. Shows range + position + confidence tier (High/Medium/Low based on data recency and comparable sample size) + region + CTA into Career → Compensation. Never renders without a confidence tier. |
| Opportunity Matches | Top 1–3 cards from Launchpad's matching engine, each with a one-line "why matched." |
| Company Status | If `profiles.company_id` (new FK, §12) is set: upcoming review windows, internal mobility highlights, manager check-in nudge. If not linked: a genuinely useful alternative state — "Link your current employer to unlock company-specific insights," not a dead card. |
| Mentor Area | Mentee state (recommended mentors, upcoming session) or Mentor state (requests, earnings, next payout) depending on `mentor_profiles` row existence. |
| AI Coach entry | Persistent, collapsed-by-default floating affordance, never a modal that blocks the page. |

**Empty state (new user, no resume, no data):** Home still renders — Today's Priority defaults to "Upload your resume to activate your Career OS," with the same why/outcome/time/CTA shape as any other priority, not a special-cased banner.
**Error state:** Any section whose backing call fails renders its own inline retry, never blanks the whole page (this is a direct lesson from this session's Skills-tab crash — every module-level render error must be contained to its own card, not propagate to a blank page; implement via per-card error boundaries).
**Analytics:** `home_viewed`, `priority_shown{type}`, `priority_completed{type}`, `priority_dismissed{type}`.
**Privacy:** Home never renders employer-visible or mentor-visible data without the relevant consent record already existing.

### 5.2 Career → Overview

**User story:** *As a professional, I want one screen that tells me where I stand and where I'm going, without decoding scores.*
Fields: current role, target role, career direction (Growing / Lateral / Transitioning — computed, not user-entered), Promotion Readiness %, Compensation position, top 2 risks (plain language, e.g. "Your evidence is concentrated in one domain"), top 2 opportunities, verified-profile completeness %, last 3 milestones.
**Empty state:** "Your career story starts with your first entry — add your current role" with a direct CTA into Timeline's add-entry flow (reuses existing `AddExperienceModal`).
**Permissions:** Owner-only by default; visible to employer only if `consent.scope='employer_career_overview'` exists and is unexpired.

### 5.3 Career → Timeline

Reuses `CareerTimeline` component and `experiences` data (already real, already resume-populated). New requirement: every entry renders an explicit evidence-source badge — `self-claimed | resume-derived | employer-verified | document-verified | capabilio-verified` — using the `verificationStatus`/`_source` fields that already exist on experience objects, simply surfaced consistently everywhere an entry appears (Timeline, Career Replay, Public Portfolio).

### 5.4 Career → Employment

Work history + employment verification (reuses existing EPFO/UAN verification flow, `VerificationSection` component) + role changes + project/outcome evidence + exit status.

### 5.5 Career → Promotions

**New module**, built on top of the existing `computeSignals()` logic already present in `Orbit.jsx` (Role Fit / Market Standing / Proof Strength / Career Mobility signal computation is real and reusable — it is not Arena-derived, it's derived from experiences/skills/verification/target role). Reframe its output:
- Target role mapping → competency requirement checklist (sourced from a new `role_competencies` reference table, §12).
- Evidence gaps → direct list of missing items with one CTA each.
- Promotion plan → ordered 3–5 step plan.
- Manager conversation prep → AI Coach-generated talking points grounded in the user's own evidence (never fabricated achievements).
- Readiness trend → sparkline over stored weekly snapshots (`career_health_snapshot` table, §12).

### 5.6 Career → Achievements

Structured Problem → Action → Result → Proof format. New `achievements` table. Each achievement can be flagged shareable to Public Portfolio and usable as AI Interview / AI Coach grounding context.

### 5.7 Career → Compensation

Salary history (opt-in, user-entered or offer-letter-derived, stored in `compensation_history`), current structure, market comparison (sourced from `market_salary_bands`, refreshed via a scheduled job, §16), negotiation prep, offer comparison tool. Every comparison explicitly states sample size and recency (e.g., "Based on 340 comparable profiles, refreshed 12 days ago") — no silent confidence.
**Privacy:** compensation data is private-by-default; never shared with employer, mentor, or public portfolio without per-field consent.

### 5.8 Career → Career Health

Explainable indicators, each a card with: label, current state (plain language, not a bare number), 2–3 drivers, 1 action.
Indicators: Growth Momentum · Mobility Readiness · Evidence Coverage · Skill Freshness · Professional Visibility.
Internally these may still be computed from the existing 0–100 signal math in `computeSignals()` — the UI contract is that the raw number is demoted to a small secondary label (e.g., "72/100" in muted text next to the primary sentence), never the headline.

### 5.9 Career → Reputation

Aggregates: verified skills count, verified employment count, certificates, project proof count, mentor rating (if mentor), community contribution, referrals received, portfolio completeness. All pulled from existing tables (`user_skills.verified`, `profiles.certifications`, `experiences[].verificationStatus`) plus new `mentor_ratings` aggregate.

### 5.10 Career → Company Reviews

User's own submitted reviews, pending review invitations, privacy controls, contribution-impact note ("Your review helped unlock aggregate insights for 40 other Data Analysts at this company"). Full spec in §10.

### 5.11 Career → Career Replay

**New, premium, high-retention feature.** A vertically-scrolling, cinematic timeline (reuses the existing `CareerVideoGenerator` component's asset-generation approach already built for Aura's video feature, extended into an always-available visual replay rather than a one-off video export). Milestones pulled from: experiences, promotions (role-change detection within experiences), verified skills reaching "verified" status, mentorship sessions delivered/received, career transitions, major achievements. Shareable as a private link (never public by default). This is explicitly gated behind Pro/Elite tier per existing `plans.js` plan structure.

### 5.12 Skills → Weekly Skill Pulse

Full production spec in §7. UI reuses the existing pulse-taking flow (`WeeklyCareerCheck.jsx`) already built, relabeled and relocated under Skills.

### 5.13 Skills → Skill Graph

Reuses the newly-fixed `SkillGraphView` component and the Skill Readiness radar built this session (real `user_skills` data, real domain-bucketed radar chart). No further redesign needed structurally — this screen already meets the spec's bar; it moves from "Profile → Skills tab" to "Skills → Skill Graph" as a URL/nav change only.

### 5.14 Skills → per-skill detail view

**New.** Clicking any skill in the Skill Graph opens a detail panel with every field the spec requires: name, `group_type` (category/domain), confidence (derived from `level_score`/`confidence`), verification status (derived via the existing `deriveVerificationState()` helper fixed this session), evidence source, last 4 weekly-pulse results touching this skill, decay status (§ below), market demand (from `market_skill_demand` reference data), last used/last refreshed/next refresh date, related roles, related projects (cross-referenced from `experiences[].skills`), learning recommendations, mentor recommendations, opportunity relevance (cross-referenced from Launchpad matches).

### 5.15 Skills → Skill Decay

**New, but the underlying signal exists.** Decay formula (see §7.6) applied per-skill using `user_skills.updated_at` recency and weekly-pulse coverage. Decay state: Fresh / Aging / At Risk / Decayed, each with an explicit "why" (e.g., "Not exercised in a weekly pulse for 11 weeks, and no project evidence added since March").

### 5.16 Launchpad (all tabs)

Reuses existing Launchpad matching logic (`userData.skills` already feeds job matching per current implementation) extended with the new tabs. Every opportunity card is a shared `OpportunityCard` component requiring: `match_reason`, `required_skills`, `missing_skills`, `compensation` (nullable, explicit "not disclosed" state), `work_model`, `company_signal`, `application_requirements`, `match_confidence`, `next_action`. Consent modal required before profile data is shared with any employer/recruiter-facing opportunity (`consent.scope='opportunity_share:{opportunity_id}'`).

### 5.17 Pulse (all tabs)

Every Pulse item is a shared `PulseItemCard`: `headline`, `source`, `published_at`, `why_it_matters` (role/domain-personalized, generated server-side, not client-guessed), `role_tag`, `recommended_action` (nullable), `save`/`dismiss`/`follow_topic` controls, and an explicit `content_type: news | opinion | sponsored | system_insight` badge. Community/social activity lives only under a clearly separate "Community" area inside Connect, never as Pulse's default view — Pulse's default view is always the curated intelligence feed, never empty.

### 5.18 Connect → Discover / Mentors / Apply as Mentor / Book Session / My Sessions / Reviews / Community

Full spec in §8.

### 5.19 Company (all tabs)

Full spec in §9.

### 5.20 Profile (all tabs)

Re-scoped from its current "everything" shape to identity/documents/visibility only, since Career and Skills content now lives in their own modules. Concretely: Profile keeps Overview (identity + photo/cover, reuses this session's hero-card fixes), Portfolio (public portfolio settings), Resume (import/re-import, reuses existing pipeline), Documents & Verification (reuses `VerificationSection`), Employment & Education (data entry surface — the *record itself* is now primarily viewed in Career), Certifications, Projects & Proof, Public Visibility, Privacy & Sharing (the consent ledger UI, §14), Account & Security.

---

## 6. Module-by-Module Functional Requirements

(Condensed cross-reference; full detail in §5, §7–10.)

| Module | Frontend routes (page ids) | Key components | Backend services | Primary tables |
|---|---|---|---|---|
| Home | `home` | `HomePriorityCard`, `PromotionReadinessCard`, `SalaryPositionCard`, `OpportunityMatchList`, `CompanyStatusCard`, `MentorAreaCard`, `AiCoachEntry` | `homeAggregator.js` (new, composes existing services) | profiles, user_skills, weekly_pulses, opportunities, mentor_bookings |
| Career | `career` | `CareerOverview`, `CareerTimeline` (existing), `PromotionPlanner` (new), `CompensationPanel` (new), `CareerHealthPanel` (existing signal logic, new UI), `ReputationPanel`, `CompanyReviewsPanel`, `CareerReplay` (new) | `careerRoutes.js` (extends existing Orbit logic), `compensationRoutes.js` (new) | profiles, experiences (jsonb), achievements, compensation_history, career_health_snapshot |
| Skills | `skills` | `SkillGraphView` (existing, fixed), `SkillDetailPanel` (new), `SkillDecayPanel` (new), `WeeklyPulseFlow` (existing) | `skillGraph.js` (existing, extended), `weeklyPulse.js` (existing) | user_skills, weekly_pulses, weekly_questions, weekly_answers, market_skill_demand |
| Launchpad | `launchpad` | `OpportunityCard`, `ApplicationTracker` (new), `ReferralRequestFlow` (new) | `launchpadRoutes.js` (extends existing) | opportunities, applications, referrals |
| Pulse | `pulse` | `PulseItemCard`, topic tab bar | `pulseRoutes.js` (extends existing) | pulse_items (new, or continues external-feed ingestion pattern already used) |
| Connect | `connect` | `MentorCard`, `BookingFlow` (new), `SessionDashboard` (new) | `mentorHub.js` (**rebuild** — current implementation references nonexistent tables per prior audit) | mentor_profiles, mentor_availability, bookings, sessions, ratings, earnings, payouts |
| Company | `company` | `CompanyOverview`, `InternalMobilityBoard`, `ProjectEvidenceVault`, `ReviewLifecyclePrompt` | `companyRoutes.js` (new) | companies, company_memberships, company_reviews, review_aggregates |
| Profile | `profile` | `ProfileHeader` (existing, fixed this session), `DocumentsPanel` (existing `VerificationSection`), `PrivacyLedger` (new) | `professionalProfile.js`, `resume.js` (existing) | profiles, vault_files (jsonb), consent |

---

## 7. Weekly Skill Pulse — Production Specification

**Current state:** Already built and live — `weekly_pulses`, `weekly_questions`, `weekly_answers` tables; `backend/server/routes/weeklyPulse.js` generates 5 scenario questions per week via Groq, scoped to the user's `user_skills` and resolved role (target_role → keyword → current-experience-title fallback, fixed this session). This blueprint **extends** that system from 5 to 15 questions and formalizes the production guardrails the current implementation lacks.

### 7.1 UX
- 15 scenario-based MCQs, target 5–8 minutes.
- Progress indicator (`Question 7 of 15`), pause/resume (persist `weekly_pulses.status='in_progress'`, already supported), keyboard navigation (arrow keys + number keys 1–4 for options, Enter to confirm), mobile-responsive single-column layout.
- No trick or rote-recall questions — enforced by the question-bank review process below, not just prompt instructions.

### 7.2 Question generation inputs
Current role, target role, domain, full skill graph (`user_skills`), dormant skills (decay state = At Risk/Decayed), past pulse mistakes (`weekly_answers.is_correct=false` history), skill confidence (`level_score`), experience level (`experiences` count/seniority), recently completed learning (new `learning_completions` table), recent project evidence (`achievements`), market demand (`market_skill_demand`), company context only when `company_memberships` consent allows it.

### 7.3 Question bank schema (new tables, additive to existing `weekly_questions`)

```
question_bank {
  id uuid pk
  skill_tags text[]
  domain text
  difficulty enum(easy, medium, hard)
  type enum(best_action, diagnose, interpret, technical_approach,
            stakeholder_comm, prioritization, troubleshooting,
            risk_compliance, business_decision, role_application)
  prompt text
  options jsonb            -- [{id,text}]
  correct_option_id text
  explanation text
  source enum(expert_authored, ai_generated_reviewed, ai_generated_unreviewed)
  review_status enum(draft, in_review, approved, retired)
  reviewed_by uuid null
  version int
  created_at, updated_at
}
question_report { id, question_id, user_id, reason, created_at, resolved boolean }
```

**Guardrail:** `ai_generated_unreviewed` questions are never served in production selection — the selection query filters `review_status='approved'` only. AI-generated questions enter the bank as `draft`, require expert `approved` status before entering rotation. This is a hard filter in the selection service, not a policy note.

### 7.4 Adaptive selection algorithm
1. Filter to `approved` questions matching the user's active skill tags.
2. Weight toward: skills in "At Risk" decay state (2x), skills with a target-role gap (1.5x), skills not covered in the last 3 pulses (anti-repeat — track via `weekly_answers` join).
3. Exclude questions answered by this user in the last 8 weeks (anti-repeat rule).
4. Difficulty adapts: if last pulse average correctness > 80%, skew next pulse harder; if < 40%, skew easier — bounded so no user ever gets an all-hard or all-easy set.
5. Cap: max 3 questions per single skill per pulse (breadth requirement).

### 7.5 Pass/fail policy
No pass/fail. Output is always framed as "skills refreshed" vs. "skills to revisit" — a wrong answer decrements confidence modestly and adds a targeted learning suggestion; it never produces a punitive "failed" state. Confidence adjustment is capped at ±8 points per pulse per skill to prevent volatility.

### 7.6 Skill decay formula (explainable)
```
weeks_since_last_signal = min(weeks since last weekly-pulse touch, weeks since last project evidence, weeks since last verification)
decay_state =
  Fresh    if weeks_since_last_signal <= 4
  Aging    if 4 < weeks_since_last_signal <= 8
  At Risk  if 8 < weeks_since_last_signal <= 16
  Decayed  if weeks_since_last_signal > 16
```
Every decay state ships with the exact driver ("Not exercised in a weekly pulse for 11 weeks; last project evidence added 5 months ago").

### 7.7 Post-pulse result
Skills refreshed / skills at risk / incorrect-concept explanations / targeted action plan / suggested learning / suggested mentor / suggested practice / confidence delta with visible math ("+4 confidence: 2 correct answers on SQL, capped at +8/week") / weekly trend chart / historical insight.

### 7.8 Operational rules
Rate limit: one pulse per user per week (existing `weekly_pulses` uniqueness per week already enforces this). Reminder: day 5 of the week if not started, day 6 if in-progress (new `notification` events, §16). Retention: raw answers retained 24 months for decay-trend accuracy, then aggregated-and-purged. Analytics events: `pulse_started`, `pulse_question_answered{skill,correct}`, `pulse_completed`, `pulse_abandoned`.

---

## 8. Mentor Marketplace — Production Specification

**Current state:** `backend/server/routes/mentorHub.js` exists but targets tables that were never migrated (flagged in prior architecture audit) — this is a **full rebuild on real tables**, not a patch.

### 8.1 Mentor eligibility & application flow
Guideline (not hard gate): ~10+ years relevant experience. Review criteria checklist stored per application: experience quality, verified employment (reuses EPFO verification), relevant skills (`user_skills`), work evidence (`achievements`), profile completeness %, communication readiness (short video/text prompt review), prior teaching/mentorship evidence, trust & safety history (`moderation_case` lookups).

Flow: Apply → expertise areas + audience served + bio + outcomes/proof + identity & payout KYC (via payment provider, §15) → availability → pricing (platform-approved band or custom, subject to review) → submit → status machine `submitted → under_review → changes_requested → approved | rejected | suspended`. On approval: unique `mentor_id`, verified badge.

### 8.2 Mentor profile fields
name, role, experience, domain, mentor_id, verification badges, expertise tags, languages, session formats, price, availability, session_count, rating, review_count, repeat_mentee_pct, avg_response_time, outcomes/testimonials (moderated), booking CTA.

### 8.3 Booking flow
Timezone-aware availability calendar (new `mentor_availability` table, RRULE-style recurrence), session type, objectives, pre-session question, payment (§15), confirmation, reschedule/cancel rules (configurable per mentor within platform min/max bounds), calendar integration (`.ics` generation + optional Google Calendar OAuth), meeting-link generation (Google Meet/Zoom link stored per session), post-session notes/action items, feedback, invoice/receipt, dispute workflow.

### 8.4 Mentor dashboard
Sessions total, earnings, pending payout, payout history, avg rating, repeat mentees, booking conversion, availability management, session notes, reviews, support/dispute status, tax/invoice configuration (India GST fields as baseline; extensible per jurisdiction).

### 8.5 Trust & safety
Identity verification (reuse existing verification infra pattern), payment KYC via compliant provider (Razorpay Route/Stripe Connect-equivalent — Capabilio already integrates Razorpay per `RAZORPAY_KEY_ID` env var, so **Razorpay Route** is the default recommendation for India-first marketplace payouts), rate limits on booking requests, fraud checks (velocity + duplicate-account heuristics), review moderation queue, abuse reporting, no-show policy (auto-refund/reschedule credit after N no-shows), refund policy, suspension/appeal workflow, audit trail (`audit_log`), explicit platform fee disclosure at checkout, no unsupported outcome claims in any mentor-facing copy ("proven to get promotions" is prohibited copy).

---

## 9. Company Module — Production Specification

**New top-level module.** Design for five company-link states explicitly (state machine on `profiles.company_link_state`): `joined_via_capabilio | linked_independently | unemployed | employer_not_partner | employer_verified_partner`.

### 9.1 Overview
Employment status, company info, role/team context, company career signals (aggregate review data if threshold met, §10), pending actions, benefits/policies (employer-supplied where available), internal opportunities, learning pathways, review status, privacy settings entry point.

### 9.2 Internal Mobility
Internal job board (employer-partner only), stretch project board, skills-required-for-move mapping (reuses `role_competencies`), role-adjacency mapping (reuses skill/domain taxonomy already in `skillGroups.js`), internal expert/mentor suggestions, private application controls, **explicit consent required before any employer visibility** (`consent.scope='internal_mobility_visibility'`), explicit manager-visibility rules surfaced in plain language before the user applies internally.

### 9.3 Projects (evidence vault)
User-controlled project evidence, each record explicitly tagged `private | employer_visible | portfolio_public | confidential`. Confidential-data warnings and a blocking confirmation step before saving anything tagged with employer-sensitive keywords (basic heuristic scan + explicit "do not upload confidential company information" notice — this is a policy control, not a technical DLP guarantee, and must be labeled as such).

---

## 10. Anonymous Company Review — Production Specification

This is the highest privacy-risk feature in the blueprint and is specified accordingly.

### 10.1 Triggers
- **Joining review:** 30 days after verified join date (only for `joined_via_capabilio` or verified-linked employment). Postpone/decline/opt-out always available; never forced.
- **Exit review:** after verified exit date or self-reported exit with supporting evidence. Same postpone/decline rules.

### 10.2 Questions
Joining: onboarding quality, role clarity, team support, manager support, learning opportunity, tools/technology, expectations vs. reality, culture, growth opportunity, work-life balance.
Exit: primary reason for leaving, manager quality, leadership trust, promotion fairness, compensation fairness, learning value, career growth, work-life balance, tech/environment, would-recommend, advice for future candidates.

### 10.3 Anonymity architecture (mandatory, non-negotiable)
- Reviewer identity is **never** exposed to the company, and never displayed publicly.
- Identity retained internally, in a separate restricted table (`company_review_identity`, access limited to Trust & Safety role only) solely for: fraud prevention, eligibility validation, moderation, legal/data-rights requests. This table is never joined into any company-facing or public query path — enforce via a database view (`company_review_public`) that the company-facing and public API can query, which structurally excludes the identity table.
- **k-anonymity threshold:** a review does not appear in any aggregate until at least **5 distinct reviewers** exist for that company + role-family + time-window combination. Below threshold, show "Not enough reviews yet to display" — never a partial reveal.
- No narrow filters that could re-identify (e.g., no "reviews from the only VP-level employee").
- Publication dates are bucketed to month, not exact day, in public-facing aggregates.
- Preview + edit window (48 hours) before publication.
- Deletion / data-rights requests honored subject to legal hold requirements; deletion removes the review from aggregates and recomputes.

### 10.4 Trust & safety
Verified-employment badge without identity exposure (computed server-side, never derived client-side from data the client could correlate). Moderation for defamation, harassment, personal data, confidential info (keyword + classifier pass, human review queue for flagged content). Rate limits, duplicate-review detection, company appeal process, audit logs on every moderation decision.

### 10.5 Display
Overall + category aggregates, trend only when sample size permits, role-family/location segmentation only above the k-anonymity threshold, "Verified employment-based insights" label, explicit sample size + confidence indicator, separate company-response channel (visible under the review, cannot identify reviewer), methodology/moderation policy linked from every aggregate view.

---

## 11. AI Coach — Production Specification

**Grounding rule (hard requirement, consistent with the honesty fixes already made to Skill Gap Analysis this session):** every AI Coach response must show a "Based on:" strip listing the exact data it used (e.g., "Your 9 mapped skills, your target role: Data Analyst, your last 2 Weekly Pulses"). If insufficient data exists to answer a specific question, AI Coach says so and offers the fastest path to get enough data (usually: complete a Skill Pulse, set a target role, or upload a resume) — it does not generate a plausible-sounding generic answer, exactly the same principle already enforced in the current Skill Gap Analysis fix.

**Capabilities:** Today's Advice, Promotion Plan, Salary Advice, Negotiation Prep, Interview Coach (reuses existing AI Interview infrastructure), Career Questions, Skill Roadmap, Pulse explanation, Switch Readiness, Opportunity Comparison, Resume/Portfolio improvement, Mentor suggestions + session prep, Company decision support, Internal mobility recommendations.

**Rules:** never claim guaranteed outcomes (salary/promotion/layoff/job); explicit uncertainty language required in prompt templates; no employer-side employment decisions; no inference of protected characteristics (enforced via a prompt-level and output-level filter list); source links for externally-sourced data (market salary, hiring trends); "why this recommendation" expandable on every response; user can delete any AI Coach conversation (cascades to `ai_coach_conversation` + associated embeddings); escalation link to human support or mentor booking on sensitive topics (layoffs, harassment, compensation disputes).

**Surfaces:** contextual entry point on every module (Home, Career, Skills, Launchpad, Connect, Company, Profile) plus a persistent side-panel chat and task-specific guided flows (e.g., "Prepare for my promotion conversation" launches a structured multi-step flow, not a freeform chat).

---

## 12. Data Model and Database Schema

Existing tables reused as-is: `profiles`, `user_skills`, `weekly_pulses`, `weekly_questions`, `weekly_answers`, `arena_history` (Student path only going forward).

### 12.1 New/extended entities (PostgreSQL, Supabase-hosted, RLS on every table)

```
profiles  (extend, additive columns only)
  + company_id uuid null fk companies.id
  + company_link_state enum(joined_via_capabilio, linked_independently,
                             unemployed, employer_not_partner, employer_verified_partner)

companies
  id uuid pk, name, domain, is_verified_partner bool, industry, size_band,
  hq_location, created_at

company_memberships
  id, user_id fk, company_id fk, role_title, department, join_date,
  exit_date null, verification_status enum(self_claimed, employer_verified, epfo_verified),
  manager_user_id null, created_at

achievements
  id, user_id, title, problem text, action text, result text, proof_url null,
  visibility enum(private, employer_visible, portfolio_public), created_at

compensation_history
  id, user_id, effective_date, base, variable, currency, source enum(self_reported, offer_letter),
  visibility enum(private) default private, created_at   -- never any other default

market_salary_bands
  id, role_family, location, experience_band, low, mid, high, currency,
  sample_size, refreshed_at

career_health_snapshot
  id, user_id, week_of, growth_momentum, mobility_readiness, evidence_coverage,
  skill_freshness, professional_visibility  -- weekly cron-computed, immutable log

role_competencies
  id, role_family, competency, weight, evidence_type_hint

market_skill_demand
  id, skill_slug, demand_score, refreshed_at, region

learning_completions
  id, user_id, skill_slug, resource_title, completed_at, source

question_bank / question_report  -- §7.3

opportunities
  id, type enum(job, referral, internal, consulting, freelance, remote, teaching,
                 startup, speaking), title, company_id null, required_skills text[],
  compensation jsonb null, work_model, posted_by, status, created_at
applications
  id, user_id, opportunity_id, status, applied_at, consent_id fk consent.id
referrals
  id, requester_id, referrer_id, opportunity_id, status, created_at

mentor_profiles
  id, user_id, mentor_id text unique, status enum(submitted, under_review,
     changes_requested, approved, rejected, suspended), expertise text[],
  bio, pricing jsonb, kyc_status, created_at
mentor_availability
  id, mentor_id fk, rrule text, timezone, session_length_minutes
bookings
  id, mentor_id fk, mentee_id fk, slot_start, slot_end, status, payment_id fk, created_at
sessions
  id, booking_id fk, meeting_link, notes text, action_items text[], completed_at
ratings
  id, session_id fk, rated_by, score, review_text, moderation_status
earnings / payouts / invoices  -- standard marketplace ledger tables, immutable earnings rows,
  payouts reference earnings by id, reconciliation job (§16)

company_reviews
  id, user_id (restricted access, see below), company_id, type enum(joining, exit),
  answers jsonb, submitted_at, moderation_status, publication_status
company_review_identity   -- separate table, Trust & Safety role only, never joined into
  review_id fk, user_id
review_aggregates
  id, company_id, role_family, period, sample_size, category_scores jsonb,
  published bool  -- published only when sample_size >= 5

consent
  id, user_id, scope, granted_to (mentor/company/recruiter id, nullable),
  granted_at, expires_at null, revoked_at null
audit_log
  id, actor_id, action, target_table, target_id, metadata jsonb, created_at
moderation_case
  id, subject_type, subject_id, reason, status, assigned_to, resolved_at
ai_coach_conversation
  id, user_id, messages jsonb, grounding_refs jsonb, created_at, deleted_at null
notification
  id, user_id, type, payload jsonb, channel enum(in_app,email,push), sent_at, read_at
```

### 12.2 Design rules
- Soft-delete (`deleted_at`) on anything user-facing and reversible (achievements, projects, mentor profile drafts). Hard-delete only on explicit data-rights erasure request, and only after legal-hold check.
- Immutable event log pattern for `career_health_snapshot`, `earnings`, `audit_log`, `company_review_identity` access — insert-only, no update/delete outside the erasure workflow.
- Row-Level Security on every new table, scoped to `user_id = auth.uid()` by default; company-facing views are separate, narrower Postgres views (not RLS bypass on the base table) so a bug in application code cannot leak reviewer identity — this is the single most important security control in the schema.
- Indexing: `user_id` on every user-scoped table, `(company_id, role_family, period)` on `review_aggregates`, `(skill_tags)` GIN index on `question_bank`.

---

## 13. API and Backend Architecture

**Recommendation: REST, not GraphQL.** Rationale: Capabilio's existing backend is REST/Express throughout (`backend/server/routes/*.js`), the team has zero GraphQL surface today, and the marketplace/payment/review workflows in this blueprint benefit from REST's simpler idempotency-key and webhook patterns. Introducing GraphQL now would add a second query paradigm for no proven need — reject it for this phase.

### 13.1 Endpoint groups (new/extended)

```
/api/pro/home/priority                GET
/api/pro/career/overview              GET
/api/pro/career/promotions            GET, POST (update target role/plan)
/api/pro/career/compensation          GET, POST (add entry), DELETE
/api/pro/career/replay                GET
/api/pro/skills/*                     existing, extended with /decay, /:id/detail
/api/pro/launchpad/opportunities      GET (filter/sort/paginate)
/api/pro/launchpad/applications       GET, POST
/api/pro/launchpad/referrals          GET, POST
/api/pro/pulse/items                  GET (tab filter)
/api/pro/connect/mentors              GET
/api/pro/connect/mentor-application   POST, GET (status)
/api/pro/connect/bookings             POST, GET, PATCH (reschedule/cancel)
/api/pro/connect/sessions/:id/notes   POST
/api/pro/connect/ratings              POST
/api/pro/company/overview             GET
/api/pro/company/internal-mobility    GET, POST (apply, with consent_id required)
/api/pro/company/reviews              GET, POST (idempotency-key required)
/api/pro/consent                      GET, POST, DELETE (revoke)
/api/ai-coach/message                 POST (streaming)
/api/ai-coach/conversations/:id       DELETE
/api/webhooks/payments                POST (signature-verified)
```

### 13.2 Cross-cutting requirements
- Auth: existing Supabase JWT (`requireAuth` middleware, already in use) on every endpoint.
- Idempotency-Key header required on `POST /company/reviews` and all payment-mutating endpoints (store key + response hash for 24h replay-safety).
- Pagination: cursor-based (`?cursor=&limit=`) on all list endpoints, default limit 20, max 100.
- Rate limits: per-user token bucket, tighter on `/company/reviews` (max 2 submissions/company/user/lifetime, enforced at DB constraint level too) and `/connect/bookings` (max 5 pending requests concurrently).
- Versioning: `/api/pro/v1/...` prefix introduced with this blueprint's endpoints; existing unversioned routes remain untouched to avoid breaking the live app during rollout.

---

## 14. Authorization, Privacy, Security, and Compliance

### 14.1 Roles (RBAC + attribute checks for company/mentor scoping)
Professional user · Mentor applicant · Approved mentor · Mentee · Employer administrator · Recruiter · Company reviewer/moderator (Trust & Safety) · Finance/payout operations · Customer support · Super administrator.

### 14.2 Privacy
Consent-first sharing via the `consent` table (§12) — every employer/recruiter/mentor-visible data flow checks for an active, unexpired, unrevoked consent row before the query executes, enforced in the service layer (not just UI hiding). Data minimization: company-facing views expose only fields the consent scope covers. Encryption in transit (TLS, already standard) and at rest (Supabase-managed encryption + explicit column-level encryption for `mentor_profiles.kyc_status` payload references and `compensation_history`). Secure document storage via signed URLs with short TTL (extends existing Vault upload pattern). Retention: raw pulse answers 24 months, moderation case data per legal-hold policy, deleted-account data purged within 30 days except where legal hold applies. Export/download: full-profile JSON export endpoint. Account deletion: soft-delete with 30-day recovery window, then hard purge job. Audit logs on every consent grant/revoke, every company-review moderation action, every payout.

**Jurisdiction:** India-first — design consent, review-anonymity, and payout KYC flows to satisfy DPDP Act 2023 principles (purpose limitation, consent, data minimization, breach notification, data-principal rights including erasure/access). Structure the same consent/audit primitives to be extensible to GDPR-style rights (access, rectification, erasure, portability, objection) for any future EU user base, without a schema rework.

### 14.3 Security
MFA option on account settings (TOTP), session management (existing Supabase session, add idle-timeout config), rate limiting (§13), input validation on every mutating endpoint (schema validation via existing pattern), file malware scanning on Vault/document uploads (new — integrate a scanning step before a signed URL is issued for any uploaded file), signed URLs for all document access, secret management via existing environment-variable pattern with a documented rotation policy, webhook signature verification (Razorpay signature check on payment webhooks), Content-Security-Policy headers on the frontend, structured logging that redacts PII/secrets by field-name allowlist, monitoring/alerting (§19), backup + quarterly restore-test policy.

---

## 15. Payments and Marketplace Operations

Provider: **Razorpay** (already integrated at the platform level via existing `RAZORPAY_KEY_ID`), using **Razorpay Route** for marketplace-style mentor payouts, with KYC collected during mentor application (§8.1).

- Refunds: standard Razorpay refund API, triggered by no-show policy or dispute resolution.
- Chargebacks: webhook-driven status sync into `bookings`/`earnings`.
- Taxes/invoices/fees: platform fee percentage disclosed at checkout; GST-compliant invoice generation for India; `invoices` table stores line-items.
- Webhooks: signature-verified, idempotent (dedupe on Razorpay event id), retried with backoff on processing failure, dead-letter queue for manual reconciliation.
- Reconciliation: nightly job reconciles `earnings` vs. Razorpay ledger, flags mismatches to Finance/payout ops role.
- Admin controls: manual payout hold/release, refund override, mentor suspension freezes pending payouts automatically.

---

## 16. Notifications and Background Jobs

### 16.1 Notification events
Weekly Skill Pulse due/reminder, mentor booking request/confirmation/reminder/cancellation, payment event (payout sent, invoice ready), review eligibility (joining/exit), opportunity alert (new match ≥ threshold), verification update (employment/education verified), internal mobility alert.
Channels: in-app (always), email (opt-in per category), push-ready architecture (payload schema defined now, delivery integration deferred to when a push provider is selected — not blocking this rollout). Digest option (daily/weekly summary email). Quiet hours (user-configured window, no push/email inside it, in-app notifications still queue).

### 16.2 Background jobs (cron/queue, extending existing Node backend — no new infra required, reuse existing worker pattern already present for grading in `backend/server.js`)
- Weekly Skill Pulse generation (existing, extend to 15-question selection algorithm, §7.4).
- Reminder scheduling (day 5/6 of week).
- Skill decay recalculation (nightly, per §7.6 formula).
- Company review eligibility scan (daily — checks 30-day joining and exit-date thresholds).
- Review aggregation recompute (on new review publish + nightly full recompute).
- Notification dispatch (queue consumer, retries with backoff).
- Payout processing (daily batch, feeds Razorpay Route).
- Data export generation (on-demand, async job with completion notification).
- Deletion workflow execution (30-day grace, then hard purge).
- Moderation escalation (SLA timer — auto-escalate unreviewed flagged content after 24h).
- Opportunity alert matching (runs on new opportunity ingestion + nightly full rescan).
- Market salary/skill-demand refresh (weekly, ingests reference data).
- Analytics aggregation (nightly rollups for the dashboards in §22).

---

## 17. Frontend Architecture and Route Map

Preserve the existing Vite/React, no-router, page-id model (§4.3). Each module is a top-level lazy-loaded page component consistent with current `lazy(() => import("./pages/X"))` usage in `App.jsx`.

```
App.jsx
 ├─ page: home          → HomeV2.jsx (new, composes existing WeeklyPulseBanner, new cards)
 ├─ page: career        → Career.jsx (new shell) + tabs: CareerOverview, CareerTimeline (existing
 │                          component, relocated), CareerEmployment, CareerPromotions,
 │                          CareerAchievements, CareerCompensation, CareerHealth,
 │                          CareerReputation, CareerCompanyReviews, CareerReplay
 ├─ page: skills         → Skills.jsx (existing, extended) + tabs: SkillPulse (existing),
 │                          SkillGraph (existing, fixed), SkillDetail (new), SkillDecay (new),
 │                          MarketDemand (new), Learning (new), Certifications, SkillEvidence
 ├─ page: launchpad      → Launchpad.jsx (existing, extended tabs)
 ├─ page: pulse          → Pulse.jsx (existing, restructured into topic tabs)
 ├─ page: connect        → Nexus.jsx (existing, renamed/extended) + Mentor sub-routes
 ├─ page: company        → Company.jsx (new)
 └─ page: profile        → Aura.jsx (existing, re-scoped per §5.20)
```

Each module owns its own `activeTab` local state (§4.3 mandatory fix) rather than reading the shared global. Shared design-system components introduced: `ScoreCard` (enforces driver/basis props, §3), `OpportunityCard`, `PulseItemCard`, `MentorCard`, `ConsentModal`, `EvidenceSourceBadge`. Per-card error boundaries on every Home/Career/Skills section (direct lesson from this session's blank-page incident).

---

## 18. QA and Acceptance Criteria

Representative acceptance criteria (pattern to be applied per screen in §5):

**Home — Today's Priority:** Given a user with an overdue Weekly Skill Pulse and no other higher-priority pending action, when Home loads, then exactly one priority card renders with the Pulse action, and clicking its CTA navigates directly into the Pulse-taking flow with the correct pulse id.

**Company Review — anonymity:** Given fewer than 5 published reviews exist for a company+role-family+period, when any user (including a company admin) queries that aggregate, then the API returns `"insufficient_sample"` and never returns partial category scores or reviewer-adjacent metadata.

**Mentor booking — idempotency:** Given a booking POST is retried with the same Idempotency-Key after a network timeout, when the server processes the retry, then exactly one booking and one payment charge are created, not two.

Test types and scope:
- Unit: decay formula, matching-score computation, consent-expiry checks, k-anonymity threshold logic.
- API: every endpoint in §13, including negative/permission-denied cases.
- Integration: resume-upload → Skill Graph population → Skill Pulse question selection (an existing real chain, now with more consumers).
- E2E: mentor application → approval → booking → session → payout; joining-review eligibility → submission → aggregation → publication-gated display.
- Accessibility: WCAG 2.2 AA automated (axe) + manual keyboard-only pass on Weekly Skill Pulse and Booking flow specifically (highest-interaction surfaces).
- Security: RLS policy tests per table, webhook signature-bypass attempts, consent-bypass attempts on company-facing endpoints.
- Performance: Home load p95 < 1.5s server-side aggregation, Pulse-taking flow interaction latency < 150ms per question transition.
- Payment/webhook: signature validation, idempotency replay, chargeback simulation.
- Role/permission: matrix test across all 12 roles in §14.1 against all new endpoints.
- Privacy/anonymity: automated check that no API response below the k-anonymity threshold includes `sample_size` fields that could be back-calculated to identify a reviewer.
- Moderation: flagged-content SLA escalation timer test.
- Notification: quiet-hours suppression test, digest batching test.
- Data migration: run against a staging copy of production data before every schema-changing deploy (§20).
- Rollback: every migration ships with a tested down-migration; feature-flag rollback tested in staging before each production flag flip.

---

## 19. Deployment, Observability, and Rollback Plan

**Environments:** local → development → staging → production (staging is a full mirror of production Supabase schema via branching, already available per the connected Supabase MCP tooling).

**Feature flags:** every new module (Company, Mentor marketplace, Company Reviews, Career Replay, restructured Skills/Career nav) ships behind a flag, enabling staged cohort rollout rather than a single cutover.

**Migration plan:** additive-only migrations (no destructive changes to `profiles`/`user_skills`/`weekly_pulses`), applied via the existing Supabase migration tooling, run first against a branch, validated, then merged to production.

**Rollout plan:** internal team → 5% of professional-path users → 25% → 100%, gated on error-rate and completion-rate thresholds at each stage.

**Rollback plan:** flag-off is the primary rollback lever (instant, no deploy needed); schema rollback only if a migration itself is defective, via tested down-migrations.

**Monitoring:** dashboards for API error rate/latency per endpoint group (§13), Weekly Pulse completion rate, mentor booking funnel conversion, payout success rate, moderation queue depth, consent-grant/revoke volume. Alerts: payment webhook failure rate > 1%, RLS-policy-violation attempts (should be zero — any nonzero triggers a page), moderation SLA breach.

**SLOs:** Home p95 latency < 1.5s, API availability 99.9%, payout processing success 99.5%.

**Backup/DR:** existing Supabase automated backups + explicit quarterly restore-test exercise, documented runbook.

**Incident response:** severity matrix (payment failures = Sev1, review-anonymity breach = Sev1, single-module outage = Sev2), on-call rotation, postmortem template.

---

## 20. Migration Approach from the Current Live Product

This section is deliberately concrete about the *exact* delta from what is live today, since Capabilio already shipped several redesign passes this session that this blueprint must reconcile with, not contradict.

| Current live state | Target state in this blueprint | Migration step |
|---|---|---|
| Nav: Home / Launchpad / Pulse / Connect / Profile (5 items; Career & Skills content consolidated into Profile tabs earlier this session) | Nav: Home / Career / Skills / Launchpad / Pulse / Connect / Company / Profile (8 items) | Re-extract "Career & Vault" and "Skills"/"Skill Graph Pro" content out of Profile into standalone top-level Career and Skills pages; add new Company page. This reverses the just-shipped Profile-tab consolidation — do this deliberately and in one migration, not incrementally, to avoid a third round of nav churn for users. |
| Global `activeTab` state in `App.jsx` shared across pages (root cause of a just-fixed production bug) | Each module owns its own tab state | Implement the local-tab-state pattern (§4.3) as part of the same PR that splits Career/Skills back out — do not ship the nav split without this fix, or the same class of bug recurs in the new module boundaries. |
| `user_skills` + `SkillGraphView` (fixed this session: correct field names, working radar, auto-detected Skill Gap Analysis) | Skills module built directly on this, extended with per-skill detail + decay views | No rework of the base component; extend only. |
| `weeklyPulse.js` (5 questions) | 15-question Weekly Skill Pulse with formal question bank | Extend question count and add `question_bank`/`question_report` tables; keep existing generation path as fallback until the reviewed bank has sufficient coverage per skill domain. |
| `mentorHub.js` (stub, references nonexistent tables) | Full mentor marketplace on new tables (§12) | Full rebuild; do not attempt to patch the existing stub — confirmed via prior audit that its target tables were never migrated. |
| `forge.js`, `orbitPlans.js` (same class of issue — reference nonexistent tables) | Out of scope for this blueprint, flagged for a separate remediation pass | Explicitly note as pre-existing technical debt, not silently left unaddressed — schedule as a follow-on workstream. |
| No Company module, no Company Reviews | New (§9, §10) | Fully additive; zero migration risk to existing data. |
| `profiles.target_role`/`headline` mapping bug (fixed this session) and resume-import gaps (education, cert shape — fixed this session) | Career/Promotions and Profile/Documents build on the now-correct data | No further migration needed; already corrected. |
| Arena/ELO-coupled content removed from Professional-path Profile (fixed this session) | Career Health uses the same explainable-indicator pattern already established when Arena content was stripped | Extend that pattern module-wide rather than reintroducing raw scores anywhere. |

---

## 21. Final Launch-Readiness Checklist

- [ ] Nav split (Career/Skills out of Profile, Company added) shipped behind a feature flag, local-tab-state fix included in the same PR.
- [ ] All new tables created via additive migration, RLS enabled, staging-validated.
- [ ] Company Review anonymity threshold (k≥5) enforced at the query layer, tested against direct API probing, not just UI hiding.
- [ ] Mentor marketplace: Razorpay Route sandbox tested end-to-end (application → payout), webhook signature verification live.
- [ ] Weekly Skill Pulse question bank has at least 30 approved questions per top-10 most common skill before the 15-question rollout flips on for a user.
- [ ] AI Coach grounding strip ("Based on:") present on 100% of responses in staging QA pass; no-guaranteed-outcome language check passed on a sampled prompt-response audit.
- [ ] Consent ledger UI live in Profile → Privacy & Sharing before any Company/Mentor/Launchpad feature that reads it goes to 100% rollout.
- [ ] Per-card error boundaries verified on Home/Career/Skills (regression guard against the blank-page class of bug fixed this session).
- [ ] Accessibility pass (axe automated + manual keyboard pass on Pulse-taking and Booking flows) complete.
- [ ] Payment webhook idempotency and reconciliation job verified in staging with simulated duplicate events.
- [ ] Rollback rehearsal completed: flag-off tested for every new module, one migration's down-script executed against a staging snapshot.
- [ ] Monitoring dashboards and alert thresholds (§19) live before 5%-cohort rollout begins.
- [ ] Legal/compliance sign-off on DPDP-aligned consent and review-anonymity language before Company Reviews leaves staging.
