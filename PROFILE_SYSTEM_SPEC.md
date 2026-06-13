# Capabilio Premium Profile System
## Complete Production Specification

**Version:** 1.0  
**Status:** Ready for Engineering  
**Scope:** Profile page, skills architecture, media upload, data model, component structure

---

## 0. Design Philosophy

Capabilio's profile is not a résumé. It is a **proof page** — a living record of what
a person can do, validated by real evidence, scored by a platform the recruiter can
trust.

The three shifts from LinkedIn:

| LinkedIn                        | Capabilio                              |
|---------------------------------|----------------------------------------|
| Self-reported skills            | Proof-linked skills with evidence      |
| Static work history             | ELO-scored challenge performance       |
| Endorsement = peer clicks        | Verification = artifacts + platform    |
| Resume-on-a-page                | Product page for a career              |

**Design tone:** Premium SaaS. Think Notion meets Linear meets a high-end portfolio site.
Dark-mode first (matches the existing Capabilio dark system), with warm accent colors.
Generous whitespace. Enterprise polish. No decoration for decoration's sake.

---

## 1. Page Architecture

### 1.1 Layout Zones

```
┌──────────────────────────────────────────────────────┐
│  COVER ZONE  (full-width, 320px tall desktop)        │
│  [Cover image + gradient overlay]                     │
├──────────────────────────────────────────────────────┤
│  IDENTITY STRIP  (overlaps cover by 64px)             │
│  [Avatar] [Name + Headline + Badges] [CTA buttons]   │
├──────────────────────────────────────────────────────┤
│  MAIN CONTENT                    │  SIDEBAR (280px)  │
│  ─────────────────────────────   │  ────────────────  │
│  Bio + Summary                   │  ELO / Score card │
│  Skills System (tabbed)          │  Quick stats      │
│  Featured Proof                  │  Availability     │
│  Portfolio Highlights            │  Recruiter CTA    │
│  Career Timeline (linked)        │  Shared by        │
└──────────────────────────────────────────────────────┘
```

**Mobile layout:** Single column. Identity strip stacks vertically. Sidebar becomes
accordion sections below main content.

### 1.2 Scroll Behavior

- **Sticky header strip:** Avatar + name + CTA buttons lock to top of viewport after
  scrolling past the identity strip.
- **Section anchors:** #bio, #skills, #proof, #portfolio, #timeline — used for
  recruiter deep-link sharing.
- **Cover parallax:** Subtle 0.3x parallax scroll on cover image (CSS only, no JS).

---

## 2. Cover Image System

### 2.1 Specifications

| Property           | Value                                    |
|--------------------|------------------------------------------|
| Display dimensions | 1400 × 320px (desktop), 768 × 220px (tablet), 420 × 180px (mobile) |
| Upload max size    | 10 MB (user-facing: no hard limit shown) |
| Accepted formats   | JPG, PNG, WebP                           |
| Stored format      | WebP (converted client-side before upload) |
| Storage dimensions | 1400 × 350px at 85% quality              |
| Focal point storage| {x: 0.5, y: 0.5} — normalized floats    |

### 2.2 Upload Flow

```
Step 1 — Trigger
  User clicks "Edit cover" pencil icon (appears on hover over cover zone)
  → Opens CoverEditor modal (full-screen overlay)

Step 2 — Source selection
  ○ Upload from device (file picker + drag-drop zone)
  ○ Choose from theme covers (curated gradient/abstract library)
  ○ Use current (cancel)

Step 3 — Crop & Reposition (after upload)
  ├── Drag to reposition the image within the frame
  ├── Pinch/scroll to zoom (min 1x, max 3x)
  ├── Safe-zone guide overlay (dashed lines showing mobile crop boundary)
  └── "Reset" button returns to original position

Step 4 — Preview
  └── Toggle: Desktop preview | Mobile preview | Recruiter PDF preview

Step 5 — Save
  ├── Client-side: compress to WebP at 85% quality (browser-image-compression)
  ├── Upload to Supabase Storage: profiles/{user_id}/cover.webp
  ├── Store focal_point in profiles table
  └── Optimistic UI: show new cover immediately, revert on error
```

### 2.3 Safe-Zone Overlay

The safe-zone guide shows three zones:
- **Green zone:** Always visible on all screen sizes
- **Yellow zone:** Visible on desktop + tablet, cropped on mobile
- **Red zone:** Desktop only — will be cropped on mobile and PDF

