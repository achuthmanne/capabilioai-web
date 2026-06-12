# Capabilio — Frontend Architecture Restructuring Plan

> **Prepared for:** Venkata Kopuri  
> **Codebase:** `capabilio-web/frontend/` (React + Vite SPA)  
> **Date:** June 2026  
> **Scope:** Complete folder restructuring, routing overhaul, config-driven navigation, permission model, migration plan

---

## IMPORTANT: Stack Reality Check

**Your current stack is React + Vite — not Next.js.**  
The codebase uses `vite.config.js`, `import.meta.env`, and Vercel Analytics for a SPA. There is no App Router, no SSR, and no file-based routing.

**Recommendation: Stay on Vite + React and add React Router v6.**  
Migrating to Next.js is a separate, larger project. It buys you SSR and SEO — valuable if you later need public-facing indexed pages (portfolio, job listings). For now, the path-based product UX you are building fits a SPA perfectly. This document designs for **Vite + React Router v6**.

If you decide to migrate to Next.js later, the feature-folder structure designed here maps directly to App Router route groups with zero rework to business logic.

---

## 1. RECOMMENDED ARCHITECTURE SUMMARY

### Core Principles

| Principle | Implementation |
|-----------|---------------|
| Routing is URL-based | React Router v6 replaces the `currentPage` state machine |
| App shell is thin | `App.jsx` shrinks to ~25 lines; all layout is in `app/layouts/` |
| Domain logic is path-isolated | `features/student/`, `features/professional/`, etc. |
| Navigation is config-driven | No nav hardcoded in components; all defined in `config/nav/` |
| Tabs are config-driven | No tab arrays inside page files; defined in `config/tabs/` |
| Permissions are centralized | One file maps roles to accessible paths and pages |
| Shared UI never imports domain logic | `components/` has zero knowledge of student/professional |
| Imports use aliases | `@features/`, `@components/`, `@config/`, `@hooks/`, `@services/` |

### What Changes vs. What Stays

| Keep | Change |
|------|--------|
| `lib/supabase.js` as-is | Routing: state machine → React Router v6 |
| `lib/api.js` (rename to `services/api.client.js`) | `App.jsx`: 600 lines → ~25 lines |
| Supabase auth logic | `AuthModal`: extract out of App.jsx |
| All existing component logic | All pages: move from `pages/` to `features/<path>/<page>/` |
| Vercel Analytics | Nav config: hardcoded in App.jsx → `config/nav/` |
| Vite build setup | Tab config: inline in pages → `config/tabs/` |

---

## 2. FINAL FOLDER TREE

