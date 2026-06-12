// ─── Razorpay client ─────────────────────────────────────────────────────────
import Razorpay from "razorpay"

let _client = null

const getRazorpay = () => {
  if (!_client) {
    _client = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID     || "",
      key_secret: process.env.RAZORPAY_KEY_SECRET || "",
    })
  }
  return _client
}

// Legacy function export
export function razorpay() { return getRazorpay() }

// Named export for Professional Path modules (used as: await razorpay.orders.create(...))
export const razorpayClient = new Proxy({}, {
  get(_, prop) {
    const rz = getRazorpay()
    const val = rz[prop]
    if (typeof val === "function") return val.bind(rz)
    return val
  }
})

// Amounts in paise (INR × 100). Must match frontend/src/config/plans.js
export const PLAN_PRICES = {
  // Student plans
  pro:          { amount:  29900, label: "Pro"          },
  elite:        { amount:  59900, label: "Elite"        },
  // Professional (Orbit) plans
  orbit_pro:    { amount:  39900, label: "Orbit Pro"    },
  orbit_elite:  { amount:  79900, label: "Orbit Elite"  },
  // Executive plans
  authority:    { amount: 149900, label: "Authority"    },
  luminary:     { amount: 299900, label: "Luminary"     },
  legacy:       { amount: 799900, label: "Legacy"       },
  // Organisation plans
  startup:      { amount: 149900, label: "Startup"      },
  campus:       { amount: 249900, label: "Campus"       },
  university:   { amount: 699900, label: "University"   },
}
