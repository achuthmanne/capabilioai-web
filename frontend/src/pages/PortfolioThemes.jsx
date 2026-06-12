// ════════════════════════════════════════════════════════════════
// PORTFOLIO THEMES — Visual theme system for public portfolio
// Free: Cosmic (default), Midnight
// Paid Basic ₹49: Aurora, Neon Tokyo, Carbon
// Paid Gold ₹99: Holographic, Sakura, Obsidian
// Pack ₹299: All 5 premium themes
// ════════════════════════════════════════════════════════════════

export const THEMES = {
  cosmic: {
    id: "cosmic",
    name: "Cosmic",
    tier: "free",
    price: 0,
    preview: "linear-gradient(135deg,#030712,#0d1b2e)",
    accent: "#00D2FF",
    description: "Deep space vibes. The default Capabilio look.",
    colors: {
      bg:       "#030712",
      card:     "rgba(8,15,30,0.88)",
      border:   "rgba(0,210,255,0.15)",
      accent:   "#00D2FF",
      accent2:  "#78FF9E",
      text:     "#f1f5f9",
      textDim:  "#64748b",
      gradient: "linear-gradient(135deg,#030712,#0d1b2e,#030712)",
      heroGlow: "radial-gradient(ellipse at 50% 0%,rgba(0,210,255,0.08),transparent 60%)",
      nameGrad: "linear-gradient(90deg,#00D2FF,#78FF9E,#B47FFF)",
      statAccent: "#00D2FF",
      navBg:    "rgba(3,7,18,0.94)",
    }
  },
  midnight: {
    id: "midnight",
    name: "Midnight",
    tier: "free",
    price: 0,
    preview: "linear-gradient(135deg,#0a0a0f,#1a1a2e)",
    accent: "#B47FFF",
    description: "Dark purple midnight. Clean and professional.",
    colors: {
      bg:       "#0a0a0f",
      card:     "rgba(15,12,28,0.92)",
      border:   "rgba(180,127,255,0.15)",
      accent:   "#B47FFF",
      accent2:  "#FF6B9D",
      text:     "#f1f5f9",
      textDim:  "#6b7280",
      gradient: "linear-gradient(135deg,#0a0a0f,#1a1a2e,#0a0a0f)",
      heroGlow: "radial-gradient(ellipse at 50% 0%,rgba(180,127,255,0.08),transparent 60%)",
      nameGrad: "linear-gradient(90deg,#B47FFF,#FF6B9D,#FFD166)",
      statAccent: "#B47FFF",
      navBg:    "rgba(10,10,15,0.94)",
    }
  },
  aurora: {
    id: "aurora",
    name: "Aurora",
    tier: "basic",
    price: 49,
    preview: "linear-gradient(135deg,#020b12,#0d2818,#1a0820)",
    accent: "#00FFB2",
    description: "Northern lights. Green aurora with purple undertones.",
    colors: {
      bg:       "#020b12",
      card:     "rgba(5,20,15,0.92)",
      border:   "rgba(0,255,178,0.15)",
      accent:   "#00FFB2",
      accent2:  "#7B2FBE",
      text:     "#e8fff8",
      textDim:  "#4d8068",
      gradient: "linear-gradient(135deg,#020b12,#0d2818,#1a0820)",
      heroGlow: "radial-gradient(ellipse at 30% 20%,rgba(0,255,178,0.06),transparent 55%),radial-gradient(ellipse at 70% 80%,rgba(123,47,190,0.06),transparent 55%)",
      nameGrad: "linear-gradient(90deg,#00FFB2,#00D2FF,#7B2FBE)",
      statAccent: "#00FFB2",
      navBg:    "rgba(2,11,18,0.94)",
    }
  },
  neonTokyo: {
    id: "neonTokyo",
    name: "Neon Tokyo",
    tier: "basic",
    price: 49,
    preview: "linear-gradient(135deg,#050008,#120020,#200010)",
    accent: "#FF0080",
    description: "Cyberpunk aesthetics. Hot pink meets electric blue.",
    colors: {
      bg:       "#050008",
      card:     "rgba(10,0,15,0.92)",
      border:   "rgba(255,0,128,0.18)",
      accent:   "#FF0080",
      accent2:  "#00F5FF",
      text:     "#fff0f8",
      textDim:  "#6b4060",
      gradient: "linear-gradient(135deg,#050008,#120020,#050008)",
      heroGlow: "radial-gradient(ellipse at 40% 30%,rgba(255,0,128,0.07),transparent 55%),radial-gradient(ellipse at 60% 70%,rgba(0,245,255,0.05),transparent 55%)",
      nameGrad: "linear-gradient(90deg,#FF0080,#FF6B9D,#00F5FF)",
      statAccent: "#FF0080",
      navBg:    "rgba(5,0,8,0.94)",
    }
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    tier: "basic",
    price: 49,
    preview: "linear-gradient(135deg,#111111,#1c1c1c)",
    accent: "#E8E8E8",
    description: "Minimal carbon dark. Let your work speak.",
    colors: {
      bg:       "#111111",
      card:     "rgba(20,20,20,0.95)",
      border:   "rgba(255,255,255,0.1)",
      accent:   "#E8E8E8",
      accent2:  "#FF6B35",
      text:     "#f5f5f5",
      textDim:  "#666666",
      gradient: "linear-gradient(135deg,#111111,#1a1a1a,#111111)",
      heroGlow: "radial-gradient(ellipse at 50% 0%,rgba(0,0,0,0.02),transparent 60%)",
      nameGrad: "linear-gradient(90deg,#ffffff,#cccccc,#FF6B35)",
      statAccent: "#FF6B35",
      navBg:    "rgba(10,10,10,0.96)",
    }
  },
  holographic: {
    id: "holographic",
    name: "Holographic",
    tier: "gold",
    price: 99,
    preview: "linear-gradient(135deg,#0a0a1a,#1a0a2e,#0a1a2e)",
    accent: "#00FFFF",
    description: "Iridescent holographic. Premium rainbow shimmer.",
    colors: {
      bg:       "#060610",
      card:     "rgba(10,10,25,0.92)",
      border:   "rgba(0,255,255,0.2)",
      accent:   "#00FFFF",
      accent2:  "#FF00FF",
      text:     "#f0f8ff",
      textDim:  "#4a6080",
      gradient: "linear-gradient(135deg,#060610,#0d0d25,#060610)",
      heroGlow: "radial-gradient(ellipse at 20% 20%,rgba(0,255,255,0.06),transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,0,255,0.05),transparent 50%),radial-gradient(ellipse at 50% 50%,rgba(255,255,0,0.03),transparent 60%)",
      nameGrad: "linear-gradient(90deg,#00FFFF,#FF00FF,#FFFF00,#00FFFF)",
      statAccent: "#00FFFF",
      navBg:    "rgba(6,6,16,0.96)",
    }
  },
  sakura: {
    id: "sakura",
    name: "Sakura",
    tier: "gold",
    price: 99,
    preview: "linear-gradient(135deg,#1a0a12,#2a0f1a,#1a0a12)",
    accent: "#FF8FAB",
    description: "Cherry blossom. Soft pink with warm gold accents.",
    colors: {
      bg:       "#120a0e",
      card:     "rgba(25,12,18,0.92)",
      border:   "rgba(255,143,171,0.18)",
      accent:   "#FF8FAB",
      accent2:  "#FFD700",
      text:     "#fff0f4",
      textDim:  "#8a6070",
      gradient: "linear-gradient(135deg,#120a0e,#1e0f14,#120a0e)",
      heroGlow: "radial-gradient(ellipse at 50% 10%,rgba(255,143,171,0.07),transparent 55%)",
      nameGrad: "linear-gradient(90deg,#FF8FAB,#FFD700,#FF8FAB)",
      statAccent: "#FFD700",
      navBg:    "rgba(18,10,14,0.96)",
    }
  },
  obsidian: {
    id: "obsidian",
    name: "Obsidian",
    tier: "gold",
    price: 99,
    preview: "linear-gradient(135deg,#080808,#101010)",
    accent: "#C0A060",
    description: "Pure obsidian black. Gold accents. Maximum prestige.",
    colors: {
      bg:       "#080808",
      card:     "rgba(12,12,12,0.97)",
      border:   "rgba(192,160,96,0.2)",
      accent:   "#C0A060",
      accent2:  "#E8D5A0",
      text:     "#f5f0e8",
      textDim:  "#5a5040",
      gradient: "linear-gradient(135deg,#080808,#0f0f0f,#080808)",
      heroGlow: "radial-gradient(ellipse at 50% 0%,rgba(192,160,96,0.06),transparent 55%)",
      nameGrad: "linear-gradient(90deg,#C0A060,#F0D890,#C0A060)",
      statAccent: "#C0A060",
      navBg:    "rgba(8,8,8,0.98)",
    }
  },
}

export const THEME_PACKS = {
  basic_single: { id:"basic_single", name:"Basic Theme",    price:49,  includes:1,    description:"Any 1 Basic theme" },
  gold_single:  { id:"gold_single",  name:"Gold Theme",     price:99,  includes:1,    description:"Any 1 Gold theme" },
  mega_pack:    { id:"mega_pack",    name:"Portfolio Pack", price:299, includes:"all", description:"All 5 premium themes forever" },
}

export function getThemeById(id) {
  return THEMES[id] || THEMES.cosmic
}

export function isThemeFree(themeId) {
  return THEMES[themeId]?.tier === "free"
}

export function isThemeOwned(themeId, purchasedThemes = {}) {
  return isThemeFree(themeId) || !!purchasedThemes[themeId]
}
