#!/usr/bin/env node
/**
 * scripts/generate-registry.js
 *
 * Generates JSON snapshots of the canonical role/workbench/mission data that
 * lives in the frontend package, so the MCP server (a separate Node/TS
 * package that cannot `import` across the frontend's Vite build boundary)
 * never has to hand-copy role data again.
 *
 * Sources of truth (read, never written by this script):
 *   frontend/src/config/roleConfig.js   — role → skills/tags/label registry
 *   frontend/src/config/arenaDomains.js — workbench registry + per-domain
 *                                          mission categories
 *
 * Outputs:
 *   mcp/src/shared/role-registry.generated.json
 *   mcp/src/shared/arena-domains.generated.json
 *
 * MUST be re-run whenever roleConfig.js or arenaDomains.js changes.
 * It is wired into `npm run build` via the "prebuild" script in
 * mcp/package.json, so a stale snapshot cannot silently ship — but you
 * should also run it manually during local development:
 *
 *   node scripts/generate-registry.js
 *
 * Both source files are plain ESM with no JSX / no import.meta.env / no
 * bundler-specific syntax, so Node can import them directly.
 */

import { fileURLToPath, pathToFileURL } from "node:url"
import path from "node:path"
import fs from "node:fs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const FRONTEND_ROLE_CONFIG = path.resolve(__dirname, "../../frontend/src/config/roleConfig.js")
const FRONTEND_ARENA_DOMAINS = path.resolve(__dirname, "../../frontend/src/config/arenaDomains.js")

const OUT_ROLE_REGISTRY = path.resolve(__dirname, "../src/shared/role-registry.generated.json")
const OUT_ARENA_DOMAINS = path.resolve(__dirname, "../src/shared/arena-domains.generated.json")

function assertExists(p, label) {
  if (!fs.existsSync(p)) {
    throw new Error(`generate-registry.js: cannot find ${label} at ${p}`)
  }
}

async function main() {
  assertExists(FRONTEND_ROLE_CONFIG, "frontend/src/config/roleConfig.js")
  assertExists(FRONTEND_ARENA_DOMAINS, "frontend/src/config/arenaDomains.js")

  const roleConfigMod = await import(pathToFileURL(FRONTEND_ROLE_CONFIG).href)
  const arenaDomainsMod = await import(pathToFileURL(FRONTEND_ARENA_DOMAINS).href)

  const { AUGMENTED_ROLE_REGISTRY } = roleConfigMod
  if (!Array.isArray(AUGMENTED_ROLE_REGISTRY)) {
    throw new Error("roleConfig.js did not export AUGMENTED_ROLE_REGISTRY as an array — has its shape changed?")
  }

  const { WORKBENCH_REGISTRY, ARENA_DOMAINS } = arenaDomainsMod
  if (!WORKBENCH_REGISTRY || !ARENA_DOMAINS) {
    throw new Error("arenaDomains.js did not export WORKBENCH_REGISTRY / ARENA_DOMAINS — has its shape changed?")
  }

  // ── Role registry snapshot ────────────────────────────────────────────────
  const roleSnapshot = {
    generatedAt: new Date().toISOString(),
    source: "frontend/src/config/roleConfig.js (AUGMENTED_ROLE_REGISTRY)",
    roles: AUGMENTED_ROLE_REGISTRY,
  }
  fs.writeFileSync(OUT_ROLE_REGISTRY, JSON.stringify(roleSnapshot, null, 2) + "\n")

  // ── Workbench + mission snapshot ──────────────────────────────────────────
  const domains = {}
  for (const [key, domain] of Object.entries(ARENA_DOMAINS)) {
    domains[key] = {
      key: domain.key ?? key,
      label: domain.label,
      arenaKey: domain.key ?? key,
      defaultModule: domain.defaultModule ?? null,
      defaultSandbox: domain.defaultSandbox ?? "code",
      modules: domain.modules ?? [],
      missionCategories: domain.missionCategories ?? [],
    }
  }

  const arenaSnapshot = {
    generatedAt: new Date().toISOString(),
    source: "frontend/src/config/arenaDomains.js (WORKBENCH_REGISTRY, ARENA_DOMAINS)",
    workbenches: WORKBENCH_REGISTRY,
    domains,
  }
  fs.writeFileSync(OUT_ARENA_DOMAINS, JSON.stringify(arenaSnapshot, null, 2) + "\n")

  console.log(`generate-registry.js: wrote ${AUGMENTED_ROLE_REGISTRY.length} roles -> ${path.relative(process.cwd(), OUT_ROLE_REGISTRY)}`)
  console.log(`generate-registry.js: wrote ${Object.keys(WORKBENCH_REGISTRY).length} workbenches, ${Object.keys(domains).length} domains -> ${path.relative(process.cwd(), OUT_ARENA_DOMAINS)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
