# Startup Workspace — Design Spec

Sub-spec of `EXECUTIVE_PATH_DESIGN_SYSTEM.md`, Module 2 (Startup Workspace) and Module 3 (Idea Lab), expanded to full screen-by-screen depth per request. This is a design blueprint, not shipped code — see §0.2 for what would need to exist in the database before any of this is buildable.

## 0.1 Positioning

Startup Workspace is not a CRM, not a Notion clone, not a profile page. It is the operating system a founder runs their company through: one idea becomes one workspace, and every later section (Team, Customers, Hiring, Documents, Analytics, Timeline) hangs off that same workspace record. The tell for every screen in this spec: if it would look at home in HubSpot or LinkedIn, redesign it. If it would look at home in Linear or Stripe Dashboard, keep it.

Visual language carries over from the Executive Path system: `#F59E0B` (amber/gold) as the single accent, DM Sans for UI text, DM Mono for numbers/timestamps/labels, white surfaces, 1px hairline borders at `rgba(0,0,0,0.06)`, 16–20px radii, no drop shadows heavier than `0 1px 3px rgba(0,0,0,0.04)`. Motion is 150–250ms ease, feedback-only — nothing choreographed that delays reading real data.

## 0.2 Data reality check — read before implementing anything below

No table in this list exists today. Building any screen below for real starts with a migration, not a component.

| New table (would need to be created) | Purpose |
|---|---|
| `startups` | One row per workspace: name, one-liner, industry, stage, founder_id (→ profiles), created_at |
| `startup_ideas` | Idea Lab submissions: title, problem, solution, industry, target_audience, market_size, business_model, competitive_advantage, revenue_model, tech_stack, patent_status, impact, video_url, status |
| `startup_documents` | Pitch deck, demo video, prototype, financial model, research doc references (or reuse `vault_documents` with a `startup_id` column added — see below) |
| `idea_reviews` | One row per reviewer response: idea_id, reviewer_id, scores (jsonb per metric), comments, confidence |
| `review_cycles` | idea_id, duration_days, audience_types[], opens_at, closes_at, status |
| `review_assignments` | review_cycle_id, reviewer_id, invited_at, responded_at |
| `venture_intelligence_reports` | idea_id, generated_at, all report sections as structured jsonb, model/version used |
| `startup_milestones` | startup_id, stage (Idea→IPO enum), reached_at, notes |
| `startup_team_members` | startup_id, user_id or invited_email, role, permissions, status |
| `startup_customers` | startup_id, name, stage (lead/meeting/contract/customer), value, health |
| `startup_customer_feedback` | customer_id, note, sentiment, created_at |

| Reusable existing table | How it plugs in |
|---|---|
| `jobs` / `job_applications` | Hiring section's "Create Jobs" / "Review Applicants" — likely add a `startup_id` column to `jobs` rather than building a parallel jobs system |
| `vault_documents` | Documents module — likely add `startup_id` + `folder` columns rather than a new table |
| `org_opportunities` | Currently unused anywhere in the app — worth evaluating for Partner Hub / investor-interest tracking before adding yet another table |
| `profiles` | Founder identity, ELO, verification — Team module's "Founders" rows |
| `notifications` | Real backing for "Recent Notifications" widget on the Dashboard |

Everything in the screen specs below assumes these tables exist. Where a widget shows a number, the spec states which table it reads from — if a table doesn't exist yet, the spec says "empty state until `<table>` exists," not a placeholder number.

## 1. Global shell (applies to every screen)

**Sidebar** (persistent, 240px, collapsible to 64px icon rail): Dashboard · Idea Lab · Venture Intelligence · Team · Customers · Hiring · Documents · Analytics · Timeline · AI Assistant · Settings. Active item: amber left-rail indicator (3px) + amber-tinted background (`rgba(245,158,11,0.08)`), no filled pill (Linear-style, not LinkedIn-style). Below the nav list, a compact workspace switcher if the founder has more than one startup (avatar-stack style, not a dropdown wall of logos).

