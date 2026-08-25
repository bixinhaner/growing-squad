const paths = {
  home: '<path d="M3 11.5 12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  book: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
  star: '<path d="m12 2.5 2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.06 1.11-6.46-4.7-4.58 6.49-.94z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 22a7.5 7.5 0 0 1 15 0"/>',
  accessibility: '<circle cx="12" cy="4" r="2"/><path d="M5 8h14M12 6v7m0 0-5 9m5-9 5 9"/>',
  shield: '<path d="M12 2 4.5 5v6c0 5 3.2 9.2 7.5 11 4.3-1.8 7.5-6 7.5-11V5z"/><path d="m9 12 2 2 4-5"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  gift: '<path d="M3 10h18v11H3zM2 6h20v4H2zM12 6v15M12 6H7.5a2.5 2.5 0 1 1 2.5-2.5C10 5 12 6 12 6Zm0 0h4.5A2.5 2.5 0 1 0 14 3.5C14 5 12 6 12 6Z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronBack: '<path d="m15 18-6-6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  moon: '<path d="M20 16.5A9 9 0 0 1 8 4.2 8.5 8.5 0 1 0 20 16.5Z"/>',
  download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M4 21h16"/>',
  upload: '<path d="M12 17V5m0 0 5 5m-5-5-5 5M4 21h16"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3m3 0-1 15H7L6 7m4 4v7m4-7v7"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  sparkle: '<path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
}

export function Icon({ name, size = 22, className = '' }) {
  const markup = paths[name] || paths.star
  return (
    <svg
      className={`icon-svg ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}
