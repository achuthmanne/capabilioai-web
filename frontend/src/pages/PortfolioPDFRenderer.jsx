// ════════════════════════════════════════════════════════════════
// PDF RENDERER — Professional portfolio layouts for PDF export
// Each template renders user's real data in a clean design
// ════════════════════════════════════════════════════════════════
import { forwardRef } from "react"

const pct = v => Math.min(Math.max(v || 0, 0), 100)
const scoreCol = s => s >= 80 ? "#16a34a" : s >= 60 ? "#d97706" : "#dc2626"

// ── Executive Template ────────────────────────────────────────
function ExecutiveTemplate({ data }) {
  const { name, role, email, eloRating, skills, tasks, experiences, summary, eloHistory } = data
  const avgScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.submission?.score || 0), 0) / tasks.length) : 0
  const topSkills = skills.slice(0, 6)
  const topTasks = tasks.slice(0, 4)

  return (
    <div style={{ width: 794, minHeight: 1123, background: "#fff", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", color: "#1e293b" }}>
      {/* Header */}
      <div style={{ background: "#1a2744", padding: "40px 48px 32px", color: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{name}</div>
            <div style={{ fontSize: 16, color: "#93c5fd", fontWeight: 600, marginBottom: 12 }}>{role}</div>
            {email && <div style={{ fontSize: 12, color: "#94a3b8" }}>{email}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>ELO Rating</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#60a5fa", letterSpacing: "-0.02em" }}>{eloRating}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>Capabilio Verified</div>
          </div>
        </div>
        {/* Stats bar */}
        <div style={{ display: "flex", gap: 32, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          {[
            { l: "Tasks Completed", v: tasks.length },
            { l: "Avg Score", v: avgScore + "%" },
            { l: "Top Skill", v: skills[0]?.skill || "—" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 48px", display: "grid", gridTemplateColumns: "1fr 280px", gap: 32 }}>
        {/* Left */}
        <div>
          {summary && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Professional Summary</div>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "#3D3935", margin: 0 }}>{summary}</p>
            </div>
          )}

          {topTasks.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Arena Performance — Verified Tasks</div>
              {topTasks.map((t, i) => (
                <div key={i} style={{ marginBottom: 10, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, borderLeft: `3px solid ${scoreCol(t.submission?.score || 0)}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{t.task?.title || "Arena Task"}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: scoreCol(t.submission?.score || 0) }}>{t.submission?.score || 0}%</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#64748b", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 3, padding: "1px 6px" }}>{t.task?.difficulty || "Medium"}</span>
                    <span style={{ fontSize: 10, color: "#64748b" }}>{t.task?.type || "Task"}</span>
                    {t.submission?.eloGained > 0 && <span style={{ fontSize: 10, color: "#16a34a", fontWeight: 700 }}>+{t.submission.eloGained} ELO</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {experiences.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Work Experience</div>
              {experiences.slice(0, 3).map((exp, i) => (
                <div key={i} style={{ marginBottom: 16, paddingLeft: 16, borderLeft: "2px solid #e2e8f0" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{exp.title || (exp.roles?.[exp.roles.length - 1]?.title) || "Role"}</div>
                  <div style={{ fontSize: 12, color: "#2563EB", fontWeight: 600, marginBottom: 2 }}>{exp.company}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>
                    {exp.verified ? "✓ Verified" : "Self-reported"} · {exp.start_year || "?"} — {exp.current ? "Present" : (exp.end_year || "?")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div>
          {topSkills.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#2563EB", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Skills</div>
              {topSkills.map((s, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3935" }}>{s.skill}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{s.percentage}%</span>
                  </div>
                  <div style={{ height: 5, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${s.percentage}%`, background: "#2563EB", borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: "14px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Capabilio Profile</div>
            <div style={{ fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
              All skills and task scores are independently verified through live assessments on Capabilio Arena.
            </div>
            <div style={{ fontSize: 11, color: "#2563EB", marginTop: 6, fontWeight: 700 }}>capabilio.online</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modern Pro Template ───────────────────────────────────────
function ModernTemplate({ data }) {
  const { name, role, email, eloRating, skills, tasks, experiences, summary } = data
  const avgScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.submission?.score || 0), 0) / tasks.length) : 0
  const topSkills = skills.slice(0, 5)
  const topTasks = tasks.slice(0, 3)

  return (
    <div style={{ width: 794, minHeight: 1123, background: "#1A1714", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", color: "#0f172a" }}>
      <div style={{ background: "#1A1714", padding: "36px 48px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>{name}</div>
          <div style={{ fontSize: 14, color: "#06B6D4", fontWeight: 600, marginTop: 4 }}>{role}</div>
          {email && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{email}</div>}
        </div>
        <div style={{ background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.3)", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#06B6D4" }}>{eloRating}</div>
          <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1.5 }}>ELO Rating</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 0, minHeight: 900 }}>
        <div style={{ padding: "28px 32px 28px 48px" }}>
          {summary && (
            <div style={{ marginBottom: 24, padding: "14px 18px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Summary</div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#3D3935", margin: 0 }}>{summary}</p>
            </div>
          )}
          {topTasks.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Verified Task Performance</div>
              {topTasks.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: "10px 14px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${scoreCol(t.submission?.score || 0)}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: scoreCol(t.submission?.score || 0) }}>{t.submission?.score || 0}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{t.task?.title || "Arena Task"}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{t.task?.difficulty} · {t.task?.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {experiences.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Experience</div>
              {experiences.slice(0, 3).map((exp, i) => (
                <div key={i} style={{ marginBottom: 14, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{exp.title || "Role"}</div>
                    <div style={{ fontSize: 10, color: exp.verified ? "#16a34a" : "#d97706", fontWeight: 700 }}>{exp.verified ? "✓ Verified" : "Self-reported"}</div>
                  </div>
                  <div style={{ fontSize: 12, color: "#06B6D4", fontWeight: 600 }}>{exp.company}</div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{exp.start_year} — {exp.current ? "Present" : exp.end_year}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: "#1A1714", padding: "28px 24px", color: "#fff" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Skills</div>
          {topSkills.map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: "#e2e8f0" }}>{s.skill}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#06B6D4" }}>{s.percentage}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${s.percentage}%`, background: "#06B6D4", borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#06B6D4", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Stats</div>
            {[{ l: "Tasks Done", v: tasks.length }, { l: "Avg Score", v: avgScore + "%" }].map((s, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{s.v}</div>
                <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Minimal Template ──────────────────────────────────────────
function MinimalTemplate({ data }) {
  const { name, role, email, eloRating, skills, tasks, experiences, summary } = data
  const avgScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.submission?.score || 0), 0) / tasks.length) : 0

  return (
    <div style={{ width: 794, minHeight: 1123, background: "#fff", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", color: "#FFFFFF", padding: "60px 64px" }}>
      <div style={{ borderBottom: "2px solid #6366F1", paddingBottom: 24, marginBottom: 32 }}>
        <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: "-0.03em", color: "#FFFFFF" }}>{name}</div>
        <div style={{ fontSize: 16, color: "#6366F1", fontWeight: 600, marginTop: 6 }}>{role}</div>
        <div style={{ display: "flex", gap: 24, marginTop: 12, alignItems: "center" }}>
          {email && <span style={{ fontSize: 12, color: "#6b7280" }}>{email}</span>}
          <span style={{ fontSize: 12, color: "#6b7280" }}>ELO {eloRating} · Capabilio Verified</span>
        </div>
      </div>
      {summary && (
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "#3D3935", margin: 0, fontStyle: "italic" }}>{summary}</p>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Skills</div>
          {skills.slice(0, 5).map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "7px 0" }}>
              <span style={{ fontSize: 13, color: "#3D3935" }}>{s.skill}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#6366F1" }}>{s.percentage}%</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Performance</div>
          {[{ l: "Tasks Completed", v: tasks.length }, { l: "Average Score", v: avgScore + "%" }, { l: "ELO Rating", v: eloRating }].map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f3f4f6", padding: "7px 0" }}>
              <span style={{ fontSize: 13, color: "#3D3935" }}>{s.l}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>{s.v}</span>
            </div>
          ))}
        </div>
      </div>
      {tasks.slice(0, 3).length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Top Performances</div>
          {tasks.slice(0, 3).map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f3f4f6", padding: "10px 0" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{t.task?.title || "Arena Task"}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{t.task?.difficulty} · {t.task?.type}</div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 800, color: scoreCol(t.submission?.score || 0) }}>{t.submission?.score || 0}%</span>
            </div>
          ))}
        </div>
      )}
      {experiences.slice(0, 3).length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Experience</div>
          {experiences.slice(0, 3).map((exp, i) => (
            <div key={i} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{exp.title || "Role"} · {exp.company}</div>
                <div style={{ fontSize: 11, color: "#9ca3af" }}>{exp.start_year} — {exp.current ? "Present" : exp.end_year}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "#d1d5db" }}>Verified by Capabilio · capabilio.online</span>
      </div>
    </div>
  )
}

// ── Corporate Template ────────────────────────────────────────
function CorporateTemplate({ data }) {
  const { name, role, email, eloRating, skills, tasks, experiences, summary } = data
  const avgScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.submission?.score || 0), 0) / tasks.length) : 0

  return (
    <div style={{ width: 794, minHeight: 1123, background: "#F2EDE4", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", color: "#1e293b" }}>
      <div style={{ background: "#1E3A5F", color: "#fff", padding: "0" }}>
        <div style={{ padding: "32px 48px 24px" }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{name}</div>
          <div style={{ fontSize: 14, color: "#7dd3fc", marginTop: 4 }}>{role}</div>
        </div>
        <div style={{ background: "#0EA5E9", display: "flex", gap: 0 }}>
          {[{ l: "ELO", v: eloRating }, { l: "Tasks", v: tasks.length }, { l: "Avg Score", v: avgScore + "%" }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "10px 24px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.2)" : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1.5 }}>{s.l}</div>
            </div>
          ))}
          {email && <div style={{ padding: "10px 24px", display: "flex", alignItems: "center" }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)" }}>{email}</span></div>}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 0, minHeight: 900 }}>
        <div style={{ background: "#1E3A5F", padding: "24px 20px", color: "#fff" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Skills</div>
          {skills.slice(0, 6).map((s, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: "#e2e8f0" }}>{s.skill}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#7dd3fc" }}>{s.percentage}%</span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${s.percentage}%`, background: "#0EA5E9", borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Verification</div>
            <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>Skills verified via live Arena assessments on Capabilio platform.</div>
          </div>
        </div>
        <div style={{ padding: "24px 32px" }}>
          {summary && (
            <div style={{ marginBottom: 20, padding: "12px 16px", background: "#fff", borderRadius: 6, border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Summary</div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "#3D3935", margin: 0 }}>{summary}</p>
            </div>
          )}
          {tasks.slice(0, 3).length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Verified Performance</div>
              {tasks.slice(0, 3).map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: `${scoreCol(t.submission?.score || 0)}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: scoreCol(t.submission?.score || 0) }}>{t.submission?.score || 0}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{t.task?.title || "Arena Task"}</div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{t.task?.difficulty} · {t.task?.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {experiences.slice(0, 3).length > 0 && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "#0EA5E9", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Experience</div>
              {experiences.slice(0, 3).map((exp, i) => (
                <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{exp.title || "Role"}</div>
                      <div style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 600 }}>{exp.company}</div>
                    </div>
                    <div style={{ fontSize: 10, color: exp.verified ? "#16a34a" : "#d97706", fontWeight: 700, flexShrink: 0 }}>
                      {exp.verified ? "✓ Verified" : "Self-reported"}
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>{exp.start_year} — {exp.current ? "Present" : exp.end_year}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Impact Template ───────────────────────────────────────────
function ImpactTemplate({ data }) {
  const { name, role, email, eloRating, skills, tasks, experiences, summary } = data
  const avgScore = tasks.length ? Math.round(tasks.reduce((a, t) => a + (t.submission?.score || 0), 0) / tasks.length) : 0

  return (
    <div style={{ width: 794, minHeight: 1123, background: "#FAFAFA", fontFamily: "'DM Sans','Helvetica Neue',Arial,sans-serif", color: "#111111" }}>
      <div style={{ background: "#111111", padding: "44px 48px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: "100%", background: "#F59E0B", opacity: 0.08 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 38, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.05 }}>{name}</div>
            <div style={{ fontSize: 16, color: "#F59E0B", fontWeight: 700, marginTop: 8 }}>{role}</div>
            {email && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 8 }}>{email}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 42, fontWeight: 900, color: "#F59E0B", letterSpacing: "-0.02em" }}>{eloRating}</div>
            <div style={{ fontSize: 10, color: "#6b7280", textTransform: "uppercase", letterSpacing: 2 }}>ELO Rating</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {[{ l: "Tasks", v: tasks.length }, { l: "Avg Score", v: avgScore + "%" }, { l: "Top Skill", v: skills[0]?.skill || "—" }].map((s, i) => (
            <div key={i} style={{ borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none", paddingRight: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{s.v}</div>
              <div style={{ fontSize: 9, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1.5 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "32px 48px", display: "grid", gridTemplateColumns: "1fr 260px", gap: 32 }}>
        <div>
          {summary && (
            <div style={{ marginBottom: 24, padding: "16px 20px", borderLeft: "4px solid #F59E0B", background: "#fff" }}>
              <p style={{ fontSize: 13, lineHeight: 1.75, color: "#3D3935", margin: 0 }}>{summary}</p>
            </div>
          )}
          {tasks.slice(0, 4).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #F59E0B" }}>Arena Performance</div>
              {tasks.slice(0, 4).map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 4, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: "#F59E0B" }}>{t.submission?.score || 0}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{t.task?.title || "Arena Task"}</div>
                    <div style={{ fontSize: 10, color: "#9ca3af" }}>{t.task?.difficulty} · {t.task?.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {experiences.slice(0, 3).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #F59E0B" }}>Experience</div>
              {experiences.slice(0, 3).map((exp, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{exp.title || "Role"}</div>
                  <div style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>{exp.company}</div>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{exp.start_year} — {exp.current ? "Present" : exp.end_year} · {exp.verified ? "✓ Verified" : "Self-reported"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#111", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #F59E0B" }}>Skills</div>
          {skills.slice(0, 6).map((s, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#3D3935" }}>{s.skill}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#F59E0B" }}>{s.percentage}%</span>
              </div>
              <div style={{ height: 4, background: "#e5e7eb", borderRadius: 99 }}>
                <div style={{ height: "100%", width: `${s.percentage}%`, background: "#111", borderRadius: 99 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 20, padding: "12px 14px", background: "#111", borderRadius: 6 }}>
            <div style={{ fontSize: 9, color: "#F59E0B", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6, fontWeight: 800 }}>Capabilio Verified</div>
            <div style={{ fontSize: 10, color: "#6b7280", lineHeight: 1.6 }}>All performance data verified through live skill assessments.</div>
            <div style={{ fontSize: 10, color: "#F59E0B", marginTop: 6, fontWeight: 700 }}>capabilio.online</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Template Router ───────────────────────────────────────────
export const TemplateComponents = {
  executive: ExecutiveTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  corporate: CorporateTemplate,
  impact: ImpactTemplate,
}

export const PDFRenderer = forwardRef(function PDFRenderer({ templateId, data }, ref) {
  const Component = TemplateComponents[templateId] || ExecutiveTemplate
  return (
    <div ref={ref} style={{ position: "absolute", left: "-9999px", top: 0, zIndex: -1 }}>
      <Component data={data} />
    </div>
  )
})