```
frontend/
├── index.html
├── vite.config.js
├── .env (VITE_SUPABASE_URL, VITE_API_URL, etc.)
│
└── src/
    │
    ├── app/                          # App shell — routing, layouts, providers only
    │   ├── App.jsx                   # Root: ~25 lines, just <AppProviders> + <RouterProvider>
    │   ├── router.jsx                # All <Route> definitions in one place
    │   ├── layouts/
    │   │   ├── AppLayout.jsx         # Authenticated shell: header + sidebar + <Outlet>
    │   │   ├── PathLayout.jsx        # Per-path layout wrapper (injects path accent color)
    │   │   ├── AuthLayout.jsx        # Landing / login / signup pages
    │   │   └── PublicLayout.jsx      # Portfolio, pricing (no sidebar)
    │   └── providers/
    │       ├── AuthProvider.jsx      # Supabase auth state + session subscription
    │       ├── UserProvider.jsx      # User profile doc subscription
    │       └── AppProviders.jsx      # Composes all providers for App.jsx
    │
    ├── features/                     # All domain logic lives here
    │   │
    │   ├── auth/                     # Auth flows (extracted from App.jsx)
    │   │   ├── AuthModal.jsx
    │   │   ├── LoginForm.jsx
    │   │   ├── SignupForm.jsx
    │   │   ├── GoogleOAuthButton.jsx
    │   │   ├── ReferralCodeInput.jsx
    │   │   └── hooks/
    │   │       └── useAuthForm.js
    │   │
    │   ├── onboarding/
    │   │   ├── OnboardingPage.jsx    # (was Onboarding.jsx)
    │   │   └── steps/
    │   │       ├── PathSelector.jsx  # (was AccountType.jsx)
    │   │       └── ProfileSetup.jsx
    │   │
    │   ├── student/
    │   │   ├── _layout/
    │   │   │   └── StudentLayout.jsx # Student-specific shell (if needed)
    │   │   ├── aura/
    │   │   │   ├── AuraPage.jsx      # (was pages/Aura.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   ├── components/
    │   │   │   │   ├── CareerTimeline.jsx
    │   │   │   │   ├── SkillGraphView.jsx
    │   │   │   │   └── VaultManager.jsx
    │   │   │   └── hooks/
    │   │   │       └── useAuraData.js
    │   │   ├── arena/
    │   │   │   ├── ArenaPage.jsx     # (was pages/Arena.jsx)
    │   │   │   ├── ArenaWorkstations.jsx
    │   │   │   ├── tabs.config.js
    │   │   │   ├── components/
    │   │   │   └── hooks/
    │   │   │       ├── useArenaMissions.js
    │   │   │       └── useArenaState.js
    │   │   ├── pulse/
    │   │   │   ├── PulsePage.jsx     # (was pages/Pulse.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── skill-studio/
    │   │   │   ├── SkillStudioPage.jsx  # (was pages/SkillStudio.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── launchpad/
    │   │   │   ├── LaunchpadPage.jsx    # (was pages/Launchpad.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── ai-interview/
    │   │   │   ├── AIInterviewPage.jsx  # (was nested in Aura tabs)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── skill-gaps/
    │   │   │   ├── SkillGapsPage.jsx
    │   │   │   └── components/
    │   │   ├── vault/
    │   │   │   ├── VaultPage.jsx
    │   │   │   └── components/
    │   │   └── network/
    │   │       ├── NetworkPage.jsx      # (was pages/Nexus.jsx for student)
    │   │       └── components/
    │   │
    │   ├── professional/
    │   │   ├── dashboard/
    │   │   │   ├── DashboardPage.jsx    # (was pages/ProfessionalHome.jsx)
    │   │   │   └── components/
    │   │   ├── orbit/
    │   │   │   ├── OrbitPage.jsx        # (was pages/Orbit.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── forge/
    │   │   │   ├── ForgePage.jsx        # (was pages/Forge.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── launchpad/
    │   │   │   ├── LaunchpadPage.jsx    # Shared concept, path-specific instance
    │   │   │   └── components/
    │   │   ├── pulse/
    │   │   │   ├── PulsePage.jsx        # Professional feed view
    │   │   │   └── components/
    │   │   ├── nexus/
    │   │   │   ├── NexusPage.jsx        # (was pages/Nexus.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   └── vault/
    │   │       ├── VaultPage.jsx
    │   │       └── components/
    │   │
    │   ├── executive/
    │   │   ├── command/
    │   │   │   ├── CommandPage.jsx      # (was pages/ExecutiveHome.jsx)
    │   │   │   ├── tabs.config.js
    │   │   │   └── components/
    │   │   ├── intelligence/
    │   │   │   ├── IntelligencePage.jsx # (was pages/OrgIntelligence.jsx → exec variant)
    │   │   │   └── components/
    │   │   ├── operations/
    │   │   │   ├── OperationsPage.jsx
    │   │   │   └── components/
    │   │   ├── network/
    │   │   │   ├── NetworkPage.jsx      # (was pages/ExecutiveNetwork.jsx)
    │   │   │   └── components/
    │   │   ├── policy/
    │   │   │   ├── PolicyPage.jsx
    │   │   │   └── components/
    │   │   ├── ai-control/
    │   │   │   ├── AIControlPage.jsx    # (was pages/SignalRooms.jsx)
    │   │   │   └── components/
    │   │   └── reports/
    │   │       ├── ReportsPage.jsx
    │   │       └── components/
    │   │
    │   ├── organization/
    │   │   │
    │   │   ├── college/
    │   │   │   ├── dashboard/
    │   │   │   │   ├── DashboardPage.jsx   # (was pages/OrgHome.jsx → college)
    │   │   │   │   └── components/
    │   │   │   ├── placement-hub/
    │   │   │   │   ├── PlacementHubPage.jsx
    │   │   │   │   ├── tabs.config.js
    │   │   │   │   └── components/
    │   │   │   ├── department-grid/
    │   │   │   │   ├── DepartmentGridPage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── student-graph/
    │   │   │   │   ├── StudentGraphPage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── faculty-engine/
    │   │   │   │   ├── FacultyEnginePage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── alumni-intelligence/
    │   │   │   │   ├── AlumniIntelligencePage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── communications/
    │   │   │   │   ├── CommunicationsPage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── automation-center/
    │   │   │   │   ├── AutomationCenterPage.jsx
    │   │   │   │   └── components/
    │   │   │   ├── integrations/
    │   │   │   │   ├── IntegrationsPage.jsx
    │   │   │   │   └── components/
    │   │   │   └── settings/
    │   │   │       ├── SettingsPage.jsx    # (was pages/OrgSettings.jsx)
    │   │   │       └── components/
    │   │   │
    │   │   └── company/
    │   │       ├── dashboard/
    │   │       │   ├── DashboardPage.jsx   # (was pages/OrgHome.jsx → company)
    │   │       │   └── components/
    │   │       ├── talent-hub/
    │   │       │   ├── TalentHubPage.jsx
    │   │       │   ├── tabs.config.js
    │   │       │   └── components/
    │   │       ├── ats-plus/
    │   │       │   ├── ATSPlusPage.jsx
    │   │       │   └── components/
    │   │       ├── culture-dna/
    │   │       │   ├── CultureDNAPage.jsx
    │   │       │   └── components/
    │   │       ├── campus-connect/
    │   │       │   ├── CampusConnectPage.jsx
    │   │       │   └── components/
    │   │       ├── interview-cloud/
    │   │       │   ├── InterviewCloudPage.jsx
    │   │       │   └── components/
    │   │       ├── employee-referral/
    │   │       │   ├── EmployeeReferralPage.jsx
    │   │       │   └── components/
    │   │       ├── analytics/
    │   │       │   ├── AnalyticsPage.jsx
    │   │       │   └── components/
    │   │       ├── automation-center/
    │   │       │   ├── AutomationCenterPage.jsx
    │   │       │   └── components/
    │   │       └── settings/
    │   │           ├── SettingsPage.jsx
    │   │           └── components/
    │   │
    │   └── public/                       # No-auth public pages
    │       ├── landing/
    │       │   └── LandingPage.jsx       # (was pages/LandingPage.jsx)
    │       ├── pricing/
    │       │   └── PricingPage.jsx       # (was pages/Pricing.jsx)
    │       └── portfolio/
    │           ├── PortfolioPage.jsx     # (was pages/Portfolio.jsx)
    │           ├── PortfolioPDFRenderer.jsx
    │           ├── PortfolioTemplates.jsx
    │           ├── PortfolioThemes.jsx
    │           └── TemplateGallery.jsx
    │
    ├── components/                       # Shared UI — zero domain knowledge
    │   ├── ui/                           # Primitive building blocks
    │   │   ├── Button.jsx
    │   │   ├── Input.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Tabs.jsx                  # Generic tab bar component
    │   │   ├── Badge.jsx
    │   │   ├── Card.jsx
    │   │   ├── Avatar.jsx
    │   │   ├── Spinner.jsx
    │   │   └── PageLoader.jsx            # (was in components/CapUI.jsx)
    │   ├── navigation/
    │   │   ├── AppHeader.jsx             # (was Header.jsx — path-aware header)
    │   │   ├── PathSidebar.jsx           # (was PathNav.jsx)
    │   │   ├── TabBar.jsx                # Renders a tabs.config.js array
    │   │   └── Breadcrumb.jsx
    │   ├── data-display/
    │   │   ├── DataTable.jsx
    │   │   ├── AnalyticsCard.jsx
    │   │   ├── ScoreWidget.jsx           # ELO chip, rating displays
    │   │   ├── ProfilePanel.jsx
    │   │   └── FilterBar.jsx
    │   └── feedback/
    │       ├── EmptyState.jsx
    │       ├── ErrorBoundary.jsx
    │       └── Toast.jsx
    │
    ├── config/                           # Static config — plain JS, no React
    │   ├── nav/
    │   │   ├── student.nav.js
    │   │   ├── professional.nav.js
    │   │   ├── executive.nav.js
    │   │   ├── organization-college.nav.js
    │   │   └── organization-company.nav.js
    │   ├── tabs/
    │   │   ├── student/
    │   │   │   ├── aura.tabs.js
    │   │   │   ├── arena.tabs.js
    │   │   │   ├── pulse.tabs.js
    │   │   │   └── skill-studio.tabs.js
    │   │   ├── professional/
    │   │   │   ├── orbit.tabs.js
    │   │   │   ├── forge.tabs.js
    │   │   │   └── nexus.tabs.js
    │   │   ├── executive/
    │   │   │   └── command.tabs.js
    │   │   └── organization/
    │   │       └── placement-hub.tabs.js
    │   ├── paths.config.js               # Path metadata (icon, color, label)
    │   ├── permissions.config.js         # Role → allowed paths + pages
    │   ├── routes.config.js              # URL constants (single source of truth)
    │   └── plans.js                      # (existing — keep as-is)
    │
    ├── hooks/                            # Global shared hooks only
    │   ├── useAuth.js                    # Reads AuthContext
    │   ├── useUser.js                    # Reads UserContext
    │   ├── usePermissions.js             # Role-aware access checks
    │   ├── useNavConfig.js               # Returns nav items for current path
    │   └── useTabState.js                # Active tab from URL search param
    │
    ├── services/                         # API layer — no React, no JSX
    │   ├── api.client.js                 # (was lib/api.js — rename only)
    │   ├── supabase.client.js            # (was lib/supabase.js — rename only)
    │   ├── student/
    │   │   ├── arena.service.js          # (was api/arenaApi.js + services/arenaSkillEngine.js)
    │   │   └── skills.service.js
    │   ├── professional/
    │   │   ├── forge.service.js          # forgeApi from api.client.js
    │   │   ├── orbit.service.js          # orbitApi from api.client.js
    │   │   └── interview.service.js      # interviewApi from api.client.js
    │   └── shared/
    │       ├── pulse.service.js          # pulseApi
    │       ├── nexus.service.js          # nexusApi
    │       ├── profile.service.js        # profileApi, epfoApi, timelineApi
    │       └── vault.service.js          # vaultApi
    │
    ├── store/                            # Global client state (add Zustand)
    │   ├── auth.store.js                 # session, user object
    │   ├── user.store.js                 # userData (profile doc)
    │   └── ui.store.js                   # modals, toasts, sidebar open
    │
    ├── lib/                              # Pure utilities — no React, no API calls
    │   ├── format.js                     # currency, numbers, dates, names
    │   ├── date.js                       # date helpers
    │   └── validation.js                 # form validators
    │
    ├── types/                            # JSDoc @typedef or TS interfaces
    │   ├── user.types.js
    │   ├── path.types.js
    │   └── nav.types.js
    │
    ├── styles/
    │   ├── globals.css                   # (was index.css + App.css merged)
    │   ├── variables.css                 # CSS custom properties (--cap-bg-page etc.)
    │   └── typography.css
    │
    └── main.jsx                          # Unchanged entry point
```

