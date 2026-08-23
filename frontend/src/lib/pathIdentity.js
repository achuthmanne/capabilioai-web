/**
 * pathIdentity.js — per-path accent colors for the four signup paths.
 *
 * Deliberate, approved exception to DESIGN.md rule 9's "one accent only"
 * rule (amended 2026-08-18) — these four colors are the ONLY place on the
 * site where per-path color-coding is used, and it's identity/orientation
 * (confirming "did I pick the right path" before a signup form), not
 * decoration. Every other surface stays single-accent.
 *
 * Values are exactly the pre-rebuild LandingPage.jsx's D.orange/violet/
 * gold/amber (see FLOWS, git history prior to 2026-08-17) — not new
 * choices. AuthModal's own pre-rebuild PATH_META used a slightly
 * different violet (#7C3AED vs this file's #8B5CF6) for "professional";
 * LandingPage.jsx's value was used per explicit instruction.
 *
 * Single source of truth for BOTH LandingPage.jsx's "Choose Your Journey"
 * cards and AuthModal's in-modal path-chooser step (App.jsx) — reintroducing
 * per-file hardcoded copies is exactly the drift this file exists to
 * prevent. "path"/"instType" are what AuthModal's selectedPath vocabulary
 * actually expects (see the 2026-08-18 path-vocab bugfix) — the College
 * entry intentionally maps to path:"institution", instType:"College", not
 * a literal "college" string.
 */
import { GraduationCap, Briefcase, Crown, Landmark } from "lucide-react"

export const PATH_COLORS = {
  student: "#FF5701",
  professional: "#2563EB",
  executive: "#059669",
  institution: "#7C3AED",
}

export function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

export const PRIMARY_PATHS = [
  {
    key: "student", path: "student", icon: GraduationCap, title: "Student",
    color: PATH_COLORS.student,
    desc: "Prove your skills through real challenges. ELO starts at 400.",
    points: ["ELO starts at 400", "Free to start", "18+ domains"],
  },
  {
    key: "professional", path: "professional", icon: Briefcase, title: "Professional",
    color: PATH_COLORS.professional,
    desc: "Build your verified career intelligence. UAN-backed, AI-powered.",
    points: ["Auto-verified timeline", "Market intelligence", "Passive job matching"],
  },
  {
    key: "executive", path: "executive", icon: Crown, title: "Executive",
    color: PATH_COLORS.executive,
    desc: "Invite-only authority profile. Sell your time, verified by Capabilio.",
    points: ["Invite-only", "Verified authority profile", "Time marketplace"],
    comingSoon: true,
  },
  {
    key: "institution", path: "institution", instType: "Organization", icon: Landmark, title: "Organization",
    color: PATH_COLORS.institution,
    desc: "Track cohort ELO. Hire verified talent, automate placements.",
    points: ["Live cohort leaderboard", "Team-assigned tasks", "Alumni intelligence"],
  },
]
