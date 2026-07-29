/**
 * evidenceBridge.js — writes Skill Studio evidence through the SAME
 * proof_objects table/builder pattern Arena V2 already uses (spec §0/§24).
 * No second evidence table. Reuses arena-v2/proofObjects/repository.js's
 * insert()/updatePublishState() directly rather than re-implementing row
 * shaping — if that shape ever changes, Skill Studio evidence changes with
 * it automatically instead of drifting out of sync.
 *
 * source: 'skill_studio' | 'skill_studio_interview' — added to
 * proof_objects_source_check by 2026-07-29_skill_studio_v2.sql. Every other
 * field matches the exact shape proofObjects/builder.js already produces for
 * Arena, so the Recruiter Evidence read path (§10) needs zero special-casing
 * per source.
 */
import { insert as insertProofObject, updatePublishState } from "../arena-v2/proofObjects/repository.js"

export async function writeModuleEvidence({ userId, moduleId, moduleTitle, skillLabel, domainKey, level, quizScore, passed }) {
  if (!passed) return null // Principle #2: only PASSED assessments produce evidence
  return insertProofObject({
    userId,
    source: "skill_studio",
    sourceRef: { moduleId },
    domain: domainKey || "General",
    skill: skillLabel,
    skillsDemonstrated: [skillLabel],
    challengeType: "skill_studio_module",
    difficulty: level,
    title: `${moduleTitle || skillLabel} — Skill Studio Module`,
    problemStatement: `Completed adaptive module + quiz on ${skillLabel} (${level}).`,
    finalSubmission: {},
    aiEvaluation: { quizScore },
    validatorResult: {},
    tags: [domainKey, skillLabel, level].filter(Boolean),
    score: quizScore,
    trustLevel: "self-claimed", // scaffolded/hinted practice, not adversarial — never auto-elevated
    proofType: "achievement",
    publishState: "not_published", // learner must explicitly self-publish, never auto-visible
    isPortfolioVisible: false,
    isRecruiterVisible: false,
    completedAt: new Date().toISOString(),
  })
}

export async function writeInterviewEvidence({ userId, interviewSessionId, moduleTitle, skillLabel, domainKey, mode, scores }) {
  return insertProofObject({
    userId,
    source: "skill_studio_interview",
    sourceRef: { interviewSessionId },
    domain: domainKey || "General",
    skill: skillLabel,
    skillsDemonstrated: [skillLabel],
    challengeType: `interview_${mode}`,
    title: `${moduleTitle || skillLabel} — Mock Interview`,
    problemStatement: `Completed a ${mode} mock interview grounded in ${skillLabel}.`,
    aiEvaluation: scores || {},
    tags: [domainKey, skillLabel, "interview"].filter(Boolean),
    trustLevel: "self-claimed",
    proofType: "achievement",
    publishState: "not_published",
    isPortfolioVisible: false,
    isRecruiterVisible: false,
    completedAt: new Date().toISOString(),
  })
}

/** Learner opt-in publish — flips visibility flags via the existing,
 *  already-tested updatePublishState() (same function the Arena portfolio
 *  self-publish route uses). */
export async function publishEvidence(proofObjectId, publish) {
  return updatePublishState(proofObjectId, publish ? "self_selected" : "not_published")
}