---

## 3. ROUTE MAP

Install: `npm install react-router-dom` (v6)

### URL Structure

```
PUBLIC (no auth required)
  /                               → LandingPage
  /pricing                        → PricingPage
  /portfolio/:username            → PortfolioPage

ONBOARDING (auth required, profile incomplete)
  /onboarding                     → OnboardingPage
  /onboarding/path                → PathSelector step

STUDENT PATH (/student/*)
  /student                        → redirect → /student/aura
  /student/aura                   → AuraPage
  /student/aura?tab=timeline      → AuraPage, timeline tab active
  /student/arena                  → ArenaPage
  /student/pulse                  → PulsePage
  /student/skill-studio           → SkillStudioPage
  /student/launchpad              → LaunchpadPage
  /student/ai-interview           → AIInterviewPage
  /student/skill-gaps             → SkillGapsPage
  /student/vault                  → VaultPage
  /student/network                → NetworkPage

PROFESSIONAL PATH (/professional/*)
  /professional                   → redirect → /professional/orbit
  /professional/dashboard         → DashboardPage
  /professional/orbit             → OrbitPage
  /professional/orbit?tab=intel   → OrbitPage, intel tab active
  /professional/forge             → ForgePage
  /professional/launchpad         → LaunchpadPage
  /professional/pulse             → PulsePage
  /professional/nexus             → NexusPage
  /professional/vault             → VaultPage

EXECUTIVE PATH (/executive/*)
  /executive                      → redirect → /executive/command
  /executive/command              → CommandPage
  /executive/intelligence         → IntelligencePage
  /executive/operations           → OperationsPage
  /executive/network              → NetworkPage
  /executive/policy               → PolicyPage
  /executive/ai-control           → AIControlPage
  /executive/reports              → ReportsPage

ORGANIZATION — COLLEGE (/organization/college/*)
  /organization/college           → redirect → /organization/college/dashboard
  /organization/college/dashboard           → DashboardPage
  /organization/college/placement-hub       → PlacementHubPage
  /organization/college/department-grid     → DepartmentGridPage
  /organization/college/student-graph       → StudentGraphPage
  /organization/college/faculty-engine      → FacultyEnginePage
  /organization/college/alumni-intelligence → AlumniIntelligencePage
  /organization/college/communications      → CommunicationsPage
  /organization/college/automation-center   → AutomationCenterPage
  /organization/college/integrations        → IntegrationsPage
  /organization/college/settings            → SettingsPage

ORGANIZATION — COMPANY (/organization/company/*)
  /organization/company           → redirect → /organization/company/dashboard
  /organization/company/dashboard           → DashboardPage
  /organization/company/talent-hub          → TalentHubPage
  /organization/company/ats-plus            → ATSPlusPage
  /organization/company/culture-dna         → CultureDNAPage
  /organization/company/campus-connect      → CampusConnectPage
  /organization/company/interview-cloud     → InterviewCloudPage
  /organization/company/employee-referral   → EmployeeReferralPage
  /organization/company/analytics           → AnalyticsPage
  /organization/company/automation-center   → AutomationCenterPage
  /organization/company/settings            → SettingsPage
```

### router.jsx skeleton

```jsx
// src/app/router.jsx
import { createBrowserRouter, redirect } from "react-router-dom"

import AppLayout        from "./layouts/AppLayout"
import PathLayout       from "./layouts/PathLayout"
import AuthLayout       from "./layouts/AuthLayout"
import PublicLayout     from "./layouts/PublicLayout"
import ProtectedRoute   from "./guards/ProtectedRoute"
import PathGuard        from "./guards/PathGuard"

// Public
import LandingPage      from "@features/public/landing/LandingPage"
import PricingPage      from "@features/public/pricing/PricingPage"
import PortfolioPage    from "@features/public/portfolio/PortfolioPage"

// Auth
import OnboardingPage   from "@features/onboarding/OnboardingPage"

// Student
import AuraPage         from "@features/student/aura/AuraPage"
import ArenaPage        from "@features/student/arena/ArenaPage"
import PulseStudentPage from "@features/student/pulse/PulsePage"
// ... other student pages

// Professional
import OrbitPage        from "@features/professional/orbit/OrbitPage"
import ForgePage        from "@features/professional/forge/ForgePage"
// ... other professional pages

// Executive
import CommandPage      from "@features/executive/command/CommandPage"
// ... other executive pages

// Organization
import CollegeDashboard from "@features/organization/college/dashboard/DashboardPage"
import PlacementHubPage from "@features/organization/college/placement-hub/PlacementHubPage"
// ... other org pages

export const router = createBrowserRouter([
  // ── Public routes ─────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: "/",                       element: <LandingPage /> },
      { path: "/pricing",                element: <PricingPage /> },
      { path: "/portfolio/:username",    element: <PortfolioPage /> },
    ],
  },

  // ── Onboarding ────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
    ],
  },

  // ── Authenticated app shell ───────────────────────────────────
  {
    element: <ProtectedRoute requiresProfile />,
    children: [
      {
        element: <AppLayout />,
        children: [

          // Student path
          {
            element: <PathLayout path="student" />,
            children: [
              { path: "/student",              loader: () => redirect("/student/aura") },
              { path: "/student/aura",         element: <AuraPage /> },
              { path: "/student/arena",        element: <ArenaPage /> },
              { path: "/student/pulse",        element: <PulseStudentPage /> },
              // ... rest of student
            ],
          },

          // Professional path
          {
            element: <PathLayout path="professional" />,
            children: [
              { path: "/professional",         loader: () => redirect("/professional/orbit") },
              { path: "/professional/orbit",   element: <OrbitPage /> },
              { path: "/professional/forge",   element: <ForgePage /> },
              // ...
            ],
          },

          // Executive path
          {
            element: <PathLayout path="executive" />,
            children: [
              { path: "/executive",            loader: () => redirect("/executive/command") },
              { path: "/executive/command",    element: <CommandPage /> },
              // ...
            ],
          },

          // Organization — college
          {
            element: <PathLayout path="organization.college" />,
            children: [
              { path: "/organization/college", loader: () => redirect("/organization/college/dashboard") },
              { path: "/organization/college/dashboard",     element: <CollegeDashboard /> },
              { path: "/organization/college/placement-hub", element: <PlacementHubPage /> },
              // ...
            ],
          },

          // Organization — company
          {
            element: <PathLayout path="organization.company" />,
            children: [
              { path: "/organization/company", loader: () => redirect("/organization/company/dashboard") },
              // ...
            ],
          },

        ],
      },
    ],
  },
])
```

