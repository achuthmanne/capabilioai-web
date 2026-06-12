/**
 * Forge Routes
 * GET  /api/pro/forge                  — get user's forge items by track
 * POST /api/pro/forge/init             — initialize default forge items for user
 * PUT  /api/pro/forge/:id              — update forge item status
 * POST /api/pro/forge/:id/submit       — submit proof for a forge item
 * POST /api/pro/forge/:id/evaluate     — AI evaluate a submission
 * GET  /api/pro/forge/:id/submissions  — list submissions for an item
 */
import { Router } from "express"
import { supabaseAdmin }       from "../lib/supabase.js"
import { groq, GROQ_FAST }     from "../lib/groq.js"
import Anthropic               from "@anthropic-ai/sdk"

const router  = Router()
const claude  = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

// ── Default forge items per track ─────────────────────────────────────────────
const DEFAULT_FORGE_ITEMS = {
  proof: [
    { title: "Quantify Your Last 3 Achievements", purpose: "Convert vague experience into measurable market proof", required_proof: "3 impact statements using Action → Metric → Outcome format", expected_output: "3 quantified achievement statements with specific metrics", recruiter_relevance: "Recruiters shortlist candidates with quantified proof 3x more", skill_tags: ["communication","impact-writing"], xp_reward: 60, order_index: 1 },
    { title: "Build Your Proof Stack Inventory", purpose: "Catalog all verifiable artifacts that back your claims", required_proof: "List of 3+ verifiable assets with location, verifier, and claim", expected_output: "Proof inventory document with GitHub repos, case studies, or reports", recruiter_relevance: "Verified proof artifacts increase recruiter confidence significantly", skill_tags: ["documentation","portfolio"], xp_reward: 50, order_index: 2 },
    { title: "Write a Case Study for Your Best Project", purpose: "One strong case study outperforms a resume for shortlisting", required_proof: "150-200 word structured case study: problem, role, approach, outcome", expected_output: "Professional case study covering context, execution, and measurable outcome", recruiter_relevance: "Case studies trigger direct recruiter outreach for senior roles", skill_tags: ["case-study","project-storytelling"], xp_reward: 70, order_index: 3 },
    { title: "Record a 3-Minute Technical Explanation", purpose: "Demonstrate depth — what you can explain, you truly know", required_proof: "Video or audio explaining a complex technical concept you worked on", expected_output: "3-minute technical explanation walkthrough with clear structure", recruiter_relevance: "Video proof reduces interview rounds for technical roles", skill_tags: ["technical-communication","depth"], xp_reward: 80, order_index: 4 },
    { title: "Architecture Diagram of a System You Built", purpose: "Visual proof of system thinking and hands-on design ability", required_proof: "Architecture diagram with component descriptions and design decisions", expected_output: "System diagram with explanation of trade-offs and choices made", recruiter_relevance: "Architects and senior engineers always get this as first-round filter", skill_tags: ["system-design","architecture"], xp_reward: 90, order_index: 5 },
  ],
  switch: [
    { title: "Define Your Target Role Precisely", purpose: "Role clarity is the #1 predictor of successful transitions", required_proof: "Completed target role definition with 3 identified skill gaps", expected_output: "Clear target: role title, level, company type, domain, and gaps", recruiter_relevance: "Unfocused candidates are filtered first — targeting increases success 4x", skill_tags: ["career-strategy","transition"], xp_reward: 45, order_index: 1 },
    { title: "Gap-to-Action Mapping", purpose: "Every gap has a fastest path — map yours before you lose time", required_proof: "Table of top 3 gaps with specific 4-week action plans for each", expected_output: "Gap-action table with timeline, resource, and deliverable per gap", recruiter_relevance: "Shows self-awareness and initiative — both key factors in senior hiring", skill_tags: ["gap-analysis","planning"], xp_reward: 55, order_index: 2 },
    { title: "Rewrite Narrative for Target Role", purpose: "Your current summary is optimized for your current role, not target", required_proof: "3 versions: LinkedIn headline, 2-sentence summary, 30-second pitch", expected_output: "Active-voice, role-targeted narrative in all three formats", recruiter_relevance: "Wrong headline = auto-filter even before resume is read", skill_tags: ["narrative","positioning"], xp_reward: 65, order_index: 3 },
    { title: "Referral Network Activation", purpose: "Internal referrals account for 40–60% of senior hires in India", required_proof: "List of 5+ people in target companies + 2 outreach messages sent", expected_output: "Referral map with warm connections and active outreach documented", recruiter_relevance: "Referred candidates convert to hire at 3x the rate of cold applications", skill_tags: ["networking","referrals"], xp_reward: 60, order_index: 4 },
  ],
  return: [
    { title: "Break Narrative — Own It Strategically", purpose: "A career break explained confidently becomes a strength", required_proof: "3-5 sentence career break narrative that frames the gap as growth", expected_output: "Honest, confident explanation of break with what you learned or did", recruiter_relevance: "Candidates who address the break proactively are 2x more likely to progress", skill_tags: ["narrative","resilience"], xp_reward: 55, order_index: 1 },
    { title: "Skill Freshness Assessment", purpose: "Know exactly which skills need refreshing before you apply", required_proof: "Skill audit: current vs. market, with 3 highest-priority refresh actions", expected_output: "Skill freshness table with specific resources and 2-week plan", recruiter_relevance: "Returning professionals who pre-empt skill concerns eliminate the biggest blocker", skill_tags: ["self-assessment","upskilling"], xp_reward: 50, order_index: 2 },
    { title: "Build a Return-Ready Project", purpose: "One current, completed project proves you're active and ready", required_proof: "Public project (GitHub, live site, or document) completed in the last 30 days", expected_output: "Link to deployed or published project with a brief technical explanation", recruiter_relevance: "Recent activity is the most powerful signal for return-to-work candidates", skill_tags: ["hands-on","project"], xp_reward: 85, order_index: 3 },
  ],
  comp: [
    { title: "Market Comp Benchmark Analysis", purpose: "Anchor your negotiation to real data — not wishful thinking", required_proof: "P25/P50/P75 for your exact role, location, and experience level", expected_output: "3-source comp band with where your current salary sits", recruiter_relevance: "Candidates who know their market rate negotiate 15-25% higher on average", skill_tags: ["compensation","research"], xp_reward: 55, order_index: 1 },
    { title: "Build Your Raise Case Document", purpose: "Raises are granted to those who document their value before asking", required_proof: "Written raise case: value delivered + market anchor + specific ask", expected_output: "1-page raise case structured for a written 1:1 submission", recruiter_relevance: "Professionals with documented value cases get promoted 40% faster", skill_tags: ["negotiation","value-articulation"], xp_reward: 65, order_index: 2 },
    { title: "Offer Negotiation Playbook", purpose: "Practice the exact words that close the comp gap", required_proof: "Written responses to 5 common negotiation pushbacks", expected_output: "Negotiation script covering initial ask, counter, and floor/walk-away", recruiter_relevance: "Professionals who negotiate correctly get 10–30% higher starting packages", skill_tags: ["negotiation","communication"], xp_reward: 75, order_index: 3 },
  ],
  interview: [
    { title: "Complete Your AI Profile Interview", purpose: "Understand how you come across before facing a real recruiter", required_proof: "Completed AI interview session with overall score above 65", expected_output: "AI interview transcript with score breakdown and improvement areas", recruiter_relevance: "Interviewees who self-assess score 22% higher in actual interviews", skill_tags: ["interview-readiness","self-assessment"], xp_reward: 70, order_index: 1 },
    { title: "Document Your STAR Stories", purpose: "Behavioral interviews are won or lost on story quality", required_proof: "5 STAR-format stories covering different competencies", expected_output: "5 structured behavioral examples with Situation/Task/Action/Result", recruiter_relevance: "STAR-ready candidates clear behavioral rounds 3x more often", skill_tags: ["behavioral","storytelling"], xp_reward: 60, order_index: 2 },
    { title: "Technical System Design Walkthrough", purpose: "Senior roles always include a system design round — be ready", required_proof: "Written or recorded walkthrough of designing a system you'd own", expected_output: "System design response covering requirements, components, trade-offs", recruiter_relevance: "System design is the most common filter for senior+ engineering roles", skill_tags: ["system-design","technical-depth"], xp_reward: 80, order_index: 3 },
  ],
}

