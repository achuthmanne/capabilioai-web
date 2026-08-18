/**
 * computeSummary.js — pure aggregation logic for the Arena activity report
 * ---------------------------------------------------------------------------
 * Extracted out of routes/arenaActivity.js so the calendar/streak/week math
 * can be unit tested without mocking Supabase — this function takes plain
 * event objects and a fixed "now", and returns the same shape the route
 * sends to the client.
 */
const CALENDAR_DAYS = 84 // 12 weeks, GitHub-style
const DAY_MS = 24 * 60 * 60 * 1000

function toUtcDateString(isoOrMs) {
  return new Date(isoOrMs).toISOString().slice(0, 10) // "YYYY-MM-DD"
}

/**
 * @param {Array<{date: string, elo: number, branch: "domain"|"college"}>} events
 * @param {number} nowMs — Date.now(), injectable for deterministic tests
 */
export function computeActivitySummary(events, nowMs = Date.now()) {
  const countsByDay = new Map()
  for (const e of events) {
    const day = toUtcDateString(e.date)
    countsByDay.set(day, (countsByDay.get(day) || 0) + 1)
  }

  const calendar = []
  for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
    const day = toUtcDateString(nowMs - i * DAY_MS)
    calendar.push({ date: day, count: countsByDay.get(day) || 0 })
  }

  const activeDays = new Set(countsByDay.keys())
  let currentStreak = 0
  for (let i = 0; i < CALENDAR_DAYS; i++) {
    const day = toUtcDateString(nowMs - i * DAY_MS)
    if (activeDays.has(day)) currentStreak++
    else if (i === 0) continue // today not yet active doesn't break a streak that ended yesterday
    else break
  }

  let longestStreak = 0
  let run = 0
  for (const c of calendar) {
    if (c.count > 0) { run++; longestStreak = Math.max(longestStreak, run) }
    else run = 0
  }

  const weekStart = nowMs - 7 * DAY_MS
  const weekEvents = events.filter(e => new Date(e.date).getTime() >= weekStart)
  const week = {
    missionsCompleted: weekEvents.filter(e => e.branch === "domain").length,
    experimentsCompleted: weekEvents.filter(e => e.branch === "college").length,
    eloEarned: weekEvents.reduce((sum, e) => sum + e.elo, 0),
  }

  return { calendar, streak: { current: currentStreak, longest: longestStreak }, week }
}
