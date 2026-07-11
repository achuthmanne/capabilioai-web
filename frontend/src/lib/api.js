/**
 * Capabilio API Client
 * Centralizes all API calls with auth token injection, error handling, and typed responses.
 */
import { supabase } from "./supabase"

const BASE = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function request(method, path, body = null, opts = {}) {
  const token = await getToken()
  const headers = { "Content-Type": "application/json" }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const config = { method, headers }
  if (body && method !== "GET") config.body = JSON.stringify(body)

  const url = path.startsWith("http") ? path : `${BASE}/api${path}`
  const res = await fetch(url, config)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

async function upload(path, formData) {
  const token = await getToken()
  const headers = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const url = `${BASE}/api${path}`
  const res = await fetch(url, { method: "POST", headers, body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }))
    throw new Error(err.error || `Upload failed: ${res.status}`)
  }
  return res.json()
}

// ══════════════════════════════════════════
// PROFESSIONAL PROFILE
// ══════════════════════════════════════════
export const profileApi = {
  get:         (uid) => request("GET", `/pro/profile/${uid}`),
  update:      (data) => request("POST", "/pro/profile", data),
  uploadPhoto: (file, type = "profile") => {
    const fd = new FormData(); fd.append("photo", file); fd.append("type", type)
    return upload("/pro/photo", fd)
  },
  setVisibility: (mode) => request("POST", "/pro/visibility", { mode }),
  recomputeElo:  ()     => request("POST", "/pro/elo/recompute"),
}

// ══════════════════════════════════════════
// EPFO VERIFICATION
// ══════════════════════════════════════════
export const epfoApi = {
  submit: (uan, employerList = []) => request("POST", "/pro/epfo/submit", { uan, employerList }),
  status: () => request("GET", "/pro/epfo/status"),
}

// ══════════════════════════════════════════
// CAREER TIMELINE
// ══════════════════════════════════════════
export const timelineApi = {
  list:          ()      => request("GET", "/pro/timeline"),
  create:        (data)  => request("POST", "/pro/timeline", data),
  update:        (id, d) => request("PUT", `/pro/timeline/${id}`, d),
  remove:        (id)    => request("DELETE", `/pro/timeline/${id}`),
  approveChange: (id)    => request("POST", `/pro/timeline/${id}/approve-change`),
  rejectChange:  (id)    => request("POST", `/pro/timeline/${id}/reject-change`),
}

// ══════════════════════════════════════════
// VAULT
// ══════════════════════════════════════════
export const vaultApi = {
  list:   () => request("GET", "/pro/vault"),
  upload: (file, docType, tags = [], isPrivate = false) => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("doc_type", docType)
    fd.append("tags", JSON.stringify(tags))
    fd.append("is_private", String(isPrivate))
    return upload("/pro/vault/upload", fd)
  },
  getUrl:  (id) => request("GET", `/pro/vault/${id}/url`),
  remove:  (id) => request("DELETE", `/pro/vault/${id}`),
}

// ══════════════════════════════════════════
// SKILL GRAPH
// ══════════════════════════════════════════
export const skillsApi = {
  list:          () => request("GET", "/pro/skills"),
  add:           (data) => request("POST", "/pro/skills", data),
  bulkUpsert:    (skills, source = "resume") => request("POST", "/pro/skills/bulk", { skills, source }),
  update:        (id, data) => request("PUT", `/pro/skills/${id}`, data),
  remove:        (id) => request("DELETE", `/pro/skills/${id}`),
  submitProof:   (id, data) => request("POST", `/pro/skills/${id}/proof`, data),
  getGaps:       (targetRole) => request("GET", `/pro/skills/gaps${targetRole ? `?target_role=${encodeURIComponent(targetRole)}` : ""}`),
  enrichIcons:   () => request("POST", "/pro/skills/enrich-icons"),
}

