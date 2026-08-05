// useRazorpay.js — Vite version (import.meta.env instead of process.env)
import { useEffect, useCallback } from "react"

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js"

// Read college invite context stored by JoinPage (same helper as plans.js)
const getInviteCtx = () => {
  try {
    const raw = sessionStorage.getItem("capabilio_invite")
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

const PLAN_LABELS = {
  pro:         "Pro",
  elite:       "Elite",
  orbit_pro:   "Capabilio Pro",
  orbit_elite: "Capabilio Elite",
}

function loadScript() {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${SCRIPT_URL}"]`)) { resolve(true); return }
    const s = document.createElement("script")
    s.src = SCRIPT_URL
    s.onload  = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export function useRazorpay() {
  useEffect(() => { loadScript() }, [])

  const openCheckout = useCallback(async ({
    planId, amount, orderId, currency = "INR",
    userEmail = "", userName = "", userPhone = "",
    onSuccess, onError,
  }) => {
    const loaded = await loadScript()
    if (!loaded || !window.Razorpay) {
      onError?.("Razorpay SDK failed to load."); return
    }

    // ✅ Vite uses import.meta.env.VITE_* (not process.env.REACT_APP_*)
    const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID
    if (!keyId) { onError?.("Razorpay key not configured."); return }

    const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com"

    // Build checkout description — mention college discount when applicable
    const inviteCtx     = getInviteCtx()
    const planLabel     = PLAN_LABELS[planId] ?? planId
    const description   = inviteCtx?.institution_label
      ? `${planLabel} — ${inviteCtx.institution_label} (${inviteCtx.discount_pct}% off)`
      : `${planLabel} Subscription`

    const themeColor = planId === "elite" || planId === "orbit_elite" ? "#B8620A" : "#3D4EAC"

    const rzp = new window.Razorpay({
      key:         keyId,
      amount,
      currency,
      order_id:    orderId,
      name:        "Capabilio AI",
      description,
      image:       "https://capabilio.online/logo192.png",
      // 2026-08-05 BUG FIX: prefill.contact was never set, so Razorpay
      // Checkout fell back to its own "returning customer" autofill — it
      // recognizes the browser via cookies tied to this key_id and shows
      // whatever phone number last completed a checkout on that browser
      // (in practice, whoever last tested payments, not the logged-in
      // user). Explicitly passing contact — even as an empty string when
      // no phone is on file — overrides that autofill instead of leaving
      // it to guess. userPhone is threaded through from the caller (see
      // Pricing.jsx/Onboarding.jsx/Arena.jsx), sourced from the real
      // logged-in user's auth/profile phone, never hardcoded.
      prefill: { name: userName, email: userEmail, contact: userPhone },
      theme: { color: themeColor },
      modal: { ondismiss: () => onError?.("Payment cancelled.") },
      handler: async (response) => {
        try {
          const verifyRes = await fetch(`${API}/api/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              planId,
              // Pass invite context so server can link student to institution after payment
              ...(inviteCtx ? {
                invite_code_id: inviteCtx.invite_code_id,
                institution_id: inviteCtx.institution_id,
              } : {}),
            }),
          })
          const data = await verifyRes.json()
          if (data.success) onSuccess?.(data)
          else onError?.(data.error || "Payment verification failed.")
        } catch (e) {
          onError?.("Payment verification failed. Contact support.")
        }
      },
    })

    rzp.on("payment.failed", (resp) => {
      onError?.(resp?.error?.description || "Payment failed.")
    })

    rzp.open()
  }, [])

  return { openCheckout }
}
