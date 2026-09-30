import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { dayTypeFor, getActiveProfile, getCompletionOutcome, getLastSevenDays, getRoutine, getSchedule, getSession, localDateKey } from '../../domain/model.js'
import { activityMomentsFor, unresolvedHelpFor } from '../../core/activity/activitySelectors.js'
import { familyPulse } from '../../ui/v2/evolutionModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt, CompanionArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../../ui/Icons.jsx'
import { ParentOverviewPage } from '../../pages/ParentOverviewPage.jsx'
import { useNow } from '../hooks.js'

const clock = (at) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
const dateLabel = (at) => new Date(at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })

function tonightSummary(state, now) {
  const date = new Date(now)
  const dateKey = localDateKey(date)
  const schedule = getSchedule(state, dayTypeFor(date), dateKey)
  const steps = getRoutine(state, dayTypeFor(date)).steps.filter((step) => step.enabled)
  const session = getSession(state, dateKey)
  const statuses = session?.stepStatus || {}
  const done = steps.filter((step) => statuses[step.id] === 'done').length
  const skipped = steps.filter((step) => statuses[step.id] === 'skipped').length
  const outcome = getCompletionOutcome(session)
  let status = '还没开始'
  if (session?.status === 'goodnight') status = outcome === 'early' ? `已完成 · 提前 ${session.earlyMinutes} 分钟` : outcome === 'on-time' ? '已按时完成' : '已完成'
  else if (session) status = `进行中 · ${done}/${steps.length}`
  return { schedule, steps, statuses, session, done, skipped, status, settled: session?.status === 'goodnight' }
}

export function ParentToday() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  if (params.get('view') === 'bedtime') {
    return <section className="v3-page"><button type="button" className="v3-link-back" onClick={() => navigate('/parent/overview')}><Icon name="chevronBack" size={18} />返回今天</button><ParentOverviewPage key={profile.id} /></section>
  }
  return <ParentTodayContent />
}