---

## 4. FEATURE-MODULE MAP

Every page module owns exactly these files. No more, no less by default:

```
features/<path>/<page>/
├── <PageName>Page.jsx     # The route-entry component. Thin: imports module + passes props.
├── tabs.config.js         # Tab array for this page (if tabbed). Import into TabBar.
├── components/            # UI components used only by this page
│   ├── <Widget>.jsx
│   └── <Panel>.jsx
├── hooks/                 # Hooks used only by this page
│   └── use<Feature>.js
└── index.js               # Barrel export: export { default } from "./<PageName>Page"
```

### Current pages → new locations

| Old file | New location |
|----------|-------------|
| `pages/Aura.jsx` | `features/student/aura/AuraPage.jsx` |
| `pages/Arena.jsx` | `features/student/arena/ArenaPage.jsx` |
| `pages/ArenaWorkstations.jsx` | `features/student/arena/components/ArenaWorkstations.jsx` |
| `pages/Pulse.jsx` | `features/student/pulse/PulsePage.jsx` (student) |
| `pages/SkillStudio.jsx` | `features/student/skill-studio/SkillStudioPage.jsx` |
| `pages/Launchpad.jsx` | `features/student/launchpad/LaunchpadPage.jsx` |
| `pages/StudentHome.jsx` | `features/student/aura/AuraPage.jsx` (merge or redirect) |
| `pages/Orbit.jsx` | `features/professional/orbit/OrbitPage.jsx` |
| `pages/OrbitDashboard.jsx` | DELETE (superseded by Orbit.jsx — confirm first) |
| `pages/OrbitDashboard.jsx.bak` | DELETE immediately |
| `pages/Arena.jsx.bak` | DELETE immediately |
| `pages/Forge.jsx` | `features/professional/forge/ForgePage.jsx` |
| `pages/Nexus.jsx` | `features/professional/nexus/NexusPage.jsx` |
| `pages/ProfessionalHome.jsx` | `features/professional/dashboard/DashboardPage.jsx` |
| `pages/ExecutiveHome.jsx` | `features/executive/command/CommandPage.jsx` |
| `pages/ExecutiveNetwork.jsx` | `features/executive/network/NetworkPage.jsx` |
| `pages/SignalRooms.jsx` | `features/executive/ai-control/AIControlPage.jsx` |
| `pages/OrgHome.jsx` | Split: `org/college/dashboard/` + `org/company/dashboard/` |
| `pages/OrgIntelligence.jsx` | `features/executive/intelligence/IntelligencePage.jsx` |
| `pages/OrgTasks.jsx` | `features/organization/college/automation-center/` |
| `pages/OrgPeople.jsx` | `features/organization/college/student-graph/` |
| `pages/OrgSettings.jsx` | `features/organization/college/settings/SettingsPage.jsx` |
| `pages/LandingPage.jsx` | `features/public/landing/LandingPage.jsx` |
| `pages/Pricing.jsx` | `features/public/pricing/PricingPage.jsx` |
| `pages/Portfolio.jsx` | `features/public/portfolio/PortfolioPage.jsx` |
| `pages/PortfolioPDFRenderer.jsx` | `features/public/portfolio/PortfolioPDFRenderer.jsx` |
| `pages/PortfolioTemplates.jsx` | `features/public/portfolio/PortfolioTemplates.jsx` |
| `pages/PortfolioThemes.jsx` | `features/public/portfolio/PortfolioThemes.jsx` |
| `pages/TemplateGallery.jsx` | `features/public/portfolio/TemplateGallery.jsx` |
| `pages/AuthorityProfile.jsx` | `features/executive/command/components/AuthorityProfile.jsx` |
| `pages/Onboarding.jsx` | `features/onboarding/OnboardingPage.jsx` |
| `pages/AccountType.jsx` | `features/onboarding/steps/PathSelector.jsx` |
| `pages/CareerVideoGenerator.jsx` | `features/student/launchpad/components/CareerVideoGenerator.jsx` |
| `components/CareerTimeline.jsx` | `features/student/aura/components/CareerTimeline.jsx` |
| `components/SkillGraphView.jsx` | `features/student/aura/components/SkillGraphView.jsx` |
| `components/VaultManager.jsx` | `features/student/vault/components/VaultManager.jsx` |
| `components/PortfolioTemplatePicker.jsx` | `features/public/portfolio/PortfolioTemplatePicker.jsx` |
| `components/CapUI.jsx` | Split: `components/ui/PageLoader.jsx`, etc. |
| `components/Header.jsx` | `components/navigation/AppHeader.jsx` |
| `components/PathNav.jsx` | `components/navigation/PathSidebar.jsx` |
| `components/BottomNav.jsx` | `components/navigation/BottomNav.jsx` |
| `lib/api.js` | `services/api.client.js` (same content, rename) |
| `lib/supabase.js` | `services/supabase.client.js` (same content, rename) |
| `lib/db.js` | `services/user.service.js` or keep as `lib/db.js` |
| `hooks/useArenaMissions.js` | `features/student/arena/hooks/useArenaMissions.js` |
| `hooks/useArenaState.js` | `features/student/arena/hooks/useArenaState.js` |
| `hooks/useRazorpay.js` | `hooks/useRazorpay.js` (shared — keep global) |
| `api/arenaApi.js` | `services/student/arena.service.js` |
| `services/arenaSkillEngine.js` | `services/student/arena.service.js` (merge) |
| `config/arenaDomains.js` | `features/student/arena/arena-domains.config.js` |
| `config/plans.js` | `config/plans.js` (keep as-is) |

---

## 5. CONFIG ARCHITECTURE

### 5A. paths.config.js — Path metadata (replaces PATH_META in App.jsx)

```js
// src/config/paths.config.js

export const PATHS = {
  student: {
    id:       "student",
    label:    "Student",
    icon:     "🎓",
    color:    "#FF5701",
    bg:       "#FFF1E8",
    desc:     "Prove your skills through real challenges.",
    subDesc:  "ELO starts at 400.",
    rootPath: "/student/aura",
  },
  professional: {
    id:       "professional",
    label:    "Professional",
    icon:     "💼",
    color:    "#7C3AED",
    bg:       "#F4F0FF",
    desc:     "Build your verified career intelligence.",
    subDesc:  "UAN-backed, AI-powered.",
    rootPath: "/professional/orbit",
  },
  executive: {
    id:       "executive",
    label:    "Executive",
    icon:     "✦",
    color:    "#C9A84C",
    bg:       "#FFFDF5",
    desc:     "Authority profile. Sell your time.",
    subDesc:  "Invite-only.",
    rootPath: "/executive/command",
  },
  "organization.college": {
    id:       "organization.college",
    label:    "College / University",
    icon:     "🏛️",
    color:    "#D97706",
    bg:       "#FFF7E8",
    desc:     "Track cohort ELO. Place verified talent.",
    subDesc:  "Automate placements.",
    rootPath: "/organization/college/dashboard",
  },
  "organization.company": {
    id:       "organization.company",
    label:    "Company",
    icon:     "🏢",
    color:    "#0F766E",
    bg:       "#F0FDFA",
    desc:     "Hire verified talent. Build culture.",
    subDesc:  "AI-powered hiring.",
    rootPath: "/organization/company/dashboard",
  },
}

export function getPathConfig(pathId) {
  return PATHS[pathId] ?? PATHS.student
}
```

