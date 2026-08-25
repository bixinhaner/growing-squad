import { appPath } from '../data/paths.js'
import { COMPANION_POSES, getCompanionPack, getThemePack } from '../domain/themePacks.js'

export function CharacterPose({ character = 'bear', pose = 'waiting', label, decorative = false, className = '' }) {
  const pack = getCompanionPack(character)
  const [column, row] = COMPANION_POSES[pose] || COMPANION_POSES.waiting
  return (
    <span
      className={`character-pose character-pose--${pose} ${className}`}
      style={{
        '--pose-image': `url('${appPath(pack.asset)}')`,
        '--pose-x': `${column * 50}%`,
        '--pose-y': `${row * 100}%`,
      }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label || `${pack.name}${pose === 'sleep' ? '睡着了' : '陪着你'}`}
      aria-hidden={decorative ? 'true' : undefined}
    />
  )
}

export function ThemeWorld({ theme = 'moon-room', label, decorative = true, className = '' }) {
  const pack = getThemePack(theme)
  return (
    <img
      className={`theme-world theme-world--${theme} ${className}`}
      src={appPath(pack.asset)}
      alt={decorative ? '' : label || pack.name}
      aria-hidden={decorative ? 'true' : undefined}
    />
  )
}

export function ThemeScene({ theme, character, pose = 'waiting', label, className = '' }) {
  return (
    <div className={`theme-scene theme-scene--${theme} ${className}`}>
      <ThemeWorld theme={theme} />
      <CharacterPose character={character} pose={pose} label={label} className="theme-scene__companion" />
      <span className="theme-scene__glow" aria-hidden="true" />
    </div>
  )
}
