import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { appPath } from '../../data/paths.js'
import { localDateKey } from '../../domain/model.js'
import { RESPONSIBILITY_ACTIVITIES, responsibilityActivity, responsibilityRole, responsibilityScaffold } from '../../modules/responsibility/responsibilityCatalog.js'
import { activeResponsibilitySession, responsibilityAssignments, responsibilityRoutines, responsibilitySession, responsibilitySessionId, responsibilityState, routineForActivity } from '../../modules/responsibility/responsibilityModel.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { Icon } from '../../ui/Icons.jsx'
import { CharacterPose } from '../../ui/ThemeArt.jsx'

function Avatar({ participant }) {
  if (participant.kind === 'adult') return <span className="v3-cottage__adult" aria-hidden="true"><img src={appPath('assets/app-icon.png')} alt="" /></span>
  return <CharacterPose character={participant.character} pose="celebrate" label={`${participant.name}的角色`} className="v3-cottage__avatar" />
}

const startPath = (activityId, sessionId) => `/responsibility/role/${activityId}/${sessionId}`

export function FamilyCottage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profileId = state.activeProfileId
  const routines = responsibilityRoutines(state)
  const primary = routines[0]
  const active = activeResponsibilitySession(state, profileId)
  const open = (activityId, routine = routineForActivity(state, activityId)) => navigate(startPath(activityId, responsibilitySessionId(routine.id)))
  const activeRole = active ? responsibilityRole(active.participants.find((item) => item.profileId === profileId)?.roleId) : null

  return (
    <div className="v3-room v3-cottage" aria-labelledby="family-cottage-title">
      <header className="v3-room__banner">
        <img className="v3-room__art" src={appPath('assets/responsibility/family-cottage-hero.webp')} alt="灯光温暖的家庭小屋，小伙伴正在准备餐桌" />
        <div className="v3-room__copy">
          <span className="v3-eyebrow">一起照顾我们的家</span>
          <h1 id="family-cottage-title" className="v3-display">家庭小屋</h1>
          <p>每个人都有一个小角色，合起来就是家的样子。</p>
        </div>
      </header>

      {active ? (
        <button className="v3-feature" type="button" onClick={() => navigate(`/responsibility/play/${active.activityId}/${active.id}`)}>
          <img src={activeRole.image} alt="" />
          <span><small>继续我的小角色</small><strong className="v3-display">{activeRole.title}</strong></span>
          <Icon name="chevron" />
        </button>
      ) : (
        <button className="v3-feature" type="button" onClick={() => open(primary.activityId, primary)}>
          <img src={responsibilityRole(responsibilityActivity(primary.activityId).imageRoleId).image} alt="" />
          <span><small>{primary.timeLabel ? `${primary.timeLabel} · ` : ''}{state.profiles.length + 1} 位家人一起</small><strong className="v3-display">{primary.title}</strong></span>
          <Icon name="chevron" />
        </button>
      )}

      <h2 className="v3-room__label">也可以一起做</h2>
      <div className="v3-tiles" role="group" aria-label="家庭活动">
        {RESPONSIBILITY_ACTIVITIES.map((activity, index) => (
          <button type="button" key={activity.id} className="v3-tile" style={{ '--i': index }} onClick={() => open(activity.id)}>
            <img src={responsibilityRole(activity.imageRoleId).image} alt="" />
            <strong>{activity.title}</strong>
            <small>{activity.subtitle}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

export function FamilyRole() {
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
  return (
    <div className="v3-room v3-split" aria-labelledby="family-role-title">
      <img className="v3-split__art" src={appPath('assets/responsibility/family-table-active.webp')} alt="一家人正在一起准备餐桌" />
      <section className="v3-split__sheet">
        <span className="v3-eyebrow">今晚一起做</span>
        <h1 id="family-role-title" className="v3-display">{activity.title}</h1>
        <p className="v3-split__lead">每个人都有一个小角色</p>
        <ul className="v3-cottage__people">
          {participants.map((participant, index) => {
            const me = participant.profileId === state.activeProfileId
            return (
              <li key={participant.id} className={`v3-cottage__person ${me ? 'is-me' : ''}`} style={{ '--i': index }}>
                <Avatar participant={participant} />
                <span><strong>{participant.name} · {participant.roleTitle || responsibilityRole(participant.roleId).title}</strong><small>{me ? scaffold.childCopy : participant.kind === 'adult' ? '热的、高的东西交给大人' : '我们一起准备'}</small></span>
                {me ? <em>你来负责</em> : null}
              </li>
            )
          })}
        </ul>
        <div className="v3-actions">
          <button className="v3-button" type="button" onClick={start}>大家准备好啦</button>
          <button className="v3-button v3-button--wool" type="button" onClick={requestChange}>我需要换个角色</button>
        </div>
        {changeRequested ? <p className="v3-status" role="status">已经告诉家长，今晚可以一起换一换。</p> : null}
        <p className="v3-note"><Icon name="shield" size={18} />热的、高的、重的东西交给大人</p>
      </section>
    </div>
  )
}

export function FamilyPlay() {
  const { activityId, sessionId } = useParams()
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [showReflection, setShowReflection] = useState(false)
  const session = responsibilitySession(state, sessionId)
  if (!session) {
    return (
      <div className="v3-room v3-empty">
        <h1 className="v3-display">这次家庭活动还没开始</h1>
        <button className="v3-button" type="button" onClick={() => navigate(`/responsibility/role/${activityId}/${sessionId}`)}>看看我的角色</button>
      </div>
    )
  }
  const current = session.participants.find((item) => item.profileId === state.activeProfileId)
  const role = responsibilityRole(current?.roleId)
  const completed = session.completedRoleIds?.includes(current?.id)
  const helped = session.helpRequests?.some((item) => item.profileId === state.activeProfileId)
  const complete = () => dispatch({ type: 'COMPLETE_RESPONSIBILITY_ROLE', profileId: state.activeProfileId, sessionId, participantId: current.id })
  const reflect = (phrase) => {
    dispatch({ type: 'ADD_RESPONSIBILITY_REFLECTION', profileId: state.activeProfileId, sessionId, phrase })
    navigate('/family-cottage')
  }

  if (completed) {
    const shared = session.status === 'complete'
    return (
      <div className="v3-room v3-split v3-split--done">
        <img className="v3-split__art" src={appPath('assets/responsibility/family-table-complete.webp')} alt="一家人完成了各自的小角色，桌上出现了三叶花瓶" />
        <section className="v3-split__sheet">
          <span className="v3-eyebrow">家里的这一刻</span>
          <h1 className="v3-display">{shared ? '我们一起准备好了' : '我的小角色做好了'}</h1>
          <p className="v3-split__lead">{shared ? '每个人的小角色，合在一起就是家的样子。' : '家人还在准备，你已经完成自己的这一份。'}</p>
          <ul className="v3-cottage__row">
            {session.participants.map((participant) => (
              <li key={participant.id}><Avatar participant={participant} /><b>{participant.name}</b><small>{participant.roleTitle || responsibilityRole(participant.roleId).title}</small></li>
            ))}
          </ul>
          {showReflection ? (
            <div className="v3-actions v3-actions--choices" role="group" aria-label="我想说一句">
              <button className="v3-button v3-button--wool" type="button" onClick={() => reflect('together-good')}>我们配合得很好</button>
              <button className="v3-button v3-button--wool" type="button" onClick={() => reflect('need-more-help')}>我还需要多陪一点</button>
              <button className="v3-button v3-button--wool" type="button" onClick={() => reflect('change-role')}>下次想换个角色</button>
            </div>
          ) : (
            <div className="v3-actions">
              <button className="v3-button" type="button" onClick={() => navigate('/family-cottage')}>收进家庭小屋</button>
              <button className="v3-button v3-button--wool" type="button" onClick={() => setShowReflection(true)}>我想说一句</button>
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="v3-room v3-cottage-play">
      <header className="v3-cottage-play__head">
        <span className="v3-eyebrow">我的小角色</span>
        <h1 className="v3-display">{role.title}</h1>
        <p>{role.copy}</p>
      </header>
      <ol className="v3-strip">
        {role.steps.map((step, index) => (
          <li key={step} className="v3-felt" style={{ '--i': index }}>
            <b className="v3-num">{index + 1}</b>
            <img src={role.stepImages?.[index] || role.image} alt="" />
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {helped ? <p className="v3-status" role="status">已经告诉家长，等一等就会来陪你。</p> : null}
      <div className="v3-actions v3-actions--row">
        <button className="v3-button v3-button--sage" type="button" onClick={complete}><Icon name="check" />我做好啦</button>
        <button className="v3-button v3-button--wool" type="button" onClick={() => dispatch({ type: 'REQUEST_RESPONSIBILITY_HELP', profileId: state.activeProfileId, sessionId })}>我需要帮助</button>
        <button className="v3-textlink" type="button" onClick={() => navigate('/family-cottage')}>先回家庭小屋</button>
      </div>
      <p className="v3-note"><Icon name="home" size={18} />家人也在一起准备 · {role.safety}</p>
    </div>
  )
}
