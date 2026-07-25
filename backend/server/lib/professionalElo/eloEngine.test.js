import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  computePulseEloDelta, computeFreshnessDecay, applyPulseCompletionToElo, applyPendingDecay,
  getOrCreateEloState, STARTING_ELO, MIN_ELO, MAX_ELO,
} from './eloEngine.js'

describe('computePulseEloDelta — bounded per-pulse math', () => {
  test('all correct answers produce a positive delta', () => {
    const { cappedDelta } = computePulseEloDelta([{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }])
    assert.ok(cappedDelta > 0)
  })

  test('all incorrect answers produce a negative delta', () => {
    const { cappedDelta } = computePulseEloDelta([{ isCorrect: false }, { isCorrect: false }])
    assert.ok(cappedDelta < 0)
  })

  test('an even split nets close to zero', () => {
    const { cappedDelta } = computePulseEloDelta([{ isCorrect: true }, { isCorrect: false }])
    assert.equal(cappedDelta, 0)
  })

  test('harder questions move ELO more than easier ones (same correctness)', () => {
    const easy = computePulseEloDelta([{ isCorrect: true, difficulty: 1 }])
    const hard = computePulseEloDelta([{ isCorrect: true, difficulty: 5 }])
    assert.ok(hard.cappedDelta > easy.cappedDelta)
  })

  test('a large number of correct answers is still capped at the per-pulse max', () => {
    const answered = Array.from({ length: 30 }, () => ({ isCorrect: true, difficulty: 5 }))
    const { cappedDelta, capped } = computePulseEloDelta(answered)
    assert.equal(capped, true)
    assert.ok(cappedDelta <= 40)
  })

  test('missing/invalid difficulty defaults to neutral (3), never throws', () => {
    assert.doesNotThrow(() => computePulseEloDelta([{ isCorrect: true, difficulty: undefined }, { isCorrect: true, difficulty: 99 }]))
  })
})

describe('computeFreshnessDecay — bounded inactivity decay', () => {
  test('no decay within the 14-day grace period', () => {
    assert.deepEqual(computeFreshnessDecay(14), { decayDays: 0, delta: 0 })
    assert.deepEqual(computeFreshnessDecay(0), { decayDays: 0, delta: 0 })
  })

  test('decay begins on day 15', () => {
    const { decayDays, delta } = computeFreshnessDecay(15)
    assert.equal(decayDays, 1)
    assert.ok(delta < 0)
  })

  test('decay-day count is capped even after a very long absence', () => {
    const oneYear = computeFreshnessDecay(365)
    const twoYears = computeFreshnessDecay(730)
    assert.equal(oneYear.decayDays, twoYears.decayDays, 'both should hit the same MAX_DECAY_DAYS cap')
    assert.ok(oneYear.decayDays <= 30)
  })
})

