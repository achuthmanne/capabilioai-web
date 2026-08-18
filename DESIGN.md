# Landing Page Design Philosophy

Source of truth for the `capabilio.online` landing page rebuild. Every visual
decision on this page is checked against this document before it ships.
Where this document is silent, default to restraint, not decoration.

## The feeling

Someone opening capabilio.online should think *"this doesn't look like a
course platform, LinkedIn, or HackerRank — what is this?"* Curiosity, not
a feature dump. That shift — "I'm entering my personal career operating
system," not "another education platform" — is the test for every screen:
landing, auth, onboarding, and the first look at Arena/SkillStudio.

Reference: **Apple, Linear, Arc Browser, Stripe, Cursor, Figma.**
Explicitly not: Bootstrap, admin dashboards, LMS aesthetics, heavy animation.

## Palette

Decision (2026-08-17): a new White/Graphite base, built fresh for this page —
**not** a reuse of `theme.js`'s Parchment tokens (warm cream, no graphite,
no blue emphasis — it doesn't satisfy this philosophy either). The one
accent color is the existing brand orange `#FF5701`, not blue — this keeps
the marketing site and the logged-in product recognizably the same brand.
"Blue" in the original reference list should be read as "one restrained
accent," which here is orange.

| Token | Value | Use |
|---|---|---|
| `surface` | `#FFFFFF` | Page background, primary surface |
| `surfaceRaised` | `#FAFAF9` | Very subtle off-white for section separation only — never a visible "card" fill |
| `graphite900` | `#14161A` | Headlines, primary text |
| `graphite600` | `#4B5058` | Body text |
| `graphite400` | `#8A8F98` | Secondary text, captions |
| `graphite200` | `#E4E6E9` | Thin borders, dividers |
| `graphite100` | `#F0F1F3` | Rare hairline surfaces (input fills, code blocks) |
| `accent` | `#FF5701` | The one accent — CTAs, active states, the single animated element per section |
| `accentDim` | `#FFF3EE` | Accent tint for a selected/active background, flat, no gradient |
| `success` / `warning` / `error` | standard semantic greens/ambers/reds | **Status only** — a passed check, a form error. Never decorative. Never used to differentiate "paths" or "cards" the way the current page uses 5 rotating hues. |

No second accent hue. No per-section or per-path color rotation. If a
future section needs to distinguish categories, use graphite weight/size,
not a new color.

## Typography

Large type carries the page — not shadows, not glow, not gradients.

- One display/body typeface (weights 400/500/600/700 only — **never 800/900**,
  which is what makes the current page read as a gaming dashboard, not Apple/Linear).
- Headline tracking: 0 to slightly negative (−0.01em to −0.02em) at large
  sizes only. Never the −0.05em the current page uses — that's a
  loud-typography move, not a quiet one.
- Body copy stays legible-width (~60–70ch), generous line-height (1.5–1.7).
- No monospace-for-everything. Reserve a mono face (if any) for genuinely
  tabular/numeric data (an ELO number, a stat), never for labels, buttons,
  or badges — that's a stylistic tic borrowed from the current build, not
  a deliberate choice.

## Spacing & layout

- Strict 8px system: 8 / 16 / 24 / 32 / 48 / 64 / 96. No arbitrary values
  (the current file uses 18, 22, 26, 34, 44... — pick from the scale only).
- Thin 1px borders (`graphite200`) do the work of separating content that
  the current page uses heavy shadows and glass for.
- Generous whitespace over dense grids. If a section feels like it needs
  a background tint to separate it from its neighbor, that's a sign to add
  space, not a radial-gradient wash.

## Motion

Micro, not flashy. Every animation has a purpose, none are ambient/decorative.

- **Card hover**: lift 4px, border brightens from `graphite200` to
  `graphite900`-at-low-opacity (not a color glow), optional icon micro-rotation,
  button label area expands slightly. That's the whole vocabulary — don't add more.
- **Page/section transitions**: fade + slight scale/blur + spring easing.
  Nothing bounces excessively, nothing loops, nothing runs continuously
  in the background.
- **Always respect `prefers-reduced-motion`** — reveal content in its final
  state immediately, no exceptions.
- Node/workflow animations (hero diagram, Arena preview) animate to
  demonstrate a real sequence (assessment → skill graph → arena → portfolio),
  not to be visually busy. If it doesn't teach something in under 3 seconds,
  cut it.

## Glass effects — one reserved use, not a texture

