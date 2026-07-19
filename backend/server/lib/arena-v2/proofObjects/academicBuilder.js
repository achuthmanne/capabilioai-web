/**
 * proofObjects/academicBuilder.js — Education redesign, Phase 1
 * ---------------------------------------------------------------------------
 * Converts a resume-extracted achievement (award/honor/scholarship/hackathon/
 * competition/publication) into a proof_objects row with
 * proof_type='achievement' — per the unification decision, these do NOT get
 * a parallel "education evidence" table; they're evidence, so they live
 * alongside Arena proofs in the same table or the recruiter/portfolio views
 * fragment again exactly like av2_portfolio_artifacts vs proof_objects did
 * before Phase 1A.
 *
 * Visible immediately (publishState='self_selected') — same trust posture
 * as resume-extracted certifications elsewhere in the app: self-claimed,
 * not pipeline-verified, but shown with a badge saying so, not hidden.
 */
const TYPE_LABELS = {
  award: "Award",
  scholarship: "Scholarship",
  honor: "Honor",
  hackathon: "Hackathon",
  competition: "Competition",
  publication: "Publication",
  achievement: "Achievement",
}

/**
 * @param {string} userId
 * @param {{title:string, type:string, date:string}} achievement
 * @returns {object} a row ready for proofObjects/repository.js#insert
 */
export function buildAcademicAchievementProofObject(userId, achievement) {
  const type = TYPE_LABELS[achievement.type] ? achievement.type : "achievement"
  return {
    userId,
    source: "resume_import",
    // Deterministic key (not a random id) so re-uploading the same resume
    // upserts rather than duplicates, same idempotency pattern as the Arena
    // builders' source_ref.
    sourceRef: { table: "resume_achievement", title: achievement.title, type },

    domain: "Academic Achievements",
    skill: null,
    skillsDemonstrated: [],
    challengeType: TYPE_LABELS[type],
    workstation: null,
    role: null,
    industry: null,
    difficulty: null,

    title: achievement.title,
    problemStatement: "",
    finalSubmission: {},
    snapshots: [],
    buildOutput: {},
    aiEvaluation: {},
    validatorResult: {},
    artifacts: [],
    tags: [TYPE_LABELS[type]].filter(Boolean),

    score: null,
    eloDelta: 0,
    timeTakenSecs: null,
    trustLevel: "self-claimed",
    proofType: "achievement",

    publishState: "self_selected",
    isPortfolioVisible: true,
    isRecruiterVisible: true,

    completedAt: achievement.date || new Date().toISOString(),
  }
}
