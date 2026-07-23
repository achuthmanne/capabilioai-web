# Executive Intelligence Layer — Design Spec

Sub-spec of `EXECUTIVE_PATH_DESIGN_SYSTEM.md` (Modules 6/7/8/9 — Executive Feed, Opportunity Radar, AI Matchmaking — plus Universal Search/Following/Trending, new additions not in the original 16). Sibling to `STARTUP_WORKSPACE_DESIGN_SPEC.md` and `FUNDING_HUB_DESIGN_SPEC.md` — inherits the same shell, tokens, and empty/loading/accessibility conventions from Startup Workspace §1.

Design-spec only, per explicit instruction — no frontend code in this pass.

## 0.1 Positioning

This layer is the ambient intelligence surface of Executive Path — the thing a founder glances at, not the thing they go work inside (that's Startup Workspace and Funding Hub). The governing test for every screen: would a Bloomberg Terminal user or a Perplexity user recognize this pattern? If a screen would instead feel at home as a LinkedIn timeline scroll, it's wrong — density and signal-per-pixel matter more than engagement-optimized card rhythm. No like-button vanity metrics as the primary visual element; relevance and confidence are the primary visual elements.

Same visual system as the other two specs: `#F59E0B` accent, DM Sans/DM Mono, hairline borders, restrained shadows. One addition here: a small "confidence/relevance" numeric readout (0–100, DM Mono, muted color) appears on nearly every card in this layer — Feed relevance score, Opportunity Radar confidence, Matchmaking compatibility score — and should use one consistent visual treatment app-wide (a small right-aligned number + thin horizontal underline bar) so a user learns the pattern once and reads it everywhere.

## 0.2 Data reality check — read before implementing anything below

This layer has a meaningfully better starting position than Startup Workspace or Funding Hub, because real infrastructure already exists and should be reused, not duplicated.

**Already real — reuse, do not rebuild:**

| Existing table / system | What it already provides |
|---|---|
| `pulse_posts` (+ `post_interactions`, `post_comments`) | A fully-built, already-shipped content system: `post_type`, `media_urls`, `poll_data`, `event_data`, `tech_tags[]`, `role_tags[]`, `visibility`, and engagement counters (`acknowledge_count`, `signal_count`, `comment_count`, `repost_count`, `save_count`). Consumed today by `Pulse.jsx` ("LinkedIn-style professional news feed") via a backend `pulseApi`, not raw Supabase calls. **Executive Feed in this spec is a filtered, re-themed, re-labeled view over this exact same system — not a new content table.** The category list in the brief (Founder Stories, Startup News, Funding News, etc.) maps onto `tech_tags`/`role_tags` filtering, not a new schema. |
| `connections`, `follows` | Following System's "follow people" is already fully real (see Executive Home's Network widget, already shipped). Following startups/investors/universities/topics/technologies is new (see below), but the person-to-person case needs zero new schema. |
| `notifications` | Real backing for "why am I seeing this" / activity-driven feed signals. |
| `leaderboard_cache` | Real per-domain ELO ranking — a legitimate, non-fabricated input to "Trending Founders," though it only covers Arena-participating users, not the whole Executive population, and that limitation should be visible in the UI copy, not hidden. |

**Does not exist — new tables or a real search/AI layer are needed:**

| Gap | What's missing |
|---|---|
| Universal Search | No search endpoint or index exists anywhere in the codebase today. This needs either Postgres full-text search (`tsvector`) across `profiles`/`pulse_posts`/`jobs`/`problems`/future startup tables, or a dedicated search service — a real architectural decision, not just a UI screen. |
| Opportunity Radar (beyond the jobs-signal version already shipped on Executive Home) | Every category listed (Investor interested, Mentor available, Grant eligibility, Accelerator invitation, Government challenge, Board position, etc.) depends on data sources that don't exist yet — most of them are downstream of Funding Hub's `investors`/`investor_matches` tables and Startup Workspace's tables. This module is genuinely an aggregation layer over other specs, not a standalone build. |
| AI Matchmaking (cross-entity: Founder↔Mentor, ↔Co-founder, ↔University, ↔Government, ↔Research Lab, ↔Manufacturer, etc.) | Needs a generalized `intelligence_matches` table (entity_a, entity_b, entity_a_type, entity_b_type, compatibility_score, reasons jsonb, status) — broader than Funding Hub's investor-specific `investor_matches`, which should probably be a specialization of this table rather than a separate one. This is a real design decision worth making before either is built. |
| Following non-person entities (startups, investors, universities, research labs, agencies, topics, technologies, events) | `follows.following_id` today is a `profiles.id` FK — following a topic or technology that isn't a profile needs either a polymorphic follow table or a separate `topic_follows`/`entity_follows` table. |
| Trending Intelligence | Needs aggregation queries over real engagement (`pulse_posts` counters, `follows` growth rate) for the categories that map to existing data (Trending Founders via ELO + follow growth, Trending Discussions via `pulse_posts` engagement) — but categories like Trending Policies, Trending Research, Trending Universities have no source at all today and must ship as "Coming soon," not invented rankings. |