Shown as semi-transparent overlaid rectangles with labels while editing.
Hidden when saved.

### 2.4 Theme Cover Library

12 curated built-in covers (no upload needed):
- 4 abstract gradient options (brand palette variants)
- 4 domain-coded options (tech/design/data/product visual language)
- 4 neutral professional options (minimal, dark, slate)

Each stored as CSS `background` strings — zero bytes of actual image storage.

### 2.5 States

| State            | UI Behavior                                           |
|------------------|-------------------------------------------------------|
| Empty            | Gradient placeholder using user's archetype palette   |
| Uploading        | Progress bar overlay on cover zone, 0–100%            |
| Processing       | "Optimizing..." shimmer on cover zone                 |
| Saved            | Fade-in of new cover, green ✓ toast                   |
| Error            | Cover reverts, red toast with retry button            |
| No cover (PDF)   | Brand gradient fallback in recruiter export           |

---

## 3. Profile Picture System

### 3.1 Specifications

| Property           | Value                                         |
|--------------------|-----------------------------------------------|
| Display sizes      | 120px (profile page), 40px (header), 32px (card) |
| Upload max size    | No user-facing limit (compress transparently) |
| Accepted formats   | JPG, PNG, WebP, HEIC (converted automatically)|
| Stored format      | WebP: 400×400px + 80×80px thumbnail           |
| Shape              | Circular (CSS clip-path, no canvas cropping needed) |
| Background         | Transparent PNG → white fill on save          |

### 3.2 Upload Flow

```
Step 1 — Trigger
  Hover avatar → pencil icon appears bottom-right of circle
  Click → AvatarEditor modal opens (400px centered dialog)

Step 2 — Source
  ├── Drag file onto modal drop zone
  ├── Click "Choose file" (file input)
  └── (Future) "Take photo" on mobile

Step 3 — Crop & Zoom
  ├── react-easy-crop or equivalent canvas cropper
  ├── Circular crop guide (not square)
  ├── Zoom slider: 1x–3x
  ├── Drag to reposition
  └── Face detection hint: if faces found, auto-center on first face
      (client-side face detection via face-api.js or browser Shape Detection API)

Step 4 — Preview
  ├── Show at 120px (large), 40px (header), 32px (card) simultaneously
  └── "Looks good?" confirmation

Step 5 — Save
  ├── Canvas.toBlob('image/webp', 0.92) → cropped circle area only
  ├── Upload: profiles/{user_id}/avatar.webp + profiles/{user_id}/avatar_thumb.webp
  ├── Optimistic: show new avatar immediately
  └── Revert to previous on error
```

### 3.3 Compression Strategy (Client-Side)

```
Input: any size, any format
↓
Step 1: Decode to canvas (handles HEIC via heic2any)
Step 2: Scale to max 1600px on longest side (preserves quality for crop)
Step 3: User crops → extract 400×400 canvas region
Step 4: Encode as WebP at 0.92 quality
Step 5: If result > 500KB → reduce quality to 0.82
Step 6: Upload the final blob
```

No server-side processing required. All compression happens in the browser.

### 3.4 States

| State            | UI Behavior                                            |
|------------------|--------------------------------------------------------|
| No avatar        | Initials avatar (first + last name, archetype color)   |
| Uploading        | Circular progress ring around avatar                   |
| Processing       | Shimmer pulse on avatar                                |
| Saved            | Smooth fade-in of new image                            |
| Error            | Reverts to previous, tooltip "Upload failed. Try again."|
| Cropping         | Full modal — rest of page dimmed                       |

### 3.5 Fallback Initials Avatar

Generated entirely in CSS/SVG — no image required:
- Background: archetype palette gradient
- Text: initials in bold, white, DM Sans font
- Size scales correctly at all sizes

---

## 4. Identity Strip

The identity strip is the most-scanned zone on the profile. Every element earns its place.

### 4.1 Component Layout (Desktop)

```
┌────────────────────────────────────────────────────────────────┐
│  [Avatar 120px]  [Name — 28px bold]  [Archetype pill]          │
│                  [Headline — 16px]   [Availability chip]       │
│                  [Location · Domain] [CTA: Connect | Message]  │
│                  [ELO pill] [Verified badge] [Path badge]       │
└────────────────────────────────────────────────────────────────┘
```

### 4.2 Name + Headline

- **Name:** 28px, weight 700, letter-spacing -0.02em. Truncates at 40 chars.
- **Headline:** 16px, weight 400, C.ink2 color. Max 120 chars. User-editable inline.
- **Inline editing:** Click headline → transforms to input. Save on blur or Enter.
  Shows char count (e.g. "87/120").

