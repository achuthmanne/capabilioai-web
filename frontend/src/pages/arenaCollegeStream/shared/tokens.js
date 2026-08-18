/**
 * shared/tokens.js — Phase 2.5.
 *
 * Design tokens for the whole arenaCollegeStream tree (both the academic
 * Stream branch and the Domain Role branch, plus every future Domain Role
 * panel-type workspace under workspaces/). Extracted out of
 * ArenaCollegeStream.jsx unchanged — mirrors Aura.jsx's `T` object
 * (frontend/src/pages/Aura.jsx:27-54) so this page reads as the same
 * product, not a bolted-on view.
 */
export const T = {
  ink: "#1A1714", ink2: "#475569", ink3: "#A8A29E", ink4: "#6B6560",
  indigo: "#6366F1", indigo3: "rgba(99,102,241,0.12)",
  cream: "#FAF7F2", cream2: "#FFFFFF", border: "rgba(0,0,0,0.05)",
  shadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  green: "#16A34A", green2: "rgba(22,163,74,0.12)",
  amber: "#D97706", amber2: "rgba(217,119,6,0.12)",
  red: "#DC2626", red2: "rgba(220,38,38,0.12)",
  brand: "#FF5701",
}
export const MONO = "'DM Mono', 'Fira Mono', monospace"
export const BODY = "'DM Sans', system-ui, sans-serif"

export const DIFFICULTY_COLOR = { easy: T.green, medium: T.amber, hard: T.red }