Glass/blur is not banned outright — the philosophy explicitly wants it for
exactly one moment: **the auth modal**, where the page behind blurs and a
single glass panel appears, so opening it feels like invoking the OS rather
than navigating to a new screen.

That is the *only* sanctioned use of `backdrop-filter` on this page.

## NEVER DO — direct response to what's in the current build

These aren't hypothetical risks; every one of these is confirmed present in
`frontend/src/pages/LandingPage.jsx` today. Listed so it's structurally hard
to drift back into them.

1. **No glassmorphism stacking.** `backdrop-filter` appears in exactly one
   place on the whole page: the auth modal. Not on nav, cards, badges,
   pills, pricing tiles, or section panels. (Current build: 31 instances.)
2. **No particle fields, no WebGL/canvas ambient backgrounds.** No fixed
   full-page decorative animation of any kind. (Current build: a rotating
   130-point Three.js field behind the entire page, plus a documented
   Safari compositor bug caused by combining it with glass panels.)
3. **No ambient glow orbs.** No fixed, blurred `radial-gradient` shapes
   sitting behind sections for atmosphere. (Current build: 3 large ones,
   independent of the particle field.)
4. **No mouse-tracking spotlight/glow on hover.** A card brightens its
   border and lifts — it does not render a cursor-following gradient.
   (Current build: `onMouseMove`-driven spotlight on `FeatureCard`,
   `PathCard`, `NetworkCard`.)
5. **No gradient buttons or badges.** CTAs are a solid `accent` fill or a
   thin-bordered ghost button. Badges are flat `accentDim` fills with
   `graphite900` or `accent` text. No `linear-gradient` fills, no
   "Popular"/"Elite" ribbon gradients. A very subtle single-hue gradient
   (<8% lightness shift) is permitted only as a depth cue on a large
   surface — never as a color statement, never on an interactive element.
6. **No neon/colored text-shadow glow.** Numbers and stats get weight and
   size, not `text-shadow: 0 0 40px accent`.
7. **No stacked heavy box-shadows.** One soft, low-opacity shadow maximum
   per element (`0 1px 2px rgba(20,22,26,0.04), 0 4px 12px rgba(20,22,26,0.04)`-scale,
   not `0 24px 60px ... 0 0 40px ... inset ...` triple stacks). Prefer a
   thin border over a shadow wherever it can do the same job.
8. **No emoji as icons or section markers.** Use a real vector icon set,
   consistent weight and grid, consistent with the reference sites — not
   🎓💼✦🏛️.
9. **No decorative per-path/per-tab accent-color rotation.** One accent
   color for the whole page — with one deliberate, approved exception
   (2026-08-18): the four signup-path entry points (the "Choose Your
   Journey" cards, `AuthModal`'s step-1 path chooser, and the resulting
   `AuthModal` form) are color-coded per path, using the exact values from
   the pre-rebuild build (`frontend/src/lib/pathIdentity.js` —
   `#FF5701`/`#8B5CF6`/`#C9A84C`/`#D97706` for student/professional/
   executive/institution). This is identity/orientation — confirming "did
   I pick the right path" at the one moment that matters before a signup
   form — not decoration, and it does not extend anywhere else on the
   page. Every other section, every other card, stays single-accent.
   Semantic colors remain reserved for real status states everywhere.
10. **No simulated/fake social proof.** No self-incrementing counters, no
    manufactured urgency. (Current build: a `liveCount` that increments
    itself via a random timer and grows in `localStorage` even while no
    one is on the page — direct contradiction of a platform whose entire
    pitch is "nothing here can be faked.")
11. **No font-weight above 700, no tracking beyond −0.02em.** If a headline
    needs to feel bigger, make it bigger — don't make it heavier or tighter.

## What this page is trying to do, structurally

- **Curiosity over explanation.** Show real product moments (an Arena
  mission scoring live, a skill graph forming) instead of icon+paragraph
  feature grids wherever a "show" option exists.
- **One idea per screen.** The hero makes one claim. Each section proves
  one thing. Resist the urge to fold pricing, network/testimonials, and
  FAQ into the same visual density as the current build — those can stay
  in scope, but each earns its own quiet section, not another glass card
  grid.
- **Everything in this file applies transitively** to the auth modal and
  boot-sequence onboarding, even though they don't live in
  `LandingPage.jsx` — the emotional shift described above has to survive
  the handoff from landing → auth → onboarding → first dashboard view.
