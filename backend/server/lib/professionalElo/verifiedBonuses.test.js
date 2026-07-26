import { test, describe } from "node:test"
import assert from "node:assert/strict"
import {
  recomputeExperienceBonus, recomputeCertBonus, computeExperienceBonus,
  computeCertBonusFromVerifiedList, MAX_EXPERIENCE_BONUS, MAX_CERT_BONUS,
} from "./verifiedBonuses.js"
import { STARTING_ELO } from "./eloEngine.js"

// ── Fake multi-table Supabase-like DB ───────────────────────────────────────
// Same chainable-mock pattern as eloEngine.test.js's makeFakeDb(), extended
// to cover the extra tables verifiedBonuses.js reads/writes:
// professional_profiles, epf_records, profiles, professional_certifications.
function makeFakeDb(seed = {}) {
  const tables = {
    professional_profiles: new Map(seed.professionalProfiles || []),
    epf_records: seed.epfRecords || [],
    profiles: new Map(seed.profiles || []),
    professional_elo_state: new Map(seed.eloState || []),
    professional_elo_events: [],
    professional_certifications: seed.certifications || [],
  }

  function chain(table) {
    const s = { filters: {} }
    const api = {
      select() { return api },
      eq(col, val) { s.filters[col] = val; return api },
      async maybeSingle() {
        if (table === "professional_profiles") {
          const row = tables.professional_profiles.get(s.filters.user_id)
          return { data: row || null, error: null }
        }
        if (table === "profiles") {
          const row = tables.profiles.get(s.filters.id)
          return { data: row || null, error: null }
        }
        if (table === "professional_elo_state") {
          const row = tables.professional_elo_state.get(s.filters.user_id)
          return { data: row || null, error: null }
        }
        return { data: null, error: null }
      },
      then(resolve) {
        // Used as an awaited terminal (no .maybeSingle()/.single() call) —
        // matches how verifiedBonuses.js reads epf_records / certifications
        // as arrays via `const { data } = await db.from(...).select(...).eq(...)`.
        if (table === "epf_records") {
          const rows = tables.epf_records.filter(r => r.professional_profile_id === s.filters.professional_profile_id)
          return resolve({ data: rows, error: null })
        }
        if (table === "professional_certifications") {
          let rows = tables.professional_certifications.filter(r => r.user_id === s.filters.user_id)
          if (s.filters.verification_status) rows = rows.filter(r => r.verification_status === s.filters.verification_status)
          return resolve({ data: rows, error: null })
        }
        return resolve({ data: [], error: null })
      },
      update(patch) {
        return {
          eq(col, val) {
            if (table === "professional_elo_state") {
              const existing = tables.professional_elo_state.get(val)
              if (existing) tables.professional_elo_state.set(val, { ...existing, ...patch })
            }
            return Promise.resolve({ data: null, error: null })
          },
        }
      },
      insert(row) {
        if (table === "professional_elo_events") tables.professional_elo_events.push(row)
        return Promise.resolve({ data: [row], error: null })
      },
    }
    return api
  }

  return { from: (t) => chain(t), _tables: tables }
}

describe("computeExperienceBonus — diminishing-returns guidance table", () => {
  test("0 years is 0 bonus", () => assert.equal(computeExperienceBonus(0), 0))
  test("exact-year thresholds match the guidance table", () => {
    assert.equal(computeExperienceBonus(1), 20)
    assert.equal(computeExperienceBonus(2), 35)
    assert.equal(computeExperienceBonus(3), 50)
    assert.equal(computeExperienceBonus(5), 75)
    assert.equal(computeExperienceBonus(7), 90)
    assert.equal(computeExperienceBonus(10), 110)
    assert.equal(computeExperienceBonus(15), 130)
    assert.equal(computeExperienceBonus(20), 150)
  })
  test("between-threshold years use the highest met step, not interpolation", () => {
    assert.equal(computeExperienceBonus(4), 50) // still at the "3 years" step until 5
    assert.equal(computeExperienceBonus(9), 90) // still at "7 years" step until 10
  })
  test("never exceeds MAX_EXPERIENCE_BONUS even for huge inputs", () => {
    assert.equal(computeExperienceBonus(100), MAX_EXPERIENCE_BONUS)
  })
})

describe("computeCertBonusFromVerifiedList — capped sum of verified certs", () => {
  test("empty list is 0", () => assert.equal(computeCertBonusFromVerifiedList([]), 0))
  test("sums recognized cert_type values", () => {
    assert.equal(computeCertBonusFromVerifiedList([{ cert_type: "aws_professional" }, { cert_type: "ceh" }]), 28)
  })
  test("unrecognized cert_type contributes 0, not a fallback guess", () => {
    assert.equal(computeCertBonusFromVerifiedList([{ cert_type: "made_up_cert" }]), 0)
  })
  test("caps total at MAX_CERT_BONUS even with many high-value certs", () => {
    const many = Array.from({ length: 10 }, () => ({ cert_type: "oscp" })) // 10 x 20 = 200
    assert.equal(computeCertBonusFromVerifiedList(many), MAX_CERT_BONUS)
  })
})

