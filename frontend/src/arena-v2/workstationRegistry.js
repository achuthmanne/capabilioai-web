// workstationRegistry.js — Arena V2, Milestone 7
// ---------------------------------------------------------------------------
// Pure data, no React here on purpose — kept separate from the lazy-import
// wiring (done in ArenaV2ChallengeShell.jsx) so this file is plain-JS
// unit-testable with node:test, the same way the backend's
// workstation-router/registry.js is.
//
// Mirrors the backend's WORKSTATION_REGISTRY keys exactly (same 13
// componentKey values from backend/server/lib/arena-v2/workstation-router/
// registry.js) — this file's job is only "is this componentKey integrated
// yet, and if so, which local module implements it." It does NOT decide
// which workstation a challenge gets; that's the backend Workstation
// Router's job entirely (Milestone 5). This registry only answers "do we
// have a frontend component for this key."
//
// status: "ready" | "not_integrated" — deliberately explicit rather than
// silently falling back, so an unintegrated workstation shows an honest
// "not built yet" state instead of a broken render.
export const FRONTEND_WORKSTATION_REGISTRY = {
  SqlWorkstation:            { status: "ready",          importPath: "./workstations/SqlWorkstationV2.jsx" },
  CodeWorkstation:           { status: "ready",          importPath: "./workstations/CodeWorkstationV2.jsx" },
  NotebookWorkstation:       { status: "ready",          importPath: "./workstations/NotebookWorkstationV2.jsx" },
  ReactFrontendWorkstation:  { status: "ready",          importPath: "./workstations/BiotechWorkstationV2.jsx" },
  ApiWorkstation:            { status: "ready",          importPath: "./workstations/DevOpsConsoleWorkstationV2.jsx" },
  TerminalWorkstation:       { status: "ready",          importPath: "./workstations/TerminalWorkstationV2.jsx" },
  ExcelWorkstation:          { status: "ready",          importPath: "./workstations/MechanicalWorkstationV2.jsx" },
  DashboardWorkstation:      { status: "ready",          importPath: "./workstations/DbaWorkstationV2.jsx" },
  ReportWorkstation:         { status: "ready",          importPath: "./workstations/StructuralWorkstationV2.jsx" },
  SystemDesignWorkstation:   { status: "ready",          importPath: "./workstations/EeeWorkstationV2.jsx" },
  EmbeddedWorkstation:       { status: "ready",          importPath: "./workstations/EceWorkstationV2.jsx" },
  // "Common Challenges only" per the backend registry's own comment is a
  // content-spec categorization note, not an enforced runtime constraint —
  // see the file header of ClinicalLabWorkstationV2.jsx for the full
  // reasoning on why reusing this key (rather than adding a new backend
  // WORKSTATION_IDS entry) is the schema-safe choice for a 12th domain.
  CalculatorWorkstation:     { status: "ready",          importPath: "./workstations/ClinicalLabWorkstationV2.jsx" },
  FullStackWorkstation:      { status: "ready",          importPath: "./workstations/MedicalBiotechWorkstationV2.jsx" },
  // SAP domain, thirteenth role workspace family — a genuinely new
  // WORKSTATION_IDS entry (sap_console), not a reused key, since all 12
  // prior keys were already claimed. See backend validators.js's comment
  // on the same enum for the reasoning.
  SapConsoleWorkstation:     { status: "ready",          importPath: "./workstations/SapConsoleWorkstationV2.jsx" },
  // Frontend Developer's real workstation — a genuinely new componentKey
  // (not a reuse of ReactFrontendWorkstation, which stays pointed at
  // BiotechWorkstationV2.jsx exactly as it already is for live Biotech
  // students; see backend workstation-router/registry.js's comment).
  FrontendPreviewWorkstation: { status: "ready",          importPath: "./workstations/FrontendWorkstationV2.jsx" },
}

export function isWorkstationReady(componentKey) {
  return FRONTEND_WORKSTATION_REGISTRY[componentKey]?.status === "ready"
}
