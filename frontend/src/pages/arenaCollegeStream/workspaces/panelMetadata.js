/**
 * panelMetadata.js — Phase 2.5.
 *
 * panel_type -> display metadata (title/icon/description). Frontend-only,
 * derived from panel_type — no new Supabase column. panel_type is already
 * returned by every mission endpoint and already fully determines which
 * workspace UI applies, so threading a separate title/icon/description
 * through the backend would only duplicate what panel_type already
 * encodes, for no present benefit (there's no per-mission override need
 * today — this project's standing rule is not to speculate about schema
 * with no current use case).
 *
 * Separate from PANEL_REGISTRY (registry.js) so a panel_type's display
 * info can exist before its real workspace component is built — e.g. for
 * a "coming soon" listing — without the two ever needing to move in
 * lockstep.
 *
 * Extended in Phase 2.6 (Task 5) with capability flags — real, verified
 * facts about what sql_runner's workspace actually does today (checked
 * against SqlWorkspace.jsx and the backend routes directly), not
 * aspirational flags for features that don't exist. Purely additive and
 * currently unconsumed by any component — WorkspaceRenderer's fallback
 * only reads workspace_title/icon/description — so this cannot change any
 * behavior; it's descriptive metadata a future workspace-picker or admin
 * view can read once one exists. No supportsRun flag: with both
 * supportsPreview and supportsSubmit present, a third "can run at all"
 * flag would just mean "either of the other two," adding a name with no
 * independent meaning.
 */
export const PANEL_METADATA = {
  sql_runner: {
    workspace_title: "SQL Workspace",
    workspace_icon: "🗄️",
    workspace_description: "Query a sandboxed dataset and get a scored, deterministic result.",
    supportsPreview: true,
    supportsSubmit: true,
    supportsAIFeedback: true,
    supportsTimer: true,
    supportsHints: false,
    supportsFiles: false,
    supportsNotebook: false,
    supportsCharts: false,
    supportsTerminal: false,
    supportsBrowser: false,
    supportsConsole: false,
  },
  python_runner: {
    workspace_title: "Python Workstation",
    workspace_icon: "🐍",
    workspace_description: "Write and run real Python — your code actually executes, output is compared exactly.",
    supportsPreview: false, // see PythonWorkspace.jsx's header — Submit-only this pass
    supportsSubmit: true,
    supportsAIFeedback: true,
    supportsTimer: true,
    supportsHints: false,
    supportsFiles: false,
    supportsNotebook: false,
    supportsCharts: false,
    supportsTerminal: false,
    supportsBrowser: false,
    supportsConsole: false,
  },
  node_runner: {
    workspace_title: "Node.js Workstation",
    workspace_icon: "🟩",
    workspace_description: "Write and run real JavaScript/Node.js — your code actually executes, output is compared exactly.",
    supportsPreview: false,
    supportsSubmit: true,
    supportsAIFeedback: true,
    supportsTimer: true,
    supportsHints: false,
    supportsFiles: false,
    supportsNotebook: false,
    supportsCharts: false,
    supportsTerminal: false,
    supportsBrowser: false,
    supportsConsole: false,
  },
}

const FALLBACK_METADATA = {
  workspace_title: "Workspace", workspace_icon: "🧩", workspace_description: null,
  supportsPreview: false, supportsSubmit: false, supportsAIFeedback: false, supportsTimer: false,
  supportsHints: false, supportsFiles: false, supportsNotebook: false, supportsCharts: false,
  supportsTerminal: false, supportsBrowser: false, supportsConsole: false,
}

export function getPanelMetadata(panelType) {
  return PANEL_METADATA[panelType] || FALLBACK_METADATA
}
