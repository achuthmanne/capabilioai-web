/**
 * theme.js — Capabilio Parchment Design System
 * Single source of truth. Import anywhere:
 *   import { TH, font, radius, shadow, ease } from "../theme"
 *
 * Palette inspired by open-design.ai  ·  Updated June 2026
 */

// ── Color tokens ──────────────────────────────────────────────────────────────
export const TH = {
  // Backgrounds
  bgPage:     "#FAF7F2",   // warm parchment — main page bg
  bgSurface:  "#F2EDE4",   // slightly deeper surface
  bgCard:     "#FFFFFF",   // clean white card
  bgRaised:   "#F8F4EE",   // elevated panel
  bgHover:    "#EDE8DF",   // hover state for rows/items
  bgInk:      "#1A1714",   // reversed / code blocks

  // Ink (text)
  ink:        "#1A1714",   // primary text — warm near-black
  ink2:       "#3D3935",   // body text
  ink3:       "#6B6560",   // secondary / labels
  ink4:       "#A8A29E",   // muted / timestamps
  ink5:       "#D6D0C8",   // ghost / placeholders

  // Borders
  border:     "#E8E3DA",
  borderStr:  "#C8C2BA",   // stronger border
  borderSoft: "#F0EBE3",

  // Brand — Capabilio orange
  brand:      "#FF5701",
  brandDark:  "#E04D00",
  brandSoft:  "#FFF3EE",
  brandGlow:  "rgba(255,87,1,0.15)",

  // Semantic
  green:      "#16A34A",
  greenSoft:  "#ECFDF5",
  amber:      "#D97706",
  amberSoft:  "#FFFBEB",
  red:        "#DC2626",
  redSoft:    "#FEF2F2",
  blue:       "#2563EB",
  blueSoft:   "#EFF6FF",
  indigo:     "#4F46E5",
  indigoSoft: "#EEF2FF",
  purple:     "#7C3AED",
  purpleSoft: "#F5F3FF",
  teal:       "#0891B2",
  tealSoft:   "#ECFEFF",

  // Legacy compat (maps used by Arena pages)
  bg:         "#FAF7F2",
  bg2:        "#F2EDE4",
  card:       "#FFFFFF",
  cream:      "#F2EDE4",
  cream2:     "#EDE8DF",
  cream3:     "#D6D0C8",
  slate:      "#F2EDE4",
  slate2:     "#E8E3DA",
  orange:     "#FF5701",
}

// ── Typography ─────────────────────────────────────────────────────────────────
export const font = {
  body:    "'DM Sans', system-ui, sans-serif",
  display: "'DM Sans', system-ui, sans-serif",
  mono:    "'DM Mono', 'DM Mono', monospace",
  serif:   "Georgia, serif",
}

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  xs:   "4px",
  sm:   "7px",
  md:   "10px",
  lg:   "14px",
  xl:   "18px",
  "2xl": "24px",
  full: "9999px",
}

// ── Shadows (warm-tinted) ─────────────────────────────────────────────────────
export const shadow = {
  sm:    "0 1px 3px rgba(26,23,20,0.06), 0 1px 2px rgba(26,23,20,0.04)",
  md:    "0 4px 14px rgba(26,23,20,0.07), 0 1px 3px rgba(26,23,20,0.04)",
  lg:    "0 12px 32px rgba(26,23,20,0.09), 0 4px 8px rgba(26,23,20,0.04)",
  xl:    "0 24px 48px rgba(26,23,20,0.11)",
  brand: "0 4px 16px rgba(255,87,1,0.20)",
  glow:  "0 0 0 3px rgba(255,87,1,0.14)",
}

// ── Easing ─────────────────────────────────────────────────────────────────────
export const ease = {
  out:    "cubic-bezier(0.22, 1, 0.36, 1)",
  in:     "cubic-bezier(0.64, 0, 0.78, 0)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  std:    "cubic-bezier(0.4, 0, 0.2, 1)",
}

// ── ELO tiers ──────────────────────────────────────────────────────────────────
// Single source of truth for ELO tier naming, imported by Aura.jsx,
// StudentHome.jsx, Portfolio.jsx, and copilotConfig.js — do not redefine
// tier boundaries/labels/colors locally in any of those files.
//
// Mirrored server-side at backend/server/lib/eloTiers.js (no frontend<->
// backend import boundary exists in this monorepo, so a plain copy was
// used instead of introducing one). THIS file is canonical — if
// backend/server/lib/eloTiers.test.js ever fails, fix the backend copy to
// match here, never the reverse.
export const ELO_TIERS = [
  { min: 0,    max: 600,  label: "Rookie",       color: "#A8A29E", icon: "🌱" },
  { min: 600,  max: 800,  label: "Apprentice",   color: "#22C55E", icon: "⚡" },
  { min: 800,  max: 1000, label: "Practitioner", color: "#3B82F6", icon: "🔵" },
  { min: 1000, max: 1200, label: "Expert",       color: "#8B5CF6", icon: "💜" },
  { min: 1200, max: 1500, label: "Master",       color: "#F59E0B", icon: "🏆" },
  { min: 1500, max: 9999, label: "Elite",        color: "#EF4444", icon: "🔥" },
]
export const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]
export const getNextTier = elo => ELO_TIERS.find(t => elo < t.max && t.max < 9999) || null

// ── Difficulty helpers ─────────────────────────────────────────────────────────
export const diffColor = d =>
  d === "Easy" ? "#16A34A" : d === "Hard" ? "#DC2626" : d === "Expert" ? "#7C3AED" : "#D97706"
export const diffBg = d =>
  d === "Easy" ? "#ECFDF5" : d === "Hard" ? "#FEF2F2" : d === "Expert" ? "#F5F3FF" : "#FFFBEB"

// ── Shared inline style helpers ────────────────────────────────────────────────
/** Compact card surface */
export const cardStyle = (extra = {}) => ({
  background: TH.bgCard,
  border: `1px solid ${TH.border}`,
  borderRadius: radius.lg,
  boxShadow: shadow.sm,
  ...extra,
})

/** Standard section label overline */
export const overlineStyle = {
  fontSize: 10,
  fontWeight: 800,
  color: TH.ink4,
  textTransform: "uppercase",
  letterSpacing: "1.2px",
  fontFamily: font.mono,
}
