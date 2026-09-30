import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AGE_BANDS, DEFAULT_STEPS, minutesToTime, timeToMinutes } from '../../domain/model.js'
import { hashPin } from '../../data/storage.js'
import { pairDevice } from '../../data/cloud.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'
import '../tokens.css'
import '../entry.css'

const PROMISES = [
  { art: 'pillow', title: '只做今晚的小步骤', text: '少一点，慢一点，也算完成。' },
  { art: 'heart', title: '晚一点也不责怪', text: '先抱一抱，再继续。' },
  { art: 'lamp', title: '做完就让屏幕休息', text: '留一个安静的夜晚。' },
]

function EntrySky({ children, className = '' }) {
  return (
    <main className={`v3-entry ${className}`}>
      <div className="v3-entry__stars" aria-hidden="true" />
      <div className="v3-entry__brand" aria-hidden="true"><span className="v3-entry__moon" /><span className="v3-display">成长小队</span></div>
      {children}
    </main>
  )
}

export function WelcomeStage() {
  const navigate = useNavigate()
  return (
    <EntrySky className="v3-entry--welcome">
      <section className="v3-welcome" aria-labelledby="v3-welcome-title">
        <div className="v3-welcome__stage" aria-hidden="true">
          <span className="v3-welcome__halo" />
          <Companion character="bear" mood="hello" />
        </div>
        <div className="v3-welcome__copy">
          <span className="v3-entry__eyebrow">一个温柔的家庭约定</span>
          <h1 id="v3-welcome-title" className="v3-display">一起把睡前<br />变得轻松一点</h1>
          <ul className="v3-promises">
            {PROMISES.map((item, index) => (
              <li key={item.title} style={{ '--i': index }}>
                <AssetArt id={item.art} decorative />
                <span><strong>{item.title}</strong><small>{item.text}</small></span>
              </li>
            ))}
          </ul>
          <div className="v3-welcome__actions">
            <button className="v3-button" type="button" onClick={() => navigate('/setup')}><Icon name="moon" />和孩子一起开始</button>
            <button className="v3-entry__link" type="button" onClick={() => navigate('/setup')}>我先替孩子设置</button>
          </div>
        </div>
      </section>
    </EntrySky>
  )
}

function Field({ label, children, hint }) {
  return <label className="v3-field"><span>{label}</span>{children}{hint ? <small>{hint}</small> : null}</label>
}

