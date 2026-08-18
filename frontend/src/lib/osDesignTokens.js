/**
 * osDesignTokens.js — flat White/Graphite/orange-accent system.
 * Single source of truth for the "Career OS" surfaces (LandingPage.jsx,
 * AuthModal in App.jsx) — see DESIGN.md at the repo root for the full
 * philosophy and "never do X" rules this token set exists to enforce.
 *
 * Deliberately NOT the same system as theme.js's Parchment palette (warm
 * cream, used by the logged-in product) — see DESIGN.md's palette section
 * for why. The four semantic colors below (error/warning/info/success) are
 * a deliberate exception: they're copied from theme.js's red/amber/blue/
 * green (and *Soft tints) exactly, so status meaning (a form error, a
 * password-strength level) reads the same across both systems — only the
 * neutral/accent tokens differ between Parchment and this one.
 */
export const T = {
  surface:       "#FFFFFF",
  surfaceRaised: "#FAFAF9",
  ink:           "#14161A",
  ink2:          "#4B5058",
  ink3:          "#8A8F98",
  border:        "#E4E6E9",
  borderHover:   "rgba(20,22,26,0.30)",
  hairline:      "#F0F1F3",

  accent:        "#FF5701",
  accentDark:    "#E04D00",
  accentDim:     "#FFF3EE",

  // Status only — copied from theme.js's red/amber/blue/green + *Soft
  // tints so meaning matches across Parchment and this system. Never used
  // decoratively (no per-path/per-tab color rotation — see DESIGN.md #9).
  error:    "#DC2626", errorDim:   "#FEF2F2",
  warning:  "#D97706", warningDim: "#FFFBEB",
  info:     "#2563EB", infoDim:    "#EFF6FF",
  success:  "#16A34A", successDim: "#ECFDF5",
}

export const EASE = [0.16, 1, 0.3, 1]
