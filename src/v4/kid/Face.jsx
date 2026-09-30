/** Hand-drawn feeling faces: easier for pre-readers than words alone. */
const MOUTHS = {
  joy: <path d="M20 37c4 8 20 8 24 0" strokeWidth="4" fill="#fff" />,
  smile: <path d="M22 38c4 4 16 4 20 0" strokeWidth="4" fill="none" />,
  wobble: <path d="M21 41c3-3 5 0 8-2s5 1 7-1 5 1 7-1" strokeWidth="3.6" fill="none" />,
  calm: <path d="M24 40h16" strokeWidth="4" fill="none" />,
  wow: <ellipse cx="32" cy="41" rx="5" ry="6" strokeWidth="3.6" fill="#fff" />,
}

export function Face({ kind = 'smile', size = 72 }) {
  const sleepy = kind === 'calm'
  return (
    <svg className="k-face" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="28" fill="var(--face, #ffd76a)" stroke="none" />
      <circle cx="18" cy="38" r="4.5" fill="#ff9e8a" stroke="none" opacity=".55" />
      <circle cx="46" cy="38" r="4.5" fill="#ff9e8a" stroke="none" opacity=".55" />
      {sleepy
        ? <><path d="M19 27q4 3 8 0" strokeWidth="3.6" fill="none" /><path d="M37 27q4 3 8 0" strokeWidth="3.6" fill="none" /></>
        : kind === 'joy'
          ? <><path d="M19 28q4-5 8 0" strokeWidth="3.6" fill="none" /><path d="M37 28q4-5 8 0" strokeWidth="3.6" fill="none" /></>
          : <><circle cx="23" cy="27" r="3.4" fill="currentColor" stroke="none" /><circle cx="41" cy="27" r="3.4" fill="currentColor" stroke="none" /></>}
      {MOUTHS[kind] || MOUTHS.smile}
    </svg>
  )
}
