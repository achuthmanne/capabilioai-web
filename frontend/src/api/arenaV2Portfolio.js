// arenaV2Portfolio.js — Arena V2 Pilot Phase: frontend client for the
// Portfolio & Recruiter Evidence API (backend Milestone 10, arenaV2Portfolio.js).
// Same centralized-client discipline as the other Arena V2 API clients.
import { requestJson } from "./arenaV2Client.js"

export async function fetchMyProofs() {
  return requestJson("/api/av2/portfolio/mine")
}

export async function fetchRecruiterEvidence(userId) {
  return requestJson(`/api/av2/portfolio/candidates/${encodeURIComponent(userId)}/evidence`)
}
