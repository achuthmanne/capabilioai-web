# Capabilio — Premium UI/UX Redesign System

**Version:** 2.0  
**Design Intelligence:** ui-ux-pro-max-skill (Liquid Glass + Dark OLED + Bento Grid + Glassmorphism)  
**Style Direction:** Cinematic Dark Depth — "The Bloomberg Terminal met a product launch video"  
**Audience:** Designers, frontend engineers, brand stakeholders  

---

## Quick Reference — Design Tokens

```css
/* ═══════════════════════════════════════════════════════ */
/*  CAPABILIO DESIGN TOKENS v2.0                          */
/* ═══════════════════════════════════════════════════════ */

/* Backgrounds — Layered depth system */
--bg-void:        #04060D;   /* deepest layer — page base on dark screens */
--bg-deep:        #080C18;   /* near-black navy */
--bg-base:        #0C1220;   /* primary dark surface */
--bg-raised:      #111827;   /* raised panel */
--bg-float:       #1A2235;   /* floating card */
--bg-glass:       rgba(255,255,255,0.06); /* glass panels */
--bg-glass-hover: rgba(255,255,255,0.10);

/* Brand — Electric Indigo primary, Gold accent */
--brand-primary:  #6366F1;   /* indigo-500 — primary action, ELO, proof */
--brand-glow:     rgba(99,102,241,0.35); /* primary glow */
--brand-gold:     #F59E0B;   /* amber — ELO badge, streak, highlights */
--brand-gold-glow:rgba(245,158,11,0.25);
--brand-emerald:  #10B981;   /* success, "You Have", verified */
--brand-rose:     #F43F5E;   /* critical gaps, errors */
--brand-violet:   #8B5CF6;   /* executive path, advanced tier */
--brand-cyan:     #06B6D4;   /* data, analytics, recruiter */

/* Surface glass */
--glass-border:   rgba(255,255,255,0.12);
--glass-border-h: rgba(255,255,255,0.20);
--blur:           backdrop-filter: blur(16px) saturate(180%);

/* Text */
--text-primary:   #F8FAFC;   /* headlines */
--text-secondary: #CBD5E1;   /* body */
--text-muted:     #64748B;   /* captions */
--text-ghost:     #334155;   /* placeholders */

/* Shadows — Elevation system */
--shadow-sm:   0 1px 3px rgba(0,0,0,0.4);
--shadow-md:   0 4px 16px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3);
--shadow-lg:   0 12px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4);
--shadow-glow: 0 0 32px rgba(99,102,241,0.3), 0 0 8px rgba(99,102,241,0.15);
--shadow-gold: 0 0 24px rgba(245,158,11,0.25);

/* Border radius scale */
--radius-sm:  8px;
--radius-md:  12px;
--radius-lg:  16px;
--radius-xl:  24px;
--radius-2xl: 32px;
--radius-full: 9999px;

/* Spacing — 4pt grid */
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-5: 20px;  --space-6: 24px;
--space-8: 32px; --space-10: 40px; --space-12: 48px;
--space-16: 64px; --space-20: 80px;

/* Typography */
--font-display: 'Clash Display', 'Inter', sans-serif;
--font-body:    'Inter', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace;
--font-serif:   'Playfair Display', Georgia, serif;

/* Z-index scale */
--z-base: 0; --z-raised: 10; --z-overlay: 20;
--z-modal: 40; --z-toast: 100; --z-cursor: 1000;

/* Transitions */
--ease-out:   cubic-bezier(0.22, 1, 0.36, 1);
--ease-in:    cubic-bezier(0.64, 0, 0.78, 0);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--duration-fast: 150ms;
--duration-base: 250ms;
--duration-slow: 400ms;
```

---

# 1. Visual Direction

## The Concept: "Proof of Existence"

Capabilio's visual identity should communicate a single idea: **this is where skill becomes real**. Not claimed. Not performed. Proven.

The interface should feel like:
- Walking into a war room of a world-class company — purposeful, dense with real signal
- A Bloomberg Terminal that got a Vercel-level design treatment
- A product launch video from a future-forward Indian tech brand
- A platform that takes career seriously, not cheerfully

### The Three Pillars of the Visual Direction

**1. Dark Depth with Atmospheric Light**
The dominant mode is dark — deep navy-black backgrounds with layered surface elevations. Light is used cinematically: it radiates from ELO numbers, glows behind active Arena challenges, pulses on proof artifacts. Every glow has meaning.

**2. Glassmorphism with Restraint**
Cards float above dark backgrounds as frosted glass panels. The effect is never cheap — no rainbow glass, no excessive blur. Glass is reserved for modals, floating panels, the navigation shell, and hero moments. Data-dense sections use clean elevated surfaces.

**3. Bento Grid Energy**
The dashboard and home layouts use asymmetric bento grids — some cells are small and tight, others span wide and breathe. This creates visual rhythm, guides the eye, and makes information scannable at a glance. Apple-level grid intelligence applied to career data.

### Path Visual Differentiation

Each path has its own **atmospheric color key** — a dominant ambient glow that tints backgrounds and accent elements:

| Path | Atmosphere Color | Feel |
|------|-----------------|------|
| Student | Indigo → Electric Blue | Electric, aspirational, building |
| Professional | Violet → Deep Purple | Focused, repositioning, refined |
| Executive | Gold → Amber | Authority, warmth, gravitas |
| Organization | Cyan → Teal | Data, intelligence, scale |

---

# 2. Brand Identity

## Brand Name Typography

**"Capabilio AI"** — the logotype is set in **Clash Display** (or Inter ExtraBold as fallback) with tight letter spacing (`letter-spacing: -0.03em`). The "AI" suffix uses the brand primary color `#6366F1`. No tagline in the header — the product speaks.

## Brand Personality

| Dimension | Expression |
|-----------|-----------|
| Voice | Precise. Direct. Ambitious without arrogance. |
| Energy | Charged but controlled — like a great athlete pre-race |
| Trust Signal | Data, proof, timestamps. Not promises. |
| India Identity | Company names (Swiggy, Razorpay), salary in ₹, Indian talent narrative — but global product quality |
| Hierarchy | Skill-first. Proof over résumé. Performance over pedigree. |

## Brand Moments

These are the 5 "brand moments" — interactions so distinctly Capabilio that they create product identity:

1. **The ELO Pulse** — when ELO updates after a challenge, the number glows gold for 1.5 seconds, scales up 1.08×, then settles. The badge radiates a ring pulse outward.
2. **The Proof Drop** — when a new proof artifact is created, a card slides in from the top with a spark animation and glows briefly in brand indigo.
3. **The Arena Enter** — transitioning into a challenge workspace is a cinematic zoom-in: the page fades to near-black, the workstation panel expands from center.
4. **The Gap Reveal** — the skill gap bars animate in from left simultaneously, creating a "market vs you" reveal that feels urgent.
5. **The Path Selector** — choosing a path triggers a subtle background color shift — the page atmosphere changes to match that path's color key.

---

# 3. Color and Typography

## Color System

### Primary Palette

```
DEEP DARK BASE          BRAND ACCENT          SEMANTIC COLORS
──────────────          ────────────          ───────────────
#04060D  Void           #6366F1  Indigo        #10B981  Emerald (success)
#080C18  Deep           #8B5CF6  Violet        #F59E0B  Amber   (ELO/gold)
#0C1220  Base           #06B6D4  Cyan          #F43F5E  Rose    (critical)
#111827  Raised         #3B82F6  Blue          #A78BFA  Lavender (executive)
#1A2235  Float          #F59E0B  Gold          #34D399  Mint     (verified)
```

### Gradient Library

