// ─── Pinecone vector database client ─────────────────────────────────────────
// USE CASES:
//   1. Semantic job-to-profile matching (Arena + Launchpad)
//   2. "Challenges similar to this" recommendations
//   3. Peer benchmarking — find professionals with similar skill vectors
//   4. Skill gap similarity — which domain gaps are most similar to yours
//
// Setup needed (one-time):
//   1. Create an index at app.pinecone.io → name: "capabilio", dims: 1536
//   2. Add PINECONE_API_KEY + PINECONE_HOST to .env
//   3. Call upsertProfile(uid, vector) after each Arena submission

const host = () => process.env.PINECONE_HOST  // e.g. https://capabilio-xxxx.svc.us-east1-gcp.pinecone.io
const key  = () => process.env.PINECONE_API_KEY

function headers() {
  return { "Api-Key": key(), "Content-Type": "application/json" }
}

// ── Upsert a profile/skill vector ─────────────────────────────────────────────
// vector: float32[] of length 1536 (from OpenAI text-embedding-3-small)
export async function upsertVector(id, vector, metadata = {}) {
  if (!host() || !key()) return null
  const res = await fetch(`${host()}/vectors/upsert`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ vectors: [{ id, values: vector, metadata }] }),
  })
  return res.ok
}

// ── Query — find top-k similar vectors ────────────────────────────────────────
export async function querySimilar(vector, { topK = 5, filter = {}, namespace = "" } = {}) {
  if (!host() || !key()) return []
  const res = await fetch(`${host()}/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ vector, topK, includeMetadata: true, filter, namespace }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.matches || []
}

// ── Embed text using OpenAI text-embedding-3-small ────────────────────────────
// 1536 dims, $0.00002 / 1000 tokens — extremely cheap
export async function embedText(text) {
  const k = process.env.OPENAI_API_KEY
  if (!k) throw new Error("OPENAI_API_KEY required for embeddings")

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${k}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text.slice(0, 8000) }),
  })
  if (!res.ok) throw new Error(`OpenAI embed ${res.status}`)
  const data = await res.json()
  return data.data?.[0]?.embedding || []
}

// ── Convenience: embed + upsert a user's skill profile ───────────────────────
// Call after Arena submission or profile update
export async function upsertProfile(uid, { skills = [], domain = "", elo = 800, path = "student" }) {
  try {
    const text   = `${domain} developer. Skills: ${skills.join(", ")}. ELO: ${elo}`
    const vector = await embedText(text)
    return upsertVector(`profile_${uid}`, vector, { uid, domain, elo, path, skills: skills.join("|") })
  } catch (e) { console.warn("[pinecone] upsertProfile:", e.message); return null }
}

// ── Find similar profiles (peer benchmarking) ─────────────────────────────────
export async function findSimilarProfiles(uid, { skills = [], domain = "", elo = 800 }) {
  try {
    const text    = `${domain} developer. Skills: ${skills.join(", ")}. ELO: ${elo}`
    const vector  = await embedText(text)
    const matches = await querySimilar(vector, {
      topK:   10,
      filter: { uid: { $ne: uid } },   // exclude self
    })
    return matches.map(m => ({ uid: m.metadata?.uid, domain: m.metadata?.domain, elo: m.metadata?.elo, score: m.score }))
  } catch (e) { console.warn("[pinecone] findSimilarProfiles:", e.message); return [] }
}

// ── Recommend Arena challenges semantically ────────────────────────────────────
export async function recommendChallenges(userSkills, domain) {
  try {
    const text    = `${domain} challenges for: ${userSkills.join(", ")}`
    const vector  = await embedText(text)
    const matches = await querySimilar(vector, { topK: 5, namespace: "challenges" })
    return matches.map(m => m.metadata)
  } catch (e) { console.warn("[pinecone] recommendChallenges:", e.message); return [] }
}