describe("recomputeExperienceBonus — trust-gated on EPFO verification", () => {
  test("unverified EPFO gives 0 experience bonus even with years_of_experience set", async () => {
    const db = makeFakeDb({
      professionalProfiles: [["user-1", { id: "pp-1", user_id: "user-1" }]],
      epfRecords: [{ professional_profile_id: "pp-1", verification_status: "in_progress" }],
      profiles: [["user-1", { years_of_experience: 8 }]],
      eloState: [["user-1", { user_id: "user-1", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const result = await recomputeExperienceBonus(db, "user-1")
    assert.equal(result.applied, false)
    assert.equal(db._tables.professional_elo_state.get("user-1").experience_bonus_elo, 0)
  })

  test("verified EPFO with years_of_experience unlocks the matching guidance-table bonus", async () => {
    const db = makeFakeDb({
      professionalProfiles: [["user-2", { id: "pp-2", user_id: "user-2" }]],
      epfRecords: [{ professional_profile_id: "pp-2", verification_status: "verified" }],
      profiles: [["user-2", { years_of_experience: 5 }]],
      eloState: [["user-2", { user_id: "user-2", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const result = await recomputeExperienceBonus(db, "user-2")
    assert.equal(result.applied, true)
    assert.equal(result.newBonus, 75)
    assert.equal(db._tables.professional_elo_state.get("user-2").experience_bonus_elo, 75)
    assert.equal(db._tables.professional_elo_events.length, 1)
    assert.equal(db._tables.professional_elo_events[0].event_type, "experience_bonus_recompute")
  })

  test("duplicate verification callback (same verified state) is idempotent — no double count, no duplicate event", async () => {
    const db = makeFakeDb({
      professionalProfiles: [["user-3", { id: "pp-3", user_id: "user-3" }]],
      epfRecords: [{ professional_profile_id: "pp-3", verification_status: "verified" }],
      profiles: [["user-3", { years_of_experience: 3 }]],
      eloState: [["user-3", { user_id: "user-3", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const first = await recomputeExperienceBonus(db, "user-3")
    const second = await recomputeExperienceBonus(db, "user-3")
    assert.equal(first.applied, true)
    assert.equal(first.newBonus, 50)
    assert.equal(second.applied, false, "second call with unchanged verified state must be a no-op")
    assert.equal(db._tables.professional_elo_events.length, 1, "must not insert a second event for an unchanged bonus")
    assert.equal(db._tables.professional_elo_state.get("user-3").experience_bonus_elo, 50)
  })

  test("no professional_profiles row at all (never submitted EPFO) yields 0 bonus, not an error", async () => {
    const db = makeFakeDb({
      eloState: [["user-4", { user_id: "user-4", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
      profiles: [["user-4", { years_of_experience: 10 }]],
    })
    const result = await recomputeExperienceBonus(db, "user-4")
    assert.equal(result.applied, false)
    assert.equal(db._tables.professional_elo_state.get("user-4").experience_bonus_elo, 0)
  })
})

describe("recomputeCertBonus — trust-gated on per-certificate verification", () => {
  test("claimed (unverified) certificates contribute 0 bonus", async () => {
    const db = makeFakeDb({
      certifications: [{ user_id: "user-5", cert_type: "aws_professional", verification_status: "claimed" }],
      eloState: [["user-5", { user_id: "user-5", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const result = await recomputeCertBonus(db, "user-5")
    assert.equal(result.applied, false)
    assert.equal(db._tables.professional_elo_state.get("user-5").cert_bonus_elo, 0)
  })

  test("verified certificates sum into cert_bonus_elo and log one event", async () => {
    const db = makeFakeDb({
      certifications: [
        { user_id: "user-6", cert_type: "aws_professional", verification_status: "verified" },
        { user_id: "user-6", cert_type: "cka", verification_status: "verified" },
        { user_id: "user-6", cert_type: "udemy", verification_status: "claimed" }, // not verified — excluded
      ],
      eloState: [["user-6", { user_id: "user-6", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const result = await recomputeCertBonus(db, "user-6")
    assert.equal(result.applied, true)
    assert.equal(result.newBonus, 35) // 18 (aws_professional) + 17 (cka)
    assert.equal(db._tables.professional_elo_events.length, 1)
    assert.equal(db._tables.professional_elo_events[0].event_type, "cert_bonus_recompute")
  })

  test("rejected certification is excluded from the bonus", async () => {
    const db = makeFakeDb({
      certifications: [{ user_id: "user-7", cert_type: "oscp", verification_status: "rejected" }],
      eloState: [["user-7", { user_id: "user-7", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    const result = await recomputeCertBonus(db, "user-7")
    assert.equal(result.applied, false)
    assert.equal(db._tables.professional_elo_state.get("user-7").cert_bonus_elo, 0)
  })

  test("duplicate verify callback for the same verified cert set is idempotent", async () => {
    const db = makeFakeDb({
      certifications: [{ user_id: "user-8", cert_type: "rhce", verification_status: "verified" }],
      eloState: [["user-8", { user_id: "user-8", elo: STARTING_ELO, experience_bonus_elo: 0, cert_bonus_elo: 0 }]],
    })
    await recomputeCertBonus(db, "user-8")
    const second = await recomputeCertBonus(db, "user-8")
    assert.equal(second.applied, false)
    assert.equal(db._tables.professional_elo_events.length, 1)
  })
})

describe("Professional registration baseline (Skill Rating v2)", () => {
  test("STARTING_ELO is the new 800 professional baseline", () => {
    assert.equal(STARTING_ELO, 800)
  })
})