### 4.3 Verification + Trust Badges

Four badge types rendered as chips in the strip:

| Badge               | Trigger                                  | Color      |
|---------------------|------------------------------------------|------------|
| ✓ Verified          | Email + any V2+ item in timeline         | Teal       |
| ⚔ Arena Active      | Completed ≥1 arena challenge             | Blue       |
| 🎓 Student          | Path = student                           | Indigo     |
| 💼 Open to Work     | User explicitly sets availability        | Green      |
| 🔒 Profile Private  | Profile visibility set to private        | Amber      |
| ⭐ Top Performer     | ELO ≥ 1400 (Elite tier)                  | Gold       |

Maximum 3 badges shown in strip. Overflow → "+2 more" tooltip.

### 4.4 ELO / Aura Pill

```
┌──────────────────────────┐
│  ELO 1184  •  Proficient │  ← tier-colored background, 14px
└──────────────────────────┘
```

Click → expands to mini ELO journey sparkline (same as Portfolio.jsx).

### 4.5 CTA Buttons (Recruiter View)

When viewing another user's profile:
- Primary: **"View Portfolio"** → opens their portfolio page
- Secondary: **"Save Candidate"** → adds to recruiter saved list (future)
- Tertiary: **"Share"** → copies recruiter-mode URL to clipboard

When viewing own profile:
- Primary: **"Edit Profile"** → enters edit mode
- Secondary: **"Share Profile"** → opens share modal
- Tertiary: **"Preview as Recruiter"** → switches to recruiter view

---

## 5. Skills System Architecture

This is Capabilio's primary differentiator from LinkedIn. Instead of a flat list of
self-reported skills, the system groups skills by type, proof level, and evidence.

### 5.1 The Seven Skill Groups

---

#### Group 1 — Core Skills

**What it is:** The 5–10 most important technical or domain skills this person leads with.
These are pinned to the profile summary and shown first.

**Characteristics:**
- Max 10 skills
- Each must have a minimum of one proof attachment OR one arena challenge score
- User-ordered (drag to rerank)
- Domain-tagged (frontend / backend / data / design / etc.)
- Visible in all views (public, recruiter, PDF)

**Skill card anatomy:**
```
┌──────────────────────────────────────┐
│  React          [Frontend]  [★ Core] │
│  ████████░░  82%  Proficient         │
│  📎 3 proofs  ⚔ 4 arena challenges  │
│  Endorsed by: +6                     │
└──────────────────────────────────────┘
```

**Score computation:**
```
core_skill_score = (
  arena_avg_score_in_domain * 0.5 +
  proof_count * 4 (cap 20) +
  endorsement_count * 1 (cap 10) +
  self_rating * 10
) / 100
```

---

#### Group 2 — Domain Skills

**What it is:** The full set of skills within the user's primary domain.
More granular than Core Skills — shows depth within a specialty.

**Characteristics:**
- Unlimited count
- Grouped by sub-domain (e.g., Frontend → React, Vue, CSS, Web Performance)
- Shown as a searchable/filterable grid in the profile skills tab
- Each skill shows: level (Beginner/Developing/Proficient/Advanced/Expert), proof count

**Example groupings:**
```
Frontend
  └── Languages:    JavaScript ★, TypeScript ★
  └── Frameworks:   React ★, Next.js, Remix
  └── Styling:      Tailwind CSS ★, CSS-in-JS
  └── Performance:  Lighthouse, Web Vitals
  └── Testing:      Vitest, Playwright

Backend (if applicable)
  └── Node.js, Express, PostgreSQL, Redis...
```

---

#### Group 3 — Proof Skills

**What it is:** Skills that have direct, attached proof artifacts — GitHub repos, live
demos, challenge results, certificates. These are the highest-trust skills.

**Characteristics:**
- Automatically populated when proof_links are attached to timeline items
- Cannot be manually added — must have real evidence
- Always shown with V1+ verification badge
- Highlighted with a distinct "Proof-backed" label
- Shown prominently in recruiter view

**Display:**
```
┌───────────────────────────────────────────────────────┐
│  PostgreSQL  [Backend]  [📎 Proof-backed]              │
│  ███████░░░  74%  Advanced                             │
│  ✓ GitHub: capabilio-api (3,421 lines of SQL)          │
│  ✓ Arena: Database Design challenge — Score 91/100     │
│  ✓ Cert: PostgreSQL Professional (Certified 2024)      │
└───────────────────────────────────────────────────────┘
```

