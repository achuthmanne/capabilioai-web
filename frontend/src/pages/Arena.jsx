/**
 * Arena.jsx — Capabilio Arena v3
 * Two-path design: Common Challenges (LeetCode-style) | Domain Challenges (role-based)
 */

import { useState, useEffect, useRef, useCallback } from "react"

import {
  ARENA_DOMAINS,
  DOMAIN_ORDER,
  resolveArenaDomain,
  getDomainModules,
  resolveSandboxType,
} from "../config/arenaDomains"
import { useArenaMissions } from "../hooks/useArenaMissions"
import { WorkstationRouter, resolveWorkstationType } from "./ArenaWorkstations"
import ChallengeShell from "../arena/ChallengeShell"
import MissionDesk from "../arena/MissionDesk"
import { getPlan, PLANS } from "../config/plans"
import { useRazorpay } from "../hooks/useRazorpay"
import { arenaDb, userDoc } from "../lib/db"
import { supabase } from "../lib/supabase"
import ArenaStreaks  from "./ArenaStreaks"
import ArenaCommonChallenges from "./ArenaCommonChallenges"
import { getDomainChallenges, getDomainCategories } from "../config/domainChallenges"
import { useDomainChallengeSlots } from "../hooks/useDomainChallengeSlots"

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  // ── Glassmorphic Cosmos dark tokens ────────────────────────────────────
  cream:   "#FAF7F2",          // page bg → dark base
  cream2:  "#FFFFFF",          // raised surface
  cream3:  "rgba(0,0,0,0.05)", // dividers / subtle tracks
  ink:     "#1A1714",          // primary text → near-white
  ink2:    "#475569",          // secondary text
  ink3:    "#A8A29E",          // muted text
  ink4:    "#6B6560",          // ghost / placeholder
  indigo:  "#6366F1",          // primary action
  indigo2: "#818CF8",          // lighter indigo
  indigo3: "rgba(99,102,241,0.12)", // soft indigo background
  green:   "#10B981",          // success / emerald
  green2:  "rgba(16,185,129,0.12)", // soft emerald bg
  amber:   "#F59E0B",          // warning / gold
  red:     "#F43F5E",          // error / critical
  border:  "rgba(0,0,0,0.05)",
  shadow:  "0 4px 12px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.3)",
  shadow2: "0 8px 24px rgba(0,0,0,0.08),0 4px 12px rgba(0,0,0,0.4)",
  bg:      "#F8F7F4",
  bg2:     "#F1EFE9",
}

// ─────────────────────────────────────────────────────────────────────────────
// ELO SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
const ELO_TIERS = [
  { min:0,    max:600,  label:"Rookie",       color:"#A8A29E", icon:"🌱" },
  { min:600,  max:800,  label:"Apprentice",   color:"#22C55E", icon:"⚡" },
  { min:800,  max:1000, label:"Practitioner", color:"#3B82F6", icon:"🔵" },
  { min:1000, max:1200, label:"Expert",       color:"#8B5CF6", icon:"💜" },
  { min:1200, max:1500, label:"Master",       color:"#F59E0B", icon:"🏆" },
  { min:1500, max:9999, label:"Elite",        color:"#EF4444", icon:"🔥" },
]
const getTier = elo => ELO_TIERS.find(t => elo >= t.min && elo < t.max) || ELO_TIERS[0]

// ─────────────────────────────────────────────────────────────────────────────
// CODE SKELETONS — domain-aware starting templates
// ─────────────────────────────────────────────────────────────────────────────
const buildSkeleton = (task, domainKey) => {
  // Catalog challenges carry their own sandbox type — always respect it over domain default
  const taskSandbox = task?.workstation || task?.sandbox_type
  const sandbox = taskSandbox || resolveSandboxType(task, domainKey)
  const lang = task?.lang || task?.language || ""
  const title = task?.title || "Task"
  const desc  = task?.description || "Complete the objective"

  const templates = {
    sql: `-- Mission: ${title}\n-- Objective: ${desc}\n\nEXPLAIN ANALYZE\nSELECT\n    -- TODO: specify columns\nFROM\n    -- TODO: specify table(s)\nWHERE\n    -- TODO: add filter conditions\nORDER BY\n    -- TODO: specify ordering\nLIMIT 100;\n`,
    react: `// Mission: ${title}\nimport { useState, useEffect } from 'react'\n\nexport default function Solution() {\n  const [state, setState] = useState(null)\n\n  useEffect(() => {\n    // TODO: initialise component\n  }, [])\n\n  return (\n    <div>\n      {/* TODO: implement UI */}\n      <h1>${title}</h1>\n    </div>\n  )\n}\n`,
    terminal: `#!/usr/bin/env bash\n# Mission: ${title}\nset -euo pipefail\n\n# ─── CONFIGURATION ────────────────────────────────────────────────────────────\n# TODO: set variables\n\n# ─── MAIN ─────────────────────────────────────────────────────────────────────\nmain() {\n  echo "Starting: ${title}"\n  # TODO: implement steps\n}\n\nmain "$@"\n`,
    markdown: `# ${title}\n\n**Objective:** ${desc}\n\n---\n\n## Approach\n\n<!-- TODO: describe your approach -->\n\n## Results\n\n<!-- TODO: present findings -->\n\n## Conclusion\n\n<!-- TODO: key takeaways -->\n`,
    notebook: `# ${title}\n\nimport pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# ─── LOAD DATA ────────────────────────────────────────────────────────────────\n# df = pd.read_csv('data.csv')\n\n# ─── EXPLORE ──────────────────────────────────────────────────────────────────\n# df.describe()\n# df.isnull().sum()\n\n# ─── ANALYSIS ─────────────────────────────────────────────────────────────────\n# TODO: perform analysis\n`,
    diagram: `# ${title}\n\n## System Overview\n\nDescribe the architecture here.\n\n## Components\n\n\`\`\`\n[Client] → [Load Balancer] → [API Gateway]\n                                    ↓\n                          [Service Layer]\n                                    ↓\n                             [Database]\n\`\`\`\n\n## Design Decisions\n\n| Decision | Chosen | Reason |\n|----------|--------|---------|\n| TODO     | TODO   | TODO    |\n`,
    yaml: `# ${title}\n# ──────────────────────────────────────────────────────────────────\n# Objective: ${desc}\n#\n${(task?.steps||[]).map((s,i)=>`# ✦ Step ${i+1}: ${typeof s==="string"?s:s.text||s.label||""}`).join("\n")}\n#\n# Write all required manifests below. Separate multiple resources with ---\n# ──────────────────────────────────────────────────────────────────\n\n# --- Resource 1 -----------------------------------------------\napiVersion:    # TODO: e.g. v1 / apps/v1 / autoscaling/v2\nkind:          # TODO: Deployment | Service | ConfigMap | HPA | ...\nmetadata:\n  name:        # TODO: resource name\n  namespace:   # TODO: namespace (e.g. production)\nspec:\n  # TODO: complete the spec for this resource\n  # Refer to the Steps in the left panel for each requirement.\n\n\n# --- Resource 2 (add more --- blocks as needed) ---------------\n`,
    code: {
      TypeScript: `// Mission: ${title}\n\ninterface Input {\n  // TODO: define types\n}\n\nfunction solve(input: Input): unknown {\n  // TODO: implement\n  throw new Error('Not implemented')\n}\n\nexport { solve }\n`,
      Python: `# Mission: ${title}\n\ndef solve(input_data):\n    """\n    ${desc}\n    """\n    # TODO: implement\n    pass\n\nif __name__ == '__main__':\n    print(solve({}))\n`,
      Java: `// Mission: ${title}\npublic class Solution {\n    public static void main(String[] args) {\n        // TODO: test\n    }\n    public Object solve(Object input) {\n        throw new UnsupportedOperationException("Not implemented");\n    }\n}\n`,
      Go: `// Mission: ${title}\npackage main\nimport "fmt"\n\nfunc solve(input interface{}) interface{} {\n    // TODO: implement\n    panic("not implemented")\n}\n\nfunc main() {\n    fmt.Println(solve(nil))\n}\n`,
      Verilog: `// Mission: ${title}\nmodule solution (\n    input clk, rst_n,\n    output reg out\n);\nalways @(posedge clk or negedge rst_n) begin\n    if (!rst_n) out <= 1'b0;\n    else begin\n        // TODO: implement logic\n    end\nend\nendmodule\n`,
      default: `// Mission: ${title}\n\nfunction solve(input) {\n  // TODO: implement solution\n  throw new Error('Not implemented')\n}\n\nmodule.exports = { solve }\n`,
    },
  }

  if (sandbox === "code") {
    // Kubernetes / IaC challenges: use YAML scaffold so students write manifests, not JS
    const fullText = ((task?.title || "") + " " + (task?.description || "") + " " + (task?.category || "")).toLowerCase()
    if (/\bkubernetes\b|\bk8s\b|\bhelm\b|yaml.*manifest|manifest.*yaml|dockerfile|docker[\s-]?compose|terraform|ansible|kind:\s*(deployment|service)|rolling.*update|liveness.*probe|readiness.*probe|replica|horizontal.*pod/.test(fullText)) {
      return templates.yaml
    }
    return templates.code[lang] || templates.code.default
  }
  return templates[sandbox] || templates.code.default
}

// ─────────────────────────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ color = T.indigo, size = 14 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block", flexShrink: 0 }} />
}

function Badge({ children, color = T.indigo, bg = T.indigo3, size = 10 }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", background: bg, color, fontSize: size, fontWeight: 700, borderRadius: 99, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{children}</span>
}

function Dot({ color = T.green, pulse = false }) {
  return <span style={{ position: "relative", display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }}>{pulse && <span style={{ position: "absolute", inset: -3, borderRadius: "50%", background: color + "30", animation: "pulseRing 2s ease-out infinite" }} />}</span>
}

function EloRing({ elo, size = 44, color }) {
  const tier = getTier(elo)
  const c = color || tier.color
  const pct = Math.min(100, ((elo - tier.min) / Math.max(1, tier.max - tier.min)) * 100)
  const r = size / 2 - 4
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c + "20"} strokeWidth={3} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
          strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: size * 0.28, fontWeight: 900, color: c, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{elo}</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CHALLENGE PICKER — role-specific real-world challenges
