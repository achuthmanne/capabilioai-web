# Executive Path — Design System & Rebuild Roadmap

Status: living spec. Replaces the current `authority` path in place (same `profiles.path = 'authority'`, same nav slot). Written after tracing the existing implementation end-to-end — see "Current-state audit" below before reading the module specs, because several things described in the original brief (funding pipelines, deal rooms, venture matching) do not exist in any form today and are being scoped honestly as roadmap, not shipped as fake dashboards.

## 0. Current-state audit (as of 2026-07-23)

This is what actually exists in the codebase and database right now, traced file-by-file and table-by-table before any design work started:

| File | Reality |
|---|---|
| `ExecutiveHome.jsx` | 100% hardcoded arrays (bookings, revenue, requests, insights). Zero Supabase calls. Every number on the page is fake. |
| `AuthorityProfile.jsx` | **Broken in production.** Imports `useState`/`useEffect` only, but the component body calls `doc(db, ...)`, `updateDoc`, `arrayUnion`, `arrayRemove` — Firestore APIs that were never imported (this app runs on Supabase). Follow, Create Post, and Booking Request all throw `ReferenceError` today. |
| `SignalRooms.jsx`, `ExecutiveNetwork.jsx` | 100% hardcoded arrays, zero Supabase calls. Also off-brand: dark navy + a different gold (`#C9A84C`) instead of the canonical Executive accent (`#F59E0B` from `PATH_THEME.authority` in `Onboarding.jsx`). |
| Nav item "Time Market" (`timemarket`) | Actually renders `Launchpad.jsx`, the generic job-board component used elsewhere in the app. It is real and wired to the `jobs` table, but it is not a bookable time/consulting marketplace — the label is aspirational, the component underneath is just the jobs board. |
| `CopilotWidget.jsx` | Real, already mounted globally in `App.jsx` for every non-institution path, authority included (`{user && navPath !== "institution" && <CopilotWidget .../>}`). An AI assistant already exists — it does not need to be rebuilt as part of Executive Home. |
| Database | No tables exist for startups, founders, ideas, pitches, funding rounds, deals, or partners. Real, usable tables: `profiles` (identity/verification/ELO), `org_events` (RLS: `org_id = auth.uid()`, no FK — usable as a personal feed table), `connections` (network + requests), `follows`, `notifications`, `jobs`. |

**Implication for this rebuild:** Executive Home is built for real against `profiles`, `org_events`, `connections`, `follows`, `notifications`, and `jobs`. Every module below that has no backing table is shown as an honest "Coming soon" roadmap card, not a mocked dashboard — consistent with the standing project rule that workstations must be real, never static dummies.

## 1. Design principles

- Reference points: Notion (calm information density), Linear (fast, keyboard-friendly, no chrome), Stripe Dashboard (numbers-first, restrained color), Arc/Perplexity (soft depth, one accent color used sparingly).
- Explicitly not: LinkedIn/Facebook feed patterns, vanity-metric CRM dashboards, gamified startup-directory aesthetics.
- One accent color: `#F59E0B` (amber/gold) — already canonical for this path in `Onboarding.jsx`. `AuthorityProfile.jsx` (indigo) and `SignalRooms`/`ExecutiveNetwork` (navy) should be re-themed to match in a follow-up pass; flagged, not yet done.
- Typography: DM Sans (UI text) + DM Mono (numbers, labels, timestamps) — matches the rest of the app.
- Cards over tables. Generous padding (20–24px). Borders at `rgba(0,0,0,0.05–0.08)`, never heavy dividers.
- Empty states are a first-class design surface, not an afterthought: icon + one sentence of honest explanation + a single clear next action. Never a fabricated number where real data doesn't exist yet.
- Motion: subtle (150–250ms ease), used for hover/focus feedback only — no entrance choreography that delays reading real data.

## 2. Executive Home — "CEO Command Center"

Not a nav page in spirit — it's the landing surface after login, answering "what's true about my Executive presence right now." Sections, top to bottom, and what backs each one:

