/**
 * Orbit Plans / Subscriptions / Career Intelligence Routes
 *
 * POST /api/orbit/order           — create Razorpay order for plan
 * POST /api/orbit/verify          — verify payment + activate subscription
 * GET  /api/orbit/status          — current subscription status
 * POST /api/orbit/coupon/validate — validate coupon code
 * GET  /api/orbit/plans           — plan definitions
 *
 * Career Intelligence:
 * POST /api/intel/report          — generate career intelligence report
 * GET  /api/intel/reports         — list reports for user
 * GET  /api/intel/reports/:id     — get single report
 */
import { Router }  from "express"
import crypto      from "crypto"
import Anthropic   from "@anthropic-ai/sdk"
import { supabaseAdmin }   from "../lib/supabase.js"
import { razorpayClient as razorpay }        from "../lib/razorpay.js"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })


// ── Plan definitions ──────────────────────────────────────────────────────────
const ORBIT_PLANS = {
  free: {
    id: "free", name: "Free", price: { monthly: 0, yearly: 0 },
    features: ["Resume parsing","Basic profile","Skill graph (10 skills)","Pulse feed (read)","Launchpad (10 jobs/day)","Basic ELO"],
    limits: { skills: 10, interviews: 0, reports: 0, forge_tracks: 2, jobs_per_day: 10 },
  },
  pro: {
    id: "pro", name: "Orbit Pro", price: { monthly: 499, yearly: 4799 },
    features: ["Unlimited skills","EPFO verification","Compensation intelligence","Market gap analysis","5 AI interviews/month","2 career reports/month","Full Forge (all tracks)","Pulse posting","Recruiter visibility"],
    limits: { skills: -1, interviews: 5, reports: 2, forge_tracks: -1, jobs_per_day: -1 },
  },
  elite: {
    id: "elite", name: "Orbit Elite", price: { monthly: 999, yearly: 9599 },
    features: ["Everything in Pro","Unlimited AI interviews","Unlimited reports","Return-ready tools","Transition tracks","Priority Launchpad matching","Mentor monetization","Deep monthly report"],
    limits: { skills: -1, interviews: -1, reports: -1, forge_tracks: -1, jobs_per_day: -1 },
  },
}

router.get("/orbit/plans", (req, res) => res.json(ORBIT_PLANS))

