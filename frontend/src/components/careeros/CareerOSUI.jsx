/**
 * CareerOSUI.jsx — shared production primitives for the Career OS redesign
 * (docs/career-os-implementation-plan.md, Workstream 0-D).
 *
 * These are structural building blocks, not pages — they render whatever
 * real data the caller passes in. Nothing in this file invents data; every
 * component either renders props verbatim or renders an honest empty/error
 * state when props are missing.
 *
 * Visual language matches the existing Professional Path pages (Aura.jsx,
 * Orbit.jsx, ProfessionalHome.jsx, Skills.jsx) so these can be dropped into
 * any of them without a visual seam.
 */
import { Component, useState } from "react"

// ─── Design tokens (matches Aura/Orbit/ProfessionalHome/Skills exactly) ────────
export const T = {
  ink: "#1A1714", ink2: "#3D3935", mut: "#6B6560",
  bg: "#FAFAFA", surf: "#FFFFFF", cell: "#FAFAF8",
  bdr: "rgba(17,24,39,0.08)", purple: "#8B5CF6",
  good: "#16A34A", warn: "#D97706", bad: "#DC2626", info: "#3B82F6",
  mono: "'DM Mono','Fira Mono',monospace",
  serif: "'DM Sans',Georgia,serif",
  body: "DM Sans, system-ui, sans-serif",
}

// ─── OutcomeCard ────────────────────────────────────────────────────────────
// Non-negotiable product rule (blueprint §Core redesign principles, Non-
// negotiable Product Rule #1): no bare score ever ships to a Professional
// Path screen. This component structurally enforces that — it has no prop
// for a raw number headline, only `outcome` (a plain-language sentence).
// `drivers` and `basis` are required so every claim is explainable; if either
// is missing this renders a visible dev warning instead of silently shipping
// an unexplained number, so a future edit can't quietly break the rule.
export function OutcomeCard({
  label,          // small eyebrow, e.g. "Switch readiness"
  outcome,        // REQUIRED plain-language outcome, e.g. "Building"
  drivers = [],   // REQUIRED array of short driver strings
  basis,          // REQUIRED one-line evidence/basis string
  cta,            // { label, onClick }
  tone = "info",  // good | warn | bad | info | neutral
  secondaryValue, // optional muted internal number, shown small & secondary only
}) {
  const toneColor = { good: T.good, warn: T.warn, bad: T.bad, info: T.info, neutral: T.mut }[tone] || T.info
  const missingContract = !outcome || !basis || drivers.length === 0

  return (
    <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 18, padding: "16px 18px" }}>
      {label && (
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.mut, fontFamily: T.mono, marginBottom: 8 }}>
          {label}
        </div>
      )}

      {missingContract ? (
        <div style={{ fontSize: 12, color: T.bad, fontFamily: T.mono }}>
          OutcomeCard misconfigured: outcome/drivers/basis are required (no bare scores allowed). Check the caller.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 800, color: toneColor }}>{outcome}</div>
            {secondaryValue != null && (
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.mut }}>({secondaryValue})</div>
            )}
          </div>
          <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {drivers.map((d, i) => (
              <li key={i} style={{ fontSize: 12, color: T.ink2, fontFamily: T.body, display: "flex", gap: 6 }}>
                <span style={{ color: toneColor }}>&bull;</span>{d}
              </li>
            ))}
          </ul>
          <div style={{ fontSize: 11, color: T.mut, fontFamily: T.body, marginTop: 8, fontStyle: "italic" }}>
            Based on: {basis}
          </div>
          {cta && (
            <button
              onClick={cta.onClick}
              style={{
                marginTop: 12, cursor: "pointer", fontFamily: T.mono,
                fontWeight: 800, letterSpacing: "0.06em", borderRadius: 12, padding: "9px 14px",
                fontSize: 11, textTransform: "uppercase", background: `${toneColor}12`,
                color: toneColor, border: `1px solid ${toneColor}30`,
              }}
            >
              {cta.label} &rarr;
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── EvidenceSourceBadge ─────────────────────────────────────────────────────
const EVIDENCE_SOURCES = {
  "self-claimed":       { label: "Self-claimed",       color: T.mut  },
  "resume-derived":     { label: "From resume",        color: T.info },
  "employer-verified":  { label: "Employer verified",  color: T.good },
  "document-verified":  { label: "Document verified",  color: T.good },
  "capabilio-verified":  { label: "Capabilio verified",  color: T.good },
}
export function EvidenceSourceBadge({ source }) {
  const cfg = EVIDENCE_SOURCES[source] || EVIDENCE_SOURCES["self-claimed"]
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 999, background: `${cfg.color}10`, color: cfg.color,
      border: `1px solid ${cfg.color}28`, fontFamily: T.mono, letterSpacing: "0.04em",
    }}>
      {cfg.label}
    </span>
  )
}

