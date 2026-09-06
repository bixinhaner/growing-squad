import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dayTypeFor, getRoutine, getSchedule, getSession, localDateKey, uid } from '../domain/model.js'
import { OBJECT_ASSET_OPTIONS } from '../domain/assets.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Drawer, Modal, Toggle, SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { SchedulePage } from './SchedulePage.jsx'
import { RewardsPage } from './RewardsPage.jsx'
import { ProfilePage } from './ProfilePage.jsx'
import './comfort.css'
import { TonightTaskBoard } from '../ui/bedtime/TonightTaskBoard.jsx'

export {
  ComfortTodayPage as RedesignTodayPage, ComfortWorldPage as RedesignWorldPage,
  ComfortBackpackPage as RedesignBackpackPage, ComfortGardenPage as RedesignGardenPage,
  ComfortParentGrowthPage as RedesignParentGrowthPage, ComfortParentTodayPage as RedesignParentTodayPage,
} from './ComfortPages.jsx'

function ParentTools({ children }) {
  const navigate = useNavigate()
  return <section className="calm-management">{children}<nav className="calm-parent-links" aria-label="家庭管理入口">{[
    ['作息与提醒','schedule'],['睡前流程','routine'],['愿望与奖励','rewards'],['孩子资料','profile'],
    ['家庭设备','devices'],['数据与安全','data'],['声音与易用性','accessibility'],['同步状态','sync'],['全天安排','timeline'],['陪伴与观察','support'],
  ].map(([label, route]) => <button type="button" className="calm-action calm-action--secondary" key={route} onClick={() => navigate(`/parent/${route}`)}>{label}<Icon name="chevron" /></button>)}</nav></section>
}
export function RedesignParentPlanPage() {
  const { state } = useBedtimeState()
  return <ParentTools><SchedulePage key={state.activeProfileId} /></ParentTools>
}
export function RedesignParentRewardsPage() {
  const { state } = useBedtimeState()
  return <ParentTools><RewardsPage key={state.activeProfileId} /></ParentTools>
}
export function RedesignParentSettingsPage() {
  const { state } = useBedtimeState()
  return <ParentTools><ProfilePage key={state.activeProfileId} /></ParentTools>
}
function Clock({ timestamp }) {
  const date = new Date(timestamp)
  return <div className="gs-clock" aria-hidden="true"><b>12</b><b>3</b><b>6</b><b>9</b><i style={{ transform: `rotate(${(date.getHours() % 12) * 30 + date.getMinutes() / 2}deg)` }} /><i style={{ transform: `rotate(${date.getMinutes() * 6}deg)` }} /></div>
}
export function RedesignTonightPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const [now, setNow] = useState(() => Date.now())
  const [manageOpen, setManageOpen] = useState(false)
  const dateKey = localDateKey(new Date(now))
  const schedule = getSchedule(state, dayTypeFor(new Date(now)), dateKey)
  const routine = getRoutine(state, dayTypeFor(new Date(now)))
  const session = getSession(state, dateKey)
  const steps = routine.steps.filter((step) => step.enabled)
  const statuses = session?.stepStatus || {}
  const completeCount = steps.filter((step) => (statuses[step.id] || 'todo') !== 'todo').length
  const remaining = steps.length - completeCount
  const targetAt = session?.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  const early = Math.max(0, Math.floor((targetAt - now) / 60000))
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer) }, [])
  const toggle = (step) => dispatch({ type: statuses[step.id] === 'done' ? 'RESET_TASK' : 'COMPLETE_TASK', stepId: step.id })
  const finish = () => { if (remaining) return; dispatch({ type: 'CONFIRM_BED', timestamp: Date.now() }); navigate('/watering') }
  return <section className="gs-tonight-page">
    <aside className="gs-tonight-scene"><img src={appPath('assets/mascot-night.webp')} alt="月光卧室里的眠眠熊" /><div className="gs-time-card"><Clock timestamp={now} /><time>{new Date(now).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false })}</time><span>计划 {new Date(targetAt).toLocaleTimeString('zh-CN', { hour:'2-digit', minute:'2-digit', hour12:false })} · {now < targetAt ? `还有 ${early} 分钟` : '慢慢完成也没关系'}</span></div></aside>
    <TonightTaskBoard steps={steps} statuses={statuses} onToggle={toggle} onManage={() => setManageOpen(true)} onFinish={finish} />
    {manageOpen ? <Modal title="调整今晚任务" onClose={() => setManageOpen(false)} className="gs-manage-tonight"><h2>今晚临时调整</h2><p>跳过只影响今晚，不修改以后每天的计划。</p>{steps.map((step) => <button key={step.id} type="button" onClick={() => dispatch({ type:statuses[step.id] === 'skipped' ? 'RESET_TASK' : 'SKIP_TASK', stepId:step.id })}><AssetArt id={step.icon} decorative /><span><strong>{step.title}</strong><small>{statuses[step.id] === 'skipped' ? '已跳过，点按恢复' : '今晚先跳过'}</small></span></button>)}</Modal> : null}
  </section>
}
export function RedesignRoutineEditorPage() {
  const { state } = useBedtimeState()
  return <RoutineEditor key={state.activeProfileId} />
}
function RoutineEditor() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const [dayType, setDayType] = useState('weekday')
  const [steps, setSteps] = useState(() => structuredClone(getRoutine(state,'weekday').steps))
  const [editingId, setEditingId] = useState(null)
  const [showAssets, setShowAssets] = useState(false)
  const [message, setMessage] = useState('')
  const editing = steps.find((s) => s.id === editingId)
  const enabledCount = steps.filter((s) => s.enabled).length
  const update = (id, patch) => { setSteps((items) => items.map((s) => s.id === id ? { ...s,...patch } : s)); setMessage('有修改尚未保存') }
  const changeDay = (next) => { setDayType(next); setSteps(structuredClone(getRoutine(state,next).steps)); setEditingId(null); setMessage('') }
  const move = (index, delta) => { const items = [...steps]; [items[index],items[index+delta]] = [items[index+delta],items[index]]; setSteps(items); setMessage('顺序已调整，请保存流程') }
  const save = () => {
    if (steps.some((s) => !s.title.trim() || !Number.isFinite(s.duration) || s.duration < 1 || s.duration > 60)) { setMessage('请检查任务名称和用时，用时应在 1–60 分钟之间。'); return }
    dispatch({ type:'UPDATE_ROUTINE', payload:{ dayType, steps } }); setMessage('流程已提交保存，可查看同步状态。')
  }
  const add = () => { if (enabledCount >= 16) return; const step = { id:uid('step'), title:'新的小任务', icon:'star', duration:3, enabled:true }; setSteps((items) => [...items,step]); setEditingId(step.id); setShowAssets(false); setMessage('有修改尚未保存') }
  return <section className="calm-management calm-editor"><header className="calm-section-head"><div><span className="calm-eyebrow">计划 · 睡前流程</span><h1>让今晚轻松一点</h1><p>可以改名称、调整顺序，也可以暂时停用。每天不必安排满。</p></div><button className="calm-action" type="button" onClick={save}><Icon name="check" />保存流程</button></header><SaveIndicator />
    <div className="gs-editor-tabs"><button type="button" className={dayType === 'weekday' ? 'is-active' : ''} onClick={() => changeDay('weekday')}>工作日</button><button type="button" className={dayType === 'weekend' ? 'is-active' : ''} onClick={() => changeDay('weekend')}>周末</button></div>
    <p role="status">{message || `${enabledCount} 项启用 · 建议只保留当下需要的事`}</p><section className="gs-routine-list"><header><h2>{enabledCount} 项任务</h2><span>新增流程最多启用 16 项</span></header>{steps.map((s,index) => <article key={s.id} className={`calm-editor-row ${s.enabled ? '' : 'is-disabled'}`}><b>{index+1}</b><AssetArt id={s.icon} decorative /><span><strong>{s.title}</strong><small>大约 {s.duration} 分钟</small></span><Toggle checked={s.enabled} label={`启用${s.title}`} onChange={(enabled) => { if (enabled && enabledCount >= 16) { setMessage('最多启用 16 项，请先停用其他任务。'); return } update(s.id,{enabled}) }} /><button type="button" className="calm-action calm-action--secondary" disabled={index===0} aria-label={`上移${s.title}`} onClick={() => move(index,-1)}>↑</button><button type="button" className="calm-action calm-action--secondary" disabled={index===steps.length-1} aria-label={`下移${s.title}`} onClick={() => move(index,1)}>↓</button><button type="button" className="calm-action calm-action--secondary" onClick={() => { setEditingId(s.id); setShowAssets(false) }}>编辑</button></article>)}<button className="calm-action calm-action--secondary" type="button" onClick={add} disabled={enabledCount>=16}>{enabledCount>=16 ? '已到 16 项上限' : '＋ 添加任务'}</button></section>
    {editing ? <Drawer title="编辑任务" onClose={() => setEditingId(null)}><div className="calm-management"><h2>编辑任务</h2><label className="calm-field">任务名称<input value={editing.title} maxLength={12} onChange={(e) => update(editing.id,{title:e.target.value})} /></label><label className="calm-field">预计用时（分钟）<input type="number" min="1" max="60" value={editing.duration} onChange={(e) => update(editing.id,{duration:Number(e.target.value)})} /></label><button type="button" className="calm-action calm-action--secondary" onClick={() => setShowAssets((v) => !v)} aria-expanded={showAssets}>更换图片</button>{showAssets ? <div className="gs-asset-picker">{OBJECT_ASSET_OPTIONS.map((a) => <button type="button" key={a.id} aria-label={a.label} aria-pressed={editing.icon===a.id} onClick={() => update(editing.id,{icon:a.id})}><AssetArt id={a.id} decorative /><span>{a.label}</span></button>)}</div> : null}<button type="button" className="calm-action" onClick={() => setEditingId(null)}>完成编辑</button></div></Drawer> : null}
  </section>
}