---

#### Group 4 — Tool Stack

**What it is:** Tools, software, platforms, and environments the user works with daily.
Distinct from skills (knowing Figma ≠ being a designer, but worth listing).

**Characteristics:**
- Flat tag cloud display (not rated by level)
- Grouped: Dev Tools / Design Tools / Cloud / CI/CD / Communication / Other
- User adds freely — no proof required
- Can be linked to proof (e.g., "used Figma in [project]")
- Max 30 tools

**Display:** compact pill grid with tool icon (logo) where available.

---

#### Group 5 — Growth Skills

**What it is:** Skills the user is actively learning or targeting for development.
Honest signal: shows ambition and direction without faking current competency.

**Characteristics:**
- Max 5 skills
- Each has: target level, learning resource (optional), ETA (optional)
- Displayed with a "Learning" badge — clearly distinct from current skills
- Shown to recruiter as "growth trajectory" signal
- Linked to Arena challenges: if user completes a challenge in this domain,
  the skill auto-upgrades from Growth to Core/Domain

**Display:**
```
┌───────────────────────────────────────────────┐
│  Rust          [Systems]  [🌱 Learning]        │
│  ░░░░░░░░░░  Starting                          │
│  Goal: Intermediate by Q3 2026                │
│  📖 "The Rust Book" — 4 chapters in           │
└───────────────────────────────────────────────┘
```

---

#### Group 6 — Verified Strengths

**What it is:** Soft skills and competency signals verified through arena performance
and behavioral patterns — not self-reported.

**Characteristics:**
- System-generated, not user-added (except "add a note" per strength)
- Derived from: arena consistency score, challenge completion rate, submission quality
- Examples: Problem Decomposition, Systematic Debugging, Clean Code Habits,
  Communication Under Pressure, Fast Iteration
- Shown with confidence score (0–100) derived from arena history
- User can dispute or hide individual strengths

**How derived:**
```
Problem Decomposition  →  Arena challenges with multi-step solutions, high structure scores
Clean Code Habits      →  Linter compliance scores across submitted code
Fast Iteration         →  Number of successful attempts within time windows
Systematic Debugging   →  Challenge scenarios that specifically test debugging
```

---

#### Group 7 — Career Signals

**What it is:** High-level career meta-signals inferred from the total profile —
useful shorthand for recruiters who need 5-second qualification.

**Characteristics:**
- Max 6 signals shown
- Each is a badge with a one-line rationale
- System-generated weekly (not real-time)
- User cannot fabricate these — they are earned

**Examples:**
```
🏗 Full-Stack Ready       "Strong frontend + backend skills with shipped projects"
⚡ Fast Learner           "3 new skills verified in last 90 days"
🎯 Domain Expert          "Top 15% ELO in Frontend category"
📦 Ships Independently    "5+ personal projects, 3 shipped"
🔄 Career Transition      "Active professional pivoting into ML/Data"
🤝 Collaborative Builder  "2+ team projects with verified roles"
```

---

### 5.2 AI-Assisted Skill Suggestions

When the user opens the skills editor:

```
"Based on your Arena challenges and project tech stacks, we suggest:

  + Add 'System Design' to Core Skills
    → You scored 88+ in 3 system design challenges
  
  + Upgrade 'TypeScript' from Domain to Core
    → Used in 4 projects, 2 with proof links

  + Add 'Redis' to Tool Stack
    → Found in your GitHub project: capabilio-api

  + Move 'Rust' from Growth to Domain Skills
    → You completed 2 Rust challenges with score > 70"
```

Each suggestion has: Accept | Dismiss | Ask why.
Suggestions are re-generated after every Arena challenge completion or new
timeline item added.

### 5.3 Skill Visibility Settings

Per skill, per group:
```
Public      — shown on portfolio, shareable link, search index
Recruiter   — shown only when recruiter link is used
Private     — hidden from all views (useful for "learning X but not ready")
```

### 5.4 Endorsement Model

Unlike LinkedIn's peer endorsements (gaming-prone), Capabilio's endorsements are
weighted and typed:

| Type             | Weight | Who can give it         |
|------------------|--------|-------------------------|
| Arena-validated  | 10     | Capabilio system        |
| Certificate-backed | 8    | Capabilio system        |
| Employer-verified | 7     | V3/V4 employer contact  |
| Peer (colleague) | 2     | Any Capabilio user       |
| Self-noted        | 0     | User themselves          |

