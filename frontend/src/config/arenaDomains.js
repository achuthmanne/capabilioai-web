/**
 * arenaDomains.js — Capabilio Arena Domain Registry
 *
 * 12 professional domains. Every workstation is generated from this config.
 * Add a domain here → it appears everywhere: landing, workstation, missions, leaderboard.
 */
import { getRoleConfig } from "./roleConfig.js"

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER TYPES  (formerly called "sandbox types")
// ─────────────────────────────────────────────────────────────────────────────
// "sql"       → SQL editor + result grid
// "notebook"  → Python notebook (Pyodide/pandas/matplotlib)
// "terminal"  → bash terminal
// "react"     → live React/HTML preview
// "code"      → general code editor (language-aware Monaco)
// "markdown"  → rich markdown editor
// "diagram"   → system design canvas
//
// Future custom renderers (added here as they ship):
// "firmware"      → STM32/ARM IDE (Monaco + register sidebar + peripheral viewer)
// "logic"         → Waveform viewer + UART/SPI/I²C decoder
// "schematic"     → Python SPICE schematic + sim runner
// "layout"        → IC layout canvas + layer palette + DRC overlay
// "structural"    → Beam/frame canvas + load diagram + code checks
// "hdl"           → Verilog-aware editor + synthesis report + waveform
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// WIDGET REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
// Widgets are composable panels inside a workbench.
// Each workbench declares which widgets it includes.
// Future: WidgetRegistry[id] → React component via lazy import.
// ─────────────────────────────────────────────────────────────────────────────
export const WIDGET_REGISTRY = {
  // Universal
  mission_control:   { id: "mission_control",   label: "Mission",          icon: "🎯", group: "core" },
  hints:             { id: "hints",              label: "Hints",            icon: "💡", group: "core" },
  test_output:       { id: "test_output",        label: "Test Output",      icon: "✅", group: "core" },
  // Editors
  code_editor:       { id: "code_editor",        label: "Code Editor",      icon: "💻", group: "editor" },
  markdown_editor:   { id: "markdown_editor",    label: "Markdown Editor",  icon: "📝", group: "editor" },
  notebook:          { id: "notebook",           label: "Notebook",         icon: "📓", group: "editor" },
  react_preview:     { id: "react_preview",      label: "Live Preview",     icon: "🎨", group: "editor" },
  terminal:          { id: "terminal",           label: "Terminal",         icon: "🖥️", group: "editor" },
  sql_editor:        { id: "sql_editor",         label: "SQL Editor",       icon: "🗄️", group: "editor" },
  // Embedded / Hardware
  register_viewer:   { id: "register_viewer",    label: "Register Map",     icon: "📋", group: "hardware" },
  serial_terminal:   { id: "serial_terminal",    label: "Serial Monitor",   icon: "📡", group: "hardware" },
  build_output:      { id: "build_output",       label: "Build Output",     icon: "🔨", group: "hardware" },
  waveform_viewer:   { id: "waveform_viewer",    label: "Waveform Viewer",  icon: "〰️", group: "hardware" },
  decode_panel:      { id: "decode_panel",       label: "Protocol Decoder", icon: "🔍", group: "hardware" },
  task_viewer:       { id: "task_viewer",        label: "Task Viewer",      icon: "⏱️", group: "hardware" },
  stack_inspector:   { id: "stack_inspector",    label: "Stack Inspector",  icon: "📚", group: "hardware" },
  // VLSI / Analog
  synthesis_report:  { id: "synthesis_report",   label: "Synthesis Report", icon: "📊", group: "vlsi" },
  schematic_canvas:  { id: "schematic_canvas",   label: "Schematic",        icon: "⚡", group: "vlsi" },
  simulation_output: { id: "simulation_output",  label: "Sim Output",       icon: "📈", group: "vlsi" },
  layer_palette:     { id: "layer_palette",      label: "Layer Palette",    icon: "🎨", group: "vlsi" },
  drc_panel:         { id: "drc_panel",          label: "DRC Panel",        icon: "🔎", group: "vlsi" },
  lvs_panel:         { id: "lvs_panel",          label: "LVS Panel",        icon: "⚖️", group: "vlsi" },
  // Engineering
  formula_reference: { id: "formula_reference",  label: "Formula Ref",      icon: "📐", group: "eng" },
  unit_converter:    { id: "unit_converter",     label: "Unit Converter",   icon: "🔄", group: "eng" },
  beam_canvas:       { id: "beam_canvas",        label: "Beam Canvas",      icon: "🏗️", group: "eng" },
  load_diagram:      { id: "load_diagram",       label: "Load Diagram",     icon: "📉", group: "eng" },
  analysis_results:  { id: "analysis_results",   label: "Analysis Results", icon: "📊", group: "eng" },
  property_panel:    { id: "property_panel",     label: "Properties",       icon: "🔧", group: "eng" },
  // ML / Business / Clinical
  metrics_dashboard: { id: "metrics_dashboard",  label: "Metrics",          icon: "📊", group: "ml" },
  model_compare:     { id: "model_compare",      label: "Model Compare",    icon: "🤖", group: "ml" },
  experiment_log:    { id: "experiment_log",     label: "Experiment Log",   icon: "📋", group: "ml" },
  framework_canvas:  { id: "framework_canvas",   label: "Framework Canvas", icon: "🗂️", group: "biz" },
  data_table:        { id: "data_table",         label: "Data Table",       icon: "📋", group: "biz" },
  drug_reference:    { id: "drug_reference",     label: "Drug Reference",   icon: "💊", group: "clinical" },
  patient_record:    { id: "patient_record",     label: "Patient Record",   icon: "🏥", group: "clinical" },
  component_tree:    { id: "component_tree",     label: "Component Tree",   icon: "🌳", group: "ui" },
}


// ─────────────────────────────────────────────────────────────────────────────
// WORKBENCH REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
//
// Architecture: Role → Skill → Mission → Workbench → Renderer
//
// Every mission declares the workbench it needs via { workbench: "firmware_ide" }.
// Every workbench declares:
//   renderer — the React component name that renders this environment.
//              Today these map to existing shared renderers ("code", "notebook" etc).
//              When a custom renderer is built, update only this field — no
//              mission files, role files, or skill files need to change.
//   widgets  — ordered list of panel IDs that compose this workbench.
//              Today widgets are decorative metadata; future: drives composable UI.
//
// Adding a new workstation type = add one entry here. Done.
// ─────────────────────────────────────────────────────────────────────────────

export const WORKBENCH_REGISTRY = {

  // ── General-Purpose ───────────────────────────────────────────────────────

  code_ide: {
    id: "code_ide",
    label: "Code IDE",
    renderer: "code",
    icon: "💻",
    desc: "General-purpose code editor — JS, Python, Go, Java, etc.",
    usedBy: ["frontend","backend","fullstack","swe","devops","android","ios","eee","mechanical"],
    widgets: ["code_editor","test_output","mission_control","hints"],
  },

  documentation_studio: {
    id: "documentation_studio",
    label: "Documentation Studio",
    renderer: "markdown",
    icon: "📝",
    desc: "Rich markdown editor for specs, reports, design docs, and architecture notes",
    usedBy: ["all"],
    widgets: ["markdown_editor","preview_pane","mission_control","hints"],
  },

  terminal_console: {
    id: "terminal_console",
    label: "Terminal Console",
    renderer: "terminal",
    icon: "🖥️",
    desc: "Shell/bash console for scripts, debugging, log inspection, and CLI tools",
    usedBy: ["devops","sre","embedded","backend"],
    widgets: ["terminal","build_output","mission_control","hints"],
  },

  // ── Embedded / Hardware ───────────────────────────────────────────────────

  firmware_ide: {
    id: "firmware_ide",
    label: "Firmware IDE",
    renderer: "code",           // → "firmware" when custom renderer ships
    icon: "🔌",
    desc: "Embedded C/C++ editor with register map sidebar and compiler feedback",
    lang: "C",
    usedBy: ["embedded"],
    widgets: ["code_editor","register_viewer","serial_terminal","build_output","mission_control","hints"],
  },

  logic_analyzer: {
    id: "logic_analyzer",
    label: "Logic Analyzer",
    renderer: "notebook",       // → "logic" when waveform viewer ships
    icon: "📊",
    desc: "Digital signal timeline: decode UART/SPI/I²C frames and spot glitches",
    lang: "Python",
    usedBy: ["embedded","vlsi"],
    widgets: ["notebook","waveform_viewer","decode_panel","mission_control","hints"],
  },

  rtos_debugger: {
    id: "rtos_debugger",
    label: "RTOS Debugger",
    renderer: "code",           // → "rtos" when task-state viewer ships
    icon: "⏱️",
    desc: "Visualise FreeRTOS/Zephyr task states, stack usage, priority inversion",
    lang: "C",
    usedBy: ["embedded"],
    widgets: ["code_editor","task_viewer","stack_inspector","mission_control","hints"],
  },

  // ── VLSI / Digital IC ─────────────────────────────────────────────────────

  hdl_ide: {
    id: "hdl_ide",
    label: "HDL IDE",
    renderer: "code",           // → "hdl" when Verilog-aware sim runner ships
    icon: "🔬",
    desc: "Verilog / SystemVerilog / VHDL editor with lint and synthesis checks",
    lang: "Verilog",
    usedBy: ["vlsi","ece"],
    widgets: ["code_editor","waveform_viewer","synthesis_report","mission_control","hints"],
  },

  // ── Analog / Circuit ──────────────────────────────────────────────────────

  circuit_workbench: {
    id: "circuit_workbench",
    label: "Circuit Workbench",
    renderer: "notebook",       // → "schematic" when SPICE runner ships
    icon: "⚡",
    desc: "Python SPICE simulation: op-amps, filters, converters, small-signal models",
    lang: "Python",
    usedBy: ["analog_ic","eee","ece"],
    widgets: ["notebook","schematic_canvas","simulation_output","mission_control","hints"],
  },

  layout_studio: {
    id: "layout_studio",
    label: "Layout Studio",
    renderer: "markdown",       // → "layout" when IC layout canvas ships
    icon: "🔧",
    desc: "IC layout strategy docs, DRC/LVS checklist, matching and shielding notes",
    usedBy: ["analog_ic"],
    widgets: ["markdown_editor","layer_palette","drc_panel","lvs_panel","mission_control","hints"],
  },

  // ── Engineering Calculation ───────────────────────────────────────────────

  engineering_calculator: {
    id: "engineering_calculator",
    label: "Engineering Calculator",
    renderer: "notebook",       // Pyodide with numpy/scipy/matplotlib
    icon: "🧮",
    desc: "Python notebook for numerical engineering: load flow, stress, thermo, fluid, PK",
    lang: "Python",
    usedBy: ["mechanical","civil","eee","pharmacy"],
    widgets: ["notebook","formula_reference","unit_converter","mission_control","hints"],
  },

  structural_workbench: {
    id: "structural_workbench",
    label: "Structural Workbench",
    renderer: "notebook",       // → "structural" when beam/frame canvas ships
    icon: "🏗️",
    desc: "Beam, column, slab, frame analysis with IS/ACI code checks",
    lang: "Python",
    usedBy: ["civil"],
    widgets: ["notebook","beam_canvas","load_diagram","analysis_results","mission_control","hints"],
  },

  mechanical_studio: {
    id: "mechanical_studio",
    label: "Mechanical Studio",
    renderer: "notebook",       // → custom thermo/CFD/FEA widget
    icon: "⚙️",
    desc: "Thermodynamics, fluid mechanics, and stress analysis workspace",
    lang: "Python",
    usedBy: ["mechanical"],
    widgets: ["notebook","property_panel","analysis_results","mission_control","hints"],
  },

  // ── ML / AI ───────────────────────────────────────────────────────────────

  ml_workbench: {
    id: "ml_workbench",
    label: "ML Workbench",
    renderer: "notebook",       // Pyodide with sklearn/numpy; → GPU runner later
    icon: "🤖",
    desc: "Model training, evaluation, experiment tracking, and feature engineering",
    lang: "Python",
    usedBy: ["ml"],
    widgets: ["notebook","metrics_dashboard","model_compare","experiment_log","mission_control","hints"],
  },

  // ── Business / Clinical ───────────────────────────────────────────────────

  business_studio: {
    id: "business_studio",
    label: "Business Studio",
    renderer: "markdown",       // → "business" canvas with framework templates
    icon: "💼",
    desc: "Case study, strategy frameworks (SWOT, Porter, BCG), and business writing",
    usedBy: ["mba","ba_product"],
    widgets: ["markdown_editor","framework_canvas","data_table","mission_control","hints"],
  },

  clinical_lab: {
    id: "clinical_lab",
    label: "Clinical Lab",
    renderer: "markdown",       // → "clinical" with patient record + drug DB lookup
    icon: "💊",
    desc: "Clinical case analysis, drug interaction check, and regulatory documentation",
    usedBy: ["pharmacy","medical"],
    widgets: ["markdown_editor","drug_reference","patient_record","mission_control","hints"],
  },

  // ── Design / UI ───────────────────────────────────────────────────────────

  design_canvas: {
    id: "design_canvas",
    label: "Design Canvas",
    renderer: "react",
    icon: "🎨",
    desc: "Live React/HTML component preview with hot reload",
    usedBy: ["frontend","fullstack"],
    widgets: ["react_preview","code_editor","component_tree","mission_control","hints"],
  },

}

/**
 * Get workbench config by id (safe — returns null if not found)
 */
export const getWorkbench = (id) => WORKBENCH_REGISTRY[id] || null

/**
 * Resolve the renderer type from a workbench id.
 * workbenchId → WORKBENCH_REGISTRY[id].renderer
 */
export const resolveWorkbenchRenderer = (workbenchId) =>
  WORKBENCH_REGISTRY[workbenchId]?.renderer || "code"

/** @deprecated Use resolveWorkbenchRenderer */
export const resolveWorkbenchSandbox = resolveWorkbenchRenderer

