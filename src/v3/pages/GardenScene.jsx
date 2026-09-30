import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile, getCompletionOutcome, getLastSevenDays, localDateKey } from '../../domain/model.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'

const WEEKDAY = '日一二三四五六'

/** 0 empty pot · 1 seed · 2 sprout · 3 bud · 4 moonflower */
function growthStage(session, today = false) {
  if (!session) return today ? 1 : 0
  if (session.status === 'goodnight') return 4
  const values = Object.values(session.stepStatus || {})
  if (!values.length) return 1
  const resolved = values.filter((status) => status !== 'todo').length / values.length
  if (resolved === 0) return 1
  if (resolved < 0.5) return 2
  return 3
}

function describe(day, stage, today) {
  const outcome = getCompletionOutcome(day.session)
  if (stage === 4) {
    if (outcome === 'early') return `提前完成，收下 ${day.session.starsAwarded || day.session.earlyMinutes} 点星光，月亮花开啦。`
    if (outcome === 'on-time') return '按时完成，月亮花开啦。'
    return '完成了晚间准备，月亮花照常盛开。'
  }
  if (today) return ['种子在等今晚的第一件小事。', '种子在等今晚的第一件小事。', '冒出小芽了，继续加油。', '花苞鼓鼓的，快要开花了。'][stage]
  if (stage === 0) return '这个小盆在休息。休息的日子，也不是失败。'
  return '那天做了一部分，也是真实的努力。'
}

export function GardenScene() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const days = getLastSevenDays(state)
  const todayKey = localDateKey()
  const [selected, setSelected] = useState(todayKey)
  const blooms = days.filter((day) => day.session?.status === 'goodnight').length
  const todayDay = days.find((day) => day.dateKey === todayKey)
  const todayDone = todayDay?.session?.status === 'goodnight'
  const active = days.find((day) => day.dateKey === selected) || todayDay || days.at(-1)
  const activeStage = growthStage(active?.session, active?.dateKey === todayKey)

  return (
    <section className="v3-garden" aria-labelledby="v3-garden-title">
      <div className="v3-scene-backdrop v3-garden__backdrop" aria-hidden="true">
        <img src={appPath('assets/v3/night-garden-backdrop.webp')} alt="" />
      </div>
      <header className="v3-garden__title">
        <h1 id="v3-garden-title" className="v3-display">月光花园</h1>
        <p>{blooms ? `最近七天，开了 ${blooms} 朵月亮花` : '每完成一个晚上，这里就开一朵月亮花'}</p>
      </header>

      <ol className="v3-pots" aria-label="最近七天的月亮花">
        {days.map((day, index) => {
          const today = day.dateKey === todayKey
          const stage = growthStage(day.session, today)
          const label = today ? '今天' : `周${WEEKDAY[day.date.getDay()]}`
          const early = getCompletionOutcome(day.session) === 'early'
          return (
            <li key={day.dateKey} style={{ '--i': index }}>
              <button
                type="button"
                className={`v3-pot is-stage-${stage} ${today ? 'is-today' : ''} ${selected === day.dateKey ? 'is-selected' : ''} ${early ? 'is-early' : ''}`}
                onClick={() => setSelected(day.dateKey)}
                aria-pressed={selected === day.dateKey}
                aria-label={`${label}：${describe(day, stage, today)}`}
              >
                <img src={appPath(`assets/v3/moonflower-${stage}.webp`)} alt="" />
                {early ? <span className="v3-pot__glow" aria-hidden="true" /> : null}
                <span className="v3-pot__day">{label}</span>
              </button>
            </li>
          )
        })}
      </ol>

      <aside className="v3-garden__note v3-felt" aria-live="polite">
        <Companion character={profile.character} mood={activeStage === 4 ? 'garden' : 'water'} className="v3-garden__buddy" />
        <div>
          <strong className="v3-display">{active?.dateKey === todayKey ? '今天' : `周${WEEKDAY[active?.date.getDay() ?? 0]}`}</strong>
          <p>{active ? describe(active, activeStage, active.dateKey === todayKey) : ''}</p>
          {!todayDone ? <button type="button" className="v3-button" onClick={() => navigate('/tonight')}><Icon name="moon" />去完成今晚的小事</button> : null}
        </div>
      </aside>
    </section>
  )
}