## 1. Executive Feed

Not a rebuild — a new Executive-scoped **view mode** of the existing Pulse system. Concretely: reuse `pulseApi`/`pulse_posts`, add an Executive-specific query filter (role_tags/tech_tags matching the founder's domain, startup stage, and follow graph) and a distinct visual theme (denser card, smaller media treatment, relevance score surfaced) rather than Pulse's current consumer-social card rhythm. Layout: single center column (max 640px, Bloomberg-terminal density rather than Instagram-width single-column), a right rail with a compact "Why am I seeing this" explainer + quick filters (Content Categories as a checklist, not a horizontal pill-scroll — founders scanning a terminal-style feed want checkbox precision, not swipeable chips).

**Feed card anatomy**: Title, one-line AI Summary (not the full post body up front — progressive disclosure, expand on click), Source (attribution — person, publication, or "Capabilio AI" if synthesized), AI Insight (a single sentence of "why this matters to you," distinct from the summary), Relevance Score (the small DM Mono number + underline bar convention from §0.1), then a slim action row: Save, Share, Comment, Bookmark, Ask AI (opens the AI assistant with this card's content pre-loaded as context — real integration with the existing `CopilotWidget`, not a new chat surface), Related Opportunities (only rendered once Opportunity Radar has real data to link to — otherwise omitted, not stubbed).

**Personalization inputs**, stated plainly in a "Personalized based on" disclosure the user can expand (transparency, not a black box): Role, Industry, Startup Stage, Interests, Following graph, Communities, Company, Goals, Previous Activity — each one only listed if it's actually a real signal being used, which today means Role/Industry/Following/Previous Activity are honest, and Communities/Goals should not be listed until those concepts exist as real data.

## 2. Opportunity Radar

Distinct from the compact Opportunity Radar widget already shipped on Executive Home — this is the full dedicated screen, a proactive queue rather than a dashboard widget. Layout: a single reverse-chronological (by recency of AI recommendation, not by deadline) list of opportunity cards, with a left filter rail by category (Investor Interested, Mentor Available, Grant Eligibility, Enterprise Customer, Accelerator Invitation, University Partnership, Government Challenge, Research Collaboration, Speaking Opportunity, Hiring Opportunity, Board Position, Customer Leads, Technology Partner, Distribution Partner, Expansion Opportunity) and urgency (sorted separately, since "urgent" and "recent" are different axes).

**Card anatomy**: category icon + label, headline, "Why AI recommended it" (always present, always specific — never a generic "this matches your profile"), Estimated Impact (High/Medium/Low, qualitative not a fabricated dollar figure unless the underlying data genuinely supports one, e.g. a real funding-round amount), Urgency (visual: a slim colored edge on the card — red/amber/neutral — not a loud badge), Required Action (one clear verb phrase: "Reply to introduce yourself," "Upload your deck," "Confirm availability"), Deadline (if applicable), Confidence (the same DM Mono number convention), single primary Action button that does the actual required action inline where possible (e.g., opens a reply composer) rather than just linking away.

Given the data-reality gap in §0.2, this screen should launch with only the categories that have real backing (today: the jobs-based hiring signal already shipped; as Funding Hub and Startup Workspace tables come online, Investor Interested/Mentor Available/etc. activate one at a time) — the remaining categories appear grayed out in the filter rail with a small "Coming soon" tag rather than being hidden entirely, so founders can see the intended scope without being shown fake results.

## 3. AI Matchmaking

One consistent card pattern reused across every entity-pair type listed (Founder↔Investor, ↔Mentor, ↔Advisor, ↔Co-founder, ↔Enterprise Customer, ↔University, ↔Government, ↔Recruiter, ↔Startup, ↔Research Lab, ↔Manufacturer, ↔Technology Partner, ↔Channel Partner, ↔Media) — the entity type changes, the card shape doesn't, which is what makes this feel like one intelligent system rather than fourteen different features stitched together. Screen layout: a type-switcher segmented control at top (defaulting to whichever type has the most real matches available), then the match feed below.

**Card anatomy**: counterpart's identity block (photo/logo, name, type badge), Compatibility Score (DM Mono + bar), Reasons (short bullet list, 2–4 items max — progressive disclosure hides anything beyond that behind "Show more"), Shared Interests, Mutual Connections (real, from `connections`/`follows` overlap), Previous Activity (if any interaction history exists), Suggested Conversation Starter (AI-generated opening line, editable before sending — never auto-sent), Recommended Next Action, AI Explanation (expandable "why this score" detail, same transparency principle as Funding Hub's matchmaking). Actions: Accept, Ignore, Save, Request Introduction — identical interaction model to Funding Hub's AI Matchmaking for consistency, since founders will use both.

## 4. Universal Search

Single search entry point, ⌘K-invoked overlay (not a separate page) — consistent with the header search already specified in Startup Workspace §1, this is that same search deepened into its own full-screen results mode when the user presses Enter rather than picking a quick-jump result. Results grouped by entity type (People, Startups, Organizations, Universities, Government Programs, Jobs/Internships, Communities, Ideas, Patents, Research, Funding Rounds, Events, Grants, Market Reports, Technology) as labeled sections, most-relevant section expanded by default, others collapsed to a count until clicked — progressive disclosure again, since a flat list of fifteen entity types would be the exact clutter this brief explicitly rejects.

**Per-result anatomy**: profile/entity snippet (photo or icon, name, one-line context), AI Summary (why this result, in plain language), Relationship Graph (a small inline visualization — not a full graph explorer, just "connected via 2 mutuals" or "you both follow X" as a compact chip row), Recommended Actions (Connect/Follow/View/Message, contextual to entity type), Connections count. Given no search index exists today (§0.2), the honest initial-launch version should be scoped to whichever entity types already have queryable tables (`profiles`, `pulse_posts`, `jobs`, `problems`) with the rest of the entity types appearing as "not yet searchable" rather than returning empty silently — a search that quietly returns nothing for a category is worse than one that says so.

## 5. Following System

Two parts: a Following management screen (grouped tabs: People, Startups, Investors, Universities, Communities, Research Labs, Companies, Government Agencies, Topics, Technologies, Industries, Events — each tab a simple list with an unfollow affordance) and an AI "Who to follow" suggestion rail that can live embedded in the Feed's right column rather than needing its own screen. Person-following is real today; every other entity type needs the polymorphic/entity-follow schema work flagged in §0.2 before it's more than a UI shell. Suggested-to-follow cards reuse the same compatibility-score-lite pattern (a lighter version of the Matchmaking card, since "who to follow" is a softer recommendation than "who to match with").

## 6. Trending Intelligence

Explicitly not a hashtag/trending-topics-bar pattern (avoid the Twitter "Trending" sidebar cliché entirely) — instead a dedicated screen laid out as distinct ranked sections (Trending Startups, Trending Founders, Trending Technologies, Trending Industries, Trending Investments, Trending Universities, Trending Research, Trending Policies, Trending Communities, Trending Discussions, Trending Products, Trending AI Topics), each section a horizontally-scrollable row of compact rank cards (rank number in DM Mono, name, one-line "why trending" reason, small sparkline of the underlying metric over the trailing period) rather than one long undifferentiated list. Per §0.2, only Trending Founders (ELO + follow growth) and Trending Discussions (`pulse_posts` engagement velocity) have real data today; the rest render as "Coming soon" sections at the bottom of the screen, clearly separated from the live sections above rather than interleaved.

## 7. Implementation phasing (recommended order)

1. Executive Feed as a themed view over existing `pulse_posts`/`pulseApi` — by far the lowest-effort, highest-leverage item in this entire spec, since the content system already exists and is proven in production via `Pulse.jsx`.
2. Following System, person-only tab — also near-zero new schema, reuses `connections`/`follows` directly.
3. Universal Search, scoped to `profiles`/`pulse_posts`/`jobs`/`problems` only — real value from day one without waiting on Startup Workspace or Funding Hub tables.
4. Trending Intelligence, Founders + Discussions sections only — real data, remaining sections shipped as visible "Coming soon."
5. Entity-follow schema (topics/technologies/startups/etc.) — unlocks the rest of Following System and feeds Trending Intelligence's remaining categories.
6. Opportunity Radar full screen — activates category-by-category as Startup Workspace and Funding Hub tables come online; this module is structurally an aggregator, so it should never be "finished" in one pass, just re-checked each time a new source table ships.
7. Generalized `intelligence_matches` table + AI Matchmaking — deliberately last, since it should absorb/generalize Funding Hub's investor-specific matching rather than shipping as a fourteenth parallel matching system; worth a short design pass reconciling the two specs before either is built.
