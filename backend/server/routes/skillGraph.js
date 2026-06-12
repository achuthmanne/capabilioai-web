/**
 * Skill Graph Routes
 * GET  /api/pro/skills          — user's full skill graph
 * POST /api/pro/skills          — add / update skill
 * POST /api/pro/skills/bulk     — bulk upsert from resume parse
 * PUT  /api/pro/skills/:id      — update single skill
 * DELETE /api/pro/skills/:id    — remove skill
 * POST /api/pro/skills/:id/proof — submit proof for a skill
 * GET  /api/pro/skills/gaps     — compute skill gaps vs target role
 */
import { Router } from "express"
import { supabaseAdmin }  from "../lib/supabase.js"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

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

// ── GET skills ────────────────────────────────────────────────────────────────
router.get("/pro/skills", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("skill_graph")
      .select("*")
      .eq("user_id", req.user.id)
      .order("elo_value", { ascending: false })
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

    const { data, error } = await supabaseAdmin
      .from("skill_graph")
      .upsert({
        user_id:            uid,
        skill_name:         body.skill_name,
        skill_slug:         slug,
        category:           body.category || "technical",
        domain:             body.domain || null,
        icon_url:           meta.icon_url,
        color:              meta.color,
        verification_state: body.verification_state || "user_added",
        confidence_score:   body.confidence_score || 60,
        elo_value:          body.elo_value || 500,
        years_used:         body.years_used || null,
        is_current:         body.is_current !== undefined ? body.is_current : true,
        is_target:          body.is_target || false,
        companies_used:     body.companies_used || [],
        updated_at:         new Date().toISOString(),
      }, { onConflict: "user_id,skill_slug" })
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

    const rows = skills.map(s => {
      const name = typeof s === "string" ? s : s.skill_name || s.name || ""
      if (!name) return null
      const slug = makeSlug(name)
      const meta = enrichSkill(name)
      return {
        user_id:            uid,
        skill_name:         name,
        skill_slug:         slug,
        icon_url:           meta.icon_url,
        color:              meta.color,
        verification_state: source === "resume" ? "inferred" : "user_added",
        confidence_score:   source === "resume" ? 50 : 70,
        elo_value:          500,
        is_current:         true,
        updated_at:         new Date().toISOString(),
      }
    }).filter(Boolean)

    const { data, error } = await supabaseAdmin
      .from("skill_graph")
      .upsert(rows, { onConflict: "user_id,skill_slug", ignoreDuplicates: false })
      .select()

    if (error) throw error

    // Also update the profiles.skill_graph JSONB for backward compat
    await supabaseAdmin.from("profiles").update({
      skill_graph: data.map(s => ({ name: s.skill_name, icon: s.icon_url, color: s.color, elo: s.elo_value }))
    }).eq("id", uid)

    res.json({ success: true, count: data.length, skills: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Update single skill ───────────────────────────────────────────────────────
router.put("/pro/skills/:id", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from("skill_graph").select("user_id").eq("id", req.params.id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin
      .from("skill_graph")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, skill: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pro/skills/:id", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from("skill_graph").select("user_id").eq("id", req.params.id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("skill_graph").delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Submit proof for skill ────────────────────────────────────────────────────
router.post("/pro/skills/:id/proof", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { proof_url, proof_type, notes } = req.body

    const { data: existing } = await supabaseAdmin
      .from("skill_graph").select("*").eq("id", id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const artifacts = existing.proof_artifacts || []
    artifacts.push({ type: proof_type, url: proof_url, notes, submitted_at: new Date().toISOString() })

    const newConfidence = Math.min(100, (existing.confidence_score || 50) + 20)
    const newElo        = Math.min(1400, (existing.elo_value || 500) + 100)

    const { data, error } = await supabaseAdmin.from("skill_graph").update({
      proof_artifacts:    artifacts,
      verification_state: "proof_submitted",
      confidence_score:   newConfidence,
      elo_value:          newElo,
      last_proof_date:    new Date().toISOString().split("T")[0],
      proof_source:       proof_type,
      updated_at:         new Date().toISOString(),
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
      supabaseAdmin.from("skill_graph").select("skill_name,elo_value,verification_state").eq("user_id", uid),
      supabaseAdmin.from("profiles").select("target_role,keyword,experiences").eq("id", uid).single(),
    ])

    const role = target_role || profile?.target_role || profile?.keyword || "Software Engineer"
    const mySkillNames = (userSkills || []).map(s => s.skill_name.toLowerCase())

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
      .from("skill_graph").select("id,skill_name").eq("user_id", req.user.id)
    if (!skills?.length) return res.json({ updated: 0 })

    let updated = 0
    for (const s of skills) {
      const meta = enrichSkill(s.skill_name)
      if (meta.icon_url) {
        await supabaseAdmin.from("skill_graph")
          .update({ icon_url: meta.icon_url, color: meta.color }).eq("id", s.id)
        updated++
      }
    }
    res.json({ updated })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export { TECH_META, enrichSkill, makeSlug }
export default router
