/**
 * ArenaCatalog.jsx — Challenge Browser
 *
 * Data strategy (no Express backend required):
 *   1. Try Supabase challenges table directly (works after migration)
 *   2. Fall back to INLINE_CHALLENGES (works immediately, even without migration)
 *   3. All filtering is 100% client-side — no round-trips for filter changes
 *
 * This means the catalog works regardless of whether the backend server is running.
 */
import { useState, useEffect, useMemo, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { useCareerTrack } from "../hooks/useCareerTrack"

// 2026-08-10 fix: this used to be a separate hardcoded client pointed at
// project cbrjdfllxfmmvalijpej with a raw anon key in source -- a stale
// reference, not this app's real database (that's eybchcqwbizjmzyrviri,
// same as every other Supabase call in this app). See the identical fix +
// full writeup in ArenaCommonChallenges.jsx.
const problemsDb = supabase

// Same backend base URL ArenaCommonChallenges.jsx uses for its arena API
// calls — needed here now too so hydrateFullProblem() can reach the
// server-side problem-detail route (see below).
const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  cream:  "#F6F6F1", cream2: "#EFEFE9", cream3: "#E8E8E1",
  ink:    "#1A1A18", ink2:   "#3A3A38", ink3:   "#6B6B68", ink4:   "#9A9A97",
  indigo: "#3D4EAC", indigo2:"#5B6FD4", indigo3:"#EEF0FB",
  green:  "#1A7A4A", green2: "#E8F7EF",
  amber:  "#B8620A", amber2: "#FEF3E2",
  red:    "#C0392B", red2:   "#FDF0EF",
  border: "rgba(26,26,24,0.09)",
}

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  dsa:           { label: "DSA",           icon: "🧩", color: "#7C3AED" },
  sql:           { label: "SQL",           icon: "🗃️", color: "#0369A1" },
  frontend:      { label: "Frontend",      icon: "🖥️", color: "#D97706" },
  backend:       { label: "Backend",       icon: "⚙️", color: "#059669" },
  fullstack:     { label: "Full-Stack",    icon: "🔗", color: T.indigo  },
  debugging:     { label: "Debugging",     icon: "🐛", color: "#DC2626" },
  system_design: { label: "System Design", icon: "🏗️", color: "#6D28D9" },
  data_analyst:  { label: "Data Analyst",  icon: "📊", color: "#0F766E" },
  case_study:    { label: "Case Study",    icon: "📋", color: "#92400E" },
  devops:        { label: "DevOps",        icon: "🚀", color: "#0369A1" },
  cybersecurity: { label: "Security",      icon: "🔒", color: "#B91C1C" },
  finance:       { label: "Finance",       icon: "💹", color: "#065F46" },
  product:       { label: "Product",       icon: "📱", color: "#BE185D" },
  ops:           { label: "Operations",    icon: "⚡", color: "#92400E" },
  embedded:      { label: "Embedded",      icon: "🔌", color: "#0369A1" },
  vlsi:          { label: "VLSI",          icon: "🔬", color: "#7C3AED" },
  mechanical:    { label: "Mechanical",    icon: "🔩", color: "#92400E" },
  civil:         { label: "Civil",         icon: "🏗️", color: "#065F46" },
  eee:           { label: "Electrical",    icon: "⚡", color: "#D97706" },
}

const DIFF_CONFIG = {
  Easy:   { color: "#16A34A", bg: "#F0FDF4" },
  Medium: { color: "#D97706", bg: "#FFFBEB" },
  Hard:   { color: "#DC2626", bg: "#FEF2F2" },
  Expert: { color: "#7C3AED", bg: "#F5F3FF" },
}

const TECH_ICONS = {
  "Python":"🐍","TypeScript":"🔷","JavaScript":"🟨","React":"⚛️","PostgreSQL":"🐘",
  "SQL":"🗃️","Node.js":"🟢","Go":"🔵","Java":"☕","Docker":"🐳","Redis":"🔴",
  "AWS":"☁️","GitHub Actions":"⚙️","YAML":"📄","Bash":"💻","Pandas":"🐼",
  "NumPy":"🔢","Matplotlib":"📈","JWT":"🔑","GraphQL":"💜","Rust":"🦀","C++":"⚙️",
  "Figma":"🎨","Kubernetes":"☸️","Terraform":"🟣","Linux":"🐧","MongoDB":"🍃",
}

