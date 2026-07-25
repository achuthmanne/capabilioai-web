import { test } from "node:test"
import assert from "node:assert/strict"
import { mapExperienceToEvents, mapCertificationToEvent, mapLegacyTimelineRowToEvent, buildSyncRows, parseFlexibleDate } from "./careerEventSync.js"

const UID = "11111111-1111-1111-1111-111111111111"

// Real production profiles.experiences entries store dates as "MM/YYYY"
// (confirmed by querying live data during this workstream's audit), not
// ISO strings — `new Date("08/2017")` is Invalid Date in Node and used to
// throw on .toISOString(). These tests pin that real shape down.
test("parseFlexibleDate handles the real MM/YYYY production format", () => {
  const d = parseFlexibleDate("08/2017")
  assert.ok(d instanceof Date)
  assert.equal(d.getUTCFullYear(), 2017)
  assert.equal(d.getUTCMonth(), 7) // 0-indexed = August
})

test("parseFlexibleDate handles YYYY-MM and full ISO dates", () => {
  assert.equal(parseFlexibleDate("2022-06").getUTCFullYear(), 2022)
  assert.ok(parseFlexibleDate("2022-06-15") instanceof Date)
})

test("parseFlexibleDate returns null (never throws) for 'Present', empty, and garbage input", () => {
  assert.equal(parseFlexibleDate("Present"), null)
  assert.equal(parseFlexibleDate(""), null)
  assert.equal(parseFlexibleDate(null), null)
  assert.equal(parseFlexibleDate("not a date"), null)
})

test("real production experience shape (MM/YYYY dates, string-array certifications) maps without throwing", () => {
  const events = mapExperienceToEvents(UID, {
    id: "exp-0-1784868362311", role: "Junior Data Analyst", company: "METALLCO Softech Private Limited",
    startDate: "08/2017", endDate: "09/2018", isCurrent: false, _source: "resume",
    skills: ["Excel", "SQL", "Python"], verificationStatus: "self-claimed",
  })
  assert.equal(events.length, 2)
  assert.equal(events[0].start_date, "2017-08-01")
  assert.equal(events[1].end_date, "2018-09-01")

  const certEvent = mapCertificationToEvent(UID, "Google Data Analytics Professional Certificate")
  assert.equal(certEvent.event_type, "certification_earned")
})

test("experience with an end date produces both a join and an exit event", () => {
  const events = mapExperienceToEvents(UID, { company: "Acme", title: "Analyst", startDate: "2022-01-01", endDate: "2023-06-01" })
  assert.equal(events.length, 2)
  assert.equal(events[0].event_type, "company_join")
  assert.equal(events[1].event_type, "company_exit_clean")
  assert.equal(events[0].elo_delta, 0)
  assert.equal(events[1].elo_delta, 0)
})

test("current experience (no end date) produces only a join event", () => {
  const events = mapExperienceToEvents(UID, { company: "Acme", title: "Analyst", startDate: "2022-01-01", isCurrent: true })
  assert.equal(events.length, 1)
  assert.equal(events[0].event_type, "company_join")
})

test("never emits event_type 'first_job' for a synced experience (path-transition trigger safety)", () => {
  const events = mapExperienceToEvents(UID, { company: "Acme", title: "Analyst", startDate: "2022-01-01" })
  for (const e of events) assert.notEqual(e.event_type, "first_job")
})

test("resume-derived experience gets evidence_source resume_derived, manual entry gets self_claimed", () => {
  const resumeEvt = mapExperienceToEvents(UID, { company: "Acme", title: "X", startDate: "2022-01-01", _source: "resume" })[0]
  const manualEvt = mapExperienceToEvents(UID, { company: "Acme", title: "X", startDate: "2022-01-01" })[0]
  assert.equal(resumeEvt.evidence_source, "resume_derived")
  assert.equal(manualEvt.evidence_source, "self_claimed")
})

test("same company/role/startDate always produces the same source_id (idempotency key stability)", () => {
  const a = mapExperienceToEvents(UID, { company: "Acme", title: "Analyst", startDate: "2022-01-01", isCurrent: true })[0]
  const b = mapExperienceToEvents(UID, { company: "Acme", title: "Analyst", startDate: "2022-01-01", isCurrent: true })[0]
  assert.equal(a.source_id, b.source_id)
})

test("empty experience entry (no company/title/role) produces no events", () => {
  assert.deepEqual(mapExperienceToEvents(UID, {}), [])
})

test("certification maps to certification_earned, private by default", () => {
  const evt = mapCertificationToEvent(UID, { name: "AWS SAA", issuer: "AWS", date: "2023-05-01" })
  assert.equal(evt.event_type, "certification_earned")
  assert.equal(evt.visibility, "private")
  assert.equal(evt.verification_status, "self_claimed")
})

test("verified certification maps evidence_source document_verified and verification_status verified", () => {
  const evt = mapCertificationToEvent(UID, { name: "AWS SAA", verificationStatus: "verified" })
  assert.equal(evt.evidence_source, "document_verified")
  assert.equal(evt.verification_status, "verified")
})

test("legacy string-shaped certification (pre-normalization) still maps correctly", () => {
  const evt = mapCertificationToEvent(UID, "PMP")
  assert.equal(evt.event_type, "certification_earned")
  assert.equal(evt.title, "Earned PMP")
})

test("null/empty certification name returns null, not a malformed row", () => {
  assert.equal(mapCertificationToEvent(UID, {}), null)
  assert.equal(mapCertificationToEvent(UID, ""), null)
})

test("legacy career_timeline row maps category to a valid event_type", () => {
  const evt = mapLegacyTimelineRowToEvent({
    id: "22222222-2222-2222-2222-222222222222", user_id: UID,
    category: "professional_experience", title: "Engineer at X", start_date: "2020-01-01",
    visibility: "private", verification_level: 1, source: "manual",
  })
  assert.equal(evt.event_type, "company_join")
  assert.equal(evt.source_type, "career_timeline_backfill")
  assert.equal(evt.source_id, "22222222-2222-2222-2222-222222222222") // real uuid, not a slug
})

test("legacy row with an unmapped category falls back to project_outcome, never throws", () => {
  const evt = mapLegacyTimelineRowToEvent({
    id: "33333333-3333-3333-3333-333333333333", user_id: UID,
    category: "personal_project", title: "Side project", start_date: "2021-01-01", visibility: "public",
  })
  assert.equal(evt.event_type, "project_outcome")
})

test("legacy row with missing id/user_id returns null instead of a malformed insert", () => {
  assert.equal(mapLegacyTimelineRowToEvent({ category: "personal_project" }), null)
})

test("buildSyncRows composes all three sources and every row has elo_delta 0", () => {
  const rows = buildSyncRows(UID, {
    experiences: [{ company: "Acme", title: "Analyst", startDate: "2022-01-01", isCurrent: true }],
    certifications: [{ name: "AWS SAA" }],
    legacyTimelineRows: [{ id: "44444444-4444-4444-4444-444444444444", user_id: UID, category: "certification", title: "Old cert", start_date: "2019-01-01", visibility: "private" }],
  })
  assert.equal(rows.length, 3)
  for (const r of rows) {
    assert.equal(r.elo_delta, 0)
    assert.equal(r.user_id, UID)
    assert.notEqual(r.event_type, "first_job")
  }
})

test("buildSyncRows with no sources returns an empty array, not a crash", () => {
  assert.deepEqual(buildSyncRows(UID, {}), [])
})
