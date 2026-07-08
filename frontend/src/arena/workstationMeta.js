/**
 * workstationMeta.js
 * The Arena action contract — per spec §7.2 of ARENA_OS_REDESIGN_SPEC.md.
 *
 * Every workstation family declares:
 *  - identity (label, icon, hue) used for the badge that unifies the product
 *  - the four action-bar slot labels (run · validate · preview · submit)
 *  - hideRun for direct-manipulation media (canvas, documents) where a fake
 *    Run verb would be dishonest
 *
 * The shell renders the four fixed slots; only the words change per family.
 * "Run Tests" exists ONLY where running tests is the actual job (QA) or the
 * universally-understood judge harness (Code IDE).
 */

export const WORKSTATION_META = {
  code: {
    label: "Code IDE", icon: "💻", hue: "#FF5701",
    actions: { run: "▶ Run Code", validate: "✓ Run Test Suite", preview: "👁 Preview Report", submit: "Submit Solution" },
  },
  frontend: {
    label: "Frontend Sandbox", icon: "🎨", hue: "#0EA5E9",
    actions: { run: "↻ Refresh Preview", validate: "✓ Run Checks", preview: "👁 Preview Build Proof", submit: "Submit Build" },
  },
  api: {
    label: "API Workstation", icon: "🔌", hue: "#16A34A",
    actions: { run: "▶ Start Server", validate: "✓ Run Contract Tests", preview: "👁 Preview API Proof", submit: "Submit API" },
  },
  sql: {
    label: "SQL Lab", icon: "🗃️", hue: "#2563EB",
    actions: { run: "▶ Run Query", validate: "✓ Validate Result", preview: "👁 Preview Query Proof", submit: "Submit Query" },
  },
  notebook: {
    label: "Notebook Lab", icon: "📓", hue: "#D97706",
    actions: { run: "▶ Run Cells", validate: "✓ Validate Findings", preview: "👁 Preview Analysis", submit: "Submit Analysis" },
  },
  dashboard: {
    label: "BI Dashboard Studio", icon: "📊", hue: "#0F766E",
    actions: { run: "▶ Run Query", validate: "✓ Validate Metrics", preview: "👁 Preview Dashboard", submit: "Submit Dashboard" },
  },
  data_pipeline: {
    label: "Data Pipeline Studio", icon: "⚙️", hue: "#059669",
    actions: { run: "▶ Run Pipeline", validate: "✓ Run Quality Gates", preview: "👁 Preview Pipeline Proof", submit: "Submit Pipeline" },
  },
  terminal: {
    label: "Infra Terminal", icon: "⌨️", hue: "#475569",
    actions: { run: "▶ Execute", validate: "✓ Verify State", preview: "👁 Preview Runbook Proof", submit: "Submit Configuration" },
  },
  sre_console: {
    label: "SRE Platform Console", icon: "🔭", hue: "#0EA5E9",
    actions: { run: "⟲ Run Simulation", validate: "✓ Validate Response", preview: "👁 Preview Incident Report", submit: "Submit Incident Report" },
  },
  security_console: {
    label: "Security Console", icon: "🔐", hue: "#DC2626",
    actions: { run: "▶ Run Analysis", validate: "✓ Validate Findings", preview: "👁 Preview Findings Report", submit: "Submit Findings" },
  },
  soc_console: {
    label: "SOC IR Console", icon: "🛡️", hue: "#DC2626",
    actions: { run: "⟲ Advance Scenario", validate: "✓ Validate Response", preview: "👁 Preview IR Report", submit: "Submit Incident Report" },
  },
  qa_lab: {
    label: "QA Test Lab", icon: "🧪", hue: "#7C3AED",
    actions: { run: "▶ Run Tests", validate: "✓ Check Coverage", preview: "👁 Preview Test Report", submit: "Submit Test Suite" },
  },
  business_analysis: {
    label: "Analysis Board", icon: "📋", hue: "#D97706", hideRun: true,
    actions: { validate: "✓ Check Completeness", preview: "👁 Preview Document", submit: "Submit Analysis" },
  },
  system_design: {
    label: "System Design Workspace", icon: "🏗️", hue: "#6B3FA0", hideRun: true,
    actions: { validate: "✓ Check Completeness", preview: "👁 Preview Proof", submit: "Submit Design" },
  },
  markdown: {
    label: "Document Studio", icon: "📝", hue: "#64748B", hideRun: true,
    actions: { validate: "✓ Check Completeness", preview: "👁 Preview Document", submit: "Submit Document" },
  },
  report: {
    label: "Report Studio", icon: "📄", hue: "#B45309", hideRun: true,
    actions: { validate: "✓ Check Completeness", preview: "👁 Preview Report", submit: "Submit Report" },
  },
  excel: {
    label: "Spreadsheet Lab", icon: "📗", hue: "#217346",
    actions: { run: "▶ Recalculate", validate: "✓ Validate Cells", preview: "👁 Preview Sheet Proof", submit: "Submit Sheet" },
  },
  react: { aliasOf: "frontend" },
  // ── Non-IT stream workstation — formula / numerical answer input ──────────
  calculator: {
    label: "Problem Solver", icon: "🧮", hue: "#0369A1", hideRun: true,
    actions: { validate: "✓ Check Answer", preview: "👁 Preview Proof", submit: "Submit Answer" },
  },
  // ── Domain-specific engineering workstations ──────────────────────────────
  engineering_lab: {
    label: "Engineering Lab", icon: "🔬", hue: "#0891B2", hideRun: true,
    actions: { validate: "✓ Check Answer", preview: "👁 Preview Proof", submit: "Submit Solution" },
  },
}

const DEFAULT_META = {
  label: "Workstation", icon: "🛠️", hue: "#FF5701",
  actions: { run: "▶ Run", validate: "✓ Validate", preview: "👁 Preview Proof", submit: "Submit Solution" },
}

export function getWorkstationMeta(type) {
  let m = WORKSTATION_META[type] || DEFAULT_META
  if (m.aliasOf) m = WORKSTATION_META[m.aliasOf] || DEFAULT_META
  return m
}

/** Mission source chips — assignment-first vocabulary (spec §2.4). */
export const SOURCE_META = {
  daily:     { label: "Daily Mission",  hue: "#FF5701" },
  repair:    { label: "Repair",         hue: "#D97706" },
  recruiter: { label: "Recruiter",      hue: "#6B3FA0" },
  practice:  { label: "Free Practice",  hue: "#64748B" },
  library:   { label: "Practice",       hue: "#2563EB" },
}