Total endorsement score = weighted sum, capped at 30 per skill.
Raw peer count shown separately ("12 colleagues endorsed this").

---

## 6. Profile Sections — Detailed Spec

### 6.1 Bio / Summary Section

- **Max length:** 600 characters
- **Min recommendation:** 100 characters (nudge shown below 100)
- **Rich text:** Bold, italic, links only — no headers/bullets (keeps it human)
- **Edit mode:** Inline WYSIWYG. Auto-save draft every 5 seconds.
- **AI assist button:** "Improve with AI" → generates a bio from profile data,
  user can accept/edit/reject. Never auto-applies.
- **Recruiter view:** First 300 chars shown, "Read more" expands.

### 6.2 Featured Proof Section

- Max 3 featured items (pinned from Timeline or Projects)
- Each card shows: type icon, title, key stat, verification level, primary link
- "Feature this" toggle on any timeline item promotes it here
- Drag to reorder
- Empty state: "Pin your best work here — drag from your timeline"

```
┌──────────────────────┐ ┌──────────────────────┐
│  ⚔ Arena Proof       │ │  ⚡ Personal Project  │
│  Rate Limiter Design │ │  Capabilio            │
│  Score: 91  ELO +24  │ │  3.2k GitHub stars    │
│  ✓ Verified          │ │  🔗 Live demo         │
└──────────────────────┘ └──────────────────────┘
```

### 6.3 Portfolio Highlights

- 3–6 items selected from the full portfolio
- Auto-populated from highest-proof items in career timeline
- User can override / manually pin
- Shows project card (title, stack, proof chip, domain tag)
- "View full portfolio →" link at bottom

### 6.4 Sidebar — Score Card

```
┌──────────────────────────────┐
│  Aura Score                  │
│  ████████████░░  78 / 100    │
│                              │
│  ELO Rating    1,184         │
│  Tier          Proficient    │
│  Challenges    23            │
│  Proof Items   11            │
│  Verified      7             │
│                              │
│  Last active   2 days ago    │
└──────────────────────────────┘
```

### 6.5 Sidebar — Availability

```
┌──────────────────────────────┐
│  Availability                │
│                              │
│  ● Open to roles             │
│  Full-time · Remote          │
│  Available from: Now         │
│                              │
│  [Edit availability]         │
└──────────────────────────────┘
```

States: Open to roles / Open to freelance / Not looking / Exploring.
Each state changes the badge in the identity strip.

---

## 7. Edit Mode System

### 7.1 Edit Mode Architecture

Profile has two modes: **View mode** (default) and **Edit mode**.

**Entering edit mode:**
- Click "Edit Profile" CTA in identity strip
- Animate: edit icon appears on each editable section

**Edit mode visual language:**
- Editable sections get a subtle `border: 1px dashed C.border2` ring
- Hover over section → ring brightens, pencil icon appears top-right
- Click section → inline editor opens for that section

**Exiting edit mode:**
- "Done editing" button in sticky header
- All unsaved changes prompt: "Save changes before leaving?"
- Auto-save drafts every 10 seconds into localStorage (not Supabase)
- "Discard all" resets to last saved state

### 7.2 Autosave Draft System

```
Draft lifecycle:
  User types → debounce 2000ms → save to localStorage key: "profile_draft_{user_id}"
  
  On page load in edit mode:
    if (draft exists && draft.updated_at > profile.updated_at):
      Show banner: "You have unsaved changes from [time]. Restore? / Discard"
  
  On "Save":
    POST to Supabase → clear localStorage draft → show "Saved" toast
  
  On navigation away with unsaved:
    beforeunload → "You have unsaved changes. Leave?"
```

### 7.3 Undo / Reset Controls

Per-section "Reset to last saved" button (appears when section has unsaved changes).
Global "Discard all changes" in edit mode footer.
Ctrl+Z / Cmd+Z support within text fields (browser native).

---

## 8. Component Structure

### 8.1 File Map

