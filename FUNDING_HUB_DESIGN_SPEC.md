# Funding Hub — Design Spec

Sub-spec of `EXECUTIVE_PATH_DESIGN_SYSTEM.md`, Module 5 (Funding Hub), expanded to full screen-by-screen depth. Sibling document to `STARTUP_WORKSPACE_DESIGN_SPEC.md` — inherits the same global shell, tokens, and empty/loading/accessibility conventions defined there in §1; this document does not repeat them, only calls out where Funding Hub needs something additional.

Design-spec only, per explicit instruction — no frontend code in this pass.

## 0.1 Positioning

Funding Hub is the operating system for one specific, high-stakes workflow: raising money without losing control of the process to spreadsheets, forwarded email threads, and a Notion doc nobody updates. It is not an investor directory (Crunchbase), not a network to browse (AngelList), not a sales pipeline repurposed for equity (CRM). Every screen should answer a founder's actual question in the moment — "who should I talk to," "where does this deal stand," "what does this investor need from me next" — rather than presenting a database to browse.

Same visual language as Startup Workspace: `#F59E0B` accent, DM Sans/DM Mono, white surfaces, hairline borders, 16–20px radii, restrained shadows, 150–250ms motion. One addition specific to Funding Hub: a second, quieter semantic color for money/progress states — a deep green (`#0F7B4D`) used only for "Committed"/"Closed" amounts and progress fills, never decorative. Radar charts and gauge/speedometer widgets are explicitly avoided — they're the visual cliché of fundraising dashboards; progress is shown as horizontal bars and simple line trends instead.

## 0.2 Data reality check — read before implementing anything below

Nothing in this list exists today. This is the least-built module in the whole Executive Path — it needs the most new schema of any module spec'd so far, and touches the most sensitive data (cap tables, NDAs, financials), so it should be built last and reviewed hardest.

| New table | Purpose |
|---|---|
| `funding_rounds` | startup_id, stage, target_amount, committed_amount, closed_amount, opens_at, target_close_date, status |
| `investors` | name, type (Angel/VC/Corporate VC/Government Fund/Family Office/etc.), bio, thesis, fund_size, check_size_min/max, preferred_industries[], preferred_stages[], countries[], is_verified |
| `investor_portfolio_entries` | investor_id, company_name (or startup_id if on-platform), stage_at_investment, outcome (active/exited/written-off) |
| `investor_matches` | startup_id, investor_id, compatibility_score, match_reasons (jsonb), status (suggested/saved/ignored/intro_requested) |
| `investor_pipeline` | startup_id, investor_id, funding_round_id, pipeline_stage (Prospects→Archived enum), notes, next_action, next_action_date |
| `pitch_rooms` | startup_id, funding_round_id, content refs (deck/video/financials — likely FKs into `startup_documents` from the Startup Workspace spec rather than duplicating), is_published |
| `pitch_room_visits` | pitch_room_id, investor_id, viewed_at, time_spent_seconds, slides_viewed[], downloaded, shared |
| `investor_interactions` | pitch_room_id, investor_id, type (comment/question/document_request/meeting_request/save/follow/demo_request/interest), content, created_at |
| `deal_rooms` | funding_round_id, investor_id (nullable until an investor is granted access), status |
| `deal_room_documents` | deal_room_id, category (NDA/Financials/Cap Table/Legal/Compliance/IP/Patents/Contracts/References/Audit), version, uploaded_by |
| `deal_room_permissions` | deal_room_id, user_id, access_level |
| `funding_meetings` | funding_round_id, investor_id, scheduled_at, notes, recording_url, action_items (jsonb), ai_summary |
| `due_diligence_checklists` | funding_round_id, category, item, status (missing/in_progress/complete), ai_flagged |
| `cap_table_entries` | startup_id, holder_name, holder_type (founder/employee/investor), share_class, shares, percentage, as_of_date |
| `investor_updates` | startup_id, title, body, category (revenue/customers/launch/hiring/award/press/milestone/fundraising), published_at, recipient_investor_ids[] |