```css
/* Page atmospheres — one per path */
.atm-student:   background: radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
                             radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.10) 0%, transparent 50%),
                             #080C18;

.atm-professional: background: radial-gradient(ellipse at 30% 40%, rgba(139,92,246,0.15) 0%, transparent 60%),
                                radial-gradient(ellipse at 70% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
                                #080C18;

.atm-executive: background: radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.12) 0%, transparent 55%),
                             radial-gradient(ellipse at 80% 70%, rgba(161,122,0,0.08) 0%, transparent 45%),
                             #080C18;

.atm-org:       background: radial-gradient(ellipse at 20% 60%, rgba(6,182,212,0.12) 0%, transparent 55%),
                             radial-gradient(ellipse at 75% 30%, rgba(16,185,129,0.08) 0%, transparent 45%),
                             #080C18;

/* Component gradients */
.grad-primary: background: linear-gradient(135deg, #6366F1, #8B5CF6);
.grad-gold:    background: linear-gradient(135deg, #F59E0B, #D97706);
.grad-emerald: background: linear-gradient(135deg, #10B981, #059669);
.grad-rose:    background: linear-gradient(135deg, #F43F5E, #E11D48);
.grad-hero:    background: linear-gradient(180deg, rgba(99,102,241,0.2) 0%, transparent 100%);
```

### Semantic Color Usage

| Element | Color Token | Hex |
|---------|------------|-----|
| Primary button | `--brand-primary` | `#6366F1` |
| ELO number | `--brand-gold` | `#F59E0B` |
| Streak badge | `#F97316` (orange) | |
| Proof artifact | `--brand-primary` | `#6366F1` |
| Critical gap | `--brand-rose` | `#F43F5E` |
| Learn soon | `#F59E0B` (amber) | |
| You Have | `--brand-emerald` | `#10B981` |
| Verified badge | `#34D399` (mint) | |
| Arena header | Dark `--bg-raised` | `#111827` |
| Score 80+ | `#10B981` | |
| Score 50–80 | `#F59E0B` | |
| Score <50 | `#F43F5E` | |

---

## Typography System

### Font Stack — 3-Tier System

```
TIER 1 — DISPLAY (heroes, section headers, brand statements)
  Clash Display Bold 700–800
  letter-spacing: -0.03em to -0.04em
  Used: hero headlines, Arena title, ELO large, path names

TIER 2 — BODY (content, UI, navigation)
  Inter 400–700
  letter-spacing: -0.01em at 16px+, normal below
  Used: all interface text, descriptions, labels, nav

TIER 3 — DATA (numbers, code, scores, timers)
  JetBrains Mono 400–800
  letter-spacing: 0 (tabular figures)
  Used: ELO numbers, scores, timers, code, API responses
```

### Type Scale

```
Hero statement:     72px / Clash Display 800 / -0.04em lh: 1.0
Page title:         48px / Clash Display 700 / -0.03em lh: 1.1
Section heading:    32px / Inter 700         / -0.02em lh: 1.2
Card title:         20px / Inter 600         / -0.01em lh: 1.3
Body text:          15px / Inter 400         / 0        lh: 1.6
Caption:            12px / Inter 500         / 0.02em   lh: 1.5
Label/badge:        11px / Inter 700         / 0.06em   lh: 1.4 (uppercase)
ELO number (large): 40px / JetBrains Mono 800/ 0        lh: 1.0
ELO number (small): 18px / JetBrains Mono 700/ 0        lh: 1.0
Score display:      28px / JetBrains Mono 800/ 0        lh: 1.0
Timer:              16px / JetBrains Mono 600/ 0.04em   lh: 1.0
Monospace pull quote: italic Playfair Display — hero moments only
```

---

# 4. Background and Depth

## Depth Layer System

Capabilio uses a **5-layer depth system**. Every element lives at a defined depth. This creates spatial coherence — not random floating.

```
Layer 0 — VOID       (#04060D)  — page background, absolute base
Layer 1 — ATMOSPHERE (gradient) — ambient color per path, sits above void
Layer 2 — SURFACE    (#0C1220)  — primary content area, main panels
Layer 3 — RAISED     (#111827)  — cards, section containers
Layer 4 — FLOAT      (#1A2235)  — hover states, active cards, modals backdrop
Layer 5 — GLASS      rgba(255,255,255,0.06) + blur — floating overlays, dropdowns
```

### 3D Depth Cues

Not literal 3D — but illusions of depth through:

1. **Layered cards**: cards cast `box-shadow: 0 4px 20px rgba(0,0,0,0.5)`, stack slightly with perspective
2. **Atmospheric radial gradients**: glow effects radiating from behind key elements — ELO badge, challenge card, hero area
3. **Staggered entry animations**: elements enter at different vertical offsets, creating perceived depth on scroll
4. **Frosted glass overlays**: modals and drawers use `backdrop-filter: blur(20px)` on Layer 5
5. **Subtle noise texture**: `0.02 opacity noise` overlay on dark surfaces adds perceived depth without visible grain

### Arena Background — Special Treatment

The Arena workspace background is distinct:

```css
.arena-bg {
  background: 
    radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.2) 0%, transparent 50%),
    radial-gradient(ellipse at 0% 100%, rgba(59,130,246,0.1) 0%, transparent 40%),
    url("data:image/svg+xml,...") /* subtle grid pattern, 5% opacity */,
    #04060D;
}
```

The grid pattern (lines at 40px intervals, 4% opacity) gives the Arena the feel of a technical console — engineering precision, not a lesson platform.

---

# 5. Component System

## 5.1 Card System — 4 Types

### Type A: Data Card (most common)
```
Background: --bg-raised (#111827)
Border: 1px solid rgba(255,255,255,0.08)
Border radius: 16px
Padding: 20px 24px
Shadow: --shadow-md
Hover: border → rgba(255,255,255,0.14), translateY(-2px), --shadow-lg
Transition: 250ms --ease-out

Internal structure:
  - Section label: 10px Inter 700 uppercase tracking-widest, muted color
  - Primary value: JetBrains Mono 700 or Clash Display 600
  - Supporting text: 13px Inter 400 --text-secondary
  - Optional bottom row: badge + action link
```

### Type B: Glass Card (hero, modals, floating panels)
```
Background: rgba(255,255,255,0.06)
Border: 1px solid rgba(255,255,255,0.12)
Border radius: 20px
Backdrop filter: blur(20px) saturate(180%)
Shadow: 0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset
Hover: background → rgba(255,255,255,0.09), border → rgba(255,255,255,0.18)
```

### Type C: Mission Card (Arena challenges)
```
Background: linear-gradient(135deg, --bg-raised, --bg-float)
Border-left: 3px solid [difficulty color]
Border: 1px solid rgba(255,255,255,0.08)
Border radius: 16px
Has: company name, challenge title, workstation badge, ELO gain, timer
Hover: glowing left-border pulse, scale(1.02), full-glow shadow
Active: pulsing ring animation on border-left
```

### Type D: Proof Card (artifacts)
```
Background: --bg-raised with subtle gradient overlay
Border: 1px solid rgba(99,102,241,0.2) — indigo tint
Border radius: 12px
Left accent line: 3px solid --brand-primary (indigo)
Has: timestamp, score in JetBrains Mono, company chip, domain badge, feedback excerpt
Hover: left accent brightens, score glows indigo
```

---

## 5.2 Button System

```
PRIMARY
  bg: linear-gradient(135deg, #6366F1, #8B5CF6)
  text: #FFFFFF, Inter 600 14px
  padding: 0 24px, height: 44px
  radius: 12px
  shadow: 0 4px 16px rgba(99,102,241,0.4)
  hover: brightness(1.1), shadow grows
  active: scale(0.97)
  disabled: opacity 0.4, no shadow

SECONDARY
  bg: rgba(99,102,241,0.12)
  border: 1px solid rgba(99,102,241,0.3)
  text: #A5B4FC (indigo-300)
  hover: bg → rgba(99,102,241,0.20), border brighter

GHOST
  bg: transparent
  border: 1px solid rgba(255,255,255,0.12)
  text: --text-secondary
  hover: bg → rgba(255,255,255,0.06), border → rgba(255,255,255,0.20)

DANGER
  bg: rgba(244,63,94,0.12)
  border: 1px solid rgba(244,63,94,0.25)
  text: #FB7185
  hover: bg → rgba(244,63,94,0.20)

GOLD (ELO/Arena CTA)
  bg: linear-gradient(135deg, #F59E0B, #D97706)
  text: #0C1220 (dark text on gold)
  shadow: 0 4px 16px rgba(245,158,11,0.35)
```

