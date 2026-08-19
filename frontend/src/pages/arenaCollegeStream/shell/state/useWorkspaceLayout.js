/**
 * useWorkspaceLayout.js — Phase 3.0 (Professional Workspace Shell).
 *
 * Single hook WorkspaceShell.jsx calls to get everything persisted-UI-state
 * related: the panel-group storage object (real drag-resize/collapse
 * sizes are persisted by react-resizable-panels itself via
 * ResizablePanelGroup's `persistId`/`storage` props — this hook doesn't
 * duplicate that, just supplies the namespaced storage instance), plus the
 * few plain values that aren't panel layouts (active tab per tab strip,
 * font scale).
 *
 * `userId` is read from `workspace.mission?.user_id` if present, else left
 * undefined (falls back to the shared "anon" bucket in
 * workspaceLayoutStorage.js) — the shell doesn't have its own auth
 * context and isn't meant to (see WorkspaceShell.jsx: "never fetches
 * data"); if a real userId is available upstream, the integration point
 * can pass it in explicitly instead.
 */
import { useCallback, useState } from "react"
import { createNamespacedStorage, readNamespaced, writeNamespaced } from "./workspaceLayoutStorage"

const DEFAULT_TABS = { missionSidebar: "brief", bottomPanel: "output", rightSidebar: "progress" }
const DEFAULT_FONT_SCALE = 1

export function useWorkspaceLayout(userId) {
  const panelStorage = createNamespacedStorage(userId)

  const [missionSidebarTab, setMissionSidebarTabState] = useState(() => readNamespaced(userId, "tab_mission", DEFAULT_TABS.missionSidebar))
  const [bottomPanelTab, setBottomPanelTabState] = useState(() => readNamespaced(userId, "tab_bottom", DEFAULT_TABS.bottomPanel))
  const [rightSidebarTab, setRightSidebarTabState] = useState(() => readNamespaced(userId, "tab_right", DEFAULT_TABS.rightSidebar))
  const [fontScale, setFontScaleState] = useState(() => {
    const stored = readNamespaced(userId, "font_scale", null)
    const parsed = stored ? parseFloat(stored) : NaN
    return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SCALE
  })

  const setMissionSidebarTab = useCallback((tab) => {
    setMissionSidebarTabState(tab)
    writeNamespaced(userId, "tab_mission", tab)
  }, [userId])
  const setBottomPanelTab = useCallback((tab) => {
    setBottomPanelTabState(tab)
    writeNamespaced(userId, "tab_bottom", tab)
  }, [userId])
  const setRightSidebarTab = useCallback((tab) => {
    setRightSidebarTabState(tab)
    writeNamespaced(userId, "tab_right", tab)
  }, [userId])
  const setFontScale = useCallback((updater) => {
    setFontScaleState(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater
      writeNamespaced(userId, "font_scale", String(next))
      return next
    })
  }, [userId])

  return {
    panelStorage,
    missionSidebarTab, setMissionSidebarTab,
    bottomPanelTab, setBottomPanelTab,
    rightSidebarTab, setRightSidebarTab,
    fontScale, setFontScale,
  }
}