// ─── INLINE CHALLENGE SEED (works without migration, without backend) ─────────
const INLINE_CHALLENGES = [
  {
    id:"c-1", slug:"two-sum", title:"Two Sum",
    description:"Return indices of the two numbers in an array that add up to the target. Exactly one solution exists.",
    type:"dsa", domain:"swe", difficulty:"Easy", estimated_mins:25, elo_impact:15,
    technologies:["Python","Java","JavaScript","Go"],
    skills:["Hash Map","Array Traversal","Two Pointers"],
    sandbox_type:"code", language:"Python",
    company_name:"Capabilio", is_company_sponsored:false, is_recruiter_visible:true,
    proof_type:"code", participation_count:5821, solve_count:4102, tags:["arrays","hashmap"],
    status:"active",
  },
  {
    id:"c-2", slug:"longest-substring", title:"Longest Substring Without Repeating Characters",
    description:"Find the length of the longest substring without repeating characters using a sliding window.",
    type:"dsa", domain:"swe", difficulty:"Medium", estimated_mins:35, elo_impact:25,
    technologies:["Python","Java","JavaScript"],
    skills:["Sliding Window","Hash Set","String Manipulation"],
    sandbox_type:"code", language:"Python",
    company_name:"Capabilio", is_company_sponsored:false, is_recruiter_visible:true,
    proof_type:"code", participation_count:3210, solve_count:1876, tags:["strings","sliding-window"],
    status:"active",
  },
  {
    id:"c-3", slug:"customer-revenue-sql", title:"Customer Revenue Analysis",
    description:"Write SQL to find top 10 merchants by revenue for Q1 2026, broken down by payment method. Use CTEs and window functions.",
    type:"sql", domain:"dba", difficulty:"Medium", estimated_mins:30, elo_impact:22,
    technologies:["PostgreSQL","SQL","CTEs","Window Functions"],
    skills:["GROUP BY","JOIN","CTE","Aggregations"],
    sandbox_type:"sql", language:"SQL",
    company_name:"Razorpay", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:1247, solve_count:612, tags:["sql","analytics","fintech"],
    status:"active",
  },
  {
    id:"c-4", slug:"react-virtual-list", title:"Virtualized Scrolling List",
    description:"Build a React component that renders 10,000+ items without lag. No virtualization libraries — implement windowing yourself.",
    type:"frontend", domain:"frontend", difficulty:"Hard", estimated_mins:60, elo_impact:35,
    technologies:["React","TypeScript","DOM APIs","CSS"],
    skills:["Virtualization","Windowing","Performance","React Hooks"],
    sandbox_type:"react", language:"TypeScript",
    company_name:"CRED", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"live_demo", participation_count:387, solve_count:89, tags:["react","performance","hard"],
    status:"active",
  },
  {
    id:"c-5", slug:"rate-limiter", title:"Sliding Window Rate Limiter",
    description:"Implement a thread-safe sliding window rate limiter for an API gateway. Handle burst traffic and concurrent requests correctly.",
    type:"backend", domain:"backend", difficulty:"Hard", estimated_mins:50, elo_impact:32,
    technologies:["TypeScript","Node.js","Redis","Algorithms"],
    skills:["Sliding Window","Rate Limiting","Concurrency","Data Structures"],
    sandbox_type:"code", language:"TypeScript",
    company_name:"PhonePe", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:892, solve_count:201, tags:["backend","algorithms","hard"],
    status:"active",
  },
  {
    id:"c-6", slug:"flipkart-data-cleaning", title:"Clean Flipkart Order Dataset",
    description:"Clean a messy e-commerce CSV: null handling, outlier detection, city name standardisation, date format fixes. Produce a summary report.",
    type:"data_analyst", domain:"data", difficulty:"Medium", estimated_mins:40, elo_impact:20,
    technologies:["Python","Pandas","NumPy","Matplotlib"],
    skills:["Data Cleaning","EDA","Pandas","Statistical Analysis"],
    sandbox_type:"notebook", language:"Python",
    company_name:"Flipkart", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:2103, solve_count:1456, tags:["data-cleaning","pandas"],
    status:"active",
  },
  {
    id:"c-7", slug:"url-shortener-design", title:"Design a URL Shortener",
    description:"System design for 100M URLs and 1B redirects/day. Capacity estimates, API contract, data model, caching strategy, sharding.",
    type:"system_design", domain:"swe", difficulty:"Medium", estimated_mins:45, elo_impact:28,
    technologies:["System Design","PostgreSQL","Redis","CDN"],
    skills:["Capacity Estimation","API Design","Database Sharding","Caching"],
    sandbox_type:"diagram", language:"Markdown",
    company_name:"Capabilio", is_company_sponsored:false, is_recruiter_visible:true,
    proof_type:"report", participation_count:3201, solve_count:1987, tags:["system-design","distributed"],
    status:"active",
  },
  {
    id:"c-8", slug:"node-memory-leak", title:"Debug the Node.js Memory Leak",
    description:"A microservice crashes every 6 hours with OOM. Identify all memory leaks in the provided code, explain why they leak, and fix them.",
    type:"debugging", domain:"backend", difficulty:"Hard", estimated_mins:40, elo_impact:30,
    technologies:["Node.js","JavaScript","Memory Profiling"],
    skills:["Memory Leak Detection","Event Loop","Closures","WeakMap"],
    sandbox_type:"code", language:"JavaScript",
    company_name:"Swiggy", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:1028, solve_count:312, tags:["debugging","nodejs","memory"],
    status:"active",
  },
  {
    id:"c-9", slug:"security-log-analysis", title:"Investigate the Security Incident",
    description:"Analyse 3 days of Apache access logs from a compromised server. Find the attack vector, attacker IP, exfiltrated data, and write an incident report.",
    type:"cybersecurity", domain:"cyber", difficulty:"Medium", estimated_mins:35, elo_impact:22,
    technologies:["Linux","Bash","Python","Log Analysis"],
    skills:["Log Analysis","SQL Injection Detection","OWASP","Incident Response"],
    sandbox_type:"terminal", language:"Bash",
    company_name:"Zepto", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:718, solve_count:289, tags:["cybersecurity","logs"],
    status:"active",
  },
  {
    id:"c-10", slug:"github-actions-cicd", title:"Build a Production CI/CD Pipeline",
    description:"Write a complete GitHub Actions workflow: lint → test → Trivy security scan → Docker build → staging deploy → prod with manual approval gate.",
    type:"devops", domain:"devops", difficulty:"Medium", estimated_mins:45, elo_impact:25,
    technologies:["GitHub Actions","Docker","YAML","Shell","Node.js"],
    skills:["CI/CD","Docker","GitHub Actions","Security Scanning","Deployment"],
    sandbox_type:"code", language:"YAML",
    company_name:"Ola", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:1542, solve_count:743, tags:["devops","cicd"],
    status:"active",
  },
  {
    id:"c-11", slug:"dcf-model", title:"Build a DCF Valuation Model",
    description:"Python DCF model for an Indian IT company. Project 5-year free cash flow, compute WACC, terminal value, and intrinsic value per share.",
    type:"finance", domain:"data", difficulty:"Medium", estimated_mins:40, elo_impact:20,
    technologies:["Python","Pandas","NumPy"],
    skills:["DCF Valuation","WACC","Terminal Value","Financial Modeling"],
    sandbox_type:"notebook", language:"Python",
    company_name:"Zerodha", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:832, solve_count:441, tags:["finance","dcf","modeling"],
    status:"active",
  },
  {
    id:"c-12", slug:"prd-cart-abandonment", title:"Write a Product Requirements Document",
    description:"Write a complete PRD for a cart abandonment recovery system with push notifications, email, and WhatsApp nudges. Include metrics, user stories, and A/B test design.",
    type:"product", domain:"data", difficulty:"Medium", estimated_mins:45, elo_impact:18,
    technologies:["Product Management","PRD Writing","Analytics"],
    skills:["PRD Writing","Product Strategy","A/B Testing","Metrics Definition"],
    sandbox_type:"markdown", language:"Markdown",
    company_name:"Meesho", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:1203, solve_count:678, tags:["product","prd","strategy"],
    status:"active",
  },
  {
    id:"c-13", slug:"fullstack-auth", title:"Build a Secure Auth System",
    description:"Full authentication: email/password, Google OAuth, JWT access + refresh tokens (RS256), rate limiting on login (5 req/15 min), forgot-password email flow.",
    type:"fullstack", domain:"fullstack", difficulty:"Hard", estimated_mins:75, elo_impact:38,
    technologies:["Node.js","React","TypeScript","PostgreSQL","JWT","Redis"],
    skills:["Authentication","OAuth 2.0","JWT","Session Management","Security"],
    sandbox_type:"code", language:"TypeScript",
    company_name:"Groww", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:643, solve_count:127, tags:["fullstack","auth","security"],
    status:"active",
  },
  {
    id:"c-14", slug:"binary-search-tree", title:"Validate a Binary Search Tree",
    description:"Given the root of a binary tree, determine if it is a valid BST. All nodes in the left subtree must be less than the current, right subtree greater.",
    type:"dsa", domain:"swe", difficulty:"Medium", estimated_mins:30, elo_impact:22,
    technologies:["Python","Java","JavaScript","Go"],
    skills:["Binary Tree","DFS","Recursion","Tree Traversal"],
    sandbox_type:"code", language:"Python",
    company_name:"Capabilio", is_company_sponsored:false, is_recruiter_visible:true,
    proof_type:"code", participation_count:2891, solve_count:1654, tags:["trees","recursion","dsa"],
    status:"active",
  },
  {
    id:"c-15", slug:"sql-window-functions", title:"Advanced SQL Window Functions",
    description:"Write queries using ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, and running totals. Given order data, produce a cohort retention analysis.",
    type:"sql", domain:"dba", difficulty:"Hard", estimated_mins:45, elo_impact:30,
    technologies:["PostgreSQL","SQL","Window Functions"],
    skills:["Window Functions","Cohort Analysis","CTEs","Aggregations"],
    sandbox_type:"sql", language:"SQL",
    company_name:"Dunzo", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:987, solve_count:423, tags:["sql","window-functions","hard"],
    status:"active",
  },
  // ─── Engineering domain challenges (ECE / EEE / Mechanical / Civil) ──────────
  {
    id:"c-16", slug:"gpio-interrupt-handler", title:"GPIO Interrupt-Driven Button Debounce",
    description:"Implement a debounced GPIO interrupt handler in C. The button must register exactly one press per physical click even under 50 ms bounce noise. Validate with simulated edge sequences.",
    type:"embedded", domain:"embedded", difficulty:"Medium", estimated_mins:40, elo_impact:22,
    technologies:["C","RTOS","GPIO","Interrupt"],
    skills:["Interrupt Handling","Debounce","Bare-metal C","GPIO"],
    sandbox_type:"code", language:"C",
    company_name:"Texas Instruments", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:412, solve_count:198, tags:["embedded","gpio","c"],
    status:"active",
  },
  {
    id:"c-17", slug:"vlsi-ripple-carry-adder", title:"Design a 4-bit Ripple Carry Adder in Verilog",
    description:"Write synthesisable Verilog for a 4-bit ripple carry adder. Include a testbench that checks all 256 input combinations and validates the carry-out signal.",
    type:"vlsi", domain:"vlsi", difficulty:"Medium", estimated_mins:45, elo_impact:25,
    technologies:["Verilog","ModelSim","FPGA"],
    skills:["Verilog","Combinational Logic","Testbench","Synthesis"],
    sandbox_type:"code", language:"Verilog",
    company_name:"Intel", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"code", participation_count:321, solve_count:147, tags:["vlsi","verilog","digital-design"],
    status:"active",
  },
  {
    id:"c-18", slug:"beam-deflection-calculator", title:"Beam Deflection Under Distributed Load",
    description:"Write a Python program to calculate maximum deflection and bending moment for a simply supported beam under a uniformly distributed load. Use numerical integration and plot the bending moment diagram.",
    type:"mechanical", domain:"mechanical", difficulty:"Medium", estimated_mins:35, elo_impact:20,
    technologies:["Python","NumPy","Matplotlib"],
    skills:["Structural Mechanics","Numerical Methods","Bending Moment","Python"],
    sandbox_type:"notebook", language:"Python",
    company_name:"L&T", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:287, solve_count:134, tags:["mechanical","structural","python"],
    status:"active",
  },
  {
    id:"c-19", slug:"concrete-mix-design", title:"Concrete Mix Design for M25 Grade",
    description:"Given target compressive strength and exposure conditions, compute the water-cement ratio, cement content, and aggregate proportions for M25 concrete per IS 10262:2019. Output a structured mix design report.",
    type:"civil", domain:"civil", difficulty:"Medium", estimated_mins:40, elo_impact:20,
    technologies:["Python","IS Codes","Mix Design"],
    skills:["Mix Design","IS 10262","Water-Cement Ratio","Aggregate Proportioning"],
    sandbox_type:"notebook", language:"Python",
    company_name:"DLF", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:198, solve_count:87, tags:["civil","concrete","is-code"],
    status:"active",
  },
  {
    id:"c-20", slug:"power-flow-newton-raphson", title:"Power Flow Analysis — Newton-Raphson Method",
    description:"Implement Newton-Raphson power flow for a 4-bus system. Compute voltage magnitudes, angles, and real/reactive power at each bus. Compare against the flat-start solution.",
    type:"eee", domain:"eee", difficulty:"Hard", estimated_mins:50, elo_impact:30,
    technologies:["Python","NumPy","Power Systems"],
    skills:["Newton-Raphson","Power Flow","Bus Admittance Matrix","Load Flow"],
    sandbox_type:"notebook", language:"Python",
    company_name:"NTPC", is_company_sponsored:true, is_recruiter_visible:true,
    proof_type:"report", participation_count:156, solve_count:61, tags:["eee","power-systems","numerical"],
    status:"active",
  },
]

