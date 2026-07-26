/**
 * Weekly Career Check ("Weekly Refresh Engine")
 * PROFESSIONAL_PATH_ARCHITECTURE.md §4.2
 *
 * NAMING RULE (product requirement, non-negotiable): this feature must never be
 * labeled "assessment" anywhere in UI copy, notifications, or API-facing text
 * surfaced to the user. Use "Weekly Career Check" / "Skill Pulse" / "5-Minute
 * Refresh" / "Career Check-in". Internal table/route names ("weekly_pulses",
 * "/pro/weekly") are fine since they're not user-facing.
 *
 * Tables: weekly_pulses, weekly_questions, weekly_answers (migration
 * create_weekly_refresh_engine). Skill data comes from the real, retargeted
 * user_skills table (see skillGraph.js header comment) and role context from
 * role_profiles (role_name, domain_key, required_skills jsonb, recruiter_keywords,
 * jd_phrases).
 *
 * Confidence-feedback rule (explicit product constraint): weekly performance
 * is ONE signal among several (resume, employment/EPFO, certs, proof,
 * mentor/manager confirmation) and must never dominate. A single weekly pulse
 * can move a skill's level_score by at most +/-15 total (all questions on that
 * skill combined), not per-question, and only nudges — it never sets verified.
 *
 * GET  /api/pro/weekly/current      — this week's pulse (generates one if due and missing)
 * POST /api/pro/weekly/generate     — force-generate this week's pulse (idempotent per week)
 * POST /api/pro/weekly/:id/answer   — submit an answer to one question
 * POST /api/pro/weekly/:id/complete — finalize the pulse, apply confidence feedback
 */
import { Router } from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import { computeAllConfidenceChanges } from "../lib/skillPulseV2/confidenceFeedback.js"
import { applyPulseCompletionToElo, applyPendingDecay } from "../lib/professionalElo/eloEngine.js"

const router = Router()

const QUESTION_TYPES = [
  "scenario", "bug_finding", "reasoning", "dashboard_interpretation",
  "architecture_interpretation", "operational_decision", "work_situation",
]