// ─────────────────────────────────────────────────────────────────────────────
// ARENA DOMAINS
// ─────────────────────────────────────────────────────────────────────────────
export const ARENA_DOMAINS = {

  // ── 1. FRONTEND DEVELOPER ──────────────────────────────────────────────────
  frontend: {
    key: "frontend",
    label: "Frontend Developer",
    icon: "🖥️",
    color: "#F59E0B",
    colorBg: "#FFFBEB",
    colorBorder: "rgba(245,158,11,0.20)",
    ownership: "User Experience, Accessibility & UI Performance",
    description: "Build pixel-perfect UIs, component systems, and performant web experiences",

    tracks: ["React / Next.js", "Vue / Nuxt", "Angular", "Web Performance", "Design Systems"],

    modules: [
      { id: "ui_builder",    label: "UI Builder",          icon: "🎨", desc: "Build and preview components live",       sandbox: "react"    },
      { id: "component",     label: "Component Explorer",  icon: "🧩", desc: "Browse and fork component library",      sandbox: "react"    },
      { id: "preview",       label: "Browser Preview",     icon: "🌐", desc: "Full-page live preview with DevTools",    sandbox: "react"    },
      { id: "design_system", label: "Design System",       icon: "🎯", desc: "Tokens, typography, spacing spec",        sandbox: "markdown" },
      { id: "a11y",          label: "Accessibility Scanner", icon: "♿", desc: "WCAG 2.1 AA audit and fixes",           sandbox: "react"    },
      { id: "perf",          label: "Performance Analyzer", icon: "⚡", desc: "Core Web Vitals, LCP, CLS analysis",     sandbox: "markdown" },
    ],

    defaultModule: "ui_builder",
    defaultSandbox: "react",

    deliverables: ["Pages", "Components", "Design Systems", "Accessibility Reports"],

    skills: [
      "React", "TypeScript", "CSS / SCSS", "Next.js", "Web Performance",
      "Accessibility (WCAG)", "Tailwind CSS", "Component Architecture",
      "State Management", "Testing (Jest/RTL)", "Webpack / Vite", "Animation",
    ],

    missionCategories: [
      { id: "component_build",  label: "Component Build",    sandbox: "react",    lang: "JSX",      icon: "🧩" },
      { id: "page_layout",      label: "Page Layout",        sandbox: "react",    lang: "JSX",      icon: "🖥️" },
      { id: "a11y_fix",         label: "Accessibility Fix",  sandbox: "react",    lang: "JSX",      icon: "♿" },
      { id: "perf_optimize",    label: "Performance Fix",    sandbox: "markdown", lang: "Markdown", icon: "⚡" },
      { id: "design_system",    label: "Design System",      sandbox: "react",    lang: "JSX",      icon: "🎨" },
    ],

    rubric: [
      { criterion: "Correctness",    weight: 30, desc: "Component renders and functions as specified" },
      { criterion: "Accessibility",  weight: 20, desc: "WCAG 2.1 AA compliant, keyboard navigable" },
      { criterion: "Performance",    weight: 20, desc: "No unnecessary re-renders, optimised assets" },
      { criterion: "Code Quality",   weight: 15, desc: "Clean, typed, well-structured JSX/CSS" },
      { criterion: "Design Fidelity",weight: 15, desc: "Matches spec: spacing, colour, typography" },
    ],

    contextPanelSections: [
      { title: "React Quick Ref",  icon: "⚛️",  content: "useState • useEffect • useRef • useMemo\nuseCallback • useContext • useReducer\nReact.memo() • React.lazy() • Suspense" },
      { title: "WCAG 2.1 A11y",   icon: "♿",  content: "✓ Alt text on all images\n✓ Colour contrast ≥ 4.5:1 (AA)\n✓ Focus indicators visible\n✓ ARIA labels on interactive elements\n✓ Keyboard-only navigation works\n✓ No seizure-triggering animations" },
      { title: "Core Web Vitals", icon: "⚡",  content: "LCP (Largest Contentful Paint) < 2.5s\nFID (First Input Delay) < 100ms\nCLS (Cumulative Layout Shift) < 0.1\nINP (Interaction to Next Paint) < 200ms" },
      { title: "CSS Tricks",      icon: "🎨",  content: "Container queries: @container\nCascade layers: @layer\nHas selector: :has()\nView Transitions API\nCSS Anchor Positioning" },
    ],
  },

  // ── 2. BACKEND DEVELOPER ────────────────────────────────────────────────────
  backend: {
    key: "backend",
    label: "Backend Developer",
    icon: "🔧",
    color: "#10B981",
    colorBg: "#ECFDF5",
    colorBorder: "rgba(16,185,129,0.20)",
    ownership: "APIs, Business Logic, Security & Scalability",
    description: "Design robust APIs, microservices, auth systems, and scalable architectures",

    tracks: ["Node.js / Express", "Python / FastAPI", "Go", "Java / Spring", "REST / GraphQL / gRPC"],

    modules: [
      { id: "api_designer",  label: "API Designer",        icon: "🔌", desc: "Design and test REST / GraphQL endpoints",  sandbox: "code"     },
      { id: "service",       label: "Service Explorer",    icon: "🔧", desc: "Browse microservice architecture",         sandbox: "diagram"  },
      { id: "queue",         label: "Queue Monitor",       icon: "📬", desc: "Message queues, events, async flows",      sandbox: "code"     },
      { id: "logs",          label: "Log Viewer",          icon: "📋", desc: "Structured log analysis and tracing",      sandbox: "terminal" },
      { id: "testing",       label: "Testing Center",      icon: "🧪", desc: "Unit, integration, contract tests",        sandbox: "code"     },
      { id: "arch",          label: "Architecture Explorer",icon:"🏗️", desc: "System diagram and dependency graph",      sandbox: "diagram"  },
    ],

    defaultModule: "api_designer",
    defaultSandbox: "code",

    deliverables: ["REST APIs", "Microservices", "Authentication Systems", "Event-Driven Services"],

    skills: [
      "Node.js", "REST API Design", "Authentication (JWT/OAuth)", "SQL", "Redis",
      "Message Queues (Kafka/RabbitMQ)", "Microservices", "API Security",
      "Database Design", "Error Handling", "Rate Limiting", "OpenAPI / Swagger",
    ],

    missionCategories: [
      { id: "api_design",    label: "API Design",         sandbox: "code",    lang: "JavaScript", icon: "🔌" },
      { id: "auth_system",   label: "Auth System",        sandbox: "code",    lang: "JavaScript", icon: "🔐" },
      { id: "db_query",      label: "Database Query",     sandbox: "sql",     lang: "SQL",        icon: "🗃️" },
      { id: "service_design",label: "Service Design",     sandbox: "diagram", lang: "Markdown",   icon: "🏗️" },
      { id: "testing",       label: "Unit Tests",         sandbox: "code",    lang: "JavaScript", icon: "🧪" },
    ],

    rubric: [
      { criterion: "API Correctness",  weight: 30, desc: "Endpoints return correct data and status codes" },
      { criterion: "Security",         weight: 25, desc: "Input validation, auth, no injection vectors" },
      { criterion: "Error Handling",   weight: 20, desc: "Graceful errors, proper HTTP codes, logging" },
      { criterion: "Performance",      weight: 15, desc: "Efficient queries, proper indexing, caching" },
      { criterion: "Code Quality",     weight: 10, desc: "Separation of concerns, testable structure" },
    ],

    contextPanelSections: [
      { title: "HTTP Status Codes", icon: "📡", content: "2xx Success: 200 OK · 201 Created · 204 No Content\n3xx Redirect: 301 Moved · 304 Not Modified\n4xx Client: 400 Bad Req · 401 Unauth · 403 Forbidden · 404 Not Found · 409 Conflict · 422 Unprocessable\n5xx Server: 500 Internal · 502 Bad Gateway · 503 Unavailable" },
      { title: "REST Conventions",  icon: "🔌", content: "GET    /resources        → list\nGET    /resources/:id    → get one\nPOST   /resources        → create\nPATCH  /resources/:id    → partial update\nPUT    /resources/:id    → full replace\nDELETE /resources/:id    → delete" },
      { title: "Auth Patterns",    icon: "🔐", content: "JWT: stateless, include iat/exp/iss\nOAuth 2.0: authorization_code flow for 3rd party\nAPI Keys: hash before storage (SHA-256)\nRefresh Tokens: rotate on use, store hashed\nBcrypt rounds: 10–12 for passwords" },
      { title: "SQL Quick Ref",    icon: "🗃️", content: "EXPLAIN ANALYZE SELECT...\nCREATE INDEX CONCURRENTLY\nWindow: OVER(PARTITION BY x ORDER BY y)\nCTE: WITH cte AS (SELECT...)\nUpsert: ON CONFLICT DO UPDATE" },
    ],
  },

  // ── 3. FULL STACK DEVELOPER ─────────────────────────────────────────────────
  fullstack: {
    key: "fullstack",
    label: "Full Stack Developer",
    icon: "⚡",
    color: "#8B5CF6",
    colorBg: "#F5F3FF",
    colorBorder: "rgba(139,92,246,0.20)",
    ownership: "End-to-End Feature Delivery",
    description: "Own complete features from UI to database — frontend, backend, infra, deployment",

    tracks: ["MERN Stack", "Next.js + Prisma", "T3 Stack", "Django + React", "Rails + Hotwire"],

    modules: [
      { id: "code_editor",  label: "Code Editor",       icon: "💻", desc: "Multi-language editor with LSP",             sandbox: "code"     },
      { id: "terminal",     label: "Terminal",           icon: "⌨️", desc: "Full bash terminal",                        sandbox: "terminal" },
      { id: "api_explorer", label: "API Explorer",       icon: "🔌", desc: "Test APIs with request builder",            sandbox: "code"     },
      { id: "db_browser",   label: "Database Browser",  icon: "🗃️", desc: "Inspect tables, run queries",               sandbox: "sql"      },
      { id: "deploy",       label: "Deployment Center", icon: "🚀", desc: "CI/CD pipeline, env vars, releases",        sandbox: "terminal" },
      { id: "git",          label: "Git Workspace",     icon: "🌿", desc: "Branch, diff, merge, PR review",            sandbox: "terminal" },
    ],

    defaultModule: "code_editor",
    defaultSandbox: "code",

    deliverables: ["Full Features", "APIs + UIs", "Database Migrations", "Deployment Scripts"],

    skills: [
      "React", "Node.js / Express", "SQL / PostgreSQL", "REST APIs",
      "Authentication", "CI/CD", "Git", "Docker", "TypeScript",
      "System Design", "Testing", "Deployment",
    ],

    missionCategories: [
      { id: "feature_build",  label: "Feature Build",    sandbox: "code",    lang: "JavaScript", icon: "⚡" },
      { id: "api_ui",         label: "API + UI",         sandbox: "react",   lang: "JSX",        icon: "🔌" },
      { id: "db_migration",   label: "DB Migration",     sandbox: "sql",     lang: "SQL",        icon: "🗃️" },
      { id: "deploy_script",  label: "Deploy Script",    sandbox: "terminal",lang: "Bash",       icon: "🚀" },
      { id: "code_review",    label: "Code Review",      sandbox: "markdown",lang: "Markdown",   icon: "🔍" },
    ],

    rubric: [
      { criterion: "Feature Completeness", weight: 35, desc: "Full stack feature works end-to-end" },
      { criterion: "Code Quality",         weight: 25, desc: "Clean, typed, well-organised code" },
      { criterion: "Security",             weight: 20, desc: "Input validation, auth, no obvious vulns" },
      { criterion: "Testing",             weight: 10, desc: "Unit and integration test coverage" },
      { criterion: "Documentation",        weight: 10, desc: "README, API docs, inline comments" },
    ],

    contextPanelSections: [
      { title: "Project Context",    icon: "📋", content: "Full-stack ownership means owning the entire vertical slice — from the React component through the API route to the database schema and deployment config. No handoffs." },
      { title: "Common Stack",       icon: "⚡", content: "Frontend: React + TypeScript + Tailwind\nBackend: Node/Express or Next.js API routes\nDB: PostgreSQL via Prisma or Drizzle ORM\nAuth: NextAuth.js / Clerk / Auth0\nDeploy: Vercel + Supabase / Railway" },
      { title: "Git Best Practices", icon: "🌿", content: "feat: add user authentication\nfix: resolve null pointer in profile\nchore: update dependencies\nrefactor: extract auth middleware\ntest: add coverage for cart service\n\nSquash before merge · Rebase feature branches" },
      { title: "Test Pyramid",       icon: "🧪", content: "Unit tests: pure functions, utils (fast)\nIntegration: API routes, DB queries (medium)\nE2E: critical user journeys only (slow)\nRatio: 70% unit · 20% integration · 10% E2E" },
    ],
  },

  // ── 4. SOFTWARE ENGINEER ────────────────────────────────────────────────────
  swe: {
    key: "swe",
    label: "Software Engineer",
    icon: "⚙️",
    color: "#6366F1",
    colorBg: "#EEF2FF",
    colorBorder: "rgba(99,102,241,0.20)",
    ownership: "Algorithms, Systems & Programming Foundations",
    description: "Master data structures, algorithms, system design, and professional programming",

    tracks: ["Java", "Python", "C / C++", "Go", "Rust", "TypeScript", "JavaScript", "System Design"],

    modules: [
      { id: "lang_studio",   label: "Language Studio",    icon: "💻", desc: "Multi-language IDE with test runner",      sandbox: "code"     },
      { id: "dsa_arena",     label: "DSA Arena",          icon: "🧠", desc: "Data structures & algorithm challenges",   sandbox: "code"     },
      { id: "compiler",      label: "Compiler Lab",       icon: "⚙️", desc: "Compile, run, debug any language",        sandbox: "terminal" },
      { id: "system_design", label: "System Design Studio",icon:"🏗️", desc: "Design distributed systems on canvas",    sandbox: "diagram"  },
      { id: "problem",       label: "Problem Solver",     icon: "🎯", desc: "Timed problem-solving with evaluation",   sandbox: "code"     },
      { id: "code_runner",   label: "Code Runner",        icon: "▶️", desc: "Run code in any language instantly",      sandbox: "terminal" },
    ],

    defaultModule: "lang_studio",
    defaultSandbox: "code",

    deliverables: ["Algorithm Solutions", "System Design Docs", "Language Programs", "Code Reviews"],

    skills: [
      "Data Structures", "Algorithms", "Big-O Analysis", "System Design",
      "Object-Oriented Design", "Concurrency", "Testing", "Debugging",
      "Git", "Code Review", "Documentation", "Clean Code",
    ],

    missionCategories: [
      { id: "dsa",           label: "DSA Challenge",      sandbox: "code",    lang: "Python",     icon: "🧠" },
      { id: "system_design", label: "System Design",      sandbox: "diagram", lang: "Markdown",   icon: "🏗️" },
      { id: "code_impl",     label: "Implementation",     sandbox: "code",    lang: "JavaScript", icon: "💻" },
      { id: "debugging",     label: "Debug Session",      sandbox: "code",    lang: "Python",     icon: "🔍" },
      { id: "review",        label: "Code Review",        sandbox: "markdown",lang: "Markdown",   icon: "📝" },
    ],

    rubric: [
      { criterion: "Correctness",      weight: 40, desc: "Solution passes all test cases" },
      { criterion: "Time Complexity",  weight: 20, desc: "Optimal or near-optimal Big-O" },
      { criterion: "Space Complexity", weight: 15, desc: "Efficient memory usage" },
      { criterion: "Code Clarity",     weight: 15, desc: "Readable, named well, commented" },
      { criterion: "Edge Cases",       weight: 10, desc: "Handles null, empty, overflow" },
    ],

    contextPanelSections: [
      { title: "Big-O Cheat Sheet",    icon: "📊", content: "O(1) Hash lookup · O(log n) Binary search\nO(n) Linear scan · O(n log n) Merge sort\nO(n²) Nested loops · O(2ⁿ) Exponential\nO(n!) Permutations\n\nBest DS: HashMap O(1) · Heap O(log n)" },
      { title: "Sorting Reference",    icon: "🔢", content: "Merge Sort: O(n log n) stable, extra space\nQuick Sort: O(n log n) avg, O(n²) worst\nHeap Sort: O(n log n) in-place, not stable\nCounting: O(n+k) for small integer range\nTim Sort: Python default, O(n log n)" },
      { title: "Common Patterns",      icon: "🧠", content: "Sliding Window · Two Pointers\nFast & Slow Pointers (Floyd's)\nBFS / DFS · Backtracking\nDynamic Programming (top-down/bottom-up)\nBinary Search on answer\nMonotonic Stack / Queue" },
      { title: "System Design Checklist", icon: "🏗️", content: "1. Requirements: functional + non-functional\n2. Capacity: QPS, storage, bandwidth\n3. API design: endpoints + contracts\n4. Data model: schema + relationships\n5. High-level: components + data flow\n6. Deep dive: bottlenecks + trade-offs\n7. Scaling: sharding, caching, CDN" },
    ],
  },

  // ── 5. DATA ANALYST ─────────────────────────────────────────────────────────
  data: {
    key: "data",
    label: "Data Analyst",
    icon: "📊",
    color: "#D97706",
    colorBg: "#FFFBEB",
    colorBorder: "rgba(217,119,6,0.18)",
    ownership: "Business Insights, KPI Tracking & Data Reporting",
    description: "Transform raw data into decisions — SQL, dashboards, KPI analysis, business reporting",

    tracks: ["SQL Analytics", "Python / Pandas", "Power BI", "Tableau", "dbt / Data Warehouse"],

    modules: [
      { id: "sql_studio",    label: "SQL Studio",          icon: "🗃️", desc: "Write and optimise analytical SQL",           sandbox: "sql"       },
      { id: "python_analyst",label: "Python / Pandas",     icon: "🐍", desc: "EDA, data cleaning, statistics with pandas",  sandbox: "notebook"  },
      { id: "excel_ws",      label: "Excel Workbook",      icon: "📗", desc: "Spreadsheet formulas, pivot tables, VLOOKUP", sandbox: "excel"     },
      { id: "dashboard_bi",  label: "BI Dashboard",        icon: "📈", desc: "KPI cards, bar/line/pie charts, Power BI sim",sandbox: "dashboard" },
      { id: "report_writer", label: "Analysis Report",     icon: "📝", desc: "Executive summary, findings, recommendations",sandbox: "report"    },
      { id: "viz_center",    label: "Visualization",       icon: "🎨", desc: "Charts, heatmaps, scatter plots",             sandbox: "notebook"  },
    ],

    defaultModule: "sql_studio",
    defaultSandbox: "sql",

    deliverables: ["SQL Queries", "Python Notebooks", "Excel Models", "BI Dashboards", "Analysis Reports"],

    skills: [
      "SQL", "Python (Pandas)", "Excel", "Power BI", "Data Cleaning", "EDA",
      "Data Visualization", "KPI Analysis", "Business Reporting",
      "Funnel Analysis", "Cohort Analysis", "Statistics", "dbt", "Stakeholder Communication",
    ],

    missionCategories: [
      { id: "sql_analysis",   label: "SQL Analysis",      sandbox: "sql",       lang: "SQL",      icon: "🗃️", missionType: "sql"       },
      { id: "python_eda",     label: "Python / EDA",      sandbox: "notebook",  lang: "Python",   icon: "🐍", missionType: "notebook"  },
      { id: "excel_model",    label: "Excel Model",       sandbox: "excel",     lang: "Excel",    icon: "📗", missionType: "excel"     },
      { id: "bi_dashboard",   label: "BI Dashboard",      sandbox: "dashboard", lang: "Dashboard",icon: "📈", missionType: "dashboard" },
      { id: "analysis_report",label: "Analysis Report",   sandbox: "report",    lang: "Markdown", icon: "📝", missionType: "report"    },
      { id: "data_cleaning",  label: "Data Cleaning",     sandbox: "notebook",  lang: "Python",   icon: "🧹", missionType: "notebook"  },
    ],

    rubric: [
      { criterion: "Query Correctness",  weight: 35, desc: "Results match business requirements" },
      { criterion: "Data Insight",       weight: 25, desc: "Meaningful, actionable observations" },
      { criterion: "Presentation",       weight: 20, desc: "Clear visualisations, labelled axes" },
      { criterion: "Methodology",        weight: 10, desc: "Correct statistical approach" },
      { criterion: "Code Quality",       weight: 10, desc: "Clean, commented, reproducible" },
    ],

    contextPanelSections: [
      { title: "SQL Analytics Ref",  icon: "🗃️", content: "Window: ROW_NUMBER() OVER(PARTITION BY x ORDER BY y)\nLAG/LEAD for period-over-period\nRUNNING TOTAL: SUM(val) OVER(ORDER BY date)\nCTE chains for step-by-step funnels\nGROUP BY ROLLUP for multi-level aggregation" },
      { title: "KPI Formulas",       icon: "📊", content: "Conversion = conversions / visitors × 100\nChurn Rate = churned / start_customers × 100\nLTV = ARPU × 1/churn_rate\nNPS = % Promoters − % Detractors\nCAC = total_spend / new_customers\nMRR = avg_revenue × active_customers" },
      { title: "Data Quality Checks",icon: "🧹", content: "□ Null counts per column\n□ Duplicate primary keys\n□ Date range reasonableness\n□ Numeric outliers (IQR method)\n□ Referential integrity\n□ Row counts match source\n□ Distribution shifts vs baseline" },
      { title: "Python Pandas",      icon: "🐍", content: "df.describe() • df.info()\ndf.isnull().sum()\ndf.groupby('x')['y'].agg(['mean','sum'])\ndf.merge(df2, on='id', how='left')\npd.pivot_table(df, values='sales', index='region')\ndf.resample('W').sum()  # time series" },
    ],
  },

  // ── 6. DATABASE ADMINISTRATOR ───────────────────────────────────────────────
  dba: {
    key: "dba",
    label: "Database Administrator",
    icon: "🗄️",
    color: "#06B6D4",
    colorBg: "#ECFEFF",
    colorBorder: "rgba(6,182,212,0.20)",
    ownership: "Data Integrity, Query Performance & Recovery",
    description: "Manage, optimise, and protect production databases across PostgreSQL, MySQL, Oracle, and SQL Server",

    tracks: ["PostgreSQL", "MySQL / MariaDB", "Oracle DBA", "SQL Server", "Aurora / Cloud DB"],

    modules: [
      { id: "schema",     label: "Schema Manager",       icon: "📐", desc: "Tables, indexes, constraints, ERDs",       sandbox: "sql"      },
      { id: "query",      label: "Query Analyzer",       icon: "🔍", desc: "EXPLAIN ANALYZE, plan visualizer",         sandbox: "sql"      },
      { id: "index",      label: "Index Optimizer",      icon: "⚡", desc: "Missing indexes, bloat analysis",          sandbox: "sql"      },
      { id: "backup",     label: "Backup Center",        icon: "💾", desc: "pg_dump, PITR, restore procedures",        sandbox: "terminal" },
      { id: "replication",label: "Replication Monitor",  icon: "🔄", desc: "WAL lag, replica health, failover",        sandbox: "terminal" },
      { id: "health",     label: "DB Health Dashboard",  icon: "🏥", desc: "Connections, cache hit rate, autovacuum",  sandbox: "sql"      },
    ],

    defaultModule: "query",
    defaultSandbox: "sql",

    deliverables: ["Optimised Queries", "Index Strategies", "Backup Plans", "Schema Designs", "Runbooks"],

    skills: [
      "SQL", "Query Optimisation", "Index Strategy", "Schema Design",
      "Backup & Recovery (PITR)", "Replication", "Connection Pooling",
      "Performance Tuning", "High Availability", "Autovacuum", "PgBouncer",
      "EXPLAIN ANALYZE", "Partitioning", "Stored Procedures",
    ],

    missionCategories: [
      { id: "query_opt",    label: "Query Optimisation",  sandbox: "sql",      lang: "SQL",  icon: "🔍" },
      { id: "index_design", label: "Index Design",        sandbox: "sql",      lang: "SQL",  icon: "⚡" },
      { id: "schema",       label: "Schema Design",       sandbox: "sql",      lang: "SQL",  icon: "📐" },
      { id: "backup",       label: "Backup & Recovery",   sandbox: "terminal", lang: "Bash", icon: "💾" },
      { id: "replication",  label: "Replication Setup",   sandbox: "terminal", lang: "Bash", icon: "🔄" },
    ],

    rubric: [
      { criterion: "Query Correctness",    weight: 30, desc: "Query returns correct, complete results" },
      { criterion: "Performance",          weight: 30, desc: "Optimal execution plan, minimal cost" },
      { criterion: "Index Appropriateness",weight: 20, desc: "Right index type, no over-indexing" },
      { criterion: "Safety",               weight: 10, desc: "No data loss risk, proper transactions" },
      { criterion: "Documentation",        weight: 10, desc: "Runbook, comments, rollback plan" },
    ],

    contextPanelSections: [
      { title: "EXPLAIN Quick Ref",  icon: "🔍", content: "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)\nSeq Scan → missing index\nIndex Scan → index used ✓\nBitmap Heap Scan → range predicate\nHash Join → large set join (good)\nNested Loop → small set, indexed (good)\nMerge Join → pre-sorted sets (good)\nFilter rows → push predicate down" },
      { title: "Index Strategy",     icon: "⚡", content: "B-tree: default, equality + range\nGiST / GIN: full-text, JSONB, arrays\nHash: exact equality only\nBRIN: huge tables, ordered by insert\nPartial: WHERE deleted_at IS NULL\nComposite order: equality cols first\nCONCURRENTLY for zero-downtime adds" },
      { title: "Backup Commands",    icon: "💾", content: "# Full backup\npg_dump -Fc mydb > mydb.dump\n\n# PITR: enable WAL archiving\narchive_mode = on\narchive_command = 'cp %p /wal/%f'\n\n# Restore\npg_restore -d mydb mydb.dump\n\n# Point-in-time\nrestore_command = 'cp /wal/%f %p'\nrecovery_target_time = '2024-01-01 12:00'" },
      { title: "Health Queries",     icon: "🏥", content: "-- Cache hit rate (target >99%)\nSELECT round(100*blks_hit/(blks_hit+blks_read)::numeric,2)\nFROM pg_stat_database WHERE datname=current_database();\n\n-- Long-running queries\nSELECT pid,now()-query_start,state,query\nFROM pg_stat_activity WHERE state!='idle'\nORDER BY 2 DESC LIMIT 5;\n\n-- Bloated tables\nSELECT relname,n_dead_tup FROM pg_stat_user_tables\nORDER BY n_dead_tup DESC LIMIT 10;" },
    ],
  },

  // ── 7. CYBERSECURITY ────────────────────────────────────────────────────────
  cyber: {
    key: "cyber",
    label: "Cybersecurity",
    icon: "🔐",
    color: "#EF4444",
    colorBg: "#FEF2F2",
    colorBorder: "rgba(239,68,68,0.20)",
    ownership: "Threat Detection, Vulnerability Management & Incident Response",
    description: "Defend, detect, and respond — SOC operations, pentesting, vulnerability management",

    tracks: ["SOC Analyst", "Penetration Tester", "Ethical Hacker", "Cybersecurity Analyst", "Cloud Security"],

    modules: [
      { id: "soc",         label: "SOC Dashboard",         icon: "🛡️", desc: "Alerts, severity triage, SIEM events",    sandbox: "terminal" },
      { id: "siem",        label: "SIEM Explorer",          icon: "🔎", desc: "Log correlation, rule authoring",          sandbox: "terminal" },
      { id: "threat",      label: "Threat Hunter",          icon: "🎯", desc: "IOCs, TTPs, MITRE ATT&CK mapping",        sandbox: "terminal" },
      { id: "incident",    label: "Incident Response",      icon: "🚨", desc: "Playbooks, containment, forensics",        sandbox: "markdown" },
      { id: "vuln",        label: "Vulnerability Scanner",  icon: "🔍", desc: "CVE triage, CVSS scoring, patch plans",    sandbox: "terminal" },
      { id: "pentest",     label: "Pentest Lab",            icon: "⚔️", desc: "Recon, exploit, report chain",            sandbox: "terminal" },
    ],

    defaultModule: "soc",
    defaultSandbox: "terminal",

    deliverables: ["Incident Reports", "Pentest Reports", "Threat Models", "Runbooks", "SIEM Rules"],

    skills: [
      "Network Security", "SIEM (Splunk/QRadar)", "Threat Intelligence",
      "Incident Response", "Vulnerability Assessment", "Penetration Testing",
      "MITRE ATT&CK", "OWASP Top 10", "Digital Forensics", "Malware Analysis",
      "Scripting (Python/Bash)", "Cloud Security (AWS/Azure)",
    ],

    missionCategories: [
      { id: "triage",       label: "Alert Triage",         sandbox: "terminal", lang: "Bash",     icon: "🚨" },
      { id: "threat_hunt",  label: "Threat Hunt",          sandbox: "terminal", lang: "Bash",     icon: "🎯" },
      { id: "pentest",      label: "Pentest Scenario",     sandbox: "terminal", lang: "Bash",     icon: "⚔️" },
      { id: "incident",     label: "Incident Response",    sandbox: "markdown", lang: "Markdown", icon: "🛡️" },
      { id: "vuln_report",  label: "Vuln Report",          sandbox: "markdown", lang: "Markdown", icon: "📋" },
    ],

    rubric: [
      { criterion: "Threat Identification", weight: 30, desc: "Correct identification of attack vectors" },
      { criterion: "Response Quality",      weight: 25, desc: "Appropriate, prioritised countermeasures" },
      { criterion: "Tool Usage",            weight: 20, desc: "Correct use of security tools and commands" },
      { criterion: "Documentation",         weight: 15, desc: "Clear report, IOCs listed, timeline mapped" },
      { criterion: "Compliance Awareness",  weight: 10, desc: "References relevant frameworks (NIST/ISO)" },
    ],

    contextPanelSections: [
      { title: "MITRE ATT&CK",     icon: "🗺️", content: "Initial Access → Execution → Persistence\nPrivilege Escalation → Defense Evasion\nCredential Access → Discovery\nLateral Movement → Collection\nExfiltration → Impact\n\nKey TTPs: T1078 Valid Accounts · T1059 Scripting\nT1486 Ransomware · T1190 Public-Facing App" },
      { title: "OWASP Top 10",     icon: "🔓", content: "A01 Broken Access Control\nA02 Cryptographic Failures\nA03 Injection (SQLi, XSS, SSTI)\nA04 Insecure Design\nA05 Security Misconfiguration\nA06 Vulnerable Components\nA07 Auth Failures\nA08 Software Integrity Failures\nA09 Logging Failures\nA10 SSRF" },
      { title: "Triage Playbook",  icon: "🚨", content: "1. Isolate: network, endpoint, account\n2. Identify: IOCs, affected assets, timeline\n3. Contain: block IPs, revoke creds, quarantine\n4. Eradicate: remove malware, patch vuln\n5. Recover: restore from clean backup\n6. Post-Incident: RCA, lessons, control gaps" },
      { title: "Common Commands",  icon: "⌨️", content: "nmap -sV -sC -p- target\nnike --scan target (nikto)\nsqlmap -u 'url' --dbs\nburpsuite (proxy 127.0.0.1:8080)\nwiresheet -i eth0 -w capture.pcap\nnetstat -tlnp | grep LISTEN\nss -tulpn | grep :80" },
    ],
  },

  // ── 8. MEDICAL CODING ───────────────────────────────────────────────────────
  medical: {
    key: "medical",
    label: "Medical Coding",
    icon: "🏥",
    color: "#EC4899",
    colorBg: "#FDF2F8",
    colorBorder: "rgba(236,72,153,0.20)",
    ownership: "Clinical Coding Accuracy, Compliance & Revenue Integrity",
    description: "Assign precise ICD-10, CPT, and HCPCS codes from clinical documentation",

    tracks: ["ICD-10-CM / PCS", "CPT Coding", "HCC Coding", "Outpatient Coding", "Inpatient DRG"],

    modules: [
      { id: "icd",        label: "ICD Explorer",         icon: "📖", desc: "Search ICD-10-CM/PCS code tree",           sandbox: "markdown" },
      { id: "cpt",        label: "CPT Workspace",        icon: "💊", desc: "CPT code lookup and bundling rules",       sandbox: "markdown" },
      { id: "records",    label: "Medical Records Viewer",icon:"📋", desc: "Annotate clinical notes for codes",        sandbox: "markdown" },
      { id: "compliance", label: "Compliance Center",    icon: "✅", desc: "Coding guidelines, official guidance",     sandbox: "markdown" },
      { id: "audit",      label: "Audit Dashboard",      icon: "🔍", desc: "DRG validation, upcoding flags, audits",   sandbox: "markdown" },
      { id: "assistant",  label: "Coding Assistant",     icon: "🤖", desc: "AI-powered code suggestion and review",    sandbox: "markdown" },
    ],

    defaultModule: "records",
    defaultSandbox: "markdown",

    deliverables: ["Code Assignments", "Audit Reports", "Compliance Reviews", "Coding Summaries"],

    skills: [
      "ICD-10-CM", "ICD-10-PCS", "CPT Codes", "HCPCS Codes",
      "Medical Terminology", "Anatomy & Physiology", "DRG Assignment",
      "Coding Guidelines (AHA Clinic)", "E/M Coding", "HCC Risk Adjustment",
      "Revenue Cycle", "HIPAA Compliance",
    ],

    missionCategories: [
      { id: "icd_coding",    label: "ICD-10 Coding",      sandbox: "markdown", lang: "Markdown", icon: "📖" },
      { id: "cpt_coding",    label: "CPT Coding",         sandbox: "markdown", lang: "Markdown", icon: "💊" },
      { id: "drg_assign",    label: "DRG Assignment",     sandbox: "markdown", lang: "Markdown", icon: "🏥" },
      { id: "audit",         label: "Coding Audit",       sandbox: "markdown", lang: "Markdown", icon: "🔍" },
      { id: "compliance",    label: "Compliance Review",  sandbox: "markdown", lang: "Markdown", icon: "✅" },
    ],

    rubric: [
      { criterion: "Code Accuracy",      weight: 40, desc: "Correct primary and secondary codes assigned" },
      { criterion: "Specificity",        weight: 25, desc: "Highest level of specificity used" },
      { criterion: "Sequencing",         weight: 20, desc: "Principal diagnosis sequenced correctly" },
      { criterion: "Guidelines Compliance",weight:10, desc: "Follows AHA Clinic coding guidelines" },
      { criterion: "Documentation",      weight: 5,  desc: "Code rationale clearly documented" },
    ],

    contextPanelSections: [
      { title: "ICD-10 Structure",     icon: "📖", content: "Format: A00.0 (letter + 2 digits + decimal + 1–4 chars)\nCategories A–Z (excluding U)\nU codes: COVID-19, resistance to antibiotics\n7th character for injury episodes:\n  A=Initial · D=Subsequent · S=Sequela\nCC = Complication/Comorbidity\nMCC = Major CC (DRG weight impact)" },
      { title: "Coding Sequence",      icon: "🔢", content: "Inpatient: Principal Dx first (cause of admission)\nOutpatient: First-listed = main reason for visit\nSymptoms: don't code if definitive Dx documented\nChronic: code if monitoring/management occurring\nExternal cause: code in addition (V/W/X/Y codes)\nZ codes: factors influencing health status" },
      { title: "CPT Key Rules",        icon: "💊", content: "Modifier 25: Significant separate E/M same day\nModifier 59: Distinct procedural service\nModifier 51: Multiple procedures (surgeon)\nModifier 26/TC: Professional/Technical component\nAdd-on codes: never standalone, listed with primary\nBundling: NCCI edits prevent unbundling" },
      { title: "E/M Level Selection",  icon: "🏥", content: "2021 Guidelines (outpatient):\nMDM-based OR Time-based\nMDM: problems + data + risk\n  Low: 99202/99212\n  Moderate: 99203/99213\n  High: 99204-5/99214-5\nTime (includes non-face-to-face on date of service)" },
    ],
  },

  // ── 9. ECE / EMBEDDED SYSTEMS ───────────────────────────────────────────────
  ece: {
    key: "ece",
    label: "ECE / Embedded Systems",
    icon: "🔌",
    color: "#84CC16",
    colorBg: "#F7FEE7",
    colorBorder: "rgba(132,204,22,0.20)",
    ownership: "Hardware Design, Embedded Systems & VLSI",
    description: "Design circuits, write firmware, implement VLSI, and build embedded solutions",

    tracks: ["VLSI Design", "Embedded C / C++", "PCB Design", "FPGA / RTL", "IoT Systems", "Circuit Design"],

    modules: [
      { id: "circuit",    label: "Circuit Studio",       icon: "⚡", desc: "Schematic design and simulation",          sandbox: "code"     },
      { id: "pcb",        label: "PCB Designer",         icon: "🔌", desc: "PCB layout, DRC, gerber export",          sandbox: "markdown" },
      { id: "rtl",        label: "RTL Editor",           icon: "💾", desc: "Verilog/VHDL code with synthesis",        sandbox: "code"     },
      { id: "fpga",       label: "FPGA Workspace",       icon: "🖥️", desc: "FPGA design, timing analysis, floorplan", sandbox: "code"     },
      { id: "embedded",   label: "Embedded IDE",         icon: "🤖", desc: "C/C++ for microcontrollers (ARM/AVR)",    sandbox: "code"     },
      { id: "sim",        label: "Verilog Simulator",    icon: "🔄", desc: "Testbench simulation and waveforms",      sandbox: "code"     },
    ],

    defaultModule: "embedded",
    defaultSandbox: "code",

    deliverables: ["Firmware Code", "RTL Designs", "Circuit Schematics", "Technical Reports"],

    skills: [
      "Embedded C / C++", "Verilog / VHDL", "FPGA Design", "PCB Design",
      "Digital Logic", "Microcontrollers (ARM, AVR, PIC)", "RTOS",
      "Communication Protocols (SPI/I2C/UART/CAN)", "Signal Processing",
      "Power Electronics", "VLSI Design", "Circuit Analysis",
    ],

    missionCategories: [
      { id: "firmware",    label: "Firmware Task",       sandbox: "code",     lang: "C",        icon: "🤖" },
      { id: "rtl_design",  label: "RTL Design",          workbench: "hdl_ide",     lang: "Verilog",  icon: "💾" },
      { id: "circuit",     label: "Circuit Design",      sandbox: "markdown", lang: "Markdown", icon: "⚡" },
      { id: "protocol",    label: "Protocol Impl",       sandbox: "code",     lang: "C",        icon: "🔌" },
      { id: "debug",       label: "HW Debug",            sandbox: "terminal", lang: "Bash",     icon: "🔍" },
    ],

    rubric: [
      { criterion: "Correctness",       weight: 35, desc: "Design/firmware meets functional spec" },
      { criterion: "Efficiency",        weight: 25, desc: "Optimal resource use (memory, power, area)" },
      { criterion: "Timing Compliance", weight: 20, desc: "Meets timing constraints (setup/hold)" },
      { criterion: "Code Quality",      weight: 10, desc: "Readable, portable, well-commented" },
      { criterion: "Documentation",     weight: 10, desc: "Block diagram, port list, test plan" },
    ],

    contextPanelSections: [
      { title: "Verilog Quick Ref",   icon: "💾", content: "module name(input clk, input rst_n, output reg q);\n  always @(posedge clk or negedge rst_n) begin\n    if (!rst_n) q <= 0;\n    else q <= d;\n  end\nendmodule\n\nBlocking: = (combinational)\nNon-blocking: <= (sequential/FF)\nParameterized: #(.WIDTH(8))" },
      { title: "MCU Protocols",       icon: "🔌", content: "SPI: MOSI/MISO/SCK/CS · full-duplex · fast\nI2C: SDA/SCL · addressed · 7-bit addr · ACK/NAK\nUART: async, 8N1 typical, baud rate both ends\nCAN: diff pair, multi-master, priority bus\nI2S: audio, 3-wire, left/right clock\nUSB: host/device, enumeration, HID/CDC" },
      { title: "Embedded Checklist",  icon: "✅", content: "□ Volatile for HW registers / ISR vars\n□ Watchdog timer enabled\n□ Stack overflow detection\n□ ISR: short, no malloc, post-to-queue\n□ Power modes (sleep/standby/shutdown)\n□ Bootloader protection fuses set\n□ CRC check on firmware update" },
      { title: "Digital Logic",       icon: "⚡", content: "Setup time: data must be stable before clk edge\nHold time: data must hold after clk edge\nPropagation delay: gate output change after input\nMetastability: violating setup/hold → random output\nGlitch: hazard in combinational logic\nFix: registers on all timing paths" },
    ],
  },

  // ── 10. DEVOPS ENGINEER ─────────────────────────────────────────────────────
  devops: {
    key: "devops",
    label: "DevOps Engineer",
    icon: "🚀",
    color: "#F97316",
    colorBg: "#FFF7ED",
    colorBorder: "rgba(249,115,22,0.20)",
    ownership: "Software Delivery, Reliability & Infrastructure Automation",
    description: "Build CI/CD pipelines, manage Kubernetes, and own the reliability of production systems",

    tracks: ["Kubernetes / Docker", "CI/CD (GitHub Actions/GitLab)", "Terraform / IaC", "AWS / GCP / Azure", "SRE / Observability"],

    modules: [
      // FIX: these are YAML/HCL AUTHORING workstations (write manifests), not
      // interactive shell sessions. sandbox "code" routes buildSkeleton/starters
      // to the YAML/Terraform editor. Was wrongly "terminal".
      { id: "pipeline",    label: "Pipeline Center",      icon: "⚙️", desc: "CI/CD YAML authoring and visualiser",     sandbox: "code" },
      { id: "infra",       label: "Infrastructure Explorer",icon:"🏗️", desc: "Terraform / CDK IaC workbench",          sandbox: "code" },
      { id: "k8s",         label: "Kubernetes Dashboard", icon: "☸️", desc: "kubectl, manifests, Helm charts",         sandbox: "code" },
      { id: "monitoring",  label: "Monitoring Center",    icon: "📡", desc: "Prometheus, Grafana, alerting rules",      sandbox: "code" },
      { id: "alerts",      label: "Alert Manager",        icon: "🚨", desc: "SLO/SLA config, alert routing, runbooks",  sandbox: "markdown" },
      { id: "cost",        label: "Cost Analytics",       icon: "💰", desc: "Cloud spend, rightsizing, waste reports",  sandbox: "markdown" },
    ],

    defaultModule: "pipeline",
    defaultSandbox: "code",   // FIX: default module "pipeline" writes YAML → code editor, not terminal

    deliverables: ["CI/CD Pipelines", "IaC Modules", "K8s Manifests", "Runbooks", "SLO Dashboards"],

    skills: [
      "Docker", "Kubernetes", "CI/CD (GitHub Actions / GitLab CI)", "Terraform",
      "Ansible", "AWS / GCP / Azure", "Prometheus / Grafana", "Helm",
      "Bash / Python scripting", "SRE practices", "Incident Management",
      "GitOps (ArgoCD / Flux)", "FinOps",
    ],

    missionCategories: [
      { id: "pipeline",    label: "Pipeline Build",       sandbox: "code",     lang: "YAML",     icon: "⚙️" },
      { id: "iac",         label: "IaC Module",           sandbox: "code",     lang: "HCL",      icon: "🏗️" },
      { id: "k8s",         label: "K8s Manifest",         sandbox: "code",     lang: "YAML",     icon: "☸️" },
      { id: "incident",    label: "Incident Response",    sandbox: "markdown", lang: "Markdown", icon: "🚨" },
      { id: "runbook",     label: "Runbook",              sandbox: "markdown", lang: "Markdown", icon: "📋" },
    ],

    rubric: [
      { criterion: "Pipeline Correctness",  weight: 30, desc: "Pipeline executes, stages pass, artefacts produced" },
      { criterion: "Security",              weight: 25, desc: "Secrets managed, least privilege, no hardcoded creds" },
      { criterion: "Reliability Design",    weight: 20, desc: "Rollback strategy, health checks, retry logic" },
      { criterion: "Observability",         weight: 15, desc: "Metrics, logs, traces wired up correctly" },
      { criterion: "Code Quality",          weight: 10, desc: "DRY IaC, parameterised, documented" },
    ],

    contextPanelSections: [
      { title: "kubectl Quick Ref",    icon: "☸️", content: "kubectl get pods -n <ns> -o wide\nkubectl describe pod <name>\nkubectl logs <pod> -f --previous\nkubectl exec -it <pod> -- bash\nkubectl rollout status deploy/<name>\nkubectl rollout undo deploy/<name>\nkubectl scale deploy/<name> --replicas=3\nkubectl top pods --sort-by=memory" },
      { title: "Terraform Workflow",   icon: "🏗️", content: "terraform init\nterraform plan -out=tfplan\nterraform apply tfplan\nterraform state list\nterraform state mv\nterraform import <addr> <id>\nterraform destroy -target=<res>\nRemote state: S3 + DynamoDB lock" },
      { title: "CI/CD Best Practices", icon: "⚙️", content: "□ Fast feedback: lint+test < 5 min\n□ Artefact promotion (not rebuild)\n□ Secrets via vault, never in YAML\n□ Feature flags for risky deploys\n□ Canary / blue-green by default\n□ Automated rollback on error rate spike\n□ Branch protection: require CI green" },
      { title: "SLO / SLA Reference",  icon: "📡", content: "SLO: internal target (e.g. 99.9% uptime)\nSLA: contractual commitment to customer\nSLI: actual measured metric\nError Budget = 1 - SLO = allowed downtime\n99.9% = 8.77 hr/yr downtime\n99.95% = 4.38 hr/yr\n99.99% = 52.6 min/yr\nBurn rate alert: fast burn (1hr) + slow (6hr)" },
    ],
  },

  // ── 11. AWS CLOUD ENGINEER ──────────────────────────────────────────────────
  aws: {
    key: "aws",
    label: "AWS Cloud Engineer",
    icon: "☁️",
    color: "#F59E0B",
    colorBg: "#FFFBEB",
    colorBorder: "rgba(245,158,11,0.22)",
    ownership: "AWS Infrastructure, Scalability & Cloud Cost Optimisation",
    description: "Architect, secure, and optimise production AWS infrastructure from VPCs to serverless",

    tracks: ["AWS Solutions Architect", "AWS Developer", "AWS SysOps", "Serverless", "Data Engineering on AWS"],

    modules: [
      { id: "arch_builder", label: "Architecture Builder",  icon: "🏗️", desc: "Draw and document AWS architectures",   sandbox: "diagram"  },
      { id: "iam",          label: "IAM Manager",           icon: "🔐", desc: "Policies, roles, trust relationships",  sandbox: "markdown" },
      { id: "vpc",          label: "VPC Designer",          icon: "🌐", desc: "Subnets, routing, security groups",     sandbox: "diagram"  },
      { id: "cloudwatch",   label: "CloudWatch Center",     icon: "📊", desc: "Dashboards, alarms, log insights",      sandbox: "markdown" },
      { id: "cost",         label: "Cost Explorer",         icon: "💰", desc: "Cost analysis, Savings Plans, rightsizing",sandbox:"markdown"},
      { id: "serverless",   label: "Serverless Studio",     icon: "⚡", desc: "Lambda, API Gateway, Step Functions",   sandbox: "code"     },
    ],

    defaultModule: "arch_builder",
    defaultSandbox: "diagram",

    deliverables: ["Architecture Diagrams", "IaC (CDK/CloudFormation)", "IAM Policies", "Cost Reports"],

    skills: [
      "AWS Core Services (EC2, S3, RDS, VPC)", "IAM & Security",
      "Lambda / Serverless", "ECS / EKS", "CloudFormation / CDK",
      "CloudWatch / X-Ray", "Route 53 / CloudFront", "DynamoDB",
      "SQS / SNS / EventBridge", "Cost Optimisation", "Well-Architected Framework",
      "AWS Networking", "S3 Lifecycle Policies",
    ],

    missionCategories: [
      { id: "arch_design",  label: "Architecture Design",  workbench: "documentation_studio",  lang: "Markdown", icon: "🏗️" },
      { id: "iac",          label: "IaC (CDK/CF)",         sandbox: "code",     lang: "TypeScript",icon: "⚙️" },
      { id: "iam_policy",   label: "IAM Policy",           sandbox: "code",     lang: "JSON",     icon: "🔐" },
      { id: "lambda",       label: "Lambda Function",      sandbox: "code",     lang: "JavaScript",icon:"⚡" },
      { id: "cost_review",  label: "Cost Review",          sandbox: "markdown", lang: "Markdown", icon: "💰" },
    ],

    rubric: [
      { criterion: "Architecture Quality", weight: 30, desc: "Well-Architected pillars addressed" },
      { criterion: "Security",             weight: 25, desc: "Least privilege IAM, encryption, VPC isolation" },
      { criterion: "Reliability",          weight: 20, desc: "Multi-AZ, auto-scaling, backup strategy" },
      { criterion: "Cost Optimisation",    weight: 15, desc: "Right-sized, Spot/Reserved where appropriate" },
      { criterion: "Documentation",        weight: 10, desc: "Diagrams, IaC comments, decision rationale" },
    ],

    contextPanelSections: [
      { title: "Well-Architected Pillars", icon: "🏛️", content: "1. Operational Excellence: automate, iterate\n2. Security: identity, protect, detect\n3. Reliability: auto-recover, scale, test\n4. Performance Efficiency: right resources, evolve\n5. Cost Optimisation: eliminate waste, match supply\n6. Sustainability: minimise environmental impact" },
      { title: "IAM Best Practices",       icon: "🔐", content: "□ Root: MFA enabled, no access keys\n□ Users: individual, min privilege\n□ Roles: for services, cross-account\n□ Conditions: aws:SourceVpc, IpAddress\n□ Permission boundaries for delegation\n□ SCPs: at OU level in Organisations\n□ Access Analyser: review external access" },
      { title: "VPC Design",               icon: "🌐", content: "Public subnet: IGW route, NAT GW source\nPrivate subnet: NAT GW for egress only\nIsolated subnet: no internet (DB tier)\nNACL: stateless, subnet-level, ordered rules\nSG: stateful, instance-level, allow-only\nVPC Peering: no transitive routing\nTransit Gateway: hub-and-spoke scale" },
      { title: "Cost Optimisation",        icon: "💰", content: "Savings Plans: up to 66% (Compute flexible)\nReserved Instances: 1yr/3yr, up to 72%\nSpot Instances: up to 90%, interruptible\nS3 Lifecycle: transition → IA → Glacier\nRightsize: use Compute Optimiser\nShutdown unused: Lambda + schedules\nData transfer: keep in same AZ where possible" },
    ],
  },

  // ── 12. AZURE CLOUD ENGINEER ────────────────────────────────────────────────
  azure: {
    key: "azure",
    label: "Azure Cloud Engineer",
    icon: "🔵",
    color: "#0EA5E9",
    colorBg: "#F0F9FF",
    colorBorder: "rgba(14,165,233,0.22)",
    ownership: "Azure Infrastructure, Scalability & Cloud Governance",
    description: "Architect, secure, and govern production Azure infrastructure from ARM to AKS",

    tracks: ["Azure Solutions Architect", "Azure Developer", "Azure DevOps", "AKS / Container Apps", "Azure Data Engineering"],

    modules: [
      { id: "arch_builder", label: "Architecture Builder",  icon: "🏗️", desc: "Azure architecture diagrams and patterns", sandbox: "diagram"  },
      { id: "entra",        label: "Entra ID Manager",      icon: "🔐", desc: "AAD, app registrations, RBAC, PIM",       sandbox: "markdown" },
      { id: "monitoring",   label: "Monitoring Center",     icon: "📊", desc: "Azure Monitor, Log Analytics, KQL",       sandbox: "terminal" },
      { id: "cost",         label: "Cost Management",       icon: "💰", desc: "Cost analysis, budgets, advisor",         sandbox: "markdown" },
      { id: "aks",          label: "AKS Dashboard",         icon: "☸️", desc: "AKS cluster management, Helm, Flux",     sandbox: "terminal" },
      { id: "resource",     label: "Resource Explorer",     icon: "🌐", desc: "Resource groups, ARM/Bicep templates",    sandbox: "code"     },
    ],

    defaultModule: "arch_builder",
    defaultSandbox: "diagram",

    deliverables: ["Architecture Diagrams", "ARM / Bicep Templates", "RBAC Policies", "Cost Reports"],

    skills: [
      "Azure Core Services (VMs, VNets, Storage)", "Entra ID / AAD",
      "AKS", "Azure Functions / App Service", "ARM / Bicep / Terraform",
      "Azure Monitor / Log Analytics / KQL", "Azure DevOps",
      "Azure SQL / Cosmos DB", "Service Bus / Event Hubs",
      "Azure Security Center / Defender", "Cost Management", "Governance / Policy",
    ],

    missionCategories: [
      { id: "arch_design",  label: "Architecture Design",  workbench: "documentation_studio",  lang: "Markdown", icon: "🏗️" },
      { id: "bicep_iac",    label: "Bicep Template",       sandbox: "code",     lang: "Bicep",    icon: "⚙️" },
      { id: "rbac",         label: "RBAC / Policy",        sandbox: "code",     lang: "JSON",     icon: "🔐" },
      { id: "kql_query",    label: "KQL Query",            sandbox: "code",     lang: "KQL",      icon: "📊" },
      { id: "cost_review",  label: "Cost Review",          sandbox: "markdown", lang: "Markdown", icon: "💰" },
    ],

    rubric: [
      { criterion: "Architecture Quality", weight: 30, desc: "Azure CAF best practices applied" },
      { criterion: "Security",             weight: 25, desc: "Zero Trust, RBAC, encryption, Defender" },
      { criterion: "Reliability",          weight: 20, desc: "Availability zones, backup, auto-scale" },
      { criterion: "Cost Governance",      weight: 15, desc: "Budgets, reserved capacity, Advisor used" },
      { criterion: "Documentation",        weight: 10, desc: "Diagrams, IaC comments, RBAC rationale" },
    ],

    contextPanelSections: [
      { title: "Azure Landing Zone",    icon: "🏛️", content: "Management Groups → Subscriptions → RGs\nPlatform: Identity · Management · Connectivity\nApplication Landing Zones: corp/online/sandbox\nCAF: Plan → Ready → Adopt → Govern → Manage\nPolicy: inherit from MG, enforce compliance\nBlueprints (deprecated) → Template Specs" },
      { title: "Entra ID / RBAC",       icon: "🔐", content: "Assign roles at: MG · Sub · RG · Resource\nBuilt-in: Owner · Contributor · Reader\nCustom roles: specific actions array\nPIM: just-in-time privileged access\nConditions: abac on Azure Blob Storage\nApp registrations: client_credentials flow\nManaged Identity: no creds in code ever" },
      { title: "KQL Quick Ref",         icon: "📊", content: "AzureActivity | where OperationName has 'delete'\n| project TimeGenerated, Caller, Resource\n\nSigninLogs | summarize count() by UserPrincipalName\n| order by count_ desc | take 20\n\ninsights_table | where TimeGenerated > ago(1h)\n| where Level == 'Error'\n| bin TimeGenerated, 5m" },
      { title: "AKS Cheat Sheet",       icon: "☸️", content: "az aks get-credentials -g rg -n cluster\nkubectl get nodes -o wide\nhelm repo add ingress-nginx ...\nhelm upgrade --install nginx ingress-nginx/...\nkubectl get events --sort-by=.lastTimestamp\naz aks nodepool scale --node-count 5\naz aks upgrade -g rg -n cluster -k 1.30" },
    ],
  },

  // ── 13. BI ANALYST ─────────────────────────────────────────────────────────
  bi_analyst: {
    key:"bi_analyst", label:"BI Analyst", icon:"📊", color:"#8B5CF6",
    colorBg:"#F4F0FF", colorBorder:"rgba(139,92,246,0.20)",
    ownership:"Dashboards, KPIs, Business Metrics & Reporting",
    description:"Build dashboards, define metrics, and tell data stories that drive business decisions.",
    tracks:["Power BI","Tableau","Looker","SQL Reporting","Data Storytelling"],
    modules:[
      {id:"dashboard",    label:"Dashboard Builder",  icon:"📊", desc:"Build interactive dashboards with real data",    sandbox:"dashboard"},
      {id:"sql_queries",  label:"SQL Queries",        icon:"🗄️", desc:"Write reporting queries and aggregations",       sandbox:"sql"},
      {id:"kpi_design",   label:"KPI Design",         icon:"🎯", desc:"Define metrics, dimensions and KPI trees",      sandbox:"markdown"},
      {id:"data_story",   label:"Data Storytelling",  icon:"📖", desc:"Communicate insights to stakeholders",          sandbox:"report"},
    ],
    defaultModule:"dashboard", defaultSandbox:"dashboard",
    deliverables:["Dashboards","Metric Definitions","KPI Reports","Data Narratives"],
    skills:["SQL","Power BI","Tableau","DAX","Data Modelling","KPI Design","Stakeholder Communication","Excel/Sheets"],
    missionCategories:[
      {id:"build_dashboard", label:"Build Dashboard",    sandbox:"dashboard", lang:"SQL",      icon:"📊"},
      {id:"write_query",     label:"Write SQL Report",   sandbox:"sql",       lang:"SQL",      icon:"🗄️"},
      {id:"define_kpi",      label:"Define KPI",         sandbox:"markdown",  lang:"Markdown", icon:"🎯"},
    ],
    rubric:[
      {criterion:"SQL Correctness",   weight:30, desc:"Queries return accurate, well-structured results"},
      {criterion:"Dashboard Design",  weight:25, desc:"Chart types chosen appropriately, layout clear"},
      {criterion:"Metric Accuracy",   weight:25, desc:"KPIs defined correctly with right formula"},
      {criterion:"Insight Quality",   weight:20, desc:"Findings clearly communicated, actionable"},
    ],
    contextPanelSections:[
      {title:"SQL Aggregations",   icon:"🗄️", content:"COUNT(*), SUM(), AVG(), MIN(), MAX()\nGROUP BY col HAVING condition\nWINDOW: ROW_NUMBER() OVER (PARTITION BY x ORDER BY y)\nCTE: WITH cte AS (SELECT ...)\nLAG / LEAD for period-over-period"},
      {title:"Dashboard Checklist",icon:"📊", content:"✓ Chart type matches data type\n✓ Axes labelled with units\n✓ Title describes the insight\n✓ Colour used meaningfully\n✓ No chart junk / 3D effects\n✓ Mobile-friendly layout"},
    ],
  },

  // ── 14. DATA ENGINEER ──────────────────────────────────────────────────────
  data_engineer: {
    key:"data_engineer", label:"Data Engineer", icon:"⚙️", color:"#059669",
    colorBg:"#ECFDF5", colorBorder:"rgba(5,150,105,0.20)",
    ownership:"Pipelines, ETL/ELT, Data Infrastructure & Orchestration",
    description:"Build reliable data pipelines, transform raw data, and architect the infrastructure analysts rely on.",
    tracks:["Python + PySpark","dbt","Apache Airflow","Kafka/Streaming","Data Warehouse Design"],
    modules:[
      {id:"pipeline",    label:"Pipeline Studio",   icon:"⚙️", desc:"Build ETL/ELT pipelines with DAG visualiser",  sandbox:"notebook"},
      {id:"sql_transform",label:"SQL Transforms",   icon:"🗄️", desc:"dbt-style SQL transforms and data models",    sandbox:"sql"},
      {id:"streaming",   label:"Streaming Design",  icon:"🌊", desc:"Kafka topics, consumers, streaming logic",     sandbox:"terminal"},
      {id:"infra",       label:"Data Infra",        icon:"🏗️", desc:"Warehouse design, partitioning, indexing",    sandbox:"markdown"},
    ],
    defaultModule:"pipeline", defaultSandbox:"notebook",
    deliverables:["ETL Pipelines","Data Models","Transformation Logic","Infrastructure Specs"],
    skills:["Python","PySpark","dbt","Apache Airflow","Kafka","SQL","PostgreSQL","BigQuery","Snowflake","Docker"],
    missionCategories:[
      {id:"build_pipeline",   label:"Build Pipeline",     sandbox:"notebook", lang:"Python", icon:"⚙️"},
      {id:"write_transform",  label:"Write Transform",    sandbox:"sql",      lang:"SQL",    icon:"🗄️"},
      {id:"debug_pipeline",   label:"Debug Pipeline",     sandbox:"terminal", lang:"Bash",   icon:"🐛"},
    ],
    rubric:[
      {criterion:"Pipeline Correctness",  weight:35, desc:"Output matches expected schema and values"},
      {criterion:"Performance",           weight:25, desc:"Efficient partitioning, no unnecessary shuffles"},
      {criterion:"Idempotency",           weight:25, desc:"Re-runs produce same result; no duplicate records"},
      {criterion:"Code Quality",          weight:15, desc:"Readable, modular, well-named transforms"},
    ],
    contextPanelSections:[
      {title:"dbt Quick Ref",       icon:"🔧", content:"{{ ref('model_name') }} — reference upstream model\n{{ source('schema','table') }} — raw source\n{{ config(materialized='incremental') }}\nJinja: {% if is_incremental() %}\ndbt test --select model_name\ndbt run --select +model_name+"},
      {title:"PySpark Cheat Sheet", icon:"⚡", content:"spark.read.parquet('s3://...')\ndf.filter(col('x') > 0)\ndf.groupBy('y').agg(sum('z'))\ndf.write.partitionBy('dt').parquet('...')\ndf.cache() — persist to memory\ndf.explain() — check execution plan"},
    ],
  },

  // ── 15. SRE / PLATFORM ENGINEER ────────────────────────────────────────────
  sre: {
    key:"sre", label:"SRE / Platform Eng", icon:"🔭", color:"#0EA5E9",
    colorBg:"#F0F9FF", colorBorder:"rgba(14,165,233,0.20)",
    ownership:"Reliability, Observability, Incident Response & Platform",
    description:"Own reliability targets, build observability, manage Kubernetes, and run incident response.",
    tracks:["Kubernetes","Prometheus & Grafana","Incident Response","SLO/SLI Design","Platform Engineering"],
    modules:[
      {id:"k8s_ops",      label:"K8s Operations",    icon:"☸️", desc:"Debug pods, write manifests, scale deployments", sandbox:"terminal"},
      {id:"slo_design",   label:"SLO / SLI Design",  icon:"🎯", desc:"Define reliability targets and error budgets",   sandbox:"markdown"},
      {id:"observability",label:"Observability",      icon:"📡", desc:"PromQL queries, alerting rules, dashboards",     sandbox:"terminal"},
      {id:"postmortem",   label:"Postmortem Writing", icon:"📝", desc:"Blameless postmortems and root-cause analysis",  sandbox:"markdown"},
    ],
    defaultModule:"k8s_ops", defaultSandbox:"terminal",
    deliverables:["Incident Reports","SLO Definitions","Runbooks","K8s Manifests"],
    skills:["Kubernetes","Prometheus","Grafana","PromQL","Terraform","Docker","Incident Response","Python scripting","Bash"],
    missionCategories:[
      {id:"debug_incident",  label:"Debug Incident",   sandbox:"terminal", lang:"Bash",     icon:"🚨"},
      {id:"write_slo",       label:"Write SLO",        sandbox:"markdown", lang:"Markdown", icon:"🎯"},
      {id:"write_runbook",   label:"Write Runbook",    sandbox:"markdown", lang:"Markdown", icon:"📝"},
    ],
    rubric:[
      {criterion:"Incident Resolution",   weight:35, desc:"Root cause correctly identified and fixed"},
      {criterion:"SLO Accuracy",          weight:25, desc:"SLI/SLO/Error Budget defined correctly"},
      {criterion:"Runbook Quality",       weight:25, desc:"Steps clear, complete, executable"},
      {criterion:"Communication",         weight:15, desc:"Postmortem blameless, timeline accurate"},
    ],
    contextPanelSections:[
      {title:"kubectl Essentials",   icon:"☸️", content:"kubectl get pods -n ns -o wide\nkubectl describe pod <name>\nkubectl logs <pod> --previous\nkubectl exec -it <pod> -- /bin/sh\nkubectl rollout restart deploy/<name>\nkubectl top nodes / pods\nkubectl get events --sort-by=.lastTimestamp"},
      {title:"PromQL Quick Ref",     icon:"📡", content:"rate(http_requests_total[5m])\nsum by (status) (rate(errors[5m]))\nhistogram_quantile(0.99, ...)\nalert: expr: error_rate > 0.01\n  for: 5m\nrecording rule: job:http_errors:rate5m"},
    ],
  },

  // ── 16. SOC ANALYST / IR ───────────────────────────────────────────────────
  soc: {
    key:"soc", label:"SOC Analyst / IR", icon:"🛡️", color:"#DC2626",
    colorBg:"#FEF2F2", colorBorder:"rgba(220,38,38,0.20)",
    ownership:"Alert Triage, Incident Response & Threat Investigation",
    description:"Triage security alerts, respond to incidents, investigate threats, and write incident reports.",
    tracks:["Alert Triage","Incident Response","Threat Hunting","SIEM Queries","Forensic Analysis"],
    modules:[
      {id:"alert_triage",  label:"Alert Triage",      icon:"🚨", desc:"Classify alerts: true/false positive, severity",   sandbox:"terminal"},
      {id:"ir_playbook",   label:"IR Playbook",        icon:"📋", desc:"Follow and execute incident response steps",       sandbox:"markdown"},
      {id:"siem_queries",  label:"SIEM Queries",       icon:"🔍", desc:"Splunk/Elastic queries to find threat patterns",   sandbox:"terminal"},
      {id:"threat_report", label:"Threat Report",      icon:"📄", desc:"Write structured threat intelligence reports",     sandbox:"report"},
    ],
    defaultModule:"alert_triage", defaultSandbox:"terminal",
    deliverables:["Incident Reports","Alert Dispositions","SIEM Query Rules","Threat Timelines"],
    skills:["SIEM","Splunk","Elastic","Alert Triage","Incident Response","MITRE ATT&CK","Threat Hunting","Log Analysis"],
    missionCategories:[
      {id:"triage_alerts",   label:"Triage Alerts",    sandbox:"terminal", lang:"SPL",     icon:"🚨"},
      {id:"investigate_ioc", label:"Investigate IOC",  sandbox:"terminal", lang:"KQL",     icon:"🔍"},
      {id:"write_ir_report", label:"Write IR Report",  sandbox:"report",   lang:"Markdown",icon:"📄"},
    ],
    rubric:[
      {criterion:"Alert Classification", weight:35, desc:"True/false positive correctly identified with evidence"},
      {criterion:"Response Completeness",weight:30, desc:"All required IR steps executed in correct order"},
      {criterion:"Evidence Quality",     weight:20, desc:"Logs cited, IoCs documented, timeline accurate"},
      {criterion:"Report Clarity",       weight:15, desc:"Findings clearly written, actionable recommendations"},
    ],
    contextPanelSections:[
      {title:"MITRE ATT&CK Tactics", icon:"🎯", content:"TA0001 Initial Access → TA0002 Execution\nTA0003 Persistence → TA0004 Privilege Escalation\nTA0005 Defense Evasion → TA0006 Credential Access\nTA0007 Discovery → TA0008 Lateral Movement\nTA0009 Collection → TA0010 Exfiltration\nTA0011 Command & Control"},
      {title:"SPL Quick Ref",         icon:"🔍", content:"index=main sourcetype=auth action=failure\n| stats count by src_ip\n| sort -count | head 10\n\nindex=web uri_path=/admin\n| eval risk=if(status==200,'HIGH','LOW')\n| table _time, src_ip, status, risk"},
    ],
  },

  // ── 17. QA / TEST AUTOMATION ───────────────────────────────────────────────
  qa: {
    key:"qa", label:"QA / Test Automation", icon:"🧪", color:"#7C3AED",
    colorBg:"#F4F0FF", colorBorder:"rgba(124,58,237,0.20)",
    ownership:"Test Strategy, Automation, Bug Reports & Quality Gates",
    description:"Write automated tests, find bugs, design test strategies, and own quality across the delivery pipeline.",
    tracks:["Playwright","Cypress","Selenium","API Testing","Performance Testing"],
    modules:[
      {id:"write_tests",   label:"Write Test Suite",  icon:"🧪", desc:"Write automated E2E and unit tests",            sandbox:"code"},
      {id:"find_bugs",     label:"Bug Hunting",        icon:"🐛", desc:"Find bugs in a given application or code",     sandbox:"code"},
      {id:"api_testing",   label:"API Testing",        icon:"📡", desc:"Test REST endpoints with assertions",          sandbox:"api"},
      {id:"test_strategy", label:"Test Strategy",      icon:"🗺️", desc:"Design test plans and coverage strategy",     sandbox:"markdown"},
    ],
    defaultModule:"write_tests", defaultSandbox:"code",
    deliverables:["Test Suites","Bug Reports","Test Plans","Coverage Reports"],
    skills:["Playwright","Cypress","Jest","Selenium","API Testing","Postman","Test Design","Bug Reporting","CI/CD Integration"],
    missionCategories:[
      {id:"write_e2e",      label:"Write E2E Tests",   sandbox:"code",     lang:"TypeScript", icon:"🧪"},
      {id:"api_test",       label:"API Test Suite",    sandbox:"api",      lang:"JavaScript", icon:"📡"},
      {id:"bug_report",     label:"Write Bug Report",  sandbox:"markdown", lang:"Markdown",   icon:"🐛"},
    ],
    rubric:[
      {criterion:"Test Coverage",     weight:30, desc:"Critical paths and edge cases covered"},
      {criterion:"Test Correctness",  weight:30, desc:"Assertions are meaningful and accurate"},
      {criterion:"Code Quality",      weight:20, desc:"Tests are readable, maintainable, DRY"},
      {criterion:"Bug Report Quality",weight:20, desc:"Steps to reproduce clear, severity correct"},
    ],
    contextPanelSections:[
      {title:"Playwright Essentials", icon:"🎭", content:"test('name', async ({ page }) => {\n  await page.goto('/')\n  await page.click('button')\n  await expect(page).toHaveURL('/result')\n  await expect(page.locator('h1')).toBeVisible()\n})\n\npage.fill('input', 'value')\npage.waitForSelector('.spinner', {state:'hidden'})"},
      {title:"Test Pyramid",          icon:"🔺", content:"E2E (10%): Full user flows, slow but high value\nIntegration (20%): Service boundaries, APIs\nUnit (70%): Functions, components — fast\n\nNever: Test implementation details\nAlways: Test user behaviour\nAim for: 80%+ branch coverage on critical paths"},
    ],
  },

  // ── 18. BUSINESS / PRODUCT ANALYST ─────────────────────────────────────────
  ba_product: {
    key:"ba_product", label:"BA / Product Analyst", icon:"📋", color:"#D97706",
    colorBg:"#FFFBEB", colorBorder:"rgba(217,119,6,0.20)",
    ownership:"Requirements, Metrics, Process Design & Product Analytics",
    description:"Define requirements, measure product metrics, design processes, and translate data into business decisions.",
    tracks:["Requirements Analysis","Product Metrics","Process Mapping","Stakeholder Communication","SQL for Analysts"],
    modules:[
      {id:"requirements",  label:"Requirements",     icon:"📋", desc:"Write user stories, acceptance criteria, specs",  sandbox:"markdown"},
      {id:"metrics",       label:"Metrics & KPIs",   icon:"📊", desc:"Define, query and analyse product metrics",       sandbox:"sql"},
      {id:"process_map",   label:"Process Mapping",  icon:"🗺️", desc:"Design and document business processes",         sandbox:"diagram"},
      {id:"data_analysis", label:"Data Analysis",    icon:"🔍", desc:"Explore data to answer business questions",       sandbox:"notebook"},
    ],
    defaultModule:"requirements", defaultSandbox:"markdown",
    deliverables:["User Stories","Metric Definitions","Process Diagrams","Business Recommendations"],
    skills:["Requirements Writing","SQL","Data Analysis","Process Mapping","JIRA","Confluence","Stakeholder Management","Excel"],
    missionCategories:[
      {id:"write_user_story",  label:"Write User Story",     sandbox:"markdown", lang:"Markdown", icon:"📋"},
      {id:"analyse_metrics",   label:"Analyse Metrics",      sandbox:"sql",      lang:"SQL",      icon:"📊"},
      {id:"process_document",  label:"Document Process",     sandbox:"markdown", lang:"Markdown", icon:"🗺️"},
    ],
    rubric:[
      {criterion:"Requirements Completeness", weight:30, desc:"Stories have clear acceptance criteria, edge cases covered"},
      {criterion:"Metric Accuracy",           weight:25, desc:"KPIs defined with correct formula and data source"},
      {criterion:"SQL Correctness",           weight:25, desc:"Queries return accurate results"},
      {criterion:"Communication",             weight:20, desc:"Written output is clear, structured, stakeholder-ready"},
    ],
    contextPanelSections:[
      {title:"User Story Template",  icon:"📋", content:"As a [user type]\nI want to [action]\nSo that [benefit]\n\nAcceptance Criteria:\n✓ Given [context] When [action] Then [result]\n✓ Edge case: [scenario]\n\nDefinition of Done:\n□ Tests written □ Reviewed □ Deployed"},
      {title:"AARRR Metrics",        icon:"📊", content:"Acquisition:  new users / CAC\nActivation:   % completing onboarding\nRetention:    DAU/MAU · churn rate\nRevenue:      ARPU · LTV · MRR\nReferral:     NPS · viral coefficient\n\nNorth Star Metric = single KPI that best captures\ndelivered value (e.g. 'weekly active buyers')"},
    ],
  },


  // ── EMBEDDED SYSTEMS / FIRMWARE ────────────────────────────────────────────
  embedded: {
    key: "embedded",
    label: "Embedded Engineer",
    icon: "🔌",
    color: "#84CC16",
    colorBg: "#F7FEE7",
    colorBorder: "rgba(132,204,22,0.20)",
    ownership: "Firmware, RTOS, Bare-Metal & Peripheral Drivers",
    description: "Write firmware, driver code, and real-time systems for microcontrollers and SoCs",
    tracks: ["Bare-Metal C","RTOS (FreeRTOS/Zephyr)","ARM Cortex-M","Peripheral Drivers","IoT Firmware"],
    modules: [
      { id: "firmware_lab",   label: "Firmware Lab",        icon: "🔌", desc: "Write and simulate embedded C programs",      sandbox: "code"     },
      { id: "protocol_sim",   label: "Protocol Simulator",  icon: "📡", desc: "Simulate UART, SPI, I²C, CAN transactions",   sandbox: "code"     },
      { id: "rtos_bench",     label: "RTOS Bench",          icon: "⏱️", desc: "Design task scheduler, priority, semaphores", sandbox: "code"     },
      { id: "power_calc",     label: "Power Calculator",    icon: "🔋", desc: "Compute power budgets and sleep currents",     sandbox: "notebook" },
      { id: "debug_console",  label: "Debug Console",       icon: "🐛", desc: "Trace register states and interrupt vectors", sandbox: "terminal" },
      { id: "hw_design",      label: "HW Interface Docs",   icon: "📋", desc: "Datasheet reading and register map notes",     sandbox: "markdown" },
    ],
    defaultModule: "firmware_lab",
    defaultSandbox: "code",
    deliverables: ["Firmware Modules","Driver Libraries","RTOS Task Designs","Power Budget Reports"],
    skills: [
      "Embedded C","ARM Cortex Architecture","RTOS (FreeRTOS/Zephyr)","UART / SPI / I²C / CAN",
      "Interrupt Handling","Memory-Mapped Registers","Bootloader Design","Power Management",
      "Debugging (JTAG/SWD)","Device Drivers","Real-Time Constraints","Hardware Abstraction Layer",
    ],
    missionCategories: [
      { id: "driver_write",   label: "Write Driver",       workbench: "firmware_ide",           lang: "C",        icon: "🔌", skill: "gpio_peripherals" },
      { id: "rtos_task",      label: "RTOS Task Design",   workbench: "rtos_debugger",          lang: "C",        icon: "⏱️", skill: "rtos_design" },
      { id: "protocol_impl",  label: "Protocol Impl",      workbench: "firmware_ide",           lang: "C",        icon: "📡", skill: "serial_protocols" },
      { id: "power_budget",   label: "Power Budget",       workbench: "engineering_calculator", lang: "Python",   icon: "🔋", skill: "power_management" },
      { id: "debug_trace",    label: "Debug & Trace",      workbench: "terminal_console",       lang: "Shell",    icon: "🐛", skill: "debug_techniques" },
    ],
    rubric: [
      { criterion: "Correctness",        weight: 35, desc: "Code compiles and logic matches peripheral spec" },
      { criterion: "Real-Time Safety",   weight: 25, desc: "No race conditions; ISR is minimal and non-blocking" },
      { criterion: "Code Quality",       weight: 20, desc: "Clean C, meaningful names, register macros used" },
      { criterion: "Power Efficiency",   weight: 10, desc: "Sleep modes and wake-up strategy applied correctly" },
      { criterion: "Documentation",      weight: 10, desc: "Register usage and design decisions commented" },
    ],
    contextPanelSections: [
      { title: "Bare-Metal C Patterns", icon: "🔌", content: "volatile uint32_t *REG = (uint32_t*)0x40000000;\n*REG |= (1 << BIT);  // set\n*REG &= ~(1 << BIT); // clear\n\nISR: __attribute__((interrupt)) void IRQHandler(void)\nAlways declare ISR-shared variables volatile\nDisable interrupts before multi-step read-modify-write" },
      { title: "RTOS Concepts",         icon: "⏱️", content: "Task states: Ready → Running → Blocked → Suspended\nSemaphore: binary (mutex) | counting (resource pool)\nQueue: xQueueSend / xQueueReceive (ISR: FromISR variants)\nPriority inversion → use priority inheritance mutex\nvTaskDelayUntil() for periodic tasks (not vTaskDelay)" },
      { title: "Common Protocols",      icon: "📡", content: "UART: async, 1 start + 8 data + 1 stop, baud rate\nSPI: CPOL/CPHA modes, full-duplex, master-slave CS\nI²C: 7-bit addr, ACK/NACK, START/STOP, 400kHz fast\nCAN: CSMA/CD, arbitration by ID, DLC 0-8 bytes\nUSB HID: descriptor-based enumeration" },
      { title: "ARM Cortex-M Quick Ref",icon: "⚙️", content: "NVIC: ISER/ICER/ISPR — enable/clear/set-pending\nSysTick: 24-bit downcounter, LOAD/VAL/CTRL regs\nMPU: 8 configurable regions (M3/M4/M7)\nDWT: cycle counter for profiling\nFPU: single-precision on M4/M7 (lazy stacking)" },
    ],
  },

  // ── VLSI / CHIP DESIGN ────────────────────────────────────────────────────
  vlsi: {
    key: "vlsi",
    label: "VLSI Engineer",
    icon: "🔬",
    color: "#6366F1",
    colorBg: "#EEF2FF",
    colorBorder: "rgba(99,102,241,0.20)",
    ownership: "RTL Design, Verification, Timing & Physical Design",
    description: "Design and verify digital ICs from RTL to GDSII using Verilog/SystemVerilog",
    tracks: ["RTL Design (Verilog/SV)","Functional Verification","STA & Timing Closure","DFT","Physical Design"],
    modules: [
      { id: "rtl_editor",      label: "RTL Editor",         icon: "🔬", desc: "Write Verilog / SystemVerilog modules",       sandbox: "code"     },
      { id: "sim_bench",       label: "Simulation Bench",   icon: "🧪", desc: "Build testbenches and run simulation",        sandbox: "code"     },
      { id: "timing_analysis", label: "Timing Analysis",    icon: "⏱️", desc: "Compute setup/hold and path analysis",        sandbox: "notebook" },
      { id: "verify_lab",      label: "Verify Lab",         icon: "✅", desc: "UVM sequences, assertions, coverage",         sandbox: "code"     },
      { id: "synthesis_view",  label: "Synthesis Notes",    icon: "⚙️", desc: "Synthesis constraints and area reports",      sandbox: "markdown" },
    ],
    defaultModule: "rtl_editor",
    defaultSandbox: "code",
    deliverables: ["RTL Modules","Testbenches","Timing Reports","Verification Plans"],
    skills: [
      "Verilog / SystemVerilog","RTL Design","Functional Verification (UVM)","Static Timing Analysis",
      "Clock Domain Crossing","DFT / Scan Insertion","Logic Synthesis","Floorplanning",
      "Formal Verification","Assertions (SVA)","Low-Power Design","FPGA Prototyping",
    ],
    missionCategories: [
      { id: "rtl_design",      label: "RTL Design",         workbench: "hdl_ide",                lang: "Verilog",       icon: "🔬", skill: "hdl_design" },
      { id: "testbench",       label: "Testbench",          workbench: "hdl_ide",                lang: "SystemVerilog", icon: "🧪", skill: "functional_verify" },
      { id: "timing_calc",     label: "Timing Calc",        workbench: "engineering_calculator", lang: "Python",        icon: "⏱️", skill: "timing_analysis" },
      { id: "uvm_sequence",    label: "UVM Sequence",       workbench: "hdl_ide",                lang: "SystemVerilog", icon: "✅", skill: "functional_verify" },
      { id: "synthesis_doc",   label: "Synthesis Doc",      workbench: "documentation_studio",   lang: "Markdown",      icon: "⚙️", skill: "synthesis_flow" },
    ],
    rubric: [
      { criterion: "Functional Correctness",  weight: 35, desc: "Module passes all testbench vectors" },
      { criterion: "Timing Clean",            weight: 25, desc: "No setup/hold violations at target frequency" },
      { criterion: "Code Quality",            weight: 20, desc: "Synthesisable RTL, no latches, clean naming" },
      { criterion: "Verification Coverage",   weight: 15, desc: "Code and functional coverage targets met" },
      { criterion: "Documentation",           weight:  5, desc: "Module header, port descriptions, constraints noted" },
    ],
    contextPanelSections: [
      { title: "RTL Golden Rules",       icon: "🔬", content: "Always register outputs of combinational blocks\nAvoid incomplete sensitivity lists (use always @*)\nOne clock per always block — no mixed-edge designs\nReset all flops (synchronous preferred)\nNo glue logic between clock domains — use sync FIFOs\nAvoid delays in synthesisable code (#, $time)" },
      { title: "Setup/Hold Timing",      icon: "⏱️", content: "Setup slack = Data required time − Data arrival time\nHold slack  = Data arrival time − Data hold required time\nSetup fix: reduce combinational depth, upsize cells, retiming\nHold fix: add buffers/delay cells on short paths\nOCV: use on-chip variation derating (early/late)" },
      { title: "UVM Phases",             icon: "✅", content: "build_phase → connect_phase → start_of_simulation\nrun_phase (objection-based) → extract/check/report\n\nAgent = Driver + Monitor + Sequencer\nScorecard: write() from monitor, predict in ref model\nCoverage: covergroup inside class, sample() in monitor" },
      { title: "CDC Rules",              icon: "🔗", content: "Never sample asynchronous signals directly\n2-FF synchroniser: min 2 MTBF flip-flops\nMulti-bit: use gray code counters (async FIFO)\nHandshake: req/ack with pulse synchroniser\nTool: identify crossings, waive only when justified" },
    ],
  },

  // ── ANALOG IC LAYOUT ────────────────────────────────────────────────────────
  analog_ic: {
    key: "analog_ic",
    label: "Analog Layout Engineer",
    icon: "🔧",
    color: "#F97316",
    colorBg: "#FFF7ED",
    colorBorder: "rgba(249,115,22,0.20)",
    ownership: "Full-Custom IC Layout, DRC/LVS & Parasitic Extraction",
    description: "Create analog and mixed-signal IC layouts with Cadence Virtuoso, ensure DRC/LVS clean",
    tracks: ["Full-Custom Layout","Analog Circuit Analysis","Parasitic Extraction","DRC/LVS","Mixed-Signal"],
    modules: [
      { id: "spice_sim",     label: "SPICE Simulator",    icon: "📈", desc: "Run op-amp, comparator, LDO simulations",    sandbox: "notebook" },
      { id: "layout_review", label: "Layout Review",      icon: "🔧", desc: "Describe layout strategy and constraints",    sandbox: "markdown" },
      { id: "drc_check",     label: "DRC / LVS Notes",   icon: "✅", desc: "Document DRC rules and LVS fixes",            sandbox: "markdown" },
      { id: "pex_analysis",  label: "Parasitic Analysis", icon: "🔍", desc: "RC extraction and post-layout simulation",    sandbox: "notebook" },
      { id: "circuit_calc",  label: "Circuit Calculator", icon: "🧮", desc: "Compute bias, bandwidth, noise floor",        sandbox: "notebook" },
    ],
    defaultModule: "spice_sim",
    defaultSandbox: "notebook",
    deliverables: ["Layout Strategy Docs","DRC/LVS Reports","Parasitic Extraction Reports","Circuit Analysis"],
    skills: [
      "Full-Custom IC Layout","Cadence Virtuoso","Analog Circuit Analysis","Device Matching",
      "DRC / LVS / ERC","Guard Rings & Shielding","Parasitic Extraction (PEX/RC)",
      "Analog Block Floorplanning","Electromigration Rules","ESD Protection","Low-Noise Layout","Mixed-Signal Integration",
    ],
    missionCategories: [
      { id: "circuit_analysis", label: "Circuit Analysis",  workbench: "circuit_workbench",    lang: "Python",   icon: "📈", skill: "spice_simulation" },
      { id: "layout_strategy",  label: "Layout Strategy",   workbench: "layout_studio",        lang: "Markdown", icon: "🔧", skill: "layout_skills" },
      { id: "drc_fix",          label: "DRC Fix",           workbench: "layout_studio",        lang: "Markdown", icon: "✅", skill: "layout_skills" },
      { id: "parasitic_calc",   label: "Parasitic Calc",    workbench: "circuit_workbench",    lang: "Python",   icon: "🔍", skill: "noise_matching" },
    ],
    rubric: [
      { criterion: "Layout Correctness",    weight: 30, desc: "DRC/LVS clean per PDK rules" },
      { criterion: "Matching Strategy",     weight: 25, desc: "Common-centroid, dummy devices, proper guard rings" },
      { criterion: "Parasitic Minimisation",weight: 20, desc: "Capacitance and resistance targets met post-PEX" },
      { criterion: "ESD & Reliability",     weight: 15, desc: "ESD structures present, EM rules respected" },
      { criterion: "Documentation",         weight: 10, desc: "Layout decisions and critical nodes annotated" },
    ],
    contextPanelSections: [
      { title: "Matching Techniques",    icon: "🔧", content: "Common-centroid: ABBA or 2x2 array for diff pairs\nInterdigitation: alternating fingers for transistors\nDummy devices: edge / corner to equalise etch gradient\nShielding: guard rings around sensitive nodes\nOrientation: same for matched devices (stress, lit gradient)" },
      { title: "DRC Essentials",        icon: "✅", content: "Min width & spacing: per metal / poly / diffusion layer\nEnclosure: active must enclose contact by min rule\nVia rules: single-via allowed only when specified\nAntenna rule: gate area ratio to metal area (via diode fix)\nDensity: metal fill required per layer density rule" },
      { title: "Parasitic Extraction",  icon: "🔍", content: "R_metal = (rho/t) x (L/W) — sheet resistance model\nC_fringe >> C_plate for fine geometries\nPEX flow: extract → netlist → re-simulate vs schematic\nEM limit: J_max per metal layer (foundry provided)\nPost-layout Spice: include .pex file, check AC / DC / transient" },
      { title: "ESD Protection",        icon: "⚡", content: "HBM: 1500V Human Body Model minimum\nCDM: Charged Device Model sensitive to fast paths\nESD diodes: clamp pads to VDD and VSS rails\nLatch-up prevention: well ties every 10-15um\nGate oxide: never exceed VGS_max even briefly" },
    ],
  },

  // ── EEE / ELECTRICAL ENGINEERING ──────────────────────────────────────────
  eee: {
    key: "eee",
    label: "Electrical Engineer",
    icon: "⚡",
    color: "#EAB308",
    colorBg: "#FEFCE8",
    colorBorder: "rgba(234,179,8,0.20)",
    ownership: "Power Systems, Machines, Control & Power Electronics",
    description: "Analyse and design power systems, electrical machines, control loops, and PE converters",
    tracks: ["Power Systems","Electrical Machines","Control Systems","Power Electronics","Instrumentation"],
    modules: [
      { id: "power_calc",      label: "Power Calculator",   icon: "⚡", desc: "Load flow, short-circuit, power factor",      sandbox: "notebook" },
      { id: "machine_sim",     label: "Machine Simulator",  icon: "🔄", desc: "Motor/generator torque-speed analysis",       sandbox: "notebook" },
      { id: "control_design",  label: "Control Design",     icon: "🎛️", desc: "PID tuning, Bode plot, stability margins",    sandbox: "notebook" },
      { id: "pe_converter",    label: "PE Converter",       icon: "🔋", desc: "Buck/Boost/Inverter waveform calculation",    sandbox: "notebook" },
      { id: "plc_editor",      label: "PLC / IEC 61131",    icon: "🏭", desc: "Ladder logic and structured text exercises",  sandbox: "code"     },
      { id: "standards_ref",   label: "Standards Ref",      icon: "📋", desc: "IEEE, IEC, IS standards quick reference",     sandbox: "markdown" },
    ],
    defaultModule: "power_calc",
    defaultSandbox: "notebook",
    deliverables: ["Load Flow Reports","Motor Drive Designs","Control System Designs","Converter Specifications"],
    skills: [
      "Power Systems Analysis","Load Flow (Newton-Raphson)","Electrical Machines (AC/DC)","Induction Motor Drives",
      "Control Systems (PID/Root Locus)","Power Electronics (Buck/Boost/Inverter)","Protection Relaying",
      "SCADA / PLC Programming","Transformer Design","Switchgear","Grounding & Earthing","IEC / IEEE Standards",
    ],
    missionCategories: [
      { id: "load_flow",       label: "Load Flow",          workbench: "engineering_calculator", lang: "Python",   icon: "⚡", skill: "power_systems" },
      { id: "motor_analysis",  label: "Motor Analysis",     workbench: "engineering_calculator", lang: "Python",   icon: "🔄", skill: "electrical_machines" },
      { id: "control_loop",    label: "Control Loop",       workbench: "engineering_calculator", lang: "Python",   icon: "🎛️", skill: "control_systems" },
      { id: "pe_design",       label: "PE Converter",       workbench: "engineering_calculator", lang: "Python",   icon: "🔋", skill: "power_electronics" },
      { id: "plc_program",     label: "PLC Programming",    workbench: "code_ide",               lang: "IEC61131", icon: "🏭", skill: "plc_programming" },
    ],
    rubric: [
      { criterion: "Calculation Accuracy",  weight: 35, desc: "Numerical results match expected values within tolerance" },
      { criterion: "Method Correctness",    weight: 30, desc: "Correct technique applied (Newton-Raphson, Park's transform…)" },
      { criterion: "Standards Compliance",  weight: 15, desc: "Design respects relevant IEC / IEEE standards" },
      { criterion: "Code Quality",          weight: 10, desc: "Clean Python / PLC code, units labelled" },
      { criterion: "Interpretation",        weight: 10, desc: "Results interpreted and engineering conclusions drawn" },
    ],
    contextPanelSections: [
      { title: "Power Systems Formulas",  icon: "⚡", content: "S = P + jQ = V × I*\nP = √3 × VL × IL × cos(φ) (3-phase)\nShort-circuit: Isc = V / Zth\nPower factor: PF = cos(φ) = P / |S|\nPer-unit: Vpu = Vactual / Vbase" },
      { title: "Induction Motor",         icon: "🔄", content: "Slip: s = (Ns - N) / Ns\nTorque: T = (3/ωs) × I2² × R2/s\nEquivalent circuit: R1, jX1, Rc, jXm, R2/s, jX2\nStarting: DOL | Star-Delta | Soft Starter | VFD\nSpeed control: VSI (V/f = const) → vector control" },
      { title: "Control Systems",         icon: "🎛️", content: "PID: u(t) = Kp·e + Ki·∫e dt + Kd·de/dt\nZiegler-Nichols: Ku, Tu → Kp=0.6Ku, Ti=0.5Tu, Td=0.125Tu\nRoot Locus: poles → LHP for stability\nBode: GM > 6dB, PM > 45° for robust loop\nLaplace: differentiation → s, integration → 1/s" },
      { title: "PE Converter Basics",     icon: "🔋", content: "Buck: Vo = D × Vin  (D = duty cycle)\nBoost: Vo = Vin / (1-D)\nBuck-Boost: Vo = -D/(1-D) × Vin\nInverter: THD target < 5% (IEEE 519)\nSwitching loss: Psw = 0.5 × Vin × IL × (tr+tf) × fs" },
    ],
  },

  // ── MECHANICAL ENGINEERING ─────────────────────────────────────────────────
  mechanical: {
    key: "mechanical",
    label: "Mechanical Engineer",
    icon: "⚙️",
    color: "#64748B",
    colorBg: "#F8FAFC",
    colorBorder: "rgba(100,116,139,0.20)",
    ownership: "Thermodynamics, Fluid Mechanics, Design & Manufacturing",
    description: "Solve engineering problems in thermodynamics, CFD, machine design, and manufacturing",
    tracks: ["Machine Design","Thermodynamics","Fluid Mechanics","Manufacturing","FEA / Simulation"],
    modules: [
      { id: "thermo_calc",   label: "Thermo Calculator",   icon: "🌡️", desc: "Heat transfer, cycles, efficiency calcs",     sandbox: "notebook" },
      { id: "fluid_calc",    label: "Fluid Mechanics",     icon: "💧", desc: "Pipe flow, Bernoulli, Reynolds, pump curves",  sandbox: "notebook" },
      { id: "stress_calc",   label: "Stress Analysis",     icon: "⚙️", desc: "Beam bending, torsion, FOS calculations",    sandbox: "notebook" },
      { id: "mfg_planner",   label: "Mfg Process Planner", icon: "🏭", desc: "Machining, tolerances, GD&T process plans",   sandbox: "code"     },
      { id: "cad_review",    label: "Design Review",       icon: "📐", desc: "Design criteria, material selection, DFM",    sandbox: "markdown" },
    ],
    defaultModule: "thermo_calc",
    defaultSandbox: "notebook",
    deliverables: ["Stress Analysis Reports","Heat Transfer Studies","Fluid System Designs","Manufacturing Process Plans"],
    skills: [
      "Thermodynamics (1st/2nd Law)","Heat Transfer (Conduction/Convection/Radiation)","Fluid Mechanics",
      "Machine Design (Shafts/Gears/Bearings)","Strength of Materials","FEA (ANSYS/Abaqus)",
      "Manufacturing Processes","GD&T","Material Selection","Vibration Analysis","CAD (SolidWorks/CATIA)","DFM / DFA",
    ],
    missionCategories: [
      { id: "thermo_problem",  label: "Thermo Problem",     workbench: "mechanical_studio",    lang: "Python",   icon: "🌡️", skill: "thermodynamics" },
      { id: "fluid_problem",   label: "Fluid Problem",      workbench: "mechanical_studio",    lang: "Python",   icon: "💧", skill: "fluid_mechanics" },
      { id: "stress_problem",  label: "Stress Analysis",    workbench: "mechanical_studio",    lang: "Python",   icon: "⚙️", skill: "solid_mechanics" },
      { id: "mfg_plan",        label: "Mfg Planning",       workbench: "code_ide",             lang: "Python",   icon: "🏭", skill: "manufacturing" },
      { id: "design_review",   label: "Design Review",      workbench: "documentation_studio", lang: "Markdown", icon: "📐", skill: "cad_modeling" },
    ],
    rubric: [
      { criterion: "Calculation Accuracy",  weight: 35, desc: "Results within ±5% of analytical solution" },
      { criterion: "Methodology",           weight: 30, desc: "Correct equations and assumptions stated" },
      { criterion: "Safety Factor",         weight: 15, desc: "Adequate FOS applied with material properties" },
      { criterion: "Practical Feasibility", weight: 10, desc: "Design is manufacturable and cost-aware" },
      { criterion: "Presentation",          weight: 10, desc: "Clearly labelled diagrams, units consistent (SI)" },
    ],
    contextPanelSections: [
      { title: "Thermodynamics Laws",    icon: "🌡️", content: "1st Law: Q - W = ΔU (closed) | Q - W = Δh (open)\n2nd Law: η_Carnot = 1 - TL/TH\nSteam tables: use specific enthalpy h, entropy s\nRankine cycle: pump → boiler → turbine → condenser\nRefrigeration COP = QL / W = QL / (QH - QL)" },
      { title: "Fluid Mechanics",        icon: "💧", content: "Bernoulli: P + 0.5ρv² + ρgh = const\nReynolds: Re = ρvD/μ (<2300 laminar, >4000 turbulent)\nDarcy-Weisbach: hf = f(L/D)(v²/2g)\nPump affinity: Q∝N, H∝N², P∝N³\nBoundary layer: δ = 5x/√Re_x (laminar flat plate)" },
      { title: "Strength of Materials",  icon: "⚙️", content: "Bending: σ = My/I  |  Shear: τ = VQ/Ib\nTorsion: τ = Tr/J  |  Angle: φ = TL/GJ\nColumn buckling: Pcr = π²EI / (Le)²\nFatigue: S-N curve, endurance limit Se ≈ 0.5Su\nFOS = Syt / σmax (static) | Se / σa (fatigue)" },
      { title: "Heat Transfer",          icon: "🔥", content: "Conduction: Q = kA(ΔT/L)\nConvection: Q = hA·ΔT  (h from Nu·k/L)\nRadiation: Q = εσA(T1⁴ - T2⁴)\nNusselt (forced): Nu = C·Re^m·Pr^n\nFourier number: Fo = αt/L²  (transient lumped)" },
    ],
  },

  // ── CIVIL ENGINEERING ─────────────────────────────────────────────────────
  civil: {
    key: "civil",
    label: "Civil Engineer",
    icon: "🏗️",
    color: "#B45309",
    colorBg: "#FFFBEB",
    colorBorder: "rgba(180,83,9,0.20)",
    ownership: "Structural, Geotechnical, Transportation & Water Resources",
    description: "Design and analyse structures, foundations, transport networks, and hydraulic systems",
    tracks: ["Structural Engineering","Geotechnical Engineering","Transportation","Water Resources","Construction Management"],
    modules: [
      { id: "structural_calc", label: "Structural Calc",    icon: "🏗️", desc: "Beam, column, slab, frame analysis",          sandbox: "notebook" },
      { id: "soil_lab",        label: "Soil Lab",           icon: "🌍", desc: "Bearing capacity, settlement, slope stability", sandbox: "notebook" },
      { id: "hydro_calc",      label: "Hydrology Calc",     icon: "💧", desc: "Runoff, open channel, pipe network calcs",     sandbox: "notebook" },
      { id: "transport_plan",  label: "Transport Planning", icon: "🛣️", desc: "HCM, pavement design, traffic analysis",       sandbox: "notebook" },
      { id: "drawing_review",  label: "Drawing Review",     icon: "📐", desc: "Review and annotate engineering drawings",     sandbox: "markdown" },
      { id: "quantity_est",    label: "Quantity Estimation",icon: "🧮", desc: "BOQ preparation and cost estimation",          sandbox: "notebook" },
    ],
    defaultModule: "structural_calc",
    defaultSandbox: "notebook",
    deliverables: ["Structural Analysis Reports","Geotechnical Reports","Hydraulic Design Reports","BOQ Sheets"],
    skills: [
      "Structural Analysis (Beams/Frames)","RCC Design (IS456)","Steel Design (IS800)","Soil Mechanics",
      "Foundation Design","Highway Engineering","Hydrology & Hydraulics","Open Channel Flow",
      "Traffic Engineering","Surveying","Construction Management","AutoCAD Civil 3D",
    ],
    missionCategories: [
      { id: "structural_problem", label: "Structural Analysis", workbench: "structural_workbench",   lang: "Python",   icon: "🏗️", skill: "structural_analysis" },
      { id: "geotech_problem",    label: "Geotechnical Calc",   workbench: "engineering_calculator", lang: "Python",   icon: "🌍", skill: "geotechnical" },
      { id: "hydro_problem",      label: "Hydrology Problem",   workbench: "engineering_calculator", lang: "Python",   icon: "💧", skill: "hydraulics" },
      { id: "transport_problem",  label: "Transport Analysis",  workbench: "engineering_calculator", lang: "Python",   icon: "🛣️", skill: "transportation" },
      { id: "design_review",      label: "Design Review",       workbench: "documentation_studio",   lang: "Markdown", icon: "📐", skill: "bim" },
    ],
    rubric: [
      { criterion: "Calculation Accuracy",  weight: 35, desc: "Results within IS/ACI code tolerances" },
      { criterion: "Code Compliance",       weight: 30, desc: "Design follows IS456 / IS800 / IS1893 correctly" },
      { criterion: "Load Combinations",     weight: 15, desc: "Correct DL, LL, Wind, Seismic combinations applied" },
      { criterion: "Practical Design",      weight: 10, desc: "Economical, buildable, and safe design decisions" },
      { criterion: "Presentation",          weight: 10, desc: "Labelled diagrams, SI units, clear assumptions" },
    ],
    contextPanelSections: [
      { title: "Structural Formulas",    icon: "🏗️", content: "Simply supported beam: M_max = wL²/8 | δ_max = 5wL⁴/384EI\nCantilever: M_max = wL²/2 | δ_max = wL⁴/8EI\nColumn: Pcr = π²EI/Le² (Euler)\nRCC cover: 40mm (column), 25mm (slab), 50mm (footing)\nIS456: Mu_lim = 0.138 × fck × b × d²" },
      { title: "Soil Mechanics",         icon: "🌍", content: "Bearing capacity: qu = cNc + qNq + 0.5γBNγ\nTerzaghi (strip): qu = 1.3cNc + qNq + 0.4γBNγ\nConsolidation: Tv = Cv·t/H²\nSlope stability: FS = c'L / (W·sin(α)) + tan(φ') / tan(α)\nSPT N → Dr → φ (Peck correlation)" },
      { title: "Hydrology",              icon: "💧", content: "Rational method: Q = C·i·A/360 (m³/s)\nManning's: V = (1/n)·R^(2/3)·S^(1/2)\nCritical flow: Fr = V/√(gD) = 1\nDarcy's law: Q = kAi (groundwater)\nUnit hydrograph: linearity + time invariance" },
      { title: "Load Combinations IS",   icon: "⚖️", content: "IS 875 DL+LL: 1.5(DL+LL)\nIS 875 DL+WL: 1.5(DL+WL) | 0.9DL+1.5WL\nIS 1893 Seismic: 1.2(DL+LL+EQ) | 1.5(DL+EQ)\nService load: 1.0DL + 1.0LL (for deflection check)\nBase shear: Vb = Ah × W (IS1893)" },
    ],
  },

  // ── ML / AI ENGINEERING ───────────────────────────────────────────────────
  ml: {
    key: "ml",
    label: "ML / AI Engineer",
    icon: "🤖",
    color: "#A855F7",
    colorBg: "#FAF5FF",
    colorBorder: "rgba(168,85,247,0.20)",
    ownership: "Model Training, Evaluation, Deployment & MLOps",
    description: "Build, evaluate, and deploy machine learning models and AI pipelines",
    tracks: ["Classical ML","Deep Learning","NLP / LLMs","Computer Vision","MLOps & Deployment"],
    modules: [
      { id: "model_trainer",    label: "Model Trainer",      icon: "🤖", desc: "Train classifiers, regressors, neural nets",  sandbox: "notebook" },
      { id: "data_explorer",    label: "Data Explorer",      icon: "📊", desc: "EDA, feature engineering, data cleaning",     sandbox: "notebook" },
      { id: "experiment_track", label: "Experiment Tracker", icon: "📈", desc: "Compare runs, metrics, hyperparameter search", sandbox: "notebook" },
      { id: "deploy_lab",       label: "Deploy Lab",         icon: "🚀", desc: "FastAPI serving, Docker, model packaging",     sandbox: "code"     },
      { id: "eval_suite",       label: "Eval Suite",         icon: "✅", desc: "Confusion matrix, AUC-ROC, BLEU, ROUGE",      sandbox: "notebook" },
    ],
    defaultModule: "model_trainer",
    defaultSandbox: "notebook",
    deliverables: ["Trained Models","Evaluation Reports","ML Pipelines","Deployed APIs"],
    skills: [
      "Python (NumPy/Pandas)","Scikit-learn","PyTorch / TensorFlow","Feature Engineering",
      "Model Evaluation (AUC/F1/RMSE)","Neural Network Design","NLP (Transformers/BERT)","Computer Vision (CNNs)",
      "MLOps (MLflow/W&B)","Model Deployment (FastAPI)","LLM Fine-Tuning / RAG","Data Pipelines",
    ],
    missionCategories: [
      { id: "classification",    label: "Classification",     workbench: "ml_workbench", lang: "Python", icon: "🤖", skill: "ml_fundamentals" },
      { id: "regression",        label: "Regression",         workbench: "ml_workbench", lang: "Python", icon: "📈", skill: "feature_engineering" },
      { id: "nlp_task",          label: "NLP Task",           workbench: "ml_workbench", lang: "Python", icon: "💬", skill: "deep_learning" },
      { id: "cv_task",           label: "Computer Vision",    workbench: "ml_workbench", lang: "Python", icon: "👁️", skill: "deep_learning" },
      { id: "deploy_api",        label: "Deploy Model API",   workbench: "code_ide",     lang: "Python", icon: "🚀", skill: "mlops" },
    ],
    rubric: [
      { criterion: "Model Performance",   weight: 35, desc: "Metric targets met (AUC, F1, RMSE as specified)" },
      { criterion: "Methodology",         weight: 25, desc: "Correct train/val/test split, no data leakage" },
      { criterion: "Feature Engineering", weight: 20, desc: "Meaningful features, proper encoding, scaling" },
      { criterion: "Code Quality",        weight: 10, desc: "Clean Python, reproducible with seed, documented" },
      { criterion: "Interpretation",      weight: 10, desc: "Results explained, failure cases identified" },
    ],
    contextPanelSections: [
      { title: "ML Workflow",             icon: "🤖", content: "1. Define metric (what does 'good' look like?)\n2. EDA → clean → feature engineer\n3. Baseline: dummy classifier / mean predictor\n4. Model selection → cross-validate (StratifiedKFold)\n5. Hyperparameter search (Optuna / GridSearchCV)\n6. Final eval on held-out test set\n7. Error analysis → next iteration" },
      { title: "Evaluation Metrics",      icon: "✅", content: "Classification: Accuracy, Precision, Recall, F1, AUC-ROC\nImbalanced: F1-macro, PR-AUC, MCC\nRegression: MAE, RMSE, R², MAPE\nNLP: BLEU (translation), ROUGE (summarisation)\nRanking: NDCG, MAP\nAvoid: accuracy on imbalanced → misleading" },
      { title: "Common Pitfalls",         icon: "⚠️", content: "Data leakage: scaling before split, future features\nOverfitting: val loss diverges from train loss\nClass imbalance: use class_weight, SMOTE, threshold tuning\nDimensionality curse: feature selection before fitting\nMultiple comparisons: p-hacking — hold out a true test set" },
      { title: "Transformer Quick Ref",   icon: "💬", content: "Tokenisation → Embedding → Positional Encoding\nSelf-Attention: Q·K^T/√d_k → softmax → ×V\nBERT: encoder-only, masked LM pre-train\nGPT: decoder-only, causal LM\nFine-tune: freeze backbone, train head first\nRAG: retriever (FAISS) + generator (LLM) pipeline" },
    ],
  },

  // ── ANDROID DEVELOPMENT ───────────────────────────────────────────────────
  android: {
    key: "android",
    label: "Android Developer",
    icon: "📱",
    color: "#22C55E",
    colorBg: "#F0FDF4",
    colorBorder: "rgba(34,197,94,0.20)",
    ownership: "Android UI, Architecture, Networking & Play Store",
    description: "Build production-quality Android apps with Kotlin, Jetpack Compose, and MVVM architecture",
    tracks: ["Kotlin / Jetpack Compose","MVVM / Clean Architecture","Networking & APIs","Room / DataStore","Play Store & CI-CD"],
    modules: [
      { id: "kotlin_editor",  label: "Kotlin Editor",       icon: "📱", desc: "Write and test Kotlin code snippets",         sandbox: "code"     },
      { id: "compose_ui",     label: "Compose UI",          icon: "🎨", desc: "Build Jetpack Compose UI components",         sandbox: "code"     },
      { id: "arch_planner",   label: "Architecture Planner",icon: "🏗️", desc: "Design MVVM layers and component diagram",    sandbox: "markdown" },
      { id: "api_tester",     label: "API Tester",          icon: "🔌", desc: "Retrofit calls, JSON parsing, coroutines",    sandbox: "code"     },
      { id: "db_explorer",    label: "Room DB Explorer",    icon: "🗃️", desc: "Define entities, DAOs, and migrations",       sandbox: "code"     },
    ],
    defaultModule: "kotlin_editor",
    defaultSandbox: "code",
    deliverables: ["Kotlin Modules","Compose Screens","MVVM Architecture Designs","Room Database Schemas"],
    skills: [
      "Kotlin","Jetpack Compose","MVVM Architecture","ViewModel & LiveData","Coroutines & Flow",
      "Retrofit / OkHttp","Room Database","DataStore","Hilt (DI)","Navigation Component",
      "Work Manager","Play Store Deployment",
    ],
    missionCategories: [
      { id: "compose_build",   label: "Build Compose UI",    workbench: "code_ide",             lang: "Kotlin",   icon: "🎨", skill: "compose_ui" },
      { id: "viewmodel",       label: "ViewModel / Flow",    workbench: "code_ide",             lang: "Kotlin",   icon: "🏗️", skill: "android_arch" },
      { id: "retrofit_api",    label: "Retrofit API",        workbench: "code_ide",             lang: "Kotlin",   icon: "🔌", skill: "api_design" },
      { id: "room_db",         label: "Room Database",       workbench: "code_ide",             lang: "Kotlin",   icon: "🗃️", skill: "database_design" },
      { id: "arch_design",     label: "Architecture Design", workbench: "documentation_studio", lang: "Markdown", icon: "📐", skill: "android_arch" },
    ],
    rubric: [
      { criterion: "Functionality",       weight: 35, desc: "Feature works correctly on target API levels" },
      { criterion: "Architecture",        weight: 25, desc: "Proper MVVM separation, DI, single source of truth" },
      { criterion: "Compose Quality",     weight: 20, desc: "Composables reusable, state hoisted, no side-effects" },
      { criterion: "Performance",         weight: 10, desc: "No ANRs, minimal recompositions, async on IO dispatcher" },
      { criterion: "Code Quality",        weight: 10, desc: "Idiomatic Kotlin, coroutines used correctly" },
    ],
    contextPanelSections: [
      { title: "Kotlin Essentials",       icon: "📱", content: "Data class: auto equals/hashCode/toString/copy\nSealed class: exhaustive when expressions\nCoroutines: launch (fire-forget) | async/await (result)\nFlow: cold stream | StateFlow (hot, UI state)\nExtension funs: fun String.clean() = this.trim().lowercase()" },
      { title: "Jetpack Compose",         icon: "🎨", content: "@State: private view-local value\n@ObservedObject / @StateObject: external ViewModel\n@EnvironmentObject: dependency injection down tree\n@Binding: two-way ref to parent state\nviewModifier: reusable styling extension" },
      { title: "MVVM Clean Arch",         icon: "🏗️", content: "UI Layer: Composable → ViewModel (StateFlow)\nDomain Layer: UseCase → Repository interface\nData Layer: Repository impl → Remote (Retrofit) + Local (Room)\nDI: Hilt @HiltViewModel, @Inject constructor\nRule: no Android imports in domain/data layers" },
      { title: "Coroutines & Flow",       icon: "⚡", content: "Dispatchers: Main (UI), IO (network/disk), Default (CPU)\nviewModelScope.launch { } → auto-cancelled on clear\nstateIn(scope, Eagerly, initial) → cold Flow → StateFlow\ncombine(): merge multiple Flows\ncatch: .catch { emit(Result.Error(it)) }" },
    ],
  },

  // ── iOS DEVELOPMENT ───────────────────────────────────────────────────────
  ios: {
    key: "ios",
    label: "iOS Developer",
    icon: "🍎",
    color: "#3B82F6",
    colorBg: "#EFF6FF",
    colorBorder: "rgba(59,130,246,0.20)",
    ownership: "SwiftUI, UIKit, Swift Concurrency & App Store",
    description: "Build polished iOS apps with Swift, SwiftUI, and Apple platform frameworks",
    tracks: ["Swift / SwiftUI","UIKit","Combine & Swift Concurrency","Core Data / SwiftData","App Store & CI-CD"],
    modules: [
      { id: "swift_editor",   label: "Swift Editor",        icon: "🍎", desc: "Write and test Swift code snippets",          sandbox: "code"     },
      { id: "swiftui_canvas", label: "SwiftUI Canvas",      icon: "🎨", desc: "Build and preview SwiftUI views",             sandbox: "code"     },
      { id: "arch_planner",   label: "Architecture Planner",icon: "🏗️", desc: "Design MVVM/TCA layers and flows",            sandbox: "markdown" },
      { id: "network_lab",    label: "Network Lab",         icon: "🔌", desc: "URLSession, async/await, Codable models",     sandbox: "code"     },
      { id: "core_data",      label: "Core Data / SwiftData",icon:"🗃️", desc: "Entity model, fetch, migration",              sandbox: "code"     },
    ],
    defaultModule: "swift_editor",
    defaultSandbox: "code",
    deliverables: ["Swift Modules","SwiftUI Views","Architecture Designs","Core Data Schemas"],
    skills: [
      "Swift","SwiftUI","UIKit","MVVM / TCA Architecture","Combine / async-await","URLSession / Codable",
      "Core Data / SwiftData","Xcode & Instruments","TestFlight / App Store","Push Notifications",
      "WidgetKit","Swift Package Manager",
    ],
    missionCategories: [
      { id: "swiftui_build",  label: "SwiftUI View",                workbench: "code_ide",             lang: "Swift",    icon: "🎨", skill: "swiftui" },
      { id: "viewmodel",      label: "ViewModel / ObservableObject",workbench: "code_ide",             lang: "Swift",    icon: "🏗️", skill: "ios_arch" },
      { id: "network_call",   label: "Network Call",                workbench: "code_ide",             lang: "Swift",    icon: "🔌", skill: "api_design" },
      { id: "coredata_model", label: "Core Data Schema",            workbench: "code_ide",             lang: "Swift",    icon: "🗃️", skill: "database_design" },
      { id: "arch_design",    label: "Architecture Design",         workbench: "documentation_studio", lang: "Markdown", icon: "📐", skill: "ios_arch" },
    ],
    rubric: [
      { criterion: "Functionality",       weight: 35, desc: "Feature works correctly on target iOS version" },
      { criterion: "Architecture",        weight: 25, desc: "Clean MVVM/TCA separation, no business logic in View" },
      { criterion: "SwiftUI Quality",     weight: 20, desc: "Declarative, reusable views, @State/@Binding correct" },
      { criterion: "Concurrency Safety",  weight: 10, desc: "No data races, Main actor used for UI updates" },
      { criterion: "Code Quality",        weight: 10, desc: "Idiomatic Swift, protocol-oriented, extensions used" },
    ],
    contextPanelSections: [
      { title: "Swift Essentials",        icon: "🍎", content: "Optionals: guard let / if let / ?? / !  (avoid force-unwrap)\nProtocols: define behaviour, default impl via extension\nClosures: [weak self] in async closures to avoid cycles\nEnum with assoc values: Result<T, Error>\nActor: protects mutable state from concurrent access" },
      { title: "SwiftUI Patterns",        icon: "🎨", content: "@State: private view-local value\n@ObservedObject / @StateObject: external ViewModel\n@EnvironmentObject: dependency injection down tree\n@Binding: two-way ref to parent state\nviewModifier: reusable styling extension\nPreference key: child → parent communication" },
      { title: "Swift Concurrency",       icon: "⚡", content: "async/await: no completion handlers needed\nTask { }: unstructured concurrency (cancel manually)\nasync let: parallel child tasks, await together\n@MainActor: guarantee UI updates on main thread\nActor: data race-free class (serialised access)\nNever use DispatchQueue.main in async context" },
      { title: "URLSession Codable",      icon: "🔌", content: "struct: Codable (Encodable + Decodable)\nCodingKeys enum: map JSON key → Swift property name\nJSONDecoder().dateDecodingStrategy = .iso8601\nURLSession.shared.data(from: url) → async throws\nError: DecodingError, URLError, custom AppError\nCache: URLCache + URLRequest.CachePolicy" },
    ],
  },

  // ── PHARMACY / CLINICAL ───────────────────────────────────────────────────
  pharmacy: {
    key: "pharmacy",
    label: "Pharmacist / Pharmacy Specialist",
    icon: "💊",
    color: "#EC4899",
    colorBg: "#FDF2F8",
    colorBorder: "rgba(236,72,153,0.20)",
    ownership: "Clinical Pharmacy, Drug Formulation & Pharmacovigilance",
    description: "Apply clinical pharmacology knowledge to drug therapy, patient counselling, and regulatory compliance",
    tracks: ["Clinical Pharmacy","Drug Formulation","Pharmacovigilance","Regulatory Affairs","Hospital Pharmacy"],
    modules: [
      { id: "drug_calc",        label: "Drug Calculator",     icon: "🧮", desc: "Dosage, creatinine clearance, IV drip calcs",  sandbox: "notebook" },
      { id: "clinical_case",    label: "Clinical Case",       icon: "🏥", desc: "Patient scenario: DRP identification & plan",   sandbox: "markdown" },
      { id: "formulation",      label: "Formulation Design",  icon: "⚗️", desc: "Tablet / suspension formulation excipients",   sandbox: "markdown" },
      { id: "regulatory_doc",   label: "Regulatory Dossier",  icon: "📋", desc: "CTD, WHO/CDSCO submission document drafting",  sandbox: "markdown" },
      { id: "pharmacovigilance",label: "Pharmacovigilance",   icon: "⚠️", desc: "ADR reporting, signal detection, causality",   sandbox: "markdown" },
    ],
    defaultModule: "clinical_case",
    defaultSandbox: "markdown",
    deliverables: ["Clinical Therapy Plans","Drug Interaction Reports","Formulation Specs","Regulatory Documents"],
    skills: [
      "Clinical Pharmacokinetics","Drug Interaction Analysis","Pharmacovigilance (ADR Reporting)",
      "Dosage Adjustment (Renal/Hepatic)","Drug Formulation (Solid/Liquid)","CTD Regulatory Dossier",
      "Patient Counselling","Hospital Pharmacy Operations","Compounding","WHO Essential Medicines",
      "CDSCO / FDA Regulations","Evidence-Based Pharmacy Practice",
    ],
    missionCategories: [
      { id: "clinical_case",     label: "Clinical Case",      workbench: "clinical_lab",           lang: "Markdown", icon: "🏥", skill: "pharmacology" },
      { id: "drug_calc",         label: "Drug Calculation",   workbench: "engineering_calculator", lang: "Python",   icon: "🧮", skill: "drug_calculations" },
      { id: "interaction_check", label: "Interaction Check",  workbench: "clinical_lab",           lang: "Markdown", icon: "⚠️", skill: "pharmacology" },
      { id: "formulation_task",  label: "Formulation",        workbench: "clinical_lab",           lang: "Markdown", icon: "⚗️", skill: "pharmacovigilance" },
      { id: "regulatory_task",   label: "Regulatory Doc",     workbench: "documentation_studio",   lang: "Markdown", icon: "📋", skill: "regulatory_affairs" },
    ],
    rubric: [
      { criterion: "Clinical Accuracy",     weight: 35, desc: "Drug therapy plan is clinically appropriate and evidence-based" },
      { criterion: "Patient Safety",        weight: 30, desc: "Drug interactions, contraindications, and ADRs identified" },
      { criterion: "Regulatory Compliance", weight: 15, desc: "Correct standards applied (WHO/CDSCO/FDA)" },
      { criterion: "Communication",         weight: 10, desc: "Plan is clear, structured, and patient-appropriate" },
      { criterion: "Calculation Accuracy",  weight: 10, desc: "Dose calculations and PK parameters correct" },
    ],
    contextPanelSections: [
      { title: "Dosage Adjustment",       icon: "🧮", content: "CrCl (Cockcroft-Gault): (140-age)×weight / (72×SCr) ×0.85♀\nRenal: reduce dose or extend interval (GFR guided)\nHepatic: Child-Pugh score → use with caution if C class\nPediatric: mg/kg; BSA = √(H×W/3600) for chemo\nIV drip: rate(mL/hr) = (dose×weight×60) / (conc_mg/mL)" },
      { title: "Drug Interaction Classes", icon: "⚠️", content: "PK: absorption (antacids ↓ azithromycin), distribution,\n    metabolism (CYP3A4: statins + ketoconazole → toxicity),\n    excretion (probenecid + penicillin ↑ levels)\nPD: additive (two CNS depressants), antagonism,\n    synergy (co-trimoxazole: TMP + SMX)\nHigh-risk: warfarin, lithium, digoxin, MTX, aminoglycosides" },
      { title: "PK Parameters",           icon: "📈", content: "t½ = 0.693 / Ke\nVd = Dose / Co\nCL = Ke × Vd\nAUC = Dose / CL (IV)\nCmax, Cmin, tmax from profile\nFirst-order: linear elimination\nZero-order: saturable (phenytoin, alcohol)\nBioavailability F: oral AUC / IV AUC × 100%" },
      { title: "CTD Structure (ICH M4)",  icon: "📋", content: "Module 1: Regional admin & prescribing info\nModule 2: Summaries (QOS, COS, NCS, CPS)\nModule 3: Quality (Chemistry, Mfg, Controls)\nModule 4: Non-clinical (Pharm, Tox, Pk study reports)\nModule 5: Clinical (PK, PD, Efficacy, Safety reports)\nDossier format: eCTD XML backbone preferred" },
    ],
  },

  // ── MBA / BUSINESS ────────────────────────────────────────────────────────
  mba: {
    key: "mba",
    label: "MBA / Business Manager",
    icon: "💼",
    color: "#1D4ED8",
    colorBg: "#EFF6FF",
    colorBorder: "rgba(29,78,216,0.20)",
    ownership: "Business Strategy, Operations, Finance & Marketing",
    description: "Solve business problems through strategy frameworks, financial modelling, and data-driven decisions",
    tracks: ["Business Strategy","Financial Analysis","Operations Management","Marketing","HR Management"],
    modules: [
      { id: "case_study",       label: "Case Study",          icon: "📋", desc: "Structured problem-solving with frameworks",  sandbox: "markdown" },
      { id: "financial_model",  label: "Financial Model",     icon: "📊", desc: "P&L, DCF, unit economics, break-even",        sandbox: "notebook" },
      { id: "strategy_canvas",  label: "Strategy Canvas",     icon: "🗺️", desc: "SWOT, Porter's Five Forces, Blue Ocean",      sandbox: "markdown" },
      { id: "ops_design",       label: "Operations Design",   icon: "⚙️", desc: "Process maps, capacity, supply chain",         sandbox: "markdown" },
      { id: "market_analysis",  label: "Market Analysis",     icon: "📈", desc: "TAM/SAM/SOM, competitive landscape, pricing", sandbox: "notebook" },
    ],
    defaultModule: "case_study",
    defaultSandbox: "markdown",
    deliverables: ["Business Case Reports","Financial Models","Strategy Presentations","Operations Plans"],
    skills: [
      "Business Strategy (Porter/BCG/SWOT)","Financial Modelling (DCF/LBO)","P&L Management",
      "Operations Management","Supply Chain","Marketing Strategy","HR & Organisational Design",
      "Data-Driven Decision Making","Excel / SQL for Business","Stakeholder Communication",
      "Project Management","Change Management",
    ],
    missionCategories: [
      { id: "case_analysis",    label: "Case Analysis",      workbench: "business_studio",        lang: "Markdown", icon: "📋", skill: "business_strategy" },
      { id: "financial_model",  label: "Financial Model",    workbench: "engineering_calculator", lang: "Python",   icon: "📊", skill: "financial_modelling" },
      { id: "strategy_problem", label: "Strategy Problem",   workbench: "business_studio",        lang: "Markdown", icon: "🗺️", skill: "business_strategy" },
      { id: "ops_problem",      label: "Operations Problem", workbench: "business_studio",        lang: "Markdown", icon: "⚙️", skill: "operations_mgmt" },
      { id: "market_sizing",    label: "Market Sizing",      workbench: "engineering_calculator", lang: "Python",   icon: "📈", skill: "marketing" },
    ],
    rubric: [
      { criterion: "Problem Structuring",  weight: 30, desc: "Issue tree / MECE breakdown, correct framework applied" },
      { criterion: "Financial Accuracy",   weight: 25, desc: "Numbers consistent, assumptions explicit, model buildable" },
      { criterion: "Strategic Insight",    weight: 25, desc: "Recommendations are novel, specific, and actionable" },
      { criterion: "Communication",        weight: 10, desc: "Pyramid principle, exec summary first, visual-ready" },
      { criterion: "Data Use",             weight: 10, desc: "Evidence cited, benchmarks used, analysis not assertion" },
    ],
    contextPanelSections: [
      { title: "Core Frameworks",         icon: "🗺️", content: "SWOT: Strengths, Weaknesses, Opportunities, Threats\nPorter 5 Forces: rivalry, entrants, substitutes, buyers, suppliers\nBCG Matrix: Stars, Cash Cows, Dogs, Question Marks\nAnsoff: Market Penetration | Dev | Product Dev | Diversification\nValue Chain: primary (ops/mktg/service) + support (HR/IT/infra)\nBlue Ocean: eliminate-reduce-raise-create (value innovation)" },
      { title: "Financial Essentials",    icon: "📊", content: "DCF: NPV = Σ CF/(1+r)^t − Initial Inv\nIRR: discount rate where NPV = 0\nROI = (Gain − Cost) / Cost × 100%\nUnit Economics: LTV / CAC > 3 (SaaS)\nBreak-even: Fixed Costs / (Price − Variable Cost)\nGross margin = (Revenue − COGS) / Revenue × 100%" },
      { title: "Case Interview Approach", icon: "📋", content: "1. Clarify: scope, metric, timeframe\n2. Structure: MECE issue tree (2-3 branches)\n3. Prioritise: biggest impact or most unknown first\n4. Analyse: math + qualitative insight\n5. Synthesise: so what? → recommendation\n6. Sanity check: back of envelope validation\n\nCommon: profitability, market entry, M&A, GTM" },
      { title: "Operations Metrics",      icon: "⚙️", content: "OEE = Availability × Performance × Quality\nInventory Turnover = COGS / Avg Inventory\nCycle Time = (End Date − Start Date) / Units\nLittle's Law: L = λ × W (queue theory)\nCapacity Utilisation = Actual Output / Design Cap\nNPS = % Promoters − % Detractors (target > 50)" },
    ],
  },

}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a domain config object by key (safe — returns null if not found)
 */
