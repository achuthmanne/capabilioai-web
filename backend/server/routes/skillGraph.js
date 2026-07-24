/**
 * Skill Graph Routes
 * GET  /api/pro/skills          — user's full skill graph
 * POST /api/pro/skills          — add / update skill
 * POST /api/pro/skills/bulk     — bulk upsert from resume parse
 * PUT  /api/pro/skills/:id      — update single skill
 * DELETE /api/pro/skills/:id    — remove skill
 * POST /api/pro/skills/:id/proof — submit proof for a skill
 * GET  /api/pro/skills/gaps     — compute skill gaps vs target role
 *
 * RETARGETED (see PROFESSIONAL_PATH_ARCHITECTURE.md §"schema fork"): this
 * previously queried a "skill_graph" table that was never migrated anywhere in
 * the repo — every route here would have thrown "relation does not exist" the
 * moment it was called. There's a real, RLS-protected table that already covers
 * this — user_skills — so these routes now target that instead of creating a
 * second parallel schema. Field mapping vs. the old (never-real) shape:
 *   skill_name        -> name
 *   skill_slug         -> slug
 *   category           -> group_type (core/domain/proof/tool_stack/growth/verified_strength/career_signal)
 *   confidence_score   -> confidence, rescaled 0-100 -> 0-1 (user_skills' real check constraint)
 *   elo_value          -> level_score (0-100, real column) — "ELO" language dropped, level_score is the
 *                         real analogous field on this table and doesn't share ELO's 0-2000+ semantics
 *   verification_state -> verified (boolean) + source (constrained enum, extended additively with
 *                         'resume_derived' via migration retarget_skills_onto_user_skills)
 *   years_used, companies_used, is_current, proof_artifacts, icon_url, color -> added as nullable
 *   columns on user_skills by the same migration (additive, doesn't touch existing rows/callers)
 */
import { Router } from "express"
import { supabaseAdmin }  from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()

const TABLE = "user_skills"