### 5B. Nav configs — one file per path

```js
// src/config/nav/student.nav.js

export const STUDENT_NAV = [
  { id: "aura",         label: "Aura",         href: "/student/aura",         prefix: "+",  icon: "aura" },
  { id: "arena",        label: "Arena",        href: "/student/arena",        prefix: "×",  icon: "arena" },
  { id: "pulse",        label: "Pulse",        href: "/student/pulse",        prefix: "⚡", icon: "pulse" },
  { id: "skill-studio", label: "Skill Studio", href: "/student/skill-studio", prefix: "🎓", icon: "skill-studio" },
  { id: "launchpad",    label: "Launchpad",    href: "/student/launchpad",    prefix: "🚀", icon: "launchpad" },
  { id: "ai-interview", label: "AI Interview", href: "/student/ai-interview", prefix: "🤖", icon: "ai-interview" },
  { id: "skill-gaps",   label: "Skill Gaps",   href: "/student/skill-gaps",   prefix: "△",  icon: "skill-gaps" },
  { id: "vault",        label: "Vault",        href: "/student/vault",        prefix: "🔒", icon: "vault" },
  { id: "network",      label: "Network",      href: "/student/network",      prefix: "◎",  icon: "network" },
]
```

```js
// src/config/nav/professional.nav.js
export const PROFESSIONAL_NAV = [
  { id: "dashboard", label: "Dashboard", href: "/professional/dashboard", prefix: "◈" },
  { id: "orbit",     label: "Orbit",     href: "/professional/orbit",     prefix: "⊙" },
  { id: "forge",     label: "Forge",     href: "/professional/forge",     prefix: "⚒" },
  { id: "launchpad", label: "Launchpad", href: "/professional/launchpad", prefix: "🚀" },
  { id: "pulse",     label: "Pulse",     href: "/professional/pulse",     prefix: "⚡" },
  { id: "nexus",     label: "Nexus",     href: "/professional/nexus",     prefix: "◎" },
  { id: "vault",     label: "Vault",     href: "/professional/vault",     prefix: "🔒" },
]
```

### 5C. Tabs config — per page

```js
// src/config/tabs/student/aura.tabs.js

export const AURA_TABS = [
  { id: "overview",     label: "Overview",      roles: ["student"] },
  { id: "timeline",     label: "Career Timeline", roles: ["student"] },
  { id: "skills",       label: "Skills",        roles: ["student"] },
  { id: "vault",        label: "Vault",         roles: ["student"] },
  { id: "ai-interview", label: "AI Interview",  roles: ["student"], badge: "AI" },
  { id: "portfolio",    label: "Portfolio",     roles: ["student"] },
]

// Usage in AuraPage.jsx:
// import { AURA_TABS } from "@config/tabs/student/aura.tabs"
// const visibleTabs = AURA_TABS.filter(t => t.roles.includes(userRole))
// <TabBar tabs={visibleTabs} />
```

```js
// src/config/tabs/professional/orbit.tabs.js
export const ORBIT_TABS = [
  { id: "overview",      label: "Overview",         roles: ["professional"] },
  { id: "intelligence",  label: "Intelligence",     roles: ["professional"] },
  { id: "career",        label: "Career",           roles: ["professional"] },
  { id: "market",        label: "Market",           roles: ["professional"] },
  { id: "applications",  label: "Applications",     roles: ["professional"] },
]
```

### 5D. routes.config.js — URL constants (never hardcode /student/aura again)

```js
// src/config/routes.config.js

export const ROUTES = {
  home:    "/",
  pricing: "/pricing",
  portfolio: (username) => `/portfolio/${username}`,

  onboarding: "/onboarding",

  student: {
    root:         "/student",
    aura:         "/student/aura",
    arena:        "/student/arena",
    pulse:        "/student/pulse",
    skillStudio:  "/student/skill-studio",
    launchpad:    "/student/launchpad",
    aiInterview:  "/student/ai-interview",
    skillGaps:    "/student/skill-gaps",
    vault:        "/student/vault",
    network:      "/student/network",
  },

  professional: {
    root:       "/professional",
    dashboard:  "/professional/dashboard",
    orbit:      "/professional/orbit",
    forge:      "/professional/forge",
    launchpad:  "/professional/launchpad",
    pulse:      "/professional/pulse",
    nexus:      "/professional/nexus",
    vault:      "/professional/vault",
  },

  executive: {
    root:          "/executive",
    command:       "/executive/command",
    intelligence:  "/executive/intelligence",
    operations:    "/executive/operations",
    network:       "/executive/network",
    policy:        "/executive/policy",
    aiControl:     "/executive/ai-control",
    reports:       "/executive/reports",
  },

  organization: {
    college: {
      root:               "/organization/college",
      dashboard:          "/organization/college/dashboard",
      placementHub:       "/organization/college/placement-hub",
      departmentGrid:     "/organization/college/department-grid",
      studentGraph:       "/organization/college/student-graph",
      facultyEngine:      "/organization/college/faculty-engine",
      alumniIntelligence: "/organization/college/alumni-intelligence",
      communications:     "/organization/college/communications",
      automationCenter:   "/organization/college/automation-center",
      integrations:       "/organization/college/integrations",
      settings:           "/organization/college/settings",
    },
    company: {
      root:             "/organization/company",
      dashboard:        "/organization/company/dashboard",
      talentHub:        "/organization/company/talent-hub",
      atsPlus:          "/organization/company/ats-plus",
      cultureDNA:       "/organization/company/culture-dna",
      campusConnect:    "/organization/company/campus-connect",
      interviewCloud:   "/organization/company/interview-cloud",
      employeeReferral: "/organization/company/employee-referral",
      analytics:        "/organization/company/analytics",
      automationCenter: "/organization/company/automation-center",
      settings:         "/organization/company/settings",
    },
  },
}
```

### 5E. permissions.config.js

```js
// src/config/permissions.config.js

// Maps Supabase profile `path` + `role` values to accessible route prefixes
// Checked at PathGuard level — prevents URL bar access to wrong paths

export const ROLE_PATHS = {
  // path value in user profile → accessible URL prefixes
  student:      ["/student"],
  professional: ["/professional"],
  authority:    ["/executive"],

  // institution sub-types — set `org_type` field on profile
  "institution.college": ["/organization/college"],
  "institution.company": ["/organization/company"],
}

// Granular page-level permissions (optional, use for tab visibility)
export const PAGE_ROLES = {
  // page id → roles that can see it
  "student.skill-gaps":           ["student"],
  "professional.orbit":           ["professional"],
  "executive.ai-control":         ["executive", "super_admin"],
  "organization.college.faculty-engine": ["faculty_mentor", "placement_officer", "super_admin"],
}

// Role display names (for UI)
export const ROLE_LABELS = {
  student:            "Student",
  professional:       "Professional",
  executive:          "Executive",
  placement_officer:  "Placement Officer",
  department_head:    "Department Head",
  faculty_mentor:     "Faculty Mentor",
  recruiter:          "Recruiter",
  hiring_manager:     "Hiring Manager",
  super_admin:        "Super Admin",
}
```

