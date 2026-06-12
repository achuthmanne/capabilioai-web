// Routes: POST /api/create-order, /verify-payment, /theme/create-order, /theme/verify-payment
// Also: POST /api/exec/thought-leadership
import { Router } from "express"
import crypto      from "crypto"
import { groq, GROQ_FAST }              from "../lib/groq.js"
import { claude, CLAUDE_SONNET }        from "../lib/claude.js"
import { razorpay, PLAN_PRICES } from "../lib/razorpay.js"
import { supabase } from "../lib/supabase.js"

const router = Router()

// ─── 18. Executive Thought Leadership ────────────────────────────────────────
router.post("/exec/thought-leadership", async (req, res) => {
  const { templateId="linkedin", keyword="tech", name="Executive" } = req.body
  const prompts = {
    linkedin:   `150-word LinkedIn post by ${name} sharing a key insight about ${keyword} for Indian founders.`,
    newsletter: `200-word newsletter intro by ${name} for ${keyword} professionals in India.`,
    insight:    `120-word Insight Card by ${name}: Problem → Insight → Lesson. Topic: ${keyword}.`,
    twitter:    `280-character tweet by ${name} about ${keyword} for Indian tech leaders.`,
    signalroom: `100-word Signal Room description by ${name} for a live session on ${keyword}.`,
  }
  try {
    // Claude Sonnet for executive content — executives publish this publicly
    let draft
    if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_key_here") {
      try {
        draft = await claude(
          [{ role:"user", content: prompts[templateId]||prompts.linkedin }],
          { model: CLAUDE_SONNET, maxTokens: 500, system:`You are a ghostwriter for ${keyword} executives. Write authentically for the Indian tech market. Be insightful, not generic.` }
        )
      } catch (e) { console.warn("[exec/thought-leadership] Claude:", e.message) }
    }
    if (!draft) {
      draft = await groq([{ role:"system", content:`You are a ghostwriter for ${keyword} executives. Write authentically for the Indian market.` }, { role:"user", content: prompts[templateId]||prompts.linkedin }], { model: GROQ_FAST, max_tokens: 400 })
    }
    return res.json({ draft })
  } catch (e) { console.error("[exec/thought-leadership]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 19. Create Order ─────────────────────────────────────────────────────────
router.post("/create-order", async (req, res) => {
  const { planId, uid } = req.body
  const plan = PLAN_PRICES[planId]
  if (!plan) return res.status(400).json({ error: `Unknown plan: ${planId}` })
  try {
    const order = await razorpay().orders.create({ amount: plan.amount, currency:"INR", receipt:`cap_${planId}_${(uid||"anon").slice(0,8)}_${Date.now()}`, notes:{ planId, uid:uid||"", planLabel:plan.label } })
    return res.json({ order_id:order.id, amount:order.amount, currency:order.currency, plan:plan.label })
  } catch (e) { console.error("[create-order]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 20. Verify Payment ───────────────────────────────────────────────────────
router.post("/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId, uid } = req.body
  try {
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET||"").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex")
    if (expected !== razorpay_signature) return res.status(400).json({ success:false, error:"Invalid payment signature" })
    if (uid) await supabase().from("profiles").update({ subscription:planId, subscription_cycle_start:new Date().toISOString(), razorpay_payment_id, razorpay_order_id, updated_at:new Date().toISOString() }).eq("id", uid)
    return res.json({ success:true, planId, paymentId:razorpay_payment_id })
  } catch (e) { console.error("[verify-payment]", e.message); res.status(500).json({ success:false, error:e.message }) }
})

// ─── 21. Theme Create Order ───────────────────────────────────────────────────
router.post("/theme/create-order", async (req, res) => {
  const { themeId, themeName, amount, uid } = req.body
  if (!amount || !uid) return res.status(400).json({ error: "Missing amount or uid" })
  try {
    const order = await razorpay().orders.create({ amount:amount*100, currency:"INR", receipt:`theme_${themeId}_${uid.slice(0,8)}_${Date.now()}`, notes:{themeId,themeName,uid} })
    return res.json({ orderId:order.id, amount:order.amount, currency:order.currency })
  } catch (e) { console.error("[theme/create-order]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 22. Theme Verify Payment ─────────────────────────────────────────────────
router.post("/theme/verify-payment", async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, uid, themeId, packThemeIds } = req.body
  try {
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET||"").update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex")
    if (expected !== razorpay_signature) return res.status(400).json({ success:false, error:"Invalid signature" })
    if (uid) {
      const { data: prof } = await supabase().from("profiles").select("purchased_themes").eq("id", uid).single()
      const existing  = prof?.purchased_themes || {}
      const newThemes = packThemeIds?.length ? packThemeIds.reduce((a,id)=>({...a,[id]:true}),existing) : {...existing,[themeId]:true}
      await supabase().from("profiles").update({ purchased_themes:newThemes, updated_at:new Date().toISOString() }).eq("id", uid)
    }
    return res.json({ success:true, themeId, packThemeIds })
  } catch (e) { console.error("[theme/verify-payment]", e.message); res.status(500).json({ success:false, error:e.message }) }
})

export default router