export const getDomainConfig = (key) => ARENA_DOMAINS[key] || null

/**
 * All domain keys in display order
 */
export const DOMAIN_ORDER = [
  // Engineering
  "frontend", "backend", "fullstack", "swe",
  // Data
  "data", "bi_analyst", "data_engineer", "dba",
  // Platform & Cloud
  "devops", "aws", "azure", "sre",
  // Security
  "cyber", "soc",
  // Quality & Business
  "qa", "ba_product",
  // Specialised (legacy)
  "medical", "ece",
  // Engineering streams
  "embedded", "vlsi", "analog_ic", "eee", "mechanical", "civil",
  // New tech & specialty
  "ml", "android", "ios", "pharmacy", "mba",
]

/**
 * Resolve a user's domain from their keyword / job title string.
 * Returns a domain key from ARENA_DOMAINS.
 *
 * FIXED 2026-07-27: this used to be its own hand-rolled substring matcher
 * (14 branches) that silently fell through to "swe" for anything it didn't
 * recognize — including "ML / AI Engineer", "Android Developer", "iOS
 * Developer", "Pharmacy", and "MBA", despite ARENA_DOMAINS already having
 * "ml"/"android"/"ios"/"pharmacy"/"mba" domain configs (see DOMAIN_ORDER
 * above) that were simply unreachable from here. Root-caused from a user
 * report: Aura's dashboard header showed "ML / AI Engineer" (reads
 * userData.keyword directly) while the Arena page showed "Software
 * Engineer" for the exact same account (ran the same keyword through this
 * matcher, which had no ML/AI branch, and defaulted to "swe").
 *
 * Same bug shape as the assessment.js skill-taxonomy split fixed earlier
 * this session — a second, independently-maintained keyword resolver
 * drifting from the canonical one. Fixed the same way: delegate to
 * getRoleConfig() (roleConfig.js), which already has a curated
 * `arenaKey` field per role (44 roles, longest-keyword-first matching,
 * career_track_slug + branch fallbacks) and is the single source of truth
 * used everywhere else (Aura workbench name, onboarding assessment,
 * skill-radar taxonomy). This makes Arena and Aura structurally unable to
 * diverge again — they resolve the same field through the same function.
 */
