import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { localDateKey } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { MOVEMENT_ACTIVITIES, getMovementActivity } from '../modules/movement/activityCatalog.js'
import { movementRecommendations, movementState } from '../modules/movement/movementModel.js'
import { appPath } from '../data/paths.js'
import { Icon } from '../ui/Icons.jsx'

const participantCopy = { solo: '自己玩', parent: '和家长', sibling: '和兄弟姐妹' }

function createMovementSessionId(profileId) {
  return `movement-${profileId}-${localDateKey()}-${crypto.randomUUID()}`
}

export function MovementChoicePage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [offset, setOffset] = useState(0)
  const profileId = state.activeProfileId
  const recommendations = useMemo(() => {
    const all = movementRecommendations(state, profileId, MOVEMENT_ACTIVITIES.length)
    return [all[offset % all.length], all[(offset + 1) % all.length]]
  }, [offset, profileId, state])

  const choose = (activity, supportMode = 'self') => {
    const sessionId = createMovementSessionId(profileId)
    dispatch({ type: 'SELECT_MOVEMENT_ACTIVITY', profileId, sessionId, activityId: activity.id, initiatedBy: 'child', supportMode })
    navigate(`/movement/ready/${activity.id}/${sessionId}`, { state: { supportMode } })
  }

  return (
    <section className="movement-choice" aria-labelledby="movement-choice-title">
      <aside className="movement-choice__scene">
        <img src={appPath('assets/movement/energy-plaza-hero.webp')} alt="眠眠机器人在发光的能量广场等你" />
        <span>今天只选一个，玩得开心就好</span>
      </aside>
      <article className="movement-choice__content">
        <span className="eyebrow">运动小队</span>
        <h1 id="movement-choice-title">今天想怎样动一动？</h1>
        <p>我挑了两个刚刚好的玩法</p>
        <div className="movement-picks">
          {recommendations.map((activity) => <button key={activity.id} type="button" onClick={() => choose(activity)}>
            <img src={activity.image} alt="" />
            <span><strong>{activity.title}</strong><small>{activity.environment === 'indoor' ? '室内' : '户外'} · {activity.participants.map((item) => participantCopy[item]).join(' / ')}</small></span>
            <Icon name="chevron" />
          </button>)}
        </div>
        <div className="movement-choice__actions">
          <button type="button" onClick={() => setOffset((value) => value + 2)}><Icon name="sparkle" />换两个</button>
          <button type="button" onClick={() => choose(recommendations[0], 'together')}><Icon name="heart" />和家长一起</button>
          <button type="button" onClick={() => navigate('/today')}>今天先不做</button>
        </div>
      </article>
    </section>
  )
}

export function MovementReadyPage() {
  const { activityId, sessionId } = useParams()
  const activity = getMovementActivity(activityId)
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  if (!activity) return null
  const start = () => {
    dispatch({ type: 'START_MOVEMENT_ACTIVITY', profileId: state.activeProfileId, sessionId, activityId })
    navigate(`/movement/play/${sessionId}`)
  }
  return <section className="movement-ready">
    <header><button type="button" onClick={() => navigate('/movement')} aria-label="换一个活动"><Icon name="chevronBack" /></button><span className="eyebrow">准备一下就能玩</span></header>
    <div className="movement-ready__layout">
      <img className="movement-ready__art" src={activity.image} alt={activity.title} />
      <article><h1>{activity.title}</h1><div className="movement-steps">{activity.steps.map((step, index) => <div key={step}><b>{index + 1}</b><span>{step}</span></div>)}</div><p className="movement-safety"><Icon name="shield" />安全小约定：{activity.safety}</p><button className="movement-primary" type="button" onClick={start}>我准备好啦</button><div className="movement-secondary"><button type="button" onClick={() => navigate('/movement')}>换一个</button><button type="button" onClick={() => dispatch({ type: 'REQUEST_MOVEMENT_HELP', profileId: state.activeProfileId, sessionId, activityId })}>需要帮助</button></div></article>
    </div>
    <p className="movement-screen-note">玩的时候不用看屏幕，回来再告诉我感觉</p>
  </section>
}

export function MovementPlayPage() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const session = movementState(state).sessions[sessionId]
  const activity = getMovementActivity(session?.activityId)
  if (!session || !activity) return <section className="movement-missing"><h1>这次活动已经收好啦</h1><button className="button button--primary" onClick={() => navigate('/movement')}>再选一个活动</button></section>
  if (session.status === 'feedback' || session.status === 'done') return <MovementFeedback session={session} activity={activity} />
  const complete = () => dispatch({ type: 'COMPLETE_MOVEMENT_ACTIVITY', profileId: state.activeProfileId, sessionId, activityId: activity.id })
  return <section className="movement-play">
    <img src={activity.id === 'balloon-keep-up' ? appPath('assets/movement/balloon-active-hero.webp') : activity.image} alt="" />
    <div className="movement-play__veil" />
    <article><span className="movement-play__robot"><Icon name="star" /></span><h1>去玩吧，屏幕在这里等你</h1><p>{activity.steps.at(-1)}，回来再告诉我感觉</p><button className="movement-primary" type="button" onClick={complete}>我回来啦</button><button className="movement-help" type="button" onClick={() => dispatch({ type: 'REQUEST_MOVEMENT_HELP', profileId: state.activeProfileId, sessionId, activityId: activity.id })}>需要帮助</button></article>
  </section>
}

function MovementFeedback({ session, activity }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const answer = (feedback) => {
    dispatch({ type: 'RECORD_MOVEMENT_FEEDBACK', profileId: state.activeProfileId, sessionId: session.id, activityId: activity.id, feedback, showAgain: feedback !== 'hard' })
    navigate('/energy-plaza')
  }
  return <section className="movement-feedback">
    <div className="energy-flower" aria-hidden="true"><span /><Icon name="star" size={44} /></div>
    <span className="eyebrow">能量花亮起来啦</span><h1>回来啦，今天感觉怎么样？</h1><p>没有对错，告诉眠眠真实的感觉</p>
    <div className="movement-feelings"><button type="button" onClick={() => answer('again')}><strong>还想玩</strong><small>下次多推荐</small></button><button type="button" onClick={() => answer('just-right')}><strong>刚刚好</strong><small>保持现在这样</small></button><button type="button" onClick={() => answer('hard')}><strong>有点难</strong><small>下次换简单一点</small></button></div>
    <button className="movement-feedback__change" type="button" onClick={() => answer('change')}>下次换一种</button>
  </section>
}
