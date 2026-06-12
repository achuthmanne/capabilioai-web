/**
 * Pulse (social feed) + Nexus (network) Routes
 *
 * Pulse:
 *   GET  /api/pulse/feed           — paginated feed
 *   POST /api/pulse/posts          — create post
 *   PUT  /api/pulse/posts/:id      — edit post
 *   DELETE /api/pulse/posts/:id    — delete post
 *   POST /api/pulse/posts/:id/interact — acknowledge/signal/save/repost
 *   GET  /api/pulse/posts/:id/comments — get comments
 *   POST /api/pulse/posts/:id/comments — add comment
 *
 * Nexus:
 *   GET  /api/nexus/search         — search professionals
 *   GET  /api/nexus/profile/:uid   — public profile
 *   POST /api/nexus/connect        — send connection request
 *   PUT  /api/nexus/connect/:id    — accept/reject connection
 *   POST /api/nexus/follow         — follow user
 *   DELETE /api/nexus/follow/:uid  — unfollow
 *   GET  /api/nexus/connections    — list connections
 *   GET  /api/nexus/notifications  — notifications
 *   POST /api/nexus/notifications/read — mark read
 *   GET  /api/pulse/market-insights   — AI market trends + tech news (Gemini Search)
 */
import { Router }     from "express"
import { supabaseAdmin } from "../lib/supabase.js"
import { geminiSearch }  from "../lib/gemini.js"

const router = Router()

// ── Simple in-memory cache — market insights change slowly, no need to hit
//    Gemini on every page load. Cache per domain for 2 hours.
const insightsCache = new Map()  // key: domain → { data, expiresAt }
const CACHE_TTL_MS  = 2 * 60 * 60 * 1000  // 2 hours

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}
function optionalAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return next()
  supabaseAdmin.auth.getUser(token).then(({ data: { user } }) => { req.user = user; next() }).catch(() => next())
}

// ══════════════════════════════════════════
// PULSE
// ══════════════════════════════════════════

// ── Market Insights + Tech News (Gemini Search) ────────────────────────────────
// Called by Pulse page for market trends and technology news.
// Gemini Search uses Google Search grounding — returns real, current data.
// Cached per domain for 2 hours so we don't burn API quota on repeated page loads.
router.get("/pulse/market-insights", optionalAuth, async (req, res) => {
  const domain = (req.query.domain || "software engineering").toLowerCase().trim()
  const role   = req.query.role   || "Software Engineer"

  // Return cached result if still fresh
  const cached = insightsCache.get(domain)
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ ...cached.data, cached: true })
  }

  try {
    const prompt = `You are a tech career market analyst for the Indian IT industry.
Provide a concise market intelligence report for: "${role}" / "${domain}" domain.

Include:
1. Top 3 trending technologies RIGHT NOW in Indian tech companies (2025)
2. Top 5 companies actively hiring for this role in India (with approximate salary range)
3. Key skills in high demand vs. declining skills
4. 2-3 recent industry news items relevant to this domain (cite real events)
5. Job market outlook: is demand growing, stable, or declining?

Format as JSON:
{
  "trending_techs": [{ "name": "...", "reason": "1 sentence why trending", "demand": "High|Growing|Stable" }],
  "hiring_companies": [{ "company": "...", "roles": ["..."], "salary_lpa": "X-Y LPA" }],
  "skills": { "rising": ["..."], "declining": ["..."] },
  "news": [{ "headline": "...", "summary": "1 sentence", "date": "approx date" }],
  "market_outlook": "Growing|Stable|Declining",
  "outlook_reason": "1-2 sentences"
}`

    const { text } = await geminiSearch(prompt, { maxTokens: 2000 })

    // Extract JSON from Gemini response
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/)
    const data  = JSON.parse(match ? (match[1] || match[0]) : text)

    const payload = { domain, role, ...data, generatedAt: new Date().toISOString() }
    insightsCache.set(domain, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS })

    console.log(`[pulse/market-insights] Generated for "${domain}"`)
    return res.json(payload)
  } catch (e) {
    console.error("[pulse/market-insights]", e.message)
    // Return stale cache if available rather than a hard error
    if (cached) return res.json({ ...cached.data, cached: true, stale: true })
    res.status(500).json({ error: e.message })
  }
})

