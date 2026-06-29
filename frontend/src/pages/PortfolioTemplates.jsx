// ════════════════════════════════════════════════════════════════
// PORTFOLIO TEMPLATES — Professional recruiter-ready designs
// Replaces the old dark/gaming THEMES system entirely.
//
// Free:        Executive · Modern Pro
// Basic ₹49:   Minimal · Corporate
// Gold ₹99:    Impact
// Pack ₹299:   All 5 templates forever
//
// Each template defines:
//   colors      — full token set used by PortfolioTemplate renderer
//   layout      — drives structural decisions in the renderer
//   fonts       — Google Fonts import string + font-family values
//   thumbnail   — used in the Aura dashboard picker card
// ════════════════════════════════════════════════════════════════

export const TEMPLATES = {

  // ── FREE ─────────────────────────────────────────────────────
  executive: {
    id: "executive",
    name: "Executive",
    tier: "free",
    price: 0,
    description: "Clean white with deep navy header. Trusted by senior professionals.",
    bestFor: "Senior roles · Management · Consulting",
    layout: "classic",          // full-width stacked
    fonts: {
      import: "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap",
      display: "'DM Sans', sans-serif",
      body: "'Source Sans 3', sans-serif",
    },
    thumbnail: {
      bg: "#FFFFFF",
      headerBg: "#1a2744",
      accent: "#2563EB",
      text: "#1e293b",
    },
    colors: {
      pageBg:        "#FFFFFF",
      headerBg:      "#1a2744",
      headerText:    "#FFFFFF",
      headerSubtext: "rgba(255,255,255,0.65)",
      accent:        "#2563EB",
      accentLight:   "#EFF6FF",
      accentText:    "#1D4ED8",
      bodyBg:        "#FFFFFF",
      cardBg:        "#1A1714",
      cardBorder:    "#E8E3DA",
      text:          "#1A1714",
      textMid:       "#475569",
      textDim:       "#A8A29E",
      statBg:        "#F2EDE4",
      statBorder:    "#475569",
      statValue:     "#1a2744",
      statLabel:     "#6B6560",
      skillBg:       "#EFF6FF",
      skillBorder:   "#BFDBFE",
      skillText:     "#1D4ED8",
      divider:       "#E8E3DA",
      nameFontSize:  "clamp(32px,5vw,56px)",
      nameColor:     "#FFFFFF",
      badgeBg:       "rgba(0,0,0,0.07)",
      badgeText:     "#FFFFFF",
      badgeBorder:   "rgba(255,255,255,0.22)",
      eloColor:      "#60A5FA",
      taskColor:     "#34D399",
      scoreColor:    "#FBBF24",
      navBg:         "rgba(255,255,255,0.96)",
      navBorder:     "#E8E3DA",
      navText:       "#1A1714",
      brandColor:    "#2563EB",
      sectionHead:   "#1a2744",
      capabilioText: "#1a2744",
    },
  },

  modern: {
    id: "modern",
    name: "Modern Pro",
    tier: "free",
    price: 0,
    description: "Dark slate header, luminous light body. Precise and contemporary.",
    bestFor: "Tech roles · Product · Engineering",
    layout: "modern",
    fonts: {
      import: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap",
      display: "'DM Serif Display', serif",
      body: "'DM Sans', sans-serif",
    },
    thumbnail: {
      bg: "#1A1714",
      headerBg: "#1A1714",
      accent: "#06B6D4",
      text: "#0f172a",
    },
    colors: {
      pageBg:        "#1A1714",
      headerBg:      "#1A1714",
      headerText:    "#1A1714",
      headerSubtext: "rgba(248,250,252,0.55)",
      accent:        "#06B6D4",
      accentLight:   "#ECFEFF",
      accentText:    "#0E7490",
      bodyBg:        "#1A1714",
      cardBg:        "#FFFFFF",
      cardBorder:    "#E8E3DA",
      text:          "#1A1714",
      textMid:       "#3D3935",
      textDim:       "#A8A29E",
      statBg:        "#FFFFFF",
      statBorder:    "#E8E3DA",
      statValue:     "#1A1714",
      statLabel:     "#6B6560",
      skillBg:       "#ECFEFF",
      skillBorder:   "#A5F3FC",
      skillText:     "#0E7490",
      divider:       "#E8E3DA",
      nameFontSize:  "clamp(30px,4.5vw,52px)",
      nameColor:     "#1A1714",
      badgeBg:       "rgba(6,182,212,0.15)",
      badgeText:     "#67E8F9",
      badgeBorder:   "rgba(6,182,212,0.3)",
      eloColor:      "#06B6D4",
      taskColor:     "#34D399",
      scoreColor:    "#FBBF24",
      navBg:         "rgba(248,250,252,0.96)",
      navBorder:     "#E8E3DA",
      navText:       "#1A1714",
      brandColor:    "#06B6D4",
      sectionHead:   "#1A1714",
      capabilioText: "#1A1714",
    },
  },

  // ── BASIC ₹49 ─────────────────────────────────────────────────
  minimal: {
    id: "minimal",
    name: "Minimal",
    tier: "basic",
    price: 49,
    description: "Pure white, maximum whitespace. Every element earns its place.",
    bestFor: "Design · Creative · Consulting roles",
    layout: "minimal",
    fonts: {
      import: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap",
      display: "'Cormorant Garamond', serif",
      body: "'IBM Plex Sans', sans-serif",
    },
    thumbnail: {
      bg: "#FFFFFF",
      headerBg: "#FFFFFF",
      accent: "#6366F1",
      text: "#FFFFFF",
    },
    colors: {
      pageBg:        "#FFFFFF",
      headerBg:      "#FFFFFF",
      headerText:    "#FFFFFF",
      headerSubtext: "#6B6560",
      accent:        "#6366F1",
      accentLight:   "#EEF2FF",
      accentText:    "#4338CA",
      bodyBg:        "#FFFFFF",
      cardBg:        "#FAFAFA",
      cardBorder:    "#F3F4F6",
      text:          "#FFFFFF",
      textMid:       "#3D3935",
      textDim:       "#A8A29E",
      statBg:        "#FAFAFA",
      statBorder:    "#E8E3DA",
      statValue:     "#FFFFFF",
      statLabel:     "#6B6560",
      skillBg:       "#F5F3FF",
      skillBorder:   "#DDD6FE",
      skillText:     "#4338CA",
      divider:       "#F3F4F6",
      nameFontSize:  "clamp(36px,6vw,72px)",
      nameColor:     "#FFFFFF",
      badgeBg:       "#F5F3FF",
      badgeText:     "#4338CA",
      badgeBorder:   "#DDD6FE",
      eloColor:      "#6366F1",
      taskColor:     "#059669",
      scoreColor:    "#D97706",
      navBg:         "rgba(255,255,255,0.98)",
      navBorder:     "#F3F4F6",
      navText:       "#FFFFFF",
      brandColor:    "#6366F1",
      sectionHead:   "#FFFFFF",
      capabilioText: "#FFFFFF",
    },
  },

  corporate: {
    id: "corporate",
    name: "Corporate",
    tier: "basic",
    price: 49,
    description: "Two-column layout, structured sidebar. Built for enterprise credibility.",
    bestFor: "Finance · Banking · Enterprise IT",
    layout: "corporate",        // sidebar layout
    fonts: {
      import: "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Nunito+Sans:wght@300;400;600;700;800&display=swap",
      display: "'Libre Baskerville', serif",
      body: "'Nunito Sans', sans-serif",
    },
    thumbnail: {
      bg: "#F2EDE4",
      headerBg: "#1E3A5F",
      accent: "#0EA5E9",
      text: "#1e293b",
    },
    colors: {
      pageBg:        "#F2EDE4",
      headerBg:      "#1E3A5F",
      headerText:    "#FFFFFF",
      headerSubtext: "rgba(255,255,255,0.60)",
      accent:        "#0EA5E9",
      accentLight:   "#F0F9FF",
      accentText:    "#0369A1",
      bodyBg:        "#F2EDE4",
      cardBg:        "#FFFFFF",
      cardBorder:    "#475569",
      text:          "#1A1714",
      textMid:       "#3D3935",
      textDim:       "#A8A29E",
      statBg:        "#FFFFFF",
      statBorder:    "#475569",
      statValue:     "#1E3A5F",
      statLabel:     "#6B6560",
      skillBg:       "#F0F9FF",
      skillBorder:   "#BAE6FD",
      skillText:     "#0369A1",
      divider:       "#475569",
      nameFontSize:  "clamp(28px,4vw,46px)",
      nameColor:     "#FFFFFF",
      badgeBg:       "rgba(0,0,0,0.07)",
      badgeText:     "#FFFFFF",
      badgeBorder:   "rgba(255,255,255,0.22)",
      eloColor:      "#38BDF8",
      taskColor:     "#4ADE80",
      scoreColor:    "#FDE047",
      navBg:         "#1E3A5F",
      navBorder:     "rgba(255,255,255,0.1)",
      navText:       "#FFFFFF",
      brandColor:    "#38BDF8",
      sectionHead:   "#1E3A5F",
      capabilioText: "#0EA5E9",
    },
  },

  // ── GOLD ₹99 ─────────────────────────────────────────────────
  impact: {
    id: "impact",
    name: "Impact",
    tier: "gold",
    price: 99,
    description: "Full-bleed black header, amber accent line, bold statement layout.",
    bestFor: "Leadership · Startups · High-growth roles",
    layout: "impact",
    fonts: {
      import: "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap",
      display: "'Syne', sans-serif",
      body: "'DM Sans', sans-serif",
    },
    thumbnail: {
      bg: "#FAFAFA",
      headerBg: "#111111",
      accent: "#F59E0B",
      text: "#111111",
    },
    colors: {
      pageBg:        "#FAFAFA",
      headerBg:      "#111111",
      headerText:    "#FFFFFF",
      headerSubtext: "rgba(255,255,255,0.50)",
      accent:        "#F59E0B",
      accentLight:   "#FFFBEB",
      accentText:    "#B45309",
      bodyBg:        "#FAFAFA",
      cardBg:        "#FFFFFF",
      cardBorder:    "#E8E3DA",
      text:          "#111111",
      textMid:       "#3D3935",
      textDim:       "#A8A29E",
      statBg:        "#111111",
      statBorder:    "#222222",
      statValue:     "#FFFFFF",
      statLabel:     "#A8A29E",
      skillBg:       "#FFFBEB",
      skillBorder:   "#FDE68A",
      skillText:     "#92400E",
      divider:       "#E8E3DA",
      nameFontSize:  "clamp(34px,5.5vw,64px)",
      nameColor:     "#FFFFFF",
      badgeBg:       "rgba(245,158,11,0.15)",
      badgeText:     "#F59E0B",
      badgeBorder:   "rgba(245,158,11,0.35)",
      eloColor:      "#F59E0B",
      taskColor:     "#34D399",
      scoreColor:    "#F59E0B",
      navBg:         "#111111",
      navBorder:     "#222222",
      navText:       "#FFFFFF",
      brandColor:    "#F59E0B",
      sectionHead:   "#111111",
      capabilioText: "#F59E0B",
    },
  },
}

// ── Packs ──────────────────────────────────────────────────────
export const TEMPLATE_PACKS = {
  basic_single: { id: "basic_single", name: "Basic Template",     price: 49,  includes: 1,     description: "Any 1 Basic template (Minimal or Corporate)" },
  gold_single:  { id: "gold_single",  name: "Gold Template",      price: 99,  includes: 1,     description: "Impact template" },
  mega_pack:    { id: "mega_pack",    name: "Portfolio Pro Pack",  price: 299, includes: "all", description: "All 5 professional templates forever" },
}

// ── Helpers ────────────────────────────────────────────────────
export function getTemplateById(id) {
  return TEMPLATES[id] || TEMPLATES.executive
}

export function isTemplateFree(templateId) {
  return TEMPLATES[templateId]?.tier === "free"
}

export function isTemplateOwned(templateId, purchasedTemplates = {}) {
  return isTemplateFree(templateId) || !!purchasedTemplates[templateId]
}

// Legacy shim — old code that calls getThemeById / isThemeFree / isThemeOwned
// will still work without changes during migration
export const getThemeById  = getTemplateById
export const isThemeFree   = isTemplateFree
export const isThemeOwned  = isTemplateOwned
export const THEMES        = TEMPLATES