**Header** (56px, sticky): breadcrumb-style workspace name + stage badge (left), global search (⌘K, searches ideas/documents/team — AI-assisted, see §4), notification bell with unread dot (real, from `notifications`), founder avatar menu (right). No hamburger clutter, no top-nav mega-menu.

**Content canvas**: max-width 1120px centered on large screens, full-bleed on mobile, 24px outer padding. Section headers are 13px/700/uppercase-tracked in `ink2`, matching the Executive Home convention already shipped.

**Empty states** (system-wide convention): icon (28px, 60% opacity) + one sentence stating what's missing + a single primary action. Never a chart with zeroed-out fake data — an empty chart area shows the empty-state block instead of axes with no series.

**Loading states**: skeleton blocks matching the exact shape of the real card/row (not spinners) for anything reading from Supabase; a lightweight shimmer, 800ms, no bounce.

**Micro-interactions**: 150ms border-color/background transitions on hover for cards and nav items; buttons get a 1px inset shadow on active press, no scale-bounce; toasts for background actions (invite sent, document uploaded) slide up from bottom-right and auto-dismiss at 4s.

**Responsive**: sidebar collapses to icon rail under 1024px, then to a bottom tab bar (5 primary items + "More") under 640px. Dashboard grid drops from 3-col → 2-col → 1-col at the same breakpoints. Tables (Customers, Team, Hiring pipelines) become stacked cards below 640px rather than horizontally scrolling grids.

**Accessibility**: all interactive elements keyboard-reachable in DOM order matching visual order; focus ring is a 2px amber outline offset 2px (never removed, never color-only); every icon-only button carries an `aria-label`; charts pair color with a text/pattern legend (no color-only encoding); minimum touch target 40×40px on the mobile tab bar.

## 2. Dashboard

**Layout**: 3-column responsive grid. Row 1 (full-width): AI daily summary strip — "What should I focus on today?" rendered as a single card with 2–4 bullet-style AI recommendations, each with a one-click action (Review this document / Reply to this investor / Update this milestone). This is the one screen where AI output is allowed to be prescriptive rather than just descriptive, because it's explicitly framed as a suggestion the founder can dismiss.

**Widgets** (each a Card, each states its real source):
- Startup Health Score — composite indicator (0–100), real only once enough underlying signals exist (milestones hit, team size, customer count, document completeness); until then, shows "Not enough signal yet — health score unlocks once you've logged your first milestone" rather than a fabricated score.
- Funding Stage — pill from `startups.stage`, tied to the same Idea→IPO enum as the Timeline module.
- Revenue / Runway — from `startup_customers`/finance fields once they exist; empty state today.
- Customer Growth — sparkline from `startup_customers` created_at counts over time.
- Hiring Status — count of open `jobs` rows scoped to this `startup_id`.
- Investor Activity — from `venture_intelligence_reports`/`review_assignments` (reviewer responses tagged "Verified Investor").
- Pending Tasks — derived, not a new table: overdue milestone updates, unread team invites, unresponded review cycle.
- Recent Documents — last 5 from `startup_documents`/`vault_documents`.
- Recent Meetings / Founder Calendar — out of scope until a calendar integration exists; shown as "Coming soon — connect a calendar" card, not fake meeting rows.
- Upcoming Events — reuses `org_events` with `type='event'` (schema already supports this, just unused today).
- Opportunity Radar — same real jobs-table widget already shipped on Executive Home, scoped to the startup's domain.

## 3. Idea Lab

This is a structured intake system, not a notes page. Two views: **Idea List** (grid of idea cards — title, industry badge, status pill: Draft / In Review / Reviewed / Archived) and **Idea Detail / Create**.

**Create flow** — a guided multi-step form (not one long scroll): Step 1 Basics (title, problem statement, solution), Step 2 Market (industry, target audience, market size, business model, competitive advantage, revenue model), Step 3 Technology (tech stack, patent status), Step 4 Impact, Step 5 Uploads (pitch deck, demo video, prototype, financial model, research docs — drag-and-drop tiles, one per artifact type, each showing upload progress), Step 6 Founder Video — a guided 2-minute recording UI (record/re-record/preview, waveform while recording, matches the calm aesthetic of the rest of the app rather than a consumer video-app look). Each step is skippable except Basics; progress shown as a thin top progress bar, not numbered circles (Stripe Checkout style).

