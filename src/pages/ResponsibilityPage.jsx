import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appPath } from '../data/paths.js'
import { localDateKey } from '../domain/model.js'
import { RESPONSIBILITY_ACTIVITIES, responsibilityActivity, responsibilityRole, responsibilityScaffold } from '../modules/responsibility/responsibilityCatalog.js'
import { activeResponsibilitySession, responsibilityAssignments, responsibilityRoutines, responsibilitySession, responsibilitySessionId, responsibilityState, routineForActivity } from '../modules/responsibility/responsibilityModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose } from '../ui/ThemeArt.jsx'

function ParticipantAvatar({ participant, compact = false }) {
  if (participant.kind === 'adult') return <span className={`responsibility-adult-avatar ${compact ? 'is-compact' : ''}`}><img src={appPath('assets/app-icon.png')} alt="" /></span>
  return <CharacterPose character={participant.character} pose="celebrate" label={`${participant.name}的角色`} className={`responsibility-participant-avatar ${compact ? 'is-compact' : ''}`} />
}

const startPath = (activityId, sessionId) => `/responsibility/role/${activityId}/${sessionId}`

export function FamilyCottagePage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profileId = state.activeProfileId
  const routines = responsibilityRoutines(state)
  const primary = routines[0]
  const active = activeResponsibilitySession(state, profileId)
  const open = (activityId, routine = routineForActivity(state, activityId)) => navigate(startPath(activityId, responsibilitySessionId(routine.id)))
  const activeRole = active ? responsibilityRole(active.participants.find((item) => item.profileId === profileId)?.roleId) : null

  return <section className="family-cottage" aria-labelledby="family-cottage-title">
    <aside className="family-cottage__hero">
      <img src={appPath('assets/responsibility/family-cottage-hero.webp')} alt="灯光温暖的家庭小屋，眠眠正在准备餐桌" />
      <div><span className="eyebrow">一起照顾我们的家</span><h1 id="family-cottage-title">家庭小屋</h1><p>每个人都有一个小角色</p></div>
    </aside>
    <article className="family-cottage__content">
      <header><div><span className="eyebrow">今天一起做</span><h2>把家变舒服一点</h2></div><button type="button" onClick={() => navigate('/today')}>今天先看看</button></header>
      {active ? <button className="family-cottage__continue" type="button" onClick={() => navigate(`/responsibility/play/${active.activityId}/${active.id}`)}><img src={activeRole.image} alt="" /><span><small>继续我的小角色</small><strong>{activeRole.title}</strong></span><Icon name="chevron" /></button>
        : <button className="family-cottage__shared" type="button" onClick={() => open(primary.activityId, primary)}><img src={responsibilityRole(responsibilityActivity(primary.activityId).imageRoleId).image} alt="" /><span><small>{primary.timeLabel ? `${primary.timeLabel} · ` : ''}{state.profiles.length + 1} 位家人一起</small><strong>{primary.title}</strong></span><Icon name="chevron" /></button>}
      <div className="family-cottage__grid" aria-label="家庭活动">
        {RESPONSIBILITY_ACTIVITIES.map((activity) => <button type="button" key={activity.id} onClick={() => open(activity.id)}><img src={responsibilityRole(activity.imageRoleId).image} alt="" /><span><strong>{activity.title}</strong><small>{activity.subtitle}</small></span></button>)}
      </div>
      <p className="family-cottage__note"><Icon name="home" />每个人的小角色，合起来就是家的样子</p>
    </article>
  </section>
}