// ══════════════════════════════════════════
// FORGE
// ══════════════════════════════════════════
export const forgeApi = {
  init:           (tracks) => request("POST", "/pro/forge/init", { tracks }),
  list:           (track)  => request("GET", `/pro/forge${track ? `?track=${track}` : ""}`),
  update:         (id, data) => request("PUT", `/pro/forge/${id}`, data),
  submit:         (id, data) => request("POST", `/pro/forge/${id}/submit`, data),
  evaluate:       (id, submission_id) => request("POST", `/pro/forge/${id}/evaluate`, { submission_id }),
  getSubmissions: (id) => request("GET", `/pro/forge/${id}/submissions`),
}

// ══════════════════════════════════════════
// AI INTERVIEW
// ══════════════════════════════════════════
export const interviewApi = {
  start:    (data) => request("POST", "/pro/interview/start", data),
  getSession: (id) => request("GET", `/pro/interview/${id}`),
  answer:   (id, data) => request("POST", `/pro/interview/${id}/answer`, data),
  complete: (id)  => request("POST", `/pro/interview/${id}/complete`),
  history:  () => request("GET", "/pro/interview/history"),
}

// ══════════════════════════════════════════
// JOBS & APPLICATIONS
// ══════════════════════════════════════════
export const jobsApi = {
  list:         (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/jobs/list${qs ? `?${qs}` : ""}`)
  },
  getJob:       (id) => request("GET", `/jobs/${id}`),
  create:       (data) => request("POST", "/jobs", data),
  apply:        (jobId) => request("POST", `/jobs/${jobId}/apply`),
  applications: () => request("GET", "/jobs/applications"),
  saveJob:      (jobId, action = "save") => request("POST", "/jobs/save", { job_id: jobId, action }),
  savedJobs:    () => request("GET", "/jobs/saved"),
}

// ══════════════════════════════════════════
// RECRUITER COMMS
// ══════════════════════════════════════════
export const recruiterApi = {
  messages:       (box = "inbox") => request("GET", `/recruiter/messages?box=${box}`),
  sendMessage:    (data) => request("POST", "/recruiter/messages", data),
  scheduleInterview: (data) => request("POST", "/recruiter/schedule", data),
  schedules:      () => request("GET", "/recruiter/schedules"),
  updateSchedule: (id, data) => request("PUT", `/recruiter/schedule/${id}`, data),
}

export const offersApi = {
  send:    (data) => request("POST", "/offers", data),
  list:    (asRecruiter) => request("GET", `/offers${asRecruiter ? "?as=recruiter" : ""}`),
  respond: (id, response) => request("PUT", `/offers/${id}/respond`, { response }),
}

// ══════════════════════════════════════════
// MENTOR HUB
// ══════════════════════════════════════════
export const mentorApi = {
  listMentors:    (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/mentors${qs ? `?${qs}` : ""}`)
  },
  getMentor:      (id) => request("GET", `/mentors/${id}`),
  updateProfile:  (data) => request("POST", "/mentors/profile", data),
  createBooking:  (data) => request("POST", "/mentors/bookings", data),
  myBookings:     (asMentor) => request("GET", `/mentors/bookings/mine${asMentor ? "?as=mentor" : ""}`),
  updateBooking:  (id, data) => request("PUT", `/mentors/bookings/${id}`, data),
  payouts:        () => request("GET", "/mentors/payouts"),
  requestPayout:  () => request("POST", "/mentors/payouts/request"),
}