// ─── SkillStatusBadge ────────────────────────────────────────────────────────
const SKILL_STATUSES = {
  verified:         { label: "Verified",          color: T.good },
  proof_submitted:  { label: "Proof submitted",   color: T.info },
  user_added:       { label: "Self-added",        color: T.mut  },
  inferred:         { label: "From resume",       color: T.info },
  historical:       { label: "Historical",        color: T.mut  },
  fresh:            { label: "Fresh",             color: T.good },
  aging:            { label: "Aging",             color: T.warn },
  at_risk:          { label: "At risk",           color: T.warn },
  decayed:          { label: "Decayed",           color: T.bad  },
}
export function SkillStatusBadge({ status }) {
  const cfg = SKILL_STATUSES[status] || { label: status || "Unknown", color: T.mut }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700,
      padding: "3px 9px", borderRadius: 999, background: `${cfg.color}10`, color: cfg.color,
      border: `1px solid ${cfg.color}28`, fontFamily: T.mono, letterSpacing: "0.04em",
    }}>
      {cfg.label}
    </span>
  )
}

// ─── ProfessionalScoreHero ───────────────────────────────────────────────────
// The canonical, single, headline "control surface" for the Professional
// Path (UI redesign pass, 2026-07-25 — replaces the old Orbit "Career
// Health"/EloCard grid as the PRIMARY visual anchor on Home and Career).
// Structurally enforces the product rule set: this is the ONLY component
// that may headline a professional's real skill-truth score, and every
// render must answer "what is this / why is it true / what changed / what's
// next" — no prop for a bare number with nothing else, same contract
// discipline as OutcomeCard above.
//
// Props map directly onto GET /api/pro/elo/professional's response shape
// (see backend/server/routes/professionalElo.js) — callers pass that
// response through as-is via the `data` prop; nothing here fetches or
// invents data.
export function ProfessionalScoreHero({ data, loading, error, onTakeAction }) {
  if (loading) {
    return (
      <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 20, padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: T.mut, fontFamily: T.mono }}>Loading Professional ELO…</div>
      </div>
    )
  }
  if (error) {
    return (
      <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 20, padding: "22px 24px", marginBottom: 18 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.purple, fontFamily: T.mono }}>Professional ELO</div>
        <div style={{ fontSize: 12, color: T.mut, marginTop: 8 }}>Couldn&apos;t load your Professional ELO right now — try again shortly.</div>
      </div>
    )
  }
  if (!data) return null

  const { elo, latest_change: change } = data
  const hasHistory = !!change
  const deltaColor = !hasHistory ? T.mut : change.delta > 0 ? T.good : change.delta < 0 ? T.bad : T.mut
  const deltaLabel = !hasHistory ? null : `${change.delta > 0 ? "+" : ""}${change.delta} this week`

  // Freshness/decay framing: a 'decay' event_type IS the freshness signal
  // (see eloEngine.js's applyPendingDecay) — surfaced here as a plain-
  // language state rather than a raw day-count, matching the no-bare-number
  // discipline used everywhere else in this file.
  const isDecayed = change?.event_type === "decay"
  const freshness = isDecayed
    ? { label: "Needs a refresh", color: T.warn }
    : hasHistory
      ? { label: "Fresh", color: T.good }
      : { label: "Not yet assessed", color: T.mut }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${T.purple}08 0%, ${T.surf} 55%)`,
      border: `1.5px solid ${T.purple}30`, borderRadius: 22, padding: "24px 26px", marginBottom: 18,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: T.purple, fontFamily: T.mono }}>
            Professional ELO &middot; your skill-truth score
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ fontFamily: T.serif, fontSize: 44, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{elo}</div>
            {deltaLabel && <span style={{ fontSize: 13, fontWeight: 800, color: deltaColor, fontFamily: T.mono }}>{deltaLabel}</span>}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
              background: `${freshness.color}12`, color: freshness.color, border: `1px solid ${freshness.color}30`,
              fontFamily: T.mono, letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              {freshness.label}
            </span>
          </div>
        </div>
      </div>

      {/* Why it's true — required, never a bare number with nothing behind it */}
      <div style={{ fontSize: 13, color: T.ink2, marginTop: 14, lineHeight: 1.6, fontFamily: T.body, maxWidth: 620 }}>
        {hasHistory ? change.reason : "No Weekly Skill Pulse activity yet — complete this week's check-in to start your Professional ELO."}
      </div>

      {/* What changed — which skills moved */}
      {change?.affected_skills?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {change.affected_skills.map((s, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 700, color: s.delta >= 0 ? T.good : T.bad,
              background: s.delta >= 0 ? `${T.good}10` : `${T.bad}10`, borderRadius: 999, padding: "3px 10px",
              border: `1px solid ${s.delta >= 0 ? T.good : T.bad}25`,
            }}>
              {s.skill_name || "Skill"} {s.delta >= 0 ? "+" : ""}{s.delta}
            </span>
          ))}
        </div>
      )}

      {/* What's next — required, never omitted */}
      {change?.next_action ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          marginTop: 16, padding: "12px 16px", borderRadius: 14, background: T.surf, border: `1px solid ${T.bdr}`,
        }}>
          <div style={{ fontSize: 13, color: T.ink, fontWeight: 600 }}>&rarr; {change.next_action}</div>
          {onTakeAction && (
            <button onClick={onTakeAction} style={{
              border: "none", cursor: "pointer", fontFamily: T.mono, fontWeight: 800,
              borderRadius: 10, padding: "8px 14px", fontSize: 10, textTransform: "uppercase",
              background: T.purple, color: "#fff", flexShrink: 0,
            }}>Take action</button>
          )}
        </div>
      ) : (
        onTakeAction && (
          <button onClick={onTakeAction} style={{
            marginTop: 16, border: "none", cursor: "pointer", fontFamily: T.mono, fontWeight: 800,
            borderRadius: 12, padding: "10px 18px", fontSize: 11, textTransform: "uppercase",
            background: T.purple, color: "#fff",
          }}>Start this week&apos;s check-in &rarr;</button>
        )
      )}
    </div>
  )
}

// ─── SecondaryDiagnosticsPanel ───────────────────────────────────────────────
// Wraps profile-strength/completeness diagnostics (the old "Career Health" /
// Role Fit / Market Standing / Proof Strength / Career Mobility / Recruiter
// Visibility / Career Resilience cards) so they are structurally demoted —
// visually muted, collapsed by default, and explicitly labeled as secondary
// so they can never compete with ProfessionalScoreHero for attention.
export function SecondaryDiagnosticsPanel({ children, title = "Profile signals", defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginTop: 22, opacity: 0.92 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          background: "transparent", border: "none", cursor: "pointer", padding: "10px 2px",
          borderTop: `1px solid ${T.bdr}`, textAlign: "left",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: T.mut, fontFamily: T.mono }}>
          {open ? "▾" : "▸"} {title}
        </span>
        <span style={{ fontSize: 10.5, color: T.mut, fontFamily: T.body }}>
          — profile-strength diagnostics, secondary to your Professional ELO
        </span>
      </button>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  )
}

// ─── OpportunityCard ─────────────────────────────────────────────────────────
export function OpportunityCard({ title, company, matchReason, requiredSkills = [], missingSkills = [], compensation, workModel, matchConfidence, nextAction }) {
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.ink }}>{title}</div>
          {company && <div style={{ fontSize: 12, color: T.mut, fontFamily: T.body }}>{company}</div>}
        </div>
        {workModel && <span style={{ fontSize: 10, fontWeight: 700, color: T.purple, fontFamily: T.mono }}>{workModel}</span>}
      </div>
      {matchReason && <div style={{ fontSize: 12, color: T.ink2, marginTop: 8, fontFamily: T.body }}>{matchReason}</div>}
      {requiredSkills.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {requiredSkills.slice(0, 6).map((s, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: `${T.purple}10`, color: T.purple, fontFamily: T.mono }}>{s}</span>
          ))}
        </div>
      )}
      {missingSkills.length > 0 && (
        <div style={{ fontSize: 11, color: T.warn, marginTop: 8, fontFamily: T.body }}>
          Missing: {missingSkills.slice(0, 4).join(", ")}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 11, color: T.mut, fontFamily: T.body }}>
          {compensation || "Compensation not disclosed"}{matchConfidence ? ` · ${matchConfidence} match confidence` : ""}
        </span>
        {nextAction && (
          <button onClick={nextAction.onClick} style={{
            border: "none", cursor: "pointer", fontFamily: T.mono, fontWeight: 800,
            borderRadius: 10, padding: "7px 12px", fontSize: 10, textTransform: "uppercase",
            background: T.purple, color: "#fff",
          }}>{nextAction.label}</button>
        )}
      </div>
    </div>
  )
}

// ─── MentorCard ───────────────────────────────────────────────────────────────
export function MentorCard({ name, role, expertise = [], rating, sessionCount, price, verified, onBook }) {
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.ink }}>
            {name} {verified && <span style={{ color: T.good, fontSize: 11 }}>&#10003; Verified</span>}
          </div>
          {role && <div style={{ fontSize: 12, color: T.mut, fontFamily: T.body }}>{role}</div>}
        </div>
        {rating != null && <div style={{ fontFamily: T.mono, fontSize: 13, color: T.purple, fontWeight: 800 }}>&#9733; {rating}</div>}
      </div>
      {expertise.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {expertise.slice(0, 5).map((e, i) => (
            <span key={i} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: `${T.purple}10`, color: T.purple, fontFamily: T.mono }}>{e}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <span style={{ fontSize: 11, color: T.mut, fontFamily: T.body }}>
          {sessionCount != null ? `${sessionCount} sessions` : "New mentor"}{price ? ` · ${price}` : ""}
        </span>
        {onBook && (
          <button onClick={onBook} style={{
            border: "none", cursor: "pointer", fontFamily: T.mono, fontWeight: 800,
            borderRadius: 10, padding: "7px 12px", fontSize: 10, textTransform: "uppercase",
            background: T.purple, color: "#fff",
          }}>Book session</button>
        )}
      </div>
    </div>
  )
}

// ─── ConsentModal ─────────────────────────────────────────────────────────────
// Any surface that shares a user's data with an employer, mentor, or company
// must get explicit consent through this before the call is made — but note
// the actual gate must ALSO be enforced server-side (see plan §Non-negotiable
// rule #5); this modal is the UI half only, never the security boundary.
export function ConsentModal({ open, scope, description, onConfirm, onCancel, confirmLabel = "Allow" }) {
  if (!open) return null
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: T.surf, borderRadius: 20, padding: 24, maxWidth: 420, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: T.purple, fontFamily: T.mono, marginBottom: 8 }}>
          Consent required
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 10 }}>
          Share this with {scope}?
        </div>
        <div style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, fontFamily: T.body, marginBottom: 18 }}>
          {description}
        </div>
        <div style={{ fontSize: 11, color: T.mut, fontFamily: T.body, marginBottom: 18 }}>
          You can revoke this at any time from Profile &rarr; Privacy &amp; Sharing.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px 0", border: `1px solid ${T.bdr}`, background: T.surf, borderRadius: 12, color: T.ink2, fontFamily: T.mono, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px 0", border: "none", background: T.purple, borderRadius: 12, color: "#fff", fontFamily: T.mono, fontWeight: 800, fontSize: 11, cursor: "pointer" }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = "\u{1F4CB}", title, description, ctaLabel, onCta }) {
  return (
    <div style={{ padding: "32px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 30, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: T.mut, maxWidth: 360, margin: "0 auto 16px", lineHeight: 1.7, fontFamily: T.body }}>{description}</div>}
      {ctaLabel && onCta && (
        <button onClick={onCta} style={{
          border: "none", cursor: "pointer", fontFamily: T.mono, fontWeight: 800,
          borderRadius: 14, padding: "11px 18px", fontSize: 11, textTransform: "uppercase",
          background: T.purple, color: "#fff",
        }}>{ctaLabel} &rarr;</button>
      )}
    </div>
  )
}

// ─── LoadingState ─────────────────────────────────────────────────────────────
export function LoadingState({ label = "Loading…" }) {
  return (
    <div style={{ padding: "28px 0", textAlign: "center", fontSize: 12, color: T.mut, fontFamily: T.mono }}>
      {label}
    </div>
  )
}

// ─── SectionErrorBoundary ─────────────────────────────────────────────────────
// Wraps one card/section of a page (Home, Career, Skills — per Workstream 0-E)
// so a render error in one section can't blank the entire page, which is
// exactly the class of bug this fixes (see the Skills-tab crash fixed in
// SkillGraphView.jsx before this workstream: one bad field reference took the
// whole page down instead of just the skill card that hit it).
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, info) {
    console.error(`[SectionErrorBoundary:${this.props.name || "unnamed"}]`, error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, color: T.bad, fontFamily: T.body, marginBottom: 8 }}>
            This section couldn&apos;t load. The rest of the page is unaffected.
          </div>
          <RetryButton onRetry={() => this.setState({ hasError: false })} />
        </div>
      )
    }
    return this.props.children
  }
}

function RetryButton({ onRetry }) {
  return (
    <button onClick={onRetry} style={{
      border: `1px solid ${T.bdr}`, background: T.surf, cursor: "pointer", fontFamily: T.mono,
      fontWeight: 700, borderRadius: 10, padding: "7px 12px", fontSize: 10, textTransform: "uppercase", color: T.ink2,
    }}>Retry</button>
  )
}