---

## 6. MIGRATION STEPS

Follow this sequence. Each step is independently deployable — nothing breaks between steps.

### Phase 0 — Cleanup (30 minutes)
```
1. Delete frontend/src/pages/Arena.jsx.bak
2. Delete frontend/src/pages/OrbitDashboard.jsx.bak
3. Verify OrbitDashboard.jsx is fully superseded by Orbit.jsx → then delete OrbitDashboard.jsx
4. git commit: "chore: remove .bak files and superseded pages"
```

### Phase 1 — Install React Router (1 hour)
```
1. npm install react-router-dom
2. Wrap App.jsx with <BrowserRouter> temporarily (keep current page state working)
3. Add <Routes> around existing page renders (each currentPage === "x" becomes a <Route>)
4. Verify all pages still render
5. git commit: "feat: add react-router-dom, routes mirror current state machine"
```

### Phase 2 — Create folder structure (2 hours)
```
1. Create all directories:
   src/app/layouts/
   src/app/providers/
   src/features/student/
   src/features/professional/
   src/features/executive/
   src/features/organization/college/
   src/features/organization/company/
   src/features/public/
   src/features/auth/
   src/features/onboarding/
   src/config/nav/
   src/config/tabs/student/
   src/config/tabs/professional/
   src/config/tabs/executive/
   src/config/tabs/organization/
   src/services/student/
   src/services/professional/
   src/services/shared/
   src/store/
   src/types/

2. Create empty index.js barrels in each feature folder
3. git commit: "chore: scaffold feature folder structure"
```

### Phase 3 — Extract providers from App.jsx (2 hours)
```
1. Create src/app/providers/AuthProvider.jsx
   - Move: Supabase onAuthStateChange listener
   - Move: user, loading state
   - Export: useAuth hook

2. Create src/app/providers/UserProvider.jsx
   - Move: userDoc.subscribe logic
   - Move: userData, onboardingDone state
   - Export: useUser hook

3. Create src/app/providers/AppProviders.jsx
   - Compose AuthProvider + UserProvider

4. Shrink App.jsx to: <AppProviders><RouterProvider router={router} /></AppProviders>
5. git commit: "refactor: extract auth + user providers from App.jsx"
```

### Phase 4 — Extract auth UI from App.jsx (2 hours)
```
1. Create src/features/auth/AuthModal.jsx  ← move the 300-line AuthModal function
2. Create src/features/auth/LoginForm.jsx
3. Create src/features/auth/SignupForm.jsx
4. Create src/features/auth/GoogleOAuthButton.jsx
5. Create src/features/auth/ReferralCodeInput.jsx
6. Create src/features/auth/hooks/useAuthForm.js
7. Update App.jsx to import from features/auth/
8. git commit: "refactor: extract AuthModal into features/auth/"
```

### Phase 5 — Move pages to feature folders (1 day, path by path)
```
ORDER: student → professional → executive → organization → public

For each page:
  a. Create features/<path>/<page>/index.jsx with the page content
  b. Update the import in router.jsx
  c. Verify route still works in browser
  d. Delete old pages/ file
  e. git commit after each path

Example for student/aura:
  - Create src/features/student/aura/AuraPage.jsx ← copy from pages/Aura.jsx
  - Create src/features/student/aura/tabs.config.js
  - In router.jsx: import AuraPage from "@features/student/aura/AuraPage"
  - Test /student/aura in browser
  - Delete src/pages/Aura.jsx
  - git commit: "refactor(student): move Aura to features/student/aura/"
```

### Phase 6 — Move page-specific components (half day)
```
For each page's child components:
  components/CareerTimeline.jsx    → features/student/aura/components/
  components/SkillGraphView.jsx    → features/student/aura/components/
  components/VaultManager.jsx      → features/student/vault/components/
  components/PortfolioTemplatePicker → features/public/portfolio/
  hooks/useArenaMissions.js        → features/student/arena/hooks/
  hooks/useArenaState.js           → features/student/arena/hooks/
  api/arenaApi.js                  → services/student/arena.service.js
  services/arenaSkillEngine.js     → services/student/arena.service.js (merge)
  config/arenaDomains.js           → features/student/arena/arena-domains.config.js

git commit: "refactor: move page-specific components into feature folders"
```

### Phase 7 — Shared components cleanup (half day)
```
1. components/CapUI.jsx → split into:
   - components/ui/PageLoader.jsx
   - components/ui/Button.jsx
   - components/ui/Card.jsx
   (extract each primitive from CapUI.jsx)

2. components/Header.jsx → components/navigation/AppHeader.jsx
3. components/PathNav.jsx → components/navigation/PathSidebar.jsx
4. components/BottomNav.jsx → components/navigation/BottomNav.jsx (if still used)

git commit: "refactor: reorganize shared components"
```

### Phase 8 — Config system (half day)
```
1. Create config/paths.config.js    ← extract PATH_META from App.jsx
2. Create config/nav/student.nav.js ← extract STUDENT_HEADER_NAV from App.jsx
3. Create config/nav/professional.nav.js
4. Create config/nav/executive.nav.js
5. Create config/nav/organization-college.nav.js
6. Create config/nav/organization-company.nav.js
7. Create config/routes.config.js
8. Create config/permissions.config.js
9. Update AppHeader + PathSidebar to consume config objects

git commit: "feat: config-driven navigation system"
```

### Phase 9 — Services and store (half day)
```
1. services/api.client.js    ← rename from lib/api.js (keep same content)
2. services/supabase.client.js ← rename from lib/supabase.js
3. Split api.client.js API objects into path services:
   - services/professional/forge.service.js   ← forgeApi
   - services/professional/orbit.service.js   ← orbitApi
   - services/shared/pulse.service.js         ← pulseApi
   - services/shared/nexus.service.js         ← nexusApi
   - services/shared/profile.service.js       ← profileApi, epfoApi, timelineApi
   - services/shared/vault.service.js         ← vaultApi
4. Keep lib/api.js as a re-export shim temporarily so nothing breaks
5. Gradually update imports throughout the codebase
6. Install Zustand: npm install zustand
7. Create store/auth.store.js, store/user.store.js, store/ui.store.js

git commit: "refactor: split API client into domain services, add Zustand stores"
```

### Phase 10 — Aliases (1 hour)
```
Update vite.config.js:
  import path from "path"
  resolve: {
    alias: {
      "@app":        path.resolve(__dirname, "src/app"),
      "@features":   path.resolve(__dirname, "src/features"),
      "@components": path.resolve(__dirname, "src/components"),
      "@config":     path.resolve(__dirname, "src/config"),
      "@hooks":      path.resolve(__dirname, "src/hooks"),
      "@services":   path.resolve(__dirname, "src/services"),
      "@store":      path.resolve(__dirname, "src/store"),
      "@lib":        path.resolve(__dirname, "src/lib"),
      "@types":      path.resolve(__dirname, "src/types"),
      "@styles":     path.resolve(__dirname, "src/styles"),
    }
  }

Run find-and-replace across src/ to update ../../../ relative imports to @aliases
git commit: "chore: add vite path aliases, update imports"
```

