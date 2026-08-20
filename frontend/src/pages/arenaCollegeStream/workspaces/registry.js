import SqlWorkspace from "./sql/SqlWorkspace"
import PythonWorkspace from "./python/PythonWorkspace"
import NodeWorkspace from "./node/NodeWorkspace"
import FrontendWorkspace from "./frontend/FrontendWorkspace"

// panel_type -> the component that renders that panel's mission workspace.
// python_runner (Career Workspace refactor, 2026-08-19) is the second real
// entry — built for ML/AI Engineer, generic to any role. To add a future
// panel type: build its component under workspaces/<name>/, following
// SqlWorkspace's contract (import shared primitives from ../shared/*, own
// no state, receive the single `{ workspace }` prop), then add exactly one
// line here. Do not add a key for a panel type that has no component yet —
// an unresolved import breaks the build, and a key mapped to nothing isn't
// "prepared architecture," it's dead code with a false promise.
export const PANEL_REGISTRY = {
  sql_runner: SqlWorkspace,
  python_runner: PythonWorkspace,
  node_runner: NodeWorkspace,
  frontend_runner: FrontendWorkspace,
}

// Role -> workspace resolution is intentionally mission-level
// (mission.panel_type, looked up above), not role-level. Considered
// adding a `workspace` field to frontend/src/config/roleConfig.js's
// ROLE_REGISTRY (Phase 2.6, Task 2) and declined: panel_type is already
// the live, authoritative source — read fresh from the API on every
// mission fetch — so a second copy on 44 role config entries would be an
// unenforced, driftable duplicate of the same fact, with no current
// consumer. roleConfig.js's own header already calls itself "the single
// source of truth for all role-related data"; this preserves that for
// panel_type specifically by not introducing a second one. If a role
// ever needs to show workspace info BEFORE any mission is fetched (e.g.
// an icon on the role-selection screen), resolve it by reading a mission
// for that role first — don't add a parallel, unsynced field here.

