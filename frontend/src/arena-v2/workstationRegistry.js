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
  CodeWorkstation:           { status: "not_integrated" },
  NotebookWorkstation:       { status: "not_integrated" },
  ReactFrontendWorkstation:  { status: "not_integrated" },
  ApiWorkstation:            { status: "not_integrated" },
  TerminalWorkstation:       { status: "not_integrated" },
  ExcelWorkstation:          { status: "not_integrated" },
  DashboardWorkstation:      { status: "not_integrated" },
  ReportWorkstation:         { status: "not_integrated" },
  SystemDesignWorkstation:   { status: "not_integrated" },
  EmbeddedWorkstation:       { status: "not_integrated" },
  CalculatorWorkstation:     { status: "not_integrated" },
  FullStackWorkstation:      { status: "not_integrated" },
}

export function isWorkstationReady(componentKey) {
  return FRONTEND_WORKSTATION_REGISTRY[componentKey]?.status === "ready"
}
