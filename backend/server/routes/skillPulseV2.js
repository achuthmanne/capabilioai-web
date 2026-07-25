/**
 * Weekly Skill Pulse V2 (Career OS Workstream 3)
 *
 * Adds a coverage-gated 15-question flow on top of the existing, untouched
 * v1 5-question flow (backend/server/routes/weeklyPulse.js). Reuses v1's
 * `POST /pro/weekly/:id/answer` and `POST /pro/weekly/:id/complete` routes
 * unchanged — this file only owns the "what pulse/questions get created"
 * decision (GET .../status, POST .../generate); once a pulse exists in
 * weekly_pulses/weekly_questions, it behaves identically to a v1 pulse to
 * the rest of the app, whichever flow_version produced it.
 *
 * Feature flag: career_os_skill_pulse_v2. Reading this flag is the
 * FRONTEND's job (frontend/src/config/featureFlags.js) — the backend gate
 * here is the authoritative one, so a client can't force v2 by ignoring its
 * own flag: /v2/generate always re-derives the decision server-side via
 * decideFlowVersion(), never trusts a client-supplied "give me v2" request.
 *
 * GET  /api/pro/weekly/v2/status    — eligibility decision only, no writes
 * POST /api/pro/weekly/v2/generate  — idempotent per (user, week); builds a
 *                                     v1 or v2 pulse depending on the gate
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"
import { currentWeekOf, dueAtFor, buildPulseForWeek } from "./weeklyPulse.js"
import { decideFlowVersion } from "../lib/skillPulseV2/questionBankGate.js"
import { inferRelevantDomains } from "../lib/skillPulseV2/domainInference.js"
import { computeDecayState } from "../lib/skillPulseV2/decay.js"
import { selectPulseQuestions } from "../lib/skillPulseV2/selection.js"

const router = Router()

// Backend's own read of the flag — mirrors frontend/src/config/
// featureFlags.js's default (false) so a server restart without the env var
// set never accidentally serves v2. Ops can flip via the same env var name
// used by the frontend build, kept in sync deliberately.
const V2_FLAG_ENABLED = process.env.CAREER_OS_SKILL_PULSE_V2 === "true" || process.env.VITE_FF_CAREER_OS_SKILL_PULSE_V2 === "true"

async function getApprovedCountsByDomain() {
  const { data, error } = await supabaseAdmin
    .from("question_bank")
    .select("domain")
    .eq("review_status", "approved")
    .is("retired_at", null)
  if (error) throw error
  const counts = {}
  for (const row of data || []) counts[row.domain] = (counts[row.domain] || 0) + 1
  return counts
}

async function getSeenQuestionIds(uid, weeksBack = 8) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - weeksBack * 7)
  const { data: pulses } = await supabaseAdmin
    .from("weekly_pulses").select("id").eq("user_id", uid).gte("created_at", since.toISOString())
  const pulseIds = (pulses || []).map(p => p.id)
  if (!pulseIds.length) return new Set()
  const { data: qs } = await supabaseAdmin
    .from("weekly_questions").select("bank_question_id").in("pulse_id", pulseIds).not("bank_question_id", "is", null)
  return new Set((qs || []).map(q => q.bank_question_id).filter(Boolean))
}

async function getSkillDecaySignals(uid, skillNames) {
  // Gathers "relevant signals" (Part E) from the sources that actually exist
  // today: weekly_answers (pulse activity), user_skills.proof_artifacts
  // (verified proof), career_events (certification_earned / skill_verified).
  // Pure decay math itself lives in decay.js — this is just data-gathering.
  const [{ data: answers }, { data: skills }, { data: events }] = await Promise.all([
    supabaseAdmin
      .from("weekly_answers")
      .select("answered_at, weekly_questions!inner(skill_id, user_skills!inner(name))")
      .eq("user_id", uid),
    supabaseAdmin.from("user_skills").select("id,name,proof_artifacts,verified").eq("user_id", uid),
    supabaseAdmin.from("career_events").select("event_type,title,occurred_at").eq("user_id", uid)
      .in("event_type", ["certification_earned", "skill_verified"]),
  ])

  const signalsByName = {}
  for (const name of skillNames) signalsByName[name.toLowerCase()] = []

  for (const a of answers || []) {
    const name = a.weekly_questions?.user_skills?.name?.toLowerCase()
    if (name && signalsByName[name]) {
      signalsByName[name].push({ type: "weekly_pulse_activity", occurred_at: a.answered_at })
    }
  }
  for (const s of skills || []) {
    const name = s.name?.toLowerCase()
    if (!name || !signalsByName[name]) continue
    for (const artifact of s.proof_artifacts || []) {
      if (artifact?.submitted_at) signalsByName[name].push({ type: "verified_proof", occurred_at: artifact.submitted_at })
    }
  }
  for (const e of events || []) {
    const name = (e.title || "").toLowerCase()
    for (const skillName of skillNames) {
      if (name.includes(skillName.toLowerCase())) {
        signalsByName[skillName.toLowerCase()].push({ type: e.event_type === "certification_earned" ? "certification" : "verified_skill_event", occurred_at: e.occurred_at })
      }
    }
  }
  return signalsByName
}

async function eligibilityForUser(uid) {
  const [{ data: userSkills }, approvedCountsByDomain] = await Promise.all([
    supabaseAdmin.from("user_skills").select("id,name,slug,level_score,verified").eq("user_id", uid),
    getApprovedCountsByDomain(),
  ])
  const relevantDomains = inferRelevantDomains(userSkills || [])
  const decision = decideFlowVersion({ v2FlagEnabled: V2_FLAG_ENABLED, approvedCountsByDomain, relevantDomains })
  return { decision, userSkills: userSkills || [], approvedCountsByDomain, relevantDomains }
}

// ── GET eligibility status only — no writes, safe to poll from the frontend ──
router.get("/pro/weekly/v2/status", requireAuth, async (req, res) => {
  try {
    const { decision } = await eligibilityForUser(req.user.id)
    res.json({
      flow_version: decision.flow_version,
      reason: decision.reason,
      v2_flag_enabled: V2_FLAG_ENABLED,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

async function buildV2PulseForWeek(uid, weekOf, { userSkills, approvedCountsByDomain, relevantDomains }) {
  const seenIds = await getSeenQuestionIds(uid, 8)

  const { data: approvedQuestions, error: qErr } = await supabaseAdmin
    .from("question_bank")
    .select("*")
    .eq("review_status", "approved")
    .is("retired_at", null)
    .in("domain", relevantDomains.length ? relevantDomains : ["other"])
  if (qErr) throw qErr

  const signalsByName = await getSkillDecaySignals(uid, userSkills.map(s => s.name))
  const skillsWithDecay = userSkills.map(s => ({
    ...s,
    decayState: computeDecayState(signalsByName[s.name?.toLowerCase()] || []).state,
  }))

  // Prior performance (adaptive difficulty, Part C) — most recent completed
  // pulse of either flow version.
  const { data: priorPulse } = await supabaseAdmin
    .from("weekly_pulses").select("correct_count,question_count")
    .eq("user_id", uid).eq("status", "completed")
    .order("completed_at", { ascending: false }).limit(1).maybeSingle()
  const priorPerformance = priorPulse?.question_count
    ? { accuracyLastPulse: priorPulse.correct_count / priorPulse.question_count }
    : {}

  const seed = `${uid}:${weekOf}`
  const result = selectPulseQuestions({
    approvedQuestions,
    userSkills: skillsWithDecay,
    seenQuestionIds: seenIds,
    priorPerformance,
    seed,
    count: 15,
    maxPerSkill: 3,
  })

  if (result.insufficient) return null // caller falls back to v1

  const { data: pulse, error: pulseErr } = await supabaseAdmin
    .from("weekly_pulses")
    .upsert({
      user_id: uid, week_of: weekOf, status: "pending",
      question_count: result.questions.length, due_at: dueAtFor(weekOf),
      flow_version: "v2",
    }, { onConflict: "user_id,week_of" })
    .select().single()
  if (pulseErr) throw pulseErr

  const rows = result.questions.map(q => ({
    pulse_id: pulse.id,
    skill_id: skillsWithDecay.find(s => (q.skill_tags || []).includes(String(s.slug || s.name).toLowerCase()))?.id || null,
    bank_question_id: q.id,
    question_type: q.question_type,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
    correct_option_id: q.correct_option_id,
    explanation: q.explanation,
    generated_from: "role_profile", // closest existing enum value for bank-sourced v2 content
  }))
  const { data: questions, error: insErr } = await supabaseAdmin.from("weekly_questions").insert(rows).select()
  if (insErr) throw insErr

  return { pulse, questions, meta: result.meta }
}

// ── GET decay states for every one of the caller's skills ────────────────
// Surfaces decay.js's Fresh/Aging/At Risk/Decayed model (Part E) directly to
// the frontend for the first time — until now it was only ever consumed
// internally by buildV2PulseForWeek's question-selection weighting. Not
// gated behind V2_FLAG_ENABLED/CAREER_OS_SKILL_PULSE_V2: decay state is a
// read of real, already-recorded signals (weekly pulse activity, verified
// proof, certifications, verified skill events) independent of which pulse
// question flow (v1/v2) the user is on — gating it behind the pulse-v2
// eligibility flag would hide a real signal from users who are correctly on
// v1. Read-only, no writes.
router.get("/pro/weekly/v2/decay-states", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: userSkills, error } = await supabaseAdmin
      .from("user_skills")
      .select("id,name,slug,level_score,verified")
      .eq("user_id", uid)
    if (error) throw error

    const signalsByName = await getSkillDecaySignals(uid, (userSkills || []).map(s => s.name))
    const skills = (userSkills || []).map(s => {
      const result = computeDecayState(signalsByName[s.name?.toLowerCase()] || [])
      return {
        skill_id: s.id,
        name: s.name,
        level_score: s.level_score,
        verified: !!s.verified,
        decay_state: result.state,
        decay_state_label: result.stateLabel,
        weeks_since_signal: result.weeksSinceSignal,
        driver: result.driver,
      }
    })
    res.json({ skills })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── POST generate — idempotent per (user, week); decides v1 vs v2 server-side ──
router.post("/pro/weekly/v2/generate", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const weekOf = currentWeekOf()

    const { data: existing } = await supabaseAdmin
      .from("weekly_pulses").select("id,flow_version").eq("user_id", uid).eq("week_of", weekOf).maybeSingle()
    if (existing) return res.json({ success: true, alreadyExists: true, pulse_id: existing.id, flow_version: existing.flow_version })

    const { decision, userSkills, approvedCountsByDomain, relevantDomains } = await eligibilityForUser(uid)

    if (decision.flow_version === "v2") {
      const built = await buildV2PulseForWeek(uid, weekOf, { userSkills, approvedCountsByDomain, relevantDomains })
      if (built) {
        return res.json({ success: true, flow_version: "v2", pulse: built.pulse, question_count: built.questions.length })
      }
      // Coverage gate said yes but the actual pool couldn't fill a valid 15-
      // question set for this specific user (e.g. anti-repeat/max-per-skill
      // starved it) — fail safe to v1 rather than serve a short/broken pulse.
    }

    const builtV1 = await buildPulseForWeek(uid, weekOf)
    if (!builtV1) return res.status(400).json({ error: "Add a few skills to your profile first — Career Check needs something to check in on." })
    res.json({ success: true, flow_version: "v1", pulse: builtV1.pulse, question_count: builtV1.questions.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