```
frontend/src/
├── pages/
│   └── Profile.jsx              ← Main profile page, route /profile/:userId
├── components/profile/
│   ├── CoverZone.jsx            ← Cover image display + edit trigger
│   ├── CoverEditor.jsx          ← Full-screen cover crop modal
│   ├── AvatarCircle.jsx         ← Avatar display at all sizes
│   ├── AvatarEditor.jsx         ← Circular crop modal
│   ├── IdentityStrip.jsx        ← Name, headline, badges, CTAs
│   ├── BioSection.jsx           ← Bio text, inline edit, AI assist
│   ├── FeaturedProof.jsx        ← Up to 3 pinned proof cards
│   ├── PortfolioHighlights.jsx  ← 3–6 project cards
│   ├── ScoreCard.jsx            ← Sidebar Aura + ELO widget
│   ├── AvailabilityCard.jsx     ← Sidebar availability widget
│   └── ProfileStickyHeader.jsx  ← Locks to top after scroll
├── components/skills/
│   ├── SkillsPanel.jsx          ← Tab container for all skill groups
│   ├── CoreSkills.jsx           ← Core skills group
│   ├── DomainSkills.jsx         ← Domain skills group with sub-groups
│   ├── ProofSkills.jsx          ← Proof-backed skills (auto-populated)
│   ├── ToolStack.jsx            ← Tool stack tag cloud
│   ├── GrowthSkills.jsx         ← Learning / growth skills
│   ├── VerifiedStrengths.jsx    ← System-generated strengths
│   ├── CareerSignals.jsx        ← System-generated meta-signals
│   ├── SkillCard.jsx            ← Individual skill card (reused)
│   ├── SkillEditor.jsx          ← Add/edit skill modal
│   ├── AISuggestions.jsx        ← AI skill suggestion banner
│   └── EndorsementChip.jsx      ← Endorsement count chip
├── components/upload/
│   ├── ImageDropZone.jsx        ← Reusable drag-drop zone
│   ├── CropCanvas.jsx           ← Canvas-based crop tool
│   └── ProgressRing.jsx         ← Circular upload progress
├── hooks/
│   ├── useProfileDraft.js       ← Draft autosave to localStorage
│   ├── useImageUpload.js        ← Upload state, compression, retry
│   ├── useFaceDetect.js         ← Browser Shape Detection API wrapper
│   └── useSkillSuggestions.js   ← AI suggestion fetcher
└── config/
    ├── skillGroups.js           ← Skill group definitions (see §9)
    └── profileConfig.js         ← Profile field limits, validation rules
```

### 8.2 Key Props Contracts

**SkillCard:**
```jsx
<SkillCard
  skill={SkillObject}      // full skill data
  group="core"             // which group (affects display variant)
  editable={boolean}       // show edit controls
  onEdit={(skill) => void}
  onRemove={(skillId) => void}
  size="md"                // sm | md | lg
/>
```

**AvatarCircle:**
```jsx
<AvatarCircle
  src={string | null}      // avatar URL
  name={string}            // for initials fallback
  size={32|40|80|120}      // px
  uploading={boolean}      // show progress ring
  editable={boolean}       // show pencil on hover
  onEditClick={() => void}
/>
```

**CoverZone:**
```jsx
<CoverZone
  src={string | null}      // cover URL
  focalPoint={{x, y}}      // 0–1 normalized
  gradient={string}        // fallback CSS gradient
  editable={boolean}
  onEditClick={() => void}
  uploading={boolean}
  uploadProgress={0–100}
/>
```

---

## 9. States, Interactions & Edge Cases

### 9.1 Profile View States

| State                | Behavior                                                      |
|----------------------|---------------------------------------------------------------|
| Own profile, view    | Default. "Edit Profile" button visible.                       |
| Own profile, edit    | Edit rings, inline editors, draft autosave active.            |
| Other user, public   | CTA = "View Portfolio" + "Save Candidate". Edit hidden.       |
| Other user, recruiter| Recruiter view banner. All recruiter-visible items shown.     |
| Profile private      | Visitor sees "This profile is private" with name + archetype. |
| Profile loading      | Skeleton screens (not spinners) for each major section.       |
| No data (new user)   | Onboarding prompt in each empty section.                      |

### 9.2 Image Upload Edge Cases

| Scenario                        | Handling                                             |
|---------------------------------|------------------------------------------------------|
| File > 10 MB                    | Compress first; if still > 3 MB after compress, warn |
| Unsupported format (BMP, TIFF)  | "Please use JPG, PNG, or WebP"                       |
| HEIC from iPhone                | Auto-convert via heic2any before crop                |
| Upload fails (network)          | Retry button. Previous image restored.               |
| Crop modal closed without save  | Original unchanged. No partial upload.               |
| Face not detected                | No error — auto-center crop as fallback              |
| Very tall/narrow image          | Zoom locked to fill frame, horizontal reposition only|
| Transparent PNG                 | Fill transparent areas with white on save            |
| Animated GIF (if somehow passed)| Extract first frame only                             |

