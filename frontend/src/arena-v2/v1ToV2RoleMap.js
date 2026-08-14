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
//      Developer) and Data Analyst, but roleConfig.js's `arenaKey` enum has
//      no "sap_fico"/"sap_mmsd"/"sap_abap"/"data_analyst" value at all —
//      there's nothing on the V1 side to map FROM. (Data Analyst also has
//      no dedicated `arenaV2*Pilot` page in App.jsx yet, even though its
//      challenge template + SqlWorkstationV2 wiring exist — a separate,
//      already-flagged gap, not something this map can paper over.)
//
// Extending this map safely means: (a) confirming the new arenaKey really
// means the same role Arena V2 built a workstation for, and (b) if it's a
// SAP/Data-Analyst-style gap, adding the missing arenaKey value to
// roleConfig.js AND the missing arenaV2*Pilot page to App.jsx first — not
// just adding a row here.
export const ARENA_V1_TO_V2_PILOT = {
  dba:        "arenaV2DbaPilot",        // Database Administrator
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
