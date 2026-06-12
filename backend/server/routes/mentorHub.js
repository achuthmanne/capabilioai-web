/**
 * Mentor Hub Routes
 * GET  /api/mentors               — list all active mentors
 * GET  /api/mentors/:id           — get mentor profile
 * POST /api/mentors/profile       — create/update mentor profile
 * POST /api/mentors/bookings      — create booking
 * GET  /api/mentors/bookings/mine — my bookings (as mentee or mentor)
 * PUT  /api/mentors/bookings/:id  — update booking status
 * GET  /api/mentors/payouts       — mentor payout summary
 * POST /api/mentors/payouts/request — request payout
 */
import { Router }         from "express"
import { supabaseAdmin }  from "../lib/supabase.js"
import { razorpayClient as razorpay }       from "../lib/razorpay.js"

const router = Router()
const PLATFORM_FEE_PCT = 20  // 20% platform fee

async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "").trim()
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return res.status(401).json({ error: "Invalid token" })
  req.user = user
  next()
}

// ── List mentors ──────────────────────────────────────────────────────────────
router.get("/mentors", async (req, res) => {
  try {
    const { page = 1, limit = 20, domain, min_rate, max_rate } = req.query
    const offset = (parseInt(page) - 1) * parseInt(limit)

    let q = supabaseAdmin.from("mentor_profiles")
      .select("*, profiles(id,name,headline,profile_photo_url,current_company,current_role_title,skill_graph,years_of_experience)", { count: "exact" })
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .range(offset, offset + parseInt(limit) - 1)

    if (min_rate) q = q.gte("hourly_rate_inr", parseFloat(min_rate))
    if (max_rate) q = q.lte("hourly_rate_inr", parseFloat(max_rate))

    const { data, error, count } = await q
    if (error) throw error
    res.json({ mentors: data || [], total: count || 0 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Get mentor profile ────────────────────────────────────────────────────────
router.get("/mentors/:id", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from("mentor_profiles")
      .select("*, profiles(id,name,headline,profile_photo_url,current_company,current_role_title,skill_graph,experiences,profile_summary,years_of_experience)")
      .eq("id", req.params.id)
      .single()
    if (error || !data) return res.status(404).json({ error: "Mentor not found" })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Create/update mentor profile ─────────────────────────────────────────────
router.post("/mentors/profile", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const body = req.body
    if (!body.hourly_rate_inr) return res.status(400).json({ error: "hourly_rate_inr required" })

    const payload = {
      user_id:          uid,
      bio:              body.bio || null,
      expertise_areas:  body.expertise_areas || [],
      technologies:     body.technologies || [],
      hourly_rate_inr:  body.hourly_rate_inr,
      session_types:    body.session_types || ["1:1", "group"],
      availability:     body.availability || {},
      payout_cycle:     body.payout_cycle || "monthly",
      payout_method:    body.payout_method || "upi",
      payout_details:   body.payout_details || {},
      is_active:        true,
      updated_at:       new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin.from("mentor_profiles")
      .upsert(payload, { onConflict: "user_id" }).select().single()
    if (error) throw error

    await supabaseAdmin.from("profiles").update({ is_mentor: true, mentor_hourly_rate: body.hourly_rate_inr }).eq("id", uid)
    res.json({ success: true, mentor: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Create booking ────────────────────────────────────────────────────────────
router.post("/mentors/bookings", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { mentor_profile_id, session_type, title, scheduled_at, duration_mins = 60, notes } = req.body
    if (!mentor_profile_id || !scheduled_at) return res.status(400).json({ error: "mentor_profile_id and scheduled_at required" })

    const { data: mentor } = await supabaseAdmin.from("mentor_profiles")
      .select("id,hourly_rate_inr,user_id,platform_fee_pct").eq("id", mentor_profile_id).single()
    if (!mentor) return res.status(404).json({ error: "Mentor not found" })

    const durationHours = duration_mins / 60
    const gross = Math.round(mentor.hourly_rate_inr * durationHours)
    const feePercent = mentor.platform_fee_pct || PLATFORM_FEE_PCT
    const platformFee = Math.round(gross * feePercent / 100)
    const txFee = Math.round(gross * 0.02) // 2% payment gateway fee
    const mentorPayout = gross - platformFee - txFee

    // Create Razorpay order
    let order = null
    try {
      order = await razorpay.orders.create({
        amount: gross * 100, // paise
        currency: "INR",
        receipt: `mentor_${Date.now()}`,
        notes: { mentor_id: mentor_profile_id, mentee_id: uid, session_type },
      })
    } catch (rpErr) { console.warn("[mentor booking] Razorpay:", rpErr.message) }

    const { data, error } = await supabaseAdmin.from("mentor_bookings").insert({
      mentor_id:        mentor_profile_id,
      mentee_id:        uid,
      session_type:     session_type || "1:1",
      title:            title || `${session_type || "1:1"} Session`,
      scheduled_at,
      duration_mins,
      amount_inr:       gross,
      platform_fee:     platformFee,
      mentor_payout:    mentorPayout,
      status:           "requested",
      payment_status:   "pending",
      payment_order_id: order?.id || null,
      notes:            notes || null,
    }).select().single()
    if (error) throw error

    // Notify mentor
    await supabaseAdmin.from("notifications").insert({
      user_id:        mentor.user_id,
      type:           "booking_request",
      title:          "New Session Request",
      body:           `A mentee requested a ${session_type || "1:1"} session`,
      actor_id:       uid,
      reference_id:   data.id,
      reference_type: "mentor_booking",
    }).catch(() => {})

    res.json({
      success: true,
      booking: data,
      payment: {
        order_id:    order?.id,
        amount:      gross,
        currency:    "INR",
        breakdown:   { gross, platform_fee: platformFee, tx_fee: txFee, mentor_payout: mentorPayout },
      },
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── My bookings ───────────────────────────────────────────────────────────────
router.get("/mentors/bookings/mine", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const { as } = req.query

    // Check if user is a mentor
    const { data: mp } = await supabaseAdmin.from("mentor_profiles").select("id").eq("user_id", uid).single()

    let bookings = []
    if (as === "mentor" && mp) {
      const { data, error } = await supabaseAdmin.from("mentor_bookings")
        .select("*, profiles!mentee_id(id,name,profile_photo_url,headline)")
        .eq("mentor_id", mp.id)
        .order("scheduled_at", { ascending: false })
      if (!error) bookings = data || []
    } else {
      const { data, error } = await supabaseAdmin.from("mentor_bookings")
        .select("*, mentor_profiles!mentor_id(id,hourly_rate_inr,profiles!user_id(id,name,profile_photo_url,headline))")
        .eq("mentee_id", uid)
        .order("scheduled_at", { ascending: false })
      if (!error) bookings = data || []
    }

    res.json(bookings)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Update booking ────────────────────────────────────────────────────────────
router.put("/mentors/bookings/:id", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: booking } = await supabaseAdmin.from("mentor_bookings")
      .select("mentee_id,mentor_id,mentor_profiles!mentor_id(user_id)")
      .eq("id", req.params.id).single()

    const isMentee   = booking?.mentee_id === uid
    const isMentor   = booking?.mentor_profiles?.user_id === uid
    if (!isMentee && !isMentor) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin.from("mentor_bookings")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id).select().single()
    if (error) throw error

    // If payment confirmed, update payout totals
    if (req.body.payment_status === "paid" && data.status === "confirmed") {
      await supabaseAdmin.from("mentor_profiles")
        .update({
          total_sessions: supabaseAdmin.raw("total_sessions + 1"),
          total_earnings: supabaseAdmin.raw(`total_earnings + ${data.mentor_payout}`),
        })
        .eq("id", data.mentor_id)
        .catch(() => {})
    }

    res.json({ success: true, booking: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Payout summary ────────────────────────────────────────────────────────────
router.get("/mentors/payouts", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: mp } = await supabaseAdmin.from("mentor_profiles")
      .select("id,payout_cycle,platform_fee_pct,total_earnings").eq("user_id", uid).single()
    if (!mp) return res.status(404).json({ error: "Not a mentor" })

    const { data: payouts } = await supabaseAdmin.from("mentor_payouts")
      .select("*").eq("mentor_id", mp.id).order("created_at", { ascending: false }).limit(12)

    // Pending amount: completed unpaid bookings
    const { data: pending } = await supabaseAdmin.from("mentor_bookings")
      .select("mentor_payout")
      .eq("mentor_id", mp.id)
      .eq("payment_status", "paid")
      .is("invoice_url", null)

    const pendingTotal = (pending || []).reduce((sum, b) => sum + (b.mentor_payout || 0), 0)

    res.json({
      mentor_profile: mp,
      pending_payout:  pendingTotal,
      payout_history:  payouts || [],
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Request payout ────────────────────────────────────────────────────────────
router.post("/mentors/payouts/request", requireAuth, async (req, res) => {
  try {
    const uid = req.user.id
    const { data: mp } = await supabaseAdmin.from("mentor_profiles")
      .select("id,platform_fee_pct").eq("user_id", uid).single()
    if (!mp) return res.status(404).json({ error: "Not a mentor" })

    const { data: bookings } = await supabaseAdmin.from("mentor_bookings")
      .select("mentor_payout,amount_inr,platform_fee")
      .eq("mentor_id", mp.id)
      .eq("payment_status", "paid")
      .is("invoice_url", null)

    if (!bookings?.length) return res.json({ success: false, message: "No pending payouts" })

    const gross      = bookings.reduce((s, b) => s + (b.amount_inr || 0), 0)
    const platFee    = bookings.reduce((s, b) => s + (b.platform_fee || 0), 0)
    const txFee      = Math.round(gross * 0.02)
    const netPayout  = bookings.reduce((s, b) => s + (b.mentor_payout || 0), 0) - txFee

    const now  = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to   = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const { data, error } = await supabaseAdmin.from("mentor_payouts").insert({
      mentor_id:       mp.id,
      period_start:    from.toISOString().split("T")[0],
      period_end:      to.toISOString().split("T")[0],
      gross_amount:    gross,
      platform_fee:    platFee,
      transaction_fee: txFee,
      net_payout:      netPayout,
      session_count:   bookings.length,
      status:          "pending",
    }).select().single()
    if (error) throw error

    res.json({ success: true, payout: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
