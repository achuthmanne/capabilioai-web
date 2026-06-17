// ─── verify-uan Edge Function ────────────────────────────────────────────────
// Proxies Eko's Employee Details API (EPFO / UAN lookup by phone number).
// API Reference: https://developers.eko.in/reference/advance-employment
//
// Required Supabase secrets (supabase secrets set KEY=value --project-ref <id>):
//   EKO_DEVELOPER_KEY   — Static developer key from Eko portal
//   EKO_SECRET_KEY      — Secret key (used to generate per-request HMAC signature)
//   EKO_INITIATOR_ID    — Your registered initiator mobile number on Eko
//   EKO_USER_CODE       — (optional) Eko partner code
//   EKO_ENV             — "staging" | "production"  (defaults to staging)
//
// POST /functions/v1/verify-uan
// Body: { phone: string, user_id: string }
//
// Returns on success:
//   { ok: true, uan_details: [...], recent_employment_details: {...} }
// Returns on error:
//   { ok: false, error: string }
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// ── Eko secret-key: base64( HMAC-SHA256(secret_key, timestamp) ) ─────────────
async function ekoSecretKey(secretKey: string, timestamp: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(secretKey),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(timestamp))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

// ── Normalised types ──────────────────────────────────────────────────────────
interface UANRecord {
  uan: string
  source: string
  source_score: number
  employee_name: string
  gender: string
  dob: string
  phone: string
  employer_name: string
  establishment_id: string
  member_id: string
  joining_date: string
  exit_date: string
  leave_reason: string
  employer_confidence_score: number
}

interface RecentEmployment {
  uan: string
  member_id: string
  joining_date: string
  exit_date: string
  employed: boolean
  employee_name_match: boolean
  exit_date_marked: boolean
  establishment_id: string
  establishment_name: string
  ownership_type: string
  employer_confidence_score: number
}

