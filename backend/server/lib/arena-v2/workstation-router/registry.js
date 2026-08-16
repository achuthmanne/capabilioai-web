/**
 * workstation-router/registry.js — Milestone 5
 * ---------------------------------------------------------------------------
 * Static data only. No functions, no I/O, no per-request logic. This is the
 * literal translation of content_spec/04-workstations.md's "Workstation
 * compositions" table into a lookup structure — one entry per workstation id
 * from Milestone 2's WORKSTATION_IDS enum (challenge-library/validators.js),
 * which this file imports rather than re-declaring, so the two can never
 * drift out of sync.
 *
 * `componentKey` is the identifier the frontend will eventually map to a real
 * React component (Milestone 6+, frontend work, out of scope here). This
 * backend module only needs to hand back *which* key — it doesn't know or
 * care what the component looks like.
 */
import { WORKSTATION_IDS } from "../challenge-library/validators.js"

export const WORKSTATION_REGISTRY = {
  code: {
    componentKey: "CodeWorkstation",
    uiModules: ["code_editor", "console_output", "file_explorer"],
    artifactType: "code",
  },
  sql: {
    componentKey: "SqlWorkstation",
    uiModules: ["sql_editor", "console_output"],
    artifactType: "code",
  },
  notebook: {
    componentKey: "NotebookWorkstation",
    uiModules: ["notebook_cell", "console_output"],
    artifactType: "report",
  },
  react_frontend: {
    componentKey: "ReactFrontendWorkstation",
    uiModules: ["code_editor", "file_explorer", "browser_live_preview", "console_output"],
    artifactType: "code",
  },
  api: {
    componentKey: "ApiWorkstation",
    uiModules: ["api_client", "console_output"],
    artifactType: "code",
  },
  terminal: {
    componentKey: "TerminalWorkstation",
    uiModules: ["terminal", "console_output"],
    artifactType: "code",
  },
  excel: {
    componentKey: "ExcelWorkstation",
    uiModules: ["excel_grid"],
    artifactType: "dashboard",
  },
  dashboard: {
    componentKey: "DashboardWorkstation",
    uiModules: ["dashboard_builder", "sql_editor"],
    artifactType: "dashboard",
  },
  report: {
    componentKey: "ReportWorkstation",
    uiModules: ["report_editor"],
    artifactType: "report",
  },
  system_design: {
    componentKey: "SystemDesignWorkstation",
    uiModules: ["diagram_canvas", "report_editor"],
    artifactType: "diagram",
  },
  embedded: {
    componentKey: "EmbeddedWorkstation",
    uiModules: ["code_editor", "register_serial_panel", "console_output"],
    artifactType: "code",
  },
  calculator: {
    componentKey: "CalculatorWorkstation",
    uiModules: ["answer_panel"],
    artifactType: null, // Common Challenges only — content_spec/04
  },
  full_stack: {
    componentKey: "FullStackWorkstation",
    uiModules: ["code_editor", "browser_live_preview", "api_client", "sql_editor"],
    artifactType: "code",
  },
  // SAP domain (functional consultant: FI/CO, MM/SD — and ABAP developer).
  // See validators.js's WORKSTATION_IDS comment for why this is a new
  // entry rather than a reused key.
  sap_console: {
    componentKey: "SapConsoleWorkstation",
    uiModules: ["code_editor", "terminal", "answer_panel"],
    artifactType: "code",
  },
  // Frontend Developer's real workstation — additive entry, see
  // validators.js's WORKSTATION_IDS comment on why this isn't the existing
  // "react_frontend" id (that componentKey is already live for Biotech).
  frontend_preview: {
    componentKey: "FrontendPreviewWorkstation",
    uiModules: ["code_editor", "browser_live_preview", "console_output"],
    artifactType: "code",
  },
}

// Consistency guard, evaluated at import time (fails fast on module load if
// the registry and Milestone 2's enum ever drift, rather than at first
// request): every WORKSTATION_ID has exactly one registry entry, and the
// registry declares nothing beyond that enum.
const registryKeys = Object.keys(WORKSTATION_REGISTRY)
const missing = WORKSTATION_IDS.filter((id) => !registryKeys.includes(id))
const extra = registryKeys.filter((key) => !WORKSTATION_IDS.includes(key))
if (missing.length || extra.length) {
  throw new Error(
    `WORKSTATION_REGISTRY is out of sync with WORKSTATION_IDS — missing: [${missing.join(", ")}], extra: [${extra.join(", ")}]`
  )
}
