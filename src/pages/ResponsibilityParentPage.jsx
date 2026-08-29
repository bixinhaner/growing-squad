import { useMemo, useState } from 'react'
import { RESPONSIBILITY_ACTIVITIES, RESPONSIBILITY_SCAFFOLDS, responsibilityActivity, responsibilityRole } from '../modules/responsibility/responsibilityCatalog.js'
import { responsibilityAssignments, responsibilityRoutines, responsibilityState, responsibilityStats } from '../modules/responsibility/responsibilityModel.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose } from '../ui/ThemeArt.jsx'

function ParentParticipant({ participant }) {
  return <span className="responsibility-parent-participant">{participant.kind === 'child' ? <CharacterPose character={participant.character} pose="celebrate" decorative className="responsibility-parent-avatar" /> : <img src={responsibilityRole('bring-tissues').image} alt="" />}<b>{participant.name}</b><small>{participant.roleTitle || responsibilityRole(participant.roleId).title}</small></span>
}

export function ResponsibilityParentPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ activityId: 'prepare-table', timeLabel: '18:30', rotation: 'weekly' })
  const profileId = state.activeProfileId
  const routines = responsibilityRoutines(state)
  const primary = routines[0]
  const currentAssignments = useMemo(() => responsibilityAssignments(state, primary), [primary, state])
  const nextAssignments = useMemo(() => responsibilityAssignments(state, primary, 1), [primary, state])
  const stats = responsibilityStats(state, profileId)
  const module = responsibilityState(state)
  const help = [...Object.values(module.sessions).flatMap((session) => (session.helpRequests || []).filter((item) => !item.resolvedAt).map((item) => ({ ...item, session, kind: 'help' }))), ...(module.roleChangeRequests || []).filter((item) => !item.resolvedAt).map((item) => ({ ...item, kind: 'change' }))].sort((a, b) => Number(b.requestedAt) - Number(a.requestedAt))[0]
  const recentMoments = state.growth.moments.filter((item) => item.type === 'responsibility.shared-completed').sort((a, b) => b.createdAt - a.createdAt)
  const save = (event) => {
    event.preventDefault()
    const activity = responsibilityActivity(draft.activityId)
    dispatch({ type: 'UPSERT_RESPONSIBILITY_ROUTINE', profileId, routine: { id: `responsibility-routine-${Date.now()}`, activityId: activity.id, title: activity.title, timeLabel: draft.timeLabel, rotation: draft.rotation, rotationOffset: 0, active: true } })
    setAdding(false)
  }
  const rotate = () => module.routines.some((item) => item.id === primary.id)
    ? dispatch({ type: 'ROTATE_RESPONSIBILITY_ROLES', profileId, routineId: primary.id, rotationOffset: Number(primary.rotationOffset || 0) + 1 })
    : dispatch({ type: 'UPSERT_RESPONSIBILITY_ROUTINE', profileId, routine: { ...primary, rotationOffset: Number(primary.rotationOffset || 0) + 1 } })
  const resolveRequest = () => dispatch({ type: 'RESOLVE_RESPONSIBILITY_REQUEST', profileId: help.profileId, kind: help.kind, requestId: help.id, sessionId: help.session?.id })
  const currentRole = currentAssignments.find((item) => item.profileId === profileId)
  return <section className="responsibility-parent"><header><div><span className="page-title__eyebrow">成长模块</span><h1>家庭责任</h1><p>安排真实的小角色，看见孩子怎样逐渐少一点提醒。</p></div><button className="button button--primary" type="button" onClick={() => setAdding(true)}><Icon name="home" />安排家庭活动</button></header>
    <div className="responsibility-parent__insights"><article><span>今晚一起做</span><h2>{primary.title}</h2><div>{currentAssignments.map((item) => <ParentParticipant participant={item} key={item.id} />)}</div><small>{primary.timeLabel || '时间由家里决定'}</small></article><article><span>陪伴正在变化</span><div className="responsibility-scaffold-path">{RESPONSIBILITY_SCAFFOLDS.map((item, index) => <button type="button" key={item.id} className={stats.scaffold === item.id ? 'is-active' : ''} onClick={() => dispatch({ type: 'UPDATE_RESPONSIBILITY_SCAFFOLD', profileId, stage: item.id })}><b>{index + 1}</b><small>{item.title}</small></button>)}</div><p>当前：{RESPONSIBILITY_SCAFFOLDS.find((item) => item.id === stats.scaffold)?.title}</p></article><article><span>需要处理</span>{help ? <><h2>{state.profiles.find((item) => item.id === help.profileId)?.name || '孩子'}{help.kind === 'change' ? '想换个角色' : '需要帮助'}</h2><p>{responsibilityActivity(help.activityId || help.session?.activityId).title} · {help.kind === 'change' ? '一起商量，不直接替孩子决定' : '陪一下再慢慢放手'}</p><button className="responsibility-parent__resolve" type="button" onClick={resolveRequest}>已经回应孩子</button></> : <><h2>暂时没有求助</h2><p>需要帮助是有效信号，不是退步。</p></>}</article></div>
    <div className="responsibility-parent__grid"><section className="responsibility-rotation"><header><div><h2>家庭角色安排</h2><p>{primary.rotation === 'weekly' ? '每周换一次' : '需要时换一换'}，让每个人都有机会尝试不同角色。</p></div><button type="button" onClick={rotate}><Icon name="sparkle" />轮换一次</button></header><div className="responsibility-rotation__head"><span>家庭成员</span><b>现在</b><b>换一次后</b></div>{currentAssignments.map((participant, index) => <div className="responsibility-rotation__row" key={participant.id}><ParentParticipant participant={participant} /><span>{participant.roleTitle || responsibilityRole(participant.roleId).title}</span><Icon name="chevron" /><span>{nextAssignments[index].roleTitle || responsibilityRole(nextAssignments[index].roleId).title}</span></div>)}<footer><Icon name="shield" />不会生成孩子之间的次数比较或排名。</footer></section>
      <section className="responsibility-moments"><h2>家庭共同记录</h2><p>记录“我们一起完成”的真实时刻。</p>{recentMoments.length ? recentMoments.slice(0, 5).map((moment) => <article key={moment.id}><img src={responsibilityRole(responsibilityActivity(moment.activityId).imageRoleId).image} alt="" /><span><strong>{responsibilityActivity(moment.activityId).title}</strong><small>{moment.participants.map((item) => `${item.name} · ${item.roleTitle || responsibilityRole(item.roleId).title}`).join(' / ')}</small></span></article>) : <div className="responsibility-parent-empty">完成一次家庭活动后，这里会出现共同记录。</div>}</section>
      <aside className="responsibility-child-preview"><span>孩子会看到什么</span><img src={responsibilityRole(currentRole?.roleId).image} alt="" /><small>{state.profiles.find((item) => item.id === profileId)?.name}的小角色</small><h2>{responsibilityRole(currentRole?.roleId).title}</h2><p>{responsibilityRole(currentRole?.roleId).copy}</p><footer><Icon name="home" />角色清楚，但不会出现积分和比较。</footer></aside></div>
    {adding ? <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAdding(false) }}><form className="responsibility-modal" onSubmit={save}><header><div><span className="eyebrow">家庭活动</span><h2>安排一次真实的小合作</h2></div><button type="button" aria-label="关闭" onClick={() => setAdding(false)}><Icon name="close" /></button></header><label>选择活动<select value={draft.activityId} onChange={(event) => setDraft({ ...draft, activityId: event.target.value })}>{RESPONSIBILITY_ACTIVITIES.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>大约什么时候<input type="time" value={draft.timeLabel} onChange={(event) => setDraft({ ...draft, timeLabel: event.target.value })} /></label><label>角色轮换<select value={draft.rotation} onChange={(event) => setDraft({ ...draft, rotation: event.target.value })}><option value="weekly">每周轮换</option><option value="manual">家长手动调整</option></select></label><div className="responsibility-modal__preview">{responsibilityAssignments(state, { ...draft, id: 'preview' }).map((item) => <ParentParticipant key={item.id} participant={item} />)}</div><p><Icon name="shield" />热的、高的、重的角色始终由家长承担。</p><button className="button button--primary" type="submit">保存家庭活动</button></form></div> : null}
  </section>
}
