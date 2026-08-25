import { getActiveProfile, getCompletionOutcome, getLastSevenDays, getStarBalance, localDateKey } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { PageTitle } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose, ThemeWorld } from '../ui/ThemeArt.jsx'

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

function getPlantStage(session) {
  if (!session) return 0
  if (session.status === 'goodnight') return 4
  if (session.status === 'ready') return 3
  const steps = Object.values(session.stepStatus || {})
  const resolved = steps.filter((status) => status !== 'todo').length
  return Math.max(1, Math.min(3, Math.ceil((resolved / Math.max(1, steps.length)) * 3)))
}

function getPlantStatus(stage, outcome) {
  if (outcome === 'early') return '3 颗星光果实'
  if (outcome === 'on-time') return '1 颗星光果实'
  if (outcome === 'after-target') return '今晚开花'
  if (stage === 4) return '照亮了'
  if (stage > 0) return '长大中'
  return '等一等'
}

export function GardenPage() {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const days = getLastSevenDays(state)
  const lit = days.filter(({ session }) => session?.status === 'goodnight').length
  const balance = getStarBalance(state)
  const today = localDateKey()
  return (
    <section className="garden-page">
      <PageTitle eyebrow={`现在有 ${balance} 点星光`} title={`这周已经照亮 ${lit} 个夜晚`} subtitle="休息一天也不会失去已经长出的叶子。" icon="star" />
      <div className="garden-scene">
        <div className="garden-world" aria-hidden="true"><ThemeWorld theme={profile.theme} /></div>
        <CharacterPose character={profile.character} pose="garden" decorative className="garden-companion" />
        <div className="garden-glow" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <ol className="garden-days" aria-label="最近七天的星星花园">
          {days.map(({ date, dateKey, session }) => {
            const stage = getPlantStage(session)
            const outcome = getCompletionOutcome(session)
            const status = getPlantStatus(stage, outcome)
            const isToday = dateKey === today
            return (
              <li className={`garden-day garden-day--stage-${stage} garden-day--${outcome} ${isToday ? 'garden-day--today' : ''}`} key={dateKey} aria-label={`${date.getMonth() + 1} 月 ${date.getDate()} 日，${status}`}>
                <span className="garden-day__date"><b>{isToday ? '今' : weekdays[date.getDay()]}</b><small>{date.getMonth() + 1}/{date.getDate()}</small></span>
                <span className="garden-plant" aria-hidden="true"></span>
                <span className="garden-day__status">{status}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <div className="reassurance"><Icon name="sparkle" size={16} />完成就会开花；按时会结星光果实，超时也不会失去叶子。</div>
    </section>
  )
}
