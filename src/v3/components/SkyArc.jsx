import { appPath } from '../../data/paths.js'

const W = 1000
const H = 230
const P0 = [60, 200]
const P1 = [500, -120]
const P2 = [940, 200]

function arcPoint(t) {
  const u = 1 - t
  return [
    u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0],
    u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1],
  ]
}

function arcPath(from, to, steps = 48) {
  const points = []
  for (let i = 0; i <= steps; i += 1) points.push(arcPoint(from + ((to - from) * i) / steps))
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

const pct = ([x, y]) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

/**
 * A picture clock for children who cannot read time yet: the moon travels from
 * the lamp (start getting ready) to the pillow (planned finish). One star per
 * task hangs on the same string and lights up when that task is done.
 */
export function SkyArc({ progress, stars = [], startLabel, endLabel, description, sleepy = false }) {
  const t = Math.min(1, Math.max(0, progress))
  const moon = arcPoint(t)
  return (
    <figure className={`v3-sky ${sleepy ? 'is-sleepy' : ''}`} role="img" aria-label={description}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="v3-sky-lit" x1="0" x2="1">
            <stop offset="0" stopColor="#ffe7a8" stopOpacity=".2" />
            <stop offset="1" stopColor="#ffd46e" stopOpacity=".95" />
          </linearGradient>
        </defs>
        <path d={arcPath(0, 1)} className="v3-sky__string" />
        {t > 0.001 ? <path d={arcPath(0, t)} className="v3-sky__trail" stroke="url(#v3-sky-lit)" /> : null}
      </svg>
      <span className="v3-sky__end v3-sky__end--start" style={pct(arcPoint(0))}>
        <img src={appPath('assets/objects/lamp.webp')} alt="" />
        <small className="v3-num">{startLabel}</small>
      </span>
      <span className="v3-sky__end v3-sky__end--bed" style={pct(arcPoint(1))}>
        <img src={appPath('assets/objects/pillow.webp')} alt="" />
        <small className="v3-num">{endLabel}</small>
      </span>
      {stars.map((star, index) => {
        const at = arcPoint(0.1 + (0.8 * (index + 0.5)) / Math.max(stars.length, 1))
        return <span key={star.id} id={`v3-sky-star-${star.id}`} className={`v3-sky__star ${star.lit ? 'is-lit' : ''} ${star.rest ? 'is-rest' : ''}`} style={{ ...pct(at), '--i': index }} aria-hidden="true" />
      })}
      <span className="v3-sky__moon" style={pct(moon)} aria-hidden="true">
        <img src={appPath('assets/v3/moon-buddy.webp')} alt="" onError={(event) => { event.currentTarget.src = appPath('assets/mascot-moon.webp') }} />
      </span>
    </figure>
  )
}
