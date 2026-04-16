/**
 * SynchroLogoDark — SVG recreation of the Synchro logo for dark backgrounds.
 * Uses gold instead of blue (blue disappears on dark) with the S-arrow motif.
 * Use this in the navbar and app shell on dark mode.
 * Use the real JPEG (synchro-logo.jpeg) on light backgrounds only.
 */
export default function SynchroLogoDark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle background */}
      <circle cx="50" cy="50" r="48" fill="rgba(201,168,76,.1)" stroke="rgba(201,168,76,.3)" strokeWidth="1.5"/>

      {/* Blue arc (left sweep) — rendered as gold in dark mode */}
      <path
        d="M 28 72 C 18 60 18 40 28 28 C 38 16 55 14 65 22"
        stroke="#c9a84c"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />

      {/* Gold arc (right sweep) with arrow */}
      <path
        d="M 72 28 C 82 40 82 60 72 72 C 62 84 45 86 35 78"
        stroke="#c9a84c"
        strokeWidth="10"
        strokeLinecap="round"
        fill="none"
      />
      {/* Assuming this is the arrow path; complete it based on context */}
      <path
        d="M 35 78 L 40 83 L 35 88 L 30 83 Z"
        fill="#c9a84c"
      />
    </svg>
  )}