### Phase 11 — Delete old pages/ folder
```
1. Verify pages/ is empty (all files moved)
2. rm -rf src/pages/
3. Run npm run build → must succeed with zero errors
4. git commit: "chore: remove deprecated pages/ folder"
```

### Phase 12 — Delete old styles
```
1. Merge App.css + index.css → styles/globals.css
2. Extract CSS variables → styles/variables.css
3. Update main.jsx import
4. git commit: "chore: consolidate styles"
```

---

## 7. NAMING CONVENTIONS

### Folders
- Feature folders: `kebab-case` matching the URL segment (`skill-studio`, `placement-hub`, `ai-control`)
- Always lowercase. Never camelCase folder names.

### Files

| File type | Convention | Example |
|-----------|-----------|---------|
| Route-entry page | `<PageName>Page.jsx` | `AuraPage.jsx` |
| Layout component | `<Name>Layout.jsx` | `AppLayout.jsx` |
| Shared component | `<Name>.jsx` (PascalCase) | `TabBar.jsx` |
| Page component | `<Name>.jsx` (PascalCase) | `CareerTimeline.jsx` |
| Hook | `use<Name>.js` | `useAuthForm.js` |
| Store | `<domain>.store.js` | `auth.store.js` |
| Service | `<domain>.service.js` | `forge.service.js` |
| Nav config | `<path>.nav.js` | `student.nav.js` |
| Tabs config | `<page>.tabs.js` | `aura.tabs.js` |
| Route constants | `routes.config.js` | — |
| Path metadata | `paths.config.js` | — |
| Permissions | `permissions.config.js` | — |
| Types/interfaces | `<domain>.types.js` | `user.types.js` |
| Barrel exports | `index.js` | — |

### Constants
- All caps snake case: `STUDENT_NAV`, `AURA_TABS`, `ROUTES`, `PATHS`
- One constant = one concept. Never put unrelated constants in the same file.

### Components
- One component per file. File name = component name.
- Never `index.jsx` for a component — use named files, use `index.js` only for barrel exports.

---

## 8. PERMISSION MODEL

```
Role (stored in profile.role + profile.path)
│
├── student
│   └── Can access: /student/*
│
├── professional
│   └── Can access: /professional/*
│
├── authority (executive)
│   └── Can access: /executive/*
│
├── institution.college
│   ├── placement_officer  → /organization/college/* (full access)
│   ├── department_head    → /organization/college/* (limited: own dept only)
│   └── faculty_mentor     → /organization/college/faculty-engine, student-graph
│
├── institution.company
│   ├── recruiter          → /organization/company/talent-hub, ats-plus, interview-cloud
│   ├── hiring_manager     → /organization/company/talent-hub, interview-cloud, analytics
│   └── hr_admin           → /organization/company/* (full access)
│
└── super_admin
    └── Can access: everything
```

### PathGuard implementation

```jsx
// src/app/guards/PathGuard.jsx
import { Navigate, useLocation } from "react-router-dom"
import { useUser } from "@hooks/useUser"
import { ROLE_PATHS } from "@config/permissions.config"

export default function PathGuard({ allowedPathPrefix, children }) {
  const { userData } = useUser()
  const location = useLocation()

  const userPath = userData?.path    // "student" | "professional" | "authority" | "institution"
  const orgType  = userData?.org_type // "college" | "company"
  const role     = userData?.role

  // Resolve the permission key
  const permKey = userPath === "institution"
    ? `institution.${orgType}`
    : userPath

  const allowed = ROLE_PATHS[permKey] ?? []
  const canAccess = allowed.some(prefix => location.pathname.startsWith(prefix))

  if (!canAccess) {
    // Redirect to their correct home
    const home = allowed[0] ?? "/"
    return <Navigate to={home} replace />
  }

  return children
}
```

---

## 9. ANTI-MESS RULES

These are explicit rules. Add them to your team/PR checklist.

### NEVER do these again

```
❌  pages/ folder with mixed-path page files
    → Every page lives inside features/<path>/<page>/

❌  App.jsx with 600+ lines
    → App.jsx should never exceed 30 lines

❌  Navigation arrays hardcoded inside components
    → All nav definitions live in config/nav/*.nav.js

❌  Tab arrays defined inside page files
    → All tab definitions live in config/tabs/<path>/<page>.tabs.js

❌  currentPage string state to control routing
    → React Router v6 handles all routing via URL

❌  Business logic inside route entry files (XxxPage.jsx)
    → Page files only: import module + pass props. Max 50 lines.

❌  Shared UI components (Button, Card, Modal) inside features/
    → If more than one page uses it, it belongs in components/

❌  components/ with page-specific widgets dumped next to generic UI
    → components/ = shared only; page-specific widgets = features/<path>/<page>/components/

❌  Copied constants in multiple files (nav items, tab arrays, colors)
    → One source of truth per concept. Import from config/.

❌  .bak files committed to git
    → Use git history. Never commit .bak files.

❌  Supabase auth logic repeated across page files
    → auth state lives in AuthProvider, consumed via useAuth()

❌  Direct fetch() calls inside components
    → All API calls go through services/*.service.js

❌  Inline styles for layout/spacing/color that appear >3 times
    → Move to CSS variables or Tailwind class (if you adopt Tailwind)

❌  Student and organization logic in the same feature folder
    → features/student/ never imports from features/organization/ and vice versa

❌  Hook files with generic names stored globally when they're page-specific
    → useArenaMissions.js belongs in features/student/arena/hooks/, not hooks/

❌  A single page file over 400 lines
    → Extract sub-components. If a page exceeds 400 lines, it has too much responsibility.
```

---

## 10. EXAMPLE CODE SKELETONS

### 10A. Route entry file (thin — all pages should look like this)

```jsx
// src/features/student/aura/AuraPage.jsx
import { useSearchParams } from "react-router-dom"
import { useUser }         from "@hooks/useUser"
import { useAuth }         from "@hooks/useAuth"
import { AURA_TABS }       from "@config/tabs/student/aura.tabs"
import TabBar              from "@components/navigation/TabBar"
import AuraOverview        from "./components/AuraOverview"
import CareerTimeline      from "./components/CareerTimeline"
import SkillGraphView      from "./components/SkillGraphView"
import VaultManager        from "./components/VaultManager"

const TAB_CONTENT = {
  overview:     AuraOverview,
  timeline:     CareerTimeline,
  skills:       SkillGraphView,
  vault:        VaultManager,
}

export default function AuraPage() {
  const { user }          = useAuth()
  const { userData }      = useUser()
  const [params, setParams] = useSearchParams()
  const activeTab           = params.get("tab") ?? "overview"

  const setTab = (tabId) => setParams({ tab: tabId })

  const Content = TAB_CONTENT[activeTab] ?? AuraOverview

  return (
    <div>
      <TabBar tabs={AURA_TABS} activeTab={activeTab} onTabChange={setTab} />
      <Content user={user} userData={userData} />
    </div>
  )
}
```

### 10B. Feature folder structure

