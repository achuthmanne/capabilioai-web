/**
 * selection.js — Career OS Workstream 3, Part C: deterministic Weekly Skill
 * Pulse V2 question selection.
 *
 * Pure, dependency-free, seeded — same inputs + same seed always produce the
 * same 15 questions (required for testability with a fixed seed/clock; also
 * makes production behavior auditable/reproducible for a given user+week).
 *
 * Hard safety rule (defense in depth — the caller's DB query MUST already
 * filter to review_status='approved', but this module refuses to trust that
 * blindly): any candidate question missing an explicit `review_status:
 * 'approved'` is dropped before selection even considers it. This is the
 * second of two layers preventing an unreviewed/AI-generated-but-unapproved
 * question from ever reaching a user.
 */

const DEFAULT_COUNT = 15
const DEFAULT_MAX_PER_SKILL = 3
const EASY_MAX = 2      // difficulty 1-2 = "easy"
const HARD_MIN = 4      // difficulty 4-5 = "hard"
const MIN_EASY_IN_SET = 2
const MIN_HARD_IN_SET = 2

// ── seeded PRNG (mulberry32, seeded from an FNV-1a hash of a string) ────────
// No external dependency, deterministic across Node versions/platforms.
function fnv1aHash(str) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRandom(seedString) {
  return mulberry32(fnv1aHash(String(seedString)))
}

function isHard(difficulty) { return difficulty >= HARD_MIN }
function isEasy(difficulty) { return difficulty <= EASY_MAX }

/**
 * Weighted sample without replacement using a seeded RNG — deterministic
 * given the same pool order, weights, and rng sequence.
 */
function weightedSampleWithoutReplacement(items, weightFn, count, rng) {
  const pool = items.map((item, i) => ({ item, weight: Math.max(0.0001, weightFn(item)), i }))
  const picked = []
  while (picked.length < count && pool.length) {
    const total = pool.reduce((s, p) => s + p.weight, 0)
    let r = rng() * total
    let idx = pool.length - 1
    for (let k = 0; k < pool.length; k++) {
      r -= pool[k].weight
      if (r <= 0) { idx = k; break }
    }
    picked.push(pool[idx].item)
    pool.splice(idx, 1)
  }
  return picked
}

function skillTagsOf(question) {
  return (question.skill_tags || []).map(t => String(t).toLowerCase())
}

/**
 * @param {object} params
 * @param {Array} params.approvedQuestions — candidate pool; each item should
 *   look like a question_bank row (id, domain, skill_tags[], difficulty 1-5,
 *   review_status, question_type, ...). Non-'approved' rows are dropped.
 * @param {Array<{id,name,slug,level_score,verified,decayState}>} params.userSkills
 * @param {string[]} [params.targetRoleGapSkillSlugs] — slugs/names considered
 *   gaps against the user's target role (weighted higher).
 * @param {Set<string>} [params.seenQuestionIds] — question ids served to this
 *   user in the prior 8 weeks; excluded entirely.
 * @param {{ accuracyLastPulse?: number }} [params.priorPerformance] — 0..1
 *   accuracy from the user's most recent completed pulse, used to bias
 *   difficulty selection (higher accuracy -> lean harder, never exclusively).
 * @param {string} params.seed — deterministic seed, e.g. `${userId}:${weekOf}`.
 * @param {number} [params.count=15]
 * @param {number} [params.maxPerSkill=3]
 * @returns {{questions: Array, insufficient: boolean, meta: object}}
 */
