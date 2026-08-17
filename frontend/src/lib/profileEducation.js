// Shared by SettingsPanel.jsx (Settings → Profile save) and Onboarding.jsx
// (student signup completion, including college-invite signups) — both
// write profiles.college and must keep the "profile"-tagged entry in
// profiles.education in sync with it, so Aura's EducationPanel timeline
// (which sorts _source:"profile" first) never shows "No education yet"
// for a student who has a college on file. Never touches resume-imported
// or manually-added degree entries; only owns the single "profile"-tagged
// slot. Clearing the college name removes that entry rather than leaving
// a blank one in the timeline.
export function upsertProfileEducation(existingEducation, collegeName) {
  const list = Array.isArray(existingEducation) ? existingEducation : []
  const trimmed = (collegeName || "").trim()
  const idx = list.findIndex(e => e?._source === "profile")
  if (!trimmed) {
    if (idx === -1) return list
    const next = [...list]; next.splice(idx, 1); return next
  }
  const entry = { ...(idx !== -1 ? list[idx] : {}), institution: trimmed, _source: "profile" }
  if (idx === -1) return [...list, entry]
  const next = [...list]; next[idx] = entry; return next
}