// ══════════════════════════════════════════
// PULSE (SOCIAL FEED)
// ══════════════════════════════════════════
export const pulseApi = {
  feed:          (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/pulse/feed${qs ? `?${qs}` : ""}`)
  },
  createPost:    (data) => request("POST", "/pulse/posts", data),
  updatePost:    (id, data) => request("PUT", `/pulse/posts/${id}`, data),
  deletePost:    (id) => request("DELETE", `/pulse/posts/${id}`),
  interact:      (postId, action) => request("POST", `/pulse/posts/${postId}/interact`, { action }),
  comments:      (postId) => request("GET", `/pulse/posts/${postId}/comments`),
  addComment:    (postId, content, parentId) => request("POST", `/pulse/posts/${postId}/comments`, { content, parent_id: parentId }),
  // New routes
  builders:      (domain = "", elo = 400, limit = 8) => {
    const qs = new URLSearchParams({ domain, elo, limit }).toString()
    return request("GET", `/pulse/builders?${qs}`)
  },
  mentors:       (domain = "", limit = 5) => {
    const qs = new URLSearchParams({ domain, limit }).toString()
    return request("GET", `/pulse/mentors?${qs}`)
  },
  followingFeed: (page = 1, sort = "created_at") => {
    const qs = new URLSearchParams({ page, limit: 15, sort }).toString()
    return request("GET", `/pulse/following-feed?${qs}`)
  },
  saved:         (page = 1) => {
    const qs = new URLSearchParams({ page, limit: 15 }).toString()
    return request("GET", `/pulse/saved?${qs}`)
  },
  // AI market insights + tech news via Gemini Search (server-cached 2hr per domain)
  marketInsights: (domain = "software engineering", role = "Software Engineer") => {
    const qs = new URLSearchParams({ domain, role }).toString()
    return request("GET", `/pulse/market-insights?${qs}`)
  },
}

// ══════════════════════════════════════════
// NEXUS (NETWORK)
// ══════════════════════════════════════════
export const nexusApi = {
  search:      (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/nexus/search${qs ? `?${qs}` : ""}`)
  },
  getProfile:   (uid) => request("GET", `/nexus/profile/${uid}`),
  connect:      (uid, message) => request("POST", "/nexus/connect", { addressee_id: uid, message }),
  respond:      (id, status) => request("PUT", `/nexus/connect/${id}`, { status }),
  follow:       (uid) => request("POST", "/nexus/follow", { following_id: uid }),
  unfollow:     (uid) => request("DELETE", `/nexus/follow/${uid}`),
  connections:  () => request("GET", "/nexus/connections"),
  notifications: () => request("GET", "/nexus/notifications"),
  markRead:     (ids) => request("POST", "/nexus/notifications/read", { ids }),
}

// ══════════════════════════════════════════
// ORBIT PLANS
// ══════════════════════════════════════════
export const orbitApi = {
  plans:           () => request("GET", "/orbit/plans"),
  createOrder:     (plan_id, billing_cycle, coupon_code) => request("POST", "/orbit/order", { plan_id, billing_cycle, coupon_code }),
  verifyPayment:   (data) => request("POST", "/orbit/verify", data),
  status:          () => request("GET", "/orbit/status"),
  validateCoupon:  (code, plan_id) => request("POST", "/orbit/coupon/validate", { code, plan_id }),
}

// ══════════════════════════════════════════
// CAREER INTELLIGENCE
// ══════════════════════════════════════════
export const intelApi = {
  generateReport: (report_type) => request("POST", "/intel/report", { report_type }),
  listReports:    () => request("GET", "/intel/reports"),
  getReport:      (id) => request("GET", `/intel/reports/${id}`),
}

// ══════════════════════════════════════════
// HARDWARE CHALLENGES (ECE / IoT / Mech / Civil)
// ══════════════════════════════════════════
export const hardwareApi = {
  list:       (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/hardware/challenges${qs ? `?${qs}` : ""}`)
  },
  get:        (id) => request("GET", `/hardware/challenges/${id}`),
  attempt:    (id, answer) => request("POST", `/hardware/challenges/${id}/attempt`, { answer }),
  myAttempts: () => request("GET", "/hardware/my-attempts"),
  like:       (id) => request("POST", `/hardware/challenges/${id}/like`),
}

// ══════════════════════════════════════════
// RESUME PARSING (existing)
// ══════════════════════════════════════════
export const resumeApi = {
  parsePdf: (file) => {
    const fd = new FormData(); fd.append("resume", file)
    return upload("/extract-pdf", fd)
  },
  parseLinkedin: (url) => request("POST", "/extract-linkedin", { url }),
}
