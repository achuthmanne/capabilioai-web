/**
 * eloTiers.js — server-side mirror of frontend/src/theme.js's ELO_TIERS.
 *
 * MUST stay byte-for-byte in sync with frontend/src/theme.js's ELO_TIERS —
 * that file is the canonical, frontend-facing single source of truth
 * (consolidated there after a six-scheme ELO-tier-naming fragmentation
 * across Aura.jsx/StudentHome.jsx/Portfolio.jsx/copilotConfig.js/theme.js/
 * Header.jsx). This copy exists only because there is no existing
 * frontend->backend (or shared) import boundary anywhere in this
 * monorepo, and introducing the first one just for a six-entry array
 * seemed like a bigger architectural change than a mirrored copy plus a
 * test that fails loudly the moment the two drift apart — see
 * eloTiers.test.js, which imports BOTH this file and theme.js directly
 * and asserts deep equality. If that test ever fails, fix THIS file to
 * match theme.js (theme.js is canonical), never the other way around.
 */
export const ELO_TIERS = [
  { min: 0,    max: 600,  label: "Rookie",       color: "#A8A29E", icon: "🌱" },
  { min: 600,  max: 800,  label: "Apprentice",   color: "#22C55E", icon: "⚡" },
  { min: 800,  max: 1000, label: "Practitioner", color: "#3B82F6", icon: "🔵" },
  { min: 1000, max: 1200, label: "Expert",       color: "#8B5CF6", icon: "💜" },
  { min: 1200, max: 1500, label: "Master",       color: "#F59E0B", icon: "🏆" },
  { min: 1500, max: 9999, label: "Elite",        color: "#EF4444", icon: "🔥" },
]
export const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]
