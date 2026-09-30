import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getActiveProfile, getLastSevenDays, localDateKey } from '../../domain/model.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Speak, Tap } from '../ui/kit.jsx'
import { WEEKDAY, gardenLine, gardenStage, starFruit } from '../lib/garden.js'

/** 月光花园: the last seven nights, planted in the grass. Resting pots never wilt. */
export function Garden() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const todayKey = localDateKey()
  const days = getLastSevenDays(state)
  const [selected, setSelected] = useState(todayKey)
  const blooms = days.filter((day) => day.session?.status === 'goodnight').length
  const fruit = days.reduce((sum, day) => sum + starFruit(day.session), 0)
  const todayDone = days.find((day) => day.dateKey === todayKey)?.session?.status === 'goodnight'
  const active = days.find((day) => day.dateKey === selected) || days.at(-1)
  const activeToday = active?.dateKey === todayKey
  const activeStage = gardenStage(active?.session, activeToday)
  const text = active ? gardenLine(active.session, activeStage, activeToday) : ''
  const lead = blooms ? `最近七个晚上，开了 ${blooms} 朵月亮花${fruit ? `，结了 ${fruit} 点星光果` : ''}。` : '每走完一次睡前小路，这里就开一朵月亮花。'

  return (
    <section className="k-grove" aria-labelledby="k-grove-title">
      <div className="k-grove__scene" style={{ '--bg': `url("${appPath('assets/v3/night-garden-backdrop.webp')}")` }}>
      <header className="k-grove__head">
        <h1 id="k-grove-title" className="u-display">月光花园</h1>
        <p>{lead}<Speak text={`月光花园。${lead}`} /></p>
      </header>

      <ol className="k-grove__bed" aria-label="最近七天的月亮花">
        {days.map((day, index) => {
          const today = day.dateKey === todayKey
          const stage = gardenStage(day.session, today)
          const stars = starFruit(day.session)
          const label = today ? '今天' : `周${WEEKDAY[day.date.getDay()]}`
          return (
            <li key={day.dateKey} style={{ '--i': index }}>
              <button
                type="button"
                className={`k-bloom is-stage-${stage}${today ? ' is-today' : ''}${stars ? ' has-fruit' : ''}`}
                aria-pressed={selected === day.dateKey}
                aria-label={`${label}：${gardenLine(day.session, stage, today)}`}
                onClick={() => setSelected(day.dateKey)}
              >
                {stars ? <span className="k-bloom__fruit" aria-hidden="true"><Icon name="star" size={14} /><b className="u-num">{stars}</b></span> : null}
                <img src={appPath(`assets/v3/moonflower-${stage}.webp`)} alt="" />
                <span className="k-bloom__day">{label}</span>
              </button>
            </li>
          )
        })}
      </ol>
      </div>

      <div className="k-grove__note" aria-live="polite">
        <Buddy character={profile.character} mood={activeStage === 4 ? 'garden' : 'water'} />
        <div>
          <strong className="u-display">{activeToday ? '今天' : `周${WEEKDAY[active?.date.getDay() ?? 0]}`}</strong>
          <p>{text}<Speak text={text} /></p>
          {!todayDone ? <Tap tone="primary" icon="moon" onClick={() => navigate('/tonight')}>去走今晚的小路</Tap> : null}
        </div>
      </div>
    </section>
  )
}