// ─── FILTER CONFIG ────────────────────────────────────────────────────────────
const TYPE_FILTERS = [
  { id: "",              label: "All Types" },
  { id: "dsa",           label: "DSA 🧩" },
  { id: "sql",           label: "SQL 🗃️" },
  { id: "frontend",      label: "Frontend 🖥️" },
  { id: "backend",       label: "Backend ⚙️" },
  { id: "fullstack",     label: "Full-Stack 🔗" },
  { id: "debugging",     label: "Debug 🐛" },
  { id: "system_design", label: "System Design 🏗️" },
  { id: "data_analyst",  label: "Data 📊" },
  { id: "devops",        label: "DevOps 🚀" },
  { id: "cybersecurity", label: "Security 🔒" },
  { id: "finance",       label: "Finance 💹" },
  { id: "product",       label: "Product 📱" },
  { id: "embedded",      label: "Embedded ⚙️" },
  { id: "vlsi",          label: "VLSI 🔬" },
  { id: "mechanical",    label: "Mechanical 🔩" },
  { id: "civil",         label: "Civil 🏗️" },
  { id: "eee",           label: "Electrical ⚡" },
]

const INITIAL_FILTERS = {
  type: "", difficulty: "", is_company_sponsored: false,
  is_recruiter_visible: false, search: "", sort: "popular",
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────

function Spinner({ color = T.indigo, size = 14 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block", flexShrink: 0 }} />
}

// ─── CHALLENGE CARD ───────────────────────────────────────────────────────────

function ChallengeCard({ challenge, onOpen, saved, onSave, userSolveStatus, opening }) {
  const [hovering, setHovering] = useState(false)
  const tc   = TYPE_CONFIG[challenge.type] || { label: challenge.type, icon: "📋", color: T.ink3 }
  const dc   = DIFF_CONFIG[challenge.difficulty] || DIFF_CONFIG.Medium
  const tech = challenge.technologies || []
  const solveStatus = userSolveStatus?.[challenge.id]

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        background: "#FFFFFF",
        border: `1.5px solid ${hovering ? tc.color + "50" : T.border}`,
        borderLeft: `4px solid ${tc.color}`,
        borderRadius: 14,
        padding: "16px 18px 14px",
        transition: "all 0.15s",
        boxShadow: hovering ? `0 6px 24px ${tc.color}14` : "none",
        position: "relative",
      }}
    >
      {/* ── Header row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          {/* Type + company badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: tc.color, background: tc.color + "14", padding: "2px 9px", borderRadius: 99, letterSpacing: 0.3 }}>
              {tc.icon} {tc.label}
            </span>
            {challenge.company_name && challenge.company_name !== "Capabilio" && (
              <span style={{ fontSize: 10, fontWeight: 600, color: T.ink3, background: T.cream2, padding: "2px 8px", borderRadius: 99 }}>
                🏢 {challenge.company_name}
              </span>
            )}
            {challenge.is_recruiter_visible && (
              <span style={{ fontSize: 9, fontWeight: 700, color: T.green, background: T.green2, padding: "2px 7px", borderRadius: 99 }}>
                👀 Recruiter
              </span>
            )}
            {solveStatus === "solved" && (
              <span style={{ fontSize: 9, fontWeight: 800, color: "#16A34A", background: "#F0FDF4", padding: "2px 7px", borderRadius: 99 }}>✓ Solved</span>
            )}
            {solveStatus === "attempted" && (
              <span style={{ fontSize: 9, fontWeight: 800, color: T.amber, background: T.amber2, padding: "2px 7px", borderRadius: 99 }}>• Attempted</span>
            )}
          </div>

          {/* Title */}
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 4, lineHeight: 1.35 }}>
            {challenge.title}
          </div>

          {/* Description */}
          <div style={{ fontSize: 11, color: T.ink3, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {challenge.description}
          </div>
        </div>

        {/* Right: difficulty + ELO */}
        <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: dc.color, background: dc.bg, padding: "3px 10px", borderRadius: 8 }}>
            {challenge.difficulty}
          </span>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: T.green, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>+{challenge.elo_impact}</div>
            <div style={{ fontSize: 8, color: T.ink4, fontWeight: 700, letterSpacing: 0.8 }}>ELO</div>
          </div>
        </div>
      </div>

      {/* ── Tech stack ── */}
      {tech.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          {tech.slice(0, 5).map((t, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 10, fontWeight: 600, color: T.ink2 }}>
              <span style={{ fontSize: 11 }}>{TECH_ICONS[t] || "🔧"}</span> {t}
            </span>
          ))}
          {tech.length > 5 && <span style={{ fontSize: 9, color: T.ink4, padding: "3px 8px", background: T.cream, borderRadius: 6 }}>+{tech.length - 5}</span>}
        </div>
      )}

      {/* ── Footer: stats + actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 10, color: T.ink4 }}>⏱ {challenge.estimated_mins} min</span>
        <span style={{ fontSize: 10, color: T.ink4 }}>
          {challenge.proof_type === "live_demo" ? "🌐 Live Demo" : challenge.proof_type === "report" ? "📄 Report" : "💻 Code"}
        </span>
        {(challenge.participation_count || 0) > 0 && (
          <span style={{ fontSize: 10, color: T.ink4 }}>
            👥 {challenge.participation_count >= 1000 ? `${(challenge.participation_count/1000).toFixed(1)}k` : challenge.participation_count}
          </span>
        )}
        <div style={{ flex: 1 }} />

        {/* Save */}
        <button
          onClick={e => { e.stopPropagation(); onSave?.(challenge.id) }}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: saved ? "#D97706" : T.ink4, padding: "2px 4px", transition: "color 0.15s", lineHeight: 1 }}
          title={saved ? "Remove bookmark" : "Save for later"}
        >
          {saved ? "★" : "☆"}
        </button>

        {/* Open */}
        <button
          onClick={() => !opening && onOpen(challenge)}
          disabled={opening}
          style={{
            padding: "7px 18px", borderRadius: 9, border: "none",
            background: hovering ? tc.color : T.indigo,
            color: "#fff", fontSize: 11, fontWeight: 800,
            cursor: opening ? "default" : "pointer", fontFamily: "inherit",
            transition: "background 0.15s", opacity: opening ? 0.7 : 1,
          }}
        >
          {opening ? "Opening…" : solveStatus === "solved" ? "Retry →" : "Open →"}
        </button>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