1. **Greeting + identity strip** — name, headline/authorityType, verification badge. Real (`profiles.display_name`/`name`, `headline`, `authorityType`, `verified`/`verification_state`).
2. **Ask Capi** — a slim card pointing at the existing floating `CopilotWidget` rather than duplicating a chat UI. Real feature, just surfaced contextually.
3. **Today's Focus** — a short, computed checklist (profile incomplete? unverified? unread connection requests? zero posts yet?) — derived from real fields, never invented tasks.
4. **Executive Feed** — the user's own posts, stored in `org_events` with `org_id = auth.uid()`, `type = 'post'`, plus a `category` column (Insight / Milestone / Announcement / Ask). Same pattern already used for Institution/Company posts in `InstitutionOS.jsx`, reused here. Real, with a working Create Post flow (unlike the broken one in `AuthorityProfile.jsx`).
5. **Network & Requests** — pending connection requests (`connections` where `addressee_id = auth.uid()` and `status = 'pending'`) with real Accept/Decline actions; follower/connection counts from `follows`/`connections`. Real.
6. **Opportunity Radar** — honestly scoped to what exists: roles from the real `jobs` table matching the exec's `domain`/`keyword`. Framed as "hiring signal in your domain," not fabricated deal-flow. Full founder/investor matching is Module 8 below — roadmap.
7. **Roadmap modules grid** — Startup Workspace, Idea Lab, Venture Intelligence, Funding Hub, Partner Hub, Marketplace, Brand Studio, Executive Analytics: rendered as clearly labeled "Coming soon" cards with a one-line description of what they'll do. No numbers, no fake charts.
8. **Quick nav** — links to Executive Profile, Network, Signal Rooms, Time Market (jobs board) — each carries its real/mock status honestly in this doc even though the UI itself doesn't need to say "mock" out loud to the user.

## 3. Module specs (roadmap unless marked "Live")

1. **AI Executive Assistant** — Live (`CopilotWidget`). Future: give it Executive-path-specific system prompt context (funding stage, startup name) once Startup Workspace exists.
2. **Startup Workspace** — Roadmap. Needs a `startups` table (name, stage, one-liner, team, links) owned by `profiles.id`.
3. **Idea Lab** — Roadmap. Needs an `ideas` table (title, problem, hypothesis, status: exploring/validating/shelved), private by default.
4. **Venture Intelligence** — Roadmap. Market/competitor intel — likely an AI-generated-on-demand feature rather than a stored table; needs its own data-sourcing design pass.
5. **Funding Hub** — Roadmap. Needs `funding_rounds`, `investor_interest` tables; highest scrutiny module (real money signals) — must not launch with any AI-authored numbers presented as fact.
6. **Executive Feed** — Live, per Home spec above (`org_events`).
7. **Opportunity Radar** — Partially live (`jobs` table today); founder/investor-specific matching is roadmap and needs a dedicated table + matching logic, not a repurposed jobs query long-term.
8. **AI Matchmaking** — Roadmap. Depends on Startup Workspace + Venture Intelligence existing first so matches have real substance to match on.
9. **Communities** — Roadmap. Could reuse `connections`/`follows` plus a new `groups` concept; needs its own scoping pass.
10. **Events** — Roadmap. Could reuse `org_events` with `type='event'` (schema already supports it, unused by Executive path today).
11. **Partner Hub** — Roadmap. Needs a `partnerships`/`org_opportunities`-style table — note `org_opportunities` already exists in the DB but is currently unused; worth investigating reuse before adding a new table.
12. **Marketplace** — Roadmap. Scope undefined — needs its own requirements pass (what's being bought/sold, by whom).
13. **Executive Analytics** — Roadmap. Should aggregate real numbers only (feed engagement from `org_events`/`post_interactions`, network growth from `connections`) — no synthetic KPIs.
14. **Brand Studio** — Roadmap. Likely a thin layer over `profiles` (cover photo, brand colors, tagline) — smallest lift of the unbuilt modules.
15. **Inbox** — Roadmap. `notifications` table exists and is real; a unified inbox view is mostly a UI project, not a new-data project.
16. **Executive Profile** — Live but broken (`AuthorityProfile.jsx` Firebase remnants). Needs its own dedicated fix pass — flagged, not fixed in this rebuild.

## 4. Explicitly out of scope for this pass

Fixing `AuthorityProfile.jsx`'s broken Firebase calls, re-theming `SignalRooms`/`ExecutiveNetwork` to the canonical accent color, and building any of the roadmap modules' backends — these are real, identified gaps but were not requested as part of "build Executive Home for real." Recommended as the next three follow-up tasks in priority order: (1) fix `AuthorityProfile.jsx` since it's actively broken for every executive user today, (2) re-theme the two mock pages, (3) pick one roadmap module (Brand Studio is the smallest) to build first with a real table.