**AI Components on this screen**: as the founder types the problem statement, an inline AI hint chip can suggest sharpening language (opt-in, dismissible, never auto-applied).

## 4. AI Initial Review

Appears immediately after submission, before any human review cycle starts. Single-column report card layout: each dimension (Problem clarity, Innovation, Competition, Technology feasibility, Market opportunity, Business model, Risks, Patent potential, Execution complexity, Commercial readiness) gets its own row — icon, one-line AI verdict, expandable detail. No numeric score at this stage (numeric scoring belongs to human Review Metrics in §6) — this is qualitative, clearly labeled "AI first pass," to avoid the AI verdict being mistaken for a human/investor judgment.

## 5. Review Cycle

**Setup**: duration picker (3/5/7/14 days) as a segmented control, not a dropdown. Audience picker as multi-select chips: Verified Investors, Experienced Founders, Mentors, Incubators, Accelerators, Industry Experts, Government Innovation Experts. Summary card before confirming: "X reviewers will be invited, cycle closes on [date]."

**Reviewer experience** (separate, minimal surface — this is the 5-minute flow, so it gets its own distraction-free layout, not the founder's sidebar/header shell): idea summary at top, then the scoring form from §6, single "Submit Review" button, no navigation chrome at all.

**Founder-side tracking**: a simple progress bar (X of Y invited reviewers responded) plus a list of responded reviewers (anonymized handle, not full identity, until the founder has enough responses to see aggregates — protects reviewers from individual backlash).

## 6. Review Metrics

Each reviewer scores 10 dimensions (Innovation, Problem Importance, Market Opportunity, Execution Potential, Technology, Commercial Potential, Scalability, Investment Interest, Government Alignment, Social Impact) on a 1–5 scale using a segmented control (not a star-rating widget — stars read as consumer/social, segmented numeric controls read as professional evaluation). Each dimension also has an optional comment field and a confidence-level toggle (Low/Medium/High). Founder-facing aggregate view shows the mean + spread (min–max) per dimension as a horizontal bar, not a radar chart (radar charts are the one visualization pattern to avoid — reads as generic "startup scorecard" cliché).

## 7. Venture Intelligence Report

The showpiece document. Rendered as a long-form, single-scroll report with a sticky in-page table of contents on the left (desktop) collapsing to a top dropdown on mobile. Sections, in order: Executive Summary, Overall Venture Intelligence (a single composite badge, not a score out of nowhere — computed transparently from Review Metrics aggregates), Innovation Analysis, Market Analysis, Competition Analysis, Business Model, Technology Review, Risk Assessment, Investor Readiness, Government Alignment, Patent Opportunity, Grant Eligibility, Commercial Potential, Execution Roadmap, Recommended Improvements, Suggested Mentors/Investors/Incubators/Accelerators/Universities/Government Programs (each as a horizontally-scrollable card row, not a wall of logos), Suggested Timeline, AI Recommendations, Comparison with Similar Startups (a small comparative table, anonymized peer data only — never named competitor startups' private data). Every AI-generated section carries a small "AI-generated — verify independently" footnote, consistent with treating AI output as probabilistic rather than authoritative.

## 8. Startup Timeline

Horizontal stepper on desktop (vertical on mobile) with 12 stages: Idea → Validation → Prototype → MVP → Early Customers → Revenue → Pre-Seed → Seed → Series A → Growth → Global Expansion → IPO/Acquisition. Reached stages filled amber, current stage pulses subtly (opacity breathing, not a spinner), future stages outlined only. Clicking a stage opens a side panel to log the milestone date + notes (writes to `startup_milestones`). An "AI suggests next milestone" chip sits next to the current stage, generated from the venture intelligence report's Execution Roadmap section rather than invented fresh each time.

## 9. Team

Table/card hybrid grouped by role tier (Founders, Employees, Advisors, Mentors, Board Members). Each row: avatar, name, role, permission level (Owner/Admin/Editor/Viewer — reused permission vocabulary, don't invent a new scheme), last active. Invite flow is a single modal: email + role + permission, sends via the existing invite-link pattern already used for company recruiter invites elsewhere in the app (don't build a second invite system). Activity Timeline is a simple reverse-chronological log of role/permission changes and joins — real, small, no engagement-feed styling.

## 10. Customers

Kanban-style pipeline (Leads → Meetings → Contracts → Customers) as the primary view, with Revenue, Feedback, Retention, Renewals, and Health as a secondary tab rather than competing widgets on the same screen (avoids the cluttered "everything at once" HubSpot look). Customer Health shown as a simple 3-state indicator (Healthy/At Risk/Churned) derived from renewal date + feedback sentiment, not a fabricated composite score.

## 11. Hiring

This section is explicitly a thin layer over the existing, real jobs infrastructure — not a new hiring product. Create Jobs/Internships/Challenges reuses the existing job-posting form (add a `startup_id` scoping column to `jobs`); Review Applicants and Interview Pipeline reuse `job_applications`. AI Candidate Ranking is the one genuinely new piece — a score card per applicant next to their application, computed from existing skill/ELO data already in `profiles`, not new data collection. Hiring Analytics is real aggregate counts (applicants, time-to-hire, conversion) over the existing tables — no synthetic benchmarks.

## 12. Documents

Central vault, folder-first (Pitch Deck, Financials, Cap Table, Legal, Patents, Research, Investor Documents, Contracts, Meeting Notes) with an AI search bar at the top that searches document titles/extracted text, not just filenames. List view default (not a grid of thumbnails — founders scanning a cap table don't need thumbnail previews). Reuses `vault_documents` (add `startup_id` + `folder`) rather than a parallel document table, per the data-reality note in §0.2.

## 13. Analytics

Single scroll of real aggregate charts, each sourced from an existing or newly-real table once built: Funding Progress (from `startup_milestones` reaching funding stages), Revenue/Growth/Customer Acquisition (from `startup_customers`), Investor Activity (from `review_assignments`), Hiring (from `jobs`/`job_applications`), Community Growth (from `follows`/`connections` scoped to the founder), Brand Reach and Market Position are explicitly flagged as needing a data source that doesn't exist yet (social/press mention tracking) — shown as "Coming soon," never estimated.

## 14. AI Startup Assistant

Not a separate chat product — this is the same `CopilotWidget` already shipped globally, given startup-context awareness (startup name, stage, latest venture intelligence summary) so its answers to "prepare for investor meeting" or "summarize today's progress" are grounded in real workspace data rather than generic advice. Suggested prompt chips shown at the top of the assistant panel when opened from within Startup Workspace: Review today's priorities · Improve my startup · Review customer feedback · Prepare for investor meeting · Generate fundraising email · Review financial model · Summarize today's progress · Create roadmap.

## 15. Implementation phasing (recommended order)

1. `startups` + `startup_ideas` + Idea Lab create/list flow — smallest self-contained slice, no dependency on anything else.
2. Startup Timeline (`startup_milestones`) — depends only on `startups` existing.
3. Team (`startup_team_members`) — reuses existing invite pattern.
4. Documents (`vault_documents` + `startup_id`/`folder` columns) and Hiring (`jobs` + `startup_id` column) — both are additive columns on existing tables, low risk.
5. Customers (`startup_customers`, `startup_customer_feedback`) — new but self-contained.
6. Review Cycle + Review Metrics (`review_cycles`, `review_assignments`, `idea_reviews`) — needs a reviewer-facing surface and invite/notification logic, meaningfully more complex.
7. Venture Intelligence Report — depends on #6 having real review data to aggregate; this is the module where shipping before data exists would mean fabricating a report, so it must come last among the "AI-heavy" modules.
8. Analytics and Dashboard health score — both are aggregation layers over everything above, so they naturally come last and get more real as earlier phases ship.
