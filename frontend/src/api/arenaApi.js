// arenaApi.js — ✅ MIGRATED: process.env → import.meta.env (Vite)
const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

export const reviewAnswer = async ({ task, answer, output, testResults, userData }) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000)
  let res
  try {
    res = await fetch(`${SERVER}/api/arena/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        challenge: task,
        answer: String(answer || "").slice(0, 4000),
        output: String(output || "").slice(0, 2000),
        testResults: testResults || [],
        userContext: {
          eloRating:  userData?.elo_rating  || userData?.eloRating  || 800,
          domain:     userData?.domain      || userData?.keyword     || "swe",
          path:       userData?.path_type   || userData?.path        || "student",
          skillGraph: userData?.skill_graph || userData?.skillGraph  || [],
        },
      }),
    })
  } finally { clearTimeout(timer) }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Review API ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

export const generateHint = async ({ task, currentAnswer, userData }) => {
  const res = await fetch(`${SERVER}/api/arena/hint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      challenge: task,
      currentAnswer: String(currentAnswer || "").slice(0, 2000),
      eloRating: userData?.elo_rating || userData?.eloRating || 800,
    }),
  })
  if (!res.ok) throw new Error(`Hint API ${res.status}`)
  return res.json()
}