function ParentTodayContent() {
  const now = useNow()
  const navigate = useNavigate()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const tonight = tonightSummary(state, now)
  const help = unresolvedHelpFor(state, profile.id)
  const wishes = (state.rewardRequests || []).filter((request) => request.profileId === profile.id && request.status === 'pending')
  const missingSleep = getLastSevenDays(state).filter((day) => day.session?.inBedAt && !day.session.asleepAt && !day.session.sleepEntrySkippedAt)
  const moments = activityMomentsFor(state, profile.id).slice(0, 5)
  const family = useMemo(() => familyPulse(state, now), [state, now])
  const todos = [
    ...help.slice(0, 3).map((item) => ({ id: item.id, icon: 'heart', tone: 'warm', title: item.title || '孩子想请你陪一下', copy: '不需要找出问题，先一起待一会儿。', action: '去看看', to: item.route || '/parent/support' })),
    ...(wishes.length ? [{ id: 'wishes', icon: 'star', tone: 'moon', title: `${wishes.length} 个愿望等你回应`, copy: '批准时才扣星光，回应前先听听孩子的想法。', action: '回应愿望', to: '/parent/rewards' }] : []),
    ...(missingSleep.length ? [{ id: 'sleep', icon: 'moon', tone: 'night', title: `${missingSleep.length} 晚可以补记入睡时间`, copy: '上床和睡着分开记录，不用完成任务代替睡着。', action: '补记', to: '/parent/overview?view=bedtime' }] : []),
  ]

  return (
    <section className="v3-page v3-ptoday">
      <header className="v3-page__head">
        <div>
          <span className="v3-eyebrow">{new Date(now).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
          <h1 className="v3-display">少一点催促，多一点陪伴</h1>
        </div>
      </header>

      <article className="v3-tonight-card">
        <div className="v3-tonight-card__art" aria-hidden="true"><CompanionArt id={profile.character} decorative /></div>
        <div className="v3-tonight-card__body">
          <span className="v3-eyebrow v3-eyebrow--light">{profile.name}的今晚</span>
          <h2><span className="v3-num">{tonight.schedule.prepareTime}</span> 开始准备 · <span className="v3-num">{tonight.schedule.bedTime}</span> 计划完成</h2>
          <p className="v3-tonight-card__status"><b>{tonight.status}</b>{tonight.session?.routineCompletedAt ? ` · ${clock(tonight.session.routineCompletedAt)} 完成全部任务` : ''}</p>
          <ol className="v3-mini-steps" aria-label="今晚任务进度">
            {tonight.steps.map((step) => {
              const status = tonight.statuses[step.id] || 'todo'
              return <li key={step.id} className={`is-${status}`} title={`${step.title}：${status === 'done' ? '已完成' : status === 'skipped' ? '已跳过' : '未完成'}`}><AssetArt id={step.icon} decorative /><span>{step.title}</span></li>
            })}
          </ol>
        </div>
        <div className="v3-tonight-card__actions">
          <button type="button" className="v3-btn v3-btn--light" onClick={() => navigate('/parent/schedule')}><Icon name="clock" size={18} />调整时间</button>
          <button type="button" className="v3-btn v3-btn--ghost-light" onClick={() => navigate('/parent/overview?view=bedtime')}>晚间记录</button>
        </div>
      </article>

      <div className="v3-ptoday__grid">
        <section className="v3-panel" aria-labelledby="v3-todo-title">
          <header><h2 id="v3-todo-title">需要你回应</h2><span className="v3-count">{todos.length}</span></header>
          {todos.length ? (
            <ul className="v3-todo">
              {todos.map((todo) => (
                <li key={todo.id} className={`is-${todo.tone}`}>
                  <span className="v3-todo__icon"><Icon name={todo.icon} /></span>
                  <span><strong>{todo.title}</strong><small>{todo.copy}</small></span>
                  <button type="button" className="v3-btn v3-btn--small" onClick={() => navigate(todo.to)}>{todo.action}</button>
                </li>
              ))}
            </ul>
          ) : <p className="v3-quiet"><Icon name="check" />现在没有需要处理的事，可以只是一起待一会儿。</p>}
        </section>

        <section className="v3-panel" aria-labelledby="v3-quick-title">
          <header><h2 id="v3-quick-title">顺手记一下</h2></header>
          <nav className="v3-quick" aria-label="家长快捷操作">
            {[['heart', '记一条观察', '/parent/support'], ['moon', '补记入睡', '/parent/overview?view=bedtime'], ['book', '添加一本书', '/parent/reading'], ['clock', '安排今天', '/parent/timeline']].map(([icon, title, to]) => (
              <button type="button" key={to} onClick={() => navigate(to)}><Icon name={icon} /><span>{title}</span></button>
            ))}
          </nav>
        </section>

        {family.length > 1 ? (
          <section className="v3-panel v3-panel--wide" aria-labelledby="v3-family-title">
            <header><h2 id="v3-family-title">一家人，各有自己的节奏</h2></header>
            <div className="v3-family">
              {family.map(({ profile: child, help: helpCount, wishes: wishCount, latest }) => (
                <button key={child.id} type="button" aria-pressed={state.activeProfileId === child.id} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: child.id })}>
                  <CompanionArt id={child.character} decorative />
                  <span><strong>{child.name}</strong><small>{helpCount ? `${helpCount} 个请求需要陪伴` : wishCount ? `${wishCount} 个愿望等你回应` : '没有待回应的事项'}</small><em>{latest?.title || '还没有成长片段'}</em></span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="v3-panel v3-panel--wide" aria-labelledby="v3-moments-title">
          <header><h2 id="v3-moments-title">最近的真实片段</h2><button type="button" className="v3-link" onClick={() => navigate('/parent/report')}>全部成长记录<Icon name="chevron" size={16} /></button></header>
          {moments.length ? (
            <ol className="v3-moments">
              {moments.map((moment) => <li key={moment.id}><time>{dateLabel(moment.at)}</time><AssetArt id={moment.assetId} decorative /><span>{moment.title}</span></li>)}
            </ol>
          ) : <p className="v3-quiet">还没有成长片段。没有记录时，我们不作推断。</p>}
        </section>
      </div>
    </section>
  )
}