// ── Technology icon / color map ───────────────────────────────────────────────
const TECH_META = {
  // Languages
  "javascript": { color: "#F7DF1E", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" },
  "typescript": { color: "#3178C6", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
  "python":     { color: "#3776AB", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  "java":       { color: "#007396", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg" },
  "go":         { color: "#00ADD8", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/go/go-original.svg" },
  "rust":       { color: "#CE422B", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/rust/rust-plain.svg" },
  "c#":         { color: "#239120", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg" },
  "c++":        { color: "#00599C", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg" },
  "ruby":       { color: "#CC342D", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ruby/ruby-original.svg" },
  "php":        { color: "#777BB4", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/php/php-original.svg" },
  "swift":      { color: "#FA7343", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swift/swift-original.svg" },
  "kotlin":     { color: "#7F52FF", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg" },
  "scala":      { color: "#DC322F", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/scala/scala-original.svg" },
  // Frontend frameworks
  "react":      { color: "#61DAFB", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  "vue":        { color: "#4FC08D", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg" },
  "angular":    { color: "#DD0031", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg" },
  "svelte":     { color: "#FF3E00", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/svelte/svelte-original.svg" },
  "next.js":    { color: "#000000", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg" },
  "nuxt":       { color: "#00DC82", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nuxtjs/nuxtjs-original.svg" },
  // Backend
  "node.js":    { color: "#339933", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" },
  "express":    { color: "#000000", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" },
  "django":     { color: "#092E20", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg" },
  "fastapi":    { color: "#009688", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg" },
  "spring":     { color: "#6DB33F", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg" },
  // Databases
  "postgresql": { color: "#4169E1", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" },
  "mysql":      { color: "#4479A1", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg" },
  "mongodb":    { color: "#47A248", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg" },
  "redis":      { color: "#DC382D", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg" },
  "elasticsearch": { color: "#005571", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/elasticsearch/elasticsearch-original.svg" },
  "sqlite":     { color: "#003B57", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sqlite/sqlite-original.svg" },
  // Cloud
  "aws":        { color: "#FF9900", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original.svg" },
  "gcp":        { color: "#4285F4", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" },
  "azure":      { color: "#0078D4", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" },
  // DevOps
  "docker":     { color: "#2496ED", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
  "kubernetes": { color: "#326CE5", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg" },
  "terraform":  { color: "#7B42BC", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg" },
  "jenkins":    { color: "#D33833", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/jenkins/jenkins-original.svg" },
  "github":     { color: "#181717", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
  "gitlab":     { color: "#FC6D26", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/gitlab/gitlab-original.svg" },
  "ansible":    { color: "#EE0000", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/ansible/ansible-original.svg" },
  // Data / ML
  "tensorflow": { color: "#FF6F00", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
  "pytorch":    { color: "#EE4C2C", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pytorch/pytorch-original.svg" },
  "pandas":     { color: "#150458", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/pandas/pandas-original.svg" },
  "numpy":      { color: "#013243", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/numpy/numpy-original.svg" },
  "spark":      { color: "#E25A1C", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apachespark/apachespark-original.svg" },
  // Tools
  "graphql":    { color: "#E10098", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/graphql/graphql-plain.svg" },
  "kafka":      { color: "#231F20", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/apachekafka/apachekafka-original.svg" },
  "nginx":      { color: "#009639", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nginx/nginx-original.svg" },
  "linux":      { color: "#FCC624", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linux/linux-original.svg" },
  "git":        { color: "#F05032", icon: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" },
  // Generic
  "sql":        { color: "#4479A1", icon: null, fallbackIcon: "🗄️" },
  "rest api":   { color: "#6D28D9", icon: null, fallbackIcon: "🔌" },
  "microservices": { color: "#0EA5E9", icon: null, fallbackIcon: "⚙️" },
  "ci/cd":      { color: "#10B981", icon: null, fallbackIcon: "🔄" },
  "agile":      { color: "#F59E0B", icon: null, fallbackIcon: "📋" },
  "system design": { color: "#8B5CF6", icon: null, fallbackIcon: "🏗️" },
}

const GROUP_TYPES = ["core", "domain", "proof", "tool_stack", "growth", "verified_strength", "career_signal"]
const LEVELS = ["learning", "beginner", "developing", "proficient", "advanced", "expert"]

function enrichSkill(name) {
  const slug = name.toLowerCase().trim()
  const meta = TECH_META[slug] || TECH_META[slug.replace(/\.js$/, "")] || {}
  return {
    icon_url: meta.icon || null,
    color:    meta.color || "#6B7280",
    fallback_icon: meta.fallbackIcon || null,
  }
}

function makeSlug(name) {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

// level_score (0-100) -> the closest textual level bucket, since `level` is a
// separate, check-constrained column on user_skills (not derived automatically).
function levelFromScore(score) {
  if (score >= 90) return "expert"
  if (score >= 75) return "advanced"
  if (score >= 55) return "proficient"
  if (score >= 35) return "developing"
  if (score >= 15) return "beginner"
  return "learning"
}

function safeGroupType(v) { return GROUP_TYPES.includes(v) ? v : "core" }

// ── GET skills ────────────────────────────────────────────────────────────────
router.get("/pro/skills", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("level_score", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Add / update skill ────────────────────────────────────────────────────────
router.post("/pro/skills", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const body = req.body
    if (!body.skill_name) return res.status(400).json({ error: "skill_name required" })

    const slug = makeSlug(body.skill_name)
    const meta = enrichSkill(body.skill_name)
    const levelScore = body.confidence_score != null ? Math.max(0, Math.min(100, Math.round(body.confidence_score))) : 60

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert({
        user_id:          uid,
        name:             body.skill_name,
        slug,
        group_type:       safeGroupType(body.category),
        domain:           body.domain || null,
        icon_url:         meta.icon_url,
        color:            meta.color,
        level:            levelFromScore(levelScore),
        level_score:      levelScore,
        confidence:       levelScore / 100,
        verified:         body.verification_state === "proof_submitted",
        source:           body.source || "manual",
        years_used:       body.years_used || null,
        is_current:       body.is_current !== undefined ? body.is_current : true,
        companies_used:   body.companies_used || [],
        updated_at:       new Date().toISOString(),
      }, { onConflict: "user_id,slug" })
      .select()
      .single()

    if (error) throw error
    res.json({ success: true, skill: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Bulk upsert from resume parse ─────────────────────────────────────────────
router.post("/pro/skills/bulk", requireAuth, async (req, res) => {
  try {
    const uid        = req.user.id
    const { skills, source = "resume" } = req.body
    if (!Array.isArray(skills) || !skills.length)
      return res.status(400).json({ error: "skills array required" })

    const isResume = source === "resume"
    const rows = skills.map(s => {
      const name = typeof s === "string" ? s : s.skill_name || s.name || ""
      if (!name) return null
      const slug = makeSlug(name)
      const meta = enrichSkill(name)
      const levelScore = isResume ? 50 : 70
      return {
        user_id:      uid,
        name,
        slug,
        group_type:   "core",
        icon_url:     meta.icon_url,
        color:        meta.color,
        level:        levelFromScore(levelScore),
        level_score:  levelScore,
        confidence:   levelScore / 100,
        verified:     false,
        source:       isResume ? "resume_derived" : "manual",
        is_current:   true,
        updated_at:   new Date().toISOString(),
      }
    }).filter(Boolean)

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .upsert(rows, { onConflict: "user_id,slug", ignoreDuplicates: false })
      .select()

    if (error) throw error

    // Also update the profiles.skill_graph JSONB for backward compat with
    // whatever frontend still reads that blob directly.
    await supabaseAdmin.from("profiles").update({
      skill_graph: data.map(s => ({ name: s.name, icon: s.icon_url, color: s.color, elo: s.level_score }))
    }).eq("id", uid)

    res.json({ success: true, count: data.length, skills: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Update single skill ───────────────────────────────────────────────────────
router.put("/pro/skills/:id", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from(TABLE).select("user_id").eq("id", req.params.id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const patch = { ...req.body, updated_at: new Date().toISOString() }
    if (patch.category) { patch.group_type = safeGroupType(patch.category); delete patch.category }
    if (patch.confidence_score != null) {
      const ls = Math.max(0, Math.min(100, Math.round(patch.confidence_score)))
      patch.level_score = ls
      patch.confidence  = ls / 100
      patch.level       = levelFromScore(ls)
      delete patch.confidence_score
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(patch)
      .eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, skill: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pro/skills/:id", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from(TABLE).select("user_id").eq("id", req.params.id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from(TABLE).delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Submit proof for skill ────────────────────────────────────────────────────
router.post("/pro/skills/:id/proof", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { proof_url, proof_type, notes } = req.body

    const { data: existing } = await supabaseAdmin
      .from(TABLE).select("*").eq("id", id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const artifacts = existing.proof_artifacts || []
    artifacts.push({ type: proof_type, url: proof_url, notes, submitted_at: new Date().toISOString() })

    const newLevelScore = Math.min(100, (existing.level_score || 50) + 20)

    const { data, error } = await supabaseAdmin.from(TABLE).update({
      proof_artifacts: artifacts,
      verified:        true,
      source:          "proof_derived",
      level:           levelFromScore(newLevelScore),
      level_score:      newLevelScore,
      confidence:      newLevelScore / 100,
      proof_count:     (existing.proof_count || 0) + 1,
      updated_at:      new Date().toISOString(),
    }).eq("id", id).select().single()
    if (error) throw error
    res.json({ success: true, skill: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Skill gaps vs target role ─────────────────────────────────────────────────
router.get("/pro/skills/gaps", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { target_role } = req.query

    const [{ data: userSkills }, { data: profile }] = await Promise.all([
      supabaseAdmin.from(TABLE).select("name,level_score,verified").eq("user_id", uid),
      supabaseAdmin.from("profiles").select("target_role,keyword,experiences").eq("id", uid).single(),
    ])

    // Fall back to the most recent experience's title before giving up to the
    // generic "Professional" — covers users who uploaded a resume before
    // target_role auto-derivation existed (2026-07-24) and haven't re-uploaded
    // since, so their experiences[] already has a real title sitting unused.
    const exps = Array.isArray(profile?.experiences) ? profile.experiences : []
    const currentExp = exps.find(e => e?.isCurrent || e?.current) || exps[0]
    const role = target_role || profile?.target_role || profile?.keyword
      || currentExp?.role || currentExp?.title || "Professional"
    const mySkillNames = (userSkills || []).map(s => s.name.toLowerCase())

    // Use AI to compute gaps
    const prompt = `Given target role: "${role}"
My current skills: ${mySkillNames.slice(0, 30).join(", ")}

Return JSON:
{
  "missing_critical": ["skill1", "skill2"],
  "missing_nice_to_have": ["skill3"],
  "strong_match": ["skill4", "skill5"],
  "gap_score": 0-100,
  "match_score": 0-100,
  "top_recommendation": "One sentence action"
}
Return only valid JSON.`

    let gaps = {}
    try {
      const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 500, json: true })
      gaps = JSON.parse(raw)
    } catch { gaps = { missing_critical: [], missing_nice_to_have: [], strong_match: mySkillNames.slice(0, 5), gap_score: 30, match_score: 70 } }

    res.json({ role, user_skills: userSkills || [], gaps })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Enrichment: add icons to existing skills ─────────────────────────────────
router.post("/pro/skills/enrich-icons", requireAuth, async (req, res) => {
  try {
    const { data: skills } = await supabaseAdmin
      .from(TABLE).select("id,name").eq("user_id", req.user.id)
    if (!skills?.length) return res.json({ updated: 0 })

    let updated = 0
    for (const s of skills) {
      const meta = enrichSkill(s.name)
      if (meta.icon_url) {
        await supabaseAdmin.from(TABLE)
          .update({ icon_url: meta.icon_url, color: meta.color }).eq("id", s.id)
        updated++
      }
    }
    res.json({ updated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export { TECH_META, enrichSkill, makeSlug }
export default router
