// ── Data-driven domain manifest fallback for Arena mission generation ─────────
//
// DOMAIN_CONTEXT in gemini.js is a hardcoded map of ~22 known domainKeys →
// {type, workstation, tools, lang, scenarioTypes, starterCode}. Any domainKey
// NOT in that map used to silently fall back to DOMAIN_CONTEXT.swe (generic
// software-engineer content), producing wrong workstation/tooling/scenarios
// for the actual role — confirmed for ml/eee/civil/mechanical/embedded before
// they were added directly to DOMAIN_CONTEXT.
//
// This module is the safety net for every domainKey that will EVER show up
// beyond that hardcoded list (new roles added to roleConfig.js in the future,
// typos, edge cases). Instead of requiring a source-code change + deploy for
// each new role, it:
//   1. Checks the domain_context_manifests table for a manifest for this key.
//   2. If missing, asks Gemini to generate one, in a strict JSON shape.
//   3. VALIDATES the AI output before trusting it — critically, `workstation`
//      must be one of the frontend's actual registered workstation shells
//      (WORKSTATION_ENUM below). An AI hallucinating an unknown workstation
//      value would otherwise silently break the mission UI for that student.
//   4. Persists the validated manifest so it's a one-time cost per domainKey,
//      not a regeneration on every mission.
//
// This is deliberately NOT a code-generation/self-modifying-agent pattern —
// the AI only ever produces DATA (validated against a fixed schema), never
// source code, and nothing here ever writes to gemini.js or deploys anything.
// A human can review/edit any row in domain_context_manifests at any time via
// the `reviewed` flag and Supabase directly.

import { supabaseAdmin } from "./supabase.js"

// Mirrors the exact set of workstation shells resolveWorkstationType() in
// frontend/src/pages/ArenaWorkstations.jsx knows how to render. If this list
// drifts from that file, generated manifests could point at a workstation
// with no real component — keep these in sync when new shells are added.
export const WORKSTATION_ENUM = [
  "circuit_lab", "interactive_circuit", "embedded_lab", "diagram_workspace",
  "visual_inspection", "diagnostic_console", "document_viewer", "sequence_builder",
  "engineering_lab", "sql", "api", "frontend", "terminal", "notebook",
  "markdown", "excel", "dashboard", "report", "code", "system_design",
  "calculator", "security_console", "soc_console", "sre_console", "qa_lab",
  "business_analysis", "medical_coding",
]

// EngineeringLabWorkstation keys its tabs/units off mission.category via
// ENGINEERING_DOMAIN_CONFIG — only these four are registered. If an
// AI-generated manifest picks "engineering_lab" but an unrecognised
// category, we downgrade the workstation to "code" rather than risk the lab
// silently rendering with the wrong (default ECE) units/tabs.
const ENGINEERING_CATEGORY_ENUM = ["ECE", "EEE", "Mechanical", "Civil"]

const MAX_SCENARIOS = 6
const MAX_STRING_LEN = 2000
const MAX_STARTER_LEN = 4000

function truncate(str, max) {
  return typeof str === "string" ? str.slice(0, max) : ""
}

// Validate + sanitize a raw AI-generated manifest object into a safe ctx
// shape. Returns null if the manifest is unusable (missing required fields) —
// caller should fall back to DOMAIN_CONTEXT.swe in that case, never throw.
function validateManifest(raw) {
  if (!raw || typeof raw !== "object") return null
  const type  = truncate(raw.type, 100)
  const tools = truncate(raw.tools, 300)
  const lang  = truncate(raw.lang, 100)
  const starterCode = truncate(raw.starterCode, MAX_STARTER_LEN)
  if (!type || !tools || !lang || !starterCode) return null

  let scenarioTypes = Array.isArray(raw.scenarioTypes)
    ? raw.scenarioTypes.filter(s => typeof s === "string" && s.trim()).slice(0, MAX_SCENARIOS).map(s => truncate(s, MAX_STRING_LEN))
    : []
  let studentScenarioTypes = Array.isArray(raw.studentScenarioTypes)
    ? raw.studentScenarioTypes.filter(s => typeof s === "string" && s.trim()).slice(0, MAX_SCENARIOS).map(s => truncate(s, MAX_STRING_LEN))
    : []
  if (!scenarioTypes.length) return null
  if (!studentScenarioTypes.length) studentScenarioTypes = scenarioTypes

  // workstation MUST be a real, registered shell — never trust the AI here.
  let workstation = WORKSTATION_ENUM.includes(raw.workstation) ? raw.workstation : "code"

  // category only matters (and is only validated) for engineering_lab.
  let category = typeof raw.category === "string" ? raw.category : null
  if (workstation === "engineering_lab" && !ENGINEERING_CATEGORY_ENUM.includes(category)) {
    // Unrecognised category would silently render with the wrong (ECE
    // default) tabs/units — safer to downgrade to a generic code workstation
    // than show incorrect engineering content.
    workstation = "code"
    category = null
  }

  return { type, workstation, category, tools, lang, scenarioTypes, studentScenarioTypes, starterCode }
}

