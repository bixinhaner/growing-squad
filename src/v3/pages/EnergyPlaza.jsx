import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { localDateKey } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { MOVEMENT_ACTIVITIES, getMovementActivity } from '../../modules/movement/activityCatalog.js'
import { movementRecommendations, movementSessionsFor, movementState } from '../../modules/movement/movementModel.js'
import { appPath } from '../../data/paths.js'
import { Icon } from '../../ui/Icons.jsx'

const participantCopy = { solo: '自己玩', parent: '和家长', sibling: '和兄弟姐妹' }
const FEELING = { again: '还想玩', 'just-right': '刚刚好', hard: '有点难', change: '下次换一种' }
const createSessionId = (profileId) => `movement-${profileId}-${localDateKey()}-${crypto.randomUUID()}`

export function MovementChoice() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [offset, setOffset] = useState(0)
  const profileId = state.activeProfileId
  const picks = useMemo(() => {
    const all = movementRecommendations(state, profileId, MOVEMENT_ACTIVITIES.length)
    return [all[offset % all.length], all[(offset + 1) % all.length]]
  }, [offset, profileId, state])
  const choose = (activity, supportMode = 'self') => {
    const sessionId = createSessionId(profileId)
    dispatch({ type: 'SELECT_MOVEMENT_ACTIVITY', profileId, sessionId, activityId: activity.id, initiatedBy: 'child', supportMode })
    navigate(`/movement/ready/${activity.id}/${sessionId}`, { state: { supportMode } })
  }
  return (
    <div className="v3-room v3-move" aria-labelledby="movement-choice-title">
      <header className="v3-move__head">
        <span className="v3-eyebrow">能量广场 · 今天只选一个</span>
        <h1 id="movement-choice-title" className="v3-display">今天想怎样动一动？</h1>
        <p>我挑了两个刚刚好的玩法，玩得开心就好。</p>
      </header>
      <div className="v3-move-picks" key={offset}>
        {picks.map((activity, index) => (
          <button key={activity.id} type="button" className="v3-move-card" style={{ '--i': index }} onClick={() => choose(activity)}>
            <img src={activity.image} alt="" />
            <span className="v3-move-card__tag">{activity.environment === 'indoor' ? '室内' : '户外'}</span>
            <strong className="v3-display">{activity.title}</strong>
            <small>{activity.participants.map((item) => participantCopy[item]).join(' / ')}</small>
            <span className="v3-move-card__go" aria-hidden="true">选这个 <Icon name="chevron" size={18} /></span>
          </button>
        ))}
      </div>
      <div className="v3-actions v3-actions--row">
        <button className="v3-button v3-button--wool" type="button" onClick={() => setOffset((value) => value + 2)}><Icon name="sparkle" size={20} />换两个</button>
        <button className="v3-button v3-button--wool" type="button" onClick={() => choose(picks[0], 'together')}><Icon name="heart" size={20} />和家长一起</button>
        <button className="v3-textlink" type="button" onClick={() => navigate('/today')}>今天先不做</button>
      </div>
    </div>
  )
}

export function MovementReady() {
  const { activityId, sessionId } = useParams()
  const activity = getMovementActivity(activityId)
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [helped, setHelped] = useState(false)
  if (!activity) return null
  const start = () => {
    dispatch({ type: 'START_MOVEMENT_ACTIVITY', profileId: state.activeProfileId, sessionId, activityId })
    navigate(`/movement/play/${sessionId}`)
  }
  const help = () => { dispatch({ type: 'REQUEST_MOVEMENT_HELP', profileId: state.activeProfileId, sessionId, activityId }); setHelped(true) }
  return (
    <div className="v3-room v3-split v3-move-ready">
      <img className="v3-split__art" src={activity.image} alt={activity.title} />
      <section className="v3-split__sheet">
        <span className="v3-eyebrow">准备一下就能玩</span>
        <h1 className="v3-display">{activity.title}</h1>
        <ol className="v3-move-steps">
          {activity.steps.map((step, index) => <li key={step} style={{ '--i': index }}><b className="v3-num">{index + 1}</b><span>{step}</span></li>)}
        </ol>
        <p className="v3-inv-safety"><Icon name="shield" size={18} />安全小约定：{activity.safety}</p>
        {helped ? <p className="v3-status" role="status">已经告诉家长，等一等就会来。</p> : null}
        <div className="v3-actions">
          <button className="v3-button v3-button--sage" type="button" onClick={start}>我准备好啦</button>
          <div className="v3-actions--row v3-actions">
            <button className="v3-textlink" type="button" onClick={() => navigate('/movement')}>换一个</button>
            <button className="v3-textlink" type="button" onClick={help}>需要帮助</button>
          </div>
        </div>
        <p className="v3-note">玩的时候不用看屏幕，回来再告诉我感觉</p>
      </section>
    </div>
  )
}

