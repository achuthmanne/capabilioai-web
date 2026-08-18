import SqlWorkspace from "./sql/SqlWorkspace"

// panel_type -> the component that renders that panel's mission workspace.
// Only "sql_runner" is real today (every one of the 44 seeded domain_roles
// uses it). To add a future panel type: build its component under
// workspaces/<name>/, following SqlWorkspace's contract (import shared
// primitives from ../shared/*, own no state, receive everything as props),
// then add exactly one line here, e.g.:
//   notebook_python: NotebookPythonWorkspace,
// Do not add a key for a panel type that has no component yet — an
// unresolved import breaks the build, and a key mapped to nothing isn't
// "prepared architecture," it's dead code with a false promise.
export const PANEL_REGISTRY = {
  sql_runner: SqlWorkspace,
}