### 9.3 Skills Edge Cases

| Scenario                        | Handling                                             |
|---------------------------------|------------------------------------------------------|
| Proof skill with deleted proof  | Downgrade to Domain skill, notify user               |
| Arena challenge domain changes  | Re-run AI suggestions                                |
| Core skills list full (10)      | "Replace an existing skill or remove one first"      |
| User adds same skill twice      | Merge silently — update level if higher              |
| Growth skill mastered via Arena | Auto-suggest upgrade: "You've leveled up in Rust"    |
| Skill endorsement from blocked user | Endorsement still counts, user not shown         |
| All skills hidden               | Profile skills tab shows "No public skills" message  |

### 9.4 Accessibility

- All modals trap focus (focus-trap-react or native dialog element)
- Cover and avatar upload triggers keyboard-accessible (Enter/Space on button)
- Skill cards navigable via Tab; skill editor via arrow keys in list
- Color is never the only differentiator (verification always has both color AND icon)
- Reduced motion: all transitions respect `prefers-reduced-motion`
- ARIA labels on all icon-only buttons
- Drag-and-drop reordering has keyboard alternative (↑/↓ arrow key move)

### 9.5 Mobile-Specific Behavior

- Cover editor: simplified UI — drag only, no zoom (pinch zoom on next phase)
- Identity strip: avatar, name, headline stacked; badges wrap; CTAs full-width
- Skills panel: single-column cards; tab bar scrolls horizontally
- Sidebar: accordion collapsed by default, expandable
- Sticky header: shows at 60% of cover height scroll (earlier than desktop)

---

## 10. Data Model

### 10.1 Profile Media Fields (add to existing profiles table)

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  avatar_url          TEXT,           -- Supabase Storage URL
  avatar_thumb_url    TEXT,           -- 80x80 thumbnail URL
  cover_url           TEXT,           -- Cover image URL
  cover_focal_x       FLOAT DEFAULT 0.5,
  cover_focal_y       FLOAT DEFAULT 0.5,
  cover_theme         TEXT,           -- null if uploaded, or theme key
  bio                 TEXT,           -- max 600 chars
  headline            TEXT,           -- max 120 chars
  location            TEXT,
  availability        TEXT DEFAULT 'not_specified' CHECK (availability IN (
                        'open_roles', 'open_freelance', 'not_looking',
                        'exploring', 'not_specified'
                      )),
  available_from      DATE,
  profile_visibility  TEXT DEFAULT 'public' CHECK (profile_visibility IN (
                        'public', 'recruiter', 'private'
                      )),
  career_signals      JSONB DEFAULT '[]'::jsonb,   -- system-generated, refreshed weekly
  profile_updated_at  TIMESTAMPTZ DEFAULT NOW();
```

### 10.2 Skills Table

```sql
CREATE TABLE IF NOT EXISTS user_skills (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Identity
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,              -- normalized: "react", "typescript"
  group_type      TEXT NOT NULL CHECK (group_type IN (
                    'core', 'domain', 'proof', 'tool_stack',
                    'growth', 'verified_strength', 'career_signal'
                  )),
  domain          TEXT,                       -- frontend | backend | data | design | etc.
  sub_domain      TEXT,                       -- frameworks | languages | styling | etc.

  -- Level
  level           TEXT CHECK (level IN (
                    'beginner', 'developing', 'proficient', 'advanced', 'expert', 'learning'
                  )),
  level_score     SMALLINT DEFAULT 0,         -- 0–100 computed score
  self_rating     SMALLINT DEFAULT 0 CHECK (self_rating BETWEEN 0 AND 5),

  -- Proof linkage
  proof_count     SMALLINT DEFAULT 0,         -- computed: count of linked proofs
  arena_score_avg FLOAT,                      -- computed: avg arena score in this domain
  certificate_ids UUID[],                     -- linked certifications

  -- Endorsement
  endorsement_score INTEGER DEFAULT 0,        -- weighted total
  peer_endorsement_count INTEGER DEFAULT 0,

  -- Display
  priority        SMALLINT DEFAULT 0,         -- user-defined sort order within group
  is_featured     BOOLEAN DEFAULT FALSE,      -- show in Core Skills summary
  verified        BOOLEAN DEFAULT FALSE,      -- has platform-backed proof
  visibility      TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN (
                    'public', 'recruiter', 'private'
                  )),

  -- For tool_stack group
  tool_icon_url   TEXT,                       -- logo URL if available

  -- For growth group
  growth_target   TEXT,                       -- target level (beginner → intermediate)
  growth_eta      DATE,
  growth_resource TEXT,

  -- For verified_strength + career_signal (system-generated)
  confidence      FLOAT,                      -- 0–1 confidence score
  rationale       TEXT,                       -- one-line explanation
  is_system       BOOLEAN DEFAULT FALSE,      -- if true, user cannot delete (only hide)

  -- Metadata
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  source          TEXT DEFAULT 'manual' CHECK (source IN (
                    'manual', 'arena_derived', 'cert_derived', 'ai_suggested', 'proof_derived'
                  ))
);