export function MovementPlay() {
  const { sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const session = movementState(state).sessions[sessionId]
  const activity = getMovementActivity(session?.activityId)
  if (!session || !activity) {
    return <div className="v3-room v3-empty"><h1 className="v3-display">这次活动已经收好啦</h1><button className="v3-button" type="button" onClick={() => navigate('/movement')}>再选一个活动</button></div>
  }
  if (session.status === 'feedback' || session.status === 'done') return <MovementFeedback session={session} activity={activity} />
  const complete = () => dispatch({ type: 'COMPLETE_MOVEMENT_ACTIVITY', profileId: state.activeProfileId, sessionId, activityId: activity.id })
  const art = activity.id === 'balloon-keep-up' ? appPath('assets/movement/balloon-active-hero.webp') : activity.image
  return (
    <div className="v3-move-play" style={{ '--art': `url("${art}")` }}>
      <div className="v3-move-play__card">
        <span className="v3-move-play__orb" aria-hidden="true"><Icon name="star" size={34} /></span>
        <h1 className="v3-display">去玩吧，屏幕在这里等你</h1>
        <p>{activity.steps.at(-1)}，回来再告诉我感觉</p>
        <button className="v3-button v3-move-play__back" type="button" onClick={complete}>我回来啦</button>
        <button className="v3-textlink" type="button" onClick={() => dispatch({ type: 'REQUEST_MOVEMENT_HELP', profileId: state.activeProfileId, sessionId, activityId: activity.id })}>需要帮助</button>
      </div>
    </div>
  )
}

function MovementFeedback({ session, activity }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const answer = (feedback) => {
    dispatch({ type: 'RECORD_MOVEMENT_FEEDBACK', profileId: state.activeProfileId, sessionId: session.id, activityId: activity.id, feedback, showAgain: feedback !== 'hard' })
    navigate('/energy-plaza')
  }
  const options = [
    { id: 'again', title: '还想玩', copy: '下次多推荐', tone: 'sun' },
    { id: 'just-right', title: '刚刚好', copy: '保持现在这样', tone: 'sage' },
    { id: 'hard', title: '有点难', copy: '下次换简单一点', tone: 'sky' },
  ]
  return (
    <div className="v3-room v3-move-feel">
      <div className="v3-move-feel__flower" aria-hidden="true"><span /><Icon name="star" size={44} /></div>
      <span className="v3-eyebrow">能量花亮起来啦</span>
      <h1 className="v3-display">回来啦，今天感觉怎么样？</h1>
      <p>没有对错，告诉眠眠真实的感觉</p>
      <div className="v3-move-feel__options">
        {options.map((option, index) => (
          <button key={option.id} type="button" className={`v3-move-feel__opt is-${option.tone}`} style={{ '--i': index }} onClick={() => answer(option.id)}>
            <i aria-hidden="true" /><strong>{option.title}</strong><small>{option.copy}</small>
          </button>
        ))}
      </div>
      <button className="v3-textlink" type="button" onClick={() => answer('change')}>下次换一种</button>
    </div>
  )
}

export function EnergyPlaza() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const sessions = movementSessionsFor(state, state.activeProfileId).filter((item) => item.completedAt).slice(0, 6)
  return (
    <div className="v3-room v3-plaza">
      <header className="v3-room__banner">
        <img className="v3-room__art" src={appPath('assets/movement/energy-plaza-hero.webp')} alt="发光花朵围绕的能量广场" />
        <div className="v3-room__copy">
          <span className="v3-eyebrow">每次动一动，都会点亮一朵花</span>
          <h1 className="v3-display">能量广场</h1>
          <button className="v3-button" type="button" onClick={() => navigate('/movement')}><Icon name="star" />再选一个活动</button>
        </div>
      </header>
      <h2 className="v3-room__label">亮起来的能量花</h2>
      {sessions.length ? (
        <ul className="v3-plaza__flowers">
          {sessions.map((session, index) => {
            const activity = getMovementActivity(session.activityId)
            return activity ? (
              <li key={session.id} style={{ '--i': index }}>
                <img src={activity.image} alt="" />
                <span><strong>{activity.title}</strong><small>{FEELING[session.feedback] || '完成了一次探索'}</small></span>
                <Icon name="star" />
              </li>
            ) : null
          })}
        </ul>
      ) : (
        <div className="v3-plaza__empty v3-felt"><strong>第一朵能量花在等你</strong><small>选一个喜欢的活动，回来后它就会亮起来</small></div>
      )}
    </div>
  )
}