// Replaces DomainLanding (all 12 domain cards) and the generic empty workstation
// ─────────────────────────────────────────────────────────────────────────────
function DomainChallengePicker({ domain, domainKey, onSelect }) {
  const [filter, setFilter]   = useState("All")
  const [hovered, setHovered] = useState(null)

  const challenges  = getDomainChallenges(domainKey)
  const categories  = [{ category: "All", icon: "🔍" }, ...getDomainCategories(domainKey)]
  const filtered    = filter === "All" ? challenges : challenges.filter(c => c.category === filter)

  const diffColor = d =>
    d === "Easy"   ? "#16A34A" :
    d === "Hard"   ? "#C0392B" :
    d === "Expert" ? "#7C3AED" : "#B8620A"

  const diffBg = d =>
    d === "Easy"   ? "#F0FDF4" :
    d === "Hard"   ? "#FEF2F2" :
    d === "Expert" ? "#F5F3FF" : "#FFFBEB"

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: T.cream }}>

      {/* ── Header ── */}
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, padding: "18px 24px 14px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: domain.colorBg, border: `2px solid ${domain.colorBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {domain.icon}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 900, color: T.ink, letterSpacing: -0.3 }}>
              {domain.label} Challenge Library
            </div>
            <div style={{ fontSize: 11, color: T.ink4, marginTop: 1 }}>
              Real-world scenarios · Practice hands-on · Build your ELO
            </div>
          </div>
        </div>

        {/* Skills / tools row */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {(domain.skills || []).slice(0, 7).map(s => (
            <span key={s} style={{ fontSize: 10, fontWeight: 600, color: domain.color, background: domain.colorBg, padding: "2px 9px", borderRadius: 99, border: `1px solid ${domain.colorBorder}` }}>{s}</span>
          ))}
        </div>
      </div>

      {/* ── Category filter pills ── */}
      <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, padding: "10px 22px", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
        {categories.map(cat => {
          const active = filter === cat.category
          return (
            <button
              key={cat.category}
              onClick={() => setFilter(cat.category)}
              style={{
                padding: "5px 13px", borderRadius: 99, border: `1.5px solid ${active ? domain.color : T.border}`,
                background: active ? domain.color : "#fff",
                color: active ? "#fff" : T.ink3,
                fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                fontFamily: "inherit", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.category}</span>
              {active && <span style={{ fontSize: 9, opacity: 0.8 }}>({filtered.length})</span>}
            </button>
          )
        })}
      </div>

      {/* ── Challenge cards grid ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px 40px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: T.ink4 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>No challenges in this category yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Try selecting a different filter above</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
            {filtered.map(challenge => {
              const isHov = hovered === challenge.id
              return (
                <div
                  key={challenge.id}
                  onClick={() => onSelect(challenge)}
                  onMouseEnter={() => setHovered(challenge.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: "#FFFFFF",
                    border: `1.5px solid ${isHov ? domain.color + "60" : T.border}`,
                    borderRadius: 14,
                    padding: "18px 20px 16px",
                    cursor: "pointer",
                    transition: "all 0.17s",
                    boxShadow: isHov ? `0 8px 24px ${domain.color}18, 0 2px 8px rgba(26,26,24,0.06)` : T.shadow,
                    transform: isHov ? "translateY(-2px)" : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Top accent bar on hover */}
                  {isHov && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${domain.color}, transparent)` }} />
                  )}

                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: domain.colorBg, border: `1.5px solid ${domain.colorBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                      {challenge.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, lineHeight: 1.3, marginBottom: 4 }}>
                        {challenge.title}
                      </div>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: diffColor(challenge.difficulty), background: diffBg(challenge.difficulty), padding: "2px 8px", borderRadius: 99 }}>
                          {challenge.difficulty}
                        </span>
                        <span style={{ fontSize: 9, color: T.ink4, fontWeight: 600 }}>
                          {challenge.category}
                        </span>
                        <span style={{ fontSize: 9, color: T.ink4 }}>⏱ {challenge.timeLimit}</span>
                        <span style={{ fontSize: 9, color: "#1A7A4A", fontWeight: 700, background: "#E8F7EF", padding: "2px 7px", borderRadius: 99 }}>+{challenge.eloGain} ELO</span>
                      </div>
                    </div>
                  </div>

                  {/* Scenario preview */}
                  <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.65, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {challenge.scenario}
                  </div>

                  {/* Tools */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
                    {(challenge.tools || []).map(tool => (
                      <span key={tool} style={{ fontSize: 9, fontWeight: 700, color: domain.color, background: domain.colorBg, padding: "2px 8px", borderRadius: 6, border: `1px solid ${domain.colorBorder}` }}>
                        {tool}
                      </span>
                    ))}
                  </div>

                  {/* CTA row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 5 }}>
                      {(challenge.skillTags || []).slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 8, color: T.ink4, background: T.cream2, padding: "2px 6px", borderRadius: 4 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 8,
                      background: isHov ? domain.color : T.cream2,
                      color: isHov ? "#fff" : T.ink4,
                      fontSize: 11, fontWeight: 700,
                      transition: "all 0.15s",
                    }}>
                      Start Challenge →
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI COPILOT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function AICopilotPanel({ domain, task, code }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `I'm your ${domain?.label || "Arena"} AI Copilot. Ask me anything, paste code for review, or use the quick prompts below.` }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  const QUICK_PROMPTS = ["Review my solution", "Explain this approach", "Find the bug", "Suggest an improvement"]

  const getAIReply = (msg, domain) => {
    const lower = msg.toLowerCase()
    const domainKey = domain?.key || "swe"
    const REPLIES = {
      dba: {
        "review": `DBA review complete:\n\n1. Check for missing index on filtered columns — verify with EXPLAIN ANALYZE.\n2. Consider a composite index if multiple WHERE conditions exist.\n3. VACUUM ANALYZE after any bulk operation to keep planner stats fresh.\n4. Wrap destructive operations in explicit BEGIN/COMMIT.`,
        "explain": `This approach leverages PostgreSQL's query planner to choose between Seq Scan and Index Scan based on cost estimation. The planner uses statistics (pg_statistics) to estimate row counts — stale stats lead to bad plans, so ANALYZE frequently.`,
        "bug": `Common DBA bugs:\n• Missing index on JOIN column → Seq Scan on large table\n• Implicit type cast preventing index use (e.g. WHERE id = '123' on integer column)\n• Nested loop on unindexed FK → N+1 at scale\n• autovacuum not keeping up → table bloat and planner drift`,
        "improve": `Performance improvement ideas:\n1. Create a covering index (include columns in SELECT)\n2. Use connection pooling (PgBouncer) — don't let app open raw connections\n3. CLUSTER the table on the most-used index for sequential access\n4. Partition large tables on time-based column`,
      },
      frontend: {
        "review": `Frontend review:\n\n1. Add error boundaries around async data fetches.\n2. Use React.memo() on pure child components to avoid re-renders.\n3. Check keyboard navigation — all interactive elements reachable via Tab.\n4. Verify colour contrast ratio ≥ 4.5:1 for AA compliance.`,
        "bug": `Common React bugs:\n• Missing dependency in useEffect → stale closure\n• Object/array in dependency array → infinite re-render\n• setState in cleanup → memory leak (add cleanup return)\n• Missing key prop on lists → reconciliation issues`,
      },
      devops: {
        "review": `Pipeline review:\n\n1. Add a health check step after deployment before routing traffic.\n2. Secret scanning should run before Docker build, not after.\n3. Cache node_modules between runs — CI will be 3x faster.\n4. Add --fail-fast to test runner so pipeline fails early.`,
        "bug": `Common DevOps issues:\n• No rollback strategy defined → manual recovery under pressure\n• Secrets in YAML → rotate immediately, use vault/SOPS\n• Missing resource limits on k8s pods → OOM kills in prod\n• No liveness probe → dead container stays in service`,
      },
    }
    const domainReplies = REPLIES[domainKey] || {}
    const match = Object.entries(domainReplies).find(([k]) => lower.includes(k))
    if (match) return match[1]
    return `Good question for ${domain?.label || "Arena"}. The key principle here is: ${domainKey === "dba" ? "always verify your execution plan — assumptions about index usage are wrong more often than you'd think" : domainKey === "frontend" ? "start with semantics and accessibility before adding interactivity" : domainKey === "devops" ? "automate everything, but always have a manual rollback path documented" : "break the problem into the smallest unit that can be independently tested"}.`
  }

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput("")
    setMessages(m => [...m, { role: "user", text: msg }])
    setLoading(true)
    await new Promise(r => setTimeout(r, 800 + Math.random() * 500))
    const reply = getAIReply(msg, domain)
    setMessages(m => [...m, { role: "assistant", text: reply }])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg,${domain?.color || T.indigo},${domain?.color || T.indigo}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.ink }}>AI Copilot</div>
          <div style={{ fontSize: 9, color: domain?.color || T.indigo, fontWeight: 700 }}>{domain?.label} specialist</div>
        </div>
        <Dot color={T.green} pulse />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 12px 4px", display: "flex", flexDirection: "column", gap: 9 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 7, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && <div style={{ width: 20, height: 20, borderRadius: "50%", background: (domain?.color || T.indigo) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0, marginTop: 2 }}>🤖</div>}
            <div style={{ maxWidth: "84%", padding: "8px 11px", borderRadius: m.role === "user" ? "11px 11px 3px 11px" : "3px 11px 11px 11px", background: m.role === "user" ? (domain?.color || T.indigo) : T.cream, color: m.role === "user" ? "#fff" : T.ink2, fontSize: 11.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: (domain?.color || T.indigo) + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🤖</div>
            <div style={{ padding: "9px 12px", borderRadius: "3px 11px 11px 11px", background: T.cream, display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: T.ink4, animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "6px 12px 4px", display: "flex", gap: 4, flexWrap: "wrap" }}>
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} onClick={() => send(p)} style={{ padding: "3px 8px", borderRadius: 99, background: (domain?.color || T.indigo) + "10", border: `1px solid ${(domain?.color || T.indigo) + "25"}`, color: domain?.color || T.indigo, fontSize: 9, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{p}</button>
        ))}
      </div>

      <div style={{ padding: "6px 12px 12px", display: "flex", gap: 6 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={`Ask your ${domain?.label || "Arena"} Copilot...`}
          style={{ flex: 1, padding: "8px 10px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.ink, fontFamily: "inherit", outline: "none" }}
          onFocus={e => e.target.style.borderColor = domain?.color || T.indigo}
          onBlur={e => e.target.style.borderColor = T.border} />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: 30, height: 30, borderRadius: 8, background: domain?.color || T.indigo, border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: !input.trim() || loading ? 0.4 : 1, flexShrink: 0 }}>↑</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION PANEL — slot-aware: shows cooldown lock on completed missions
// ─────────────────────────────────────────────────────────────────────────────
// ── Upgrade nudge cards — shown for locked slots ──────────────────────────────
const UPGRADE_SLOTS = [
  {
    plan: "pro",
    color: PLANS.pro.color,
    colorBg: PLANS.pro.colorBg,
    icon: "⚡",
    label: "Pro",
    price: PLANS.pro.priceLabel,
    perk: "3 missions / day",
    bullets: ["Daily fresh challenges", "Skill rotation engine", "ELO leaderboard"],
  },
  {
    plan: "elite",
    color: PLANS.elite.color,
    colorBg: PLANS.elite.colorBg,
    icon: "🔥",
    label: "Elite",
    price: PLANS.elite.priceLabel,
    perk: "6 missions / day",
    bullets: ["2× more daily missions", "Multi-workstation tasks", "Priority evaluation"],
  },
]

function UpgradeSlotCard({ tier, onUpgrade }) {
  return (
    <div style={{
      padding: "11px 13px", borderRadius: 10,
      border: `1.5px dashed ${tier.color}50`,
      background: tier.colorBg,
      display: "flex", flexDirection: "column", gap: 7,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ fontSize: 16 }}>{tier.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: tier.color }}>
            {tier.label} — {tier.perk}
          </div>
          <div style={{ fontSize: 9, color: T.ink4, marginTop: 1 }}>{tier.price}</div>
        </div>
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: 0.5,
          background: tier.color + "18", color: tier.color,
          padding: "2px 7px", borderRadius: 99, flexShrink: 0,
        }}>LOCKED</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {tier.bullets.map((b, bi) => (
          <div key={bi} style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: tier.color, flexShrink: 0 }} />
            <span style={{ fontSize: 9, color: T.ink3 }}>{b}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => onUpgrade?.(tier.plan)}
        style={{
          padding: "5px 0", borderRadius: 7, border: "none",
          background: tier.color, color: "#fff",
          fontSize: 9, fontWeight: 800, cursor: "pointer", letterSpacing: 0.5,
        }}
      >
        Upgrade to {tier.label} →
      </button>
    </div>
  )
}

function MissionPanel({ slots, activeMission, onSelect, onRefresh, domain, loading, userData, onUpgrade }) {
  if (!domain) return null

  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const fmtCountdown = (until) => {
    const ms = (until || 0) - Date.now()
    if (ms <= 0) return "Ready soon"
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  const plan = getPlan(userData)
  const unlockedCount = Math.min(plan.arenaTasks, 3)
  const visibleSlots = (slots || []).slice(0, unlockedCount)

  // Build 3-item display list: real slots first, then upgrade cards for remaining
  const displayItems = [
    ...Array.from({ length: 3 }, (_, i) => {
      if (i < unlockedCount) return { type: "slot", slot: visibleSlots[i] || null, index: i }
      // Determine which upgrade tier to show: slot 1→Pro, slot 2→Elite
      const upgradeIdx = i - unlockedCount
      return { type: "upgrade", tier: UPGRADE_SLOTS[Math.min(upgradeIdx, UPGRADE_SLOTS.length - 1)], index: i }
    }),
  ]

  const diffColor = d => d === "Easy" ? "#16A34A" : d === "Hard" ? "#C0392B" : d === "Expert" ? "#7C3AED" : T.amber

  return (
    <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}` }}>
      {/* ── Panel header ── */}
      <div style={{
        padding: "12px 14px 10px",
        background: `linear-gradient(135deg, ${domain.color}0A, transparent)`,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: domain.colorBg, border: `1.5px solid ${domain.colorBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
            }}>
              {domain.icon}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.ink, lineHeight: 1 }}>Today's Missions</div>
              <div style={{ fontSize: 9, color: T.ink4, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{
                  fontWeight: 700, color: plan.color || T.ink4,
                  background: plan.colorBg || T.cream2,
                  padding: "1px 6px", borderRadius: 99, fontSize: 8,
                }}>{plan.label?.toUpperCase()}</span>
                <span>{unlockedCount} of 3 unlocked</span>
              </div>
            </div>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Refresh missions"
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: loading ? T.cream2 : domain.color + "14",
              border: `1.5px solid ${loading ? T.border : domain.color + "40"}`,
              color: loading ? T.ink4 : domain.color,
              fontSize: 13, cursor: loading ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
          >
            {loading ? <Spinner size={11} color={domain.color} /> : "↻"}
          </button>
        </div>
      </div>

      {/* ── Mission cards ── */}
      <div style={{ padding: "10px 10px 6px", display: "flex", flexDirection: "column", gap: 7 }}>
        {displayItems.map((item, i) => {

          // ── UPGRADE CARD ──
          if (item.type === "upgrade") {
            return <UpgradeSlotCard key={`upgrade-${i}`} tier={item.tier} onUpgrade={onUpgrade} />
          }

          const slot   = item.slot
          const m      = slot?.task
          const status = slot?.status || "empty"

          // ── COOLDOWN ──
          if (status === "cooldown") {
            return (
              <div key={i} style={{
                padding: "10px 12px", borderRadius: 12,
                border: `1.5px solid #BBF7D0`,
                background: "linear-gradient(135deg, #F0FDF4, #ECFDF5)",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>✅</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#166534", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m?.title || "Completed Mission"}</div>
                    <div style={{ fontSize: 9, color: "#15803d", marginTop: 2 }}>Submitted · Next in {fmtCountdown(slot.cooldownUntil)}</div>
                  </div>
                  <span style={{ fontSize: 8, background: "#BBF7D0", color: "#166534", padding: "3px 8px", borderRadius: 99, fontWeight: 800, flexShrink: 0, letterSpacing: 0.5 }}>DONE</span>
                </div>
              </div>
            )
          }

          // ── LOADING SKELETON ──
          if (status === "loading") {
            return (
              <div key={i} style={{
                padding: "12px", borderRadius: 12,
                border: `1.5px dashed ${domain.color}30`,
                background: domain.color + "06",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: domain.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Spinner size={12} color={domain.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 9, background: T.cream3, borderRadius: 4, marginBottom: 5, animation: "shimmer 1.5s ease-in-out infinite" }} />
                    <div style={{ height: 7, background: T.cream3, borderRadius: 4, width: "60%", animation: "shimmer 1.5s ease-in-out infinite 0.2s" }} />
                  </div>
                </div>
                <div style={{ fontSize: 9, color: domain.color, fontWeight: 700, marginTop: 8, textAlign: "center" }}>Generating AI mission…</div>
              </div>
            )
          }

          // ── SERVER ERROR ──
          if (status === "error") {
            const errMsg = slot.errorMsg || "Server unreachable"
            const isProdTimeout = errMsg.toLowerCase().includes("timeout") || errMsg.toLowerCase().includes("signal")
            return (
              <div key={i} style={{
                padding: "16px 14px", borderRadius: 12,
                border: "1.5px dashed #FCA5A5",
                background: "#FEF2F2",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>⚠️</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#991B1B", marginBottom: 6 }}>
                  {isProdTimeout ? "Server waking up…" : "Couldn't load mission"}
                </div>
                <div style={{ fontSize: 9, color: "#6B6560", lineHeight: 1.6, marginBottom: 10 }}>
                  {isProdTimeout
                    ? <>Production server is cold-starting (Render.com).<br/>Click retry — it should work on the next attempt.</>
                    : <>Start the local server for instant response:<br/>
                        <code style={{ background: "#1A1A18", color: "#E8E3DA", padding: "2px 6px",
                          borderRadius: 4, fontSize: 8, display: "inline-block", marginTop: 4 }}>
                          npm run dev:all
                        </code>
                      </>
                  }
                </div>
                <button onClick={onRefresh}
                  style={{
                    padding: "6px 16px", borderRadius: 8,
                    border: "1px solid #FCA5A5",
                    background: "#FEE2E2",
                    color: "#991B1B", fontSize: 10, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ↻ Retry
                </button>
              </div>
            )
          }

          // ── OFFLINE / EMPTY ──
          if (status === "empty" || !m) {
            return (
              <div key={i} style={{
                padding: "16px 14px", borderRadius: 12,
                border: `1.5px dashed ${T.border}`,
                background: T.cream2,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>⚡</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.ink2, marginBottom: 6 }}>
                  Ready to generate
                </div>
                <div style={{ fontSize: 9, color: T.ink4, lineHeight: 1.6, marginBottom: 10 }}>
                  Click to generate your AI mission challenge.
                </div>
                <button onClick={onRefresh}
                  style={{
                    padding: "6px 16px", borderRadius: 8,
                    border: `1px solid ${domain.color}40`,
                    background: domain.color + "15",
                    color: domain.color, fontSize: 10, fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  ↻ Generate Now
                </button>
              </div>
            )
          }

          // ── ACTIVE MISSION CARD ──
          const isActive  = activeMission?.title === m.title || activeMission?.id === m.id
          const catIcon   = (domain.missionCategories || []).find(c => c.id === m.category)?.icon || "🎯"
          const diffLabel = m.difficulty || "Medium"

          return (
            <div
              key={m.id || i}
              onClick={() => onSelect(m, i)}
              style={{
                padding: "12px 13px 10px",
                borderRadius: 12,
                border: `1.5px solid ${isActive ? domain.color + "70" : T.border}`,
                background: isActive
                  ? `linear-gradient(135deg, ${domain.color}0D, ${domain.color}05)`
                  : "#fff",
                cursor: "pointer",
                transition: "all 0.15s",
                boxShadow: isActive ? `0 2px 12px ${domain.color}18` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Active accent bar */}
              {isActive && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                  background: `linear-gradient(180deg, ${domain.color}, ${domain.color}80)`,
                  borderRadius: "12px 0 0 12px",
                }} />
              )}

              {/* Header: icon + title + status */}
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 7 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: isActive ? domain.color + "20" : T.cream,
                  border: `1.5px solid ${isActive ? domain.color + "40" : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  {catIcon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800,
                    color: isActive ? domain.color : T.ink,
                    lineHeight: 1.3, marginBottom: 3,
                  }}>
                    {m.title}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 8, fontWeight: 800, letterSpacing: 0.3,
                      color: diffColor(diffLabel),
                      background: diffColor(diffLabel) + "15",
                      padding: "1px 6px", borderRadius: 99,
                    }}>{diffLabel}</span>
                    {m.category && (
                      <span style={{ fontSize: 8, color: T.ink4, fontWeight: 600 }}>{m.category}</span>
                    )}
                    <span style={{ fontSize: 8, color: T.ink4 }}>⏱ {m.timeLimit || "25 min"}</span>
                  </div>
                </div>
                {isActive && <Dot color={domain.color} pulse />}
              </div>

              {/* ELO impact + company */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                {m.company && m.company !== "Capabilio" ? (
                  <span style={{ fontSize: 8, color: T.ink4, fontWeight: 600 }}>🏢 {m.company}</span>
                ) : <span />}
                {m.eloGain > 0 && (
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#1A7A4A", background: "#E8F7EF", padding: "2px 8px", borderRadius: 99, fontFamily: "'DM Mono',monospace" }}>
                    +{m.eloGain} ELO
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ width: "100%", height: 3, borderRadius: 2, background: T.cream3, overflow: "hidden" }}>
                <div style={{
                  width: `${m.progress || 0}%`, height: "100%",
                  background: `linear-gradient(90deg, ${domain.color}, ${domain.color}80)`,
                  borderRadius: 2, transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN CONTEXT / REFERENCE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ContextPanel({ domain }) {
  const [open, setOpen] = useState(0)
  if (!domain?.contextPanelSections?.length) return null
  return (
    <div>
      <div style={{ padding: "10px 14px 6px", fontSize: 9, fontWeight: 800, color: T.ink4, letterSpacing: 2 }}>
        {domain.icon} {domain.label?.toUpperCase()} REFERENCE
      </div>
      {domain.contextPanelSections.map((s, i) => (
        <div key={i} style={{ borderTop: `1px solid ${T.border}` }}>
          <button onClick={() => setOpen(o => o === i ? -1 : i)} style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.ink2, display: "flex", gap: 5, alignItems: "center" }}><span>{s.icon}</span>{s.title}</span>
            <span style={{ fontSize: 8, color: T.ink4, transform: open === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
          </button>
          {open === i && (
            <div style={{ padding: "0 14px 10px" }}>
              <pre style={{ margin: 0, fontFamily: "'DM Mono',monospace", fontSize: 10, color: T.ink2, lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.content}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERABLES + RUBRIC PANEL
// ─────────────────────────────────────────────────────────────────────────────
function DeliverablesPanel({ domain, onSubmit, submitting }) {
  const [checklist, setChecklist] = useState({})
  const rubric = domain?.rubric || []
  const totalWeight = rubric.reduce((s, r) => s + r.weight, 0)
  const doneWeight  = rubric.filter(r => checklist[r.criterion]).reduce((s, r) => s + r.weight, 0)
  const readiness   = totalWeight > 0 ? Math.round((doneWeight / totalWeight) * 100) : 0
  const readyColor  = readiness >= 80 ? T.green : readiness >= 50 ? T.amber : T.indigo

  return (
    <div>
      <div style={{ padding: "10px 14px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: T.ink4, letterSpacing: 2 }}>RUBRIC</div>
        <span style={{ fontSize: 10, fontWeight: 800, color: readyColor }}>{readiness}% ready</span>
      </div>

      <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        {rubric.map((r, i) => (
          <div key={i} onClick={() => setChecklist(c => ({ ...c, [r.criterion]: !c[r.criterion] }))}
            style={{ padding: "7px 9px", borderRadius: 8, border: `1px solid ${checklist[r.criterion] ? T.green + "40" : T.border}`, background: checklist[r.criterion] ? T.green2 : T.cream, cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${checklist[r.criterion] ? T.green : T.border}`, background: checklist[r.criterion] ? T.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
                {checklist[r.criterion] && <span style={{ fontSize: 8, color: "#fff" }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: checklist[r.criterion] ? T.green : T.ink, display: "flex", justifyContent: "space-between" }}>
                  <span>{r.criterion}</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", color: T.ink4, fontSize: 9 }}>{r.weight}%</span>
                </div>
                <div style={{ fontSize: 9, color: T.ink4, lineHeight: 1.4, marginTop: 1 }}>{r.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: "0 12px 4px" }}>
        <div style={{ width: "100%", height: 3, borderRadius: 2, background: T.cream3 }}>
          <div style={{ width: `${readiness}%`, height: "100%", background: readyColor, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ padding: "8px 12px 14px" }}>
        <button onClick={onSubmit} disabled={submitting || readiness < 40}
          style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: readiness >= 40 ? (domain?.color || T.indigo) : "#475569", color: readiness >= 40 ? "#fff" : "#A8A29E", fontSize: 12, fontWeight: 700, cursor: readiness >= 40 ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "inherit" }}>
          {submitting ? <><Spinner color="#fff" size={11} />Evaluating...</> : "✦ Submit for Evaluation"}
        </button>
        {readiness < 40 && <div style={{ fontSize: 9, color: T.ink4, textAlign: "center", marginTop: 4 }}>Complete at least 40% of rubric criteria</div>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CODE EDITOR
// ─────────────────────────────────────────────────────────────────────────────
function CodeEditor({ value, onChange, sandbox, language, domainKey }) {
  const lineCount = (value || "").split("\n").length
  const isDark = true

  return (
    <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Toolbar */}
      <div style={{ padding: "7px 12px", background: "#1A1714", borderBottom: "1px solid rgba(0,0,0,0.03)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {["#EF4444", "#F59E0B", "#22C55E"].map((c, i) => <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ fontSize: 9, color: "#A8A29E", fontFamily: "'DM Mono',monospace", marginLeft: 4 }}>
          {sandbox === "sql" ? "SQL" : sandbox === "terminal" ? "bash" : sandbox === "notebook" ? "python" : sandbox === "markdown" ? "markdown" : sandbox === "react" ? "jsx" : sandbox === "diagram" ? "md" : language || "code"} · {lineCount} ln
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button onClick={() => navigator.clipboard?.writeText(value || "")} style={{ padding: "2px 7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#6B6560", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>copy</button>
          <button onClick={() => onChange("")} style={{ padding: "2px 7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, color: "#6B6560", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>clear</button>
        </div>
      </div>

      {/* Editor body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
        {/* Line numbers */}
        <div style={{ background: "#0B1120", padding: "10px 8px 10px 10px", color: "#D6D0C8", fontSize: 11, fontFamily: "'DM Mono',monospace", lineHeight: 1.65, userSelect: "none", minWidth: 38, textAlign: "right", overflowY: "hidden", flexShrink: 0 }}>
          {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea value={value || ""} onChange={e => onChange(e.target.value)}
          spellCheck={false}
          style={{ flex: 1, background: "#1A1714", color: "#E8E3DA", fontFamily: "'DM Mono','Fira Code',monospace", fontSize: 12.5, lineHeight: 1.65, padding: "10px 14px", border: "none", outline: "none", resize: "none", height: "100%", boxSizing: "border-box" }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE TABS
// ─────────────────────────────────────────────────────────────────────────────
function ModuleTabs({ modules, activeId, onSelect, color }) {
  return (
    <div style={{ display: "flex", background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, overflowX: "auto", scrollbarWidth: "none", flexShrink: 0 }}>
      {modules.map(m => {
        const isActive = activeId === m.id
        return (
          <button key={m.id} onClick={() => onSelect(m.id)}
            style={{ padding: "9px 13px", background: "none", border: "none", borderBottom: isActive ? `2.5px solid ${color}` : "2.5px solid transparent", color: isActive ? color : T.ink3, fontSize: 10, fontWeight: isActive ? 700 : 500, cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4, fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0 }}>
            <span style={{ fontSize: 12 }}>{m.icon}</span>
            <span>{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptyWorkstation({ domain, onStartMission }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: domain.colorBg, border: `2px solid ${domain.colorBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 12 }}>{domain.icon}</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginBottom: 5 }}>{domain.label} Workstation</div>
      <div style={{ fontSize: 11, color: T.ink3, marginBottom: 18, maxWidth: 260, lineHeight: 1.6 }}>Select a mission from the left panel. Your {domain.modules.length} workstation modules will activate.</div>
      <button onClick={onStartMission} style={{ padding: "9px 22px", background: domain.color, border: "none", borderRadius: 9, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        Browse Challenges →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION RESULT MODAL — premium redesign
// ─────────────────────────────────────────────────────────────────────────────
function EvaluationModal({ result, domain, onClose, userEmail }) {
  if (!result) return null

  const tier       = getTier(result.newElo || 0)
  const domColor   = domain?.color || T.indigo
  const score      = result.score || 0
  const eloGain    = result.eloGain || 0
  const grade      = result.grade  || (score >= 90 ? "A+" : score >= 80 ? "A" : score >= 70 ? "B+" : score >= 60 ? "B" : score >= 50 ? "C" : "D")
  const timedOut   = result.timedOut || false
  const isFlagged  = !!result.integrityFlag   // ← integrity violation

  const scoreColor = isFlagged ? "#B91C1C" : score >= 80 ? "#1A7A4A" : score >= 60 ? "#B8620A" : "#C0392B"
  const scoreGrad  = isFlagged
    ? "linear-gradient(135deg,#FEF2F2,#FFF1F1)"
    : score >= 80
      ? "linear-gradient(135deg,#E8F7EF,#F0FDF4)"
      : score >= 60
        ? "linear-gradient(135deg,#FEF3E2,#FFFBEB)"
        : "linear-gradient(135deg,#FDF0EF,#FEF2F2)"

  // Build rubric only when not flagged
  const rubric = isFlagged ? [] : (result.rubric?.length
    ? result.rubric
    : (domain?.rubric || []).map((r, i) => ({
        criterion: r.criterion,
        score: Math.min(98, Math.max(score - 5 + (i * 7 % 20) - 10, timedOut ? 15 : 35)),
      })))

  const wmLabel = userEmail || "capabilio.online"
  const wmDate  = new Date().toISOString().slice(0, 10)

  return (
    <div
      style={{ position:"fixed", inset:0, zIndex:900, background:"rgba(0,0,0,0.65)", backdropFilter:"blur(10px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}
    >
      <div
        style={{ background:"#FFFFFF", borderRadius:24, width:"100%", maxWidth:460, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.25)", fontFamily:"'DM Sans',sans-serif", position:"relative", userSelect:"none" }}
        onClick={e => e.stopPropagation()}
        onCopy={e => e.preventDefault()}
      >
        {/* Diagonal watermark — visible in screenshots, impossible to remove */}
        <div aria-hidden="true" style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden", borderRadius:24, zIndex:1 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              position:"absolute",
              left: "-20%", top: `${i * 14 - 10}%`,
              width:"160%",
              fontSize:11, fontWeight:700, letterSpacing:2,
              color:"rgba(0,0,0,0.055)",
              whiteSpace:"nowrap",
              transform:"rotate(-20deg)",
              fontFamily:"'DM Mono',monospace",
              userSelect:"none",
            }}>
              {`${wmLabel} · ${wmDate} · Capabilio Arena  `.repeat(4)}
            </div>
          ))}
        </div>

        {/* Actual modal content sits above watermark */}
        <div style={{ position:"relative", zIndex:2 }}>

        {/* ══ INTEGRITY FLAG HEADER (replaces normal header when cheating detected) ══ */}
        {isFlagged ? (() => {
          const cw           = result.cheatWarning || {}
          const warnCount    = cw.warningCount || 1
          const isBanned     = cw.isBanned || false
          const banUntil     = cw.banUntil  || null
          const eloPenalty   = cw.eloPenalty || -10
          const warnLeft     = Math.max(0, 3 - warnCount)
          const banDate      = banUntil ? new Date(banUntil).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" }) : null
          return (
          <>
            {/* ── Severity header ── */}
            <div style={{ padding:"20px 24px 16px", background: isBanned ? "linear-gradient(135deg,#1C0000,#2D0000)" : "linear-gradient(135deg,#FEF2F2,#FFF1F2)", borderBottom: isBanned ? "2px solid #7F1D1D" : "2px solid #FECACA" }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                {/* Badge */}
                <div style={{
                  width:64, height:64, borderRadius:"50%", flexShrink:0,
                  background: isBanned ? "#7F1D1D" : "#FEF2F2",
                  border: `3px solid ${isBanned ? "#DC2626" : "#DC2626"}`,
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  boxShadow: isBanned ? "0 0 0 6px #DC262640" : "0 0 0 6px #DC262618",
                }}>
                  <div style={{ fontSize: isBanned ? 22 : 11, fontWeight:900, color: isBanned ? "#FCA5A5" : "#DC2626", fontFamily:"'DM Mono',monospace", lineHeight:1, textAlign:"center" }}>
                    {isBanned ? "🔒" : "VOID"}
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:900, color: isBanned ? "#FCA5A5" : "#991B1B", marginBottom:4 }}>
                    {isBanned ? "🚫 Account Suspended" : "🚨 Integrity Violation Detected"}
                  </div>
                  <div style={{ fontSize:11, color: isBanned ? "#F87171" : "#B91C1C", lineHeight:1.55 }}>
                    {isBanned
                      ? <>Your account has been suspended for <strong>30 days</strong> due to repeated integrity violations. Access resumes on <strong>{banDate}</strong>.</>
                      : <>Your submission was not independently written. This is Warning <strong>#{warnCount} of 3</strong>. {warnLeft > 0 ? `${warnLeft} more violation${warnLeft > 1 ? "s" : ""} will result in a 30-day account suspension.` : "Next violation triggers a 30-day suspension."}</>
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* ── Warning progress bar ── */}
            {!isBanned && (
              <div style={{ padding:"10px 24px 0", background:"#FEF2F2" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:"#991B1B", letterSpacing:1 }}>WARNING LEVEL</span>
                  <span style={{ marginLeft:"auto", fontSize:10, fontWeight:900, color:"#DC2626", fontFamily:"'DM Mono',monospace" }}>
                    {warnCount} / 3
                  </span>
                </div>
                <div style={{ height:6, borderRadius:99, background:"#FECACA", overflow:"hidden", marginBottom:10 }}>
                  <div style={{ width:`${(warnCount/3)*100}%`, height:"100%", background: warnCount >= 2 ? "#DC2626" : "#F87171", borderRadius:99, transition:"width 0.6s ease" }} />
                </div>
              </div>
            )}

            {/* ── Stats strip: score | ELO penalty | warning count ── */}
            <div style={{ display:"flex", borderBottom:`1px solid #FECACA` }}>
              {[
                { label:"SCORE",       value:"0",               unit:"/100",                         color:"#DC2626", bg:"#FEF2F2" },
                { label:"ELO PENALTY", value:`${eloPenalty}`,   unit:"pts deducted",                 color:"#7C2D12", bg:"#FFF7ED" },
                { label:"WARNING",     value:`#${warnCount}`,   unit: isBanned ? "BANNED" : "of 3", color: isBanned ? "#DC2626" : "#B45309", bg: isBanned ? "#FEF2F2" : "#FFFBEB" },
              ].map((s,i) => (
                <div key={i} style={{ flex:1, padding:"14px 10px", textAlign:"center", borderRight: i < 2 ? `1px solid #FECACA` : "none", background:s.bg }}>
                  <div style={{ fontSize:22, fontWeight:900, color:s.color, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:8, color:s.color, fontWeight:700, marginTop:3, letterSpacing:0.8, textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontSize:9, color:s.color+"99", marginTop:1 }}>{s.unit}</div>
                </div>
              ))}
            </div>

            {/* ── Detailed breakdown ── */}
            <div style={{ padding:"16px 22px" }}>

              {/* What exactly was detected */}
              <div style={{ padding:"12px 14px", background:"#FFF1F2", border:"1.5px solid #FECACA", borderRadius:12, marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:800, color:"#991B1B", letterSpacing:1.5, marginBottom:8 }}>🔍 WHAT OUR SYSTEM DETECTED</div>
                {(result.integrityFlags || []).map((f, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:7, marginBottom:6 }}>
                    <span style={{ fontSize:10, color:"#DC2626", flexShrink:0, marginTop:1 }}>⚑</span>
                    <div>
                      <div style={{ fontSize:10, fontWeight:700, color:"#991B1B" }}>{f.code.replace(/_/g," ")}</div>
                      <div style={{ fontSize:9.5, color:"#B91C1C" }}>{f.msg}</div>
                    </div>
                  </div>
                ))}
                {/* Raw behavioral numbers */}
                <div style={{ marginTop:8, paddingTop:8, borderTop:"1px solid #FECACA", display:"flex", gap:12, flexWrap:"wrap" }}>
                  <span style={{ fontSize:9.5, color:"#B91C1C" }}>⏱ {Math.floor((result.behavioral?.timeOnTaskSecs||0)/60)}m {(result.behavioral?.timeOnTaskSecs||0)%60}s on task</span>
                  <span style={{ fontSize:9.5, color:"#B91C1C" }}>⌨️ {result.behavioral?.keystrokeCount||0} keystroke(s)</span>
                  <span style={{ fontSize:9.5, color:"#B91C1C" }}>📋 {result.behavioral?.pasteCount||0} paste event(s)</span>
                </div>
              </div>

              {/* What happens next (honest and constructive) */}
              <div style={{ padding:"12px 14px", background:"#F8F8F5", border:"1px solid rgba(0,0,0,0.08)", borderRadius:12, marginBottom:12 }}>
                <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1.5, marginBottom:6 }}>HOW TO EARN REAL ELO</div>
                {(result.improvements || []).map((s,i) => (
                  <div key={i} style={{ fontSize:11, color:T.ink2, lineHeight:1.55, marginBottom:4, display:"flex", gap:6, alignItems:"flex-start" }}>
                    <span style={{ color:domColor, flexShrink:0 }}>→</span> {s}
                  </div>
                ))}
              </div>

              {isBanned ? (
                <div style={{ padding:"12px 14px", background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:12, marginBottom:12, textAlign:"center" }}>
                  <div style={{ fontSize:13, fontWeight:900, color:"#DC2626", marginBottom:4 }}>🔒 Account Suspended</div>
                  <div style={{ fontSize:11, color:"#B91C1C", lineHeight:1.6 }}>
                    Your account access is suspended until <strong>{banDate}</strong>.<br />
                    Contact <strong>support@capabilio.online</strong> if you believe this is an error.
                  </div>
                </div>
              ) : (
                <button onClick={onClose} style={{ width:"100%", padding:"13px", background:"#DC2626", border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                  I understand — Try Again Honestly →
                </button>
              )}
            </div>
          </>
          )
        })() : (
          <>
            {/* ══ NORMAL HEADER ══ */}
            <div style={{ padding:"22px 24px 18px", background: scoreGrad, borderBottom:`1px solid ${scoreColor}20` }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <div style={{
                  width:64, height:64, borderRadius:"50%", flexShrink:0,
                  background:"#FFFFFF", border:`3px solid ${scoreColor}`,
                  display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  boxShadow:`0 0 0 6px ${scoreColor}18`,
                }}>
                  <div style={{ fontSize:22, fontWeight:900, color:scoreColor, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{grade}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:T.ink, marginBottom:3, letterSpacing:-0.3 }}>
                    {timedOut ? "Time's Up — Partial Review" : score >= 80 ? "Mission Complete! 🏆" : score >= 60 ? "Mission Passed ✅" : "Mission Reviewed 📝"}
                  </div>
                  <div style={{ fontSize:11, color:T.ink3, lineHeight:1.5 }}>
                    {result.summary || (timedOut ? "Partial score awarded for work completed." : "Your submission has been evaluated.")}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Score + ELO + Tier strip ── */}
            <div style={{ display:"flex", borderBottom:`1px solid ${T.border}` }}>
              {[
                { label:"SCORE",     value: score,         unit:"/100", color: scoreColor,   bg: scoreColor+"10",   mono:true  },
                { label:"ELO GAINED",value: `+${eloGain}`, unit:"pts",  color: "#1A7A4A",    bg: "#E8F7EF",         mono:true  },
                { label:"TIER",      value: tier.icon,     unit: tier.label, color:tier.color, bg:tier.color+"12", mono:false },
              ].map((s,i) => (
                <div key={i} style={{ flex:1, padding:"14px 10px", textAlign:"center", borderRight: i < 2 ? `1px solid ${T.border}` : "none", background:s.bg }}>
                  <div style={{ fontSize: s.mono ? 22 : 24, fontWeight:900, color:s.color, fontFamily: s.mono ? "'DM Mono',monospace" : "inherit", lineHeight:1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize:8, color:s.color, fontWeight:700, marginTop:3, letterSpacing:0.8, textTransform:"uppercase" }}>{s.label}</div>
                  <div style={{ fontSize:9, color:T.ink4, marginTop:1 }}>{s.unit}</div>
                </div>
              ))}
            </div>

            {/* ── Rubric breakdown ── */}
            <div style={{ padding:"16px 22px" }}>
              <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:2, marginBottom:12 }}>RUBRIC BREAKDOWN</div>
              <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                {rubric.map((r,i) => {
                  const rc = r.score >= 70 ? "#1A7A4A" : r.score >= 50 ? "#B8620A" : "#C0392B"
                  return (
                    <div key={i}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:T.ink2 }}>{r.criterion}</span>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:28, height:28, borderRadius:"50%", background:rc+"15", border:`2px solid ${rc}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <span style={{ fontSize:9, fontWeight:900, color:rc, fontFamily:"'DM Mono',monospace" }}>{r.score}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ height:5, borderRadius:99, background:T.cream3, overflow:"hidden" }}>
                        <div style={{ width:`${r.score}%`, height:"100%", background:`linear-gradient(90deg,${rc},${rc}80)`, borderRadius:99, transition:"width 0.8s ease" }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* ── Validation check breakdown (shown when checks ran) ── */}
              {result.validationTotal > 0 && (
                <div style={{ marginTop:14, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden" }}>
                  <div style={{ padding:"8px 14px", background:T.bg2, borderBottom:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1.5, textTransform:"uppercase" }}>🎯 Validation Results</span>
                    <span style={{ fontSize:10, fontWeight:800, fontFamily:"'DM Mono',monospace", color: result.validationPassCount === result.validationTotal ? T.green : T.amber }}>
                      {result.validationPassCount}/{result.validationTotal} passing
                    </span>
                  </div>
                  {(result.validationChecks || []).map((v, i) => (
                    <div key={i} style={{ padding:"8px 14px", borderBottom: i < (result.validationChecks.length-1) ? `1px solid ${T.border}` : "none", background: v.passed ? "#F0FDF4" : "#FEF2F2" }}>
                      <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                        <span style={{ fontSize:12, flexShrink:0, marginTop:1 }}>{v.passed ? "✅" : "❌"}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:11, fontWeight:700, color: v.passed ? "#15803D" : "#DC2626" }}>{v.input}</div>
                          {!v.passed && v.actual && (
                            <div style={{ fontSize:10, color:"#B91C1C", marginTop:3, lineHeight:1.4, fontFamily:"'DM Mono',monospace", wordBreak:"break-word" }}>
                              {String(v.actual).slice(0, 200)}
                            </div>
                          )}
                          {!v.passed && v.expected && (
                            <div style={{ fontSize:10, color:T.ink4, marginTop:2 }}>Expected: <span style={{ fontFamily:"'DM Mono',monospace", color:T.ink3 }}>{String(v.expected).slice(0,100)}</span></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {result.validationsRun > 0 && (
                    <div style={{ padding:"6px 14px", background:T.bg, borderTop:`1px solid ${T.border}`, fontSize:9.5, color:T.ink4 }}>
                      Validate was run <strong style={{ color:T.ink3 }}>{result.validationsRun}</strong> time{result.validationsRun > 1 ? "s" : ""} before submitting
                    </div>
                  )}
                </div>
              )}

              {/* AI Feedback */}
              {(result.feedback || result.summary || result.tip) && (
                <div style={{ marginTop:14, padding:"12px 14px", background:domColor+"08", border:`1px solid ${domColor}20`, borderRadius:12 }}>
                  <div style={{ fontSize:9, fontWeight:800, color:domColor, letterSpacing:1.5, marginBottom:6 }}>🤖 AI FEEDBACK</div>
                  <div style={{ fontSize:12, color:T.ink2, lineHeight:1.75, marginBottom: result.tip ? 8 : 0 }}>{result.summary || result.feedback}</div>
                  {result.tip && result.tip !== result.summary && (
                    <div style={{ fontSize:11, color:T.ink3, fontStyle:"italic", paddingTop:6, borderTop:`1px solid ${domColor}15` }}>💡 {result.tip}</div>
                  )}
                </div>
              )}

              {/* Behavioral insight */}
              {result.behavioral && (result.behavioral.pasteCount > 0 || result.behavioral.timeOnTaskSecs > 0) && (
                <div style={{ marginTop:10, padding:"10px 12px", background:"#F8F8F5", border:"1px solid rgba(26,26,24,0.08)", borderRadius:10 }}>
                  <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1.2, marginBottom:6, textTransform:"uppercase" }}>📊 Submission Signals</div>
                  <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                    {result.behavioral.timeOnTaskSecs > 0 && (
                      <div style={{ fontSize:10, color:T.ink3 }}>⏱ <strong style={{ color:T.ink2 }}>{Math.floor(result.behavioral.timeOnTaskSecs/60)}m {result.behavioral.timeOnTaskSecs%60}s</strong> on task</div>
                    )}
                    {result.behavioral.keystrokeCount > 0 && (
                      <div style={{ fontSize:10, color:T.ink3 }}>⌨️ <strong style={{ color:T.ink2 }}>{result.behavioral.keystrokeCount}</strong> keystrokes</div>
                    )}
                    {result.behavioral.pasteCount > 0 && (
                      <div style={{ fontSize:10, color:T.ink3 }}>📋 <strong style={{ color:T.ink2 }}>{result.behavioral.pasteCount}</strong> paste{result.behavioral.pasteCount > 1 ? "s" : ""}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Strengths + Improvements */}
              {(result.strengths?.length > 0 || result.improvements?.length > 0) && (
                <div style={{ display:"flex", gap:10, marginTop:10 }}>
                  {result.strengths?.length > 0 && (
                    <div style={{ flex:1, padding:"10px 12px", background:"#F0FDF4", borderRadius:10, border:"1px solid #BBF7D0" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#166534", letterSpacing:1, marginBottom:5 }}>✓ STRENGTHS</div>
                      {result.strengths.slice(0,3).map((s,i) => <div key={i} style={{ fontSize:10, color:"#15803d", marginBottom:3, lineHeight:1.4 }}>• {s}</div>)}
                    </div>
                  )}
                  {result.improvements?.length > 0 && (
                    <div style={{ flex:1, padding:"10px 12px", background:"#FFFBEB", borderRadius:10, border:"1px solid #FDE68A" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#92400e", letterSpacing:1, marginBottom:5 }}>→ WHAT WENT WRONG</div>
                      {result.improvements.slice(0,4).map((s,i) => <div key={i} style={{ fontSize:10, color:"#78350f", marginBottom:4, lineHeight:1.45 }}>• {s}</div>)}
                    </div>
                  )}
                </div>
              )}

              <button onClick={onClose} style={{ width:"100%", marginTop:16, padding:"13px", background:domColor, border:"none", borderRadius:12, color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit", letterSpacing:-0.2, userSelect:"none" }}>
                View in History →
              </button>
            </div>
          </>
        )}
        </div>{/* end zIndex:2 content wrapper */}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY PANEL — full mission transparency, reads arenaHistory subcollection
// ─────────────────────────────────────────────────────────────────────────────
// HISTORY DETAIL MODAL — full-screen popup for a history record
// ─────────────────────────────────────────────────────────────────────────────
function HistoryDetailModal({ r, domain, onClose }) {
  const score   = r.score ?? r.review?.score ?? 0
  const elo     = r.eloDelta ?? r.review?.eloDelta ?? 0
  const grade   = r.review?.grade || r.grade || ""
  const diff    = r.difficulty || "Medium"
  const diffColor = diff === "Easy" ? "#16A34A" : diff === "Hard" ? "#DC2626" : "#D97706"
  const sc  = s => s >= 80 ? "#16A34A" : s >= 60 ? "#D97706" : "#DC2626"
  const sbg = s => s >= 80 ? "#f0fdf4" : s >= 60 ? "#fffbeb" : "#fef2f2"
  const domColor = domain?.color || T.indigo

  const answerStr = r.submittedAnswer
    ? (typeof r.submittedAnswer === "object" ? JSON.stringify(r.submittedAnswer, null, 2) : r.submittedAnswer)
    : null

  const dateStr = r.completedAt
    ? new Date(r.completedAt).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })
      + " · " + new Date(r.completedAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })
    : ""

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div onClick={onClose}
      style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,0.72)", backdropFilter:"blur(8px)",
        display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'DM Sans',sans-serif" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:20, width:"100%", maxWidth:740,
          maxHeight:"92vh", overflowY:"auto", boxShadow:"0 40px 120px rgba(0,0,0,0.5)", display:"flex", flexDirection:"column" }}>

        {/* Header */}
        <div style={{ padding:"18px 22px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"flex-start", gap:14, flexShrink:0 }}>
          {/* Score circle */}
          <div style={{ width:52, height:52, borderRadius:"50%", background:sbg(score), border:`3px solid ${sc(score)}`,
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:14, fontWeight:900, color:sc(score), fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{score}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.ink, marginBottom:5, lineHeight:1.3 }}>
              {r.title || "Arena Mission"}
              {r.isMultiWorkstation && <span style={{ marginLeft:8, fontSize:10, fontWeight:800, background:domColor+"18", color:domColor, padding:"2px 7px", borderRadius:99 }}>MULTI-WS</span>}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              <span style={{ fontSize:10, fontWeight:800, color:diffColor }}>{diff}</span>
              {r.skillTags?.map((tag, i) => (
                <span key={i} style={{ fontSize:9, fontWeight:600, background:T.cream2, color:T.ink3, padding:"1px 7px", borderRadius:99, border:`1px solid ${T.border}` }}>{tag}</span>
              ))}
              {dateStr && <span style={{ fontSize:10, color:T.ink4 }}>📅 {dateStr}</span>}
            </div>
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center", flexShrink:0 }}>
            {grade && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:26, fontWeight:900, color:sc(score), fontFamily:"monospace", lineHeight:1 }}>{grade}</div>
                <div style={{ fontSize:9, color:T.ink4, marginTop:1 }}>GRADE</div>
              </div>
            )}
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, fontWeight:900, color:elo>=0?"#16A34A":"#DC2626", fontFamily:"monospace", lineHeight:1 }}>{elo>=0?"+":""}{elo}</div>
              <div style={{ fontSize:9, color:T.ink4, marginTop:1 }}>ELO</div>
            </div>
            <button onClick={onClose}
              style={{ width:30, height:30, borderRadius:"50%", background:T.cream2, border:`1px solid ${T.border}`,
                color:T.ink3, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"inherit" }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:"18px 22px", display:"flex", flexDirection:"column", gap:18 }}>

          {/* Multi-workstation steps */}
          {r.isMultiWorkstation && r.workstations?.length > 0 && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:T.ink4, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>🔀 Workstation Steps</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {r.workstations.map((ws, wi) => (
                  <span key={wi} style={{ fontSize:10, fontWeight:700, background:domColor+"15", color:domColor, padding:"3px 10px", borderRadius:99, border:`1px solid ${domColor}30` }}>
                    Step {wi+1}: {ws.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scenario */}
          {r.scenario && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:domColor, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>📋 Challenge Scenario</div>
              <div style={{ fontSize:12.5, color:T.ink2, lineHeight:1.8, background:T.cream, padding:"12px 16px",
                borderRadius:10, border:`1px solid ${T.border}`, whiteSpace:"pre-wrap" }}>
                {r.scenario}
              </div>
            </div>
          )}

          {/* Objective */}
          {r.objective && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:"#D97706", textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>🎯 Objective</div>
              <div style={{ fontSize:12.5, color:T.ink2, lineHeight:1.8, background:T.cream, padding:"12px 16px",
                borderRadius:10, border:`1px solid ${T.border}` }}>
                {r.objective}
              </div>
            </div>
          )}

          {/* Submitted solution — FULL, no truncation */}
          {answerStr && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:"#2563EB", textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>
                💻 Your Submitted Solution <span style={{ fontSize:8, color:T.ink4, fontWeight:600, textTransform:"none" }}>({answerStr.length.toLocaleString()} chars)</span>
              </div>
              <pre style={{ margin:0, fontSize:11, color:"#E8E3DA", background:"#0B1120",
                padding:"14px 16px", borderRadius:10, border:`1px solid ${T.border}`,
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'DM Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:360, overflowY:"auto" }}>
                {answerStr}
              </pre>
            </div>
          )}

          {/* Expected output */}
          {r.expectedOutput && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:"#16A34A", textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>✅ Expected Output</div>
              <pre style={{ margin:0, fontSize:11, color:T.ink2, background:"#f0fdf4",
                padding:"12px 16px", borderRadius:10, border:"1px solid #bbf7d0",
                whiteSpace:"pre-wrap", wordBreak:"break-word", fontFamily:"'DM Mono','DM Mono',monospace",
                lineHeight:1.65, maxHeight:180, overflowY:"auto" }}>
                {r.expectedOutput}
              </pre>
            </div>
          )}

          {/* AI Review */}
          {(r.review?.summary || r.review?.strengths?.length || r.review?.improvements?.length) && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:"#7C3AED", textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>🤖 AI Feedback</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {r.review?.summary && (
                  <div style={{ fontSize:12.5, color:T.ink2, lineHeight:1.8, background:"#f5f3ff",
                    padding:"12px 16px", borderRadius:10, border:"1px solid rgba(124,58,237,0.15)", borderLeft:"3px solid #7C3AED" }}>
                    {r.review.summary}
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {r.review?.strengths?.length > 0 && (
                    <div style={{ padding:"10px 12px", background:"#f0fdf4", borderRadius:10, border:"1px solid #bbf7d0" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#166534", letterSpacing:"0.7px", marginBottom:6 }}>✓ STRENGTHS</div>
                      {r.review.strengths.map((s, j) => <p key={j} style={{ margin:"3px 0 0", fontSize:11, color:"#15803d", lineHeight:1.5 }}>• {s}</p>)}
                    </div>
                  )}
                  {r.review?.improvements?.length > 0 && (
                    <div style={{ padding:"10px 12px", background:"#fffbeb", borderRadius:10, border:"1px solid #fde68a" }}>
                      <div style={{ fontSize:9, fontWeight:800, color:"#92400e", letterSpacing:"0.7px", marginBottom:6 }}>→ IMPROVEMENTS</div>
                      {r.review.improvements.map((s, j) => <p key={j} style={{ margin:"3px 0 0", fontSize:11, color:"#92400e", lineHeight:1.5 }}>• {s}</p>)}
                    </div>
                  )}
                </div>
                {r.review?.tip && (
                  <div style={{ padding:"10px 14px", background:"#fffbeb", borderRadius:10, border:"1px solid #fde68a", fontSize:12, color:"#92400e", lineHeight:1.6 }}>
                    💡 {r.review.tip}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Per-workstation feedback */}
          {r.review?.workstationFeedback && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:T.ink4, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>🔀 Workstation Feedback</div>
              {Object.entries(r.review.workstationFeedback).map(([ws, fb]) => (
                <div key={ws} style={{ marginBottom:8, padding:"10px 14px", background:T.cream, borderRadius:10, border:`1px solid ${T.border}` }}>
                  <div style={{ fontSize:10, fontWeight:800, color:domColor, marginBottom:4 }}>{ws.toUpperCase()}</div>
                  <p style={{ margin:0, fontSize:12, color:T.ink2, lineHeight:1.6 }}>{fb}</p>
                </div>
              ))}
            </div>
          )}

          {/* Rubric */}
          {r.rubric?.length > 0 && (
            <div>
              <div style={{ fontSize:9, fontWeight:800, color:T.ink4, textTransform:"uppercase", letterSpacing:1.2, marginBottom:8 }}>📊 Rubric Breakdown</div>
              {r.rubric.map((rb, j) => (
                <div key={j} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11, color:T.ink2 }}>{rb.criterion}</span>
                    <span style={{ fontSize:11, fontWeight:700, color:sc(rb.score), fontFamily:"'DM Mono',monospace" }}>{rb.score}%</span>
                  </div>
                  <div style={{ height:4, borderRadius:2, background:T.cream3 }}>
                    <div style={{ width:`${rb.score}%`, height:"100%", background:sc(rb.score), borderRadius:2 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function HistoryPanel({ uid, domain }) {
  const [records, setRecords]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter]     = useState("all")   // all | Easy | Medium | Hard | multi
  const [modalRec, setModalRec] = useState(null)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    const unsub = arenaDb.subscribeHistory(uid, (docs) => {
      setRecords([...docs].sort((a, b) => new Date(b.completedAt||b.submitted_at) - new Date(a.completedAt||a.submitted_at)))
      setLoading(false)
    })
    return () => unsub()
  }, [uid])

  const sc  = s => s >= 80 ? "#16A34A" : s >= 60 ? "#D97706" : "#DC2626"
  const sbg = s => s >= 80 ? "#f0fdf4" : s >= 60 ? "#fffbeb" : "#fef2f2"

  // Stats derived from all records (not filtered)
  const totalElo  = records.reduce((sum, r) => sum + (r.eloDelta ?? r.review?.eloDelta ?? 0), 0)
  const avgScore  = records.length ? Math.round(records.reduce((s, r) => s + (r.score ?? r.review?.score ?? 0), 0) / records.length) : 0
  const multiCount = records.filter(r => r.isMultiWorkstation).length

  const filtered = filter === "all"   ? records
    : filter === "multi" ? records.filter(r => r.isMultiWorkstation)
    : records.filter(r => (r.difficulty || "").toLowerCase() === filter.toLowerCase())

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:120 }}>
      <Spinner size={16} color={domain?.color || T.indigo} />
    </div>
  )

  if (!records.length) return (
    <div style={{ padding:"32px 16px", textAlign:"center" }}>
      <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
      <div style={{ fontSize:12, fontWeight:700, color:T.ink }}>No completed missions yet</div>
      <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>Submit a mission to see your history here</div>
    </div>
  )

  const FILTERS = [
    { id:"all",    label:"All" },
    { id:"Easy",   label:"Easy" },
    { id:"Medium", label:"Med" },
    { id:"Hard",   label:"Hard" },
    { id:"multi",  label:"🔀 Multi" },
  ]

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {/* ── Stats bar ── */}
      <div style={{ padding:"10px 12px 8px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6 }}>
          {[
            { label:"Missions", value: records.length,   color: T.ink },
            { label:"Avg Score",value: avgScore + "%",   color: avgScore >= 80 ? "#16A34A" : avgScore >= 60 ? "#D97706" : "#DC2626" },
            { label:"ELO Gain", value: (totalElo >= 0 ? "+" : "") + totalElo, color: totalElo >= 0 ? "#16A34A" : "#DC2626" },
            { label:"Multi-WS", value: multiCount,       color: domain?.color || T.indigo },
          ].map(s => (
            <div key={s.label} style={{ background:T.cream, borderRadius:8, padding:"6px 8px", textAlign:"center" }}>
              <div style={{ fontSize:12, fontWeight:800, color:s.color, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:8, color:T.ink4, marginTop:2, letterSpacing:"0.5px" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display:"flex", gap:4, marginTop:8 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilter(f.id); setExpanded(null) }}
              style={{ padding:"3px 9px", borderRadius:99, border:`1px solid ${filter===f.id ? (domain?.color||T.indigo) : T.border}`,
                background: filter===f.id ? (domain?.color||T.indigo) : "transparent",
                color: filter===f.id ? "#fff" : T.ink3,
                fontSize:9, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft:"auto", fontSize:9, color:T.ink4, alignSelf:"center" }}>{filtered.length} shown</span>
        </div>
      </div>

      {/* ── Record list ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"8px 10px", display:"flex", flexDirection:"column", gap:8 }}>
        {!filtered.length && (
          <div style={{ padding:"24px 0", textAlign:"center", fontSize:10, color:T.ink4 }}>No missions match this filter</div>
        )}
        {filtered.map((r, i) => {
          const isOpen = expanded === i
          const score  = r.score ?? r.review?.score ?? 0
          const elo    = r.eloDelta ?? r.review?.eloDelta ?? 0
          const grade  = r.review?.grade || r.grade || ""
          const date   = r.completedAt ? new Date(r.completedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : ""
          const diff   = r.difficulty || "Medium"
          const diffColor = diff === "Easy" ? "#16A34A" : diff === "Hard" ? "#DC2626" : "#D97706"
          return (
            <div key={r.id} style={{ borderRadius:10, border:`1px solid ${isOpen ? (domain?.color||T.indigo)+"40" : T.border}`, overflow:"hidden", background:"#FFFFFF" }}>
              {/* Header row */}
              <button onClick={() => setExpanded(isOpen ? null : i)}
                style={{ width:"100%", padding:"10px 12px", background:"none", border:"none", cursor:"pointer", display:"flex", alignItems:"center", gap:10, textAlign:"left", fontFamily:"inherit" }}>
                {/* Score circle */}
                <div style={{ width:36, height:36, borderRadius:"50%", background:sbg(score), border:`2px solid ${sc(score)}`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:800, color:sc(score), fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{score}</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    <span style={{ fontSize:10, fontWeight:700, color:T.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:110 }}>{r.title || "Arena Mission"}</span>
                    {r.isMultiWorkstation && <span style={{ fontSize:8, fontWeight:800, background:(domain?.color||T.indigo)+"18", color:domain?.color||T.indigo, padding:"1px 5px", borderRadius:99, flexShrink:0 }}>MULTI</span>}
                  </div>
                  <div style={{ fontSize:9, color:T.ink4, marginTop:1, display:"flex", gap:4, alignItems:"center" }}>
                    <span style={{ color:diffColor, fontWeight:700 }}>{diff}</span>
                    <span>·</span>
                    <span>{date}</span>
                    {r.skillTags?.length > 0 && <><span>·</span><span style={{ color:domain?.color||T.indigo }}>{r.skillTags[0]}</span></>}
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2, flexShrink:0 }}>
                  {grade && <span style={{ fontSize:9, fontWeight:800, color:sc(score), background:sbg(score), padding:"1px 6px", borderRadius:99 }}>{grade}</span>}
                  <span style={{ fontSize:9, fontWeight:700, color: elo>=0 ? "#16A34A" : "#DC2626", fontFamily:"'DM Mono',monospace" }}>{elo>=0?"+":""}{elo} ELO</span>
                </div>
                <span style={{ fontSize:10, color:T.ink4 }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div style={{ borderTop:`1px solid ${T.border}`, padding:"12px 14px", display:"flex", flexDirection:"column", gap:10, background:"#fafaf9" }}>

                  {/* Multi-WS workstation breakdown */}
                  {r.isMultiWorkstation && r.workstations?.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {r.workstations.map((ws, wi) => (
                        <span key={wi} style={{ fontSize:8, fontWeight:700, background:(domain?.color||T.indigo)+"15", color:domain?.color||T.indigo, padding:"2px 8px", borderRadius:99, border:`1px solid ${domain?.color||T.indigo}30` }}>
                          Step {wi+1}: {ws.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Skill tags */}
                  {r.skillTags?.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {r.skillTags.map((tag, ti) => (
                        <span key={ti} style={{ fontSize:8, fontWeight:600, background:T.cream2, color:T.ink3, padding:"2px 7px", borderRadius:99, border:`1px solid ${T.border}` }}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Scenario + Objective */}
                  {(r.scenario || r.objective) && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {[["📋 SCENARIO", r.scenario], ["🎯 OBJECTIVE", r.objective]].map(([lbl, val]) => val ? (
                        <div key={lbl} style={{ padding:"10px 12px", background:T.cream, borderRadius:8, border:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:9, fontWeight:800, color:domain?.color||T.indigo, letterSpacing:"0.7px", marginBottom:4 }}>{lbl}</div>
                          <p style={{ margin:0, fontSize:10, color:T.ink2, lineHeight:1.6 }}>{val}</p>
                        </div>
                      ) : null)}
                    </div>
                  )}

                  {/* Expected output */}
                  {r.expectedOutput && (
                    <div style={{ padding:"10px 12px", background:T.cream, borderRadius:8, border:`1px solid ${T.border}` }}>
                      <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:"0.7px", marginBottom:4 }}>✅ EXPECTED OUTPUT</div>
                      <p style={{ margin:0, fontSize:10, color:T.ink2, lineHeight:1.6 }}>{r.expectedOutput}</p>
                    </div>
                  )}

                  {/* Your submission */}
                  {r.submittedAnswer && (
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:"0.7px", marginBottom:5 }}>💻 YOUR SOLUTION</div>
                      <pre style={{ margin:0, background:T.ink, borderRadius:8, padding:"10px 12px", fontFamily:"'DM Mono',monospace", fontSize:10, color:"#e2e8f0", lineHeight:1.6, maxHeight:160, overflowY:"auto", whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                        {typeof r.submittedAnswer === "object" ? JSON.stringify(r.submittedAnswer, null, 2) : r.submittedAnswer}
                      </pre>
                    </div>
                  )}

                  {/* Multi-ws per-workstation feedback */}
                  {r.review?.workstationFeedback && (
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:"0.7px", marginBottom:6 }}>🔀 WORKSTATION FEEDBACK</div>
                      {Object.entries(r.review.workstationFeedback).map(([ws, fb]) => (
                        <div key={ws} style={{ marginBottom:6, padding:"8px 10px", background:"#f8f8f6", borderRadius:8, border:`1px solid ${T.border}` }}>
                          <div style={{ fontSize:9, fontWeight:800, color:domain?.color||T.indigo, marginBottom:3 }}>{ws.toUpperCase()}</div>
                          <p style={{ margin:0, fontSize:10, color:T.ink2, lineHeight:1.5 }}>{fb}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI feedback */}
                  {(r.review?.summary || r.review?.strengths?.length || r.review?.improvements?.length) && (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      <div style={{ padding:"10px 12px", background:"#f0fdf4", borderRadius:8, border:"1px solid #bbf7d0" }}>
                        <div style={{ fontSize:9, fontWeight:800, color:"#166534", letterSpacing:"0.7px", marginBottom:4 }}>🤖 AI FEEDBACK</div>
                        <p style={{ margin:0, fontSize:10, color:"#15803d", lineHeight:1.6 }}>{r.review?.summary || "—"}</p>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {r.review?.strengths?.length > 0 && (
                          <div style={{ padding:"8px 10px", background:"#f0fdf4", borderRadius:8, border:"1px solid #bbf7d0" }}>
                            <div style={{ fontSize:9, fontWeight:800, color:"#166534", letterSpacing:"0.7px", marginBottom:3 }}>✓ STRENGTHS</div>
                            {r.review.strengths.slice(0,2).map((s,j) => <p key={j} style={{ margin:"2px 0 0", fontSize:9, color:"#15803d" }}>• {s}</p>)}
                          </div>
                        )}
                        {r.review?.improvements?.length > 0 && (
                          <div style={{ padding:"8px 10px", background:"#fffbeb", borderRadius:8, border:"1px solid #fde68a" }}>
                            <div style={{ fontSize:9, fontWeight:800, color:"#92400e", letterSpacing:"0.7px", marginBottom:3 }}>→ IMPROVE</div>
                            {r.review.improvements.slice(0,2).map((s,j) => <p key={j} style={{ margin:"2px 0 0", fontSize:9, color:"#92400e" }}>• {s}</p>)}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tip */}
                  {r.review?.tip && (
                    <div style={{ padding:"8px 12px", background:"#fffbeb", borderRadius:8, border:"1px solid #fde68a", fontSize:10, color:"#92400e", lineHeight:1.6 }}>
                      💡 {r.review.tip}
                    </div>
                  )}

                  {/* Rubric */}
                  {r.rubric?.length > 0 && (
                    <div>
                      <div style={{ fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:"0.7px", marginBottom:6 }}>📊 RUBRIC</div>
                      {r.rubric.map((rb, j) => (
                        <div key={j} style={{ marginBottom:5 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                            <span style={{ fontSize:9, color:T.ink2 }}>{rb.criterion}</span>
                            <span style={{ fontSize:9, fontWeight:700, color:sc(rb.score), fontFamily:"'DM Mono',monospace" }}>{rb.score}%</span>
                          </div>
                          <div style={{ height:3, borderRadius:2, background:T.cream3 }}>
                            <div style={{ width:`${rb.score}%`, height:"100%", background:sc(rb.score), borderRadius:2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View Full Details button */}
                  <button onClick={() => setModalRec(r)}
                    style={{ alignSelf:"flex-end", padding:"5px 14px", background:"transparent",
                      border:`1px solid ${domain?.color||T.indigo}`, borderRadius:6, color:domain?.color||T.indigo,
                      fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                    View Full Details →
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Full-screen detail modal */}
      {modalRec && <HistoryDetailModal r={modalRec} domain={domain} onClose={() => setModalRec(null)} />}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD WIDGET — live Firestore reads from arenaLeaderboard collection
// ─────────────────────────────────────────────────────────────────────────────
function LeaderboardWidget({ domain, domainKey, uid, elo: myElo, fullPage = false }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [myEntry, setMyEntry] = useState(null)

  useEffect(() => {
    if (!domainKey) { setLoading(false); return }
    setLoading(true)
    const unsub = arenaDb.subscribeLeaderboard(domainKey, (list) => {
      setEntries(list.map((e, i) => ({ ...e, rank: i + 1 })))
      setLoading(false)
    })
    return () => unsub()
  }, [domainKey])

  useEffect(() => {
    if (!uid || !domainKey) return
    arenaDb.getLeaderboardEntry(uid, domainKey).then(e => { if (e) setMyEntry(e) })
  }, [uid, domainKey])

  const medal = ["🥇","🥈","🥉"]
  const inTop10 = entries.some(e => e.uid === uid)

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:120 }}>
      <Spinner size={16} color={domain?.color || T.indigo} />
    </div>
  )

  if (!entries.length) return (
    <div style={{ padding:"32px 16px", textAlign:"center" }}>
      <div style={{ fontSize:28, marginBottom:8 }}>🏆</div>
      <div style={{ fontSize:11, fontWeight:700, color:T.ink }}>No rankings yet</div>
      <div style={{ fontSize:10, color:T.ink4, marginTop:4 }}>Be the first to complete a mission!</div>
    </div>
  )

  const rowPad   = fullPage ? "14px 20px" : "7px 8px"
  const rowFontN = fullPage ? 13 : 10
  const rowFontS = fullPage ? 11 : 8
  const avatarSz = fullPage ? 40 : 26
  const eloFont  = fullPage ? 16 : 11

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", maxWidth: fullPage ? 720 : "100%", margin: fullPage ? "0 auto" : undefined, width:"100%" }}>
      {/* Header */}
      <div style={{ padding: fullPage ? "24px 24px 16px" : "10px 14px 8px", borderBottom:`1px solid ${T.border}` }}>
        <div style={{ fontSize: fullPage ? 22 : 9, fontWeight:800, color: fullPage ? T.ink : T.ink4, letterSpacing: fullPage ? 0 : 2, marginBottom: fullPage ? 4 : 0 }}>
          {fullPage ? `${domain?.label} Leaderboard` : `${domain?.label?.toUpperCase()} · TOP ${entries.length}`}
        </div>
        {fullPage && <div style={{ fontSize:13, color:T.ink4 }}>Top performers in your domain · updated in real-time</div>}
        {myEntry && (
          <div style={{ marginTop: fullPage ? 16 : 6, padding: fullPage ? "12px 16px" : "6px 10px",
            background:(domain?.color||T.indigo)+"10", borderRadius: fullPage ? 12 : 8,
            border:`1px dashed ${domain?.color||T.indigo}40`,
            display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
            <div>
              <div style={{ fontSize: fullPage ? 11 : 9, color:T.ink3, fontWeight:600 }}>YOUR RANK</div>
              <div style={{ fontSize: fullPage ? 28 : 13, fontWeight:900, color:domain?.color||T.indigo, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>#{myEntry.rank ?? "—"}</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize: fullPage ? 11 : 9, color:T.ink3, fontWeight:600 }}>YOUR ELO</div>
              <div style={{ fontSize: fullPage ? 28 : 13, fontWeight:900, color:domain?.color||T.indigo, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{myEntry.elo ?? myElo}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize: fullPage ? 11 : 9, color:T.ink3, fontWeight:600 }}>MISSIONS</div>
              <div style={{ fontSize: fullPage ? 28 : 13, fontWeight:900, color:domain?.color||T.indigo, fontFamily:"'DM Mono',monospace", lineHeight:1 }}>{myEntry.missionsCompleted ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* Column headers for full page */}
      {fullPage && (
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 20px", background:T.cream2, borderBottom:`1px solid ${T.border}` }}>
          <div style={{ width:36, fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1 }}>#</div>
          <div style={{ flex:1, fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1 }}>PLAYER</div>
          <div style={{ width:100, textAlign:"center", fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1 }}>TIER</div>
          <div style={{ width:80, textAlign:"center", fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1 }}>MISSIONS</div>
          <div style={{ width:80, textAlign:"right", fontSize:9, fontWeight:800, color:T.ink4, letterSpacing:1 }}>ELO</div>
        </div>
      )}

      {/* Entries list */}
      <div style={{ flex:1, overflowY:"auto", padding: fullPage ? "8px 16px" : "6px 10px" }}>
        {entries.map((p, i) => {
          const tier  = getTier(p.elo)
          const isYou = p.uid === uid
          const delta = p.eloDelta ?? 0
          return (
            <div key={p.id}
              style={{ display:"flex", alignItems:"center", gap: fullPage ? 14 : 8,
                padding: rowPad, borderRadius: fullPage ? 12 : 8,
                marginBottom: fullPage ? 6 : 3,
                background: isYou ? (domain?.color||T.indigo)+"12" : fullPage ? "#fff" : "transparent",
                border: isYou ? `1.5px solid ${domain?.color||T.indigo}40` : fullPage ? `1px solid ${T.border}` : "1px solid transparent",
                boxShadow: fullPage && isYou ? `0 2px 8px ${domain?.color||T.indigo}20` : "none",
              }}>
              {/* Rank */}
              <div style={{ width: fullPage ? 36 : 20, textAlign:"center", fontSize: i < 3 ? (fullPage ? 22 : 14) : (fullPage ? 14 : 10), fontWeight:800, color: i < 3 ? "inherit" : T.ink4, flexShrink:0 }}>
                {i < 3 ? medal[i] : p.rank}
              </div>
              {/* Avatar */}
              <div style={{ width:avatarSz, height:avatarSz, borderRadius:"50%",
                background: p.photoURL ? "transparent" : (domain?.color||T.indigo)+"30",
                overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center",
                border: isYou ? `2px solid ${domain?.color||T.indigo}` : "none" }}>
                {p.photoURL
                  ? <img src={p.photoURL} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" />
                  : <span style={{ fontSize: fullPage ? 16 : 10, fontWeight:800, color:domain?.color||T.indigo }}>{(p.displayName||"?")[0].toUpperCase()}</span>
                }
              </div>
              {/* Name + tier row */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:rowFontN, fontWeight: isYou ? 800 : 600,
                  color: isYou ? (domain?.color||T.indigo) : T.ink,
                  whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {p.displayName || "Anonymous"}{isYou ? " (you)" : ""}
                </div>
                {!fullPage && <div style={{ fontSize:8, color:T.ink4, marginTop:1 }}>{tier.icon} {tier.label} · {p.missionsCompleted || 0} missions</div>}
              </div>
              {/* Tier badge — full page only */}
              {fullPage && (
                <div style={{ width:100, textAlign:"center" }}>
                  <span style={{ fontSize:11, fontWeight:700, color:tier.color, background:tier.color+"18", padding:"3px 10px", borderRadius:99 }}>{tier.icon} {tier.label}</span>
                </div>
              )}
              {/* Missions count — full page only */}
              {fullPage && (
                <div style={{ width:80, textAlign:"center", fontSize:14, fontWeight:700, color:T.ink2, fontFamily:"'DM Mono',monospace" }}>
                  {p.missionsCompleted || 0}
                </div>
              )}
              {/* ELO + delta */}
              <div style={{ width: fullPage ? 80 : "auto", display:"flex", flexDirection:"column", alignItems:"flex-end", flexShrink:0 }}>
                <span style={{ fontSize:eloFont, fontWeight:800, color:tier.color, fontFamily:"'DM Mono',monospace" }}>{p.elo}</span>
                {delta !== 0 && (
                  <span style={{ fontSize: fullPage ? 11 : 8, fontWeight:700, color: delta > 0 ? "#16A34A" : "#DC2626", fontFamily:"'DM Mono',monospace" }}>
                    {delta > 0 ? "+" : ""}{delta}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Show user if not in top 10 */}
        {!inTop10 && myEntry && (
          <>
            <div style={{ textAlign:"center", fontSize:9, color:T.ink4, padding:"4px 0" }}>• • •</div>
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 8px", borderRadius:8,
              background:(domain?.color||T.indigo)+"0d", border:`1px solid ${domain?.color||T.indigo}30` }}>
              <div style={{ width:20, textAlign:"center", fontSize:10, fontWeight:800, color:T.ink4 }}>#{myEntry.rank}</div>
              <div style={{ width:26, height:26, borderRadius:"50%", background:(domain?.color||T.indigo)+"30",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontSize:10, fontWeight:800, color:domain?.color||T.indigo }}>{(myEntry.displayName||"Y")[0].toUpperCase()}</span>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:800, color:domain?.color||T.indigo }}>You</div>
                <div style={{ fontSize:8, color:T.ink4 }}>{getTier(myEntry.elo || myElo).icon} {getTier(myEntry.elo || myElo).label}</div>
              </div>
              <span style={{ fontSize:11, fontWeight:800, color:(domain?.color||T.indigo), fontFamily:"'DM Mono',monospace" }}>{myEntry.elo ?? myElo}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSTATION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function WorkstationHeader({ domain, elo, streak, timeLeft }) {
  const tier = getTier(elo)

  // Format seconds → MM:SS
  const fmtTime = (secs) => {
    if (secs === null || secs === undefined) return null
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
  }

  const timeStr   = fmtTime(timeLeft)
  const isWarning = timeLeft !== null && timeLeft <= 300   // last 5 min
  const isDanger  = timeLeft !== null && timeLeft <= 60    // last 60 sec

  return (
    <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, boxShadow: T.shadow, zIndex: 10 }}>
      {/* Domain identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 11px", background: domain.colorBg, border: `1.5px solid ${domain.colorBorder}`, borderRadius: 9 }}>
        <span style={{ fontSize: 15 }}>{domain.icon}</span>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: domain.color }}>{domain.label}</div>
          <div style={{ fontSize: 8, color: T.ink4, fontWeight: 600 }}>your domain</div>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: T.border }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 9, color: T.ink4, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Ownership</div>
        <div style={{ fontSize: 10, fontWeight: 600, color: T.ink2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{domain.ownership}</div>
      </div>

      {/* ── COUNTDOWN TIMER ── */}
      {timeStr && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "6px 14px",
          background: isDanger ? T.red : isWarning ? T.amber : T.indigo3,
          border: `1.5px solid ${isDanger ? T.red : isWarning ? T.amber : T.indigo}`,
          borderRadius: 9,
          animation: isDanger ? "pulseRing 1s infinite" : "none",
        }}>
          <span style={{ fontSize: 13 }}>{isDanger ? "🚨" : isWarning ? "⚠️" : "⏱"}</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: isDanger ? "#fff" : isWarning ? T.amber : T.indigo, fontVariantNumeric: "tabular-nums", letterSpacing: 1 }}>
            {timeStr}
          </span>
          <span style={{ fontSize: 9, fontWeight: 700, color: isDanger ? "#fff" : T.ink4 }}>
            {isDanger ? "SUBMIT NOW" : isWarning ? "HURRY UP" : "remaining"}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        {streak > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: T.amber + "12", border: `1px solid ${T.amber}25`, borderRadius: 99 }}>
            <span style={{ fontSize: 12 }}>🔥</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.amber }}>{streak}-day</span>
          </div>
        )}
        <EloRing elo={elo} size={42} />
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: tier.color }}>{tier.icon} {tier.label}</div>
          <div style={{ fontSize: 9, color: T.ink4 }}>{elo} ELO</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE STARTER CODE — each tab gets its own pre-loaded template
// ─────────────────────────────────────────────────────────────────────────────
function getModuleStarter(modId, mission, domainKey) {
  const title = mission?.title || "Mission"
  const schema = mission?.contextSpec || mission?.sampleData || "-- schema not provided"
  const objective = mission?.objective || "Complete the objective"
  // FIX: guard DB starterCode by length so a full solution never seeds a module editor.
  const _sc = mission?.starterCode || ""
  const safeStarter = _sc.length > 0 && _sc.length < 250 ? _sc : null

  const starters = {
    // ── Data Analyst ──────────────────────────────────────────────────────
    sql_studio:   `-- SQL Studio: ${title}\n-- Objective: ${objective}\n\n${safeStarter || `SELECT\n    -- TODO: specify columns\nFROM\n    -- TODO: specify table\nWHERE\n    -- TODO: add conditions\nORDER BY 1\nLIMIT 100;`}`,
    dataset:      `-- Dataset Explorer\n-- Explore the schema and sample data before writing your solution\n\n-- 1. See all tables in the database:\n-- SHOW TABLES;\n\n-- 2. Inspect schema:\nDESCRIBE orders;\nDESCRIBE users;\n\n-- 3. Sample rows:\nSELECT * FROM orders LIMIT 10;\nSELECT * FROM users LIMIT 10;\n\n-- 4. Row counts:\nSELECT\n    'orders'  AS tbl, COUNT(*) AS rows FROM orders UNION ALL\n    SELECT 'users', COUNT(*) FROM users;\n\n-- Context from mission:\n${schema}`,
    dashboard:    `# Dashboard Builder: ${title}\n\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport matplotlib.gridspec as gridspec\n\n# ── Load your query results here ─────────────────────────────────────────\n# df = pd.read_csv('results.csv')  # or paste data directly\ndf = pd.DataFrame({\n    'month': ['Jan','Feb','Mar','Apr','May','Jun'],\n    'revenue': [0, 0, 0, 0, 0, 0],   # TODO: fill from your SQL results\n    'users':   [0, 0, 0, 0, 0, 0],\n})\n\n# ── KPI Cards ────────────────────────────────────────────────────────────\ntotal_rev = df['revenue'].sum()\ntotal_usr = df['users'].sum()\nprint(f"Total Revenue: {total_rev:,}")\nprint(f"Total Users:   {total_usr:,}")\n\n# ── Chart ────────────────────────────────────────────────────────────────\nfig, axes = plt.subplots(1, 2, figsize=(12, 4))\naxes[0].bar(df['month'], df['revenue'], color='#3D4EAC')\naxes[0].set_title('Monthly Revenue')\naxes[1].plot(df['month'], df['users'], marker='o', color='#1A7A4A')\naxes[1].set_title('User Growth')\nplt.tight_layout()\nplt.show()`,
    kpi_monitor:  `# KPI Monitor: ${title}\n\n## Mission KPIs to Track\n\n**Objective:** ${objective}\n\n---\n\n### KPI Definitions\n\n| KPI | Formula | Target | Status |\n|-----|---------|--------|---------|\n| Revenue Growth | (current - prev) / prev * 100 | > 10% | 🔴 TODO |\n| Conversion Rate | conversions / visitors * 100 | > 3% | 🔴 TODO |\n| Avg Order Value | revenue / orders | > ₹500 | 🔴 TODO |\n\n---\n\n### Calculations\n\`\`\`sql\n-- Revenue Growth %\nSELECT\n    this_month,\n    last_month,\n    ROUND((this_month - last_month) * 100.0 / last_month, 2) AS growth_pct\nFROM (\n    SELECT\n        SUM(CASE WHEN month = DATE_TRUNC('month', NOW()) THEN amount END) AS this_month,\n        SUM(CASE WHEN month = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN amount END) AS last_month\n    FROM orders\n) t;\n\`\`\`\n\n### Findings\n\n<!-- TODO: Write your KPI observations here -->`,
    viz:          `# Visualization Center: ${title}\n\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n# ── Paste your query results here ────────────────────────────────────────\n# Example — replace with your actual data:\ndf = pd.DataFrame({\n    'category': ['A', 'B', 'C', 'D', 'E'],\n    'value':    [120, 85, 200, 65, 175],\n    'trend':    [+5, -2, +12, -8, +9],\n})\n\n# ── Choose chart type based on your data ─────────────────────────────────\n# Bar chart (comparisons)\nfig, axes = plt.subplots(2, 2, figsize=(12, 8))\n\nsns.barplot(data=df, x='category', y='value', ax=axes[0,0], palette='Blues_d')\naxes[0,0].set_title('Category Comparison')\n\nsns.lineplot(data=df, x='category', y='trend', ax=axes[0,1], marker='o')\naxes[0,1].set_title('Trend Line')\n\naxes[1,0].pie(df['value'], labels=df['category'], autopct='%1.1f%%')\naxes[1,0].set_title('Distribution')\n\nsns.heatmap(df[['value','trend']].T, annot=True, ax=axes[1,1], cmap='YlOrRd')\naxes[1,1].set_title('Heatmap')\n\nplt.suptitle('${title} — Analysis Dashboard')\nplt.tight_layout()\nplt.show()`,
    ai_insights:  `# AI Insight Generator: ${title}\n\n## How to Use This Tab\n\n1. **Complete your SQL/Python solution** in the SQL Studio tab first\n2. **Paste your query results** below\n3. **Go to the Copilot panel** (right side) and ask:\n   - "What key insights can you find in these results?"\n   - "What anomalies or outliers do you see?"\n   - "Write a 3-bullet executive summary of these metrics"\n   - "What business decision would you recommend based on this data?"\n\n---\n\n## Paste Results Here\n\n\`\`\`\n-- TODO: paste your query output here\n\`\`\`\n\n## Insight Template\n\n**Key Finding 1:** \n\n**Key Finding 2:** \n\n**Recommendation:** \n\n**Risk / Caveat:** `,

    // ── DBA ───────────────────────────────────────────────────────────────
    schema:       `-- Schema Manager: ${title}\n-- Objective: ${objective}\n\n-- View all tables:\nSELECT table_name, table_rows FROM information_schema.tables\nWHERE table_schema = DATABASE() ORDER BY table_rows DESC;\n\n-- Check indexes:\nSHOW INDEX FROM orders;\n\n-- Check constraints:\nSELECT constraint_name, constraint_type, table_name\nFROM information_schema.table_constraints\nWHERE table_schema = DATABASE();\n\n-- Your schema solution:\n${safeStarter || "-- TODO: write DDL here"}`,
    query:        `-- Query Analyzer: ${title}\n-- Use EXPLAIN ANALYZE to profile your query\n\n-- Step 1: Run the slow query with EXPLAIN:\nEXPLAIN ANALYZE\n${safeStarter || "SELECT * FROM orders WHERE user_id = 1;"}`,
    index:        `-- Index Optimizer: ${title}\n\n-- Find missing indexes (columns in WHERE/JOIN with no index):\nSELECT table_name, column_name FROM information_schema.columns\nWHERE table_schema = DATABASE()\nAND column_name IN (\n    -- TODO: list your WHERE/JOIN columns\n);\n\n-- Check existing indexes:\nSELECT table_name, index_name, column_name, cardinality\nFROM information_schema.statistics\nWHERE table_schema = DATABASE()\nORDER BY table_name, index_name;\n\n-- Create composite index:\n-- CREATE INDEX idx_name ON table_name (col1, col2);`,

    // ── DevOps ─────────────────────────────────────────────────────────────
    pipeline:     `# Pipeline Center: ${title}\n# Objective: ${objective}\n\n# GitHub Actions CI/CD Pipeline\nname: ${title.replace(/\s+/g,"-").toLowerCase()}\n\non:\n  push:\n    branches: [main, develop]\n  pull_request:\n    branches: [main]\n\njobs:\n  build-and-test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n          cache: 'npm'\n\n      - name: Install dependencies\n        run: npm ci\n\n      # TODO: Add a test step (e.g. run your test command)\n      - name: Run tests\n        run: # TODO\n\n      # TODO: Add a build step\n      - name: Build\n        run: # TODO\n\n  deploy:\n    needs: build-and-test\n    runs-on: ubuntu-latest\n    if: github.ref == 'refs/heads/main'\n    steps:\n      # TODO: Add deploy steps`,
    infra:        `# Infrastructure Explorer: ${title}\n# Terraform IaC\n\nterraform {\n  required_providers {\n    aws = { source = "hashicorp/aws", version = "~> 5.0" }\n  }\n}\n\nprovider "aws" {\n  region = var.region\n}\n\nvariable "region" {\n  default = "ap-south-1"\n}\n\n# TODO: Define your infrastructure\n# resource "aws_instance" "app" {\n#   ami           = "ami-0c55b159cbfafe1f0"\n#   instance_type = "t3.micro"\n# }`,
    iac:          `# Infrastructure as Code: ${title}\n# Objective: ${objective}\n\nterraform {\n  required_providers {\n    aws = { source = "hashicorp/aws", version = "~> 5.0" }\n  }\n}\n\nprovider "aws" {\n  region = var.region\n}\n\nvariable "region" {\n  default = "ap-south-1"\n}\n\n# TODO: Define the required resources for this mission (see mission brief).\n# resource "<type>" "<name>" {\n#   # TODO: configure arguments\n# }`,
    k8s:          `# Kubernetes Manifest: ${title}\n# Objective: ${objective}\n#\n# Write the required manifest(s) below. Separate resources with ---\n\napiVersion:    # TODO: v1 / apps/v1 / autoscaling/v2 / networking.k8s.io/v1\nkind:          # TODO: Deployment | Service | ConfigMap | HPA | Ingress\nmetadata:\n  name:        # TODO: resource name\n  namespace:   # TODO: namespace\nspec:\n  # TODO: complete the spec — replicas, selectors, containers, probes, limits.\n  # Fill every value yourself; do not leave defaults.`,
    monitoring:   `# Monitoring Config: ${title}\n# Objective: ${objective}\n#\n# Author the Prometheus / alerting rules for this mission.\n\ngroups:\n  - name:       # TODO: rule group name\n    rules:\n      - alert:  # TODO: alert name\n        expr:   # TODO: PromQL expression\n        for:    # TODO: duration (e.g. 5m)\n        labels:\n          severity:   # TODO: warning | critical\n        annotations:\n          summary:    # TODO: what fired\n          description: # TODO: actionable detail`,

    // ── Frontend ───────────────────────────────────────────────────────────
    ui_builder:   `// UI Builder: ${title}\nimport { useState, useEffect } from 'react'\n\n// TODO: Build your component\nexport default function Solution() {\n  const [data, setData] = useState(null)\n  const [loading, setLoading] = useState(false)\n\n  // Objective: ${objective}\n\n  return (\n    <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 800, margin: '0 auto' }}>\n      <h1>${title}</h1>\n      {/* TODO: implement UI */}\n    </div>\n  )\n}`,
  }

  // FIX: only fall back to DB starterCode if it's short (a hint/skeleton, < 250 chars).
  // Long starterCodes are almost always full solutions and must not leak into the editor.
  const sc = mission?.starterCode || ""
  const safeSc = sc.length > 0 && sc.length < 250 ? sc : null
  return starters[modId] || safeSc || `// ${title}\n// Module: ${modId}\n// Objective: ${objective}\n\n// TODO: implement`
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION WORKSTATION — brief + differentiated module workspace
// ─────────────────────────────────────────────────────────────────────────────
function MissionWorkstation({ mission, domain, domainKey, activeModuleId, code, onCodeChange, onClear, onSubmit, submitting, codeMap, setCodeMap, activeWsTab, setActiveWsTab }) {
  const [briefOpen, setBriefOpen] = useState(true)

  const modules  = domain.modules || []
  const mod      = modules.find(m => m.id === activeModuleId) || modules[0]

  // Each module has its OWN sandbox — use the module's sandbox, not the mission's
  const moduleSandbox = mod?.sandbox || "code"
  // Module-specific starter code — shown when switching tabs, not overwriting user edits
  const modStarter = getModuleStarter(mod?.id, mission, domainKey)

  // When module tab changes, load that module's starter into the editor
  const prevModRef = useRef(activeModuleId)
  useEffect(() => {
    if (prevModRef.current !== activeModuleId) {
      prevModRef.current = activeModuleId
      onCodeChange(modStarter)
    }
  }, [activeModuleId]) // eslint-disable-line

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>

      {/* ── MISSION BRIEF ─────────────────────────────────────────────────── */}
      <div style={{ background: domain.colorBg, borderBottom: `1px solid ${domain.colorBorder}`, flexShrink: 0 }}>

        {/* Header row */}
        <div style={{ padding: "8px 14px", display: "flex", gap: 9, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>{mission.icon || "🎯"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {mission.title || mission.id}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
              <Badge color={domain.color} bg={domain.color + "20"}>{mission.difficulty || "Medium"}</Badge>
              <Badge color={T.ink3} bg={T.cream2}>{mod?.label || moduleSandbox.toUpperCase()}</Badge>
              {mission.timeLimit && <Badge color={T.amber} bg={T.amber + "15"}>⏱ {mission.timeLimit}</Badge>}
              {mission.eloReward && <Badge color={T.green} bg={T.green2}>+{mission.eloReward} ELO</Badge>}
            </div>
          </div>
          <button onClick={() => setBriefOpen(o => !o)}
            style={{ padding: "4px 10px", background: "#FFFFFF", border: `1px solid ${domain.colorBorder}`, borderRadius: 7, fontSize: 10, fontWeight: 700, color: domain.color, cursor: "pointer" }}>
            {briefOpen ? "▲ Hide" : "▼ Brief"}
          </button>

          {/* ── SUBMIT BUTTON — always visible ── */}
          <button
            onClick={onSubmit}
            disabled={submitting || !code?.trim()}
            style={{
              padding: "6px 16px",
              background: submitting ? T.ink4 : (code?.trim() ? domain.color : T.ink4),
              border: "none",
              borderRadius: 8,
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              cursor: submitting || !code?.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              opacity: !code?.trim() ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            {submitting
              ? <><Spinner color="#fff" size={11} /> Evaluating…</>
              : (mission?.workstation === "system_design" || (mission?.category || "").toLowerCase().includes("system design") || (mission?.category || "").toLowerCase().includes("architecture"))
                ? "🏗️ Submit Design"
                : "▶ Submit Solution"
            }
          </button>

          <button onClick={onClear} style={{ padding: "4px 9px", background: T.cream, border: `1px solid ${T.border}`, borderRadius: 7, fontSize: 10, color: T.ink3, cursor: "pointer" }}>✕</button>
        </div>

        {/* Brief body — scenario / objective / steps / expected output / hints */}
        {briefOpen && (
          <div style={{ padding: "0 14px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

            {mission.scenario && (
              <div style={{ gridColumn: "1 / -1", background: "#FFFFFF", borderRadius: 8, padding: "9px 12px", border: `1px solid ${domain.colorBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: domain.color, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>📋 Scenario</div>
                <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.65 }}>{mission.scenario}</div>
              </div>
            )}

            {mission.objective && (
              <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "9px 12px", border: `1px solid ${domain.colorBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.green, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>🎯 Objective</div>
                <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.65 }}>{mission.objective}</div>
              </div>
            )}

            {(mission.expectedOutput || mission.expected_output) && (
              <div style={{ background: "#FFFFFF", borderRadius: 8, padding: "9px 12px", border: `1px solid ${domain.colorBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.indigo, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>✅ Expected Output</div>
                <div style={{ fontSize: 11, color: T.ink2, lineHeight: 1.65 }}>{mission.expectedOutput || mission.expected_output}</div>
              </div>
            )}

            {(mission.steps || []).length > 0 && (
              <div style={{ gridColumn: "1 / -1", background: "#FFFFFF", borderRadius: 8, padding: "9px 12px", border: `1px solid ${domain.colorBorder}` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.amber, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>📌 Steps</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {(mission.steps || []).map((step, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ width: 18, height: 18, borderRadius: "50%", background: domain.colorBg, border: `1px solid ${domain.colorBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: domain.color, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 11, color: T.ink2, lineHeight: 1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(mission.hints || []).length > 0 && (
              <div style={{ gridColumn: "1 / -1", background: T.amber + "0A", borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.amber}30` }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: T.amber, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>💡 Hints</div>
                {(mission.hints || []).map((h, i) => (
                  <div key={i} style={{ fontSize: 11, color: T.ink2, marginBottom: 3 }}>• {h}</div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── MODULE WORKSPACE — single or multi-workstation ── */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex", flexDirection: "column" }}>
        {mission?.isMultiWorkstation && Array.isArray(mission.workstations) ? (
          /* ── MULTI-WORKSTATION TABS ── */
          <>
            {/* Workstation tab bar */}
            <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, background: T.cream2, flexShrink: 0 }}>
              {mission.workstations.map((ws, i) => {
                const wsLabels = { sql:"🗃 SQL", excel:"📗 Excel", notebook:"🐍 Python", dashboard:"📈 Dashboard", report:"📝 Report", terminal:"🖥 Terminal", markdown:"📄 Markdown" }
                const isActive = activeWsTab === ws
                const hasDone  = (codeMap?.[ws] || "").trim().length > 10
                return (
                  <button key={ws} onClick={() => setActiveWsTab(ws)} style={{
                    padding: "6px 14px", border: "none", cursor: "pointer",
                    borderBottom: isActive ? `2px solid ${domain.color}` : "2px solid transparent",
                    background: isActive ? "#fff" : "transparent",
                    fontSize: 11, fontWeight: isActive ? 800 : 500,
                    color: isActive ? domain.color : T.ink3,
                    display: "flex", gap: 5, alignItems: "center",
                  }}>
                    {wsLabels[ws] || ws.toUpperCase()}
                    {hasDone && <span style={{ fontSize: 8, color: T.green }}>✓</span>}
                    <span style={{ fontSize: 9, color: T.ink4 }}>Step {i + 1}</span>
                  </button>
                )
              })}
              {/* Step instruction chip */}
              {activeWsTab && mission.workstationSteps?.[activeWsTab] && (
                <div style={{ flex: 1, padding: "4px 12px", fontSize: 10, color: T.ink3, lineHeight: 1.4, alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  💡 {mission.workstationSteps[activeWsTab]}
                </div>
              )}
            </div>
            {/* Active workstation */}
            <div style={{ flex: 1, overflow: "hidden", minHeight: 0, display: "flex" }}>
              <WorkstationRouter
                mission={{ ...mission, missionType: activeWsTab }}
                domain={domain}
                domainKey={domainKey}
                moduleSandbox={activeWsTab || moduleSandbox}
                code={codeMap?.[activeWsTab] || ""}
                onCodeChange={(val) => {
                  setCodeMap(prev => ({ ...prev, [activeWsTab]: val }))
                  onCodeChange(val)
                }}
                CodeEditor={CodeEditor}
              />
            </div>
          </>
        ) : (
          /* ── SINGLE WORKSTATION ── */
          <WorkstationRouter
            mission={mission}
            domain={domain}
            domainKey={domainKey}
            moduleSandbox={moduleSandbox}
            code={code}
            onCodeChange={onCodeChange}
            CodeEditor={CodeEditor}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UPGRADE MODAL — inline Razorpay payment, no page navigation
// ─────────────────────────────────────────────────────────────────────────────
const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

function UpgradeModal({ planId, user, userData, onSuccess, onClose }) {
  const plan = PLANS[planId]
  const { openCheckout } = useRazorpay()
  const [step, setStep]   = useState("review")   // review | paying | success | error
  const [errMsg, setErrMsg] = useState("")

  if (!plan) return null

  const handlePay = async () => {
    setStep("paying"); setErrMsg("")
    try {
      const orderRes = await fetch(`${SERVER}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, uid: user?.uid }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok || !order.order_id) throw new Error(order.error || "Order creation failed")

      openCheckout({
        planId,
        amount:    order.amount,
        orderId:   order.order_id,
        currency:  order.currency || "INR",
        userEmail: user?.email || "",
        userName:  userData?.displayName || user?.displayName || "",
        onSuccess: (data) => {
          setStep("success")
          onSuccess?.(data.planId || planId)
        },
        onError: (msg) => {
          if (msg === "Payment cancelled.") { setStep("review"); return }
          setErrMsg(msg); setStep("error")
        },
      })
      // Razorpay modal is now open; reset our step so backdrop stays visible but quiet
      setStep("review")
    } catch (e) {
      setErrMsg(e.message || "Failed to create order. Try again."); setStep("error")
    }
  }

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.() }}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(26,26,24,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{
        background: "#FFFFFF", borderRadius: 20, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 80px rgba(26,26,24,0.18), 0 4px 16px rgba(26,26,24,0.10)",
        overflow: "hidden", fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Header */}
        <div style={{
          padding: "20px 22px 18px",
          background: `linear-gradient(135deg, ${plan.colorBg}, #fff)`,
          borderBottom: `1px solid ${plan.color}20`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: plan.color, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              Upgrade to {plan.label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: T.ink, letterSpacing: -0.5 }}>
              ₹{plan.price.toLocaleString()}
              <span style={{ fontSize: 13, fontWeight: 500, color: T.ink3, marginLeft: 4 }}>/month</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, color: T.ink4, cursor: "pointer", padding: "2px 4px", lineHeight: 1 }}>✕</button>
        </div>

        {/* Feature list */}
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${T.border}` }}>
          {plan.features.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < plan.features.length - 1 ? 9 : 0 }}>
              <span style={{ color: T.green, fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 13, color: T.ink2, lineHeight: 1.5 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* Action area */}
        <div style={{ padding: "16px 22px" }}>
          {step === "error" && (
            <div style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: T.red, fontSize: 12 }}>
              {errMsg}
            </div>
          )}

          {step === "success" ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.green, marginBottom: 4 }}>You're on {plan.label}!</div>
              <div style={{ fontSize: 12, color: T.ink3, marginBottom: 16 }}>Your extra mission slots are now unlocked. Refresh to see them.</div>
              <button onClick={onClose} style={{ padding: "9px 24px", borderRadius: 10, border: "none", background: T.green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                Start Missions
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={handlePay}
                disabled={step === "paying"}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                  background: step === "paying" ? plan.color + "80" : plan.color,
                  color: "#fff", fontSize: 14, fontWeight: 800, cursor: step === "paying" ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "opacity 0.15s",
                }}
              >
                {step === "paying" ? (
                  <><Spinner size={14} color="#fff" /> Creating order…</>
                ) : (
                  <>Pay ₹{plan.price.toLocaleString()} / month</>
                )}
              </button>
              <div style={{ fontSize: 10, color: T.ink4, textAlign: "center", marginTop: 10 }}>
                Secured by Razorpay · Cancel anytime
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM DETECTION — maps career_track_slug → student stream key
//
// Returns one of:
//   "ECE" | "EEE" | "Mechanical" | "Civil" | "Pharmacy" | "MBA" | "IoT"
//   "AI_DS" | "AI_ML"
//   null  →  IT / CSE / MCA students use the default coding (DSA) path
// ─────────────────────────────────────────────────────────────────────────────
function detectStudentStream(userData) {
  // Primary: career_track_slug (set during onboarding from branch mapping)
  // Fallback: branch field (stored directly from signup form)
  const slug = (userData?.career_track_slug || "").toLowerCase().trim()
  const branchDirect = (userData?.branch || "").trim()

  // Branch direct-match shortcuts (set at signup, no slug needed)
  if (!slug && branchDirect) {
    const b = branchDirect
    if (b === "ECE")        return "ECE"
    if (b === "EEE")        return "EEE"
    if (b === "Mechanical") return "Mechanical"
    if (b === "Civil")      return "Civil"
    if (b === "Pharmacy")   return "Pharmacy"
    if (b === "MBA")        return "MBA"
    if (b === "IoT")        return "IoT"
    if (b === "AI_DS")      return "AI_DS"
    if (b === "AI_ML")      return "AI_ML"
    return null  // CSE / IT / MCA / Other → default IT path
  }

  // Keyword-based fallback — for users who onboarded before branch/slug were stored.
  // Reads the domain role the student typed (same field resolveArenaDomain uses).
  if (!slug && !branchDirect) {
    const kw = (userData?.keyword || userData?.authority || userData?.jobTitle || "").toLowerCase()
    if (kw.includes("embedded") || kw.includes("vlsi") || kw.includes("fpga") || kw.includes("firmware") || kw.includes("electronics engineer") || kw.includes("hardware engineer") || kw.includes("rf engineer") || kw.includes("signal processing") || kw.includes("pcb")) return "ECE"
    if (kw.includes("power engineer") || kw.includes("power systems") || kw.includes("electrical engineer") || kw.includes("control systems engineer")) return "EEE"
    if (kw.includes("mechanical engineer") || kw.includes("manufacturing engineer") || kw.includes("automobile engineer") || kw.includes("automotive engineer") || kw.includes("thermal engineer") || kw.includes("production engineer")) return "Mechanical"
    if (kw.includes("civil engineer") || kw.includes("structural engineer") || kw.includes("construction engineer") || kw.includes("site engineer")) return "Civil"
    if (kw.includes("iot") || kw.includes("internet of things")) return "IoT"
    if (kw.includes("pharmacist") || kw.includes("pharmacy")) return "Pharmacy"
    if (kw.includes("mba") || kw.includes("business manager") || kw.includes("operations manager") || kw.includes("hr manager") || kw.includes("marketing manager")) return "MBA"
    // Note: intentionally NOT matching "software engineer", "data analyst" etc here —
    // those are IT roles and should stay on the default IT path (return null).
  }

  if (!slug) return null

  // ── Engineering streams ──────────────────────────────────────────────────
  if (slug === "ece" || slug.startsWith("ece-") || slug.includes("electronics-communication"))
    return "ECE"
  if (slug === "eee" || slug.startsWith("eee-") ||
      (slug.includes("electrical") && slug.includes("electronic")))
    return "EEE"
  if (slug === "mechanical" || slug.startsWith("mechanical-") ||
      slug === "mech" || slug.startsWith("mech-"))
    return "Mechanical"
  if (slug === "civil" || slug.startsWith("civil-"))
    return "Civil"
  if (slug === "pharmacy" || slug.startsWith("pharmacy-") || slug.startsWith("pharm-"))
    return "Pharmacy"
  if (slug === "mba" || slug.startsWith("mba-") ||
      slug.includes("business-administration"))
    return "MBA"
  if (slug === "iot" || slug.startsWith("iot-") ||
      slug.includes("internet-of-things"))
    return "IoT"

  // ── AI / Data Science streams ────────────────────────────────────────────
  if (slug === "ai-ds" || slug === "aids" || slug === "ai_ds" ||
      slug.startsWith("artificial-intelligence-data") ||
      slug.includes("data-science") || slug.startsWith("ai-ds-"))
    return "AI_DS"
  if (slug === "ai-ml" || slug === "aiml" || slug === "ai_ml" ||
      slug.startsWith("artificial-intelligence-machine") ||
      slug.includes("machine-learning") || slug.startsWith("ai-ml-"))
    return "AI_ML"

  // ── DevOps / Cloud / SRE streams ─────────────────────────────────────────
  if (slug === "devops" || slug.startsWith("devops-") ||
      slug.includes("site-reliability") || slug === "sre" ||
      slug.includes("cloud-engineer") || slug === "cloud" ||
      slug.startsWith("cloud-") || slug.includes("platform-engineer"))
    return "DevOps"

  // ── CSE / IT / MCA — all share the default coding path (return null) ─────
  // Explicitly matching so future additions don't accidentally fall through
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM CARD CONFIG
// Drives both the COMMON CHALLENGES and YOUR ROLE cards for non-IT students.
// Each stream has:
//   common → what appears on the right "COMMON CHALLENGES" card
//   role   → what appears on the left "YOUR ROLE" card
// ─────────────────────────────────────────────────────────────────────────────
const STREAM_CARD_CONFIG = {
  ECE: {
    common: {
      icon: "📡", label: "ECE Fundamentals",
      color: "#0891B2", colorBg: "rgba(8,145,178,0.1)", colorBorder: "rgba(8,145,178,0.2)",
      desc: "Circuit analysis, analog & digital electronics, signals, communication systems. Short challenges that build your engineering foundation.",
      tags: ["⚡ Circuit Analysis", "📟 Digital Systems", "📡 Communication", "🔧 Microcontrollers", "📊 Signals & Systems"],
      cta: "Start Practising", count: "400+ problems",
      categories: ["ECE", "Aptitude", "Logical"],
    },
    role: {
      icon: "🔌", label: "ECE Domain Practice",
      color: "#0891B2", colorBg: "rgba(8,145,178,0.1)", colorBorder: "rgba(8,145,178,0.2)",
      desc: "GPIO bare-metal, UART/I2C/SPI drivers, Verilog FSMs, PWM motor control. Hands-on embedded coding challenges.",
      tags: ["🔌 Embedded C", "📡 UART / I2C / SPI", "🔧 Microcontrollers", "💻 Verilog / FPGA", "⚡ GPIO & PWM"],
      cta: "Open ECE Challenges →", count: null,
      categories: null,  // null → routes to domain workstation (ECE_CHALLENGES), not Common Challenges
    },
  },
  EEE: {
    common: {
      icon: "⚡", label: "EEE Fundamentals",
      color: "#D97706", colorBg: "rgba(217,119,6,0.1)", colorBorder: "rgba(217,119,6,0.2)",
      desc: "AC/DC circuits, power factor, transformer theory, motor speed & slip, voltage regulation. Build your electrical engineering foundation.",
      tags: ["⚡ Power Systems", "🔌 Transformers", "🏭 Induction Motors", "🔧 Protection", "📊 AC/DC"],
      cta: "Start Practising", count: "200+ problems",
      categories: ["EEE", "Aptitude", "Logical"],
    },
    role: {
      icon: "⚡", label: "EEE Domain Practice",
      color: "#D97706", colorBg: "rgba(217,119,6,0.1)", colorBorder: "rgba(217,119,6,0.2)",
      desc: "Transformer turns ratio, synchronous speed, 3-phase power factor, cable voltage drop. Real-world power systems problems.",
      tags: ["⚡ Power Engineering", "🏭 Electrical Machines", "🔧 Control Systems", "📊 Load Flow", "🛡️ Protection"],
      cta: "Open EEE Challenges →", count: null,
      categories: ["EEE"],
    },
  },
  Mechanical: {
    common: {
      icon: "⚙️", label: "Mechanical Fundamentals",
      color: "#374151", colorBg: "rgba(55,65,81,0.1)", colorBorder: "rgba(55,65,81,0.2)",
      desc: "Stress analysis, Young's modulus, thermodynamics, fluid mechanics, gear trains. Build your mechanical engineering foundation.",
      tags: ["⚙️ Stress & Strain", "🔥 Thermodynamics", "💧 Fluid Mechanics", "🔩 Machine Design", "🏭 Manufacturing"],
      cta: "Start Practising", count: "200+ problems",
      categories: ["Mechanical", "Aptitude", "Logical"],
    },
    role: {
      icon: "⚙️", label: "Mechanical Domain Practice",
      color: "#374151", colorBg: "rgba(55,65,81,0.1)", colorBorder: "rgba(55,65,81,0.2)",
      desc: "FoS calculations, Carnot efficiency, welding heat input, beam bending, shaft power. Engineering workshop–level problems.",
      tags: ["⚙️ CAD / FEA", "🔩 Design for Mfg.", "🔥 Heat Transfer", "💧 Fluid Power", "🏭 CNC & Welding"],
      cta: "Open Mechanical Challenges →", count: null,
      categories: ["Mechanical"],
    },
  },
  Civil: {
    common: {
      icon: "🏗️", label: "Civil Engineering Fundamentals",
      color: "#92400E", colorBg: "rgba(146,64,14,0.1)", colorBorder: "rgba(146,64,14,0.2)",
      desc: "Structural analysis, Manning's equation, population projection, bearing capacity, water design. Build your civil engineering foundation.",
      tags: ["🏗️ Structural", "💧 Hydraulics", "🛣️ Transportation", "🏔️ Geotechnical", "🏢 RCC Design"],
      cta: "Start Practising", count: "200+ problems",
      categories: ["Civil", "Aptitude", "Logical"],
    },
    role: {
      icon: "🏗️", label: "Civil Domain Practice",
      color: "#92400E", colorBg: "rgba(146,64,14,0.1)", colorBorder: "rgba(146,64,14,0.2)",
      desc: "Bending moments, Euler buckling, pile capacity, stopping sight distance, Manning's discharge. Site-office engineering problems.",
      tags: ["🏗️ Structural Design", "💧 Hydraulic Systems", "🛣️ Highway Design", "🏔️ Foundation Eng.", "📐 Survey"],
      cta: "Open Civil Challenges →", count: null,
      categories: ["Civil"],
    },
  },
  Pharmacy: {
    common: {
      icon: "💊", label: "Pharmacy Fundamentals",
      color: "#059669", colorBg: "rgba(5,150,105,0.1)", colorBorder: "rgba(5,150,105,0.2)",
      desc: "Drug calculations, pharmacokinetics, bioavailability, clinical formulations. Build your pharmaceutical sciences foundation.",
      tags: ["💊 Drug Calculations", "⚗️ Pharmacokinetics", "🧪 Formulation", "🏥 Clinical Pharmacy", "📊 Bioavailability"],
      cta: "Start Practising", count: "100+ problems",
      categories: ["Pharmacy", "Aptitude", "Logical"],
    },
    role: {
      icon: "💊", label: "Pharmacy Domain Practice",
      color: "#059669", colorBg: "rgba(5,150,105,0.1)", colorBorder: "rgba(5,150,105,0.2)",
      desc: "Dose calculations, CrCl estimation, infusion rate design, TI analysis. Clinical scenarios from real pharmacy practice.",
      tags: ["💊 Clinical Pharmacy", "⚗️ PK/PD Modeling", "🏥 Drug Dosing", "🧬 Pharmacotherapy"],
      cta: "Open Pharmacy Challenges →", count: null,
      categories: ["Pharmacy"],
    },
  },
  MBA: {
    common: {
      icon: "📊", label: "Business Fundamentals",
      color: "#7C3AED", colorBg: "rgba(124,58,237,0.1)", colorBorder: "rgba(124,58,237,0.2)",
      desc: "NPV, ROI, break-even analysis, CAGR, EOQ. Build your business and management foundation.",
      tags: ["📊 Finance & Accounting", "📈 Marketing", "🏭 Operations", "🎯 Strategy", "💰 Business Analytics"],
      cta: "Start Practising", count: "100+ problems",
      categories: ["MBA", "Aptitude", "Logical"],
    },
    role: {
      icon: "📊", label: "Business Domain Practice",
      color: "#7C3AED", colorBg: "rgba(124,58,237,0.1)", colorBorder: "rgba(124,58,237,0.2)",
      desc: "Financial modelling, market research, EOQ decisions, NPV analysis. Corporate-level business scenarios.",
      tags: ["📊 Financial Analysis", "📈 Business Dev", "🏭 Supply Chain", "🎯 Strategic Planning", "💹 Valuation"],
      cta: "Open Business Challenges →", count: null,
      categories: ["MBA"],
    },
  },
  IoT: {
    common: {
      icon: "🌐", label: "IoT & Embedded Fundamentals",
      color: "#0F766E", colorBg: "rgba(15,118,110,0.1)", colorBorder: "rgba(15,118,110,0.2)",
      desc: "ADC resolution, PWM duty cycle, RSSI-to-distance, sensor interfacing, Nyquist sampling. Build your IoT foundation.",
      tags: ["🌐 IoT Protocols", "🔌 Embedded C", "📡 Wireless", "☁️ Cloud Integration", "🔧 Sensors"],
      cta: "Start Practising", count: "100+ problems",
      categories: ["IoT", "ECE", "Aptitude", "Logical"],
    },
    role: {
      icon: "🌐", label: "IoT Domain Practice",
      color: "#0F766E", colorBg: "rgba(15,118,110,0.1)", colorBorder: "rgba(15,118,110,0.2)",
      desc: "MQTT messaging, I²C sensor integration, RTOS task design, edge ML deployment. Real IoT engineering challenges.",
      tags: ["🌐 MQTT / CoAP", "🔌 Microcontrollers", "☁️ AWS IoT / Azure", "📡 LoRa / BLE", "🤖 Edge AI"],
      cta: "Open IoT Challenges →", count: null,
      categories: ["IoT", "ECE"],
    },
  },

  // ── AI & Data Science ────────────────────────────────────────────────────
  AI_DS: {
    common: {
      icon: "📊", label: "Data Science Fundamentals",
      color: "#0369A1", colorBg: "rgba(3,105,161,0.1)", colorBorder: "rgba(3,105,161,0.2)",
      desc: "MAE, RMSE, normalization, correlation, precision/recall, F1, Gini impurity, cosine similarity. Build your data science coding foundation.",
      tags: ["📊 Statistics", "🐍 Pandas / NumPy", "🔍 EDA", "🤖 ML Metrics", "📈 Feature Engineering"],
      cta: "Start Practising", count: "100+ problems",
      categories: ["AI_DS", "Aptitude", "Logical"],
    },
    role: {
      icon: "🤖", label: "Data Science Coding Practice",
      color: "#0369A1", colorBg: "rgba(3,105,161,0.1)", colorBorder: "rgba(3,105,161,0.2)",
      desc: "Implement ML metrics from scratch in Python — the exact problems asked in data science interviews at analytics-first companies.",
      tags: ["📊 ML Metrics", "🐍 Python Coding", "🔍 Statistics", "📈 Model Evaluation", "🤖 Algorithms"],
      cta: "Open DS Challenges →", count: null,
      categories: ["AI_DS"],
    },
  },

  // ── AI & Machine Learning ────────────────────────────────────────────────
  AI_ML: {
    common: {
      icon: "🧠", label: "Machine Learning Fundamentals",
      color: "#7C3AED", colorBg: "rgba(124,58,237,0.1)", colorBorder: "rgba(124,58,237,0.2)",
      desc: "Sigmoid, ReLU, softmax, BCE loss, gradient descent, KNN, K-Means, logistic regression, batch normalization. Code the building blocks of ML.",
      tags: ["🧠 Neural Networks", "⚡ Optimization", "📐 Linear Algebra", "🔗 Deep Learning", "🌲 Classical ML"],
      cta: "Start Practising", count: "100+ problems",
      categories: ["AI_ML", "Aptitude", "Logical"],
    },
    role: {
      icon: "🧠", label: "ML Coding Practice",
      color: "#7C3AED", colorBg: "rgba(124,58,237,0.1)", colorBorder: "rgba(124,58,237,0.2)",
      desc: "Implement activation functions, loss functions, and training algorithms from scratch — the coding round ML companies actually test.",
      tags: ["🧠 Deep Learning", "⚡ Gradient Descent", "📐 Linear Models", "🌲 Tree Methods", "🔗 Backprop"],
      cta: "Open ML Challenges →", count: null,
      categories: ["AI_ML"],
    },
  },

  // ── DevOps / Cloud / SRE ─────────────────────────────────────────────────
  DevOps: {
    common: {
      icon: "🚀", label: "DevOps & Cloud Fundamentals",
      color: "#0F766E", colorBg: "rgba(15,118,110,0.1)", colorBorder: "rgba(15,118,110,0.2)",
      desc: "DSA, SQL, scripting, and system design questions — the actual coding rounds DevOps and SRE interviews test you on. Build the foundation that gets you hired.",
      tags: ["🐍 Python Scripting", "🗄️ SQL & Databases", "⚙️ Algorithms", "🌐 Networking", "🏗️ System Design"],
      cta: "Start Practising", count: "200+ problems",
      // DevOps students see DSA + SQL — fully relevant for scripting, automation,
      // data pipelines. ECE/EEE/Mechanical are excluded (handled in ArenaCommonChallenges).
      categories: null,   // null → IT/CSE path in ArenaCommonChallenges (DSA + SQL)
    },
    role: {
      icon: "🛠️", label: "DevOps Domain Practice",
      color: "#0F766E", colorBg: "rgba(15,118,110,0.1)", colorBorder: "rgba(15,118,110,0.2)",
      desc: "CI/CD pipeline design, Kubernetes YAML, Terraform IaC, incident response, log analysis. Real-world scenarios your SRE interviews will test.",
      tags: ["🚀 CI/CD Pipelines", "☸️ Kubernetes", "🏗️ Terraform", "📊 Observability", "🛡️ SRE Practices"],
      cta: "Open DevOps Challenges →", count: null,
      categories: null,   // routes to domain view (ArenaDomain) — no DB category needed
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN SLOTS VIEW
// 3-slot challenge board with 24hr cooldown + smart rotation
// ─────────────────────────────────────────────────────────────────────────────
function useCountdown(cooldownUntil) {
  const [remaining, setRemaining] = useState(null)
  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, (cooldownUntil || 0) - Date.now())
      setRemaining(ms)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])
  return remaining
}

function CountdownDisplay({ cooldownUntil, color = "#B45309" }) {
  const ms = useCountdown(cooldownUntil)
  if (ms === null) return null
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const fmt = (n) => String(n).padStart(2, "0")
  return (
    <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 800, color, letterSpacing: 1 }}>
      {fmt(h)}:{fmt(m)}:{fmt(s)}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERATIONS CENTER DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  void:    "#FFFFFF",
  base:    "#FAF7F2",
  raised:  "#FFFFFF",
  float:   "#F5F5F5",
  indigo:  "#6366F1",
  gold:    "#F59E0B",
  emerald: "#10B981",
  rose:    "#F43F5E",
  amber:   "#F59E0B",
  violet:  "#8B5CF6",
  cyan:    "#06B6D4",
  text1:   "#1A1714",
  text2:   "#475569",
  muted:   "#6B6560",
  border:  "rgba(0,0,0,0.05)",
  borderH: "rgba(0,0,0,0.08)",
  glass:   "rgba(0,0,0,0.03)",
}

// Workstation color map
const WS_COLORS = {
  "SQL Lab":          D.cyan,
  "Notebook":         D.emerald,
  "Frontend":         "#3B82F6",
  "API/Backend":      D.indigo,
  "Infra Terminal":   D.amber,
  "Cloud Arch":       "#0EA5E9",
  "Data Pipeline":    D.emerald,
  "BI Dashboard":     D.cyan,
  "SRE":              D.violet,
  "Security":         D.rose,
  "SOC":              "#F97316",
  "QA":               "#F97316",
  "System Design":    "#A78BFA",
  "AI/LLM":           D.violet,
  "Mobile":           "#3B82F6",
  "Product Strategy": D.cyan,
  "BA Board":         D.cyan,
  "Code IDE":         D.indigo,
}

const ALL_WORKSTATIONS = Object.keys(WS_COLORS)

// ─────────────────────────────────────────────────────────────────────────────
// ARENA LANDING — Operations Center dark cinematic redesign
// ─────────────────────────────────────────────────────────────────────────────
function ArenaLanding({ userData, onSelect }) {
  const domainKey  = resolveArenaDomain(userData)
  const domain     = ARENA_DOMAINS[domainKey] || ARENA_DOMAINS.swe
  const elo        = userData?.eloRating || userData?.elo_rating || 400
  const tier       = getTier(elo)
  const completed  = userData?.arena_completed || 0
  const streak     = userData?.arena_streak    || 0
  const name       = (userData?.name || userData?.displayName || "").split(" ")[0] || "there"
  const [hovMode, setHovMode] = useState(null)
  const [hovWs, setHovWs]     = useState(null)
  const [hovCard, setHovCard] = useState(null)
  const [tick, setTick]       = useState(0)

  // ── Stream detection: non-IT students get stream-aware cards ──
  const stream       = detectStudentStream(userData)
  const streamCfg    = stream ? STREAM_CARD_CONFIG[stream] : null
  const isEngineering = !!streamCfg

  const domainChallenges = getDomainChallenges(domainKey)
  const domainCategories = getDomainCategories(domainKey)

  // Reset countdown every minute
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  // Compute "resets in Xh Ym" — midnight UTC+5:30 (IST)
  const getResetCountdown = () => {
    const now   = new Date()
    const reset = new Date()
    reset.setUTCHours(18, 30, 0, 0) // midnight IST = 18:30 UTC
    if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1)
    const diff  = reset - now
    const h     = Math.floor(diff / 3600000)
    const m     = Math.floor((diff % 3600000) / 60000)
    return `${h}h ${m}m`
  }

  const diffColor = (d) =>
    d === "Easy"   ? D.emerald :
    d === "Hard"   ? D.rose :
    d === "Expert" ? D.violet : D.gold

  // Build 3 sample missions from the domain challenge bank
  const sampleMissions = domainChallenges.slice(0, 3)

  // Weekly progress (mock from userData)
  const weekDone    = Math.min(5, completed % 5 || (completed > 0 ? 4 : 0))
  const weekTotal   = 5

  return (
    <div style={{
      flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      fontFamily: "'DM Sans',sans-serif",
      overflowY: "auto",
      background: `
        radial-gradient(ellipse at 50% -20%, rgba(99,102,241,0.20) 0%, transparent 50%),
        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px),
        #FFFFFF
      `,
      backgroundSize: "auto, 40px 40px, 40px 40px",
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes bentoReveal {
          from { opacity: 0; transform: translateY(18px) scale(0.97) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        @keyframes eloPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0) }
          50%       { box-shadow: 0 0 0 8px rgba(99,102,241,0.18) }
        }
        @keyframes shimmerDark {
          0%   { background-position: -200% 0 }
          100% { background-position:  200% 0 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        .arena-ws-tile:hover { background: rgba(0,0,0,0.03) !important; border-color: rgba(0,0,0,0.08) !important; transform: translateY(-2px) !important; }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #D6D0C8; border-radius: 99px }
      `}</style>

      {/* ─── TOP HEADER BAR ─── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, height: 64,
        background: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", flexShrink: 0,
      }}>
        {/* Left: Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L3 4.5V11.5L8 15L13 11.5V4.5L8 1Z" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 1L8 15M3 4.5L13 11.5M13 4.5L3 11.5" stroke="#6366F1" strokeWidth="0.8" opacity="0.5"/>
          </svg>
          <span style={{ fontFamily: "'DM Mono','DM Mono',monospace", fontSize: 12, fontWeight: 800, color: D.text1, letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ARENA
          </span>
        </div>

        {/* Center: Status chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Domain chip */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 99 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#A5B4FC", display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#A5B4FC", fontFamily: "'DM Mono',monospace" }}>
              {domain.label}
            </span>
          </div>
          {/* ELO chip */}
          <div style={{ padding: "4px 12px", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 99 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: D.gold, fontFamily: "'DM Mono',monospace" }}>
              {elo} ELO
            </span>
          </div>
          {/* Streak badge */}
          {streak > 0 && (
            <div style={{ padding: "4px 10px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", borderRadius: 99 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: D.amber }}>🔥 {streak} days</span>
            </div>
          )}
        </div>

        {/* Right: Countdown + Generate */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: D.muted }}>
            Resets in {getResetCountdown()}
          </span>
          <button
            onClick={() => onSelect("domain")}
            style={{
              padding: "6px 14px", borderRadius: 8,
              background: "transparent",
              border: "1px solid rgba(0,0,0,0.07)",
              color: D.text2, fontSize: 11, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.color = D.text1 }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.07)"; e.currentTarget.style.color = D.text2 }}
          >
            Generate New
          </button>
        </div>
      </div>

      {/* ─── PAGE BODY ─── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "40px 24px 60px", boxSizing: "border-box" }}>

        {/* TODAY'S MISSIONS removed — users discover missions via the domain card below */}
        <div style={{ display: "none" }}>
          <div />

          {/* 3 Mission Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {sampleMissions.length > 0 ? sampleMissions.map((ch, idx) => {
              const dc      = diffColor(ch.difficulty)
              const isHov   = hovCard === idx
              const wsColor = WS_COLORS[ch.workstation] || D.indigo
              return (
                <div
                  key={ch.id || idx}
                  onClick={() => onSelect("domain")}
                  onMouseEnter={() => setHovCard(idx)}
                  onMouseLeave={() => setHovCard(null)}
                  style={{
                    background: "linear-gradient(135deg, #FFFFFF, #F5F5F5)",
                    border:     `1px solid ${isHov ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.05)"}`,
                    borderLeft: `3px solid ${dc}`,
                    borderRadius: 16,
                    padding: "22px 20px",
                    cursor: "pointer",
                    transition: "transform 250ms, box-shadow 250ms, border-color 250ms",
                    transform: isHov ? "translateY(-4px) scale(1.01)" : "none",
                    boxShadow: isHov
                      ? `0 8px 24px rgba(0,0,0,0.08), 0 0 0 1px ${dc}30, 0 4px 20px ${dc}20`
                      : "0 2px 8px rgba(0,0,0,0.3)",
                    animation: `bentoReveal 0.4s ease ${idx * 0.08}s both`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* TOP ROW */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                      color: dc,
                      background: dc + "18",
                      padding: "3px 9px", borderRadius: 99,
                      border: `1px solid ${dc}30`,
                    }}>{ch.difficulty}</span>
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: D.muted }}>
                      {ch.tools?.[0] || "Capabilio"}
                    </span>
                  </div>

                  {/* TITLE */}
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: D.text1, lineHeight: 1.35, marginBottom: 8,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {ch.title}
                  </div>

                  {/* SCENARIO EXCERPT */}
                  <div style={{
                    fontSize: 12, color: D.muted, lineHeight: 1.6, marginBottom: 14,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {ch.scenario}
                  </div>

                  {/* DIVIDER */}
                  <div style={{ height: 1, background: "rgba(0,0,0,0.03)", marginBottom: 12 }} />

                  {/* BOTTOM ROW */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Workstation chip */}
                    <span style={{
                      fontSize: 9, fontFamily: "'DM Mono',monospace", fontWeight: 700,
                      color: wsColor,
                      background: wsColor + "14",
                      padding: "3px 8px", borderRadius: 6,
                      border: `1px solid ${wsColor}25`,
                    }}>
                      [{ch.workstation || "Workstation"}]
                    </span>
                    {/* Time */}
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: D.muted }}>
                      ⏱ {ch.timeLimit || "25 min"}
                    </span>
                    {/* ELO */}
                    <span style={{ fontSize: 10, fontFamily: "'DM Mono',monospace", color: D.emerald, fontWeight: 700 }}>
                      +{ch.eloGain || 15} ELO
                    </span>
                    {/* Start button */}
                    <div style={{ marginLeft: "auto" }}>
                      <button
                        style={{
                          height: 32, padding: "0 14px",
                          background: isHov ? D.indigo : "rgba(99,102,241,0.15)",
                          border: `1px solid ${isHov ? D.indigo : "rgba(99,102,241,0.3)"}`,
                          borderRadius: 8, color: isHov ? "#fff" : D.indigo,
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          transition: "all 0.2s", fontFamily: "inherit",
                        }}
                      >
                        Start →
                      </button>
                    </div>
                  </div>
                </div>
              )
            }) : (
              /* Loading skeletons */
              [0,1,2].map(i => (
                <div key={i} style={{
                  background: "linear-gradient(135deg, #FFFFFF, #F5F5F5)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  borderLeft: "3px solid rgba(0,0,0,0.05)",
                  borderRadius: 16, padding: "22px 20px",
                  animation: `bentoReveal 0.4s ease ${i * 0.08}s both`,
                }}>
                  {[90, 60, 100, 60, 40].map((w, j) => (
                    <div key={j} style={{
                      height: j === 2 ? 16 : 10, marginBottom: j === 2 ? 12 : 8,
                      width: `${w}%`, borderRadius: 4,
                      background: "linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.02) 100%)",
                      backgroundSize: "200% 100%",
                      animation: `shimmerDark 1.8s ease infinite ${j * 0.15}s`,
                    }} />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── WEEK PROGRESS ─── */}
        <div style={{ marginTop: 28, animation: "fadeUp 0.45s ease 0.15s both" }}>
          <div style={{
            background: "rgba(0,0,0,0.03)",
            border: "1px solid rgba(0,0,0,0.05)",
            borderRadius: 12,
            padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 700, color: D.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  THIS WEEK
                </span>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: D.text2 }}>
                  {weekDone}/{weekTotal} challenges
                </span>
              </div>
              <div style={{ height: 5, background: "rgba(0,0,0,0.03)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${(weekDone / weekTotal) * 100}%`,
                  background: `linear-gradient(90deg, ${D.indigo}, #818CF8)`,
                  borderRadius: 99, transition: "width 0.6s ease",
                }} />
              </div>
            </div>
            {streak > 0 && (
              <span style={{ fontSize: 11, color: D.amber, whiteSpace: "nowrap" }}>🔥 Keep your streak alive</span>
            )}
          </div>
        </div>

        {/* ─── ENTRY CARDS ─── */}
        <div style={{ marginTop: 32, animation: "fadeUp 0.5s ease 0.22s both" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>

            {/* ── YOUR ROLE card ── */}
            {(() => {
              // Non-IT: use stream domain practice config
              const cfg    = isEngineering ? streamCfg.role : null
              const col    = cfg ? cfg.color    : D.indigo
              const bg     = cfg ? cfg.colorBg  : "rgba(99,102,241,0.1)"
              const border = cfg ? cfg.colorBorder : "rgba(99,102,241,0.2)"
              const icon   = cfg ? cfg.icon     : domain.icon
              const label  = cfg ? cfg.label    : domain.label
              const desc   = cfg
                ? cfg.desc
                : `Real-world ${domain.label} scenarios — practice the exact skills recruiters hire for. ELO-scored, timestamped, recruiter-visible.`
              const tags   = cfg ? cfg.tags : domainCategories.slice(0,4).map(c => `${c.icon} ${c.category}`)
              const cta    = cfg ? cfg.cta : `Open ${domain.label} Challenges`
              const count  = cfg ? null : `${domainChallenges.length} challenges`
              // Routing: non-IT engineering streams → common challenges filtered by domain categories
              // DevOps (categories:null) and IT → domain workstation
              const handleClick = () => isEngineering
                ? (streamCfg.role.categories
                    ? onSelect("common", { categories: streamCfg.role.categories })
                    : onSelect("domain"))
                : onSelect("domain")

              return (
                <div
                  onClick={handleClick}
                  onMouseEnter={() => setHovMode("domain")}
                  onMouseLeave={() => setHovMode(null)}
                  style={{
                    background: hovMode === "domain"
                      ? `linear-gradient(135deg, ${bg.replace("0.1","0.12")}, ${bg.replace("0.1","0.05")})`
                      : "#FFFFFF",
                    border: `1.5px solid ${hovMode === "domain" ? col + "70" : "#E8E3DA"}`,
                    borderRadius: 20, padding: "28px 28px 24px", cursor: "pointer",
                    transition: "all 0.2s",
                    transform: hovMode === "domain" ? "translateY(-4px)" : "none",
                    boxShadow: hovMode === "domain"
                      ? `0 12px 40px ${col}28`
                      : "0 2px 8px rgba(0,0,0,0.05)",
                    position: "relative", overflow: "hidden",
                  }}
                >
                  <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle, ${col}15, transparent 70%)`, pointerEvents:"none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink:0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: col, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>YOUR ROLE</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: D.text1, lineHeight: 1.2 }}>{label}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: D.muted, lineHeight: 1.7, margin: "0 0 16px" }}>{desc}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                    {tags.slice(0,4).map(tag => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 700, color: col, background: bg, padding: "4px 10px", borderRadius: 99, border: `1px solid ${border}` }}>{tag}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: col, display:"flex", alignItems:"center", gap:4 }}>
                      {cta}
                      {!cfg && <span style={{ fontSize:16, transition:"transform 0.2s", display:"inline-block", transform: hovMode==="domain" ? "translateX(4px)" : "none" }}>→</span>}
                    </span>
                    {count && <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, background: "#F3F4F6", padding: "3px 10px", borderRadius: 99 }}>{count}</span>}
                  </div>
                </div>
              )
            })()}

            {/* ── COMMON CHALLENGES card ── */}
            {(() => {
              const cfg    = isEngineering ? streamCfg.common : null
              const col    = cfg ? cfg.color    : D.violet
              const bg     = cfg ? cfg.colorBg  : "rgba(139,92,246,0.1)"
              const border = cfg ? cfg.colorBorder : "rgba(139,92,246,0.2)"
              const icon   = cfg ? cfg.icon     : "🧩"
              const label  = cfg ? cfg.label    : "Algorithm Challenges"
              const desc   = cfg
                ? cfg.desc
                : "LeetCode-style problems with a real code editor, automated test runner, and AI review. Build algorithmic muscle across any role."
              const tags   = cfg
                ? cfg.tags
                : ["🧩 DSA", "🔍 Binary Search", "🌲 Trees", "📊 DP", "⚡ Greedy"]
              const cta    = cfg ? cfg.cta : "Start Coding"
              const count  = cfg ? cfg.count : "200+ problems"
              // DevOps common.categories is null → same IT/CSE path (DSA+SQL, no ECE/EEE)
              const handleClick = () => isEngineering
                ? (streamCfg.common.categories
                    ? onSelect("common", { categories: streamCfg.common.categories })
                    : onSelect("common"))
                : onSelect("common")

              return (
                <div
                  onClick={handleClick}
                  onMouseEnter={() => setHovMode("common")}
                  onMouseLeave={() => setHovMode(null)}
                  style={{
                    background: hovMode === "common"
                      ? `linear-gradient(135deg, ${bg.replace("0.1","0.12")}, ${bg.replace("0.1","0.05")})`
                      : "#FFFFFF",
                    border: `1.5px solid ${hovMode === "common" ? col + "70" : "#E8E3DA"}`,
                    borderRadius: 20, padding: "28px 28px 24px", cursor: "pointer",
                    transition: "all 0.2s",
                    transform: hovMode === "common" ? "translateY(-4px)" : "none",
                    boxShadow: hovMode === "common"
                      ? `0 12px 40px ${col}28`
                      : "0 2px 8px rgba(0,0,0,0.05)",
                    position: "relative", overflow: "hidden",
                  }}
                >
                  <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160, borderRadius:"50%", background:`radial-gradient(circle, ${col}15, transparent 70%)`, pointerEvents:"none" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: bg, border: `2px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink:0 }}>{icon}</div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 800, color: col, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 3 }}>COMMON CHALLENGES</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: D.text1, lineHeight: 1.2 }}>{label}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: D.muted, lineHeight: 1.7, margin: "0 0 16px" }}>{desc}</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                    {tags.slice(0,5).map(s => (
                      <span key={s} style={{ fontSize: 10, fontWeight: 700, color: col, background: bg, padding: "4px 10px", borderRadius: 99, border: `1px solid ${border}` }}>{s}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: col, display:"flex", alignItems:"center", gap:4 }}>
                      {cta}
                      <span style={{ fontSize:16, transition:"transform 0.2s", display:"inline-block", transform: hovMode==="common" ? "translateX(4px)" : "none" }}>→</span>
                    </span>
                    {count && <span style={{ fontSize: 11, fontWeight: 700, color: D.muted, background: "#F3F4F6", padding: "3px 10px", borderRadius: 99 }}>{count}</span>}
                  </div>
                </div>
              )
            })()}

          </div>
        </div>

        {/* ─── ELO TIER BAR ─── */}
        <div style={{ marginTop: 28, animation: "fadeUp 0.55s ease 0.35s both" }}>
          <div style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.05)", borderRadius: 12, padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: D.text2 }}>
                <span style={{ fontWeight: 800, color: tier.color, animation: "eloPulse 3s ease infinite" }}>{tier.icon} {tier.label}</span>
                <span style={{ marginLeft: 10, color: D.muted }}>{elo} ELO · {tier.max - elo > 0 ? `${tier.max - elo} to next tier` : "Max tier reached"}</span>
              </div>
              <EloRing elo={elo} size={40} color={tier.color} />
            </div>
            <div style={{ display: "flex", gap: 3 }}>
              {ELO_TIERS.map((t, i) => (
                <div key={i} title={t.label} style={{ flex: 1 }}>
                  <div style={{ height: 4, borderRadius: 3, background: elo >= t.min ? t.color : "rgba(0,0,0,0.05)", transition: "background 0.4s" }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 11, color: D.muted, marginTop: 20 }}>
          All submissions are timestamped, ELO-scored, and visible to recruiters on your Capabilio profile.
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ARENA COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Arena({ user, userData, setUserData }) {
  // arenaView: "landing" | "common" | "domain"
  const [arenaView, setArenaView]             = useState("landing")
  // streamCategories: array of DB category strings to filter problems, or null for all
  const [streamCategories, setStreamCategories] = useState(null)

  useEffect(() => {
    const saved = sessionStorage.getItem("capabilio_arena_view")
    // Only restore domain view from session — for "common" we need to re-derive
    // streamCategories from userData (they are never persisted to sessionStorage).
    // Restoring "common" without its categories causes the unfiltered 1000-challenge dump.
    if (saved === "domain") setArenaView(saved)
    // "common" is intentionally NOT restored here — user goes through landing to
    // re-derive their stream categories correctly on every hard reload.
  }, [])

  // onSelect(view) for IT students  |  onSelect(view, { categories }) for non-IT
  const handleSelectView = (view, opts) => {
    setArenaView(view)
    sessionStorage.setItem("capabilio_arena_view", view)
    if (opts?.categories) {
      setStreamCategories(opts.categories)
    }
  }

  const handleBack = () => {
    setArenaView("landing")
    setStreamCategories(null)
    sessionStorage.removeItem("capabilio_arena_view")
    sessionStorage.removeItem("capabilio_arena_domain")
  }

  if (arenaView === "landing") {
    return <ArenaLanding userData={userData} onSelect={handleSelectView} />
  }

  if (arenaView === "common") {
    return (
      <ArenaCommonChallenges
        user={user}
        userData={userData}
        onBack={handleBack}
        streamCategories={streamCategories}
      />
    )
  }

  return <ArenaDomain user={user} userData={userData} setUserData={setUserData} onBack={handleBack} />
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN ARENA — extracted from original Arena, now a sub-component
// Keeps all existing workstation / mission / history / leaderboard logic.
// Only change: removed the DSA/Domain/Missions sub-tabs — domain challenges only.
// ─────────────────────────────────────────────────────────────────────────────
function ArenaDomain({ user, userData, setUserData, onBack }) {
  // Domain is locked to the user's profile — no switching allowed
  // honour domain override set by ArenaLanding domain quick-switch
  const domainOverride = sessionStorage.getItem("capabilio_arena_domain")
  const domainKey = (domainOverride && ARENA_DOMAINS[domainOverride]) ? domainOverride : resolveArenaDomain(userData)

  const [activeModuleId, setActiveModuleId]   = useState(null)
  const [activeMission, setActiveMission]     = useState(null)
  const [activeMissionSlot, setActiveMissionSlot] = useState(null)
  const [code, setCode]                       = useState("")
  const [codeMap, setCodeMap]                 = useState({})
  const [activeWsTab, setActiveWsTab]         = useState(null)
  const [arenaTab, setArenaTab]               = useState("missions")
  const [upgradeModal, setUpgradeModal]       = useState(null)
  const [localSubscription, setLocalSubscription] = useState(null)
  const effectiveUserData = localSubscription ? { ...userData, subscription: localSubscription } : userData
  const [evalResult, setEvalResult]           = useState(null)
  const [submitting, setSubmitting]           = useState(false)
  const [showLibrary, setShowLibrary]         = useState(false)  // toggle between slots view and full picker
  const [elo, setElo]   = useState(userData?.eloRating || userData?.elo_rating || 500)
  const [streak]        = useState(userData?.streak || userData?.arena_streak || 0)
  const [timeLeft, setTimeLeft]               = useState(null)
  const timerRef                              = useRef(null)
  const [decayBanner, setDecayBanner]         = useState(null) // { penalty, daysOwed, newElo }

  // ── ELO inactivity decay ─ -5 ELO/day after 14-day grace period ─────────
  // Single authoritative decay engine. Writes via userDoc.update() so that:
  //   • toSnake() maps arenaDecayAppliedAt → arena_decay_applied_at correctly
  //   • Supabase Realtime fires and propagates the new ELO to App.jsx → all pages
  // setUserData is called immediately for zero-latency UI update everywhere.
  useEffect(() => {
    const uid = user?.id || user?.uid
    if (!uid) return

    async function checkEloDecay() {
      try {
        // 1. Last mission submission (freshest activity signal)
        const { data: lastRow } = await supabase
          .from("arena_history")
          .select("completed_at")
          .eq("user_id", uid)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        // 2. Profile — read arena_decay_applied_at (decay cursor) + elo_rating
        const { data: profile } = await supabase
          .from("profiles")
          .select("arena_decay_applied_at, created_at, elo_rating")
          .eq("id", uid)
          .maybeSingle()

        // Baseline: last submission date, or account creation if brand-new
        const baseIso = lastRow?.completed_at || profile?.created_at || new Date().toISOString()
        const baseDay = new Date(baseIso)
        baseDay.setHours(0, 0, 0, 0)

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayStr = today.toISOString().slice(0, 10)

        const daysSinceActivity = Math.floor((today - baseDay) / 86_400_000)
        if (daysSinceActivity <= 14) return   // within 14-day grace — no penalty

        // Where did decay last stop? Default to the moment grace ended.
        const graceEnd = new Date(baseDay)
        graceEnd.setDate(graceEnd.getDate() + 14)

        const lastCursorRaw = profile?.arena_decay_applied_at
        const lastCursor = lastCursorRaw ? new Date(lastCursorRaw) : new Date(graceEnd)
        lastCursor.setHours(0, 0, 0, 0)

        // Guard: already applied today
        if (lastCursor.toISOString().slice(0, 10) === todayStr) return

        const daysOwed = Math.floor((today - lastCursor) / 86_400_000)
        if (daysOwed <= 0) return

        const penalty    = daysOwed * 5
        const currentElo = profile?.elo_rating ?? elo
        const newElo     = Math.max(0, currentElo - penalty)

        // ── Write via userDoc so toSnake() maps camelCase and Realtime fires ──
        await userDoc.update(uid, {
          eloRating:            newElo,
          arenaDecayAppliedAt:  today.toISOString(),
        })

        // ── Immediately sync app-level userData so Aura/Header update without
        //    waiting for the Realtime round-trip (~200 ms latency) ──────────
        if (setUserData) {
          setUserData(d => ({
            ...d,
            eloRating:           newElo,
            elo_rating:          newElo,
            arenaDecayAppliedAt: today.toISOString(),
            eloDecayDate:        todayStr,   // prevents Aura double-applying
          }))
        }

        setElo(newElo)
        setDecayBanner({ penalty, daysOwed, newElo })
      } catch (e) {
        console.warn("ELO decay check failed:", e)
      }
    }

    checkEloDecay()
  }, [])  // eslint-disable-line

  const domain  = ARENA_DOMAINS[domainKey] || ARENA_DOMAINS.swe
  const modules = domain.modules || []

  useEffect(() => {
    setActiveModuleId(domain.defaultModule || modules[0]?.id || null)
  }, [domainKey])   // eslint-disable-line

  // ── Domain challenge slots (smart rotation, 24hr cooldown) ───────────────
  const domainSlots = useDomainChallengeSlots(effectiveUserData)

  // ── Convert local challenge bank object → Arena mission format ────────────
  // _isDomainChallenge = true prevents DSA mis-detection for code-sandbox domain challenges
  const challengeToMission = (challenge) => ({
    id:                 challenge.id,
    title:              challenge.title,
    description:        challenge.scenario,
    scenario:           challenge.scenario,
    objective:          challenge.objective,
    steps:              challenge.steps || [],
    difficulty:         challenge.difficulty,
    timeLimit:          challenge.timeLimit,
    eloGain:            challenge.eloGain,
    eloReward:          challenge.eloGain,
    category:           challenge.category,
    skillTags:          challenge.skillTags || [],
    tags:               challenge.skillTags || [],
    hints:              challenge.hints || [],
    workstation:        challenge.workstation,
    sandbox_type:       challenge.workstation,
    starterCode:        challenge.starterCode || "",
    tools:              challenge.tools || [],
    icon:               challenge.icon,
    lang:               challenge.lang || "",
    _isDomainChallenge: true,   // prevents misclassification as DSA on submit
  })

  // Legacy server missions hook (kept for history/leaderboard data)
  const rawMissionsHook = useArenaMissions()
  const markCompleted   = rawMissionsHook?.markCompleted || null

  // ── Parse timeLimit string → seconds (e.g. "25-35 min" → 25*60, "20 min" → 1200) ──
  const parseTimeLimitSecs = (tl) => {
    if (!tl) return 25 * 60               // default 25 min
    if (typeof tl === "number") return tl > 300 ? tl : tl * 60
    const nums = tl.match(/\d+/g)
    const mins = nums ? parseInt(nums[0]) : 25
    return Math.max(5, mins) * 60         // minimum 5 min
  }

  // ── Countdown timer — clears on unmount or new mission ──
  const startTimer = useCallback((secs) => {
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeLeft(secs)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && activeMission && !submitting && !evalResult) {
      handleSubmit(true)  // true = timeout submission
    }
  }, [timeLeft]) // eslint-disable-line

  const handleSelectMission = useCallback((mission, slotIndex) => {
    setActiveMission(mission)
    setActiveMissionSlot(slotIndex ?? null)
    setEvalResult(null)

    if (mission?.isMultiWorkstation && Array.isArray(mission.workstations)) {
      // Multi-workstation mission: initialise a code slot per workstation
      const initialMap = {}
      mission.workstations.forEach(ws => { initialMap[ws] = "" })
      setCodeMap(initialMap)
      setCode("")
      setActiveWsTab(mission.workstations[0])
    } else {
      setCodeMap({})
      // Build a clean scaffold from mission steps/objective so students aren't given the answer.
      // Only use starterCode from DB if it's short (< 250 chars) — a genuine hint/skeleton.
      // Long starterCodes are almost always full solutions accidentally set during challenge generation.
      const sc = mission?.starterCode || ""
      const starterIsSafe = sc.length > 0 && sc.length < 250
      const starter = starterIsSafe ? sc : buildSkeleton(mission, domainKey)
      setCode(starter)
      setActiveWsTab(null)
      // Respect the challenge's sandbox type (sql, notebook, react, markdown, code, etc.)
      const missionSandbox = mission?.workstation || mission?.sandbox_type
      const sandbox = missionSandbox || resolveSandboxType(mission, domainKey)
      const matchingMod = modules.find(m => m.sandbox === sandbox) || modules[0]
      if (matchingMod) setActiveModuleId(matchingMod.id)
    }
    if (mission._practice) {
      if (timerRef.current) clearInterval(timerRef.current)
      setTimeLeft(null)              // free practice is untimed and unranked
    } else {
      startTimer(parseTimeLimitSecs(mission.timeLimit))
    }
  }, [domainKey, modules, startTimer])

  // ── Free practice — open a workstation with no ranked challenge (Mission Desk quick access) ──
  const handleFreePractice = useCallback((wsType, meta) => {
    const mission = {
      id:          `practice_${wsType}`,
      title:       `Free Practice — ${meta.label}`,
      description: `The full ${meta.label} environment with seeded data and real execution. Warm up, experiment, build muscle memory — nothing here is ranked or recorded.`,
      scenario:    `Open exploration in the ${meta.label}. Try the tools, run things, break things.`,
      objective:   "Explore freely. Validation and preview work exactly like a ranked mission, so you can rehearse the full workflow.",
      steps:       [],
      hints:       [],
      difficulty:  null,
      timeLimit:   null,
      eloGain:     0,
      workstation: wsType,
      sandbox_type: wsType,
      starterCode: "",
      _isDomainChallenge: true,
      _practice:   true,
      __source:    "practice",
    }
    handleSelectMission(mission, null)
  }, [handleSelectMission])

  // ── Meaningful code check — strips comments, whitespace, TODO lines ──
  const getMeaningfulLines = (src) => {
    return (src || "").split("\n").filter(l => {
      const t = l.trim()
      return t.length > 0
        && !t.startsWith("--")
        && !t.startsWith("#")
        && !t.startsWith("//")
        && !t.startsWith("/*")
        && !t.startsWith("*")
        && !t.toUpperCase().includes("TODO")
        && !t.toUpperCase().includes("IMPLEMENT")
    })
  }

  // ── Integrity detection — catches copy-paste-and-submit cheating ──────────
  // Returns { isCheat, flags, verdict } based on behavioral signals.
  // Conservative thresholds to avoid false positives on fast typists.
  function detectIntegrity({ pasteCount, keystrokeCount, timeOnTaskSecs, typedLen }) {
    const flags = []

    // Signal 1: Code exists but almost no keystrokes.
    // You cannot write >80 non-starter chars with ≤5 onCodeChange events.
    // Each onCodeChange = one editor value change (one keystroke, or one paste event = +1).
    // So keystrokeCount ≤ 5 with typedLen > 80 means the content arrived via paste.
    if (typedLen > 80 && keystrokeCount <= 5) {
      flags.push({
        code: "PASTE_NO_KEYS",
        msg: `${typedLen} chars written with only ${keystrokeCount} editor event(s)`,
      })
    }

    // Signal 2: At least one explicit paste AND nearly no typing effort.
    // pasteCount is incremented by onPaste on the editor wrapper div.
    // If they pasted AND have ≤10 total change events, they didn't type the answer.
    if (pasteCount >= 1 && keystrokeCount <= 10 && typedLen > 100) {
      flags.push({
        code: "DIRECT_PASTE",
        msg: `${pasteCount} paste event(s) with only ${keystrokeCount} keystroke(s) for ${typedLen} chars`,
      })
    }

    // Signal 3: Typing speed physically impossible.
    // Professional typists max out at ~120 WPM = ~600 chars/min = 10 chars/sec.
    // If observed rate > 15 chars/sec for substantial code, it's a paste.
    const charsPerSec = timeOnTaskSecs > 5 ? typedLen / timeOnTaskSecs : 0
    if (charsPerSec > 15 && typedLen > 150) {
      flags.push({
        code: "IMPOSSIBLE_SPEED",
        msg: `${Math.round(charsPerSec)} chars/sec (max human rate is ~10)`,
      })
    }

    // Confidence: any one "hard" flag (PASTE_NO_KEYS or DIRECT_PASTE) = definite cheat.
    // IMPOSSIBLE_SPEED alone needs corroboration from another flag.
    const hardFlags  = flags.filter(f => ["PASTE_NO_KEYS", "DIRECT_PASTE"].includes(f.code))
    const isCheat    = hardFlags.length >= 1 || flags.length >= 2

    let verdict = "clean"
    if (isCheat && hardFlags.length >= 1) verdict = "definite_paste"
    else if (isCheat) verdict = "suspicious"

    return { isCheat, flags, verdict }
  }

  const handleSubmit = async (timedOutOrPayload = false, _unused = null) => {
    // handleSubmit is called two ways:
    //   1. timeout auto-submit: handleSubmit(true)
    //   2. manual submit from ChallengeShell: handleSubmit({ validation, passCount, totalChecks, hintsUsed, validationsRun })
    const timedOut = timedOutOrPayload === true
    const validationPayload = (timedOutOrPayload && typeof timedOutOrPayload === "object") ? timedOutOrPayload : null

    // Extract real validation results if available
    const valChecks    = validationPayload?.validation || []
    const realChecks   = valChecks.filter(v => !v.info)
    const valPassCount = validationPayload?.passCount ?? realChecks.filter(v => v.passed).length
    const valTotal     = validationPayload?.totalChecks ?? realChecks.length
    const failedChecks = realChecks.filter(v => !v.passed)

    // ── For multi-workstation missions, aggregate all workstation code ──
    const isMulti = activeMission?.isMultiWorkstation && Object.keys(codeMap).length > 0
    const submissionAnswer = isMulti ? codeMap : code

    // ── Compute meaningful lines up-front (used for guard + fallback score) ──
    const allContent = isMulti ? Object.values(codeMap).join("\n") : (code || "")
    const meaningful = getMeaningfulLines(allContent)

    // Guard: reject if nothing meaningful was written
    if (!timedOut) {
      if (isMulti) {
        if (meaningful.length < 3) {
          alert("⚠️ Complete at least one workstation before submitting.")
          return
        }
      } else {
        if (meaningful.length < 3) {
          alert("⚠️ Write your solution first — blank or comment-only submissions are not accepted.")
          return
        }
      }
    }

    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitting(true)

    // ── Fallback score from line count (used if AI review fails) ──
    const lineScore  = Math.min(100, meaningful.length * 6)
    const baseScore  = timedOut ? Math.min(50, lineScore) : lineScore

    // ── Collect behavioral signals from ProblemSolvePage tracker ──
    const behavioral = activeMission?.__behavioral || {}
    const pasteCount     = behavioral.pasteCount     || 0
    const keystrokeCount = behavioral.keystrokeCount || 0
    const timeOnTaskSecs = behavioral.timeOnTaskSecs || 0
    const starterLen     = behavioral.starterLen     || 0
    const hintsUsed      = validationPayload?.hintsUsed ?? behavioral.hintsUsed ?? 0
    const validationsRun = validationPayload?.validationsRun ?? behavioral.validationsRun ?? 0
    const typedLen       = Math.max(0, allContent.length - starterLen)
    // Suspect if >60% of non-starter code was pasted and keystrokes are low
    const pasteRatio     = typedLen > 0 ? Math.round((pasteCount * 80) / Math.max(typedLen, 1) * 100) / 100 : 0

    // ── Integrity check ──
    const integrity = detectIntegrity({ pasteCount, keystrokeCount, timeOnTaskSecs, typedLen })

    // ── If cheat detected: record warning + ELO penalty via backend ──
    // Returns { warningCount, eloPenalty, newElo, isBanned, banUntil }
    let cheatWarning = null
    if (integrity.isCheat && !isPractice) {
      const _uid = user?.id || user?.uid
      if (_uid) {
        try {
          const _SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"
          const flagRes = await fetch(`${_SERVER}/api/arena/flag-integrity`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid:          _uid,
              missionId:    activeMission?.id || activeMission?.slug || null,
              missionTitle: activeMission?.title || "",
              flags:        integrity.flags,
              verdict:      integrity.verdict,
              behavioral:   { pasteCount, keystrokeCount, timeOnTaskSecs, typedLen },
            }),
          })
          if (flagRes.ok) cheatWarning = await flagRes.json()
        } catch { /* non-fatal — modal shows with fallback */ }
      }
    }

    // ── Call AI review endpoint with behavioral context ──
    let aiReview = null
    if (meaningful.length >= 2) {
      try {
        const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"
        const res = await fetch(`${SERVER}/api/arena/review`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challenge:     activeMission,
            answer:        submissionAnswer,
            keyword:       isDSA ? "Data Structures & Algorithms" : (userData?.keyword || "Software Development"),
            eloRating:     elo,
            streak,
            challengeType: isDSA ? "dsa" : "domain",
            timedOut,
            // Validation context — gives AI ground truth about what actually passed/failed
            validationResults: {
              passCount: valPassCount,
              totalChecks: valTotal,
              passRate: valTotal > 0 ? valPassCount / valTotal : null,
              failedChecks: failedChecks.map(f => ({ label: f.input, error: f.actual || f.expected })),
            },
            // Behavioral signals — used by AI to give honest, personalised feedback
            behavioral: { pasteCount, keystrokeCount, timeOnTaskSecs, pasteRatio, typedLen, hintsUsed, validationsRun },
          }),
        })
        if (res.ok) {
          const d = await res.json()
          if (d && typeof d.score === "number") aiReview = d
        }
      } catch {}
    }

    // ── Detect challenge type: DSA vs Domain ──
    // _isDomainChallenge flag is set on all domain-bank challenges so code-sandbox
    // domain challenges (e.g. backend JWT auth) are NOT misclassified as DSA.
    const isDSA = !activeMission?._isDomainChallenge && (
      ["dsa","algorithm","DSA","Arrays","Strings","Hash Maps","Two Pointers",
       "Sliding Window","Stack","Queue","Linked List","Binary Search","Trees","Graphs","DP"]
      .includes(activeMission?.category || activeMission?.type || "")
      || (activeMission?.workstation || activeMission?.sandbox_type) === "code"
    )

    // ── Rubric: DSA gets algorithm-specific criteria, Domain gets role rubric ──
    const DSA_RUBRIC = [
      { criterion: "Correctness" },
      { criterion: "Time Complexity" },
      { criterion: "Space Complexity" },
      { criterion: "Code Quality" },
      { criterion: "Edge Cases" },
    ]
    const activeRubric = isDSA ? DSA_RUBRIC : (domain.rubric || DSA_RUBRIC)

    // ── Final score: Validation pass rate is ground truth, AI adds nuance ──
    // If the workstation ran validation checks, those results are authoritative.
    // A 3/5 pass rate means at most ~60% — the AI score cannot inflate this.
    const validationScore = valTotal > 0
      ? Math.round((valPassCount / valTotal) * 100)
      : null

    // Blend: validation score is the ceiling. AI can lower it further (quality issues)
    // but cannot raise it above what the checks actually passed.
    const rawFinalScore = aiReview?.score ?? baseScore
    const finalScore = validationScore !== null
      ? Math.min(validationScore, rawFinalScore)   // validation caps the score
      : rawFinalScore

    // ── Rubric rows: use AI-provided breakdown if available, else derive deterministically ──
    // Never use Math.random — that produces scores inconsistent with the summary and
    // confuses students about which areas actually need work.
    const aiRubric = aiReview?.rubric || aiReview?.rubricBreakdown || null
    const rubricRows = activeRubric.map((r, i) => {
      // If AI returned per-criterion scores, use them
      if (aiRubric && typeof aiRubric === "object") {
        const key = r.criterion.toLowerCase().replace(/\s+/g, "_")
        const val = aiRubric[r.criterion] ?? aiRubric[key] ?? aiRubric[i]
        if (typeof val === "number") return { criterion: r.criterion, score: Math.min(100, Math.max(0, val)) }
      }
      // Deterministic fallback: anchor each criterion to finalScore with a small
      // fixed offset per position (no randomness).
      const offsets   = [0, -4, -4, +5, -3]   // Correctness, Complexity1, Complexity2, Quality, EdgeCases
      const minFloor  = timedOut ? 15 : 30
      return {
        criterion: r.criterion,
        score: Math.min(100, Math.max(minFloor, finalScore + (offsets[i] ?? 0))),
      }
    })

    // ELO gain — timeouts still earn based on score (AI reviewed) so the gain is meaningful.
    // A student who wrote real code and scored 40+ on timeout shouldn't get the same as blank.
    const isPractice = !!activeMission?._practice

    // Integrity override: cheated submissions lose ELO (-10 penalty, floored at 0)
    const ELO_CHEAT_PENALTY = -10
    const eloGain = isPractice ? 0 : integrity.isCheat ? ELO_CHEAT_PENALTY : timedOut
      ? (finalScore >= 60 ? 8 : finalScore >= 40 ? 4 : meaningful.length >= 5 ? 2 : 0)
      : (finalScore >= 80 ? 25 : finalScore >= 60 ? 12 : finalScore >= 40 ? 5 : 3)
    const newElo = Math.max(0, elo + eloGain)

    const gradeFor = s => s >= 90 ? "A+" : s >= 80 ? "A" : s >= 70 ? "B+" : s >= 60 ? "B" : s >= 50 ? "C" : "D"

    // ── Domain-aware fallback feedback — used when AI server is unreachable ──
    const category = activeMission?.category || ""
    const mTitle   = activeMission?.title    || "this challenge"

    const DOMAIN_TIPS = {
      "Data Cleaning":        "Data quality is the foundation of every analysis. Always validate: null counts, duplicate keys, data type consistency, and referential integrity before any aggregation.",
      "Dashboard Building":   "Strong dashboards answer one question per visual. Audit your chart choices — bar for comparison, line for trends, pie only when parts sum to a meaningful whole.",
      "SQL Analysis":         "Review your query execution plan (EXPLAIN ANALYZE). Ensure JOINs are on indexed columns and GROUP BY precedes ORDER BY. CTEs improve readability but materialise — factor that into performance decisions.",
      "Analysis Report":      "Every claim needs a number. Structure with MECE root causes, quantify each finding, and make recommendations time-bound and owner-assigned.",
      "BI Tools":             "DAX context is the hardest concept in Power BI. Revisit CALCULATE(), FILTER(), and ALL() — they control which rows your measure sees. Check your star schema: all facts must flow through dimension tables.",
      "SQL Operations":       "Bulk updates should always use BEGIN/COMMIT with a pre-flight SELECT to verify row counts. Never update without a WHERE clause — add a dry-run check first.",
      "Advanced Analytics":   "Cohort analysis requires careful date-grain alignment. Ensure your cohort month and activity month use the same DATE_TRUNC level, and always verify Month 0 = 100% retention.",
      "Auth System":          "JWT security depends on secret strength and expiry discipline. Access tokens should be short-lived (≤15 min), refresh tokens rotated on use, and never store either in localStorage.",
      "CI/CD Pipeline":       "Pipeline speed matters as much as correctness. Cache dependencies, parallelise test stages, and add a health-check step after deploy before routing traffic.",
      "Container Orchestration":"Resource limits prevent noisy-neighbour OOM kills. Liveness probes restart broken containers; readiness probes control traffic — always configure both with appropriate timeDelays.",
      "Component Build":      "React performance starts with avoiding unnecessary re-renders. Use React.memo on pure components, useCallback on handlers passed as props, and verify with React DevTools Profiler.",
      "Form Engineering":     "Validate on blur, not on every keystroke — it prevents premature error messages. Disable the submit button only after first attempted submission, not on initial render.",
      "Query Optimization":   "The fix for a Seq Scan on a large table is almost always a composite index with equality columns first, range/sort columns last. Verify with EXPLAIN ANALYZE before and after.",
      "Application Security": "OWASP Top 10 starts with injection. Always parameterise queries, use helmet() for headers, rate-limit on the IP level, and never log sensitive data or stack traces to client responses.",
      "System Design":        "Good system design answers three questions: what is the scale, where is the bottleneck at that scale, and how do you fail gracefully when that bottleneck breaks.",
    }

    const fallbackTip = DOMAIN_TIPS[category]
      || (isDSA
        ? "Focus on Time Complexity and Edge Cases — these are what interviewers check first."
        : `For ${domain.label} roles, recruiters look for: ${activeRubric.slice(0,2).map(r => r.criterion).join(", ")}, and clear professional reasoning.`)

    // Build a contextual summary that references the specific failed checks
    const failedCheckSummary = failedChecks.length > 0
      ? ` ${failedChecks.length} check${failedChecks.length > 1 ? "s" : ""} failed: ${failedChecks.map(f => f.input).join("; ")}.`
      : ""
    const passRateSummary = valTotal > 0
      ? ` You passed ${valPassCount}/${valTotal} validation checks.`
      : ""
    const attemptsSummary = validationsRun > 1
      ? ` You ran validation ${validationsRun} time${validationsRun > 1 ? "s" : ""} before submitting.`
      : ""

    const fallbackSummary = timedOut
      ? `Time's up on "${mTitle}".${passRateSummary}${failedCheckSummary} A partial score has been awarded based on work completed.`
      : finalScore >= 80
        ? `Strong submission on "${mTitle}".${passRateSummary} ${category ? `Your ${category} work demonstrates solid professional competence.` : "Clean logic and solid execution."}`
        : finalScore >= 60
          ? `Good attempt on "${mTitle}".${passRateSummary}${failedCheckSummary}${attemptsSummary} ${category ? `Your ${category} solution covers the core requirement but those failing checks held back your score.` : "Core requirement met — fix the failing checks to reach a strong solve."}`
          : `"${mTitle}" needs more work.${passRateSummary}${failedCheckSummary}${attemptsSummary} ${category ? `For ${category} challenges, focus on the failing checks above before submitting — each one costs significant score.` : "Ensure the core validation requirements are met before submitting."}`

    // ── Integrity override — build cheat-specific feedback ──
    const integritySummary = integrity.isCheat
      ? `Integrity flag raised on "${activeMission?.title || "this challenge"}". ` +
        `Our system detected ${typedLen} characters of code submitted with only ${keystrokeCount} editor event(s) and ${pasteCount} paste operation(s) in ${timeOnTaskSecs}s on task. ` +
        `This pattern indicates the answer was not independently written. ` +
        `ELO gain: 0 pts (integrity violation). ` +
        `Capabilio measures genuine professional competence — copy-pasting from an AI tool or Stack Overflow won't build the muscle memory that holds up in a real interview. ` +
        `Work through the problem from scratch to earn real ELO and develop lasting skills.`
      : null

    // Build improvements list that explicitly names the failing checks
    const validationImprovements = failedChecks.map(f =>
      `Fix "${f.input}"${f.actual ? `: ${String(f.actual).slice(0, 120)}` : ""}`
    )
    const baseImprovements = aiReview?.improvements || (finalScore < 80 ? [`Deepen ${activeRubric[1]?.criterion || "quality"}`, `Review ${category || domain.label} best practices`] : [])
    const mergedImprovements = [...validationImprovements, ...baseImprovements.filter(i => !validationImprovements.some(v => v.includes(i.slice(0,15))))]

    const reviewResult = {
      score:          integrity.isCheat ? 0 : finalScore,
      eloGain,
      eloDelta:       eloGain,
      newElo,
      timedOut,
      rubric:         integrity.isCheat ? [] : rubricRows,
      grade:          integrity.isCheat ? "VOID" : (aiReview?.grade || gradeFor(finalScore)),
      summary:        integritySummary || aiReview?.summary || fallbackSummary,
      strengths:      integrity.isCheat ? [] : (aiReview?.strengths || (finalScore >= 70 ? [`Completed the core ${category || "challenge"} objective`, "Showed structured thinking"] : [])),
      improvements:   integrity.isCheat
        ? ["Submit only work you wrote yourself", "Use the Brief and Hints to guide your thinking", "Build your skills through genuine practice"]
        : mergedImprovements,
      tip:            integrity.isCheat ? null : (aiReview?.tip || fallbackTip),
      feedback:       integritySummary || aiReview?.summary || fallbackSummary,
      challengeType:  isDSA ? "dsa" : "domain",
      answer:         code,
      behavioral:     { pasteCount, keystrokeCount, timeOnTaskSecs, pasteRatio },
      // Validation breakdown — shown in result modal
      validationChecks: realChecks,
      validationPassCount: valPassCount,
      validationTotal:    valTotal,
      validationsRun,
      // Integrity metadata — used by EvaluationModal for the red flag banner
      integrityFlag:    integrity.isCheat,
      integrityFlags:   integrity.flags,
      integrityVerdict: integrity.verdict,
      // Warning tracking from backend (warningCount, isBanned, banUntil, eloPenalty)
      cheatWarning,
    }

    // ── Persist: ELO + arena_history + leaderboard ──
    try {
      const uid = user?.id || user?.uid
      if (uid && !isPractice) {
        // userDoc.update auto-normalises camelCase → snake_case via toSnake() in db.js
        const nowIso = new Date().toISOString()
        // Use skills array first; fall back to tags, then category — ensures skill graph always updates
        const missionSkills = (activeMission?.skills?.length > 0
          ? activeMission.skills
          : [...(activeMission?.tags || activeMission?.skillTags || []), activeMission?.category].filter(Boolean)
        ).slice(0, 4)  // cap at 4 skills per challenge to avoid polluting graph

        const existingGraph = userData?.skillGraph || userData?.skill_graph || []
        const updatedGraph = [...existingGraph]
        missionSkills.forEach(skill => {
          const idx = updatedGraph.findIndex(s => (s.label || s.skill || "").toLowerCase() === skill.toLowerCase())
          if (idx >= 0) {
            const prev = updatedGraph[idx].value || 0
            updatedGraph[idx] = { ...updatedGraph[idx], value: Math.round(prev * 0.6 + finalScore * 0.4), score: Math.round(prev * 0.6 + finalScore * 0.4) }
          } else {
            updatedGraph.push({ label: skill, skill, value: finalScore, score: finalScore })
          }
        })
        await userDoc.update(uid, {
          eloRating:       newElo,          // toSnake → elo_rating
          arenaLastActive: nowIso,          // toSnake → arena_last_active
          arenaCompleted:  (userData?.arena_completed || userData?.arenaCompleted || 0) + 1,
          ...(missionSkills.length > 0 ? { skillGraph: updatedGraph } : {}),
        })

        await arenaDb.addSubmission(uid, {
          task_id:          activeMission?.id || activeMission?.slug || domainKey,
          title:            activeMission?.title || "Arena Challenge",
          difficulty:       activeMission?.difficulty || "Medium",
          domain:           isDSA ? "dsa" : domainKey,
          challenge_type:   isDSA ? "dsa" : "domain",
          score:            finalScore,
          elo_delta:        eloGain,
          summary:          reviewResult.summary || "",
          scenario:         activeMission?.statement || activeMission?.scenario || activeMission?.description || "",
          submitted_answer: String(code || "").slice(0, 3000),
          feedback:         reviewResult.summary || "",
        })

        try {
          const prev = await arenaDb.getLeaderboardEntry(uid, domainKey)
          const prevCount = prev?.tasks_done || 0
          await arenaDb.upsertLeaderboard(uid, domainKey, {
            display_name: user.user_metadata?.full_name || userData?.display_name || userData?.displayName || "Anonymous",
            elo:      newElo,
            elo_delta: eloGain,
            tasks_done: prevCount + 1,
            streak,
          })
          const rank = await arenaDb.getRankCount(domainKey, newElo)
          await arenaDb.upsertLeaderboard(uid, domainKey, { rank })
        } catch {}
      }
      if (markCompleted && activeMissionSlot !== null) {
        await markCompleted(activeMissionSlot, activeMission, reviewResult)
      }
      // Lock the domain slot for 24hrs and schedule rotation to a new skill area
      if (activeMissionSlot !== null && domainSlots?.markCompleted && activeMission?.id) {
        await domainSlots.markCompleted(activeMissionSlot, activeMission.id)
      }
    } catch (e) { console.error("Arena persist error:", e) }

    setElo(newElo)
    setTimeLeft(null)
    setEvalResult(reviewResult)
    setSubmitting(false)
  }

  // ─── WORKSTATION ────────────────────────────────────────────────────────────
  const activeModule = modules.find(m => m.id === activeModuleId) || modules[0]

  const ARENA_TABS = [
    { id: "missions",     icon: "🎯", label: "Tasks"       },
    { id: "history",      icon: "📋", label: "History"     },
    { id: "leaderboard",  icon: "🏆", label: "Leaderboard" },
    { id: "streaks",      icon: "🔥", label: "Streaks"     },
  ]

  const tier = getTier(elo)
  const eloBarPct = Math.min(100, ((elo % 200) / 200) * 100)

  return (
    <div style={{ display: "flex", flexDirection: "row", height: "100%", background: "#F8F8F5", fontFamily: "'DM Sans',sans-serif", overflow: "hidden" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulseRing{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(2.2)}}
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
        @keyframes shimmer{0%,100%{opacity:0.5}50%{opacity:1}}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:99px}
      `}</style>

      {/* ── LEFT SIDEBAR — hidden when solving a challenge ── */}
      {!activeMission && (
        <div style={{ width: 216, background: "#111110", display: "flex", flexDirection: "column", flexShrink: 0, height: "100%", overflow: "hidden", borderRight: "1px solid rgba(0,0,0,0.02)" }}>
          {/* Logo + Domain */}
          <div style={{ padding: "16px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>
              Capabilio <span style={{ color: domain.color }}>AI</span>
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", background: `${domain.color}1A`, borderRadius: 7, border: `1px solid ${domain.color}30` }}>
              <span style={{ fontSize: 16 }}>{domain.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: domain.color, lineHeight: 1.2 }}>{domain.label}</div>
                <div style={{ fontSize: 9, color: "#A8A29E", letterSpacing: 0.3 }}>your domain</div>
              </div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#A8A29E", letterSpacing: 1, textTransform: "uppercase", padding: "10px 8px 5px" }}>Arena</div>
            {ARENA_TABS.map(t => {
              const isActive = arenaTab === t.id
              return (
                <button key={t.id} onClick={() => setArenaTab(t.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9, width: "100%",
                    padding: "8px 10px", borderRadius: 6, cursor: "pointer", border: "none",
                    marginBottom: 2, fontFamily: "inherit", textAlign: "left",
                    background: isActive ? `${domain.color}22` : "transparent",
                    color: isActive ? domain.color : "#6B6560",
                    fontSize: 12.5, fontWeight: isActive ? 700 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  <span style={{ width: 18, textAlign: "center", fontSize: 14, flexShrink: 0 }}>{t.icon}</span>
                  <span>{t.label}</span>
                  {t.id === "missions" && domainSlots.loadingSlots && <Spinner size={9} color={domain.color} />}
                </button>
              )
            })}
          </div>

          {/* ELO Card */}
          <div style={{ padding: "10px 10px 14px", borderTop: "1px solid rgba(0,0,0,0.03)" }}>
            {streak > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", marginBottom: 8, background: "#D9770614", border: "1px solid #D9770625", borderRadius: 99, width: "fit-content" }}>
                <span style={{ fontSize: 11 }}>🔥</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#D97706" }}>{streak}-day streak</span>
              </div>
            )}
            <div style={{ background: "rgba(0,0,0,0.02)", borderRadius: 8, padding: "10px 12px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ fontSize: 9, color: "#A8A29E", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 2 }}>ELO Rating</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{elo}</div>
              <div style={{ fontSize: 10, color: tier.color, fontWeight: 700, marginTop: 3 }}>{tier.icon} {tier.label}</div>
              <div style={{ marginTop: 8, background: "rgba(0,0,0,0.05)", borderRadius: 99, height: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", background: `linear-gradient(90deg, ${domain.color}, ${domain.color}99)`, borderRadius: 99, width: `${eloBarPct}%`, transition: "width 0.6s ease" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* ELO inactivity decay banner — shown once per session */}
        {decayBanner && (
          <div style={{
            background: "linear-gradient(90deg,#7C3AED,#DC2626)",
            color: "#fff", padding: "10px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0, gap: 12, zIndex: 30,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  ELO Decay Applied — {decayBanner.daysOwed} inactive day{decayBanner.daysOwed > 1 ? "s" : ""} detected
                </div>
                <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                  -{decayBanner.penalty} ELO deducted (−5/day after 14-day grace period). New ELO: <strong>{decayBanner.newElo}</strong>. Stay active to protect your rating.
                </div>
              </div>
            </div>
            <button
              onClick={() => setDecayBanner(null)}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: 6, padding: "4px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, flexShrink: 0 }}
            >Dismiss</button>
          </div>
        )}

        {/* Top bar: solve-mode vs normal */}
        {!activeMission && (
          <div style={{ background: "#FFFFFF", borderBottom: `1px solid ${T.border}`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", gap: 0, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, marginRight: 16 }}>
              {arenaTab === "missions" ? "⚔️ Arena" : arenaTab === "history" ? "📋 History" : arenaTab === "leaderboard" ? "🏆 Leaderboard" : "🔥 Streaks"}
            </div>
            {/* Back to landing */}
            <button onClick={onBack}
              style={{ padding:"0 14px", height:52, border:"none", background:"none", fontFamily:"inherit", fontSize:12, fontWeight:600, color:T.ink3, cursor:"pointer", marginRight:4, borderRight:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:5 }}>
              ← Back
            </button>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              {streak > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#D9770612", border: "1px solid #D9770622", borderRadius: 99 }}>
                  <span style={{ fontSize: 12 }}>🔥</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#D97706" }}>{streak}-day</span>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── TASKS TAB ── */}
      {arenaTab === "missions" && (
        <>
          {/* SOLVE MODE: full-screen when a challenge is active */}
          {activeMission && (
            <ChallengeShell
              mission={activeMission}
              domain={domain}
              domainKey={domainKey}
              code={code}
              onCodeChange={setCode}
              onSubmit={handleSubmit}
              submitting={submitting}
              onClear={() => { setActiveMission(null); setCode(""); setCodeMap({}); setActiveWsTab(null); setTimeLeft(null); if (timerRef.current) clearInterval(timerRef.current) }}
              timeLeft={timeLeft}
              CodeEditor={CodeEditor}
              uid={user?.id || user?.uid}
            />
          )}

          {/* SLOT VIEW — plan-gated daily challenges */}
          {!activeMission && !showLibrary && (
            <MissionDesk
              slots={domainSlots.slots}
              domain={domain}
              domainKey={domainKey}
              loadingSlots={domainSlots.loadingSlots}
              allChallenges={domainSlots.allChallenges}
              onBrowseAll={() => setShowLibrary(true)}
              unlockedCount={getPlan(effectiveUserData).arenaTasks}
              onUpgrade={(planId) => setUpgradeModal(planId)}
              onStart={(challenge, slotIndex, source) => {
                const mission = challengeToMission(challenge)
                mission.__source = source || "daily"
                handleSelectMission(mission, slotIndex)
              }}
              onFreePractice={handleFreePractice}
              onOpenHistory={() => setArenaTab("history")}
              elo={elo}
              streak={streak}
              completedCount={userData?.arena_completed || userData?.arenaCompleted || 0}
              uid={user?.id || user?.uid}
            />
          )}

          {/* LIBRARY VIEW — browse all challenges for the domain */}
          {!activeMission && showLibrary && (
            <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
              {/* Library header */}
              <div style={{ background:"#FFFFFF", borderBottom:`1px solid ${T.border}`, padding:"12px 24px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                <button onClick={() => setShowLibrary(false)}
                  style={{ padding:"5px 12px", border:`1px solid ${T.border}`, borderRadius:7, background:"none", fontSize:12, fontWeight:600, color:T.ink3, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
                  ← Daily Slots
                </button>
                <span style={{ fontSize:14, fontWeight:800, color:T.ink }}>Challenge Library — {domain.label}</span>
                <span style={{ fontSize:11, color:T.ink4 }}>{domainSlots.allChallenges.length} challenges</span>
              </div>
              <div style={{ flex:1, overflow:"hidden" }}>
                <DomainChallengePicker
                  domain={domain}
                  domainKey={domainKey}
                  onSelect={(challenge) => {
                    const mission = challengeToMission(challenge)
                    mission.__source = "library"
                    handleSelectMission(mission, null)  // null = not from a slot
                    setShowLibrary(false)
                  }}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {arenaTab === "history" && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0, background: "#FFFFFF" }}>
          <HistoryPanel uid={user?.id || user?.uid} domain={domain} />
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {arenaTab === "leaderboard" && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0, background: "#FFFFFF" }}>
          <LeaderboardWidget domain={domain} domainKey={domainKey} uid={user?.id || user?.uid} elo={elo} fullPage />
        </div>
      )}

      {/* ── STREAKS TAB ── */}
      {arenaTab === "streaks" && (
        <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
          <ArenaStreaks
            uid={user?.id || user?.uid}
            domain={domain}
            onGoToTasks={() => { setArenaTab("missions") }}
          />
        </div>
      )}

      {evalResult && <EvaluationModal result={evalResult} domain={domain} userEmail={user?.email || user?.user_metadata?.email} onClose={() => {
        setEvalResult(null)
        setActiveMission(null)
        setActiveMissionSlot(null)
        setCode("")
        setTimeLeft(null)
        setShowLibrary(false)
        setArenaTab("missions")  // Return to slots view so user sees the locked card + countdown
      }} />}

      {upgradeModal && (
        <UpgradeModal
          planId={upgradeModal}
          user={user}
          userData={effectiveUserData}
          onSuccess={(newPlanId) => {
            setLocalSubscription(newPlanId)
          }}
          onClose={() => setUpgradeModal(null)}
        />
      )}
      </div>
    </div>
  )
}
