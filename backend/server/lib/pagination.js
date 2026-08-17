/**
 * pagination.js — shared cursor-pagination helpers for list endpoints
 * ordered by a single timestamp column, newest first.
 *
 * Same base64-cursor + hasMore/nextCursor response shape as
 * careerEventsV1.js's timeline endpoint (GET /pro/v1/career/timeline) —
 * reused here rather than reinvented so pagination behaves the same way
 * across the app.
 *
 * Known limitation, inherited from careerEventsV1.js's own documented
 * tradeoff: two rows sharing the exact same timestamp that straddle a page
 * boundary could in theory cause one row to be skipped or repeated. That
 * file accepts this given its current data volume; it's an even safer bet
 * here — Arena submission rows are written one at a time, one per HTTP
 * request, never bulk-inserted, so an exact-timestamp collision between two
 * of a single user's own submissions is not realistically reachable.
 *
 * decodeCursor validates the decoded value is a real timestamp and returns
 * null for anything else. Callers MUST distinguish "no cursor supplied"
 * (page 1 — expected) from "cursor supplied but invalid" (client bug or
 * tampering — should 400) rather than silently treating an invalid cursor
 * as "start over," which would look like the request half-worked instead
 * of failing clearly.
 */

export function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null
  let value
  try {
    value = Buffer.from(cursor, "base64").toString("utf8")
  } catch {
    return null
  }
  if (!value || Number.isNaN(Date.parse(value))) return null
  return value
}

export function encodeCursor(row, timestampField) {
  return Buffer.from(String(row[timestampField]), "utf8").toString("base64")
}