---

## 5.3 Badge System

```
TIER BADGE (ELO tier display)
  Shape: pill — padding 4px 12px
  Font: Inter 700 11px uppercase tracking-widest
  Variants:
    Beginner:   bg rgba(100,116,139,0.15), text #94A3B8 (slate)
    Learning:   bg rgba(245,158,11,0.12),  text #FCD34D (amber)
    Building:   bg rgba(59,130,246,0.12),  text #93C5FD (blue)
    Rising:     bg rgba(99,102,241,0.15),  text #A5B4FC (indigo)
    Advanced:   bg rgba(139,92,246,0.15),  text #C4B5FD (violet)
    Expert:     bg rgba(245,158,11,0.20), text #F59E0B + glow (gold)

SURGE BADGE (skill gaps)
  bg: rgba(244,63,94,0.15)
  text: #FB7185
  prefix: ▲ icon in rose
  font: JetBrains Mono 10px

VERIFIED BADGE
  Tier 3 Cert: gold border, "✓" checkmark, "Cert Verified" label
  Tier 4 Arena: indigo glow, "⚡ Proven" label
  Tier 5 Peer: violet glow, "◈ Peer Reviewed" label

WORKSTATION BADGE (Arena)
  Shape: rounded square 6px
  bg: rgba(path-color, 0.15)
  text: path-color tint
  icon: workstation icon SVG 12px
  examples: [⊞ SQL Lab], [⬡ Notebook], [⟁ Infra Terminal]
```

---

## 5.4 Skill Bar System

```css
/* Skill bars — 3 line heights for different contexts */
.skill-bar-lg { height: 8px; border-radius: 4px; }  /* Aura skills tab */
.skill-bar-md { height: 5px; border-radius: 999px; } /* Gap analysis */
.skill-bar-sm { height: 3px; border-radius: 999px; } /* Compact card */

.skill-bar-track { background: rgba(255,255,255,0.08); }

/* Fill colors */
.fill-strong  { background: linear-gradient(90deg, #10B981, #34D399); } /* >70% */
.fill-mid     { background: linear-gradient(90deg, #F59E0B, #FBBF24); } /* 40-70% */
.fill-weak    { background: linear-gradient(90deg, #F43F5E, #FB7185); } /* <40% */

/* Animation */
.skill-bar-fill {
  transition: width 900ms cubic-bezier(0,0,0.2,1);
  /* animate from 0 on mount */
}
```

---

## 5.5 ELO Badge (Header)

The ELO badge is the most important persistent UI element. It should feel premium.

```css
.elo-badge {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px;
  background: rgba(245,158,11,0.12);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 9999px;
}
.elo-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px; font-weight: 800;
  color: #F59E0B;
  letter-spacing: 0;
}
.elo-label {
  font-size: 10px; font-weight: 700;
  color: rgba(245,158,11,0.6);
  letter-spacing: 0.06em; text-transform: uppercase;
}

/* Post-submission glow animation */
@keyframes eloPulse {
  0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.5); }
  50%  { box-shadow: 0 0 20px 4px rgba(245,158,11,0.3); }
  100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
}
.elo-badge.updated { animation: eloPulse 1.5s ease-out; }
```

---

# 6. Navigation System

## New Navigation Architecture

The current 3-layer nav is preserved in function but radically elevated in form.

### Layer 1 — App Rail (Left sidebar, desktop)

Replace the horizontal top tabs with a **left icon rail** on desktop (1024px+):

```
Width: 64px (collapsed) → 220px (expanded on hover)
Background: rgba(8,12,24,0.95) + backdrop-filter blur(20px)
Border-right: 1px solid rgba(255,255,255,0.06)

Items from top:
  [Logo] → link to home
  ——— (divider)
  [✦] Aura         — sparkle icon
  [⚔] Arena        — sword icon
  [📡] Pulse       — signal wave icon
  [◈] Skill Studio — grid icon
  [⌖] Launchpad    — target icon
  ——— (spacer, flex)
  [ELO badge]
  [Avatar]

Collapsed state: shows icons only
Expanded state: slides out to 220px, shows icon + label
Active state: left accent bar (3px indigo), icon glows

Mobile: transforms to bottom tab bar (5 items max)
```

### Layer 2 — Top Content Bar

A horizontal bar at top of the content area (not the app shell):

```
Height: 56px
Background: --bg-raised with subtle border-bottom
Content: page title left + tab pills center/right + action buttons right

Tab pills style:
  Inactive: bg transparent, text --text-muted
  Active: bg rgba(99,102,241,0.15), text --text-primary, border-bottom 2px indigo
  Hover: bg rgba(255,255,255,0.05)
  Transition: 200ms
```

### Layer 3 — Page-level tabs

Same as current but styled with the pill/underline system above.

### Navigation Behavior Rules (from ui-ux-pro-max)

1. Bottom nav on mobile ≤ 5 items, always icon + label
2. Active nav state: visually distinct — indigo left-accent on rail, highlighted pill on top bar
3. Back navigation always predictable — never silently resets
4. Deep links supported for all key screens
5. State preserved on navigation (scroll position, filter state, tab selection)

---

# 7. Path-by-Path Redesign

## 7.1 Path Selector — The Gateway

This is the user's first branded moment. It must feel like entering a world.

### Visual Design

**Full viewport, dark atmospheric.** Background uses the `atm-student` gradient as default, shifting as you hover each card.

```
Layout: Centered, max-width 900px, padding 80px vertical

Above cards:
  Eyebrow: "CHOOSE YOUR PATH" — 10px Inter 700 uppercase tracking-widest, indigo, centered
  Headline: 56px Clash Display 800 "What kind of career move is this?" —text-primary
  Subhead: 16px Inter 400 "Capabilio adapts to where you are." --text-muted

Cards: 2×2 grid, gap 16px
  Each card: 380×220px, Type B (glass), with path-specific atmospheric shift on hover
  Background shifts to path atmosphere color on hover (e.g. hover student → indigo glow deepens)
  Card anatomy:
    Top-left: path icon (28px SVG) in colored circle (40×40px rounded-lg)
    Top-right: subtle arrow (→) appears on hover
    Bottom: path name in 22px Inter 700 + 1-line description in 14px --text-muted
    Border-left: 3px solid path-color (appears on hover/selected)
  Selected state: bordered, glowing, scale(1.02), check icon top-right

Footer: "Already have an account? Sign in →"
```

### Background on Hover

```js
// JavaScript: change page atmosphere on card hover
const atmospheres = {
  student:      'rgba(99,102,241,0.15)',
  professional: 'rgba(139,92,246,0.15)',
  executive:    'rgba(245,158,11,0.12)',
  org:          'rgba(6,182,212,0.12)',
}
// Animate background gradient on hover via CSS custom property
```

---

## 7.2 Student Home Dashboard

### Visual Concept: "The Launch Pad"

Electric energy. Forward momentum. The student is building toward something and the UI makes that tangible.

### Layout — Bento Grid

```
Overall: atmosphere-student background, left rail nav, 16px grid gap
Max content width: 1200px

Bento grid (4 columns, responsive → 2 → 1):

Row 1 — Hero Row:
  [Greeting + Goal Card]         [2 cols × 1 row] — large
  [ELO Live Card]               [1 col × 1 row]
  [Streak + Tier Card]          [1 col × 1 row]

Row 2 — Mission Row:
  [Today's Mission CTA]         [4 cols × 1 row] — full width gradient banner

Row 3 — Activity Row:
  [Skill Graph mini radar]      [1 col × 2 rows]
  [Recent Proof artifacts list] [2 cols × 2 rows]
  [Quick Actions grid]          [1 col × 2 rows]

Row 4 — Intelligence Row:
  [Recommended next skill]      [2 cols × 1 row]
  [Market alert (top gap)]      [2 cols × 1 row]
```

### Key Widgets

