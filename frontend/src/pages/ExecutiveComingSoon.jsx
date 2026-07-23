/**
 * ExecutiveComingSoon.jsx — Sprint 5 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14
 *
 * The Founder-OS nav (EXECUTIVE_PATH_INFORMATION_ARCHITECTURE.md) has ten
 * top-level modules. Only Home, Startup, and Network have real data behind
 * them today. Rather than leave Funding/Growth/Communities/Events/
 * Marketplace/Analytics unreachable (or worse, fake their content), each gets
 * a real nav destination with an honest status of what's built vs. planned,
 * citing the design spec section that already covers it in full. This is the
 * same "no fabricated rows" pattern used in ExecutiveNetwork.jsx's Venture
 * Radar / Board Seats / Introductions tabs.
 */
import { EXEC_COLORS as C, Card, EmptyState } from "../components/ExecutiveUI"

const MODULES = {
  funding: {
    icon: "◈",
    title: "Funding Hub",
    sub: "Investor CRM, Pitch Room, Deal Room, and Fundraising Pipeline are fully designed in FUNDING_HUB_DESIGN_SPEC.md, but no investor_matches, deal, or cap-table tables exist yet — nothing fabricated shown here in the meantime.",
  },
  communities: {
    icon: "◫",
    title: "Communities",
    sub: "Founder communities are designed in ECOSYSTEM_LAYER_DESIGN_SPEC.md §1, with org_events identified as a reuse candidate — not wired up yet.",
  },
  events: {
    icon: "◎",
    title: "Events",
    sub: "Executive events (demo days, investor mixers, founder meetups) are designed in ECOSYSTEM_LAYER_DESIGN_SPEC.md §2 — no events table exists yet.",
  },
  marketplace: {
    icon: "◪",
    title: "Marketplace",
    sub: "Service marketplace (advisors, agencies, tools) is designed in ECOSYSTEM_LAYER_DESIGN_SPEC.md §4 — not built yet. Hiring/roles already live in Startup → Hiring, which is real.",
  },
  aicopilot: {
    icon: "✦",
    title: "AI Copilot",
    sub: "A proactive daily founder briefing (runway, investor activity, grant matches) is being designed next — it needs Funding Hub's data model first so it never states a number that isn't real. For now, use the \"Ask Capi\" widget in the corner for direct Q&A.",
  },
}

export default function ExecutiveComingSoon({ module }) {
  const m = MODULES[module] || { icon: "✦", title: "Coming soon", sub: "This module isn't wired up yet." }
  return (
    <div style={{ background: "#F6F6F1", flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 32px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>Executive</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "4px 0 0" }}>{m.title}</h1>
      </div>
      <EmptyState icon={m.icon} title={`${m.title} isn't wired up yet`} sub={m.sub} />
    </div>
  )
}
