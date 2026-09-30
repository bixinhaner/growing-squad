import { CharacterPose } from '../../ui/ThemeArt.jsx'

/**
 * The child's companion, drawn from the shared pose atlas. `mood` maps story
 * moments to poses so pages never need to know atlas coordinates.
 */
const MOOD_TO_POSE = {
  hello: 'wave',
  calm: 'waiting',
  cheer: 'celebrate',
  sleepy: 'sleep',
  water: 'watering',
  garden: 'garden',
}

export function Companion({ character, mood = 'hello', label, className = '', bounceKey }) {
  const pose = MOOD_TO_POSE[mood] || 'wave'
  return (
    <span className={`v3-companion v3-companion--${mood} ${className}`} data-bounce={bounceKey}>
      <CharacterPose key={`${pose}-${bounceKey ?? ''}`} character={character} pose={pose} label={label} decorative={!label} className="v3-companion__pose" />
      <span className="v3-companion__shadow" aria-hidden="true" />
    </span>
  )
}
