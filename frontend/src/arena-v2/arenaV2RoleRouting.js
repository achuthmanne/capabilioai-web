// arenaV2RoleRouting.js — Arena V2, nav consolidation pass
// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS: across the twelve Arena V2 domain-workstation phases
// this session, each new pilot was made reachable by bolting one more
// "X Pilot (Beta)" button onto the global student header nav
// (App.jsx's STUDENT_HEADER_NAV) — a build-time convenience, never an
// intended permanent design. Per explicit product direction (2026-07-28),
// the header goes back to five items (Aura/Arena/Pulse/Skill Studio/
// Launchpad) and "Arena" itself becomes the single entry point: it should
// route a student straight to their Arena V2 pilot if one exists for their
// role, falling back to the pre-existing legacy Arena (ArenaDomain /
// arenaDomains.js) otherwise, so no role loses access.
//
// The mapping below is deliberately built from the platform's own existing,
// already-role-resolved source of truth — roleConfig.js's
// getRoleConfig(userData).arenaKey (already used by arenaDomains.js's
// resolveArenaDomain to pick a legacy domain) — rather than re-deriving role
// detection from scratch. That keeps this file a pure lookup: "does this
// already-resolved arenaKey have a live Arena V2 pilot," nothing more.
//
// HONEST GAP, found while wiring this: three of the twelve Arena V2 domains
// built this session — Bioprocess Engineer (careerFamily "Biotech"),
// Medical Biotechnology Specialist ("MedicalBiotech"), and Clinical
// Laboratory Specialist ("ClinicalLab") — have NO corresponding entry in
// roleConfig.js's ROLE_CONFIGS at all. "Biotech" only exists elsewhere in
// the codebase as a free-text institution-onboarding department checkbox
// (Onboarding.jsx's DEPTS list), never as a resolvable individual student
// role/arenaKey. That means no real student's role currently resolves to
// any of these three, through this resolver or through the legacy
// resolveArenaDomain() it mirrors — a pre-existing gap this file surfaces
// rather than papers over with an invented arenaKey. Those three pilots
// remain fully built, tested, and reachable by direct page id
// ("arenaV2BiotechPilot" / "arenaV2MedicalBiotechPilot" /
// "arenaV2ClinicalLabPilot") for anyone who navigates there directly (e.g.
// a future Biotech role-config entry, or a direct link) — this resolver
// just cannot route a student there automatically until such a role exists.
import { getRoleConfig } from "../config/roleConfig.js"

// arenaKey (from roleConfig.js) -> Arena V2 pilot page id (App.jsx currentPage).
// Only roles with a real, tested Arena V2 domain workstation are listed here.
// Every other arenaKey (frontend, backend, fullstack, data, data_engineer,
// bi_analyst, sre, aws, azure, soc, qa, ba_product, medical, vlsi,
// analog_ic, android, ios, pharmacy, mba, and any arenaKey not present here)
// intentionally falls through to the legacy Arena system unchanged.
export const ARENA_KEY_TO_V2_PILOT_PAGE = Object.freeze({
  ml:         "arenaV2MLPilot",
  swe:        "arenaV2SoftwarePilot",
  cyber:      "arenaV2CyberPilot",
  devops:     "arenaV2DevOpsPilot",
  dba:        "arenaV2DbaPilot",
  ece:        "arenaV2EcePilot",
  eee:        "arenaV2EeePilot",
  civil:      "arenaV2CivilPilot",
  mechanical: "arenaV2MechanicalPilot",
})

/**
 * @param {object} userData
 * @returns {string|null} the Arena V2 pilot page id to route to, or null if
 *   this student's role has no live Arena V2 pilot yet (caller should fall
 *   back to the legacy Arena page in that case).
 */
export function resolveArenaV2PilotPage(userData) {
  const arenaKey = getRoleConfig(userData)?.arenaKey
  if (!arenaKey) return null
  return ARENA_KEY_TO_V2_PILOT_PAGE[arenaKey] || null
}
