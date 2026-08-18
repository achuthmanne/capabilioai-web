import { useState, useEffect } from "react"

// Ticks once a second, returns { text, expired } counting down to `targetIso`.
// Used for both the daily-quota unlock countdown and per-mission time
// limits across both branches and every workspace — same primitive,
// multiple displays.
export function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!targetIso) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [targetIso])
  if (!targetIso) return { text: null, expired: false }
  const remainingMs = new Date(targetIso).getTime() - now
  const expired = remainingMs <= 0
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000))
  const h = String(Math.floor(totalSec / 3600)).padStart(2, "0")
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")
  const s = String(totalSec % 60).padStart(2, "0")
  return { text: `${h}:${m}:${s}`, expired }
}