router.get("/pulse/feed", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, tech_tag, role_tag, author_id, sort = "created_at" } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)
    // Map sort param → DB column
    const sortCol = sort === "discussed" ? "comment_count"
                  : sort === "signal"    ? "signal_count"
                  : sort === "acknowledged" ? "acknowledge_count"
                  : "created_at"

    let q = supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url,elo_rating,verification_state,path,keyword)", { count: "exact" })
      .eq("visibility", "public")
      .eq("is_moderated", false)
      .order(sortCol, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (author_id) q = q.eq("author_id", author_id)
    if (tech_tag) q = q.contains("tech_tags", [tech_tag])
    if (role_tag) q = q.contains("role_tags", [role_tag])

    const { data: posts, error, count } = await q
    if (error) throw error

    // Add user's interaction state if authenticated
    let enrichedPosts = posts || []
    if (req.user) {
      const postIds = enrichedPosts.map(p => p.id)
      if (postIds.length) {
        const { data: interactions } = await supabaseAdmin.from("post_interactions")
          .select("post_id,action").eq("user_id", req.user.id).in("post_id", postIds)
        const interactionMap = {}
        ;(interactions || []).forEach(i => {
          if (!interactionMap[i.post_id]) interactionMap[i.post_id] = []
          interactionMap[i.post_id].push(i.action)
        })
        enrichedPosts = enrichedPosts.map(p => ({ ...p, user_interactions: interactionMap[p.id] || [] }))
      }
    }

    res.json({ posts: enrichedPosts, total: count || 0, page: parseInt(page) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts", requireAuth, async (req, res) => {
  try {
    const { post_type = "text", content, media_urls = [], poll_data, event_data, tech_tags = [], role_tags = [], visibility = "public" } = req.body
    if (!content?.trim()) return res.status(400).json({ error: "content required" })

    const { data, error } = await supabaseAdmin.from("pulse_posts").insert({
      author_id:  req.user.id,
      user_id:    req.user.id,   // satisfy NOT NULL on tables created with old schema
      post_type,
      content:    content.trim(),
      media_urls,
      poll_data:  poll_data || null,
      event_data: event_data || null,
      tech_tags,
      role_tags,
      visibility,
    }).select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url,elo_rating,verification_state,path,keyword)").single()
    if (error) throw error
    res.json({ success: true, post: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/pulse/posts/:id", requireAuth, async (req, res) => {
  try {
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id, user_id").eq("id", req.params.id).single()
    const ownerId = post?.author_id || post?.user_id
    if (!post || ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    const { data, error } = await supabaseAdmin.from("pulse_posts")
      .update({ ...req.body, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, post: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pulse/posts/:id", requireAuth, async (req, res) => {
  try {
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id, user_id").eq("id", req.params.id).single()
    const ownerId = post?.author_id || post?.user_id
    if (!post || ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("pulse_posts").delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts/:id/interact", requireAuth, async (req, res) => {
  try {
    const { action } = req.body
    const VALID_ACTIONS = ["acknowledge","signal","save","repost","ask_context","book_session"]
    if (!VALID_ACTIONS.includes(action)) return res.status(400).json({ error: "Invalid action" })

    const uid = req.user.id
    const postId = req.params.id

    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id,user_id,acknowledge_count,signal_count,repost_count,save_count").eq("id", postId).single()
    if (!post) return res.status(404).json({ error: "Post not found" })

    const postOwnerId = post.author_id || post.user_id  // handle both old (user_id) and new (author_id) schema

    // Toggle interaction
    const { data: existing } = await supabaseAdmin.from("post_interactions")
      .select("id").eq("post_id", postId).eq("user_id", uid).eq("action", action).single()

    const countField = { acknowledge: "acknowledge_count", signal: "signal_count", repost: "repost_count", save: "save_count" }[action]

    if (existing) {
      await supabaseAdmin.from("post_interactions").delete().eq("id", existing.id)
      if (countField) await supabaseAdmin.from("pulse_posts")
        .update({ [countField]: Math.max(0, (post[countField] || 1) - 1) }).eq("id", postId)
      return res.json({ success: true, active: false })
    } else {
      await supabaseAdmin.from("post_interactions").insert({ post_id: postId, user_id: uid, action })
      if (countField) await supabaseAdmin.from("pulse_posts")
        .update({ [countField]: (post[countField] || 0) + 1 }).eq("id", postId)

      // Notify author (use whichever owner column is populated)
      if (postOwnerId && postOwnerId !== uid && ["acknowledge","signal"].includes(action)) {
        await supabaseAdmin.from("notifications").insert({
          user_id:        postOwnerId,
          type:           `post_${action}`,
          actor_id:       uid,
          entity_id:      postId,
          entity_type:    "pulse_post",
        }).catch(() => {})
      }
      return res.json({ success: true, active: true })
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/pulse/posts/:id/comments", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("post_comments")
      .select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url)")
      .eq("post_id", req.params.id)
      .is("parent_id", null)
      .order("created_at", { ascending: true })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pulse/posts/:id/comments", requireAuth, async (req, res) => {
  try {
    const { content, parent_id } = req.body
    if (!content?.trim()) return res.status(400).json({ error: "content required" })

    const { data, error } = await supabaseAdmin.from("post_comments").insert({
      post_id:   req.params.id,
      author_id: req.user.id,
      content:   content.trim(),
      parent_id: parent_id || null,
    }).select("*, author:profiles!author_id(id,name,display_name,username,profile_photo_url)").single()
    if (error) throw error

    await supabaseAdmin.from("pulse_posts")
      .update({ comment_count: supabaseAdmin.raw("comment_count + 1") })
      .eq("id", req.params.id)
      .catch(() => {})

    // Notify post author
    const { data: post } = await supabaseAdmin.from("pulse_posts").select("author_id").eq("id", req.params.id).single()
    if (post?.author_id && post.author_id !== req.user.id) {
      await supabaseAdmin.from("notifications").insert({
        user_id:        post.author_id,
        type:           "post_comment",
        title:          "New Comment",
        actor_id:       req.user.id,
        reference_id:   req.params.id,
        reference_type: "pulse_post",
      }).catch(() => {})
    }

    res.json({ success: true, comment: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// NEXUS
// ══════════════════════════════════════════

router.get("/nexus/search", optionalAuth, async (req, res) => {
  try {
    const { q, role, domain, page = 1, limit = 20 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let query = supabaseAdmin.from("profiles")
      .select("id,name,headline,profile_photo_url,current_company,current_role_title,skill_graph,verification_state,is_mentor,path,years_of_experience", { count: "exact" })
      .neq("path", "institution")
      .range(offset, offset + parseInt(limit) - 1)

    if (q) query = query.or(`name.ilike.%${q}%,headline.ilike.%${q}%,current_company.ilike.%${q}%`)
    if (role) query = query.ilike("current_role_title", `%${role}%`)

    const { data, error, count } = await query.order("aura_score", { ascending: false })
    if (error) throw error
    res.json({ profiles: data || [], total: count || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/nexus/profile/:uid", optionalAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("profiles")
      .select("id,name,headline,profile_photo_url,cover_photo_url,current_company,current_role_title,profile_summary,skill_graph,experiences,certifications,education,aura_score,role_elo,market_elo,proof_elo,verification_state,is_mentor,path,linkedin_url,github_url,location,years_of_experience")
      .eq("id", req.params.uid).single()
    if (error || !data) return res.status(404).json({ error: "Profile not found" })

    // Check connection status
    let connectionStatus = "none"
    if (req.user && req.user.id !== req.params.uid) {
      const { data: conn } = await supabaseAdmin.from("connections")
        .select("id,status,requester_id")
        .or(`requester_id.eq.${req.user.id},addressee_id.eq.${req.user.id}`)
        .or(`requester_id.eq.${req.params.uid},addressee_id.eq.${req.params.uid}`)
        .single()
      if (conn) connectionStatus = conn.status
    }

    // Follower count
    const { count: followerCount } = await supabaseAdmin.from("follows")
      .select("*", { count: "exact", head: true }).eq("following_id", req.params.uid)
    const { count: followingCount } = await supabaseAdmin.from("follows")
      .select("*", { count: "exact", head: true }).eq("follower_id", req.params.uid)

    let isFollowing = false
    if (req.user) {
      const { data: fol } = await supabaseAdmin.from("follows")
        .select("follower_id").eq("follower_id", req.user.id).eq("following_id", req.params.uid).single()
      isFollowing = !!fol
    }

    res.json({ ...data, connection_status: connectionStatus, follower_count: followerCount || 0, following_count: followingCount || 0, is_following: isFollowing })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/connect", requireAuth, async (req, res) => {
  try {
    const { addressee_id, message } = req.body
    if (!addressee_id || addressee_id === req.user.id)
      return res.status(400).json({ error: "Invalid addressee" })

    const { data, error } = await supabaseAdmin.from("connections").insert({
      requester_id: req.user.id,
      addressee_id,
      message: message || null,
      status: "pending",
    }).select().single()

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "Request already sent" })
      throw error
    }

    const { data: requester } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
    await supabaseAdmin.from("notifications").insert({
      user_id:        addressee_id,
      type:           "connection_request",
      title:          "Connection Request",
      body:           `${requester?.name || "Someone"} wants to connect with you`,
      actor_id:       req.user.id,
      reference_id:   data.id,
      reference_type: "connection",
    }).catch(() => {})

    res.json({ success: true, connection: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/nexus/connect/:id", requireAuth, async (req, res) => {
  try {
    const { status } = req.body  // "accepted" | "rejected"
    const { data: conn } = await supabaseAdmin.from("connections").select("addressee_id,requester_id").eq("id", req.params.id).single()
    if (!conn || conn.addressee_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin.from("connections")
      .update({ status, updated_at: new Date().toISOString() }).eq("id", req.params.id).select().single()
    if (error) throw error

    if (status === "accepted") {
      const { data: accepter } = await supabaseAdmin.from("profiles").select("name").eq("id", req.user.id).single()
      await supabaseAdmin.from("notifications").insert({
        user_id:        conn.requester_id,
        type:           "connection_accepted",
        title:          "Connection Accepted",
        body:           `${accepter?.name || "Someone"} accepted your connection request`,
        actor_id:       req.user.id,
        reference_id:   data.id,
        reference_type: "connection",
      }).catch(() => {})
    }
    res.json({ success: true, connection: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/follow", requireAuth, async (req, res) => {
  try {
    const { following_id } = req.body
    if (!following_id || following_id === req.user.id) return res.status(400).json({ error: "Invalid" })

    const { error } = await supabaseAdmin.from("follows")
      .upsert({ follower_id: req.user.id, following_id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true })
    if (error) throw error
    res.json({ success: true, following: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/nexus/follow/:uid", requireAuth, async (req, res) => {
  try {
    await supabaseAdmin.from("follows").delete().match({ follower_id: req.user.id, following_id: req.params.uid })
    res.json({ success: true, following: false })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/nexus/connections", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data, error } = await supabaseAdmin.from("connections")
      .select("*, requester:requester_id(id,name,profile_photo_url,headline,current_role_title), addressee:addressee_id(id,name,profile_photo_url,headline,current_role_title)")
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
      .order("updated_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Notifications ─────────────────────────────────────────────────────────────
router.get("/nexus/notifications", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("notifications")
      .select("*, actor:actor_id(id,name,profile_photo_url)")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/nexus/notifications/read", requireAuth, async (req, res) => {
  try {
    const { ids } = req.body
    let q = supabaseAdmin.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("user_id", req.user.id)
    if (ids?.length) q = q.in("id", ids)
    else q = q.eq("is_read", false)
    await q
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── ELO-matched builders for the Pulse sidebar ──────────────────────────────
router.get("/pulse/builders", optionalAuth, async (req, res) => {
  try {
    const { domain = "", elo = 400, limit = 8 } = req.query
    const eloNum = parseInt(elo)
    const keyword = domain.split(" ")[0] // "Data" from "Data Analyst"

    let q = supabaseAdmin.from("profiles")
      .select("id, display_name, name, username, keyword, elo_rating, path, onboarding_complete")
      .eq("onboarding_complete", true)
      .gte("elo_rating", Math.max(0, eloNum - 600))
      .lte("elo_rating", eloNum + 600)
      .order("elo_rating", { ascending: false })
      .limit(parseInt(limit))

    if (keyword) q = q.ilike("keyword", `%${keyword}%`)
    if (req.user?.id) q = q.neq("id", req.user.id)

    const { data, error } = await q
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Active mentors for the Pulse sidebar ────────────────────────────────────
// Falls back to high-ELO profiles with is_mentor=true if mentor_profiles table
// doesn't exist yet (table is created by the mentorHub migration).
router.get("/pulse/mentors", optionalAuth, async (req, res) => {
  try {
    const { domain = "", limit = 5 } = req.query
    const keyword = domain.split(" ")[0]

    // Try dedicated mentor_profiles table first
    let q = supabaseAdmin.from("mentor_profiles")
      .select("id, user_id, display_name, headline, hourly_rate, rating, session_count, is_verified, specialties, profile:user_id(id, display_name, name, username, elo_rating, path, keyword)")
      .eq("is_verified", true)
      .order("rating", { ascending: false })
      .limit(parseInt(limit))

    if (keyword) q = q.ilike("specialties", `%${keyword}%`)

    const { data, error } = await q

    // If mentor_profiles table missing, fall back to top-ELO profiles with is_mentor flag
    if (error && (error.code === "42P01" || error.message?.includes("relation") || error.message?.includes("does not exist"))) {
      let fallback = supabaseAdmin.from("profiles")
        .select("id, display_name, name, username, elo_rating, keyword, headline, profile_photo_url")
        .eq("is_mentor", true)
        .order("elo_rating", { ascending: false })
        .limit(parseInt(limit))
      if (keyword) fallback = fallback.ilike("keyword", `%${keyword}%`)
      const { data: fb } = await fallback
      return res.json(fb || [])
    }

    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Feed from users the current user follows ────────────────────────────────
router.get("/pulse/following-feed", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 15, sort = "created_at" } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { data: follows } = await supabaseAdmin.from("follows")
      .select("following_id").eq("follower_id", req.user.id)

    if (!follows?.length) return res.json({ posts: [], total: 0, page: 1 })

    const followingIds = follows.map(f => f.following_id)
    const sortCol = sort === "discussed" ? "comment_count" : sort === "signal" ? "signal_count" : "created_at"

    const { data: posts, error, count } = await supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id, display_name, name, username, elo_rating, path, keyword)", { count: "exact" })
      .in("author_id", followingIds)
      .eq("visibility", "public")
      .eq("is_moderated", false)
      .order(sortCol, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (error) throw error

    // Enrich with user's interactions
    let enriched = posts || []
    if (enriched.length) {
      const postIds = enriched.map(p => p.id)
      const { data: interactions } = await supabaseAdmin.from("post_interactions")
        .select("post_id,action").eq("user_id", req.user.id).in("post_id", postIds)
      const iMap = {}
      ;(interactions || []).forEach(i => { if (!iMap[i.post_id]) iMap[i.post_id] = []; iMap[i.post_id].push(i.action) })
      enriched = enriched.map(p => ({ ...p, user_interactions: iMap[p.id] || [] }))
    }

    res.json({ posts: enriched, total: count || 0, page: parseInt(page) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Saved / Capsule posts ────────────────────────────────────────────────────
router.get("/pulse/saved", requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    const { data: saves } = await supabaseAdmin.from("post_interactions")
      .select("post_id").eq("user_id", req.user.id).eq("action", "save")
      .order("created_at", { ascending: false }).range(offset, offset + parseInt(limit) - 1)

    if (!saves?.length) return res.json({ posts: [], total: 0 })

    const postIds = saves.map(s => s.post_id)
    const { data: posts, error, count } = await supabaseAdmin.from("pulse_posts")
      .select("*, author:profiles!author_id(id, display_name, name, username, elo_rating, path, keyword)", { count: "exact" })
      .in("id", postIds).eq("is_moderated", false)

    if (error) throw error

    const enriched = (posts || []).map(p => ({ ...p, user_interactions: ["save"] }))
    res.json({ posts: enriched, total: count || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
