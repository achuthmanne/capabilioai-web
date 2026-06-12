/**
 * Capabilio Analytics — PostHog wrapper
 * All calls are no-ops if VITE_POSTHOG_KEY is not set (safe for local dev).
 */

const KEY  = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com"

let ph = null

export async function initAnalytics() {
  if (!KEY) return
  const posthog = (await import("posthog-js")).default
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "identified_only",   // don't create anonymous profiles
    capture_pageview: false,              // we fire page events manually (SPA)
    capture_pageleave: true,
    session_recording: {
      maskAllInputs: true,               // mask passwords / emails in recordings
    },
  })
  ph = posthog
}

/** Call once when a user signs in or is already active */
export function identifyUser(user, userData) {
  if (!ph) return
  ph.identify(user.id, {
    email:        user.email,
    name:         userData?.displayName || userData?.display_name || user.email,
    path:         userData?.path,
    keyword:      userData?.keyword,
    subscription: userData?.subscription || "free",
    elo_rating:   userData?.eloRating    || userData?.elo_rating || 0,
  })
}

/** Call on sign out */
export function resetAnalytics() {
  if (!ph) return
  ph.reset()
}

/** Generic event — use the named helpers below where possible */
export function track(event, props = {}) {
  if (!ph) return
  ph.capture(event, props)
}

// ── Named events ────────────────────────────────────────────────────────────

export const Analytics = {
  signedUp: (method = "email") =>
    track("user_signed_up", { method }),

  signedIn: (method = "email") =>
    track("user_signed_in", { method }),

  signedOut: () =>
    track("user_signed_out"),

  pageViewed: (page) =>
    track("page_viewed", { page }),

  onboardingStarted: (path) =>
    track("onboarding_started", { path }),

  onboardingCompleted: (props = {}) =>
    track("onboarding_completed", {
      path:         props.path,
      keyword:      props.keyword,
      subscription: props.subscription || "free",
      elo_rating:   props.eloRating || 0,
    }),

  planSelected: (plan) =>
    track("plan_selected", { plan }),

  assessmentCompleted: (props = {}) =>
    track("assessment_completed", {
      keyword:     props.keyword,
      score:       props.score,
      elo_rating:  props.eloRating || 0,
      skill_count: props.skillCount || 0,
    }),

  arenaTaskCompleted: (props = {}) =>
    track("arena_task_completed", {
      keyword:          props.keyword,
      task_title:       props.taskTitle,
      difficulty:       props.difficulty,
      elo_change:       props.eloChange,
      total_completed:  props.totalCompleted,
      streak:           props.streak,
    }),

  eloUpdated: (prev, next, reason) =>
    track("elo_updated", { prev_elo: prev, new_elo: next, reason }),
}
