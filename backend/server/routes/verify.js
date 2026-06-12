// Routes: POST /api/verify/* (Digilocker, EPFO, Certification stubs)
// Wire real APIs when ready:
//   Digilocker: https://developer.digilocker.gov.in
//   EPFO:       via Setu (setu.co) or Perfios sandbox
import { Router } from "express"

const router = Router()

router.post("/digilocker/init",    async (req, res) => res.json({ success:true, txnId:`digi_${Date.now()}`, message:`OTP sent to ${req.body.mobile}` }))
router.post("/digilocker/confirm", async (req, res) => req.body.otp==="000000" ? res.json({verified:false,error:"Invalid OTP"}) : res.json({verified:true,data:{institution:"Verified University",degree:"B.Tech",year:"2022",digilockerVerified:true}}))
router.post("/epfo/init",          async (req, res) => (!req.body.uan||req.body.uan.length<10) ? res.json({success:false,error:"Invalid UAN"}) : res.json({success:true,txnId:`epfo_${Date.now()}`,message:"OTP sent to UAN-linked mobile"}))
router.post("/epfo/confirm",       async (req, res) => req.body.otp==="000000" ? res.json({verified:false,error:"Invalid OTP"}) : res.json({verified:true,data:{uan:req.body.uan,epfoVerified:true,verifiedAt:new Date().toISOString()}}))
router.post("/certification",      async (req, res) => !req.body.certId?.trim() ? res.json({verified:false,error:"Invalid certificate ID"}) : res.json({verified:true,data:{provider:req.body.provider,certId:req.body.certId,verifiedAt:new Date().toISOString()}}))

export default router
