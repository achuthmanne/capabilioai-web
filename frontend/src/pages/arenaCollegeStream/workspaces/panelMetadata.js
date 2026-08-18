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
 */
export const PANEL_METADATA = {
  sql_runner: {
    workspace_title: "SQL Workspace",
    workspace_icon: "🗄️",
    workspace_description: "Query a sandboxed dataset and get a scored, deterministic result.",
  },
  // Future: notebook_python: { workspace_title: "Python Notebook", ... }
}

export function getPanelMetadata(panelType) {
  return PANEL_METADATA[panelType] || { workspace_title: "Workspace", workspace_icon: "🧩", workspace_description: null }
}