**Greeting + Goal Card** (Type B glass):
```
Large, leftmost. Background: glass over atmospheric indigo glow.
Top: "Good morning, Riya" — 13px Inter 500 --text-muted
Headline: "What's your move today?" — 32px Clash Display 700
Progress indicator: thin indigo bar showing week progress (3/5)
CTA button: gold "Start Today's Arena →"
```

**ELO Live Card** (Type A with gold treatment):
```
Center-top. Very prominent.
ELO number: 48px JetBrains Mono 800 #F59E0B
Label: "ELO" 10px uppercase muted
Delta: "+34 this week" in 12px Inter 600 emerald
Below: 30-day sparkline — thin gold line, subtle
Bottom: tier badge
Hover: gold glow intensifies
```

**Today's Mission Banner** (full-width gradient):
```
Background: linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))
Border: 1px solid rgba(99,102,241,0.3)
Left: mission context ("Today · Data Analyst · 3 challenges waiting")
Center: animated entrance for 3 difficulty pills: Easy / Medium / Hard
Right: "Enter Arena" button — gold gradient, prominent
```

---

## 7.3 Professional Home Dashboard

### Visual Concept: "The War Room"

Calmer energy than Student. Violet atmosphere. Data-dense, strategy-forward. Less "daily challenge", more "repositioning intelligence".

### Layout

```
Atmosphere: violet-indigo gradient, slightly darker than student
Layout: sidebar nav + main content area, less bento/more structured

Top section (hero):
  Large split layout:
    Left 60%: Profile summary card — name, current role → target role,
              ELO (starting at 620+), "74% market-ready for Senior Backend"
              AI-generated positioning statement in italic serif
    Right 40%: Skill radar chart (octagonal, violet fill)

Middle section:
  3-column layout:
    Col 1: Gap analysis summary (top 3 critical gaps, mini bars)
    Col 2: Proof activity feed (recent submissions)
    Col 3: Career trajectory (ELO over time line chart)

Bottom section:
  2-column:
    Left: "Your next moves" — Skill Studio phase progress card
    Right: Launchpad preview — 2 matched job teasers
```

**Key Difference from Student**: The professional home shows *strategy*, not just *tasks*. Less about "complete a challenge today", more about "here's your repositioning progress."

---

## 7.4 Executive Home Dashboard

### Visual Concept: "The Command Bridge"

Deep, warm atmosphere (gold/amber). Fewer elements, more gravitas. Large typography. Strategic framing.

### Layout

```
Atmosphere: amber gradient, warmest feeling
Layout: clean 2-column with large whitespace — not cramped

Top: Authority Profile card — full width, cinematic
  Cover strip: 200px height gradient (amber-to-transparent)
  Avatar overlapping: 80×80px circular
  Name: 40px Clash Display 800
  Title, company, "Domain Expert"
  Stats row: ELO (800+) | Papers/Reports | "Outcomes" count
  "Your Aura is publicly visible" toggle

Below: 2-column authority grid
  Left: Case Study Arenas (Executive-specific challenges)
  Right: Strategic Skill Positioning (domain authority map)

Bottom: Network & Signal
  Left: Signal Rooms (peer network activity)
  Right: Board/Advisory opportunities (Launchpad senior mode)
```

---

## 7.5 Organization Home Dashboard

### Visual Concept: "The Intelligence Ops Center"

Cyan/teal atmosphere. Most data-dense of all paths. Clean tables, skill heat maps, team intelligence.

### Layout

```
Atmosphere: cyan-teal gradient
Layout: metric-heavy dashboard, less decorative

Top: 4 stat cards (Team Size / Avg ELO / Proof Count / Open Roles) — compact, tabular

Main: Skills Heat Map — full width
  X-axis: skills (SQL, Python, Cloud, System Design)
  Y-axis: team members
  Cells: colored by score (green/amber/red scale)
  Summary row: "Team avg 54% — 2 skills below market threshold"
  Red flag cells: slightly glowing red border

Side panel: Active hiring pipelines summary

Bottom: Recent team activity feed + Action buttons
  "Deploy Challenge" | "View Market Benchmarks" | "Export Report"
```

---

# 8. Arena Redesign

## Concept: "The Execution Environment"

Arena should feel like a **professional execution environment** — not a learning portal, not a game. Like the real tools engineers, analysts, and designers use — but with Capabilio's brand layer.

## Arena Homepage

### Background Treatment

```css
.arena-shell {
  background:
    radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.20) 0%, transparent 50%),
    url('/grid-pattern.svg') repeat,   /* 40px grid lines, 3% opacity */
    #04060D;
}
```

The grid pattern is subtle — barely visible. It signals "technical precision" without looking like graph paper.

### Mission Card Redesign

```
Mission cards: 3 across (Easy/Medium/Hard)
Size: 340px wide, height flexible (min 200px)
Background: Type C (Mission Card) — dark gradient with left border

Layout:
  Top bar: difficulty badge + company name right
  Company name: 12px Inter 600 --text-muted (e.g. "SWIGGY")
  Challenge title: 18px Inter 700 --text-primary (2 lines max)
  Scenario excerpt: 13px Inter 400 --text-muted (2 lines, truncated)
  ————
  Workstation badge: [SQL Lab] or [Notebook] chip
  Bottom row: time (⏱ 40m) | ELO gain (+18 ELO) | [Start →] button

Difficulty colors:
  Easy:   green  (#10B981) left border + glow on hover
  Medium: amber  (#F59E0B) left border + glow on hover
  Hard:   rose   (#F43F5E) left border + glow on hover + small "HOT" indicator

Hover state:
  Card lifts: translateY(-4px)
  Left border intensifies and pulses
  Ambient glow radiates from behind the card
  [Start →] button brightens to gold gradient
```

### Workstation Grid (below mission cards)

```
"YOUR WORKSTATIONS" section — shows all 18 workstations
Presented as a bento grid: 6 columns on desktop

Each workstation tile: 140×100px
  Background: --bg-raised with domain-color tint (2% opacity)
  Icon: 24×24px SVG, colored with domain key
  Label: 11px Inter 600, --text-secondary
  On hover: scale(1.04), glow, domain color border
  If user has completed challenges here: green dot top-right
  If never used: "NEW" badge

Workstation domain-color mapping:
  SQL Lab:       cyan      (#06B6D4)
  Notebook Lab:  emerald   (#10B981)
  Frontend:      blue      (#3B82F6)
  Backend/API:   indigo    (#6366F1)
  Infra Terminal:amber     (#F59E0B)
  Cloud Arch:    sky       (#0EA5E9)
  Security:      rose      (#F43F5E)
  SOC Console:   orange    (#F97316)
  AI/LLM Studio: violet    (#8B5CF6)
  System Design: lavender  (#A78BFA)
```

---

## Arena Challenge Shell — Workspace Layout

This is the most important screen in the product. It must feel like a real professional tool.

### Overall Layout (Desktop 1440px)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR (56px, --bg-raised, border-bottom glass)                            │
│ [← Arena] [Challenge Title] [Company Chip] [Diff Badge] ···· [⏱ 31:22] [Submit] │
├──────────────────────────┬─────────────────────────────────────────────────┤
│  LEFT PANEL (380px)      │  RIGHT PANEL (flex)                             │
│  --bg-raised             │  Dark editor/workstation area                   │
│                          │                                                 │
│  [Brief | Schema | Hints]│  [Monaco Editor or Workstation Component]       │
│  ─────────────────────── │                                                 │
│  Company logo + name     │  ┌──────────────────────────────────────────┐  │
│  Scenario text           │  │ SQL:   Dark editor, syntax-highlighted   │  │
│  ─────────────────────── │  │ Python: Cell-based notebook              │  │
│  Task description        │  │ React:  Split live preview               │  │
│  ─────────────────────── │  │ YAML:   Editor + validation sidebar      │  │
│  Expected output box     │  └──────────────────────────────────────────┘  │
│                          │                                                 │
│  [💡 Get Hint]           │  OUTPUT / RESULTS PANEL (below editor)          │
│                          │  Resizable: drag handle                         │
│                          │  Tabs: [Results] [Console] [Plan] [Feedback]    │
│                          │                                                 │
│                          │  [▶ Run]  [✓ Submit]  [↺ Reset]                │
└──────────────────────────┴─────────────────────────────────────────────────┘
```

### Topbar Details

```
Background: --bg-raised, border-bottom 1px solid rgba(255,255,255,0.08)

