/**
 * shell/tokens.js — Phase 3.0 (Professional Workspace Shell).
 *
 * A theme-AWARE sibling to shared/tokens.js's `T` object. Most shell
 * components should style via workspaceTheme.css's `--ws-*` CSS variables
 * directly (they update live on theme change, no re-render needed) — this
 * hook exists only for the few consumers that need real JS values, not CSS
 * custom properties, because they can't consume the latter: CodeMirror's
 * `EditorView.theme()` builds a static style object at construction time,
 * same reason SqlEditor.jsx already builds its own theme from shared `T`
 * instead of reading CSS vars.
 *
 * NOTE: WS_LIGHT/WS_DARK are hand-kept in sync with workspaceTheme.css's
 * `.capabilio-workspace` / `[data-theme="dark"]` blocks (same hex values,
 * two sources by necessity — CSS custom properties aren't readable as
 * plain JS values without a mounted DOM node and a getComputedStyle call,
 * which would add a mount-timing dependency this hook doesn't need). If
 * you change one, change the other.
 */
import { useWorkspaceTheme } from "./theme/useWorkspaceTheme"

const WS_LIGHT = {
  bgPage: "#FAF7F2", bgPanel: "#F2EDE4", bgCard: "#FFFFFF", bgHover: "#EDE8DF",
  ink: "#1A1714", ink2: "#3D3935", ink3: "#6B6560", ink4: "#A8A29E",
  border: "#E8E3DA", borderStrong: "#C8C2BA",
  accent: "#FF5701", success: "#16A34A", warning: "#D97706", danger: "#DC2626", info: "#4F46E5",
}

const WS_DARK = {
  bgPage: "#16140F", bgPanel: "#1D1A14", bgCard: "#221F19", bgHover: "#2C2820",
  ink: "#F5F1E8", ink2: "#D6D0C3", ink3: "#A39C8C", ink4: "#746C5C",
  border: "#35301F", borderStrong: "#4A4430",
  accent: "#FF6B24", success: "#34D399", warning: "#F5A623", danger: "#F87171", info: "#818CF8",
}

const MONO = "'DM Mono', 'DM Mono', monospace"
const BODY = "'DM Sans', system-ui, sans-serif"

function resolveEffectiveTheme(theme) {
  if (theme !== "system") return theme
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches
  return prefersDark ? "dark" : "light"
}

export function useShellTokens() {
  const { theme } = useWorkspaceTheme()
  const effective = resolveEffectiveTheme(theme)
  return { ...(effective === "dark" ? WS_DARK : WS_LIGHT), mono: MONO, body: BODY, isDark: effective === "dark" }
}