// Monday of the current week, as YYYY-MM-DD (stable week key regardless of
// what day the user opens the check-in on).
function currentWeekOf(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = date.getUTCDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

function dueAtFor(weekOf) {
  const d = new Date(`${weekOf}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + 6) // Sunday end-of-week
  d.setUTCHours(23, 59, 59, 0)
  return d.toISOString()
}

// Pick which skills to build this week's questions around: prioritize skills
// that are unverified, low-proof, or stale — this is where "unused skill" /
// "weak topic" signals feed in, per the architecture doc's confidence model.
function prioritizeSkills(skills, recentSkillIds) {
  const pool = (skills || []).filter(s => !recentSkillIds.has(s.id))
  const scored = (pool.length ? pool : skills || []).map(s => {
    let weight = 0
    if (!s.verified) weight += 3
    if ((s.proof_count || 0) === 0) weight += 2
    if ((s.level_score || 0) < 60) weight += 2
    if (s.is_current) weight += 1
    return { skill: s, weight }
  })
  scored.sort((a, b) => b.weight - a.weight)
  return scored.slice(0, 5).map(x => x.skill)
}

async function recentlyUsedSkillIds(uid, weeks = 4) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - weeks * 7)
  const { data: pulses } = await supabaseAdmin
    .from("weekly_pulses")
    .select("id")
    .eq("user_id", uid)
    .gte("created_at", since.toISOString())
  const pulseIds = (pulses || []).map(p => p.id)
  if (!pulseIds.length) return new Set()
  const { data: qs } = await supabaseAdmin
    .from("weekly_questions")
    .select("skill_id")
    .in("pulse_id", pulseIds)
  return new Set((qs || []).map(q => q.skill_id).filter(Boolean))
}

async function generateQuestions({ skills, role, roleContext }) {
  const skillList = skills.map(s => `${s.name} (level_score=${s.level_score ?? "n/a"}, verified=${!!s.verified})`).join("; ")

  const prompt = `You write short, mobile-first "Career Check-in" questions for working professionals — NOT exam questions, NOT academic quizzes. Never use the word "assessment."

Target role: ${role || "Professional"}
Role signal (from job-market data, may be partial): ${roleContext || "none"}
Skills to probe this week: ${skillList || "general professional skills"}

Write exactly 5 multiple-choice questions, one per skill where possible (reuse a skill only if fewer than 5 skills given). Each question must:
- Be scenario-based or bug-finding style (a real work situation, a broken dashboard reading, a code/system snippet with a subtle issue, an operational trade-off) — not a trivia/definition question.
- Have 4 options, exactly one correct.
- Include a one-sentence explanation of why the correct answer is right.
- Be answerable in under 30 seconds by someone who actually uses the skill at work.
- Vary difficulty 1-5 across the 5 questions (mix easy and hard).
- Pick "question_type" from exactly: scenario, bug_finding, reasoning, dashboard_interpretation, architecture_interpretation, operational_decision, work_situation.

Return ONLY valid JSON, no prose, matching exactly:
{
  "questions": [
    {
      "skill_name": "string, must match one of the given skills",
      "question_type": "one of the allowed types",
      "difficulty": 1-5,
      "prompt": "string",
      "options": [{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."},{"id":"d","text":"..."}],
      "correct_option_id": "a|b|c|d",
      "explanation": "string"
    }
  ]
}`

  const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 1800, json: true, temperature: 0.6 })
  const parsed = JSON.parse(raw)
  const qs = Array.isArray(parsed.questions) ? parsed.questions : []
  return qs.filter(q =>
    q?.prompt && Array.isArray(q.options) && q.options.length === 4 && q.correct_option_id
  ).slice(0, 5)
}

async function buildPulseForWeek(uid, weekOf) {
  const [{ data: skills }, { data: profile }] = await Promise.all([
    supabaseAdmin.from("user_skills").select("*").eq("user_id", uid),
    supabaseAdmin.from("profiles").select("target_role,keyword,current_job_role,experiences").eq("id", uid).single(),
  ])

  // Same fallback chain as skillGraph.js's gaps route: prefer the explicit
  // target_role (resume-derived or manually set), then legacy fields, then
  // fall back to the current/most-recent experience title before "Professional".
  const wpExps = Array.isArray(profile?.experiences) ? profile.experiences : []
  const wpCurrentExp = wpExps.find(e => e?.isCurrent || e?.current) || wpExps[0]
  const role = profile?.target_role || profile?.current_job_role || profile?.keyword
    || wpCurrentExp?.role || wpCurrentExp?.title || "Professional"

  let roleContext = ""
  try {
    const { data: rp } = await supabaseAdmin
      .from("role_profiles")
      .select("role_name,domain_key,required_skills,recruiter_keywords")
      .ilike("role_name", `%${role}%`)
      .limit(1)
      .maybeSingle()
    if (rp) roleContext = `required_skills=${JSON.stringify(rp.required_skills || []).slice(0, 300)}`
  } catch { /* role_profiles miss is non-fatal — pulse still generates from user_skills alone */ }

  const recentIds = await recentlyUsedSkillIds(uid)
  const chosen = prioritizeSkills(skills, recentIds)

  if (!chosen.length) return null // nothing to build a check-in from yet

  const generated = await generateQuestions({ skills: chosen, role, roleContext })
  if (!generated.length) throw new Error("Could not generate this week's Career Check questions")

  const { data: pulse, error: pulseErr } = await supabaseAdmin
    .from("weekly_pulses")
    .upsert({
      user_id: uid,
      week_of: weekOf,
      status: "pending",
      question_count: generated.length,
      due_at: dueAtFor(weekOf),
    }, { onConflict: "user_id,week_of" })
    .select()
    .single()
  if (pulseErr) throw pulseErr

  const skillBySlug = new Map(chosen.map(s => [s.name.toLowerCase(), s.id]))
  const rows = generated.map(q => ({
    pulse_id: pulse.id,
    skill_id: skillBySlug.get((q.skill_name || "").toLowerCase()) || chosen[0]?.id || null,
    question_type: QUESTION_TYPES.includes(q.question_type) ? q.question_type : "scenario",
    difficulty: Math.max(1, Math.min(5, Math.round(q.difficulty || 2))),
    prompt: q.prompt,
    options: q.options,
    correct_option_id: q.correct_option_id,
    explanation: q.explanation || null,
    generated_from: chosen.find(s => s.id === skillBySlug.get((q.skill_name || "").toLowerCase()))?.verified === false
      ? "unused_skill" : "resume_skill",
  }))

  const { data: questions, error: qErr } = await supabaseAdmin
    .from("weekly_questions")
    .insert(rows)
    .select()
  if (qErr) throw qErr

  return { pulse, questions }
}

function stripAnswerKey(q) {
  const { correct_option_id, explanation, ...safe } = q
  return safe
}

// ── GET current week's Career Check (generates on first request if due) ──────
router.get("/pro/weekly/current", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const weekOf = currentWeekOf()

    // Lazy inactivity-decay check (product rule 5/6) — no scheduler exists
    // in this codebase, so this is the on-demand equivalent: every time the
    // user opens their weekly check-in, apply any bounded ELO decay that's
    // become due since their last pulse. A no-op most of the time. Must
    // never block the pulse the user came here for.
    try { await applyPendingDecay(supabaseAdmin, uid) } catch (e) { console.error("[weeklyPulse:decay]", e.message) }

    let { data: pulse } = await supabaseAdmin
      .from("weekly_pulses").select("*").eq("user_id", uid).eq("week_of", weekOf).maybeSingle()

    let questions = []
    if (pulse) {
      const { data: qs } = await supabaseAdmin
        .from("weekly_questions").select("*").eq("pulse_id", pulse.id).order("created_at")
      questions = qs || []
    } else {
      const built = await buildPulseForWeek(uid, weekOf)
      if (!built) return res.json({ available: false, reason: "no_skills_yet" })
      pulse = built.pulse
      questions = built.questions
    }

    const { data: answers } = await supabaseAdmin
      .from("weekly_answers").select("*").eq("user_id", uid).in("question_id", questions.map(q => q.id))
    const answeredIds = new Set((answers || []).map(a => a.question_id))

    res.json({
      available: true,
      pulse,
      questions: questions.map(q => ({
        ...stripAnswerKey(q),
        answered: answeredIds.has(q.id),
      })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Force-generate (idempotent per user/week via unique constraint) ──────────
router.post("/pro/weekly/generate", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const weekOf = currentWeekOf()
    const { data: existing } = await supabaseAdmin
      .from("weekly_pulses").select("id").eq("user_id", uid).eq("week_of", weekOf).maybeSingle()
    if (existing) return res.json({ success: true, alreadyExists: true, pulse_id: existing.id })

    const built = await buildPulseForWeek(uid, weekOf)
    if (!built) return res.status(400).json({ error: "Add a few skills to your profile first — Career Check needs something to check in on." })
    res.json({ success: true, pulse: built.pulse, question_count: built.questions.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Answer one question ───────────────────────────────────────────────────────
router.post("/pro/weekly/:pulseId/answer", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { pulseId } = req.params
    const { question_id, selected_option_id, response_time_ms } = req.body
    if (!question_id || !selected_option_id) return res.status(400).json({ error: "question_id and selected_option_id required" })

    const { data: pulse } = await supabaseAdmin.from("weekly_pulses").select("*").eq("id", pulseId).single()
    if (!pulse || pulse.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    const { data: question } = await supabaseAdmin
      .from("weekly_questions").select("*").eq("id", question_id).eq("pulse_id", pulseId).single()
    if (!question) return res.status(404).json({ error: "Question not found" })

    const isCorrect = selected_option_id === question.correct_option_id

    const { data: answer, error } = await supabaseAdmin
      .from("weekly_answers")
      .upsert({
        question_id,
        user_id: uid,
        selected_option_id,
        is_correct: isCorrect,
        response_time_ms: response_time_ms || null,
      }, { onConflict: "question_id,user_id" })
      .select()
      .single()
    if (error) throw error

    if (pulse.status === "pending") {
      await supabaseAdmin.from("weekly_pulses").update({ status: "in_progress" }).eq("id", pulseId)
    }

    res.json({
      success: true,
      is_correct: isCorrect,
      correct_option_id: question.correct_option_id,
      explanation: question.explanation,
      answer,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Complete the check-in: tally, apply capped confidence feedback ───────────
router.post("/pro/weekly/:pulseId/complete", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { pulseId } = req.params

    const { data: pulse } = await supabaseAdmin.from("weekly_pulses").select("*").eq("id", pulseId).single()
    if (!pulse || pulse.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    const { data: questions } = await supabaseAdmin
      .from("weekly_questions").select("*").eq("pulse_id", pulseId)
    const { data: answers } = await supabaseAdmin
      .from("weekly_answers").select("*").eq("user_id", uid).in("question_id", (questions || []).map(q => q.id))

    const answerByQ = new Map((answers || []).map(a => [a.question_id, a]))
    const correctCount = (questions || []).filter(q => answerByQ.get(q.id)?.is_correct).length

    await supabaseAdmin.from("weekly_pulses").update({
      status: "completed",
      correct_count: correctCount,
      completed_at: new Date().toISOString(),
    }).eq("id", pulseId)

    // Confidence feedback — capped nudge only, per product constraint that
    // quiz performance must never dominate the skill confidence model.
    // Total movement per skill this pulse is capped at +/-15 on level_score,
    // split evenly across however many questions touched that skill. Uses
    // the same tested, pure bounded-math module the v2 flow uses
    // (backend/server/lib/skillPulseV2/confidenceFeedback.js) so both flows
    // apply identical, auditable math — this is a same-formula refactor, not
    // a behavior change (see skillPulseV2.test.js for the formula's tests).
    const answersBySkill = (questions || [])
      .filter(q => q.skill_id && answerByQ.has(q.id))
      .map(q => ({ skillId: q.skill_id, questionId: q.id, isCorrect: answerByQ.get(q.id).is_correct }))

    const skillIds = [...new Set(answersBySkill.map(a => a.skillId))]
    const { data: skillRows } = skillIds.length
      ? await supabaseAdmin.from("user_skills").select("id,name,level_score").in("id", skillIds)
      : { data: [] }
    const skillById = new Map((skillRows || []).map(s => [s.id, s]))
    const previousLevelScoreBySkillId = Object.fromEntries(
      (skillRows || []).map(s => [s.id, s.level_score ?? 50])
    )

    const changes = computeAllConfidenceChanges(answersBySkill, previousLevelScoreBySkillId)

    const feedback = []
    const skillsRefreshed = []   // Part D: "skills refreshed" — moved up
    const skillsToRevisit = []   // Part D: "skills to revisit" — moved down or unchanged after a weak showing
    for (const change of changes) {
      if (change.cappedDelta === 0) continue
      await supabaseAdmin.from("user_skills").update({
        level_score: change.newLevelScore,
        confidence: change.newLevelScore / 100,
        updated_at: new Date().toISOString(),
      }).eq("id", change.skillId)

      // Backward-compatible field names (unchanged from the pre-refactor
      // shape) plus additive fields the v2 results screen (and, optionally,
      // a future v1 results polish) can use.
      feedback.push({
        skill_id: change.skillId, delta: change.cappedDelta, new_level_score: change.newLevelScore,
        skill_name: skillById.get(change.skillId)?.name || null,
        explanation: change.explanation, // visible bounded math, Part D requirement
      })
      const named = { skill_id: change.skillId, skill_name: skillById.get(change.skillId)?.name || null, delta: change.cappedDelta }
      if (change.cappedDelta > 0) skillsRefreshed.push(named)
      else skillsToRevisit.push(named)
    }

    // Professional ELO — PRODUCT DECISION 2026-07-25: ELO moves from real
    // Skill Pulse performance only (see eloEngine.js header for why this is
    // a separate track from the profile-completeness-driven ELO fields on
    // `profiles`). Uses the exact same correct/incorrect answer data
    // confidence-feedback just used above, so both updates come from one
    // real, already-recorded outcome — never fabricated, never triggered by
    // anything else in this file.
    let eloResult = null
    try {
      const answered = (questions || [])
        .filter(q => answerByQ.has(q.id))
        .map(q => ({ isCorrect: answerByQ.get(q.id).is_correct, difficulty: q.difficulty }))
      eloResult = await applyPulseCompletionToElo(supabaseAdmin, {
        userId: uid,
        pulseId,
        answered,
        correctCount,
        questionCount: (questions || []).length,
        skillsRefreshed,
        skillsToRevisit,
      })
    } catch (eloErr) {
      // Professional ELO is additive — a failure here must never block the
      // pulse-completion response the user is waiting on.
      console.error("[weeklyPulse:elo]", eloErr.message)
    }

    res.json({
      success: true,
      correct_count: correctCount,
      question_count: (questions || []).length,
      feedback,
      skills_refreshed: skillsRefreshed,
      skills_to_revisit: skillsToRevisit,
      professional_elo: eloResult, // { oldElo, newElo, delta, reason, affectedSkills, nextAction } or null on failure
      // Mentor suggestions intentionally omitted — Career OS Workstream 3
      // audit confirmed no real mentor-matching data exists yet
      // (mentor_profiles/bookings tables don't exist), and the product rule
      // is "mentor suggestions only where real mentor data exists." An
      // absent field here is the honest behavior, not an oversight.
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Anti-cheat event logging (2026-07-26) ────────────────────────────────────
// Realistic scope, stated honestly: a browser app cannot prevent screenshots
// or fully block a determined user from leaving the tab. What this DOES do:
// record real, timestamped suspicious-activity signals server-side
// (tab/window blur, visibility change, copy/paste/context-menu attempts,
// question timeouts) so they're visible in Skill Test History and can factor
// into trust decisions later — never a client-only, discardable log.
const SUSPICIOUS_EVENT_TYPES = new Set([
  "tab_blur", "visibility_hidden", "copy_attempt", "paste_attempt", "cut_attempt", "context_menu", "timeout",
])
const MAX_SUSPICIOUS_EVENTS_PER_PULSE = 200 // bounds row growth against a hostile client hammering this endpoint

router.post("/pro/weekly/:pulseId/flag-suspicious", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { pulseId } = req.params
    const { type } = req.body
    if (!SUSPICIOUS_EVENT_TYPES.has(type)) return res.status(400).json({ error: "Invalid event type" })

    const { data: pulse } = await supabaseAdmin.from("weekly_pulses").select("id,user_id,suspicious_events").eq("id", pulseId).single()
    if (!pulse || pulse.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    const existing = Array.isArray(pulse.suspicious_events) ? pulse.suspicious_events : []
    if (existing.length >= MAX_SUSPICIOUS_EVENTS_PER_PULSE) return res.json({ success: true, throttled: true })

    const updated = [...existing, { type, at: new Date().toISOString() }]
    await supabaseAdmin.from("weekly_pulses").update({ suspicious_events: updated }).eq("id", pulseId)

    res.json({ success: true, count: updated.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Timeout auto-lock: called when the 45s-per-question timer hits zero with no
// answer selected. Records is_correct=false (a real, persisted outcome — not
// just a frontend visual state) and increments timed_out_count, then behaves
// exactly like a submitted wrong answer for confidence-feedback/ELO purposes
// once /complete runs.
router.post("/pro/weekly/:pulseId/timeout", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { pulseId } = req.params
    const { question_id } = req.body
    if (!question_id) return res.status(400).json({ error: "question_id is required" })

    const { data: pulse } = await supabaseAdmin.from("weekly_pulses").select("id,user_id,timed_out_count").eq("id", pulseId).single()
    if (!pulse || pulse.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    const { data: question } = await supabaseAdmin.from("weekly_questions").select("*").eq("id", question_id).eq("pulse_id", pulseId).single()
    if (!question) return res.status(404).json({ error: "Question not found" })

    // Idempotent: if this question already has a real answer row (e.g. a
    // race between a late click and the timer), don't overwrite it with a
    // synthetic timeout one — check first rather than blindly upserting.
    const { data: existingAnswer } = await supabaseAdmin.from("weekly_answers").select("id").eq("user_id", uid).eq("question_id", question_id).maybeSingle()
    if (existingAnswer) return res.json({ success: true, idempotent: true })

    await supabaseAdmin.from("weekly_answers").upsert({
      user_id: uid, question_id, selected_option_id: null, is_correct: false, timed_out: true,
    }, { onConflict: "question_id,user_id" })
    await supabaseAdmin.from("weekly_pulses").update({ timed_out_count: (pulse.timed_out_count || 0) + 1 }).eq("id", pulseId)

    res.json({ success: true, is_correct: false, correct_option_id: question.correct_option_id, explanation: question.explanation, timed_out: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Skill Test History ───────────────────────────────────────────────────────
// Real, backend-persisted history (product rule #6): past pulses with score,
// skill areas touched, ELO delta (joined from professional_elo_events by
// pulse_id, which eloEngine.js already stamps on every pulse-completion
// event), and suspicious-activity flags. No dummy rows — empty array if the
// user has never completed a pulse.
router.get("/pro/weekly/history", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const limit = Math.min(Number(req.query.limit) || 20, 50)

    const { data: pulses, error } = await supabaseAdmin
      .from("weekly_pulses")
      .select("id,status,correct_count,question_count,completed_at,created_at,suspicious_events,timed_out_count")
      .eq("user_id", uid)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(limit)
    if (error) return res.status(500).json({ error: error.message })

    const pulseIds = (pulses || []).map(p => p.id)

    const [{ data: questions }, { data: eloEvents }] = await Promise.all([
      pulseIds.length
        ? supabaseAdmin.from("weekly_questions").select("id,pulse_id,skill_id").in("pulse_id", pulseIds)
        : Promise.resolve({ data: [] }),
      pulseIds.length
        ? supabaseAdmin.from("professional_elo_events").select("pulse_id,delta,reason").eq("user_id", uid).in("pulse_id", pulseIds)
        : Promise.resolve({ data: [] }),
    ])

    const skillIdsByPulse = new Map()
    for (const q of questions || []) {
      if (!q.skill_id) continue
      const arr = skillIdsByPulse.get(q.pulse_id) || new Set()
      arr.add(q.skill_id)
      skillIdsByPulse.set(q.pulse_id, arr)
    }
    const allSkillIds = [...new Set((questions || []).map(q => q.skill_id).filter(Boolean))]
    const { data: skillRows } = allSkillIds.length
      ? await supabaseAdmin.from("user_skills").select("id,name").in("id", allSkillIds)
      : { data: [] }
    const skillNameById = new Map((skillRows || []).map(s => [s.id, s.name]))

    const eloByPulse = new Map((eloEvents || []).map(e => [e.pulse_id, e]))

    const history = (pulses || []).map(p => ({
      pulse_id: p.id,
      completed_at: p.completed_at,
      score: { correct: p.correct_count, total: p.question_count },
      skill_areas: [...(skillIdsByPulse.get(p.id) || [])].map(id => skillNameById.get(id)).filter(Boolean),
      elo_delta: eloByPulse.get(p.id)?.delta ?? null,
      timed_out_count: p.timed_out_count || 0,
      suspicious_events: p.suspicious_events || [],
    }))

    res.json({ history })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Exported for reuse by skillPulseV2.js (Workstream 3) — the v2 flow needs
// to fall back to the exact same v1 generation logic when coverage is
// insufficient, rather than re-implementing a second copy of it.
export { currentWeekOf, dueAtFor, buildPulseForWeek }
export default router
