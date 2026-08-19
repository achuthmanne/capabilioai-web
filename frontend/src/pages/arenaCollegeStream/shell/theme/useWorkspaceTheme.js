/**
 * useWorkspaceTheme.js — Phase 3.0 (Professional Workspace Shell).
 *
 * The consumer half of WorkspaceThemeProvider.jsx's Context. Split into
 * its own file so a component can `import { useWorkspaceTheme } from
 * "./useWorkspaceTheme"` without also pulling in the Provider's JSX —
 * same file-splitting convention already used elsewhere in this codebase
 * (e.g. promptManager.js vs. its aggregator).
 */
import { createContext, useContext } from "react"

export const WorkspaceThemeContext = createContext(null)

export function useWorkspaceTheme() {
  const ctx = useContext(WorkspaceThemeContext)
  if (!ctx) throw new Error("useWorkspaceTheme() must be called inside <WorkspaceThemeProvider>")
  return ctx
}
