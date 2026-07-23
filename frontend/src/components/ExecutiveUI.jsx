/**
 * ExecutiveUI.jsx — shared component library for the Executive Path
 *
 * Sprint 0 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §12/§14: every Executive-path
 * page (ExecutiveHome, AuthorityProfile, and every future Startup Workspace /
 * Funding Hub / Ecosystem module) should import these instead of redefining
 * its own local Card/Label/EmptyState. Centralizing them here means the
 * design conventions already written down in STARTUP_WORKSPACE_DESIGN_SPEC.md
 * §1 (empty states, loading states, the DM Mono relevance-score convention)
 * only have to be built once and stay consistent everywhere they're reused.
 *
 * Theme: single canonical Executive accent (#F59E0B), matching
 * Onboarding.jsx's PATH_THEME.authority. Components accept a `color`/`bg`
 * override for the rare case a screen needs a different semantic (e.g. green
 * for a "Committed" funding amount), but default to the canonical accent so
 * visual drift doesn't creep back in page-by-page.
 */

export const EXEC_COLORS = {
  gold:    "#F59E0B",
  goldD:   "#D97706",
  goldL:   "rgba(245,158,11,0.12)",
  goldB:   "rgba(245,158,11,0.28)",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  border:  "rgba(0,0,0,0.06)",
  surface: "#FFFFFF",
  green:   "#10B981",
  greenL:  "rgba(16,185,129,0.12)",
  blue:    "#3B82F6",
  blueL:   "rgba(59,130,246,0.12)",
  red:     "#F43F5E",
  redL:    "rgba(244,63,94,0.10)",
}

/** Base card surface used across every Executive screen. */
export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: EXEC_COLORS.surface, border: `1px solid ${EXEC_COLORS.border}`,
      borderRadius: 16, padding: 20,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      cursor: onClick ? "pointer" : undefined,
      ...style,
    }}>{children}</div>
  )
}

/** Small pill badge — category tags, status labels, "N new" counts. */
export function Label({ children, color = EXEC_COLORS.gold, bg = EXEC_COLORS.goldL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{children}</span>
  )
}

/** Section header with an optional right-aligned text action ("+ Post", "Open Jobs →"). */
export function SectionHead({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: EXEC_COLORS.ink2 }}>{title}</div>
      {action && (
        <button onClick={onAction} style={{ fontSize: 12, color: EXEC_COLORS.goldD, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>{action}</button>
      )}
    </div>
  )
}

/**
 * Honest empty state — icon + one sentence + optional next action.
 * Per every design spec's rule: never fabricate a number or fake row where
 * real data doesn't exist yet; show this instead.
 */
export function EmptyState({ icon = "✦", title, sub, action, onAction }) {
  return (
    <Card style={{ textAlign: "center", padding: "28px 20px" }}>
      <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: EXEC_COLORS.ink2, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: EXEC_COLORS.ink3, lineHeight: 1.6, marginBottom: action ? 12 : 0 }}>{sub}</div>}
      {action && (
        <button onClick={onAction} style={{ padding: "8px 16px", background: EXEC_COLORS.goldL, border: `1px solid ${EXEC_COLORS.goldB}`, borderRadius: 10, color: EXEC_COLORS.goldD, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{action}</button>
      )}
    </Card>
  )
}

/**
 * The DM Mono "number + underline bar" convention used for relevance /
 * compatibility / confidence scores across the Intelligence Layer and
 * Funding Hub specs, so a user learns the pattern once and reads it
 * everywhere (EXECUTIVE_INTELLIGENCE_LAYER_DESIGN_SPEC.md §0.1).
 */
export function MatchScoreBar({ score = 0, label, color = EXEC_COLORS.gold }) {
  const safe = Math.max(0, Math.min(100, Number(score) || 0))
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        {label && <span style={{ fontSize: 12, color: EXEC_COLORS.ink3, fontWeight: 600 }}>{label}</span>}
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", marginLeft: "auto" }}>{safe}</span>
      </div>
      <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${safe}%`, background: color, borderRadius: 99, transition: "width 0.5s ease" }} />
      </div>
    </div>
  )
}

/** Simple status pill for pipeline/lifecycle stages (Prospects, Committed, Closed, etc). */
export function StatusPill({ children, tone = "neutral" }) {
  const tones = {
    neutral: { color: EXEC_COLORS.ink3, bg: "#F3F1EC" },
    positive: { color: EXEC_COLORS.green, bg: EXEC_COLORS.greenL },
    warning: { color: EXEC_COLORS.goldD, bg: EXEC_COLORS.goldL },
    critical: { color: EXEC_COLORS.red, bg: EXEC_COLORS.redL },
    info: { color: EXEC_COLORS.blue, bg: EXEC_COLORS.blueL },
  }
  const t = tones[tone] || tones.neutral
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 10px",
      borderRadius: 20, background: t.bg, color: t.color,
      fontSize: 11, fontWeight: 700, fontFamily: "inherit",
    }}>{children}</span>
  )
}
