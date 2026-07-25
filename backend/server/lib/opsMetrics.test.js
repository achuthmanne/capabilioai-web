import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { recordRequest, getMetricsSnapshot, checkAndLogAlerts } from './opsMetrics.js'

describe('opsMetrics — request grouping and error-rate/latency aggregation', () => {
  test('groups a "/api/<area>/v1/<module>/..." path by its first 4 segments, and computes error rate', () => {
    const area = `testarea${Date.now()}`
    const path = `/api/${area}/v1/mentor/me/bookings`
    const expectedGroup = `/api/${area}/v1/mentor`
    for (let i = 0; i < 8; i++) recordRequest(path, 200, 50)
    for (let i = 0; i < 2; i++) recordRequest(path, 500, 900)

    const snap = getMetricsSnapshot({})
    const g = snap.groups.find(x => x.group === expectedGroup)
    assert.ok(g, `expected group ${expectedGroup} to be present in snapshot`)
    assert.equal(g.requestCount, 10)
    assert.equal(g.errorCount, 2)
    assert.equal(g.errorRate, 0.2)
  })

  test('a plain 3-segment path groups by itself exactly', () => {
    const path = `/api/copilot-test-${Date.now()}/coach`
    recordRequest(path, 200, 10)
    const snap = getMetricsSnapshot({})
    assert.ok(snap.groups.find(x => x.group === path))
  })

  test('4xx responses count as clientErrorCount, not errorCount (5xx only)', () => {
    const path = `/api/test-4xx-${Date.now()}/x`
    recordRequest(path, 404, 10)
    recordRequest(path, 403, 10)
    recordRequest(path, 200, 10)

    const snap = getMetricsSnapshot({})
    const g = snap.groups.find(x => x.group === path)
    assert.equal(g.errorCount, 0)
    assert.equal(g.clientErrorCount, 2)
  })

  test('checkAndLogAlerts fires only when error rate crosses threshold AND sample size is meaningful', () => {
    const pathBig = `/api/test-alert-big-${Date.now()}/x`
    const pathSmall = `/api/test-alert-small-${Date.now()}/x`
    for (let i = 0; i < 20; i++) recordRequest(pathBig, i < 5 ? 500 : 200, 10) // 25% error rate, 20 samples
    recordRequest(pathSmall, 500, 10) // 100% error rate but only 1 sample — should NOT alert

    const snap = getMetricsSnapshot({})
    const fired = checkAndLogAlerts(snap, { errorRateThreshold: 0.1, minRequests: 10 })
    const groups = fired.map(f => f.group)
    assert.ok(groups.includes(pathBig), 'high-error-rate, well-sampled group should alert')
    assert.ok(!groups.includes(pathSmall), 'high-error-rate but tiny-sample group should NOT alert (noise, not signal)')
  })

  test('a healthy group never fires an alert', () => {
    const path = `/api/test-healthy-${Date.now()}/x`
    for (let i = 0; i < 50; i++) recordRequest(path, 200, 20)
    const snap = getMetricsSnapshot({})
    const fired = checkAndLogAlerts(snap, { errorRateThreshold: 0.1, minRequests: 10 })
    assert.ok(!fired.some(f => f.group === path))
  })
})
