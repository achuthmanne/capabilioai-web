// Routes: GET|POST /api/referral/*
import { Router } from "express"
import { supabase } from "../lib/supabase.js"

const router = Router()

router.get("/validate/:code", async (req, res) => {
  try {
    const { data } = await supabase().from("referral_codes").select("*").eq("code", req.params.code.toUpperCase()).single()
    if (!data) return res.json({ valid:false, message:"Code not found" })
    if (data.used >= data.max_uses) return res.json({ valid:false, message:"Code fully used" })
    return res.json({ valid:true, code:data.code, referrerId:data.user_id, message:`Valid code from ${data.referrer_name||"a friend"}` })
  } catch { res.json({ valid:false }) }
})

router.post("/apply", async (req, res) => {
  const { refereeUid, refereeName, referrerCode } = req.body
  try {
    const { data: codeRow } = await supabase().from("referral_codes").select("*").eq("code", referrerCode.toUpperCase()).single()
    if (!codeRow) return res.json({ success:false, error:"Code not found" })
    await Promise.all([
      supabase().rpc("add_elo", { uid:codeRow.user_id, amount:50 }),
      supabase().rpc("add_elo", { uid:refereeUid, amount:50 }),
      supabase().from("referral_codes").update({ used:codeRow.used+1 }).eq("code", referrerCode.toUpperCase()),
    ])
    return res.json({ success:true })
  } catch (e) { console.error("[referral/apply]", e.message); res.json({ success:false }) }
})

router.get("/profile/:uid", async (req, res) => {
  try {
    const { data } = await supabase().from("referral_codes").select("*").eq("user_id", req.params.uid).single()
    return res.json({ code:data?.code||null, used:data?.used||0, maxUses:data?.max_uses||10 })
  } catch { res.json({ code:null, used:0 }) }
})

router.get("/leaderboard", async (req, res) => {
  try {
    const { data } = await supabase().from("referral_codes").select("user_id,code,used,profiles(display_name,elo_rating)").order("used",{ascending:false}).limit(10)
    return res.json({ leaderboard:data||[] })
  } catch { res.json({ leaderboard:[] }) }
})

export default router
