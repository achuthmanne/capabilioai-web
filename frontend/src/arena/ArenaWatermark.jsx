/**
 * ArenaWatermark — invisible tiled watermark over the Arena workstation.
 *
 * Renders the user's email/ID as a diagonal semi-transparent repeating pattern.
 * pointer-events:none so it doesn't block interaction.
 *
 * Purpose: even if a user takes an OS screenshot or screen recording,
 * their identity is embedded in the image — the strongest available deterrent.
 */
import React, { useMemo } from "react"

export default function ArenaWatermark({ userEmail, userId }) {
  const label = userEmail || userId || "capabilio.online"

  // Build a tiny SVG tile with the user label repeated diagonally
  const svgUrl = useMemo(() => {
    const text = encodeURIComponent(label)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="280" height="120">
        <text
          x="50%" y="50%"
          dominant-baseline="middle"
          text-anchor="middle"
          transform="rotate(-22, 140, 60)"
          font-family="monospace"
          font-size="11"
          fill="rgba(100,116,139,0.10)"
          font-weight="600"
          letter-spacing="1"
        >${text} · capabilio.online</text>
      </svg>
    `.trim()
    return `data:image/svg+xml,${svg}`
  }, [label])

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        backgroundImage: `url("${svgUrl}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "280px 120px",
      }}
    />
  )
}