export function selectPulseQuestions({
  approvedQuestions,
  userSkills = [],
  targetRoleGapSkillSlugs = [],
  seenQuestionIds = new Set(),
  priorPerformance = {},
  seed,
  count = DEFAULT_COUNT,
  maxPerSkill = DEFAULT_MAX_PER_SKILL,
}) {
  if (!seed) throw new Error("selectPulseQuestions: seed is required for deterministic selection")

  // Defense-in-depth: only ever consider explicitly approved rows, and never
  // a retired one, regardless of what the caller's query already filtered.
  const approvedOnly = (approvedQuestions || []).filter(q => q?.review_status === "approved" && !q.retired_at)

  // Exclude anything this user saw in the last 8 weeks.
  const notRecentlySeen = approvedOnly.filter(q => !seenQuestionIds.has(q.id))

  const gapSlugs = new Set((targetRoleGapSkillSlugs || []).map(s => String(s).toLowerCase()))
  const skillWeightBySlug = new Map()
  for (const s of userSkills) {
    const slug = String(s.slug || s.name || "").toLowerCase()
    if (!slug) continue
    let weight = 1
    const decay = s.decayState || s.decay_state
    if (decay === "at_risk") weight += 3
    if (decay === "decayed") weight += 4
    if (decay === "aging") weight += 1
    if (gapSlugs.has(slug)) weight += 3
    if (s.verified === false) weight += 1
    skillWeightBySlug.set(slug, weight)
  }

  function questionWeight(q) {
    const tags = skillTagsOf(q)
    if (!tags.length) return 1
    const w = tags.reduce((sum, t) => sum + (skillWeightBySlug.get(t) || 0.5), 0)
    return w / tags.length
  }

  // Adaptive difficulty bias: prior accuracy nudges the weighting toward
  // harder (high accuracy) or easier (low accuracy) questions, but the
  // hard floor constraints below (min 2 easy, min 2 hard) always apply
  // regardless of this bias — "never all-hard or all-easy" is absolute.
  const accuracy = typeof priorPerformance.accuracyLastPulse === "number"
    ? Math.max(0, Math.min(1, priorPerformance.accuracyLastPulse))
    : 0.5
  function difficultyBias(q) {
    // accuracy 1.0 -> favor difficulty 5; accuracy 0.0 -> favor difficulty 1
    const target = 1 + accuracy * 4
    const distance = Math.abs((q.difficulty || 3) - target)
    return Math.max(0.2, 1.5 - distance * 0.25)
  }

  const rng = seededRandom(seed)

  // Selection loop respecting max-per-skill, drawing from the weighted pool.
  const chosen = []
  const perSkillCount = new Map()
  const candidatePool = [...notRecentlySeen]

  function eligible(q) {
    const tags = skillTagsOf(q)
    if (!tags.length) return true
    return tags.every(t => (perSkillCount.get(t) || 0) < maxPerSkill)
  }

  while (chosen.length < count) {
    const pool = candidatePool.filter(q => !chosen.includes(q) && eligible(q))
    if (!pool.length) break
    const [pick] = weightedSampleWithoutReplacement(
      pool, q => questionWeight(q) * difficultyBias(q), 1, rng
    )
    chosen.push(pick)
    for (const t of skillTagsOf(pick)) {
      perSkillCount.set(t, (perSkillCount.get(t) || 0) + 1)
    }
  }

  // Enforce the difficulty floor: never an all-hard or all-easy set. If the
  // weighted draw above didn't naturally produce at least 2 easy and 2 hard,
  // swap in the least-necessary picks for easy/hard alternatives still
  // respecting the max-per-skill cap, when the pool allows it.
  function swapForFloor(predicate, minCount) {
    let have = chosen.filter(q => predicate(q.difficulty)).length
    if (have >= minCount) return
    const remaining = candidatePool.filter(q => predicate(q.difficulty) && !chosen.includes(q))
    // Try to replace picks that don't help either floor, least-weighted first.
    const replaceable = [...chosen]
      .filter(q => !predicate(q.difficulty))
      .sort((a, b) => questionWeight(a) - questionWeight(b))

    for (const candidate of remaining) {
      if (have >= minCount) break
      // find a replaceable slot whose removal keeps per-skill counts valid
      const slot = replaceable.find(r => {
        const rTags = skillTagsOf(r)
        const cTags = skillTagsOf(candidate)
        // Simulate removal of r and addition of candidate for per-skill caps
        const counts = new Map(perSkillCount)
        for (const t of rTags) counts.set(t, (counts.get(t) || 0) - 1)
        return cTags.every(t => (counts.get(t) || 0) < maxPerSkill)
      })
      if (!slot) continue
      const idx = chosen.indexOf(slot)
      if (idx === -1) continue
      for (const t of skillTagsOf(slot)) perSkillCount.set(t, (perSkillCount.get(t) || 0) - 1)
      chosen[idx] = candidate
      for (const t of skillTagsOf(candidate)) perSkillCount.set(t, (perSkillCount.get(t) || 0) + 1)
      replaceable.splice(replaceable.indexOf(slot), 1)
      have++
    }
  }

  swapForFloor(isEasy, MIN_EASY_IN_SET)
  swapForFloor(isHard, MIN_HARD_IN_SET)

  const insufficient = chosen.length < count

  const difficultyDistribution = chosen.reduce((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] || 0) + 1
    return acc
  }, {})

  return {
    questions: chosen,
    insufficient,
    meta: {
      requested: count,
      selected: chosen.length,
      difficultyDistribution,
      easyCount: chosen.filter(q => isEasy(q.difficulty)).length,
      hardCount: chosen.filter(q => isHard(q.difficulty)).length,
      skillsCovered: [...new Set(chosen.flatMap(skillTagsOf))],
      seed,
    },
  }
}
