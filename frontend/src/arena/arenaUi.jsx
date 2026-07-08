/**
 * arenaUi.jsx — shared Arena design tokens + micro-components
 * (spec §17: two-surface system, fixed color semantics, mono numerals)
 */
import React, { useState, useEffect } from "react"

// ── Parchment design tokens (synced with theme.js + index.css) ───────────────
export const T = {
  // Backgrounds
  bg:    "#FAF7F2",   // page background
  bg2:   "#F2EDE4",   // surface / raised
  card:  "#FFFFFF",   // card white
  cream: "#F2EDE4",
  cream2:"#EDE8DF",
  cream3:"#D6D0C8",

  // Ink
  ink:   "#1A1714",
  ink2:  "#3D3935",
  ink3:  "#6B6560",
  ink4:  "#A8A29E",
  ink5:  "#D6D0C8",

  // Borders
  border:     "#E8E3DA",
  borderSoft: "#F0EBE3",

  // Brand
  orange: "#FF5701",
  brand:  "#FF5701",

  // Semantic
  green:  "#16A34A", greenBg:  "#ECFDF5",
  amber:  "#D97706", amberBg:  "#FFFBEB",
  red:    "#DC2626", redBg:    "#FEF2F2",
  blue:   "#2563EB", blueBg:   "#EFF6FF",
  indigo: "#4F46E5", indigoBg: "#EEF2FF",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  teal:   "#0891B2", tealBg:   "#ECFEFF",

  // Legacy aliases used in Arena/Portfolio pages
  blue2:    "#4F46E5",
  blue3:    "#EEF2FF",
  green2:   "#ECFDF5",
  amber2:   "#FFFBEB",
  purple2:  "#F5F3FF",
  teal3:    "#ECFEFF",

  // Shadows
  shadow:   "0 1px 3px rgba(26,23,20,0.06), 0 1px 2px rgba(26,23,20,0.04)",

  // Convenience
  slate:  "#F2EDE4",
  slate2: "#E8E3DA",
}

export const ELO_TIERS = [
  { min: 0,    max: 600,      label: "Rookie",     color: "#A8A29E", icon: "🌱" },
  { min: 600,  max: 900,      label: "Contender",  color: "#16A34A", icon: "⚔️" },
  { min: 900,  max: 1200,     label: "Specialist", color: "#2563EB", icon: "🎯" },
  { min: 1200, max: 1500,     label: "Expert",     color: "#7C3AED", icon: "💎" },
  { min: 1500, max: 1800,     label: "Master",     color: "#D97706", icon: "👑" },
  { min: 1800, max: Infinity, label: "Legend",     color: "#FF5701", icon: "🔥" },
]
export const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

export const diffColor = d => d === "Easy" ? "#16A34A" : d === "Hard" ? "#DC2626" : d === "Expert" ? "#7C3AED" : "#D97706"
export const diffBg    = d => d === "Easy" ? "#F0FDF4" : d === "Hard" ? "#FEF2F2" : d === "Expert" ? "#F5F3FF" : "#FFFBEB"

export const fmtClock = s => s == null ? null : `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`

export function Spinner({ color = T.brand, size = 14 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}33`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
}

export function Pill({ children, color = T.ink3, bg = T.bg2, border, size = 10 }) {
  return (
    <span style={{ fontSize: size, fontWeight: 700, color, background: bg, padding: "2px 9px", borderRadius: 99, border: border ? `1px solid ${border}` : "none", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {children}
    </span>
  )
}

/** Workstation badge — the unification glue (spec §17.3). Renders identically everywhere. */
export function WorkstationBadge({ meta, size = 10 }) {
  return (
    <Pill color={meta.hue} bg={`${meta.hue}14`} border={`${meta.hue}30`} size={size}>
      <span>{meta.icon}</span> {meta.label}
    </Pill>
  )
}

export function useCountdown(until) {
  const [left, setLeft] = useState(() => Math.max(0, (until || 0) - Date.now()))
  useEffect(() => {
    if (!until) return
    const id = setInterval(() => setLeft(Math.max(0, until - Date.now())), 1000)
    return () => clearInterval(id)
  }, [until])
  return left
}

export function CountdownDisplay({ cooldownUntil, color = "#B45309" }) {
  const ms = useCountdown(cooldownUntil)
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000)
  return (
    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  )
}

/** Tier-colored ELO ring (readiness strip + result overlay). */
export function EloRing({ elo, size = 64 }) {
  const tier = getTier(elo)
  const next = ELO_TIERS[Math.min(ELO_TIERS.indexOf(tier) + 1, ELO_TIERS.length - 1)]
  const span = (next.min === tier.min ? 300 : next.min - tier.min)
  const pct  = Math.min(1, Math.max(0, (elo - tier.min) / span))
  const r = (size - 8) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }} title={`${next.min - elo > 0 ? next.min - elo : 0} pts to ${next.label}`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${tier.color}20`} strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tier.color} strokeWidth={4}
          strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size / 3.4 }}>{tier.icon}</div>
    </div>
  )
}

/** Tiny inline sparkline for ELO trend (homepage right rail). */
export function Sparkline({ points = [], width = 180, height = 44, color = T.blue }) {
  if (points.length < 2) {
    return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: T.ink4 }}>Complete missions to draw your trend</div>
  }
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1
  const xy = points.map((p, i) => [4 + (i / (points.length - 1)) * (width - 8), height - 6 - ((p - min) / span) * (height - 12)])
  const path = xy.map(c => c.join(",")).join(" ")
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r={3} fill={color} />
    </svg>
  )
}

/** Directive empty state — every empty region names the action that fills it (UX law 2). */
export function EmptyDirective({ icon = "○", label, height = 90 }) {
  return (
    <div style={{ minHeight: height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, border: `1.5px dashed ${T.border}`, borderRadius: 10, padding: 14 }}>
      <span style={{ fontSize: 18, opacity: 0.5 }}>{icon}</span>
      <span style={{ fontSize: 10.5, color: T.ink4, textAlign: "center", lineHeight: 1.5, maxWidth: 260 }}>{label}</span>
    </div>
  )
}
