import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AGE_BANDS, DEFAULT_STEPS, minutesToTime, timeToMinutes } from '../domain/model.js'
import { hashPin } from '../data/storage.js'
import { appPath } from '../data/paths.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Brand, Segmented } from '../ui/Shared.jsx'
import { AssetArt } from '../ui/AssetArt.jsx'
import { Icon } from '../ui/Icons.jsx'

export function SetupPage() {
  const { dispatch } = useBedtimeActions()
  const { state, saveStatus, saveMessage } = useBedtimeState()
  const navigate = useNavigate()
  const [form, setForm] = useState({ childName: '小雨', ageBand: '7–9 岁', prepareTime: '20:30', bedTime: '21:00', weekendPrepareTime: '21:00', weekendBedTime: '21:30', reminderMinutes: 30, companionMode: 'together', pin: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [steps, setSteps] = useState(() => structuredClone(DEFAULT_STEPS))
  const reminder = useMemo(() => `还有 ${form.reminderMinutes} 分钟开始准备，眠眠在今晚等你。`, [form.reminderMinutes])
  const enabledSteps = steps.filter((step) => step.enabled)
  // Do not race RequireSetup: the provider only updates state after persistence succeeds.
  useEffect(() => { if (saving && state.setupComplete) navigate('/tonight', { replace: true }) }, [saving, state.setupComplete, navigate])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const toggleStep = (id) => {
    const target = steps.find((step) => step.id === id)
    if (!target) return
    if (target.enabled && enabledSteps.length <= 1) { setError('请至少保留 1 个睡前步骤。'); return }
    setSteps((current) => current.map((step) => step.id === id ? { ...step, enabled: !step.enabled } : step)); setError('')
  }
  const submit = async (event) => {
    event.preventDefault()
    if (saving && saveStatus !== 'error') return
    if (!form.childName.trim()) { setError('请填写孩子昵称。'); return }
    if (!/^\d{4}$/.test(form.pin)) { setError('请设置 4 位数字家长 PIN。'); return }
    if (timeToMinutes(form.prepareTime) >= timeToMinutes(form.bedTime) || timeToMinutes(form.weekendPrepareTime) >= timeToMinutes(form.weekendBedTime)) { setError('“开始准备”需要早于“计划完成任务”，请同时检查工作日与周末。'); return }
    if (enabledSteps.length < 1) { setError('请至少选择 1 个睡前步骤。'); return }
    setSaving(true); setError('')
    try {
      const { pin, ...settings } = form
      const pinHash = await hashPin(pin)
      dispatch({ type: 'SETUP_COMPLETE', payload: { ...settings, childName: settings.childName.trim(), pinHash, initialSteps: steps } })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '设置尚未保存，请重试。'); setSaving(false) }
  }
  const busy = saving && saveStatus !== 'error'
  return <main className="setup-page"><header><Brand /><span>首次设置</span></header><form className="setup-layout" onSubmit={submit}><section className="setup-form-card"><span className="eyebrow">家长快速设置</span><h1>先设置今晚的节奏</h1>
    <div className="form-grid form-grid--two"><label>孩子昵称<input value={form.childName} maxLength={8} onChange={(e) => update('childName',e.target.value)} /></label><label>年龄段<select value={form.ageBand} onChange={(e) => update('ageBand',e.target.value)}>{AGE_BANDS.map((age) => <option key={age}>{age}</option>)}</select></label></div>
    <fieldset><legend>工作日时间安排</legend><div className="form-grid form-grid--two"><label>开始准备<input type="time" value={form.prepareTime} onChange={(e) => update('prepareTime',e.target.value)} /></label><label>计划完成任务<input type="time" value={form.bedTime} onChange={(e) => update('bedTime',e.target.value)} /></label></div></fieldset>
    <details><summary>设置周末时间</summary><div className="form-grid form-grid--two"><label>周末开始准备<input type="time" value={form.weekendPrepareTime} onChange={(e) => update('weekendPrepareTime',e.target.value)} /></label><label>周末计划完成<input type="time" value={form.weekendBedTime} onChange={(e) => update('weekendBedTime',e.target.value)} /></label></div></details>
    <label>提醒时间<select value={form.reminderMinutes} onChange={(e) => update('reminderMinutes',Number(e.target.value))}><option value={15}>提前 15 分钟</option><option value={30}>提前 30 分钟</option><option value={45}>提前 45 分钟</option></select></label>
    <div className="field-block"><span>陪伴方式</span><Segmented label="陪伴方式" value={form.companionMode} onChange={(v) => update('companionMode',v)} options={[{value:'together',label:'一起完成'},{value:'independent',label:'孩子自己完成'}]} /></div>
    <div className="field-block"><span>今晚先做这些 <small>之后还能调整，不必安排满</small></span><div className="setup-step-options" aria-label="初始睡前步骤">{steps.map((step) => <button key={step.id} type="button" aria-pressed={step.enabled} className={step.enabled ? 'is-selected' : ''} onClick={() => toggleStep(step.id)}><AssetArt id={step.icon} decorative />{step.title}<i>{step.enabled ? <Icon name="check" size={14} /> : '+'}</i></button>)}</div></div>
    <label>家长区 PIN<input inputMode="numeric" autoComplete="new-password" value={form.pin} maxLength={4} placeholder="4 位数字" onChange={(e) => update('pin',e.target.value.replace(/\D/g,''))} /><small>只用于防止孩子误触设置，不是账户密码。</small></label>
    {error || (saving && saveStatus === 'error') ? <div className="form-error" role="alert">{error || saveMessage}</div> : null}
    <button className="button button--primary button--wide" disabled={busy} type="submit">{busy ? '正在安全保存…' : <><Icon name="moon" />保存并看看今晚</>}</button></section>
    <aside className="setup-preview"><span className="preview-label">今晚预览</span><img src={appPath('assets/mascot-moon.webp')} alt="眠眠抱着月亮" /><div className="preview-reminder"><strong>{reminder}</strong><small>{minutesToTime(timeToMinutes(form.prepareTime))} 开始准备</small></div><div className="mini-routine">{enabledSteps.map((step) => <span key={step.id}>{step.title}</span>)}</div></aside>
  </form></main>
}