// DSA categories from the problems table
const DSA_CATEGORIES = ["DSA","Arrays","Strings","Hash Maps","Two Pointers","Sliding Window",
  "Stack","Queue","Linked List","Binary Search","Trees","Graphs","DP","Dynamic Programming",
  "Recursion","Backtracking","Greedy","Sorting","Searching","Math","Bit Manipulation"]

export default function ArenaCatalog({ user, userData, onOpenChallenge, filterCategory, onBack }) {
  const [allChallenges,  setAllChallenges]  = useState([])
  const [loading,        setLoading]        = useState(true)
  const [filters,        setFilters]        = useState(INITIAL_FILTERS)
  const [saves,          setSaves]          = useState(new Set())
  const [solveStatus,    setSolveStatus]    = useState({})
  const [dataSource,     setDataSource]     = useState("loading") // "supabase" | "inline"
  const [openingId,      setOpeningId]      = useState(null) // challenge.id currently being hydrated

  // Career track: filters problems to the user's stream
  const { track: careerTrack, categories: careerCategories, loading: careerLoading } = useCareerTrack()

  // ── Load challenge data from `problems` table ────────────────────────────
  useEffect(() => {
    if (careerLoading) return  // wait until we know the user's career track
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        // Build query — filter by career categories if a track is selected.
        //
        // 2026-08-07: was `select("*")` with no column list — flagged in the
        // 2026-07-13 SRE audit as an 11MB+/student payload on tracks like
        // MBA/Pharmacy (measured against production). `constraints`,
        // `examples`, `test_cases`, and `editorial` are the full solve-time
        // content (worked test cases + solution writeup) and are only ever
        // needed once a student actually opens a specific problem — they're
        // now fetched on demand in `onOpen` below instead of for every row
        // in the browse list. `statement` is kept here because the card list
        // renders a 2-line preview of it (ChallengeCard's `description`) —
        // dropping it would blank out every card's preview text, a visible
        // regression, not a bandwidth fix. This does not add pagination:
        // the file's own header comment documents "100% client-side
        // filtering, no round-trips" as a deliberate design choice, and true
        // pagination would break that (a difficulty/category filter could
        // show empty results if the match isn't in the loaded page). Career
        // track scoping (`.in("category", careerCategories)` below) already
        // bounds the row count to the student's own stream.
        let q = problemsDb
          .from("problems")
          .select("id,slug,title,statement,category,difficulty,languages,tags,acceptance_rate")
          .order("difficulty", { ascending: true })
        if (careerCategories && careerCategories.length > 0) {
          q = q.in("category", careerCategories)
        }
        const { data, error } = await q

        if (cancelled) return
        if (!error && data && data.length > 0) {
          // Normalize `problems` row shape → internal challenge shape.
          // constraints/examples/test_cases/editorial are intentionally
          // left empty here — see comment above; hydrateFullProblem()
          // fetches them when a card is actually opened.
          const normalized = data.map(p => ({
            id:                  p.id,
            slug:                p.slug,
            title:               p.title,
            description:         p.statement,   // problems uses `statement`
            statement:           p.statement,
            constraints:         "",
            examples:            [],
            test_cases:          [],
            editorial:           "",
            _fullContentLoaded:  false,
            type:                (p.category || "dsa").toLowerCase(),
            category:            p.category,
            difficulty:          p.difficulty,
            estimated_mins:      null,           // not in problems table
            elo_impact:          p.difficulty === "Hard" ? 35 : p.difficulty === "Medium" ? 22 : 15,
            technologies:        p.languages || [],
            skills:              p.tags || [],
            tags:                p.tags || [],
            sandbox_type:        "code",         // all problems are code challenges
            language:            (p.languages || [])[0] || "Python",
            languages:           p.languages || [],
            acceptance_rate:     p.acceptance_rate,
            company_name:        "Capabilio",
            is_company_sponsored:false,
            is_recruiter_visible:true,
            participation_count: Math.round((p.acceptance_rate || 0.5) * 1000),
            status:              "active",
          }))
          setAllChallenges(normalized)
          setDataSource("supabase")
        } else {
          setAllChallenges(INLINE_CHALLENGES)
          setDataSource("inline")
        }
      } catch {
        if (!cancelled) {
          setAllChallenges(INLINE_CHALLENGES)
          setDataSource("inline")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // Re-fetch when the user's career track changes
  }, [careerCategories, careerLoading])

  // ── Load saves ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    supabase.from("challenge_saves")
      .select("challenge_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSaves(new Set(data.map(d => d.challenge_id)))
      })
  }, [user?.id])

  // ── Load solve status ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    supabase.from("challenge_attempts")
      .select("challenge_id, score")
      .eq("user_id", user.id)
      .not("score", "is", null)
      .then(({ data }) => {
        if (!data) return
        const map = {}
        data.forEach(a => {
          const existing = map[a.challenge_id]
          const current = a.score >= 70 ? "solved" : "attempted"
          if (!existing || (current === "solved")) map[a.challenge_id] = current
        })
        setSolveStatus(map)
      })
  }, [user?.id])

  // ── Client-side filtering (instant, no API round-trip) ───────────────────
  const filtered = useMemo(() => {
    let result = [...allChallenges]

    // filterCategory prop: "dsa" shows only DSA challenges, "domain" shows non-DSA
    if (filterCategory === "dsa")
      result = result.filter(c => DSA_CATEGORIES.includes(c.category || c.type))
    else if (filterCategory === "domain")
      result = result.filter(c => !DSA_CATEGORIES.includes(c.category || c.type))

    if (filters.type)                 result = result.filter(c => c.type === filters.type)
    if (filters.difficulty)           result = result.filter(c => c.difficulty === filters.difficulty)
    if (filters.is_company_sponsored) result = result.filter(c => c.is_company_sponsored === true)
    if (filters.is_recruiter_visible) result = result.filter(c => c.is_recruiter_visible === true)
    if (filters.search.trim())        result = result.filter(c => {
      const q = filters.search.toLowerCase()
      return c.title?.toLowerCase().includes(q) ||
        (c.statement || c.description || "").toLowerCase().includes(q) ||
        (c.technologies || c.languages || []).some(t => t?.toLowerCase().includes(q)) ||
        (c.tags || []).some(t => t?.toLowerCase().includes(q))
    })

    // Sort
    if (filters.sort === "elo")       result.sort((a,b) => b.elo_impact - a.elo_impact)
    else if (filters.sort === "easy") result.sort((a,b) => {
      const order = { Easy:0, Medium:1, Hard:2, Expert:3 }
      return (order[a.difficulty]||0) - (order[b.difficulty]||0)
    })
    else result.sort((a,b) => (b.participation_count||0) - (a.participation_count||0)) // popular

    return result
  }, [allChallenges, filters])

  // ── Save toggle (Supabase) ───────────────────────────────────────────────
  const handleSave = useCallback(async (challengeId) => {
    if (!user?.id) return
    const isSaved = saves.has(challengeId)
    // Optimistic
    setSaves(prev => {
      const next = new Set(prev)
      isSaved ? next.delete(challengeId) : next.add(challengeId)
      return next
    })
    try {
      if (isSaved) {
        await supabase.from("challenge_saves")
          .delete().eq("user_id", user.id).eq("challenge_id", challengeId)
      } else {
        await supabase.from("challenge_saves")
          .insert({ user_id: user.id, challenge_id: challengeId })
      }
    } catch {
      // Revert optimistic update
      setSaves(prev => {
        const next = new Set(prev)
        isSaved ? next.add(challengeId) : next.delete(challengeId)
        return next
      })
    }
  }, [user?.id, saves])

  // Fetches the solve-time-only fields (constraints/examples/test_cases/
  // editorial) that the list query above deliberately no longer selects.
  // Only needed for real `problems`-table rows — INLINE_CHALLENGES fallback
  // data already has full content and needs no round-trip. Merges the
  // result into allChallenges so re-opening the same card later is free.
  const hydrateFullProblem = useCallback(async (challenge) => {
    if (dataSource !== "supabase" || challenge._fullContentLoaded) return challenge
    setOpeningId(challenge.id)
    try {
      // 2026-08-10: test_cases/editorial are no longer readable via the
      // anon Supabase key (see problems RLS/grant security fix) — fetched
      // via the backend's service-role-backed detail route instead. See the
      // identical fix in ArenaCommonChallenges.jsx's openChallenge().
      const res = await fetch(`${SERVER}/api/arena/problem/${challenge.id}/detail`)
      if (!res.ok) return challenge // open with what we already have rather than block the student
      const data = await res.json()
      const hydrated = {
        ...challenge,
        constraints: data.constraints || "",
        examples: data.examples || [],
        test_cases: data.test_cases || [],
        editorial: data.editorial || "",
        _fullContentLoaded: true,
      }
      setAllChallenges(prev => prev.map(c => (c.id === challenge.id ? hydrated : c)))
      return hydrated
    } catch {
      return challenge
    } finally {
      setOpeningId(null)
    }
  }, [dataSource])

  const setFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const clearFilters = () => setFilters(INITIAL_FILTERS)
  const hasActiveFilters = filters.type || filters.difficulty || filters.is_company_sponsored || filters.is_recruiter_visible || filters.search

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "'DM Sans',sans-serif", background: T.cream, overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} ::-webkit-scrollbar{width:0;height:0}`}</style>

      {/* ── Top nav bar ─────────────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, flexShrink: 0, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12, fontWeight: 700, color: T.ink2, cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>
            ← Arena
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: T.ink }}>Challenge Library</div>
          <div style={{ fontSize: 11, color: T.ink3 }}>
            {careerTrack ? (
              <span>
                {careerTrack.icon} <strong>{careerTrack.name}</strong> · {filtered.length} challenges ·{" "}
                <a href="/career" style={{ color: T.indigo, textDecoration: "none", fontWeight: 600 }}>change track</a>
              </span>
            ) : (
              <span>
                {filtered.length} challenges ·{" "}
                <a href="/career" style={{ color: T.indigo, textDecoration: "none", fontWeight: 600 }}>pick your career track</a>
              </span>
            )}
          </div>
        </div>
        {userData?.eloRating && (
          <div style={{ padding: "4px 12px", background: T.indigo3, borderRadius: 99, fontSize: 12, fontWeight: 800, color: T.indigo, fontFamily: "'DM Mono',monospace" }}>
            ELO {userData.eloRating}
          </div>
        )}
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────────── */}
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>

        {/* Type pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "12px 16px 0", scrollbarWidth: "none" }}>
          {TYPE_FILTERS.map(tf => {
            const active = filters.type === tf.id
            return (
              <button key={tf.id} onClick={() => setFilter("type", tf.id)}
                style={{
                  padding: "5px 13px", borderRadius: 99, flexShrink: 0,
                  border: `1.5px solid ${active ? T.indigo : T.border}`,
                  background: active ? T.indigo : "transparent",
                  color: active ? "#fff" : T.ink3,
                  fontSize: 11, fontWeight: active ? 700 : 500,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.12s", whiteSpace: "nowrap",
                }}
              >
                {tf.label}
              </button>
            )
          })}
        </div>

        {/* Row 2: Difficulty / Company / Recruiter / Sort / Search */}
        <div style={{ display: "flex", gap: 8, padding: "10px 16px 12px", alignItems: "center", overflowX: "auto", scrollbarWidth: "none" }}>
          {/* Difficulty */}
          <select value={filters.difficulty} onChange={e => setFilter("difficulty", e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${filters.difficulty ? T.indigo : T.border}`, background: filters.difficulty ? T.indigo3 : T.cream, color: filters.difficulty ? T.indigo : T.ink2, fontSize: 11, fontFamily: "inherit", cursor: "pointer", flexShrink: 0, fontWeight: filters.difficulty ? 700 : 400 }}>
            <option value="">Difficulty</option>
            {["Easy","Medium","Hard","Expert"].map(d => <option key={d}>{d}</option>)}
          </select>

          {/* Company toggle */}
          <button onClick={() => setFilter("is_company_sponsored", !filters.is_company_sponsored)}
            style={{
              padding: "5px 13px", borderRadius: 8, flexShrink: 0,
              border: `1.5px solid ${filters.is_company_sponsored ? T.amber : T.border}`,
              background: filters.is_company_sponsored ? T.amber2 : T.cream,
              color: filters.is_company_sponsored ? T.amber : T.ink3,
              fontSize: 11, fontWeight: filters.is_company_sponsored ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            🏢 Company
          </button>

          {/* Recruiter visible toggle */}
          <button onClick={() => setFilter("is_recruiter_visible", !filters.is_recruiter_visible)}
            style={{
              padding: "5px 13px", borderRadius: 8, flexShrink: 0,
              border: `1.5px solid ${filters.is_recruiter_visible ? T.green : T.border}`,
              background: filters.is_recruiter_visible ? T.green2 : T.cream,
              color: filters.is_recruiter_visible ? T.green : T.ink3,
              fontSize: 11, fontWeight: filters.is_recruiter_visible ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            👀 Recruiter
          </button>

          {/* Sort */}
          <select value={filters.sort} onChange={e => setFilter("sort", e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.cream, color: T.ink2, fontSize: 11, fontFamily: "inherit", cursor: "pointer", flexShrink: 0, marginLeft: "auto" }}>
            <option value="popular">Most Popular</option>
            <option value="elo">High ELO</option>
            <option value="easy">Easy First</option>
          </select>

          {/* Search */}
          <input value={filters.search} onChange={e => setFilter("search", e.target.value)}
            placeholder="Search by title, tech, tag…"
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${filters.search ? T.indigo : T.border}`, background: T.cream, color: T.ink, fontSize: 11, fontFamily: "inherit", outline: "none", minWidth: 180, flexShrink: 0 }}
            onFocus={e => e.target.style.borderColor = T.indigo}
            onBlur={e => e.target.style.borderColor = filters.search ? T.indigo : T.border}
          />
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      {!loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 4px", flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: T.ink3 }}>
            <strong style={{ color: T.ink }}>{filtered.length}</strong> challenge{filtered.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " (filtered)" : ""}
          </span>
          {dataSource === "inline" && (
            <span style={{ fontSize: 9, color: T.amber, background: T.amber2, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
              Preview data · Run migration to load full catalog
            </span>
          )}
          {hasActiveFilters && (
            <button onClick={clearFilters}
              style={{ fontSize: 10, color: T.indigo, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
              ✕ Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Challenge list ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: 140, background: "#FFFFFF", borderRadius: 14, border: `1px solid ${T.border}`, animation: "pulse 1.5s ease-in-out infinite", opacity: 0.6 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ink, marginBottom: 6 }}>
              {hasActiveFilters ? "No challenges match" : "No challenges yet"}
            </div>
            <div style={{ fontSize: 12, color: T.ink3, marginBottom: 20, maxWidth: 260, lineHeight: 1.6 }}>
              {hasActiveFilters ? "Try a different filter combination." : "Run the migration SQL to load the full challenge catalog."}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters}
                style={{ padding: "9px 22px", borderRadius: 10, background: T.indigo, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          filtered.map(c => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              saved={saves.has(c.id)}
              onSave={handleSave}
              userSolveStatus={solveStatus}
              opening={openingId === c.id}
              onOpen={async (rawChallenge) => {
                const challenge = await hydrateFullProblem(rawChallenge)
                // Derive sandbox from category/type
                const cat = (challenge.type || challenge.category || "dsa").toLowerCase()
                const sandbox = challenge.sandbox_type || (
                  cat === "sql" || cat === "dba" ? "sql" :
                  cat === "frontend" ? "react" :
                  cat === "devops" || cat === "cybersecurity" ? "terminal" :
                  cat === "data_analyst" || cat === "data" ? "notebook" :
                  cat === "system_design" ? "diagram" : "code"
                )
                onOpenChallenge?.({
                  id:              challenge.id,
                  slug:            challenge.slug,
                  title:           challenge.title,
                  description:     challenge.statement || challenge.description || "",
                  statement:       challenge.statement || challenge.description || "",
                  scenario:        challenge.statement || challenge.description || "",
                  taskDescription: challenge.statement || challenge.description || "",
                  constraints:     challenge.constraints || "",
                  examples:        challenge.examples || [],
                  test_cases:      challenge.test_cases || [],
                  editorial:       challenge.editorial || "",
                  hints:           challenge.editorial
                    ? [challenge.editorial]
                    : [],
                  difficulty:      challenge.difficulty,
                  timeLimit:       challenge.estimated_mins ? `${challenge.estimated_mins} min` : "25 min",
                  category:        challenge.type || challenge.category,
                  lang:            challenge.language || (challenge.languages||[])[0] || "python",
                  languages:       challenge.languages || challenge.technologies || [],
                  starterCode:     challenge.starter_code || "",
                  tags:            challenge.tags || [],
                  skillTags:       challenge.skills || challenge.tags || [],
                  elo_impact:      challenge.elo_impact,
                  eloGain:         challenge.elo_impact,
                  workstation:     sandbox,
                  company:         challenge.company_name || "Capabilio",
                  acceptance_rate: challenge.acceptance_rate,
                })
              }}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}