```
features/student/arena/
├── ArenaPage.jsx          ← route entry (thin)
├── tabs.config.js         ← tab definitions
├── arena-domains.config.js ← (was config/arenaDomains.js)
├── components/
│   ├── ArenaWorkstations.jsx
│   ├── MissionCard.jsx
│   ├── EloProgressBar.jsx
│   └── SubmissionPanel.jsx
├── hooks/
│   ├── useArenaMissions.js
│   └── useArenaState.js
└── index.js               ← export { default } from "./ArenaPage"
```

### 10C. Nav config file

```js
// src/config/nav/executive.nav.js
export const EXECUTIVE_NAV = [
  { id: "command",      label: "Command",       href: "/executive/command",      prefix: "⌘" },
  { id: "intelligence", label: "Intelligence",  href: "/executive/intelligence", prefix: "◈" },
  { id: "operations",   label: "Operations",    href: "/executive/operations",   prefix: "⊙" },
  { id: "network",      label: "Network",       href: "/executive/network",      prefix: "◎" },
  { id: "policy",       label: "Policy",        href: "/executive/policy",       prefix: "⊞" },
  { id: "ai-control",   label: "AI Control",    href: "/executive/ai-control",   prefix: "🤖" },
  { id: "reports",      label: "Reports",       href: "/executive/reports",      prefix: "📊" },
]
```

### 10D. Tabs config file

```js
// src/config/tabs/professional/forge.tabs.js

export const FORGE_TABS = [
  {
    id:       "active",
    label:    "Active Tasks",
    roles:    ["professional"],
    default:  true,
  },
  {
    id:       "completed",
    label:    "Completed",
    roles:    ["professional"],
  },
  {
    id:       "leaderboard",
    label:    "Leaderboard",
    roles:    ["professional"],
    badge:    "Live",
  },
  {
    id:       "analytics",
    label:    "Analytics",
    roles:    ["professional", "super_admin"],
  },
]
```

### 10E. Role access config usage

```js
// src/hooks/usePermissions.js
import { useUser }      from "@hooks/useUser"
import { ROLE_PATHS, PAGE_ROLES } from "@config/permissions.config"

export function usePermissions() {
  const { userData } = useUser()
  const role  = userData?.role  ?? "student"
  const path  = userData?.path  ?? "student"

  function canAccessPage(pageId) {
    const allowed = PAGE_ROLES[pageId]
    if (!allowed) return true               // no restriction defined = open
    return allowed.includes(role) || role === "super_admin"
  }

  function canAccessPath(urlPrefix) {
    const permKey = path === "institution"
      ? `institution.${userData?.org_type}`
      : path
    const allowed = ROLE_PATHS[permKey] ?? []
    return allowed.some(p => urlPrefix.startsWith(p))
  }

  function filterTabs(tabs) {
    return tabs.filter(t => !t.roles || t.roles.includes(role) || role === "super_admin")
  }

  return { canAccessPage, canAccessPath, filterTabs, role, path }
}
```

### 10F. Page module entry pattern (AppLayout.jsx)

```jsx
// src/app/layouts/AppLayout.jsx
import { Outlet, useNavigate } from "react-router-dom"
import { useAuth }             from "@hooks/useAuth"
import { useUser }             from "@hooks/useUser"
import { useNavConfig }        from "@hooks/useNavConfig"
import AppHeader               from "@components/navigation/AppHeader"
import PathSidebar             from "@components/navigation/PathSidebar"

export default function AppLayout() {
  const { user, signOut }  = useAuth()
  const { userData }       = useUser()
  const { navItems, path } = useNavConfig()   // returns nav array for current user path
  const navigate           = useNavigate()

  return (
    <div style={{ minHeight: "100vh", background: "var(--cap-bg-page)" }}>
      <AppHeader
        user={user}
        userData={userData}
        navItems={path === "student" ? navItems : []}  // student uses header nav
        onSignOut={signOut}
      />
      {path !== "student" && (
        <PathSidebar
          navItems={navItems}
          path={path}
        />
      )}
      <main>
        <Outlet />  {/* ← page content renders here */}
      </main>
    </div>
  )
}
```

### 10G. Store pattern (Zustand)

```js
// src/store/user.store.js
import { create } from "zustand"
import { userDoc } from "@lib/db"

export const useUserStore = create((set, get) => ({
  userData:       null,
  onboardingDone: false,
  loading:        true,

  setUserData: (data) => set({
    userData:       data,
    onboardingDone: data?.onboarding_complete === true,
    loading:        false,
  }),

  clearUserData: () => set({
    userData:       null,
    onboardingDone: false,
    loading:        false,
  }),

  refreshUserData: async (uid) => {
    const data = await userDoc.get(uid)
    get().setUserData(data)
  },
}))
```

---

## 11. IMPORT ALIASES REFERENCE

After Phase 10, all imports use these aliases:

```js
// Before (relative hell)
import { useAuth } from "../../../app/providers/AuthProvider"
import TabBar from "../../components/navigation/TabBar"
import { AURA_TABS } from "../../config/tabs/student/aura.tabs"

// After (clean aliases)
import { useAuth }   from "@hooks/useAuth"
import TabBar        from "@components/navigation/TabBar"
import { AURA_TABS } from "@config/tabs/student/aura.tabs"
import AuraPage      from "@features/student/aura/AuraPage"
import { ROUTES }    from "@config/routes.config"
```

### vite.config.js final

```js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  envDir: "..",
  resolve: {
    alias: {
      "@app":        path.resolve(__dirname, "src/app"),
      "@features":   path.resolve(__dirname, "src/features"),
      "@components": path.resolve(__dirname, "src/components"),
      "@config":     path.resolve(__dirname, "src/config"),
      "@hooks":      path.resolve(__dirname, "src/hooks"),
      "@services":   path.resolve(__dirname, "src/services"),
      "@store":      path.resolve(__dirname, "src/store"),
      "@lib":        path.resolve(__dirname, "src/lib"),
      "@types":      path.resolve(__dirname, "src/types"),
      "@styles":     path.resolve(__dirname, "src/styles"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
})
```

---

## APPENDIX: VS Code Explorer — What You Will See After Migration

```
capabilio-web/frontend/src/
│
├── app/          ← Shell, routing, layouts, providers
├── features/     ← All product domain code
│   ├── student/       ← Student path pages
│   ├── professional/  ← Professional path pages
│   ├── executive/     ← Executive path pages
│   ├── organization/
│   │   ├── college/   ← College/University pages
│   │   └── company/   ← Company pages
│   ├── auth/          ← Login, signup, referral
│   ├── onboarding/    ← Path setup
│   └── public/        ← Landing, pricing, portfolio
│
├── components/   ← Shared UI only (no business logic)
├── config/       ← Navigation, tabs, routes, permissions (plain JS)
├── hooks/        ← Global shared hooks
├── services/     ← API calls only
├── store/        ← Global state (Zustand)
├── lib/          ← Pure utilities
├── types/        ← Type definitions
└── styles/       ← Global CSS, variables
```

When you open any path in VS Code Explorer, you immediately know:
- **Path** from the top-level feature folder
- **Page** from the second-level folder
- **Module** from the third level (components, hooks, tabs.config.js)

A new developer joining the team can find any page in under 10 seconds.

---

*This document is the single source of truth for the Capabilio frontend restructuring. Update it as the architecture evolves.*