No table currently in the database (`companies`, `company_ratings`, `org_opportunities`) is a fit for reuse here — `companies` is the employer-verification table used by the recruiter/hiring side of the app and is a different entity model entirely (EPFO-linked employer records, not investor entities). Funding Hub genuinely starts from zero.

Given the size of this gap, the phasing in §16 below front-loads the two or three screens that are useful even with a handful of manually-seeded investor records, and pushes Deal Room / Due Diligence / Cap Table — the modules where getting the permission model wrong is a real legal and trust problem — to the end, after the lower-stakes modules have proven the data model out.

## 1. Funding Dashboard

CEO-level, not investor-level — this is the founder's command view of their own raise. Layout: a hero progress card at top (Current Funding Stage badge, Target Raise vs. Amount Committed vs. Amount Closed as a single horizontal stacked bar in the green/amber palette — deep green for closed, amber for committed-not-closed, hairline outline for the remaining gap to target), then a 2-column grid below: left column is pipeline-shaped (Interested Investors count, Active Conversations count, Upcoming Meetings list, Due Diligence Status per active deal), right column is guidance-shaped (AI Funding Readiness — a qualitative readiness read tied to real inputs: pitch room completeness, deck upload present, financial model present, cap table logged — not a fabricated score; Fundraising Timeline mini-view linking to the Startup Timeline's funding stages; Tasks; Recent Activity feed from `investor_interactions`; Opportunity Radar reused from Executive Home, scoped to funding-relevant signals like "government innovation grants" if that data source is ever added; AI Recommendations in the same dismissible-chip pattern as Startup Workspace's Dashboard).

## 2. Investor Discovery

Search-first screen: a persistent filter rail (left, collapsible) with the full filter set (Industry, Investment Stage, Sector, Country, City, Check Size range slider, Portfolio keyword, Investment Thesis keyword, Open to Pitch toggle, Average Response Time, Recent Investments window, Investor Type chips: Lead/Co-investor/Strategic/Corporate VC/Angel/Government Fund/Family Office) and a result list (right) of investor cards. Each card: photo, name, type badge, Match Score (only shown once `investor_matches` has been computed for this startup — otherwise the card simply omits the score rather than showing a placeholder), one-line thesis, portfolio logos (small, max 5 + "and N more"), Success Rate, Average Ticket Size, Mutual Connections (computed from `connections`/`follows` overlap — genuinely real once both sides exist on-platform). Results default-sorted by Match Score when available, else by recent activity.

## 3. AI Matchmaking

A distinct, curated feed — not the same UI as search results, because this is "AI brought this to you" rather than "you went looking." Card-per-investor, larger than search-result cards, each expandable to show the compatibility breakdown: Portfolio Synergy, Industry Fit, Funding Stage Fit, Technology Alignment, Geographic Alignment, Founder Similarity, Recent Investments, Warm Introduction Possibility — each rendered as a labeled bar (0–100%), plus a one-line "Why they match" summary and a "Suggested Approach" note. Four actions per card: Accept (moves to `investor_pipeline` as Prospects), Ignore (dismisses, feeds back into the matching signal), Save (bookmarks without committing to pipeline), Request Introduction (only enabled when Warm Introduction Possibility is non-zero — triggers a request through whatever mutual connection was identified, not a cold outreach).

## 4. Investor Profile

Single scroll, structured like a premium editorial page rather than a form-filled directory listing: Biography, Investment Thesis (pulled out as a highlighted pull-quote block, not buried in prose), Portfolio (logo grid, each linking to a mini-case-card: stage invested, outcome), Team (small avatar row for multi-partner funds), Fund Size, Investment Stages + Preferred Industries (chip rows), Average Ticket Size, Recent Deals, Successful Exits, Open Opportunities (if the investor is actively soliciting applications), Speaking Engagements/Publications (external links, light treatment), Community Activity (posts, reusing the same feed-card pattern from Executive Home's Executive Feed if investors are modeled as platform users rather than static directory entries — a modeling decision that should be made explicitly before building this, since it changes whether `investors` rows are linked to `profiles.id`), Followers count.

## 5. Investor CRM

Kanban pipeline, same interaction pattern as Startup Workspace's Customers pipeline for consistency (Prospects → Contacted → Interested → Meeting Scheduled → Due Diligence → Negotiation → Committed → Closed → Archived), one card per `investor_pipeline` row. Card-click opens a detail panel, not a new page: Notes (freeform, timestamped), Next Action + due date (surfaces on the Dashboard's Tasks widget), Timeline (auto-built from `investor_interactions`/`funding_meetings`/document-share events — not manually maintained), Meetings list, Emails (if email integration ever exists — otherwise "Coming soon, connect your inbox"), Files Shared, AI Summary (a short, regenerable "where this relationship stands" paragraph, explicitly AI-generated and labeled as such), Relationship History.