Back arrow: [← Arena] ghost button
Title: 16px Inter 600 --text-primary
Company chip: rounded pill, company color accent
Difficulty: colored badge (Easy/Medium/Hard)

Spacer (flex-1)

Timer: JetBrains Mono 16px
  > 10min: --text-secondary
  5-10min: #F59E0B (amber)
  < 5min:  #F43F5E (rose) + pulse animation

Submit: Gold gradient button "✓ Submit"
  Disabled until first Run: opacity 0.4
```

### Post-Submission Overlay

```
When submitted: workstation dims to 30% opacity
A glass overlay panel slides up from bottom (60% height):

  Score: large animated count-up → final score
  Score ring: circular progress indicator, colored by score
  ELO gained: "+16 ELO" in gold with pulse animation
  Tier badge: if tier changed → "↑ Rising Tier" celebration flash

  Feedback box: dark card with AI feedback text
    Strengths in green, improvements in amber

  Action row:
    [View Proof Artifact] [Retry] [Back to Arena]

Background: radial glow from score color (green/amber/rose)
```

### Editor Themes Per Workstation

| Workstation | Editor Theme | Key Visual |
|------------|-------------|-----------|
| SQL Lab | VS Dark+ custom | Blue keywords, teal strings |
| Notebook Lab | Dracula | Colorful Python syntax |
| Frontend | One Dark Pro | JSX with purple tags |
| Infra Terminal | Pure black + green text | Terminal aesthetic |
| System Design | Canvas (no code editor) | White nodes on dark grid |
| AI/LLM Studio | Minimal dark | Prompt/response diff view |
| Security Console | Matrix-green on black | LOG VIEWER mode |

---

# 9. Skill Studio Redesign

## Concept: "The Training Room"

Darker than the dashboards but warmer than Arena. It should feel focused and disciplined — like a personal training session.

### Learning Path View

```
Left sidebar (260px): Phase navigation
  Each phase: number circle + phase title + completion ring
  Active phase: indigo ring, full color
  Completed: check circle emerald
  Locked: grey, lock icon

Main content area:
  Phase header: large title + duration badge + "Closes [gap name] gap" chip
  Progress bar: thin indigo, shows completion %

Action cards list (vertical timeline):
  Each action: horizontal card with left icon
    📚 Learn:    indigo icon, "15 min read" label
    🏋 Practice: amber icon, "Interactive exercises" label
    ⚔ Prove:    rose icon, "Arena: [challenge name]" label
    ✓ Complete: emerald check, strikethrough title

  Action card anatomy:
    Left: 40×40px icon circle (colored per type)
    Middle: action title (16px Inter 600) + skill chip + duration
    Right: XP reward badge ("+ 80 XP") + status (Locked/Active/Done)
    Locked: dimmed, lock overlay

Right sidebar (280px):
  Skills covered: colored chips
  ELO gain estimate: gold badge "+45 ELO"
  Completion ring: large, animated
  Next milestone: text description
```

### Lesson View

```
Max-width: 720px, centered, generous whitespace
Background: --bg-base (slightly lighter than deep dark)

Header:
  Breadcrumb path (small, muted)
  Progress: "Lesson 2 of 4 · 12 min"
  Title: 36px Clash Display 700 --text-primary

Content:
  Body text: 15px Inter 400, line-height 1.7, --text-secondary
  Code blocks: JetBrains Mono 13px, --bg-void bg, syntax highlighted
               Left border: 3px solid domain-color
               Copy button top-right

  Key Points callout:
    Background: rgba(99,102,241,0.08)
    Border-left: 3px solid --brand-primary
    Title: "Key Points" indigo 11px uppercase
    List items: 14px Inter 500

Mini quiz (in-lesson):
  Each question: glass card, clean options
  Selected option: indigo border + checkmark if correct
  Wrong: rose border + explanation text
  Correct: emerald sparkle animation

Bottom CTA:
  "Mark Complete + Continue →" — indigo gradient button
  Full width on mobile
```

---

# 10. Aura Redesign

## Concept: "The Identity Mirror"

Aura should feel like looking at yourself in a premium lens. Your skills rendered clearly, your gaps visible without judgment, your proof on display.

### Aura Header / Hero Zone

```
Full-width cover strip: 220px height
  Background: user's cover photo OR generated gradient from their domain color + username hash
  Gradient overlay: linear bottom-to-transparent

Profile row (overlapping cover):
  Avatar: 96×96px circular, 3px border solid domain-color, shadow-lg
  Name: 36px Clash Display 700 --text-primary
  Role + city: 15px Inter 500 --text-muted
  ELO + Tier badge: gold pill
  Proof count: indigo pill ("28 Proofs")
  Availability toggle: "Open to opportunities" → teal when on
  Share + Edit buttons: ghost style right-aligned

Below hero: public portfolio URL
  "capabilio.in/p/riya-sharma" — small, monospace, copyable
```

### Skills Tab — Redesigned

```
Layout: 3-column on desktop (radar | bars | metadata)

Left (35%): Skill Radar
  Dark background, octagonal chart
  Filled polygon: domain-color at 15-20% opacity
  Stroke: domain-color at 70% opacity
  Axis labels: 11px Inter 500 --text-muted
  Center label: "Skill Graph" 10px uppercase

Center (40%): Skill Bars
  Scrollable list
  Each skill: 
    Name 14px Inter 600 + score JetBrains Mono 14px right
    Bar: 5px height, colored fill (green/amber/red by score threshold)
    Source badge: tiny chip (arena / assessment / manual)
    Domain badge: subtle chip for skill category
  Grouped by score (descending)

Right (25%): Skill Metadata
  "Top Skills" section: 3 chip items
  "Skill Sources" breakdown: donut chart (arena vs assessment vs manual)
  "Last Updated" timestamp
  [Assess My Skills] button — primary indigo
  [Run Gap Analysis] button — secondary
```

### Skill Gaps Tab — Redesigned

```
Full content area, dark + atmospheric

Market Overview card (Type A, full-width):
  Label: "📡 REAL-TIME MARKET INTELLIGENCE" 10px uppercase indigo
  Market headline: 15px Inter 500 --text-secondary
  Readiness bar:
    Track: rgba(255,255,255,0.08), 8px height, rounded
    Your fill: animated, colored by readiness %
    Threshold line: white 2px vertical line at 81% position
    Labels: "You: 17%" left, "Market: 81%" right (JetBrains Mono)
  Metric row: "⏱ 8w to competitive" + "🎯 Top Action" card

Three-column gap grid:
  Cards: Type D (Proof Card treatment for gaps)
  Each gap item redesign:
    Surge badge (if surge): rose pill with ▲ icon and %
    Skill name: 16px Inter 700
    Bars: "You" vs "Market needs" comparison — 2 bars, labeled
    Gap indicator: "Gap: 81 pts — 4w to close" rose text
    Reason text: 13px Inter 400 muted (expandable with "Show more")
    Learn button: small secondary "[→ Studio]"
```

### Resilience Tab — Redesigned

```
Top section: 4 stat tiles (Resilience Score / Attempted / Failed / Recovered)
  Each tile: Type A card, number in JetBrains Mono 800
  Resilience score: ring progress indicator (animated)

Resilience bar: full-width animated fill

Two columns:
  Left: "Failure Timeline" — compact list cards
    Each failure: score badge (red number) + challenge title + feedback excerpt
    Hover: expand to full feedback
    "Retry" button on each

  Right: "Recovery Pattern" — line chart
    Score over time, showing failure dips and recovery climbs
    Failure points: rose dots; Recovery highs: emerald dots
    Chart style: thin indigo line, minimal grid, no clutter
