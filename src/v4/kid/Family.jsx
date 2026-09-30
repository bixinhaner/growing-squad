import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { getActiveProfile, localDateKey } from '../../domain/model.js'
import { RESPONSIBILITY_ACTIVITIES, responsibilityActivity, responsibilityRole, responsibilityScaffold } from '../../modules/responsibility/responsibilityCatalog.js'
import { activeResponsibilitySession, responsibilityAssignments, responsibilityRoutines, responsibilitySession, responsibilitySessionId, responsibilityState, routineForActivity } from '../../modules/responsibility/responsibilityModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Pic, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'

function Person({ participant, me }) {
  return (
    <span className={`k-person${me ? ' is-me' : ''}`}>
      {participant.kind === 'adult'
        ? <span className="k-person__adult" aria-hidden="true"><Icon name="user" size={34} /></span>
        : <Buddy character={participant.character} mood={me ? 'cheer' : 'hello'} />}
    </span>
  )
}

export function FamilyHome() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const routines = responsibilityRoutines(state)
  const primary = routines[0]
  const active = activeResponsibilitySession(state, profile.id)
  const activeRole = active ? responsibilityRole(active.participants.find((item) => item.profileId === profile.id)?.roleId) : null
  const open = (activityId, routine = routineForActivity(state, activityId)) => navigate(`/family/role/${activityId}/${responsibilitySessionId(routine.id)}`)
  const others = RESPONSIBILITY_ACTIVITIES.filter((activity) => activity.id !== primary?.activityId)

  return (
    <section className="k-place k-family" aria-labelledby="k-family-title">
      <header className="k-place__head">
        <Buddy character={profile.character} mood="hello" />
        <div>
          <h1 id="k-family-title" className="u-display">帮家里</h1>
          <p className="k-place__sub">每个人一个小角色，一起把家照顾好<Speak text="帮家里。每个人一个小角色，一起把家照顾好。" /></p>
        </div>
      </header>

      {active ? (
        <button type="button" className="k-continue" onClick={() => navigate(`/family/play/${active.activityId}/${active.id}`)}>
          <img className="k-cover" src={activeRole.image} alt="" />
          <span><small>我的小角色还在等我</small><strong className="u-display">{activeRole.title}</strong></span>
          <span className="k-continue__go">继续<Icon name="chevron" size={20} /></span>
        </button>
      ) : primary ? (
        <button type="button" className="k-feature" onClick={() => open(primary.activityId, primary)}>
          <Pic src="assets/responsibility/family-table-active.webp" />
          <span className="k-feature__body">
            <small>{primary.timeLabel ? `${primary.timeLabel} · ` : ''}今天的家务</small>
            <strong className="u-display">{primary.title}</strong>
            <span className="k-feature__go">看看我的角色<Icon name="chevron" size={20} /></span>
          </span>
        </button>
      ) : null}

      <h2 className="k-section-title u-display">也可以一起做</h2>
      <div className="k-cards">
        {others.map((activity) => (
          <button type="button" key={activity.id} className="k-card" onClick={() => open(activity.id)}>
            <span className="k-card__pic is-contain"><img src={responsibilityRole(activity.imageRoleId).image} alt="" /></span>
            <span className="k-card__body"><strong>{activity.title}</strong><small>{activity.subtitle}</small></span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** Who does what tonight: the whole family lined up as a team. */
export function FamilyRole() {
  const { activityId, sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const activity = responsibilityActivity(activityId)
  const routine = routineForActivity(state, activityId)
  const participants = useMemo(() => responsibilityAssignments(state, routine), [routine, state])
  const scaffold = responsibilityScaffold(responsibilityState(state).scaffoldByProfile[profile.id])
  const mine = participants.find((item) => item.profileId === profile.id)
  const myRole = responsibilityRole(mine?.roleId)
  const existing = responsibilitySession(state, sessionId)
  // Already started today — go straight to my part.
  if (existing) return <Navigate to={`/family/play/${activityId}/${sessionId}`} replace />
  const start = () => {
    dispatch({ type: 'START_RESPONSIBILITY_SESSION', profileId: profile.id, sessionId, routineId: routine.id, activityId, dateKey: localDateKey(), participants })
    navigate(`/family/play/${activityId}/${sessionId}`)
  }
  const change = () => {
    dispatch({ type: 'REQUEST_RESPONSIBILITY_ROLE_CHANGE', profileId: profile.id, activityId, routineId: routine.id, currentRoleId: mine?.roleId })
    toast('已经告诉家长，想换个角色。')
  }
  return (
    <div className="k-panel k-team">
      <header className="k-team__head">
        <span className="k-go__eyebrow">今天一起做</span>
        <h1 className="u-display">{activity.title}</h1>
        <p>每个人都有一个小角色<Speak text={`${activity.title}。你的角色是${myRole.title}。${scaffold.childCopy}`} /></p>
      </header>
      <ul className="k-team__line">
        {participants.map((participant, index) => {
          const me = participant.profileId === profile.id
          return (
            <li key={participant.id} className={me ? 'is-me' : ''} style={{ '--i': index }}>
              <Person participant={participant} me={me} />
              <strong>{participant.name}</strong>
              <span className="k-team__role">{participant.roleTitle || responsibilityRole(participant.roleId).title}</span>
              {me ? <em>我来</em> : null}
            </li>
          )
        })}
      </ul>
      <p className="k-safety"><Icon name="shield" size={18} />热的、高的、重的东西交给大人</p>
      <div className="k-team__go">
        <Tap tone="primary" size="xl" icon="users" onClick={start}>大家准备好啦</Tap>
        <Tap tone="quiet" size="s" onClick={change}>我想换个角色</Tap>
      </div>
    </div>
  )
}

const PHRASES = [
  { id: 'together-good', title: '我们配合得很好' },
  { id: 'need-more-help', title: '我还需要多陪一点' },
  { id: 'change-role', title: '下次想换个角色' },
]

export function FamilyPlay() {
  const { activityId, sessionId } = useParams()
  const { state } = useBedtimeState()
  return <FamilyPlayFor key={`${state.activeProfileId}:${sessionId}`} activityId={activityId} sessionId={sessionId} />
}

function FamilyPlayFor({ activityId, sessionId }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const [ticked, setTicked] = useState([])
  const [said, setSaid] = useState(false)
  const session = responsibilitySession(state, sessionId)
  if (!session) {
    return <div className="k-empty k-panel"><h1 className="u-display">这次家务还没开始</h1><Tap tone="primary" onClick={() => navigate(`/family/role/${activityId}/${sessionId}`)}>看看我的角色</Tap></div>
  }
  const current = session.participants.find((item) => item.profileId === profile.id)
  const role = responsibilityRole(current?.roleId)
  const completed = session.completedRoleIds?.includes(current?.id)
  const helped = session.helpRequests?.some((item) => item.profileId === profile.id)

  if (completed) {
    const shared = session.status === 'complete'
    return (
      <div className="k-panel k-done k-done--family">
        <Pic className="k-done__scene" src="assets/responsibility/family-table-complete.webp" />
        <h1 className="u-display">{shared ? '我们一起做好啦！' : '我的这一份做好啦！'}</h1>
        <p>{shared ? '每个人的小角色，合起来就是家的样子。' : '家人还在忙，你已经完成了自己的一份。'}</p>
        <ul className="k-team__line is-small">
          {session.participants.map((participant) => (
            <li key={participant.id} className={session.completedRoleIds?.includes(participant.id) ? 'is-done' : ''}>
              <Person participant={participant} me={participant.profileId === profile.id} />
              <strong>{participant.name}</strong>
            </li>
          ))}
        </ul>
        {said || session.reflections?.[profile.id] ? null : (
          <div className="k-say" role="group" aria-label="我想说一句">
            {PHRASES.map((item) => <button type="button" key={item.id} className="u-chip" onClick={() => { dispatch({ type: 'ADD_RESPONSIBILITY_REFLECTION', profileId: profile.id, sessionId, phrase: item.id }); setSaid(true); toast('收到啦，家长会看到。') }}>{item.title}</button>)}
          </div>
        )}
        <div className="k-done__go">
          <Tap tone="primary" size="l" icon="home" onClick={() => navigate('/today')}>回首页</Tap>
          <Tap tone="soft" size="l" onClick={() => navigate('/family')}>看看别的家务</Tap>
        </div>
      </div>
    )
  }

  const allTicked = role.steps.every((_, index) => ticked.includes(index))
  const tick = (index) => setTicked((list) => (list.includes(index) ? list.filter((item) => item !== index) : [...list, index]))
  return (
    <div className="k-panel k-chores">
      <header className="k-chores__head">
        <img className="k-cover" src={role.image} alt="" />
        <div>
          <span className="k-go__eyebrow">我的小角色</span>
          <h1 className="u-display">{role.title}</h1>
          <p>{role.copy}<Speak text={`${role.title}。${role.steps.map((step, index) => `第${index + 1}步，${step}`).join('。')}`} /></p>
        </div>
      </header>
      <p className="k-note">做好一步，就点一下那张卡片。</p>
      <ol className="k-chores__steps">
        {role.steps.map((step, index) => (
          <li key={step}>
            <button type="button" className={`k-chore${ticked.includes(index) ? ' is-done' : ''}`} aria-pressed={ticked.includes(index)} onClick={() => tick(index)}>
              <span className="k-chore__pic"><img src={role.stepImages?.[index] || role.image} alt="" /></span>
              <span className="k-chore__num u-num">{ticked.includes(index) ? <Icon name="check" size={20} strokeWidth={3} /> : index + 1}</span>
              <strong>{step}</strong>
            </button>
          </li>
        ))}
      </ol>
      {helped ? <p className="k-flag" role="status"><Icon name="bell" size={18} />已经告诉家长，等一等就来。</p> : null}
      <div className="k-go__more k-chores__go">
        <Tap tone={allTicked ? 'primary' : 'soft'} size={allTicked ? 'xl' : 'l'} icon="check" onClick={() => dispatch({ type: 'COMPLETE_RESPONSIBILITY_ROLE', profileId: profile.id, sessionId, participantId: current.id })}>我做好啦</Tap>
        {!helped ? <Tap tone="soft" size="s" icon="hand" onClick={() => dispatch({ type: 'REQUEST_RESPONSIBILITY_HELP', profileId: profile.id, sessionId })}>需要帮忙</Tap> : null}
      </div>
      <p className="k-safety"><Icon name="home" size={18} />{role.safety}</p>
    </div>
  )
}