export const resolveArenaDomain = (userData) => {
  const role = getRoleConfig(userData)
  const key = role?.arenaKey
  return (key && ARENA_DOMAINS[key]) ? key : "swe"
}

/**
 * Get the default sandbox type for a domain.
 */
export const getDomainDefaultSandbox = (domainKey) => {
  return ARENA_DOMAINS[domainKey]?.defaultSandbox || "code"
}

/**
 * Get workstation module tabs for a domain.
 */
export const getDomainModules = (domainKey) => {
  return ARENA_DOMAINS[domainKey]?.modules || []
}

/**
 * Resolve sandbox type from (task, domainKey) — domain is the primary signal.
 */
export const resolveSandboxType = (task, domainKey) => {
  // Mission-first: if the task declares a workbench, resolve through the registry.
  // This is the preferred path for all new missions.
  if (task?.workbench) {
    const wb = WORKBENCH_REGISTRY[task.workbench]
    if (wb) return wb.renderer
  }
  // Legacy: task declares sandbox directly (old missions and modules)
  if (task?.sandbox && task.sandbox !== "code" && task.sandbox !== "notebook") {
    return task.sandbox
  }

  const cat = ((task?.category || task?.id || task?.type || "")).toLowerCase().replace(/[\s_]/g, "")

  switch (domainKey) {
    case "dba": {
      if (cat.includes("backup") || cat.includes("recovery") || cat.includes("replication")) return "terminal"
      return "sql"
    }
    case "data": {
      if (cat.includes("clean") || cat.includes("eda") || cat.includes("dashboard") || cat.includes("notebook") || task?.lang === "Python") return "notebook"
      return "sql"
    }
    case "frontend":      return "react"
    case "backend":       return "code"
    case "fullstack":     return "code"
    case "swe":
      // System-design / architecture SWE tasks use the design workspace, not the IDE.
      if (cat.includes("systemdesign") || cat.includes("architecture") || cat.includes("design")) return "system_design"
      return "code"
    case "bi_analyst":    return cat.includes("sql") || cat.includes("query") ? "sql" : "dashboard"
    case "data_engineer": return cat.includes("sql") || cat.includes("transform") ? "sql" : "notebook"
    case "sre": {
      // SLO/runbook writing → markdown; incident/k8s ops → sre_console
      if (cat.includes("slo") || cat.includes("runbook") || cat.includes("postmortem")) return "markdown"
      return "sre_console"
    }
    case "soc": {
      // Writing reports → report; triage/investigate → soc_console
      if (cat.includes("report") || cat.includes("write")) return "report"
      return "soc_console"
    }
    case "qa": {
      // API testing → api; bug report writing → markdown; all others → qa_lab
      if (cat.includes("api")) return "api"
      if (cat.includes("bug") || cat.includes("report")) return "markdown"
      return "qa_lab"
    }
    case "ba_product": {
      // Metrics / SQL analysis → sql; requirements, process, docs → business_analysis
      if (cat.includes("sql") || cat.includes("metric") || cat.includes("analys")) return "sql"
      return "business_analysis"
    }
    case "devops": {
      // FIX: DevOps work is mostly YAML/HCL manifest AUTHORING (CI/CD, K8s, Terraform)
      // → "code" editor (buildSkeleton routes to the YAML scaffold). Only shell-oriented
      // tasks (scripts, debugging, log inspection) use the terminal. Was blanket "terminal".
      if (cat.includes("script") || cat.includes("bash") || cat.includes("shell") ||
          cat.includes("debug")  || cat.includes("log")  || cat.includes("terminal")) return "terminal"
      return "code"
    }
    case "aws": {
      // Lambda/IaC/IAM code tasks → code; cost review → markdown; arch/design → system_design
      if (cat.includes("lambda") || cat.includes("serverless") || cat.includes("iac") || cat.includes("iam")) return "code"
      if (cat.includes("cost")) return "markdown"
      return "system_design"
    }
    case "azure": {
      // Bicep/KQL/RBAC/IaC code tasks → code; cost review → markdown; arch/design → system_design
      if (cat.includes("kql") || cat.includes("bicep") || cat.includes("iac") || cat.includes("rbac")) return "code"
      if (cat.includes("cost")) return "markdown"
      return "system_design"
    }
    case "cyber": {
      // Incident/vuln reports → markdown; all threat/pentest/triage ops → security_console
      if (cat.includes("incident") || cat.includes("vuln_report") || cat.includes("report")) return "markdown"
      return "security_console"
    }
    case "medical":       return "medical_coding"
    case "ece":           return "code"
    case "embedded":      return "code"
    case "vlsi":          return "code"
    case "analog_ic":     return "notebook"
    case "eee":           return "notebook"
    case "mechanical":    return "notebook"
    case "civil":         return "notebook"
    case "ml":            return "notebook"
    case "android":       return "code"
    case "ios":           return "code"
    case "pharmacy":      return "markdown"
    case "mba":           return "markdown"
    default:              return "code"
  }
}