```

---

# 11. Launchpad Redesign

## Concept: "The Signal Board"

Like a departure board at an airport — it shows you exactly where you can go and what's ready. Clear, urgent, decisive.

### Readiness Check Section

```
Top section: "Role Readiness" — personalized card
  Background: glass over amber/indigo gradient mix
  Role: "Data Analyst" in 24px Clash Display
  Readiness: large ring progress (74%), colored by level
  Below ring: 4 checklist items (ELO / Proofs / Top Skill / Profile)
    Each: icon + text + status badge (✓ Met / ⚠ Partial / ✗ Missing)
  CTA: if ready → "Go Live to Recruiters" (gold button)
       if not → "See What's Missing" (secondary)
```

### Job Match Cards

```
Layout: 2-column grid (or 1-column mobile)

Job card anatomy:
  Type A with left accent in company brand color (approx)
  Top: company name + company logo placeholder + role title
  Mid: salary range (₹ format) + city + posted date
  Skill match row: 3-4 skill chips colored green (match) / amber (partial) / grey (missing)
  Bottom: "ELO Required: 480+" badge + Match % badge (92% match)
  CTA: [View] ghost + [Apply] indigo button (right-aligned)

Match % badge:
  >85%: emerald pill
  70-85%: amber pill
  <70%: rose pill

Sort/Filter strip:
  Pill filters: [All] [Best Match] [ELO Eligible] [Remote] [Bengaluru]
  Search input: clean, dark, borderless on desktop
```

### "Open to Opportunities" Toggle Section

```
Full-width card at top when toggle is OFF:
  Title: "You're currently invisible to recruiters"
  Sub: "Turn on Discoverable mode to let companies find you"
  Toggle: large, labeled, animated (green when on)
  Status: last time profile was viewed (if any)

When ON:
  Title: "Your profile is live to recruiters"
  Stats: "Viewed 4 times this week" + "2 pipeline requests"
  Quick stat: "You rank #3 in Bengaluru for Data Analysts with SQL >70%"
```

---

# 12. Recruiter Experience

## Concept: "The Talent Intelligence Platform"

Recruiters are enterprise users. Their experience should feel like a professional B2B product — Notion meets Linear meets a talent database.

### Recruiter Dashboard Layout

```
Left sidebar (280px): persistent filters + pipeline summary
Main area: candidate grid + detail drawer

Sidebar:
  Header: org name + plan badge
  ——
  "Search Talent" section:
    Role input (autocomplete)
    ELO slider: min → max range
    Skills multi-select (with checkboxes)
    City dropdown
    Availability toggle ("Open to opportunities only")
  ——
  "Active Pipelines" section:
    Each pipeline: title + candidate count + stage
    [+ New Pipeline] button
  ——
  "Team Benchmarks" CTA

Main grid:
  Candidate cards (3 per row desktop, 2 tablet, 1 mobile)
  Sort bar: Best Match / ELO / Proof Count / Last Active
  Result count: "34 candidates match"
```

### Candidate Card (Recruiter View)

```
Type A card: 340×180px

Header row:
  Avatar (40×40px) + Name (16px Inter 600) + ELO badge (gold, right)

Skill bars section (3 skills):
  Skill name 12px + colored bar 3px + score JetBrains Mono 12px

Footer row:
  Proof count: "14 proofs" — indigo pill
  Last active: "3 days ago" — muted text
  Domain: "Data Analyst" — subtle chip

Hover state:
  Card lifts, indigo glow border
  Two buttons appear:
    [View Profile] ghost + [+ Add to Pipeline] primary indigo
```

### Candidate Profile Full View (Drawer)

```
Opens as a right drawer (560px width) over the search results:

Drawer header: profile card (same as Aura header, recruiter version)
  Note: NO cover photo drag controls, read-only mode

Tabs: [Overview] [Proof Portfolio] [Skills] [Experience]

Overview tab:
  Positioning statement (AI-generated)
  Role readiness %
  Top 3 skills (large bars)
  Most recent proof (date, score, challenge)
  Contact / Pipeline buttons

Proof Portfolio tab:
  Filterable list
  Each proof:
    Challenge title + Company chip + Workstation badge
    Score (JetBrains Mono, colored) + ELO gained
    Timestamp + "View Code" + "View Feedback" buttons
    Feedback excerpt (1 line, expand on click)
  Filter pills: [All | SQL | Python | Data Viz | ...]
```

---

# 13. Proof and Portfolio

## Concept: "The Work Record"

The proof portfolio is Capabilio's most radical idea made visual: replacing résumé claims with timestamped execution records.

### Proof Timeline (Aura → Career & Vault)

```
Full-width vertical timeline view (or switch to grid view)

Timeline header:
  "32 Proofs · 6 months · Data Analyst" stats row
  Filter pills: [All | Passed | Failed | By Domain]
  [Grid View] / [Timeline View] toggle

Timeline mode:
  Left: thin vertical line (indigo at 20% opacity), 16px from left
  Each node: small circle (8px) on the line, colored by score
  Date header: "June 2024" sticky month label

  Proof card (expands from node):
    Type D card, pulled right of the timeline
    Left accent: 3px solid [score color]
    Score: JetBrains Mono 28px [color based on score]
    Title + company + domain badge row
    ELO gained: "+16 ELO" gold
    Feedback excerpt (1-2 lines)
    [View Full] expand arrow

Failed proofs:
  Node: rose outline circle (not filled)
  Card: rose tint, "Retry Available" badge

Grid mode:
  Same cards in a responsive grid
  More compact, better for scanning many proofs
```

### Public Portfolio Page (external URL)

```
/p/riya-sharma — public, no auth needed

Page layout:
  Top: cover + avatar + name + ELO + domain
  Hero statement: AI-generated 2-sentence positioning blurb
  Skill graph section: radar + top 5 bars
  Proof portfolio: grid of proof cards (public ones only, score ≥ 50)
  Experience timeline: verified experiences only
  Call to action for recruiter: "Contact Riya" button (route to recruiter tool)

Design: matches Aura aesthetic but lighter touch — accessible to non-Capabilio users
No left nav rail. Simple centered layout with header.
```

---

# 14. Verification and Trust

## Concept: "The Trust Audit Trail"

Each verification badge tells a story. The UI makes the trust hierarchy immediately legible.

### Badge Visual System

```
Tier 0 — Unverified: no badge, grey placeholder
Tier 1 — Self-Claimed:
  Shape: small pill
  bg: rgba(100,116,139,0.15) — slate
  text: #94A3B8
  icon: • dot (filled circle)
  label: "Self-Claimed"

Tier 2 — Document Verified:
  bg: rgba(59,130,246,0.15) — blue
  text: #93C5FD
  icon: ◻ document icon
  label: "Doc Verified"

Tier 3 — Cert Verified:
  bg: rgba(245,158,11,0.15) — gold
  text: #FCD34D
  icon: ★ filled star
  label: "Cert Verified"
  glow: 0 0 12px rgba(245,158,11,0.25)

Tier 4 — Arena Proven:
  bg: rgba(99,102,241,0.15) — indigo
  text: #A5B4FC
  icon: ⚡ bolt (SVG)
  label: "Arena Proven"
  glow: 0 0 12px rgba(99,102,241,0.25)

Tier 5 — Peer Reviewed:
  bg: rgba(139,92,246,0.15) — violet
  text: #C4B5FD
  icon: ◈ diamond
  label: "Peer Reviewed"
  glow: 0 0 16px rgba(139,92,246,0.30)
```

### Verification Flow UI

```
Step-by-step wizard — 3 steps

Progress: horizontal steps (not dots) — Step 1 (✓) → Step 2 (▶) → Step 3 (–)
  Completed steps: emerald filled circle
  Active step: indigo filled + ring
  Locked step: grey

Step 2: Certification
  Provider grid: 5 cards (AWS / GCP / Microsoft / Salesforce / CompTIA)
    Each: 120×80px card, provider logo + name
    Selected: indigo border glow
  Input: ID field + "Verify Certificate" button
  Success state:
    Card transforms: border → emerald, background tints green
    ✓ animation: checkmark scales in with spring
    Gold ★ badge preview floats in from right
    "Added to Aura" confirmation text