## 6. Pitch Room

Founder-authored, investor-facing microsite-within-the-app. Builder view (founder side) is a section-by-section editor mirroring the content list (Startup Overview, Pitch Deck, Founder Video, Demo Video, Product Screenshots, Business Model, Traction, Financial Model, Roadmap, Market Analysis, Competition, Investment Ask, Use of Funds, Milestones) — each section togglable on/off for a given investor audience, since not every investor needs to see the full financial model on first pass. Viewer view (investor side) is a clean, single-scroll reading experience with a slide-deck-style progression for the pitch deck section specifically. Every visit writes a `pitch_room_visits` row; the founder-side Analytics tab on this screen (Views, Time Spent, Slides Viewed, Downloads, Shares, Questions Asked) reads directly from that table — this is one of the few Funding Hub screens with genuinely straightforward, fully real analytics from day one, since visit tracking has no dependency on anything else being built first.

## 7. Investor Interactions

Not a separate screen — a persistent side panel/drawer available from within Pitch Room and Investor Profile, so an investor can Comment, Ask Questions, Request Documents, Book Meeting, Invite Team, Save Startup, Follow Startup, Request Demo, and Express Interest without leaving the content they're reading. Each action writes to `investor_interactions` and, where relevant, updates `investor_pipeline` status automatically (e.g., "Express Interest" moves a Prospects-stage row to Interested) — the founder should never have to manually reconcile "an investor said they're interested" with the CRM state.

## 8. Deal Room

The highest-scrutiny screen in the entire Executive Path, because it's the first place real financial and legal documents live behind a permission boundary. Layout: folder-first document vault (NDA, Financial Statements, Cap Table, Legal Documents, Shareholder Agreements, Compliance, IP/Patents, Contracts, Customer References, Audit Reports) with an explicit, visible permissions strip at the top of every deal room ("Visible to: [investor name/avatar], granted [date], by [founder name]") so there is never ambiguity about who can see what. Version History is per-document, not per-room. Activity Log is the ground truth for "who viewed what, when" — shown as a simple reverse-chronological list, not buried in a separate analytics tab, because in a deal room the activity log is itself the trust signal founders and investors both care about.

## 9. Meetings