function manifestRowToCtx(row) {
  return {
    type: row.type,
    workstation: row.workstation,
    category: row.category || undefined,
    tools: row.tools,
    lang: row.lang,
    scenarioTypes: row.scenario_types || [],
    studentScenarioTypes: row.student_scenario_types || [],
    starterCode: row.starter_code,
  }
}

// Ask Gemini to design a domain manifest for an unrecognised role. Kept
// intentionally separate from mission generation (different prompt shape,
// different model call) — this only runs once per new domainKey, ever.
async function generateManifestViaAI(genModel, domainKey, keyword) {
  const prompt = `You are designing the content template for a new career-assessment domain on an Indian tech/engineering career platform called Capabilio Arena.

Role/domain: "${keyword}" (internal key: "${domainKey}")

Design a JSON manifest describing how this role's practice missions should be generated. Return ONLY this JSON object:
{
  "type": "Short human-readable domain name, e.g. 'Cloud Security Engineering'",
  "workstation": "MUST be exactly one of: ${WORKSTATION_ENUM.join(", ")}",
  "category": "ONLY if workstation is 'engineering_lab', one of: ECE, EEE, Mechanical, Civil — otherwise omit this field",
  "tools": "Comma-separated primary tools/technologies for this role",
  "lang": "Primary language or stack",
  "scenarioTypes": ["4-6 realistic PROFESSIONAL-level mission scenarios using {company} as a placeholder for a company name — describe the business problem only, no solution hints"],
  "studentScenarioTypes": ["4-6 BEGINNER/FRESHER-level mission scenarios for the same domain, scoped to a single concept each, using {company} as a placeholder"],
  "starterCode": "A minimal starter-code/document scaffold for this domain — structure only, TODO markers only, ZERO solution hints, ZERO hardcoded values that reveal the answer. Use {company} as a placeholder where a company name fits naturally."
}

Pick "workstation" based on what this role actually does day-to-day — e.g. a role that queries databases should get "sql", a role writing infrastructure config should get "terminal", a role doing lab/hardware work should get "engineering_lab" or "circuit_lab", a data-science-flavoured role should get "notebook".`

  const result = await genModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 1600, responseMimeType: "application/json" },
  })
  return JSON.parse(result.response.text())
}

// Main entry point. Returns a ctx object (same shape as a DOMAIN_CONTEXT
// entry) or null if generation/validation failed — caller falls back to swe.
export async function getOrCreateDomainManifest(genModel, domainKey, keyword) {
  try {
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("domain_context_manifests")
      .select("*")
      .eq("domain_key", domainKey)
      .maybeSingle()
    if (readErr) throw readErr
    if (existing) return manifestRowToCtx(existing)

    const raw = await generateManifestViaAI(genModel, domainKey, keyword)
    const validated = validateManifest(raw)
    if (!validated) return null

    const { data: inserted, error: writeErr } = await supabaseAdmin
      .from("domain_context_manifests")
      .upsert({
        domain_key: domainKey,
        type: validated.type,
        workstation: validated.workstation,
        category: validated.category,
        tools: validated.tools,
        lang: validated.lang,
        scenario_types: validated.scenarioTypes,
        student_scenario_types: validated.studentScenarioTypes,
        starter_code: validated.starterCode,
        source: "ai_generated",
      }, { onConflict: "domain_key" })
      .select()
      .maybeSingle()
    if (writeErr) throw writeErr

    return manifestRowToCtx(inserted || {
      type: validated.type, workstation: validated.workstation, category: validated.category,
      tools: validated.tools, lang: validated.lang,
      scenario_types: validated.scenarioTypes, student_scenario_types: validated.studentScenarioTypes,
      starter_code: validated.starterCode,
    })
  } catch (e) {
    // Fail open to the swe fallback — a broken manifest generation should
    // never block a student from getting a mission at all.
    console.error(`[domainManifest] failed for domainKey="${domainKey}":`, e.message)
    return null
  }
}
