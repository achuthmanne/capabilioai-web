// v1ToV2RoleMap.js — Arena V1↔V2 integration, Phase 1 (routing only)
// ---------------------------------------------------------------------------
// Product direction (confirmed with the account owner, 2026-08-13): Arena V1
// stays the entry point users land on ("Arena" in the main nav, its Catalog,
// Daily Missions, Common Challenges, streaks — all unchanged, nothing
// removed). When a student's V1-resolved domain (`resolveArenaDomain()` in
// config/arenaDomains.js, driven by roleConfig.js's `arenaKey` field) maps
// to a role that has a REAL Arena V2 workstation — an actual Groq-generated,
// role-specific mission, not V1's generic code/quiz UI — V1 now offers a
// button to go attempt the real thing instead.
//
// THIS MAP IS DELIBERATELY CONSERVATIVE. It only includes arenaKey values
// with an unambiguous, confident 1:1 match to a real Arena V2 pilot page.
// Two categories of arenaKey are deliberately left OUT rather than guessed:
//
//   1. Ambiguous many-to-one: V1's "medical" arenaKey covers ground that V2
//      split into three distinct roles (Bioprocess Engineer, Medical
//      Biotechnology Specialist, Clinical Laboratory Specialist). Guessing
//      which one a "medical" V1 student meant would silently route people
//      into the wrong role's workstation — worse than not offering V2 at
//      all. Needs a real disambiguation step (e.g. asking the student which
//      of the three), not a hardcoded guess.
//   2. No V1 equivalent exists yet: Arena V2 has real workstations for
//      three SAP roles (SAP FI/CO Consultant, SAP MM/SD Consultant, SAP ABAP
//      Developer), but roleConfig.js's `arenaKey` enum has no
//      "sap_fico"/"sap_mmsd"/"sap_abap" value at all — there's nothing on
//      the V1 side to map FROM. (Data Analyst used to be in this bucket too
//      — arenaKey "data" existed with no matching arenaV2*Pilot page — until
//      2026-08-13, when ArenaV2DataAnalystPilot.jsx was added specifically
//      to close this gap; "data" now maps cleanly below. NOT "data_engineer"
//      or "bi_analyst" — roleConfig.js keeps those as distinct roles from
//      "Data Analyst", and neither has a V2 workstation of its own yet.)
//
// Extending this map safely means: (a) confirming the new arenaKey really
// means the same role Arena V2 built a workstation for, and (b) if it's a
// SAP/Data-Analyst-style gap, adding the missing arenaKey value to
// roleConfig.js AND the missing arenaV2*Pilot page to App.jsx first — not
// just adding a row here.
export const ARENA_V1_TO_V2_PILOT = {
  dba:        "arenaV2DbaPilot",        // Database Administrator
  data:       "arenaV2DataAnalystPilot", // Data Analyst
  cyber:      "arenaV2CyberPilot",      // Cybersecurity Analyst
  devops:     "arenaV2DevOpsPilot",     // DevOps Engineer
  ml:         "arenaV2MLPilot",         // ML Engineer
  swe:        "arenaV2SoftwarePilot",   // Software Engineer
  ece:        "arenaV2EcePilot",        // Electronics Engineer
  eee:        "arenaV2EeePilot",        // Electrical Engineer
  mechanical: "arenaV2MechanicalPilot", // Mechanical Engineer
  civil:      "arenaV2CivilPilot",      // Structural Engineer
}

// Human label shown on the CTA button — kept separate from the pilot-page
// key so the button copy can say the real job title, not the V1 arenaKey
// slug.
export const ARENA_V2_ROLE_LABEL = {
  arenaV2DbaPilot:        "Database Administrator",
  arenaV2DataAnalystPilot: "Data Analyst",
  arenaV2CyberPilot:      "Cybersecurity Analyst",
  arenaV2DevOpsPilot:     "DevOps Engineer",
  arenaV2MLPilot:         "ML Engineer",
  arenaV2SoftwarePilot:   "Software Engineer",
  arenaV2EcePilot:        "Electronics Engineer",
  arenaV2EeePilot:        "Electrical Engineer",
  arenaV2MechanicalPilot: "Mechanical Engineer",
  arenaV2CivilPilot:      "Structural Engineer",
}

/** @param {string} arenaDomainKey — return of resolveArenaDomain(userData) */
export function getArenaV2PilotFor(arenaDomainKey) {
  return ARENA_V1_TO_V2_PILOT[arenaDomainKey] || null
}

// ── Phase 2: verified default-to-V2 domains (2026-08-13) ───────────────────
// Root cause: V1's mission generator (backend/server/lib/gemini.js) writes
// an AI-generated narrative brief that's structurally disconnected from the
// actual workstation content (schema/dataset/starter-code), which is always
// pulled from one of a handful of fixed generic templates instead —
// backend/server/lib/gemini.js's `geminiGenerateMission` explicitly
// overwrites whatever the AI wrote. For DBA specifically this doubles up
// with a second, frontend-only bug: workstationEngine.js's detectScenario()
// keyword-guesses ecom/fintech/saas from the mission title and silently
// falls back to ecom when nothing matches — which is why a mission titled
// "Swiggy Restaurant Database" shows a customers/orders/products schema with
// no restaurants table anywhere. This is a platform-wide V1 design gap, not
// a one-off content bug, and it affects every one of V1's ~28 domains, not
// just DBA (confirmed by reading DOMAIN_CONTEXT in gemini.js).
//
// Arena V2 already solves this correctly: aiScenarioGenerator.js generates
// the narrative AND the workstation-specific structured content (tables,
// starter code, dataset, etc.) in ONE atomic AI call, validated before use,
// so they can never disagree. The permanent fix is moving domains onto V2
// by default rather than patching V1's fundamentally split architecture.
//
// This is done ONE domain at a time, only after that domain's V2 workstation
// content generation has been read and verified end-to-end (not just "a
// pilot page exists") — see the 2026-08-13 fix to aiScenarioGenerator.js's
// `dashboard` branch (DBA's workstation) for what "verified" means here:
// strict server-side validation of every field DbaWorkstationV2.jsx reads,
// so a malformed AI response can never reach the screen instead of silently
// rendering empty/zeroed panels.
//
// Verified so far: dba (2026-08-13, this fix).
// NOT yet verified (still show the opt-in banner only, per
// ARENA_V1_TO_V2_PILOT above): data, cyber, devops, ml, swe, ece, eee,
// mechanical, civil — each needs the same read-and-verify pass on its own
// WORKSTATION_SPECS entry (or lack thereof, several currently have NONE —
// see aiScenarioGenerator.js's WORKSTATION_SPECS) before being added here.
export const ARENA_V2_DEFAULT_DOMAINS = ["dba"]

// sessionStorage key: set when a user explicitly backs out of a
// default-to-V2 domain's workstation, so they land back in familiar V1
// territory for the rest of the session instead of being bounced straight
// back into V2 the moment they arrive. Cleared on next session automatically
// (sessionStorage, not localStorage) — this is a "let me look at the old one
// today" escape hatch, not a permanent per-user preference/setting.
export const PREFER_CLASSIC_ARENA_KEY = "capabilio_prefer_classic_arena"

/** @param {string} arenaDomainKey */
export function shouldDefaultToV2(arenaDomainKey) {
  if (!ARENA_V2_DEFAULT_DOMAINS.includes(arenaDomainKey)) return false
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(PREFER_CLASSIC_ARENA_KEY) === "1") return false
  return true
}