export function ResponsibilityRolePage() {
  const { activityId, sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [changeRequested, setChangeRequested] = useState(false)
  const activity = responsibilityActivity(activityId)
  const routine = routineForActivity(state, activityId)
  const participants = useMemo(() => responsibilityAssignments(state, routine), [routine, state])
  const scaffold = responsibilityScaffold(responsibilityState(state).scaffoldByProfile[state.activeProfileId])
  const start = () => {
    dispatch({ type: 'START_RESPONSIBILITY_SESSION', profileId: state.activeProfileId, sessionId, routineId: routine.id, activityId, dateKey: localDateKey(), participants })
    navigate(`/responsibility/play/${activityId}/${sessionId}`)
  }
  const requestChange = () => {
    const current = participants.find((item) => item.profileId === state.activeProfileId)
    dispatch({ type: 'REQUEST_RESPONSIBILITY_ROLE_CHANGE', profileId: state.activeProfileId, activityId, routineId: routine.id, currentRoleId: current?.roleId })
    setChangeRequested(true)
  }
  return <section className="responsibility-role" aria-labelledby="responsibility-role-title">
    <aside><img src={appPath('assets/responsibility/family-table-active.webp')} alt="一家人正在一起准备餐桌" /></aside>
    <article><span className="eyebrow">今晚一起做</span><h1 id="responsibility-role-title">{activity.title}</h1><p>每个人都有一个小角色</p>
      <div className="responsibility-role__people">{participants.map((participant) => <div key={participant.id} className={participant.profileId === state.activeProfileId ? 'is-me' : ''}><ParticipantAvatar participant={participant} /><span><strong>{participant.name} · {participant.roleTitle || responsibilityRole(participant.roleId).title}</strong><small>{participant.profileId === state.activeProfileId ? scaffold.childCopy : participant.kind === 'adult' ? '热的、高的东西交给大人' : '我们一起准备'}</small></span>{participant.profileId === state.activeProfileId ? <em>你来负责</em> : null}</div>)}</div>
      <button className="responsibility-primary" type="button" onClick={start}>大家准备好啦</button><button className="responsibility-secondary" type="button" onClick={requestChange}>我需要换个角色</button>{changeRequested ? <p className="responsibility-change-requested" role="status">已经告诉家长，今晚可以一起换一换。</p> : null}<p className="responsibility-safety"><Icon name="shield" />热的、高的、重的东西交给大人</p>
    </article>
  </section>
}

export function ResponsibilityPlayPage() {
  const { activityId, sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [showReflection, setShowReflection] = useState(false)
  const session = responsibilitySession(state, sessionId)
  if (!session) return <section className="responsibility-missing"><h1>这次家庭活动还没开始</h1><button type="button" onClick={() => navigate(`/responsibility/role/${activityId}/${sessionId}`)}>看看我的角色</button></section>
  const current = session.participants.find((item) => item.profileId === state.activeProfileId)
  const role = responsibilityRole(current?.roleId)
  const completed = session.completedRoleIds?.includes(current?.id)
  const helped = session.helpRequests?.some((item) => item.profileId === state.activeProfileId)
  const complete = () => dispatch({ type: 'COMPLETE_RESPONSIBILITY_ROLE', profileId: state.activeProfileId, sessionId, participantId: current.id })
  const reflect = (phrase) => {
    dispatch({ type: 'ADD_RESPONSIBILITY_REFLECTION', profileId: state.activeProfileId, sessionId, phrase })
    navigate('/family-cottage')
  }
  if (completed) return <section className={`responsibility-complete ${session.status === 'complete' ? 'is-shared' : 'is-waiting'}`}><img src={appPath('assets/responsibility/family-table-complete.webp')} alt="一家人完成了各自的小角色，桌上出现了三叶花瓶" /><article><span className="eyebrow">家里的这一刻</span><h1>{session.status === 'complete' ? '我们一起准备好了' : '我的小角色做好了'}</h1><p>{session.status === 'complete' ? '每个人的小角色，合在一起就是家的样子。' : '家人还在准备，你已经完成自己的这一份。'}</p><div className="responsibility-complete__people">{session.participants.map((participant) => <span key={participant.id}><ParticipantAvatar participant={participant} compact /><b>{participant.name}</b><small>{participant.roleTitle || responsibilityRole(participant.roleId).title}</small></span>)}</div>{showReflection ? <div className="responsibility-reflection"><button type="button" onClick={() => reflect('together-good')}>我们配合得很好</button><button type="button" onClick={() => reflect('need-more-help')}>我还需要多陪一点</button><button type="button" onClick={() => reflect('change-role')}>下次想换个角色</button></div> : <><button className="responsibility-primary" type="button" onClick={() => navigate('/family-cottage')}>收进家庭小屋</button><button className="responsibility-secondary" type="button" onClick={() => setShowReflection(true)}>我想说一句</button></>}</article></section>
  return <section className="responsibility-play"><img src={appPath('assets/responsibility/family-table-active.webp')} alt="家人正在一起准备" /><article><span className="responsibility-role-pill">我的小角色</span><h1>{role.title}</h1><p>{role.copy}</p><div className="responsibility-play__steps">{role.steps.map((step, index) => <div key={step}><b>{index + 1}</b><img src={role.stepImages?.[index] || role.image} alt="" /><span>{step}</span></div>)}</div>{helped ? <p className="responsibility-helped" role="status">已经告诉家长，等一等就会来陪你。</p> : null}<button className="responsibility-primary" type="button" onClick={complete}>我做好啦</button><button className="responsibility-secondary" type="button" onClick={() => dispatch({ type: 'REQUEST_RESPONSIBILITY_HELP', profileId: state.activeProfileId, sessionId })}>我需要帮助</button><button className="responsibility-return" type="button" onClick={() => navigate('/family-cottage')}>先回家庭小屋</button><p className="responsibility-together"><Icon name="home" />家人也在一起准备</p></article></section>
}