```

---

# 15. Screen-by-Screen Mockup Descriptions

> Each screen below includes: layout architecture, background treatment, dominant visual element, motion behavior, and what makes it feel premium.

---

### Screen A: Path Selector

```
BACKGROUND: Full dark (#04060D) with atmospheric gradient shifting per hover
DOMINANT ELEMENT: 2×2 card grid centered, floating in dark space
MOTION: On card hover → background gradient transitions to path color (400ms ease-out)
        Card scales up 1.02×, left border slides in, arrow appears
PREMIUM FEEL: The entire page feels like it responds to you — the atmosphere changes
DATA: No data needed, purely presentational
```

---

### Screen B: Student Home

```
BACKGROUND: Deep navy with indigo radial glow top-left
DOMINANT ELEMENT: ELO card (gold glow) + Today's Mission banner (indigo gradient strip)
MOTION: Bento cards stagger in on load (40ms delay each), ELO count-up on mount
PREMIUM FEEL: Gold ELO pulse, skill bars animate in, cards have depth via shadow
DATA DENSITY: Medium — key stats visible without scroll
```

---

### Screen C: Arena Homepage

```
BACKGROUND: Near-void (#04060D) with subtle 40px grid pattern + indigo top glow
DOMINANT ELEMENT: 3 Mission cards center-stage — they are the focal point
MOTION: Cards hover → left border glow, scale(1.02), glow behind card
        "Enter Arena" → cinematic zoom-in entrance to workspace
PREMIUM FEEL: The grid background, the glowing cards, the dark atmosphere — it
              feels like a real operations center, not a quiz platform
DATA DENSITY: Medium-low on homepage; high inside workspace
```

---

### Screen D: SQL Lab Challenge

```
BACKGROUND: Left panel --bg-raised (neutral dark); Right panel --bg-void (absolute dark)
DOMINANT ELEMENT: Monaco editor — syntax-highlighted SQL code, white text on black
MOTION: Timer pulses red below 5min; Post-submit overlay slides up (spring easing)
        Score counts up from 0 with a slight bounce
PREMIUM FEEL: The contrast between the warm left panel and the cold dark editor
              creates visual depth. The timer creates pressure. Score reveal feels
              like an awards moment.
DATA DENSITY: High inside the workspace — schema, editor, results visible simultaneously
```

---

### Screen E: Skill Gap Analysis

```
BACKGROUND: Atmosphere color per path + dark base
DOMINANT ELEMENT: 3-column gap grid — Red / Amber / Green visual split
MOTION: Gap bars animate in from left simultaneously on tab open (900ms ease-out)
        Market threshold line slides in from right after bars settle
PREMIUM FEEL: The bars animate in like a synchronized reveal — urgent, data-driven.
              The red/amber/green column visual creates immediate comprehension.
DATA DENSITY: High but organized — each column has clear hierarchy
```

---

### Screen F: Aura Profile (Skills Tab)

```
BACKGROUND: Path atmosphere gradient — domain color tints top of page
DOMINANT ELEMENT: Radar chart (left) + skill bars (right) — visual and numerical together
MOTION: Radar polygon fills in on mount (800ms ease-out from center)
        Bars animate in staggered (30ms per bar)
PREMIUM FEEL: The radar chart filling in feels like a "reveal" of identity.
              ELO badge pulses gold if recently updated.
DATA DENSITY: Medium-high
```

---

### Screen G: Recruiter Dashboard

```
BACKGROUND: Darkest version — org path with cyan atmosphere (very subtle)
DOMINANT ELEMENT: Candidate card grid — scannable, dense
MOTION: Search results animate in on filter change (staggered 20ms per card)
        Hover on candidate → two buttons emerge from card bottom
PREMIUM FEEL: The filter sidebar is a real search tool, not a form.
              Candidate cards feel like intelligence cards, not résumé previews.
DATA DENSITY: High — recruiters want to scan many candidates
```

---

### Screen H: Proof Timeline

```
BACKGROUND: --bg-base with subtle vertical timeline line
DOMINANT ELEMENT: Proof cards hanging off the timeline — month-grouped
MOTION: Cards slide in from right on scroll (Intersection Observer)
        Score ring fills on card enter
PREMIUM FEEL: The timeline metaphor is powerful — it's a career record, not a list.
              Failed proofs in rose vs passed in indigo creates a story arc.
DATA DENSITY: Medium — each card shows just enough
```

---

### Screen I: Verification Flow

```
BACKGROUND: Centered modal style — dark overlay over last viewed screen
DOMINANT ELEMENT: Step wizard with progress + provider card grid
MOTION: Provider selection → card transforms with emerald glow (200ms spring)
        Badge preview floats in from right on success
PREMIUM FEEL: The gold badge appearing is a brand moment — certification verification
              feels important, not bureaucratic.
```

---

# 16. Motion and Interactions

## Motion Philosophy (from ui-ux-pro-max rules)

All animations in Capabilio follow these rules:
- Duration: 150ms (micro) → 250ms (transitions) → 400ms (complex) — never >500ms
- Easing: `ease-out` for enter, `ease-in` for exit — never linear
- Animate only: `transform`, `opacity`, `filter` — never width/height/top/left
- All animations must have `prefers-reduced-motion` fallback
- Exit animations are 60-70% of enter duration (feels more responsive)
- Stagger list items by 30-40ms (feels alive, not robotic)

## Core Interaction Patterns

### 1. The ELO Update Sequence (500ms total)
```
+0ms:    Profile updates → number starts counting up
+100ms:  ELO badge border pulses (ring animation outward)
+200ms:  Badge background flashes brighter gold briefly
+300ms:  "▲ +16" delta appears above badge, fade-in
+600ms:  Delta fades out, badge returns to resting state
+800ms:  If tier changed → tier badge flips (card flip animation)
```

### 2. Card Hover System (consistent across all cards)
```
Trigger:    mouseenter
Transform:  translateY(-2px) (or -4px for mission cards)
Shadow:     deepens by one elevation level
Border:     1px opacity increases from 0.08 → 0.16
Transition: 250ms cubic-bezier(0.22, 1, 0.36, 1)

Trigger:    mouseleave
Same values reversed in 200ms (faster exit)
```

### 3. Page Atmosphere Shift (path selector + dashboard)
```
CSS custom property animation:
  --atm-color: changes from one path color to another
  Transition: 400ms ease-out on background-image or gradient
  Result: entire page "breathes" to a new atmosphere on path switch
```

### 4. Skill Bar Entrance (gap analysis, aura skills)
```
Initial state: width: 0%
Trigger: component mounts or tab becomes active
Duration: 900ms cubic-bezier(0,0,0.2,1)
Stagger: 40ms per bar
Result: bars fill in simultaneously — sequential reveal
```

### 5. Challenge Submission Reveal
```
Phase 1 (400ms): workstation dims to opacity 0.3
Phase 2 (500ms): result overlay slides up from bottom (translateY 100% → 0)
Phase 3 (800ms): score circle fills with spring easing
Phase 4 (300ms): ELO badge in header pulses
Phase 5 (500ms): proof badge fades in top-right of page
```

### 6. Navigation Rail Expand (desktop)
```
Hover on rail → width animates 64px → 220px (200ms ease-out)
  Labels fade in (opacity 0 → 1, 150ms delay)
  Icons shift left slightly (transform)
Mouse leave → reverses in 180ms
Active item: left accent bar (3px) appears on mount, slides from top
```

### 7. Bento Grid Mount (dashboard)
```
All bento cells: initial opacity 0, translateY 24px
Stagger: 50ms per cell (reading order: left→right, top→bottom)
Duration per cell: 400ms cubic-bezier(0.22, 1, 0.36, 1)
Result: dashboard "assembles" itself on load — feels alive
```

### Reduced Motion Fallback
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 17. Developer Notes

## CSS Architecture

### 1. Token-First Approach

All design tokens in `src/styles/tokens.css`. Never raw hex values in components. Components use `var(--token-name)` only.

```css
/* ✓ DO */
color: var(--text-primary);
background: var(--bg-raised);
border: 1px solid var(--glass-border);

/* ✗ DON'T */
color: #F8FAFC;
background: #111827;
```

### 2. Dark Mode is the Default

The product ships dark-first. Light mode is `[data-theme="light"]` override. This is the opposite of most SaaS products and it's intentional — dark is the native feel.

```css
/* Default: dark */
:root {
  --bg-base: #0C1220;
  --text-primary: #F8FAFC;
}

/* Light override — scope all tokens */
[data-theme="light"] {
  --bg-base: #F8FAFC;
  --text-primary: #0F172A;
  /* ... all tokens re-declared */
}
```

### 3. Path Atmosphere as CSS Class

```css
/* Applied to <body> or root layout div */
.path-student { --atm-color-1: rgba(99,102,241,0.15); --atm-color-2: rgba(59,130,246,0.08); }
.path-professional { --atm-color-1: rgba(139,92,246,0.15); --atm-color-2: rgba(99,102,241,0.08); }
.path-executive { --atm-color-1: rgba(245,158,11,0.12); --atm-color-2: rgba(161,122,0,0.08); }
.path-org { --atm-color-1: rgba(6,182,212,0.12); --atm-color-2: rgba(16,185,129,0.08); }

.page-atmosphere {
  background:
    radial-gradient(ellipse at 20% 50%, var(--atm-color-1) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, var(--atm-color-2) 0%, transparent 50%),
    var(--bg-void);
  transition: background 400ms ease-out;
}
```

### 4. Glass Component Mixin

```css
/* Use this class for all glass panels */
.glass-panel {
  background: var(--bg-glass);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border-radius: var(--radius-xl);
}
.glass-panel:hover {
  background: var(--bg-glass-hover);
  border-color: var(--glass-border-h);
}
```

### 5. Skill Bar Component

```jsx
// SkillBar.jsx — reusable, animated
const SkillBar = ({ value, size = 'md', mounted }) => {
  const color = value >= 70 ? '#10B981' : value >= 40 ? '#F59E0B' : '#F43F5E'
  const heights = { sm: 3, md: 5, lg: 8 }
  return (
    <div style={{ height: heights[size], background: 'rgba(255,255,255,0.08)', borderRadius: 999 }}>
      <div style={{
        height: '100%',
        width: mounted ? `${value}%` : '0%',
        background: `linear-gradient(90deg, ${color}, ${color}cc)`,
        borderRadius: 999,
        transition: 'width 900ms cubic-bezier(0,0,0.2,1)',
      }} />
    </div>
  )
}
```

### 6. ELO Pulse Hook

```js
// useEloPulse.js
import { useState, useEffect } from 'react'

export const useEloPulse = (eloRating) => {
  const [isPulsing, setIsPulsing] = useState(false)
  const [prevElo, setPrevElo] = useState(eloRating)

  useEffect(() => {
    if (eloRating !== prevElo) {
      setIsPulsing(true)
      const t = setTimeout(() => setIsPulsing(false), 1500)
      setPrevElo(eloRating)
      return () => clearTimeout(t)
    }
  }, [eloRating])

  return isPulsing
}

// In Header.jsx:
const isPulsing = useEloPulse(userData.eloRating)
// <EloBadge className={isPulsing ? 'updated' : ''} />
```

### 7. Bento Grid CSS

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1024px) {
  .bento-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 640px) {
  .bento-grid { grid-template-columns: 1fr; }
}

/* Cell span utilities */
.col-span-1 { grid-column: span 1; }
.col-span-2 { grid-column: span 2; }
.col-span-3 { grid-column: span 3; }
.col-span-4 { grid-column: span 4; }
.row-span-2 { grid-row: span 2; }
```

### 8. Performance Rules (from ui-ux-pro-max)

- **Backdrop-filter** is GPU-intensive. Use on ≤3 elements visible at once. Never on cards in infinite scroll.
- **Radial gradients** on backgrounds: use CSS custom properties so they repaint once on class change, not per frame.
- **Skill bars**: use `will-change: width` only during animation, remove after.
- **Skeleton screens** for all async content (missions, skill gap, proof history) — never show empty containers.
- **Arena workstations** (Pyodide, sql.js): lazy-load only when user enters the workspace.

### 9. Font Loading

```html
<!-- In index.html — preload critical fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&family=Playfair+Display:ital@1&display=swap">
<link rel="stylesheet" href="...fonts...">

<!-- Clash Display via self-hosted or CDN -->
<style>
@font-face {
  font-family: 'Clash Display';
  src: url('/fonts/ClashDisplay-Bold.woff2') format('woff2');
  font-weight: 700 800;
  font-display: swap; /* prevent FOIT */
}
</style>
```

### 10. Z-Index Management

```css
/* Never use random z-index values */
.layer-base     { z-index: 0; }
.layer-raised   { z-index: 10; }   /* cards on hover */
.layer-overlay  { z-index: 20; }   /* dropdowns, tooltips */
.layer-modal    { z-index: 40; }   /* modals, drawers */
.layer-toast    { z-index: 100; }  /* toasts, notifications */
.layer-cursor   { z-index: 1000; } /* loading overlay */
```

---

## Alternate Style Directions

### Direction A: "Glassmorphic Cosmos" ← **RECOMMENDED**
The chosen direction. Deep dark backgrounds + frosted glass cards + atmospheric gradients + Bento grid.  
**Why best for Capabilio:** Balances premium SaaS (glass, depth) with usability (clear cards, strong hierarchy). Works especially well for the Arena workspace contrast. Feels like a next-generation product without sacrificing readability.

### Direction B: "Brutalist Precision"
Bold typography. Black/white + 1 brand color. Hard grid. No glass. Strong geometric shapes.  
**Pros:** Highly distinctive, works for Indian brand energy  
**Cons:** Too aggressive for enterprise/recruiter side. Clashes with the soft data visualizations needed for Skill Graph.

### Direction C: "Warm Neumorphism"
Soft clay-like surfaces. Cream/warm grey background. Subtle depth via inset shadows. No dark mode.  
**Pros:** Friendly, approachable for student path  
**Cons:** Completely wrong for Arena (needs technical feel) and recruiter (needs professional). Cannot scale across all paths without visual incoherence.

---

## Pre-Delivery Checklist (from ui-ux-pro-max)

```
ACCESSIBILITY
  [ ] All text: contrast ratio ≥ 4.5:1 against backgrounds
  [ ] Focus states visible: 2px solid --brand-primary ring, 2px offset
  [ ] No icon-only buttons: all actions have text label or aria-label
  [ ] Keyboard nav: tab order matches visual order
  [ ] Headings: sequential h1→h6, no skipping
  [ ] Skill bars: color is never the only indicator (also show % number)
  [ ] Skill gap columns: labeled "Critical Gaps / Learn Soon / You Have" in text

INTERACTIONS
  [ ] All clickable elements: cursor: pointer
  [ ] All touch targets: ≥ 44×44px
  [ ] Loading states: skeleton on all async content
  [ ] ELO badge: animated on update
  [ ] Buttons: disabled state with opacity + no-pointer-events during loading
  [ ] All glass panels: backdrop-filter graceful fallback (solid bg on unsupported)

PERFORMANCE
  [ ] Skill bars: will-change: width only during animation
  [ ] Backdrop-filter: ≤3 simultaneously visible
  [ ] Fonts: preloaded + font-display: swap
  [ ] Workstations: lazy-loaded (dynamic import)
  [ ] Pyodide/sql.js: only initializes when workspace is entered
  [ ] prefers-reduced-motion: all animations respect it

RESPONSIVE
  [ ] Breakpoints: 375 / 768 / 1024 / 1440px
  [ ] Bento grid: 4→2→1 columns
  [ ] Nav rail (desktop) → bottom nav (mobile, ≤5 items)
  [ ] Mission cards: horizontal scroll on mobile (not stacked)
  [ ] Skill gap 3-column: becomes 1-column on mobile (stacked)
  [ ] ELO badge always visible in header at all breakpoints
```

---

*Capabilio Design System v2.0*  
*Built with ui-ux-pro-max-skill design intelligence*  
*Style direction: Glassmorphic Cosmos — Liquid Glass + Dark OLED + Bento Grid*
*Font stack: Clash Display (display) + Inter (UI) + JetBrains Mono (data)*