// ── Call Eko Employee Details API ─────────────────────────────────────────────
async function fetchEpfoFromEko(phone: string): Promise<{
  ok: boolean
  uan_details?: UANRecord[]
  recent_employment_details?: RecentEmployment
  error?: string
}> {
  const developerKey = Deno.env.get("EKO_DEVELOPER_KEY") || ""
  const secretKeyRaw = Deno.env.get("EKO_SECRET_KEY")    || ""
  const initiatorId  = Deno.env.get("EKO_INITIATOR_ID")  || ""
  const userCode     = Deno.env.get("EKO_USER_CODE")      || ""
  const env          = Deno.env.get("EKO_ENV")            || "staging"

  if (!developerKey || !secretKeyRaw || !initiatorId) {
    return {
      ok: false,
      error: "Missing Eko credentials. Set EKO_DEVELOPER_KEY, EKO_SECRET_KEY, EKO_INITIATOR_ID in Supabase secrets.",
    }
  }

  const baseUrl = env === "production"
    ? "https://www.eko.in:25004/ekoapi/v3/tools/kyc/advance-employment"
    : "https://staging.eko.in:25004/ekoapi/v3/tools/kyc/advance-employment"

  const timestamp     = String(Math.floor(Date.now() / 1000))
  const secretKey     = await ekoSecretKey(secretKeyRaw, timestamp)
  const clientRefId   = `cap_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

  const body: Record<string, string> = {
    initiator_id:  initiatorId,
    phone,
    source:        "API",
    client_ref_id: clientRefId,
  }
  if (userCode) body.user_code = userCode

  const res = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "developer_key":        developerKey,
      "secret-key":           secretKey,
      "secret-key-timestamp": timestamp,
      "content-type":         "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return { ok: false, error: `Eko HTTP ${res.status}: ${text.slice(0, 200)}` }
  }

  const raw = await res.json()

  // Eko returns status=0 for success
  if (raw.status !== 0 && raw.status !== "0") {
    return {
      ok: false,
      error: raw.message || raw.msg || `Eko error (status ${raw.status})`,
    }
  }

  const d = raw.data || {}

  // ── Normalise uan_details array ───────────────────────────────────────────
  const rawUanDetails: Record<string, unknown>[] = d.uan_details || []
  const uan_details: UANRecord[] = rawUanDetails.map((u) => {
    const basic  = (u.basic_details       as Record<string, string>) || {}
    const emp    = (u.employment_details  as Record<string, string>) || {}
    return {
      uan:                       String(u.uan || ""),
      source:                    String(u.source || ""),
      source_score:              Number(u.source_score || 0),
      employee_name:             basic.employee_name || "",
      gender:                    basic.gender        || "",
      dob:                       basic.dob           || "",
      phone:                     basic.phone         || "",
      employer_name:             emp.establishment_name        || "",
      establishment_id:          emp.establishment_id          || "",
      member_id:                 emp.member_id                 || "",
      joining_date:              emp.joining_date              || "",
      exit_date:                 emp.exit_date                 || "",
      leave_reason:              emp.leave_reason              || "",
      employer_confidence_score: Number(emp.employer_confidence_score || 0),
    }
  })

  // ── Normalise recent_employment_details ───────────────────────────────────
  const red = d.recent_employment_details || {}
  const empD = (red.employee_details  as Record<string, unknown>) || {}
  const empR = (red.employer_details  as Record<string, unknown>) || {}

  const recent_employment_details: RecentEmployment = {
    uan:                      String(empD.uan           || ""),
    member_id:                String(empD.member_id     || ""),
    joining_date:             String(empD.joining_date  || ""),
    exit_date:                String(empD.exit_date     || ""),
    employed:                 Boolean(empD.employed),
    employee_name_match:      Boolean(empD.employee_name_match),
    exit_date_marked:         Boolean(empD.exit_date_marked),
    establishment_id:         String(empR.establishment_id   || ""),
    establishment_name:       String(empR.establishment_name || ""),
    ownership_type:           String(empR.ownership_type     || ""),
    employer_confidence_score: Number(empR.employer_confidence_score || 0),
  }

  return { ok: true, uan_details, recent_employment_details }
}

// ── Main handler ──────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  try {
    const { phone, user_id } = await req.json()

    if (!phone || !user_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "phone and user_id are required" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    // Validate phone — 10-digit Indian mobile
    const cleanPhone = phone.replace(/\D/g, "").replace(/^91/, "")
    if (!/^\d{10}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Please enter a valid 10-digit Indian mobile number." }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    const result = await fetchEpfoFromEko(cleanPhone)
    if (!result.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: result.error }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } },
      )
    }

    // ── Persist to Supabase (service role — bypasses RLS) ────────────────────
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Use most-confident UAN record for profile fields
    const best = result.uan_details?.sort((a, b) => b.source_score - a.source_score)[0]

    // 1. Update profiles
    await db.from("profiles").update({
      uan_number:      best?.uan       || "",
      uan_verified:    true,
      uan_verified_at: new Date().toISOString(),
      epfo_raw: {
        uan_details:              result.uan_details,
        recent_employment_details: result.recent_employment_details,
      },
    }).eq("id", user_id)

    // 2. Replace employment_history rows from EPFO
    await db.from("employment_history").delete()
      .eq("user_id", user_id).eq("source", "epfo")

    if (result.uan_details && result.uan_details.length > 0) {
      const rows = result.uan_details.map((u) => ({
        user_id,
        uan:              u.uan,
        employee_name:    u.employee_name,
        gender:           u.gender,
        dob:              u.dob || null,
        employer_name:    u.employer_name,
        establishment_id: u.establishment_id,
        date_of_joining:  u.joining_date || null,
        date_of_exit:     u.exit_date    || null,
        source:           "epfo",
        verified:         true,
      }))
      await db.from("employment_history").insert(rows)
    }

    return new Response(
      JSON.stringify({
        ok: true,
        uan_details:              result.uan_details,
        recent_employment_details: result.recent_employment_details,
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  } catch (err) {
    console.error("[verify-uan]", err)
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } },
    )
  }
})