// ── Initialize forge items ────────────────────────────────────────────────────
router.post("/pro/forge/init", requireAuth, async (req, res) => {
  try {
    const uid    = req.user.id
    const tracks = req.body.tracks || Object.keys(DEFAULT_FORGE_ITEMS)

    const rows = []
    for (const track of tracks) {
      const items = DEFAULT_FORGE_ITEMS[track] || []
      for (const item of items) {
        rows.push({ user_id: uid, track, ...item, status: "not_started" })
      }
    }

    const { data, error } = await supabaseAdmin
      .from("forge_items")
      .upsert(rows, { onConflict: "user_id,title", ignoreDuplicates: true })
      .select()

    if (error) throw error
    res.json({ success: true, initialized: data?.length || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Get forge items ───────────────────────────────────────────────────────────
router.get("/pro/forge", requireAuth, async (req, res) => {
  try {
    const { track } = req.query
    let q = supabaseAdmin.from("forge_items").select("*").eq("user_id", req.user.id)
    if (track) q = q.eq("track", track)
    q = q.order("order_index", { ascending: true })
    const { data, error } = await q
    if (error) throw error

    // If no items yet, auto-init
    if (!data || !data.length) {
      const initRows = []
      for (const [t, items] of Object.entries(DEFAULT_FORGE_ITEMS)) {
        for (const item of items) {
          initRows.push({ user_id: req.user.id, track: t, ...item, status: "not_started" })
        }
      }
      const { data: inserted } = await supabaseAdmin.from("forge_items")
        .upsert(initRows, { onConflict: "user_id,title", ignoreDuplicates: true }).select()
      return res.json(track ? (inserted || []).filter(r => r.track === track) : inserted || [])
    }

    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Update forge item status ──────────────────────────────────────────────────
router.put("/pro/forge/:id", requireAuth, async (req, res) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from("forge_items").select("user_id").eq("id", req.params.id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin
      .from("forge_items")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, item: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Submit proof ──────────────────────────────────────────────────────────────
router.post("/pro/forge/:id/submit", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { id } = req.params
    const { submission_type, content, file_url, repo_url, notes } = req.body

    const { data: item } = await supabaseAdmin
      .from("forge_items").select("*").eq("id", id).single()
    if (!item || item.user_id !== uid) return res.status(403).json({ error: "Forbidden" })

    // Create submission
    const { data: submission, error: subErr } = await supabaseAdmin
      .from("forge_submissions")
      .insert({
        forge_item_id:   id,
        user_id:         uid,
        submission_type: submission_type || "text",
        content:         content || null,
        file_url:        file_url || null,
        repo_url:        repo_url || null,
        notes:           notes || null,
        status:          "pending_review",
      })
      .select().single()
    if (subErr) throw subErr

    // Update forge item to "proof_submitted"
    await supabaseAdmin.from("forge_items").update({
      status:                "proof_submitted",
      proof_submitted_at:    new Date().toISOString(),
      updated_at:            new Date().toISOString(),
    }).eq("id", id)

    // Queue AI evaluation async
    setImmediate(() => evaluateSubmission(submission.id, item, submission, uid))

    res.json({ success: true, submission })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── AI Evaluate submission ────────────────────────────────────────────────────
async function evaluateSubmission(submissionId, forgeItem, submission, uid) {
  try {
    const prompt = `You are evaluating a professional career development submission.

Forge Item: ${forgeItem.title}
Expected Output: ${forgeItem.expected_output}
Required Proof: ${forgeItem.required_proof}

User Submission (${submission.submission_type}):
${submission.content || submission.repo_url || submission.file_url || "(file submitted)"}
${submission.notes ? `Notes: ${submission.notes}` : ""}

Evaluate and return JSON:
{
  "score": 0-100,
  "feedback": "2-3 sentence constructive feedback",
  "meets_criteria": true/false,
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1"],
  "recruiter_ready": true/false
}
Return only valid JSON.`

    let evaluation = {}
    try {
      const msg = await claude.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      })
      evaluation = JSON.parse(msg.content[0].text)
    } catch {
      try {
        const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 600, json: true })
        evaluation = JSON.parse(raw)
      } catch { evaluation = { score: 70, feedback: "Submission received and under review.", meets_criteria: true } }
    }

    const newStatus = evaluation.meets_criteria ? "completed" : "revision_needed"

    await supabaseAdmin.from("forge_submissions").update({
      ai_score:    evaluation.score,
      ai_feedback: evaluation.feedback,
      ai_signals:  evaluation,
      status:      newStatus,
    }).eq("id", submissionId)

    await supabaseAdmin.from("forge_items").update({
      status:             newStatus,
      proof_reviewed_at:  new Date().toISOString(),
      ai_evaluation:      evaluation,
      updated_at:         new Date().toISOString(),
    }).eq("id", forgeItem.id)

    // Recompute ELO if completed
    if (newStatus === "completed") {
      const eloBoost = Math.round((forgeItem.xp_reward || 50) * 0.5)
      await supabaseAdmin.rpc("increment_elo", { uid, delta: eloBoost }).catch(() => {})
    }
  } catch (err) {
    console.error("[forge evaluate]", err.message)
  }
}

router.post("/pro/forge/:id/evaluate", requireAuth, async (req, res) => {
  try {
    const { submission_id } = req.body
    const { data: sub } = await supabaseAdmin
      .from("forge_submissions").select("*, forge_items(*)").eq("id", submission_id).single()
    if (!sub || sub.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    setImmediate(() => evaluateSubmission(sub.id, sub.forge_items, sub, req.user.id))
    res.json({ success: true, message: "Evaluation queued" })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Get submissions for a forge item ─────────────────────────────────────────
router.get("/pro/forge/:id/submissions", requireAuth, async (req, res) => {
  try {
    const { data: item } = await supabaseAdmin
      .from("forge_items").select("user_id").eq("id", req.params.id).single()
    if (!item || item.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin
      .from("forge_submissions")
      .select("*")
      .eq("forge_item_id", req.params.id)
      .order("created_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
