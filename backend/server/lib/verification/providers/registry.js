/**
 * verification/providers/registry.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * Central provider registry — same pattern as arena-v2's
 * workstation-router/registry.js: a flat map keyed by provider id, built
 * from each provider's own declared shape rather than a hardcoded switch
 * statement. Adding a new provider (e.g. a real AWS integration later)
 * means creating one new file exporting {id, name, capability, verify} and
 * adding it to PROVIDER_MODULES below — nothing in pipeline.js or the route
 * layer changes.
 */
import certificateOcr from "./certificateOcr.js"
import github from "./github.js"
import employerAttestation from "./employerAttestation.js"
import { DECLARED_PROVIDERS } from "./declared.js"

const PROVIDER_MODULES = [certificateOcr, github, employerAttestation, ...DECLARED_PROVIDERS]

const REGISTRY = new Map(PROVIDER_MODULES.map(p => [p.id, p]))

export function getProvider(id) {
  return REGISTRY.get(id) || null
}

/** Public listing — capability + note only, never exposes verify(). */
export function listProviders() {
  return PROVIDER_MODULES.map(({ id, name, capability, note }) => ({ id, name, capability, note: note || null }))
}