export function SetupStage() {
  const { dispatch } = useBedtimeActions()
  const { state, saveStatus, saveMessage } = useBedtimeState()
  const navigate = useNavigate()
  const [form, setForm] = useState({ childName: '小雨', ageBand: '7–9 岁', prepareTime: '20:30', bedTime: '21:00', weekendPrepareTime: '21:00', weekendBedTime: '21:30', reminderMinutes: 30, companionMode: 'together', pin: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [steps, setSteps] = useState(() => structuredClone(DEFAULT_STEPS))
  const reminder = useMemo(() => `还有 ${form.reminderMinutes} 分钟开始准备，小伙伴在今晚等你。`, [form.reminderMinutes])
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

  return (
    <EntrySky className="v3-entry--setup">
      <form className="v3-setup" onSubmit={submit}>
        <section className="v3-setup__sheet v3-felt" aria-labelledby="v3-setup-title">
          <span className="v3-entry__eyebrow">家长快速设置 · 约 1 分钟</span>
          <h1 id="v3-setup-title" className="v3-display">先设置今晚的节奏</h1>

          <div className="v3-setup__group">
            <h2><i className="v3-num">1</i>孩子是谁</h2>
            <div className="v3-setup__row">
              <Field label="孩子昵称"><input value={form.childName} maxLength={8} onChange={(e) => update('childName', e.target.value)} /></Field>
              <Field label="年龄段"><select value={form.ageBand} onChange={(e) => update('ageBand', e.target.value)}>{AGE_BANDS.map((age) => <option key={age}>{age}</option>)}</select></Field>
            </div>
          </div>

          <div className="v3-setup__group">
            <h2><i className="v3-num">2</i>几点开始，几点完成</h2>
            <div className="v3-setup__row">
              <Field label="开始准备"><input type="time" value={form.prepareTime} onChange={(e) => update('prepareTime', e.target.value)} /></Field>
              <Field label="计划完成任务"><input type="time" value={form.bedTime} onChange={(e) => update('bedTime', e.target.value)} /></Field>
            </div>
            <details className="v3-setup__more">
              <summary>设置周末时间</summary>
              <div className="v3-setup__row">
                <Field label="周末开始准备"><input type="time" value={form.weekendPrepareTime} onChange={(e) => update('weekendPrepareTime', e.target.value)} /></Field>
                <Field label="周末计划完成"><input type="time" value={form.weekendBedTime} onChange={(e) => update('weekendBedTime', e.target.value)} /></Field>
              </div>
            </details>
            <div className="v3-setup__row">
              <Field label="提醒时间"><select value={form.reminderMinutes} onChange={(e) => update('reminderMinutes', Number(e.target.value))}><option value={15}>提前 15 分钟</option><option value={30}>提前 30 分钟</option><option value={45}>提前 45 分钟</option></select></Field>
              <div className="v3-field"><span>陪伴方式</span>
                <div className="v3-toggle-pair" role="group" aria-label="陪伴方式">
                  {[{ value: 'together', label: '一起完成' }, { value: 'independent', label: '孩子自己完成' }].map((option) => (
                    <button key={option.value} type="button" aria-pressed={form.companionMode === option.value} onClick={() => update('companionMode', option.value)}>{option.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="v3-setup__group">
            <h2><i className="v3-num">3</i>今晚先做这些 <small>之后还能调整，不必安排满</small></h2>
            <div className="v3-setup__steps" role="group" aria-label="初始睡前步骤">
              {steps.map((step) => (
                <button key={step.id} type="button" aria-pressed={step.enabled} className={step.enabled ? 'is-selected' : ''} onClick={() => toggleStep(step.id)}>
                  <AssetArt id={step.icon} decorative />
                  <span>{step.title}</span>
                  <i aria-hidden="true">{step.enabled ? <Icon name="check" size={14} /> : '+'}</i>
                </button>
              ))}
            </div>
          </div>

          <div className="v3-setup__group">
            <h2><i className="v3-num">4</i>家长小锁</h2>
            <Field label="家长区 PIN" hint="只用于防止孩子误触设置，不是账户密码。">
              <input inputMode="numeric" autoComplete="new-password" value={form.pin} maxLength={4} placeholder="4 位数字" onChange={(e) => update('pin', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>

          {error || (saving && saveStatus === 'error') ? <div className="v3-entry__error" role="alert">{error || saveMessage}</div> : null}
          <button className="v3-button v3-setup__submit" disabled={busy} type="submit">{busy ? '正在安全保存…' : <><Icon name="moon" />保存并看看今晚</>}</button>
        </section>

        <aside className="v3-setup__preview" aria-label="今晚预览">
          <span className="v3-entry__eyebrow">今晚预览</span>
          <div className="v3-setup__buddy" aria-hidden="true"><Companion character="bear" mood="calm" /></div>
          <p className="v3-setup__bubble"><strong>{reminder}</strong><small className="v3-num">{minutesToTime(timeToMinutes(form.prepareTime))} 开始准备</small></p>
          <ol className="v3-setup__mini">
            {enabledSteps.map((step) => <li key={step.id}><AssetArt id={step.icon} decorative />{step.title}</li>)}
          </ol>
        </aside>
      </form>
    </EntrySky>
  )
}

export function PairStage({ onPaired }) {
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState(() => /iPad/i.test(navigator.userAgent) ? '孩子的 iPad' : '家庭设备')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const connect = async (event) => {
    event.preventDefault()
    if (code.trim().length < 6 || status === 'connecting') return
    setStatus('connecting')
    setError('')
    try {
      const result = await pairDevice(code.trim().toUpperCase(), deviceName.trim() || '家庭设备')
      onPaired(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法连接家庭')
      setStatus('idle')
    }
  }

  return (
    <EntrySky className="v3-entry--pair">
      <section className="v3-pair" aria-labelledby="v3-pair-title">
        <div className="v3-pair__stage" aria-hidden="true">
          <span className="v3-welcome__halo" />
          <Companion character="bear" mood="sleepy" />
        </div>
        <div className="v3-pair__card v3-felt">
          <span className="v3-pair__badge"><Icon name="shield" size={20} />家庭私有空间</span>
          <h1 id="v3-pair-title" className="v3-display">把这台设备<br />带回成长小队</h1>
          <p>只需家长连接一次。以后孩子打开主屏幕图标，就会直接回到自己的成长小队。</p>
          <form onSubmit={connect}>
            <Field label="设备名字"><input id="device-name" name="deviceName" value={deviceName} maxLength={40} autoComplete="off" onChange={(event) => setDeviceName(event.target.value)} /></Field>
            <Field label="家庭连接码"><input id="family-code" name="familyCode" className="v3-pair__code" inputMode="text" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="例如 MOON-1234" value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())} /></Field>
            {error ? <div className="v3-entry__error" role="alert">{error}</div> : null}
            <button className="v3-button" type="submit" disabled={code.trim().length < 6 || status === 'connecting'}>
              {status === 'connecting' ? <><span className="spinner" /> 正在连接…</> : <><Icon name="moon" /> 连接我的家庭</>}
            </button>
          </form>
          <small className="v3-pair__note"><Icon name="shield" size={15} /> 孩子的记录只在已连接的家庭设备间同步</small>
        </div>
      </section>
    </EntrySky>
  )
}
