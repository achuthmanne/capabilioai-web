/**
 * workspaceLayoutStorage.js — Phase 3.0 (Professional Workspace Shell).
 *
 * localStorage only — this app has no Zustand/Redux/preferences-table
 * anywhere (confirmed during planning), so `try { } catch { }`-guarded
 * localStorage is the established convention (see
 * frontend/src/pages/InstitutionOS.jsx's CAMPUS_PREF_KEY) and what every
 * helper here follows. Not synced to a backend — explicitly out of scope
 * per the plan (would be new schema/business logic).
 *
 * Implements react-resizable-panels' `LayoutStorage` shape
 * (`Pick<Storage, "getItem" | "setItem">`) so `createNamespacedStorage`'s
 * result can be passed straight to `ResizablePanelGroup`'s `storage` prop
 * (see shell/panels/ResizablePanelGroup.jsx).
 */
const PREFIX = "capabilio_workspace_layout"

/**
 * @param {string|null|undefined} userId — namespaces every key so two
 *   different students sharing a browser profile never see each other's
 *   panel layout. Falls back to a shared "anon" bucket when unavailable
 *   (e.g. before auth resolves) rather than throwing.
 * @returns {{getItem: (key: string) => string|null, setItem: (key: string, value: string) => void}}
 */
export function createNamespacedStorage(userId) {
  const ns = `${PREFIX}_${userId || "anon"}`
  return {
    getItem(key) {
      try {
        return localStorage.getItem(`${ns}_${key}`)
      } catch {
        return null
      }
    },
    setItem(key, value) {
      try {
        localStorage.setItem(`${ns}_${key}`, value)
      } catch {
        // Storage unavailable (private browsing, quota) — layout just
        // doesn't persist this session; never throws into a render path.
      }
    },
  }
}

/** Plain-value read/write for the small, non-panel-layout bits (active tab
 * per panel group, theme is handled separately by
 * WorkspaceThemeProvider.jsx). Same namespacing/failure mode as above. */
export function readNamespaced(userId, key, fallback = null) {
  const value = createNamespacedStorage(userId).getItem(key)
  return value === null ? fallback : value
}

export function writeNamespaced(userId, key, value) {
  createNamespacedStorage(userId).setItem(key, value)
}