-- Indexes
CREATE INDEX user_skills_user_id_idx     ON user_skills(user_id);
CREATE INDEX user_skills_group_type_idx  ON user_skills(group_type);
CREATE INDEX user_skills_domain_idx      ON user_skills(domain);
CREATE INDEX user_skills_slug_idx        ON user_skills(user_id, slug);

-- Unique: one record per user per skill slug per group
CREATE UNIQUE INDEX user_skills_unique ON user_skills(user_id, slug, group_type);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_skills" ON user_skills
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "public_read_public_skills" ON user_skills
  FOR SELECT USING (visibility = 'public');
```

### 10.3 Skill Endorsements Table

```sql
CREATE TABLE IF NOT EXISTS skill_endorsements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id        UUID NOT NULL REFERENCES user_skills(id) ON DELETE CASCADE,
  endorser_id     UUID,                       -- null for system endorsements
  endorsement_type TEXT NOT NULL CHECK (endorsement_type IN (
                    'arena_validated', 'cert_backed', 'employer_verified',
                    'peer', 'self_noted'
                  )),
  weight          SMALLINT NOT NULL,          -- per ENDORSEMENT_WEIGHTS table
  note            TEXT,                       -- optional note from endorser
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.4 Supabase Storage Bucket Config

```
Bucket: profile-media
├── {user_id}/
│   ├── avatar.webp          — 400×400, WebP, quality 0.92
│   ├── avatar_thumb.webp    — 80×80, WebP, quality 0.85
│   └── cover.webp           — 1400×350, WebP, quality 0.85

Bucket policies:
  - Authenticated read own folder
  - Authenticated write own folder
  - Public read (for portfolio display)
  - Max file size: 5 MB (post-compression upload, enforced server-side)
```

---

## 11. Skills Configuration Reference

The skills system is driven by a static config that defines:
- All valid domains and sub-domains
- Default skill templates per domain/role
- AI suggestion rules
- Level thresholds

See `frontend/src/config/skillGroups.js` (companion file).

---

## 12. Implementation Phases

### Phase 1 — Foundation (Week 1)
- Profile page skeleton with all zones
- CoverZone display (no upload yet)
- AvatarCircle with initials fallback
- IdentityStrip read-only
- Bio section read-only

### Phase 2 — Media Upload (Week 2)
- AvatarEditor: drag-drop, crop, compress, upload
- CoverEditor: drag-drop, reposition, focal point
- useImageUpload hook
- Supabase Storage bucket + policies
- DB: add avatar/cover columns to profiles

### Phase 3 — Edit Mode (Week 3)
- Edit mode toggle
- Inline editing: headline, bio, availability
- Draft autosave to localStorage
- Undo/discard controls
- ProfileStickyHeader on scroll

### Phase 4 — Skills System (Weeks 4–5)
- user_skills table + RLS
- SkillsPanel with tabs
- CoreSkills + DomainSkills groups
- ToolStack tag cloud
- GrowthSkills
- SkillEditor modal (add/edit/remove)
- Skills visibility controls

### Phase 5 — Proof + Signals (Week 6)
- ProofSkills auto-population from career_timeline
- VerifiedStrengths (arena-derived)
- CareerSignals computation job (Supabase edge function)
- AISuggestions banner
- Endorsement tracking

### Phase 6 — Recruiter View (Week 7)
- Recruiter-mode URL: /profile/:userId?mode=recruiter
- Recruiter view banner
- Filtered visibility (public + recruiter items only)
- Score card shown in recruiter view
- "Save Candidate" action (future: recruiter dashboard)

---

*Capabilio Profile System Spec v1.0 — A profile page that proves, not just claims.*