Schedule Meetings + Invite Team as a standard scheduling modal (reuses whatever calendar integration exists elsewhere in the app — flagged in the data-reality note above that none currently does, so this ships as "connect your calendar" until that exists). Each meeting record supports Meeting Notes (freeform, founder or team-authored), Recording (link/embed if a recording exists), Action Items (checklist, feeds Tasks on the Dashboard), AI Meeting Summary (generated from notes/recording transcript, clearly labeled AI-generated), Follow-up Tasks (auto-suggested from the AI summary, founder confirms before they're added — never silently created).

## 10. Due Diligence

A checklist-first screen, one checklist per active `funding_rounds` row, grouped by category (Legal, Financial, Technology, Security, Product, Customers, Operations, Team, Compliance, Documents). Each item: status (Missing/In Progress/Complete), linked document if applicable, and an "AI flagged" indicator for items the AI has proactively noticed are commonly requested but not yet present for this stage/industry — shown as a gentle nudge, not a red alarm. Progress tracker at the top is a simple percentage-complete bar per category, not an overall single number (categories genuinely progress at different rates and collapsing them into one score would hide that).

## 11. Funding Analytics

Aggregation layer over Pitch Room + Investor CRM data — Investor Views, Pitch Opens, Deck Completion Rate, Meeting Rate, Response Rate, Conversion Funnel (Prospects→Closed, shown as a real funnel chart — the one place in this whole spec where a funnel visualization earns its keep, because it's literally modeling the pipeline stages 1:1), Funding Pipeline (value-weighted view of `investor_pipeline`), Average Response Time, Investor Interest Score (composite of interactions + time spent, computed transparently from real events, never estimated).

## 12. Portfolio

Only relevant post-investment — this screen should be entirely hidden/empty-stated until a `funding_rounds` row reaches Closed status. Once real: Investors (who actually invested, from `cap_table_entries` where holder_type='investor'), Rounds (history from `funding_rounds`), Valuation (last logged value, with source/date shown — never silently extrapolated), Equity + Cap Table Summary (from `cap_table_entries`, rendered as a simple ownership breakdown bar, not a full spreadsheet — link out to a dedicated cap table view for the detailed grid), Investment History, Board Members (cross-references Team module's Board Members role), Milestones (cross-references Startup Timeline), Portfolio Updates (this founder's own `investor_updates` history, i.e., what they've published outward).

## 13. Investor Updates

Founder-authored update composer (title, category chip: Revenue Growth/New Customers/Product Launch/Hiring/Awards/Press/Milestones/Fundraising Progress, body) with a recipient picker (all committed/closed investors by default, adjustable). Published updates render as a clean timeline, both on the founder's side and — if investors are modeled as platform users — on the investor's own feed. This is the one place a LinkedIn-style "update post" pattern is actually appropriate, because the audience and intent (structured investor reporting) genuinely calls for it — the distinction from a social feed is that recipients are explicit and the categories are fixed, not freeform social content.

## 14. Document Center

Same pattern as Startup Workspace's Documents module (folder-first, AI search, version control) but scoped specifically to fundraising-relevant categories (Pitch Decks, Financial Models, Legal Documents, Contracts, Reports, Meeting Notes, Data Room Files) and cross-linked from Deal Room and Pitch Room rather than being a fourth separate document system — there should be exactly one document storage layer (`vault_documents`/`startup_documents` from the Startup Workspace spec) with different scoped views on top, not parallel vaults per module.

## 15. AI Fundraising Assistant

Same `CopilotWidget` instance used across the whole Executive Path, given fundraising-specific context (current round, committed amount, pipeline stage distribution, latest due-diligence gaps) when opened from within Funding Hub. Suggested prompts specific to this context: Find seed investors for AI startups · Review my fundraising strategy · Improve my pitch · Generate investor emails · Prepare for VC meeting · Summarize investor feedback · Predict fundraising bottlenecks · Create follow-up plan · Review valuation assumptions. "Predict fundraising bottlenecks" and "Review valuation assumptions" both carry an explicit AI-generated/verify-independently footnote, same convention as the Venture Intelligence Report — this is the module where an overconfident AI answer could most directly cost a founder real money or a real relationship.

## 16. Implementation phasing (recommended order)

1. `investors` (seed manually with a small curated set) + Investor Discovery search — provides immediate value with no dependency on any founder having raised anything yet.
2. Investor Profile — thin layer over the same `investors` table.
3. Pitch Room + `pitch_room_visits` — self-contained, real analytics from day one, no CRM dependency.
4. Investor Interactions panel — depends only on Pitch Room existing.
5. `investor_pipeline` + Investor CRM Kanban — the interactions above start feeding this automatically once it exists.
6. Funding Dashboard + Funding Analytics — aggregation layers, naturally come after the data they aggregate exists.
7. AI Matchmaking (`investor_matches`) — needs enough real investor + startup data on both sides for match scoring to mean anything; shipping this too early risks fabricated-looking scores.
8. Meetings + Due Diligence — moderate complexity, no sensitive-document exposure yet.
9. Deal Room + `cap_table_entries` + permissions model — deliberately last. Legal/financial document exposure needs its own dedicated security review before any UI work starts, independent of this design spec.
10. Portfolio + Investor Updates — only meaningful once #9 has produced at least one real Closed round.
