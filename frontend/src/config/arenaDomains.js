/**
 * arenaDomains.js — Capabilio Arena Domain Registry
 *
 * 12 professional domains. Every workstation is generated from this config.
 * Add a domain here → it appears everywhere: landing, workstation, missions, leaderboard.
 */

// ─────────────────────────────────────────────────────────────────────────────
// SANDBOX TYPES
// ─────────────────────────────────────────────────────────────────────────────
// "sql"       → SQL editor + result grid
// "notebook"  → Python notebook (pandas/matplotlib)
// "terminal"  → bash terminal
// "react"     → live React/HTML preview
// "code"      → general code editor (language-aware)
// "markdown"  → rich markdown editor
// "diagram"   → system design canvas

// ─────────────────────────────────────────────────────────────────────────────
// 12-DOMAIN REGISTRY
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
      { id: "rtl_design",  label: "RTL Design",          sandbox: "code",     lang: "Verilog",  icon: "💾" },
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
      { id: "pipeline",    label: "Pipeline Center",      icon: "⚙️", desc: "CI/CD YAML authoring and visualiser",     sandbox: "terminal" },
      { id: "infra",       label: "Infrastructure Explorer",icon:"🏗️", desc: "Terraform / CDK IaC workbench",          sandbox: "terminal" },
      { id: "k8s",         label: "Kubernetes Dashboard", icon: "☸️", desc: "kubectl, manifests, Helm charts",         sandbox: "terminal" },
      { id: "monitoring",  label: "Monitoring Center",    icon: "📡", desc: "Prometheus, Grafana, alerting rules",      sandbox: "terminal" },
      { id: "alerts",      label: "Alert Manager",        icon: "🚨", desc: "SLO/SLA config, alert routing, runbooks",  sandbox: "markdown" },
      { id: "cost",        label: "Cost Analytics",       icon: "💰", desc: "Cloud spend, rightsizing, waste reports",  sandbox: "markdown" },
    ],

    defaultModule: "pipeline",
    defaultSandbox: "terminal",

    deliverables: ["CI/CD Pipelines", "IaC Modules", "K8s Manifests", "Runbooks", "SLO Dashboards"],

    skills: [
      "Docker", "Kubernetes", "CI/CD (GitHub Actions / GitLab CI)", "Terraform",
      "Ansible", "AWS / GCP / Azure", "Prometheus / Grafana", "Helm",
      "Bash / Python scripting", "SRE practices", "Incident Management",
      "GitOps (ArgoCD / Flux)", "FinOps",
    ],

    missionCategories: [
      { id: "pipeline",    label: "Pipeline Build",       sandbox: "terminal", lang: "YAML",     icon: "⚙️" },
      { id: "iac",         label: "IaC Module",           sandbox: "terminal", lang: "HCL",      icon: "🏗️" },
      { id: "k8s",         label: "K8s Manifest",         sandbox: "terminal", lang: "YAML",     icon: "☸️" },
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
      { id: "arch_design",  label: "Architecture Design",  sandbox: "diagram",  lang: "Markdown", icon: "🏗️" },
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
      { id: "arch_design",  label: "Architecture Design",  sandbox: "diagram",  lang: "Markdown", icon: "🏗️" },
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
]

/**
 * Resolve a user's domain from their keyword / job title string.
 * Returns a domain key from ARENA_DOMAINS.
 */
export const resolveArenaDomain = (userData) => {
  const kw = (
    userData?.keyword ||
    userData?.jobTitle ||
    userData?.role ||
    userData?.authority ||
    ""
  ).toLowerCase()

  if (kw.includes("dba") || kw.includes("database admin"))                             return "dba"
  if (kw.includes("bi analyst") || kw.includes("business intel") || kw.includes("tableau") || kw.includes("power bi")) return "bi_analyst"
  if (kw.includes("data engineer") || kw.includes("data eng") || kw.includes("etl") || kw.includes("spark") || kw.includes("airflow")) return "data_engineer"
  if (kw.includes("data anal") || kw.includes("analytics"))                          return "data"
  if (kw.includes("sre") || kw.includes("site reliability") || kw.includes("platform eng")) return "sre"
  if (kw.includes("soc analyst") || kw.includes("incident response") || kw.includes("soc eng")) return "soc"
  if (kw.includes("qa") || kw.includes("test automation") || kw.includes("quality assurance") || kw.includes("playwright")) return "qa"
  if (kw.includes("business analyst") || kw.includes("product analyst") || kw.includes("ba ") || kw.includes("bpo")) return "ba_product"
  if (kw.includes("frontend") || kw.includes("front end") || kw.includes("react dev")) return "frontend"
  if (kw.includes("backend") || kw.includes("back end") || kw.includes("api dev"))   return "backend"
  if (kw.includes("full stack") || kw.includes("fullstack"))                          return "fullstack"
  if (kw.includes("devops"))                                                           return "devops"
  if (kw.includes("aws") || kw.includes("amazon web"))                               return "aws"
  if (kw.includes("azure") || kw.includes("microsoft cloud"))                        return "azure"
  if (kw.includes("cyber") || kw.includes("security") || kw.includes("pentest"))    return "cyber"
  if (kw.includes("medical") || kw.includes("icd") || kw.includes("cpt"))           return "medical"
  if (kw.includes("ece") || kw.includes("embedded") || kw.includes("vlsi") || kw.includes("fpga")) return "ece"
  return "swe"
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
    case "swe":           return "code"
    case "bi_analyst":    return cat.includes("sql") || cat.includes("query") ? "sql" : "dashboard"
    case "data_engineer": return cat.includes("sql") || cat.includes("transform") ? "sql" : "notebook"
    case "sre":           return "terminal"
    case "soc":           return "terminal"
    case "qa":            return cat.includes("api") ? "api" : "code"
    case "ba_product":    return cat.includes("sql") || cat.includes("metric") ? "sql" : "markdown"
    case "devops":        return "terminal"
    case "aws":           return cat.includes("lambda") || cat.includes("serverless") ? "code" : "terminal"
    case "azure":         return cat.includes("kql") ? "code" : "terminal"
    case "cyber":         return "terminal"
    case "medical":       return "markdown"
    case "ece":           return "code"
    default:              return "code"
  }
}
