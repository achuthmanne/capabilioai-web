/**
 * ResizablePanelGroup.jsx — Phase 3.0 (Professional Workspace Shell).
 *
 * Thin wrapper around `react-resizable-panels`' `Group` component — the
 * ONLY file in the shell that imports directly from that library, so a
 * future version bump or library swap is a one-file change, not a
 * shell-wide one.
 *
 * Adapts two things to the shell's own naming/contract:
 *   - `direction` ("horizontal" | "vertical") instead of the library's
 *     `orientation` prop — matches the plan's component-hierarchy naming.
 *   - Optional built-in persistence via `persistId` + `storage`: when
 *     `persistId` is provided, wires the library's own `useDefaultLayout`
 *     hook (its real persistence primitive — there is no `autoSaveId` prop
 *     in the installed v4 API) so callers don't each have to remember to
 *     call it themselves. `storage` defaults to nothing (no persistence)
 *     — shell/state/useWorkspaceLayout.js supplies the real, per-user
 *     namespaced localStorage-backed implementation.
 */
import { Group, useDefaultLayout } from "react-resizable-panels"

export default function ResizablePanelGroup({ id, direction = "horizontal", persistId, storage, children, style, className }) {
  // useDefaultLayout requires a real `id` string even when its result goes
  // unused below — hooks can't be called conditionally, so a harmless
  // fallback id keeps this call valid without ever touching storage when
  // persistId isn't set (storage stays undefined in that case).
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: persistId || id || "unpersisted-panel-group",
    storage: persistId && storage ? storage : undefined,
    onlySaveAfterUserInteractions: true,
  })

  return (
    <Group
      id={id}
      orientation={direction}
      defaultLayout={persistId ? defaultLayout : undefined}
      onLayoutChanged={persistId ? onLayoutChanged : undefined}
      style={{ display: "flex", flexDirection: direction === "horizontal" ? "row" : "column", width: "100%", height: "100%", ...style }}
      className={className}
    >
      {children}
    </Group>
  )
}