// ── Create order ──────────────────────────────────────────────────────────────
router.post("/orbit/order", requireAuth, async (req, res) => {
  try {
    const { plan_id, billing_cycle = "monthly", coupon_code } = req.body
    if (!ORBIT_PLANS[plan_id] || plan_id === "free")
      return res.status(400).json({ error: "Invalid plan" })

    const plan = ORBIT_PLANS[plan_id]
    let amount = plan.price[billing_cycle]
    let discountApplied = 0

    // Apply coupon
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin.from("coupons")
        .select("*").eq("code", coupon_code.toUpperCase()).eq("is_active", true).single()
      if (coupon) {
        const now = new Date()
        if ((!coupon.valid_until || new Date(coupon.valid_until) > now) &&
            (!coupon.max_uses || coupon.used_count < coupon.max_uses) &&
            (!coupon.applicable_plans?.length || coupon.applicable_plans.includes(plan_id))) {

          // Check user hasn't used it
          const { data: used } = await supabaseAdmin.from("coupon_redemptions")
            .select("id").eq("coupon_id", coupon.id).eq("user_id", req.user.id).single()
          if (!used) {
            discountApplied = coupon.discount_type === "percent"
              ? Math.round(amount * coupon.discount_value / 100)
              : coupon.discount_value
            amount = Math.max(0, amount - discountApplied)
          }
        }
      }
    }

    const order = await razorpay.orders.create({
      amount:   amount * 100,
      currency: "INR",
      receipt:  `orbit_${plan_id}_${Date.now()}`,
      notes:    { user_id: req.user.id, plan_id, billing_cycle },
    })

    res.json({ order_id: order.id, amount, discount: discountApplied, currency: "INR", plan: plan.name })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Verify payment ────────────────────────────────────────────────────────────
router.post("/orbit/verify", requireAuth, async (req, res) => {
  try {
    const { order_id, payment_id, signature, plan_id, billing_cycle = "monthly", coupon_code } = req.body

    // Verify Razorpay signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${order_id}|${payment_id}`)
      .digest("hex")
    if (signature && expected !== signature)
      return res.status(400).json({ error: "Payment verification failed" })

    const uid  = req.user.id
    const plan = ORBIT_PLANS[plan_id]
    if (!plan) return res.status(400).json({ error: "Invalid plan" })

    const durationDays = billing_cycle === "yearly" ? 365 : 30
    const expiresAt    = new Date(Date.now() + durationDays * 86400000).toISOString()

    // Upsert subscription
    const { data: sub, error } = await supabaseAdmin.from("user_subscriptions").upsert({
      user_id:             uid,
      plan:                plan_id,
      billing_cycle,
      amount_inr:          plan.price[billing_cycle],
      razorpay_order_id:   order_id,
      razorpay_payment_id: payment_id,
      coupon_code:         coupon_code || null,
      starts_at:           new Date().toISOString(),
      expires_at:          expiresAt,
      is_active:           true,
      updated_at:          new Date().toISOString(),
    }, { onConflict: "user_id" }).select().single()
    if (error) throw error

    // Update profile subscription
    await supabaseAdmin.from("profiles").update({
      subscription_plan:       plan_id,
      subscription_expires_at: expiresAt,
      subscription_order_id:   order_id,
    }).eq("id", uid)

    // Record coupon usage
    if (coupon_code) {
      const { data: coupon } = await supabaseAdmin.from("coupons")
        .select("id").eq("code", coupon_code.toUpperCase()).single()
      if (coupon) {
        await supabaseAdmin.from("coupon_redemptions")
          .insert({ coupon_id: coupon.id, user_id: uid }).catch(() => {})
        await supabaseAdmin.from("coupons")
          .update({ used_count: supabaseAdmin.raw("used_count + 1") }).eq("id", coupon.id).catch(() => {})
      }
    }

    res.json({ success: true, subscription: sub, expires_at: expiresAt })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/orbit/status", requireAuth, async (req, res) => {
  try {
    const { data: sub } = await supabaseAdmin.from("user_subscriptions")
      .select("*").eq("user_id", req.user.id).single()

    if (!sub || !sub.is_active || new Date(sub.expires_at) < new Date())
      return res.json({ plan: "free", is_active: false, limits: ORBIT_PLANS.free.limits })

    const plan = ORBIT_PLANS[sub.plan] || ORBIT_PLANS.free
    res.json({ ...sub, plan_details: plan, limits: plan.limits })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/orbit/coupon/validate", async (req, res) => {
  try {
    const { code, plan_id } = req.body
    if (!code) return res.status(400).json({ error: "code required" })

    const { data: coupon, error } = await supabaseAdmin.from("coupons")
      .select("*").eq("code", code.toUpperCase().trim()).eq("is_active", true).single()

    if (error || !coupon) return res.json({ valid: false, message: "Invalid or expired coupon" })

    const now = new Date()
    if (coupon.valid_until && new Date(coupon.valid_until) < now)
      return res.json({ valid: false, message: "Coupon expired" })
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses)
      return res.json({ valid: false, message: "Coupon fully redeemed" })
    if (coupon.applicable_plans?.length && plan_id && !coupon.applicable_plans.includes(plan_id))
      return res.json({ valid: false, message: "Coupon not valid for this plan" })

    res.json({
      valid:          true,
      discount_type:  coupon.discount_type,
      discount_value: coupon.discount_value,
      message:        coupon.discount_type === "percent" ? `${coupon.discount_value}% off applied` : `₹${coupon.discount_value} off applied`,
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// CAREER INTELLIGENCE REPORTS
// ══════════════════════════════════════════

const REPORT_TEMPLATES = {
  market_gap:      { title: "Profile vs Market Gap Analysis", min_plan: "pro" },
  compensation:    { title: "Compensation Intelligence Report", min_plan: "pro" },
  role_risk:       { title: "Role Risk & Resilience Analysis", min_plan: "pro" },
  ai_impact:       { title: "AI Change Impact Analysis", min_plan: "elite" },
  layoff_mode:     { title: "Layoff Mode & Recovery Plan", min_plan: "elite" },
  future_proof:    { title: "Future-Proofing Report", min_plan: "elite" },
  transition:      { title: "Transition Readiness Report", min_plan: "elite" },
  return_ready:    { title: "Return-to-Work Report", min_plan: "elite" },
}

router.post("/intel/report", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { report_type } = req.body
    if (!REPORT_TEMPLATES[report_type]) return res.status(400).json({ error: "Invalid report type" })

    // Plan check
    const { data: sub } = await supabaseAdmin.from("user_subscriptions")
      .select("plan,expires_at,is_active").eq("user_id", uid).single()
    const currentPlan = (sub?.is_active && new Date(sub.expires_at) > new Date()) ? sub.plan : "free"

    const reqPlan = REPORT_TEMPLATES[report_type].min_plan
    const planOrder = { free: 0, pro: 1, elite: 2 }
    if (planOrder[currentPlan] < planOrder[reqPlan])
      return res.status(403).json({ error: `This report requires ${reqPlan === "pro" ? "Orbit Pro" : "Orbit Elite"}` })

    // Fetch user data for report
    const [{ data: profile }, { data: skills }, { data: timeline }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", uid).single(),
      supabaseAdmin.from("skill_graph").select("skill_name,elo_value,verification_state,confidence_score").eq("user_id", uid).order("elo_value", { ascending: false }).limit(20),
      supabaseAdmin.from("career_timeline").select("company,role_title,start_date,end_date,is_current,technologies,skills_used").eq("user_id", uid).order("start_date", { ascending: false }),
    ])

    const context = {
      name:            profile?.name || "Professional",
      role:            profile?.current_role_title || profile?.keyword || "Professional",
      company:         profile?.current_company || "Unknown",
      yoe:             profile?.years_of_experience || 0,
      skills:          (skills || []).slice(0, 15).map(s => s.skill_name),
      timeline:        (timeline || []).slice(0, 5).map(t => `${t.role_title} at ${t.company}`),
      epfo_verified:   profile?.epfo_verified || false,
      aura_score:      profile?.aura_score || 0,
      subscription:    currentPlan,
    }

    const prompt = buildReportPrompt(report_type, context)

    let sections = {}
    try {
      const msg = await claude.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      })
      sections = JSON.parse(msg.content[0].text)
    } catch {
      try {
        const raw = await groq([{ role: "user", content: prompt }], { model: GROQ_FAST, max_tokens: 2000, json: true })
        sections = JSON.parse(raw)
      } catch { sections = { summary: "Report generated. Data analysis in progress.", sections: {}, action_items: [] } }
    }

    const { data: report, error } = await supabaseAdmin.from("career_reports").insert({
      user_id:          uid,
      report_type,
      title:            REPORT_TEMPLATES[report_type].title,
      summary:          sections.summary || sections.executive_summary,
      sections:         sections,
      risk_score:       sections.risk_score || null,
      resilience_score: sections.resilience_score || null,
      action_items:     sections.action_items || [],
      raw_data:         context,
      is_premium:       reqPlan !== "free",
      expires_at:       new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
    }).select().single()
    if (error) throw error

    res.json({ success: true, report })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

function buildReportPrompt(type, ctx) {
  const base = `Professional: ${ctx.name}, ${ctx.role} at ${ctx.company}, ${ctx.yoe} years experience.
Skills: ${ctx.skills.join(", ")}.
Career: ${ctx.timeline.join("; ")}.`

  const prompts = {
    market_gap: `${base}\n\nGenerate a Profile vs Market Gap Analysis. Return JSON:\n{"executive_summary":"...","skill_gaps":{"critical":[],"moderate":[],"nice_to_have":[]},"market_position":{"percentile":0-100,"assessment":"..."},"recommendations":[],"action_items":[],"sections":{"gap_analysis":"...","strengths":"...","market_context":"..."}}`,

    compensation: `${base}\n\nGenerate a Compensation Intelligence Report for India market. Return JSON:\n{"executive_summary":"...","current_band":{"low":0,"high":0,"unit":"LPA"},"market_band":{"p25":0,"p50":0,"p75":0,"unit":"LPA"},"gap_analysis":"...","negotiation_anchors":[],"action_items":[],"sections":{"methodology":"...","market_data":"...","strategy":""}}`,

    role_risk: `${base}\n\nGenerate a Role Risk & Resilience Analysis. Return JSON:\n{"executive_summary":"...","risk_score":0-100,"resilience_score":0-100,"risk_factors":[],"resilience_factors":[],"exposure_areas":[],"recommended_actions":[],"action_items":[],"sections":{"risk_breakdown":"...","market_movement":"...","ai_disruption_pressure":"..."}}`,

    ai_impact: `${base}\n\nGenerate an AI Change Impact Analysis. Return JSON:\n{"executive_summary":"...","automation_risk":0-100,"augmentation_score":0-100,"tasks_at_risk":[],"tasks_enhanced_by_ai":[],"skills_to_build":[],"action_items":[],"sections":{"impact_analysis":"...","opportunity":"...","roadmap":"..."}}`,

    layoff_mode: `${base}\n\nGenerate a Layoff Mode Recovery Plan. Return JSON:\n{"executive_summary":"...","resilience_score":0-100,"immediate_actions":[],"30_day_plan":[],"90_day_plan":[],"financial_runway_tips":[],"action_items":[],"sections":{"situation_assessment":"...","network_activation":"...","positioning":""}}`,

    future_proof: `${base}\n\nGenerate a Future-Proofing Report. Return JSON:\n{"executive_summary":"...","future_readiness_score":0-100,"emerging_skills":[],"skills_at_risk":[],"career_paths":[],"recommended_investments":[],"action_items":[],"sections":{"tech_trends":"...","career_evolution":"...","skill_roadmap":""}}`,

    transition: `${base}\n\nGenerate a Transition Readiness Report. Return JSON:\n{"executive_summary":"...","readiness_score":0-100,"target_roles":[],"skill_gaps":[],"timeline_estimate":"...","success_factors":[],"action_items":[],"sections":{"current_positioning":"...","target_analysis":"...","transition_plan":""}}`,

    return_ready: `${base}\n\nGenerate a Return-to-Work Report. Return JSON:\n{"executive_summary":"...","readiness_score":0-100,"break_narrative":"...","skill_freshness":[],"refresh_priorities":[],"30_day_actions":[],"action_items":[],"sections":{"gap_management":"...","market_re_entry":"...","narrative_guide":""}}`
  }
  return (prompts[type] || prompts.market_gap) + "\nReturn only valid JSON, no markdown."
}

router.get("/intel/reports", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("career_reports")
      .select("id,report_type,title,summary,risk_score,resilience_score,generated_at,expires_at")
      .eq("user_id", req.user.id).order("generated_at", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/intel/reports/:id", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("career_reports")
      .select("*").eq("id", req.params.id).eq("user_id", req.user.id).single()
    if (error || !data) return res.status(404).json({ error: "Report not found" })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