describe('applyPulseCompletionToElo + applyPendingDecay + getOrCreateEloState — DB-facing, fake supabaseAdmin', () => {
  function makeFakeDb() {
    const state = new Map() // user_id -> row
    const events = []
    function chain(table) {
      const s = { table, filters: {}, order: null }
      const api = {
        select() { return api },
        eq(col, val) { s.filters[col] = val; return api },
        order(col, opts) { s.order = { col, opts }; return api },
        limit() { return api },
        async maybeSingle() {
          if (table === 'professional_elo_state') return { data: state.get(s.filters.user_id) || null, error: null }
          return { data: null, error: null }
        },
        async single() {
          if (table === 'professional_elo_state') return { data: state.get(s.filters.user_id), error: null }
          return { data: null, error: null }
        },
        insert(row) {
          return {
            select() {
              return {
                async single() {
                  if (table === 'professional_elo_state') {
                    if (state.has(row.user_id)) return { data: null, error: { message: 'duplicate key', code: '23505' } }
                    state.set(row.user_id, { ...row })
                    return { data: { ...row }, error: null }
                  }
                  return { data: null, error: null }
                },
              }
            },
            then(resolve) {
              if (table === 'professional_elo_events') { events.push(row); return resolve({ data: [row], error: null }) }
              return resolve({ data: [row], error: null })
            },
          }
        },
        update(patch) {
          return {
            eq(col, val) {
              if (table === 'professional_elo_state') {
                const existing = state.get(val)
                if (existing) state.set(val, { ...existing, ...patch })
              }
              return Promise.resolve({ data: null, error: null })
            },
          }
        },
      }
      return api
    }
    return { from: (t) => chain(t), _state: state, _events: events }
  }

  test('first-time user gets STARTING_ELO via getOrCreateEloState', async () => {
    const db = makeFakeDb()
    const state = await getOrCreateEloState(db, 'user-1')
    assert.equal(state.elo, STARTING_ELO)
  })

  test('a strong pulse increases ELO and records an event with old/new/delta/reason/next_action', async () => {
    const db = makeFakeDb()
    await getOrCreateEloState(db, 'user-2')
    const result = await applyPulseCompletionToElo(db, {
      userId: 'user-2', pulseId: 'pulse-1',
      answered: [{ isCorrect: true }, { isCorrect: true }, { isCorrect: true }],
      correctCount: 3, questionCount: 3,
      skillsRefreshed: [{ skill_id: 's1', skill_name: 'SQL', delta: 5 }],
      skillsToRevisit: [],
    })
    assert.equal(result.oldElo, STARTING_ELO)
    assert.ok(result.newElo > result.oldElo)
    assert.ok(result.delta > 0)
    assert.ok(result.reason.includes('3/3 correct'))
    assert.ok(result.nextAction.length > 0)
    assert.equal(db._events.length, 1)
    assert.equal(db._events[0].event_type, 'assessment_correct')
  })

  test('a weak pulse decreases ELO and event_type is assessment_incorrect', async () => {
    const db = makeFakeDb()
    await getOrCreateEloState(db, 'user-3')
    const result = await applyPulseCompletionToElo(db, {
      userId: 'user-3', pulseId: 'pulse-2',
      answered: [{ isCorrect: false }, { isCorrect: false }, { isCorrect: true }],
      correctCount: 1, questionCount: 3,
      skillsRefreshed: [],
      skillsToRevisit: [{ skill_id: 's2', skill_name: 'Excel', delta: -5 }],
    })
    assert.ok(result.delta < 0)
    assert.equal(db._events[0].event_type, 'assessment_incorrect')
    assert.ok(result.nextAction.toLowerCase().includes('excel'))
  })

  test('ELO never drops below MIN_ELO even after many weak pulses', async () => {
    const db = makeFakeDb()
    await getOrCreateEloState(db, 'user-4')
    for (let i = 0; i < 50; i++) {
      await applyPulseCompletionToElo(db, {
        userId: 'user-4', pulseId: `p${i}`,
        answered: Array.from({ length: 15 }, () => ({ isCorrect: false, difficulty: 5 })),
        correctCount: 0, questionCount: 15, skillsRefreshed: [], skillsToRevisit: [],
      })
    }
    const final = db._state.get('user-4')
    assert.ok(final.elo >= MIN_ELO)
  })

  test('applyPendingDecay is a no-op for a recently-active user', async () => {
    const db = makeFakeDb()
    await getOrCreateEloState(db, 'user-5')
    const result = await applyPendingDecay(db, 'user-5')
    assert.equal(result.applied, false)
  })

  test('applyPendingDecay reduces ELO for a user inactive 20 days and logs a decay event', async () => {
    const db = makeFakeDb()
    await getOrCreateEloState(db, 'user-6')
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    db._state.set('user-6', { ...db._state.get('user-6'), last_assessment_at: twentyDaysAgo, created_at: twentyDaysAgo })

    const result = await applyPendingDecay(db, 'user-6')
    assert.equal(result.applied, true)
    assert.ok(result.delta < 0)
    assert.ok(result.elo < STARTING_ELO)
    const decayEvent = db._events.find(e => e.event_type === 'decay')
    assert.ok(decayEvent)
    assert.ok(!decayEvent.reason.toLowerCase().includes('assessment'), 'user-facing decay reason must not use the word "assessment" (product naming rule)')
  })
})
