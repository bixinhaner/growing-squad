import { CHARACTER_ASSET_LABELS, normalizeAssetId, OBJECT_ASSETS, OBJECT_ASSET_OPTIONS } from '../domain/assets.js'
import { appPath } from '../data/paths.js'

export function AssetArt({ id, label, className = '', decorative = false }) {
  const normalized = normalizeAssetId(id)
  const index = Math.max(0, OBJECT_ASSETS.indexOf(normalized))
  return (
    <span
      className={`asset-art ${className}`}
      style={{ backgroundImage: `url('${appPath(`assets/objects/${normalized}.webp`)}')`, backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundSize: 'contain' }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label || OBJECT_ASSET_OPTIONS[index]?.label}
      aria-hidden={decorative ? 'true' : undefined}
    />
  )
}

export function CompanionArt({ id = 'bear', label, className = '', decorative = false }) {
  const ids = ['bear', 'rabbit', 'cloud', 'space-cat']
  const normalized = ids.includes(id) ? id : 'bear'
  const index = ids.indexOf(normalized)
  return (
    <span
      className={`companion-art ${className}`}
      style={{ '--companion-x': `${(index / 3) * 100}%` }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label || CHARACTER_ASSET_LABELS[normalized]}
      aria-hidden={decorative ? 'true' : undefined}
    />
  )
}
