// arenaV2Library.js — Arena V2 Pilot Phase: frontend client for read-only
// Challenge Library endpoints the pilot workspace needs (skill graph, and
// the student's own skill-progress/ELO state for the Career Skills radar).
// Same centralized-client discipline as arenaV2Delivery.js/arenaV2Submission.js
// — everything routes through arenaV2Client.js's requestJson.
import { requestJson } from "./arenaV2Client.js"

export async function fetchSkillGraph(role, careerFamily = "IT") {
  return requestJson(`/api/av2/library/skill-graphs/${encodeURIComponent(role)}?careerFamily=${encodeURIComponent(careerFamily)}`)
}

export async function fetchMyProgress({ role, careerFamily = "IT" }) {
  const params = new URLSearchParams({ careerFamily })
  if (role) params.set("role", role)
  return requestJson(`/api/av2/library/my-progress?${params.toString()}`)
}
