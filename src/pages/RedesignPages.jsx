import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CHARACTER_OPTIONS, addDays, dayTypeFor, getActiveProfile,
  getEarlyMinutes, getLastSevenDays, getRewardMoments, getRoutine, getSchedule,
  getSession, getSessionHistory, getStarBalance, getWeeklyMetrics, localDateKey, uid,
} from '../domain/model.js'
import { OBJECT_ASSET_OPTIONS } from '../domain/assets.js'
import { deriveTodayCandidate } from '../core/today/todayEngine.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { AssetArt, CompanionArt } from '../ui/AssetArt.jsx'
import { Drawer, Modal, Toggle } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'

const weekNames = ['日', '一', '二', '三', '四', '五', '六']
const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
const formatDate = (dateKey) => new Date(`${dateKey}T12:00:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })

function FeltButton({ children, onClick, className = '', disabled = false }) {
  return <button className={`gs-felt-button ${className}`} type="button" onClick={onClick} disabled={disabled}>{children}</button>
}

export function RedesignTodayPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const candidate = useMemo(() => deriveTodayCandidate(state, profile.id), [profile.id, state])
  const [helpOpen, setHelpOpen] = useState(false)
  const [message, setMessage] = useState('')
  const primary = candidate.options[0]
  const start = () => {
    if (candidate.period === 'evening' || candidate.period === 'night') return navigate('/tonight')
    if (primary?.route) return navigate(primary.route)
    if (primary) dispatch({ type: 'TODAY_CHOOSE_ITEM', profileId: profile.id, dateKey: localDateKey(), routineId: candidate.routineId, itemId: primary.id })
    setMessage('出发啦，一次只做一件。')
  }
  const later = () => {
    dispatch({ type: 'TODAY_LATER', profileId: profile.id, dateKey: localDateKey(), laterMinutes: 20 })
    setMessage('记住啦，20 分钟后再来看看。')
  }
  return <section className="gs-child-today">
    <img className="gs-screen-art" src={appPath('assets/redesign-v1/child-today-scene.png')} alt="眠眠熊在树屋前准备出发" />
    <div className="gs-today-spacer" />
    <article className="gs-next-card">
      <span>下一件事</span>
      <h1>{candidate.period === 'evening' || candidate.period === 'night' ? '准备好，开始今晚任务' : primary?.title || candidate.title}</h1>
      <p>大约 {primary?.estimatedMinutes || 8} 分钟</p>
      <FeltButton className="gs-felt-button--primary" onClick={start}>开始 <Icon name="star" /></FeltButton>
      <div className="gs-next-card__secondary">
        <FeltButton onClick={() => setHelpOpen(true)}><Icon name="bell" />需要帮助</FeltButton>
        <FeltButton onClick={later}><Icon name="clock" />稍后再做</FeltButton>
      </div>
    </article>
    <button className="gs-continue-card" type="button" onClick={() => navigate('/world')}>
      <img src={appPath('assets/objects/story.webp')} alt="" />
      <span><strong>继续上次探索 · 故事树屋</strong><small>上次看到：奇妙的夜空</small></span><Icon name="chevron" />
    </button>
    {message ? <div className="gs-toast" role="status">{message}</div> : null}
    {helpOpen ? <div className="gs-sheet-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setHelpOpen(false)}>
      <section className="gs-help-sheet" role="dialog" aria-modal="true" aria-label="需要哪种帮助">
        <span className="gs-sheet-handle" /><CompanionArt id={profile.character} decorative />
        <h2>需要哪种帮助？</h2><p>选一个最轻松的办法就好</p>
        <button type="button" onClick={() => { dispatch({ type: 'TODAY_CHOOSE_SUPPORT', profileId: profile.id, dateKey: localDateKey(), supportMode: 'together' }); setHelpOpen(false); setMessage('已经请家长来一起做。') }}><Icon name="heart" /><span><strong>和家长一起</strong><small>请家长陪我完成</small></span></button>
        <button type="button" onClick={() => { dispatch({ type: 'TODAY_CHOOSE_SUPPORT', profileId: profile.id, dateKey: localDateKey(), supportMode: 'help' }); setHelpOpen(false); setMessage('已经告诉家长你需要帮助。') }}><Icon name="bell" /><span><strong>只帮我一下</strong><small>最难的一步请家长帮忙</small></span></button>
        <button type="button" onClick={later}><Icon name="clock" /><span><strong>休息 20 分钟</strong><small>时间到了再提醒我</small></span></button>
      </section>
    </div> : null}
  </section>
}

export function RedesignWorldPage() {
  const navigate = useNavigate()
  return <section className="gs-world-page">
    <img className="gs-screen-art" src={appPath('assets/redesign-v1/child-world-map.png')} alt="成长小队的山谷地图" />
    <div className="gs-world-progress"><Icon name="star" />已发现 <strong>3 / 5</strong></div>
    <button className="gs-world-label gs-world-label--garden" type="button" onClick={() => navigate('/garden')}>月光花园</button>
    <button className="gs-world-label gs-world-label--energy" type="button" onClick={() => navigate('/energy-plaza')}>能量广场</button>
    <button className="gs-world-label gs-world-label--home" type="button" onClick={() => navigate('/family-cottage')}>家庭小屋</button>
    <button className="gs-world-label gs-world-label--inventor" type="button" onClick={() => navigate('/inventor')}>发明工坊</button>
    <article className="gs-world-continue"><span>继续探索 · 故事树屋</span><small>上次看到：奇妙的夜空</small><FeltButton className="gs-felt-button--primary" onClick={() => navigate('/reading')}>继续 <Icon name="star" /></FeltButton></article>
  </section>
}

export function RedesignGardenPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const days = getLastSevenDays(state)
  const lit = days.filter(({ session }) => session?.status === 'goodnight').length
  return <section className="gs-garden-page">
    <img className="gs-screen-art" src={appPath('assets/redesign-v1/child-garden-scene.png')} alt="眠眠熊在月光花园给小芽浇水" />
    <button className="gs-back-pill" type="button" onClick={() => navigate('/world')}><Icon name="chevronBack" />返回小队世界</button>
    <h1>月光花园</h1>
    <article className="gs-garden-message"><strong>今天的小种子</strong><span>完成今天的行动，<br />花园就会长大</span></article>
    <ol className="gs-garden-days" aria-label="最近七天成长记录">{days.map(({ date, dateKey, session }) => <li key={dateKey} className={session?.status === 'goodnight' ? 'is-lit' : ''}><span>{dateKey === localDateKey() ? '今天' : `周${weekNames[date.getDay()]}`}</span></li>)}</ol>
    <FeltButton className="gs-garden-water" onClick={() => navigate('/today')}><img src={appPath('assets/objects/wash.webp')} alt="" />{lit ? '看看今天还能做什么' : '给它浇水'}</FeltButton>
  </section>
}

export function RedesignBackpackPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const moments = getRewardMoments(state).slice(0, 4)
  const pockets = [
    ['我的愿望', 'surprise', '/wishes'], ['喜欢的活动', 'bicycle', '/movement'], ['读过的故事', 'story', '/reading'], ['我的小发明', 'craft', '/inventor'], ['成长纪念', 'courage', '/garden'],
  ]
  return <section className="gs-backpack-page">
    <img className="gs-screen-art" src={appPath('assets/platform/growth-backpack-room.webp')} alt="成长背包收藏室" />
    <header><span>成长背包</span><h1>{profile.name}收集的每一份成长</h1><p>做过的事、喜欢的故事和小小愿望，都在这里。</p></header>
    <div className="gs-pocket-grid">{pockets.map(([title, asset, route]) => <button type="button" key={title} onClick={() => navigate(route)}><AssetArt id={asset} decorative /><strong>{title}</strong><small>打开看看</small></button>)}</div>
    <article className="gs-latest-memory"><AssetArt id={moments[0]?.assetId || 'backpack'} decorative /><span><small>最近的成长记忆</small><strong>{moments[0]?.title || '我自己准备好了书包'}</strong><em>成长不会因为休息而消失</em></span></article>
  </section>
}

function Clock({ timestamp }) {
  const date = new Date(timestamp)
  const minute = date.getMinutes()
  const hour = (date.getHours() % 12) * 30 + minute / 2
  return <div className="gs-clock" aria-hidden="true"><b>12</b><b>3</b><b>6</b><b>9</b><i style={{ transform: `rotate(${hour}deg)` }} /><i style={{ transform: `rotate(${minute * 6}deg)` }} /></div>
}

export function RedesignTonightPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())
  const [manageOpen, setManageOpen] = useState(false)
  const dateKey = localDateKey()
  const schedule = getSchedule(state, dayTypeFor(), dateKey)
  const routine = getRoutine(state, dayTypeFor())
  const session = getSession(state, dateKey)
  const steps = routine.steps.filter((step) => step.enabled).slice(0, 16)
  const statuses = session?.stepStatus || {}
  const completeCount = steps.filter((step) => (statuses[step.id] || 'todo') !== 'todo').length
  const remaining = steps.length - completeCount
  const targetAt = session?.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  const early = getEarlyMinutes(dateKey, schedule.bedTime, now)
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer) }, [])
  const toggle = (step) => dispatch({ type: statuses[step.id] === 'done' ? 'RESET_TASK' : 'COMPLETE_TASK', stepId: step.id })
  const finish = () => {
    if (remaining) return
    dispatch({ type: 'CONFIRM_BED', timestamp: Date.now() })
    navigate('/watering')
  }
  return <section className="gs-tonight-page">
    <aside className="gs-tonight-scene"><img src={appPath('assets/mascot-night.webp')} alt="月光卧室里的眠眠熊" /><div className="gs-time-card"><Clock timestamp={now} /><time>{formatTime(now)}</time><span>计划 {schedule.bedTime} · {now < targetAt ? `还有 ${early} 分钟` : '星光时间结束'}</span></div></aside>
    <article className="gs-tonight-tasks">
      <header><span><small>今晚任务</small><h1>今晚要做 {steps.length} 件事</h1></span><strong>{completeCount} / {steps.length} 已完成</strong><button type="button" onClick={() => setManageOpen(true)}><Icon name="menu" />调整今晚任务</button></header>
      <div className="gs-task-grid" style={{ '--count': steps.length }}>{steps.map((step, index) => { const status = statuses[step.id] || 'todo'; return <button type="button" key={step.id} className={status !== 'todo' ? 'is-done' : ''} onClick={() => toggle(step)} aria-label={`${step.title}${status === 'done' ? '，已完成，再点可撤销' : ''}`}><b>{index + 1}</b><AssetArt id={step.icon} decorative /><strong>{step.title}</strong>{status !== 'todo' ? <Icon name="check" /> : null}</button> })}</div>
      <FeltButton className="gs-tonight-finish" disabled={remaining > 0} onClick={finish}>{remaining ? `再完成 ${remaining} 项，就去月光花园` : '完成今晚任务，去月光花园'}<Icon name="star" /></FeltButton>
    </article>
    {manageOpen ? <Modal title="调整今晚任务" onClose={() => setManageOpen(false)} className="gs-manage-tonight"><h2>今晚临时调整</h2><p>这里的跳过只影响今晚，不会修改以后每天的计划。</p>{steps.map((step) => <button key={step.id} type="button" onClick={() => dispatch({ type: statuses[step.id] === 'skipped' ? 'RESET_TASK' : 'SKIP_TASK', stepId: step.id })}><AssetArt id={step.icon} decorative /><span><strong>{step.title}</strong><small>{statuses[step.id] === 'skipped' ? '已跳过，点按恢复' : '今晚先跳过'}</small></span></button>)}</Modal> : null}
  </section>
}

function ParentTitle({ eyebrow, title, subtitle, action }) {
  return <header className="gs-parent-title"><div><span>{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{action}</header>
}

export function RedesignParentTodayPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const session = getSession(state, localDateKey())
  const routine = getRoutine(state, dayTypeFor())
  const schedule = getSchedule(state, dayTypeFor())
  const done = Object.values(session?.stepStatus || {}).filter((status) => status !== 'todo').length
  const total = routine.steps.filter((step) => step.enabled).length
  const needsSleep = session?.inBedAt && !session?.asleepAt
  const days = getLastSevenDays(state)
  return <section className="gs-parent-page gs-parent-today">
    <ParentTitle eyebrow="今天" title="今天需要做什么？" subtitle="只把需要家长处理的事情放在这里，其他记录自动整理。" />
    <section className="gs-today-plan-card"><div className="gs-today-plan-card__icon"><Icon name="moon" /></div><span><strong>今晚 {schedule.prepareTime} 开始准备 · {schedule.bedTime} 完成任务</strong><small>按计划进行，有助于建立稳定的睡前节奏。</small></span><CompanionArt id={profile.character} decorative /><button type="button" onClick={() => navigate('/parent/schedule')}>调整今晚</button></section>
    <section className="gs-today-actions">
      <article><AssetArt id="heart" decorative /><span><strong>{needsSleep ? '1 个待补记录' : '今天没有帮助请求'}</strong><small>{needsSleep ? '昨晚还缺少实际入睡时间。' : `${profile.name}需要帮助时会出现在这里。`}</small></span><button type="button" onClick={() => navigate(needsSleep ? '/parent/timeline' : '/parent/support')}>{needsSleep ? '补记' : '查看'}<Icon name="chevron" /></button></article>
      <article><AssetArt id="story" decorative /><span><strong>今晚 {total} 个睡前任务</strong><small>孩子已经完成 {done} 项，点开可调整今晚。</small></span><button type="button" onClick={() => navigate('/parent/routine')}>查看<Icon name="chevron" /></button></article>
      <article><AssetArt id="pillow" decorative /><span><strong>实际上床与入睡</strong><small>今晚记录实际时间，帮助了解家庭节奏。</small></span><button type="button" onClick={() => navigate('/parent/timeline')}>记录<Icon name="chevron" /></button></article>
    </section>
    <p className="gs-sync-note"><Icon name="check" />数据已保存到 {profile.name} 的成长档案，持续跟进中。</p>
    <section className="gs-week-rhythm"><h2>本周节奏</h2><div className="gs-week-rhythm__days">{days.map(({ date, dateKey, session: daySession }) => <span key={dateKey}><small>{dateKey === localDateKey() ? '今天' : `周${weekNames[date.getDay()]}`}</small><i className={daySession?.status === 'goodnight' ? 'is-done' : dateKey === localDateKey() ? 'is-today' : ''}><Icon name={daySession?.status === 'goodnight' ? 'check' : 'moon'} /></i><em>{daySession?.status === 'goodnight' ? '完成良好' : dateKey === localDateKey() ? '准备与任务' : '计划中'}</em></span>)}</div><div className="gs-week-rhythm__summary"><article><Icon name="book" /><span><strong>睡前节奏整体稳定</strong><small>过去 7 天有 {getWeeklyMetrics(state).completed} 天完成，继续保持。</small></span></article><article><Icon name="clock" /><span><strong>平均入睡时间 {getWeeklyMetrics(state).averageSleepLatency ? `${getWeeklyMetrics(state).averageSleepLatency} 分钟` : '待记录'}</strong><small>记录越完整，趋势越准确。</small></span></article></div></section>
  </section>
}

export function RedesignParentGrowthPage() {
  const { state } = useBedtimeState()
  const metrics = getWeeklyMetrics(state)
  const history = getSessionHistory(state, { days: 14 }).slice(0, 7)
  return <section className="gs-parent-page"><ParentTitle eyebrow="成长" title="成长不是一条直线" subtitle="把任务、时间和孩子的状态放在一起看，寻找最适合家庭的节奏。" />
    <div className="gs-growth-metrics"><article><span>本周完成</span><strong>{metrics.completed} / 7 天</strong><small>完成就值得记录</small></article><article><span>按计划完成</span><strong>{metrics.onTime} 天</strong><small>不排名，也不扣分</small></article><article><span>平均完成流程</span><strong>{metrics.averageMinutes || '—'} 分钟</strong><small>仅作为安排参考</small></article><article><span>入睡记录</span><strong>{metrics.sleepRecorded} 天</strong><small>缺少时可后补</small></article></div>
    <section className="gs-timeline"><header><h2>最近成长时间线</h2><span>最近 14 天</span></header>{history.length ? history.map((item) => <article key={item.dateKey}><time>{formatDate(item.dateKey)}</time><i className={item.status === 'goodnight' ? 'is-complete' : ''} /><div><strong>{item.status === 'goodnight' ? '完成了今晚流程' : '开始了今晚流程'}</strong><span>开始 {item.routineStartedAt ? formatTime(item.routineStartedAt) : '—'} · 完成 {item.routineCompletedAt ? formatTime(item.routineCompletedAt) : '—'} · 上床 {item.inBedAt ? formatTime(item.inBedAt) : '待记录'}</span></div></article>) : <div className="gs-empty"><AssetArt id="courage" decorative /><strong>新的成长记录会从今晚开始</strong></div>}</section>
  </section>
}

export function RedesignParentPlanPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const weekday = getSchedule(state, 'weekday')
  const weekend = getSchedule(state, 'weekend')
  const routine = getRoutine(state, 'weekday')
  const monday = addDays(localDateKey(), -((new Date().getDay() + 6) % 7))
  return <section className="gs-parent-page"><ParentTitle eyebrow="计划" title="让这一周更好执行" subtitle={`${monday} 至 ${addDays(monday, 6)} · 改动会清楚说明从哪一天开始生效。`} />
    <div className="gs-week-strip">{Array.from({ length: 7 }, (_, index) => { const key = addDays(monday, index); return <div key={key} className={key === localDateKey() ? 'is-today' : ''}><span>周{['一','二','三','四','五','六','日'][index]}</span><strong>{key.slice(-2)}</strong><small>{index < 5 ? weekday.bedTime : weekend.bedTime}</small></div> })}</div>
    <div className="gs-plan-grid"><article><header><span><Icon name="clock" /><strong>时间与提醒</strong></span><button type="button" onClick={() => navigate('/parent/timeline')}>查看今晚记录</button></header><dl><div><dt>工作日开始准备</dt><dd>{weekday.prepareTime}</dd></div><div><dt>工作日完成任务</dt><dd>{weekday.bedTime}</dd></div><div><dt>周末完成任务</dt><dd>{weekend.bedTime}</dd></div><div><dt>提前提醒</dt><dd>{weekday.reminderMinutes} 分钟</dd></div></dl></article>
    <article><header><span><Icon name="book" /><strong>睡前流程</strong></span><button type="button" onClick={() => navigate('/parent/routine')}>编辑流程</button></header><div className="gs-routine-preview">{routine.steps.filter((s) => s.enabled).slice(0, 8).map((step, index) => <span key={step.id}><b>{index + 1}</b><AssetArt id={step.icon} decorative /><em>{step.title}</em></span>)}</div><p>孩子端会一次看完，最多支持 16 项。</p></article></div>
  </section>
}

export function RedesignRoutineEditorPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [dayType, setDayType] = useState('weekday')
  const routine = getRoutine(state, dayType)
  const [steps, setSteps] = useState(() => structuredClone(routine.steps))
  const [editing, setEditing] = useState(null)
  const [showAssets, setShowAssets] = useState(false)
  const chooseDayType = (nextDayType) => {
    setDayType(nextDayType)
    setSteps(structuredClone(getRoutine(state, nextDayType).steps))
    setEditing(null)
  }
  const save = () => dispatch({ type: 'UPDATE_ROUTINE', payload: { dayType, steps } })
  const updateEditing = (key, value) => { setEditing((current) => ({ ...current, [key]: value })); setSteps((current) => current.map((step) => step.id === editing.id ? { ...step, [key]: value } : step)) }
  const enabledCount = steps.filter((step) => step.enabled).length
  const add = () => { if (enabledCount >= 16) return; const step = { id: uid('step'), title: '新的小任务', icon: 'star', duration: 3, enabled: true }; setSteps((s) => [...s, step]); setEditing(step) }
  return <section className="gs-parent-page"><ParentTitle eyebrow="计划 · 睡前流程" title="孩子一眼看完的今晚清单" subtitle="先编辑顺序与名称；图片只在需要更换时展开，避免一次看到几十个选项。" action={<button className="gs-primary-action" type="button" onClick={save}><Icon name="check" />保存流程</button>} />
    <div className="gs-editor-tabs"><button className={dayType === 'weekday' ? 'is-active' : ''} type="button" onClick={() => chooseDayType('weekday')}>工作日</button><button className={dayType === 'weekend' ? 'is-active' : ''} type="button" onClick={() => chooseDayType('weekend')}>周末</button></div>
    <section className="gs-routine-list"><header><h2>{enabledCount} 项任务</h2><span>最多 16 项 · 孩子端不翻页</span></header>{steps.map((step, index) => <article key={step.id} className={!step.enabled ? 'is-disabled' : ''}><b>{index + 1}</b><AssetArt id={step.icon} decorative /><span><strong>{step.title}</strong><small>大约 {step.duration} 分钟</small></span><Toggle checked={step.enabled} label={`启用${step.title}`} onChange={(enabled) => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, enabled } : item))} /><button type="button" onClick={() => { setEditing(step); setShowAssets(false) }}><Icon name="chevron" /></button></article>)}<button className="gs-add-step" type="button" onClick={add} disabled={enabledCount >= 16}>{enabledCount >= 16 ? '已到 16 项上限' : '＋ 添加任务'}</button></section>
    {editing ? <Drawer title="编辑任务" onClose={() => setEditing(null)}><div className="gs-step-drawer"><AssetArt id={editing.icon} decorative /><label>任务名称<input value={editing.title} maxLength={12} onChange={(e) => updateEditing('title', e.target.value)} /></label><label>预计用时<input type="number" min="1" max="60" value={editing.duration} onChange={(e) => updateEditing('duration', Number(e.target.value))} /></label><button type="button" className="gs-change-image" onClick={() => setShowAssets((v) => !v)}><Icon name="image" />更换图片</button>{showAssets ? <div className="gs-asset-picker">{OBJECT_ASSET_OPTIONS.map((asset) => <button type="button" className={asset.id === editing.icon ? 'is-selected' : ''} key={asset.id} onClick={() => updateEditing('icon', asset.id)}><AssetArt id={asset.id} decorative /><span>{asset.label}</span></button>)}</div> : null}<FeltButton className="gs-felt-button--primary" onClick={() => setEditing(null)}>完成编辑</FeltButton></div></Drawer> : null}
  </section>
}

export function RedesignParentRewardsPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [eventOpen, setEventOpen] = useState(false)
  const [form, setForm] = useState({ title: '', note: '', points: 1, assetId: 'heart' })
  const moments = getRewardMoments(state).slice(0, 6)
  const balance = getStarBalance(state)
  const addEvent = () => { if (!form.title.trim()) return; dispatch({ type: 'ADD_REWARD_EVENT', payload: form }); setEventOpen(false); setForm({ title: '', note: '', points: 1, assetId: 'heart' }) }
  return <section className="gs-parent-page"><ParentTitle eyebrow="奖励" title="星光记录看得见，鼓励说得清" subtitle="星光不会因为超时被扣除；家长也可以记录值得纪念的小行动。" action={<button className="gs-primary-action" type="button" onClick={() => setEventOpen(true)}>＋ 记录奖励事件</button>} />
    <section className="gs-reward-hero"><div><AssetArt id="lamp" decorative /><span><small>当前星光</small><strong>{balance}</strong><em>点星光</em></span></div><p>提前完成睡前任务：提前几分钟，就获得几点星光。晚于目标时间完成不加星光，也不会扣分。</p></section>
    <div className="gs-reward-columns"><section><h2>家庭愿望</h2>{state.wishes.filter((wish) => wish.enabled).map((wish) => <article key={wish.id}><AssetArt id={wish.assetId} decorative /><span><strong>{wish.name}</strong><small>{wish.cost} 点星光</small></span><button type="button" disabled={balance < wish.cost}>兑换</button></article>)}</section><section><h2>最近奖励事件</h2>{moments.map((moment) => <article key={moment.id}><AssetArt id={moment.assetId || 'heart'} decorative /><span><strong>{moment.title}</strong><small>{moment.note || new Date(moment.occurredAt).toLocaleDateString('zh-CN')}</small></span><b>+{moment.points || 0}</b></article>)}</section></div>
    {eventOpen ? <Modal title="记录奖励事件" onClose={() => setEventOpen(false)} className="gs-reward-event"><h2>今天有什么值得记住？</h2><label>事件<input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例如：主动整理了书包" /></label><label>想对孩子说的话<textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="具体说出你看见的努力" /></label><label>星光数量<input type="number" min="0" max="99" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} /></label><div className="gs-mini-assets">{['heart','courage','book','star'].map((asset) => <button type="button" key={asset} className={form.assetId === asset ? 'is-selected' : ''} onClick={() => setForm({ ...form, assetId: asset })}><AssetArt id={asset === 'book' ? 'story' : asset === 'star' ? 'lamp' : asset} decorative /></button>)}</div><FeltButton className="gs-felt-button--primary" onClick={addEvent}>保存奖励</FeltButton></Modal> : null}
  </section>
}

export function RedesignParentSettingsPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const [name, setName] = useState(profile.name)
  const [character, setCharacter] = useState(profile.character)
  const save = () => dispatch({ type: 'UPDATE_PROFILE', payload: { ...profile, name: name.trim() || profile.name, character } })
  return <section className="gs-parent-page"><ParentTitle eyebrow="设置" title="家庭与设备" subtitle="孩子资料、角色、同步和数据安全都集中在这里；日常使用不需要反复配置。" action={<button type="button" className="gs-primary-action" onClick={save}><Icon name="check" />保存设置</button>} />
    <div className="gs-settings-grid"><section><h2>当前孩子</h2><label>孩子昵称<input value={name} maxLength="8" onChange={(e) => setName(e.target.value)} /></label><div className="gs-character-choice">{CHARACTER_OPTIONS.map((item) => <button type="button" key={item.id} className={character === item.id ? 'is-selected' : ''} onClick={() => setCharacter(item.id)}><CompanionArt id={item.id} decorative /><span>{item.name}</span></button>)}</div><button className="gs-settings-row" type="button" onClick={() => navigate('/parent/profile')}><Icon name="user" /><span><strong>管理多个孩子</strong><small>{state.profiles.length} 个独立档案</small></span><Icon name="chevron" /></button></section>
    <section><h2>设备与同步</h2><button className="gs-settings-row" type="button" onClick={() => navigate('/parent/devices')}><Icon name="device" /><span><strong>家庭设备</strong><small>iPad 与家长设备</small></span><Icon name="chevron" /></button><button className="gs-settings-row" type="button" onClick={() => navigate('/parent/sync')}><Icon name="database" /><span><strong>家庭云端同步</strong><small>数据在家庭设备间保持一致</small></span><Icon name="chevron" /></button><button className="gs-settings-row" type="button" onClick={() => navigate('/parent/accessibility')}><Icon name="accessibility" /><span><strong>声音与易用性</strong><small>音效、朗读与减少动画</small></span><Icon name="chevron" /></button><button className="gs-settings-row" type="button" onClick={() => navigate('/parent/data')}><Icon name="shield" /><span><strong>数据与安全</strong><small>备份、恢复与家长锁</small></span><Icon name="chevron" /></button></section></div>
  </section>
}
