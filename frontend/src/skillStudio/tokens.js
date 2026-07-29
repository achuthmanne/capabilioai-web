/**
 * tokens.js — shared design tokens for Skill Studio V2.
 * Promoted verbatim from the inline `D` object in pages/SkillStudio.jsx
 * (spec §16: "reuse the existing token set... do not introduce a second
 * color system"). Any Skill Studio V2 component should import from here
 * instead of redefining its own palette.
 */
export const D = {
  void:    "#FFFFFF",
  base:    "#FAF7F2",
  raised:  "#FFFFFF",
  float:   "#F5F5F5",
  glass:   "rgba(0,0,0,0.03)",
  glassH:  "rgba(0,0,0,0.06)",
  border:  "rgba(0,0,0,0.05)",
  borderH: "rgba(0,0,0,0.08)",
  indigo:  "#6366F1",
  gold:    "#F59E0B",
  emerald: "#10B981",
  rose:    "#F43F5E",
  violet:  "#8B5CF6",
  cyan:    "#06B6D4",
  amber:   "#F59E0B",
  text1:   "#1A1714",
  text2:   "#475569",
  muted:   "#6B6560",
}

export const FONT = "'DM Sans', -apple-system, sans-serif"
export const MONO = "'DM Mono', monospace"

export function bandColor(band) {
  if (band === "high") return D.emerald
  if (band === "medium") return D.gold
  return D.rose
}

export const cardStyle = {
  background: "rgba(255,255,255,0.97)",
  border: `1px solid ${D.border}`,
  borderRadius: 16,
}

export const sectionLabel = {
  fontSize: 10, fontWeight: 800, color: D.muted, textTransform: "uppercase",
  letterSpacing: 1.2, fontFamily: MONO,
}
