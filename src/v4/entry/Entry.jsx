import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AGE_BANDS, CHARACTER_OPTIONS, DEFAULT_STEPS, minutesToTime, timeToMinutes } from '../../domain/model.js'
import { hashPin } from '../../data/storage.js'
import { pairDevice } from '../../data/cloud.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, ChipGroup, Field, Pic, Tap } from '../ui/kit.jsx'
import '../theme.css'
import './entry.css'

/* ─────────────────────────  Welcome  ─────────────────────────
 * One picture, one sentence, one button. Parents decide in five seconds. */
export function Welcome() {
  const navigate = useNavigate()
  return (
    <main className="e-app e-welcome">
      <Pic className="e-welcome__art" src="assets/v4/welcome-family.webp" />
      <div className="e-welcome__veil" aria-hidden="true" />
      <section className="e-welcome__copy" aria-labelledby="e-welcome-title">
        <span className="e-brand"><span className="e-brand__moon" aria-hidden="true" />成长小队</span>
        <h1 id="e-welcome-title" className="u-display">睡前，<br />不再是一场拉锯</h1>
        <p>孩子自己一步步走完睡前小路，家长只在需要时轻轻帮一把。</p>
        <ul className="e-welcome__points">
          <li><Icon name="moon" size={20} />只做今晚的几小步</li>
          <li><Icon name="heart" size={20} />晚一点也不责怪</li>
          <li><Icon name="eye" size={20} />做完就让屏幕休息</li>
        </ul>
        <div className="e-welcome__go">
          <Tap tone="primary" size="xl" icon="sparkle" onClick={() => navigate('/setup')}>开始约定</Tap>
          <span>约 1 分钟 · 家长来设置</span>
        </div>
      </section>
    </main>
  )
}

/* ─────────────────────────  Setup  ─────────────────────────
 * A short wizard instead of a long form: one question per page,
 * with tonight's path growing in the preview as the parent answers. */
const STEPS = ['孩子', '时间', '小路', '小锁']
const WEEKEND = [['same', '和平时一样'], ['30', '晚 30 分钟'], ['60', '晚 1 小时']]
const shift = (time, minutes) => minutesToTime(Math.min(23 * 60 + 45, Math.max(0, timeToMinutes(time) + minutes)))

function TimeDial({ label, value, onChange }) {
  return (
    <div className="e-dial" role="group" aria-label={label}>
      <span className="e-dial__label">{label}</span>
      <button type="button" aria-label={`${label}提前 15 分钟`} onClick={() => onChange(shift(value, -15))}><Icon name="down" size={22} /></button>
      <strong className="u-num">{value}</strong>
      <button type="button" aria-label={`${label}推后 15 分钟`} onClick={() => onChange(shift(value, 15))}><Icon name="up" size={22} /></button>
    </div>
  )
}

function PinPad({ value, onChange, onFull, disabled, label }) {
  const press = (digit) => {
    if (disabled || value.length >= 4) return
    const next = `${value}${digit}`
    onChange(next)
    if (next.length === 4) onFull?.(next)
  }
  useEffect(() => {
    const onKey = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)) return
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') onChange(value.slice(0, -1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div className="e-pin">
      <div className="e-pin__dots" role="status" aria-label={`${label}：已输入 ${value.length} 位`}>{[0, 1, 2, 3].map((index) => <i key={index} className={value.length > index ? 'is-on' : ''} />)}</div>
      <div className="e-pin__pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => <button type="button" key={digit} disabled={disabled} onClick={() => press(String(digit))}>{digit}</button>)}
        <span />
        <button type="button" disabled={disabled} onClick={() => press('0')}>0</button>
        <button type="button" disabled={disabled || !value} aria-label="删除一位" onClick={() => onChange(value.slice(0, -1))}><Icon name="back" size={24} /></button>
      </div>
    </div>
  )
}

export function Setup() {
  const { dispatch } = useBedtimeActions()
  const { state, saveStatus, saveMessage } = useBedtimeState()
  const navigate = useNavigate()
  const [page, setPage] = useState(0)
  const [form, setForm] = useState({ childName: '', ageBand: '7–9 岁', character: 'bear', prepareTime: '20:30', bedTime: '21:00', weekend: '30', reminderMinutes: 30, companionMode: 'together' })
  const [steps, setSteps] = useState(() => structuredClone(DEFAULT_STEPS))
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const update = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setError('') }
  const chosen = steps.filter((step) => step.enabled)
  const name = form.childName.trim() || '孩子'
  const buddy = CHARACTER_OPTIONS.find((item) => item.id === form.character)

  // The provider only flips setupComplete after the state is safely persisted.
  useEffect(() => { if (saving && state.setupComplete) navigate('/tonight', { replace: true }) }, [saving, state.setupComplete, navigate])

  const checks = [
    () => (!form.childName.trim() ? '先写下孩子的昵称。' : ''),
    () => (timeToMinutes(form.prepareTime) >= timeToMinutes(form.bedTime) ? '“开始准备”要早于“上床时间”。' : ''),
    () => (!chosen.length ? '至少留一小步。' : ''),
  ]
  const next = () => {
    const problem = checks[page]?.()
    if (problem) { setError(problem); return }
    setError(''); setPage((value) => value + 1)
  }
  const toggle = (id) => {
    const target = steps.find((step) => step.id === id)
    if (target.enabled && chosen.length <= 1) { setError('至少留一小步。'); return }
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, enabled: !step.enabled } : step))); setError('')
  }
  const finish = async (confirm) => {
    if (confirm !== pin) { setError('两次输入不一样，再设一次吧。'); setPin(''); setPinAgain(''); return }
    setSaving(true); setError('')
    try {
      const weekendShift = form.weekend === 'same' ? 0 : Number(form.weekend)
      const { weekend: _weekend, ...settings } = form
      dispatch({ type: 'SETUP_COMPLETE', payload: { ...settings, childName: form.childName.trim(), weekendPrepareTime: shift(form.prepareTime, weekendShift), weekendBedTime: shift(form.bedTime, weekendShift), pinHash: await hashPin(confirm), initialSteps: steps } })
    } catch (cause) { setError(cause instanceof Error ? cause.message : '还没保存好，请再试一次。'); setSaving(false) }
  }
  const busy = saving && saveStatus !== 'error'

  return (
    <main className="e-app e-setup">
      <header className="e-setup__top">
        <span className="e-brand"><span className="e-brand__moon" aria-hidden="true" />成长小队</span>
        <ol className="e-progress" aria-label={`第 ${page + 1} 步，共 ${STEPS.length} 步`}>
          {STEPS.map((title, index) => <li key={title} className={index < page ? 'is-done' : index === page ? 'is-now' : ''}><i className="u-num">{index < page ? <Icon name="check" size={14} strokeWidth={3} /> : index + 1}</i><span>{title}</span></li>)}
        </ol>
      </header>

      <div className="e-setup__body">
        <section className="e-card" key={page} aria-labelledby="e-setup-q">
          {page === 0 ? (
            <>
              <h1 id="e-setup-q" className="u-display">谁要加入成长小队？</h1>
              <Field label="孩子的昵称"><input className="u-input" value={form.childName} maxLength={8} placeholder="例如 小雨" autoFocus onChange={(event) => update('childName', event.target.value)} /></Field>
              <div className="u-field"><span>年龄</span><ChipGroup label="年龄" value={form.ageBand} onChange={(value) => update('ageBand', value)} options={AGE_BANDS.map((age) => [age, age])} /></div>
              <div className="u-field"><span>请{name}挑一个睡前伙伴</span>
                <div className="e-buddies" role="radiogroup" aria-label="睡前伙伴">
                  {CHARACTER_OPTIONS.map((item) => (
                    <button type="button" role="radio" aria-checked={form.character === item.id} key={item.id} onClick={() => update('character', item.id)}>
                      <Buddy character={item.id} mood={form.character === item.id ? 'cheer' : 'calm'} />
                      <strong>{item.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {page === 1 ? (
            <>
              <h1 id="e-setup-q" className="u-display">平常几点开始准备？</h1>
              <div className="e-dials">
                <TimeDial label="开始准备" value={form.prepareTime} onChange={(value) => update('prepareTime', value)} />
                <TimeDial label="上床时间" value={form.bedTime} onChange={(value) => update('bedTime', value)} />
              </div>
              <p className="e-hint"><Icon name="clock" size={18} />一共 {Math.max(0, timeToMinutes(form.bedTime) - timeToMinutes(form.prepareTime))} 分钟，慢慢来也够用。</p>
              <div className="u-field"><span>周末</span><ChipGroup label="周末" value={form.weekend} onChange={(value) => update('weekend', value)} options={WEEKEND} /></div>
              <div className="u-field"><span>提前多久提醒</span><ChipGroup label="提醒" value={form.reminderMinutes} onChange={(value) => update('reminderMinutes', value)} options={[[15, '15 分钟'], [30, '30 分钟'], [45, '45 分钟']]} /></div>
              <div className="u-field"><span>谁来陪</span><ChipGroup label="陪伴方式" value={form.companionMode} onChange={(value) => update('companionMode', value)} options={[['together', '家长陪着一起'], ['independent', `${name}自己来`]]} /></div>
            </>
          ) : null}

          {page === 2 ? (
            <>
              <h1 id="e-setup-q" className="u-display">今晚的小路上有哪几步？</h1>
              <p className="e-hint">点一下加上或拿掉。少一点也没关系，以后随时能改。</p>
              <div className="e-steps" role="group" aria-label="睡前步骤">
                {steps.map((step) => (
                  <button type="button" key={step.id} aria-pressed={step.enabled} onClick={() => toggle(step.id)}>
                    <AssetArt id={step.icon} decorative />
                    <strong>{step.title}</strong>
                    <small className="u-num">{step.duration} 分钟</small>
                    <i aria-hidden="true">{step.enabled ? <Icon name="check" size={16} strokeWidth={3} /> : <Icon name="plus" size={16} strokeWidth={3} />}</i>
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {page === 3 ? (
            <>
              <h1 id="e-setup-q" className="u-display">{pin.length < 4 ? '设一个家长小锁' : '再输一次确认'}</h1>
              <p className="e-hint"><Icon name="shield" size={18} />4 位数字，只是防止孩子误点设置，不是账户密码。</p>
              {pin.length < 4
                ? <PinPad key="first" label="家长小锁" value={pin} onChange={(value) => { setPin(value); setError('') }} disabled={busy} />
                : <PinPad key="again" label="再输一次" value={pinAgain} onChange={(value) => { setPinAgain(value); setError('') }} onFull={finish} disabled={busy} />}
              {busy ? <p className="e-hint" role="status">正在安全保存…</p> : null}
            </>
          ) : null}

          {error || (saving && saveStatus === 'error') ? <p className="e-error" role="alert">{error || saveMessage}</p> : null}

          <footer className="e-card__go">
            {page > 0 ? <Tap tone="quiet" icon="back" disabled={busy} onClick={() => { setError(''); if (page === 3 && pin.length === 4) { setPin(''); setPinAgain('') } else setPage((value) => value - 1) }}>上一步</Tap> : <Tap tone="quiet" icon="back" onClick={() => navigate('/welcome')}>返回</Tap>}
            {page < 3 ? <Tap tone="primary" size="l" onClick={next}>下一步<Icon name="chevron" size={22} /></Tap> : null}
          </footer>
        </section>

        <aside className="e-preview" aria-label="今晚预览">
          <span className="e-preview__label">{name}今晚会看到</span>
          <div className="e-preview__sky">
            <Buddy character={form.character} mood="hello" />
            <p className="e-preview__bubble">{name}，{form.prepareTime} 我们开始准备吧！我是{buddy?.name}。</p>
          </div>
          <ol className="e-preview__path">
            {chosen.map((step, index) => <li key={step.id} style={{ '--i': index }}><AssetArt id={step.icon} decorative /><span>{step.title}</span></li>)}
            <li className="is-bed"><AssetArt id="pillow" decorative /><span className="u-num">{form.bedTime} 睡觉</span></li>
          </ol>
        </aside>
      </div>
    </main>
  )
}

/* ─────────────────────────  Pair a device  ───────────────────────── */
export function Pair({ onPaired }) {
  const [code, setCode] = useState('')
  const [deviceName, setDeviceName] = useState(() => (/iPad/i.test(navigator.userAgent) ? '孩子的 iPad' : '家庭设备'))
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const connect = async (event) => {
    event.preventDefault()
    if (code.trim().length < 6 || status === 'connecting') return
    setStatus('connecting'); setError('')
    try { onPaired(await pairDevice(code.trim().toUpperCase(), deviceName.trim() || '家庭设备')) } catch (reason) { setError(reason instanceof Error ? reason.message : '暂时连不上家庭，请稍后再试'); setStatus('idle') }
  }
  return (
    <main className="e-app e-pair">
      <section className="e-card e-pair__card" aria-labelledby="e-pair-title">
        <span className="e-brand"><span className="e-brand__moon" aria-hidden="true" />成长小队</span>
        <Buddy character="bear" mood="sleepy" className="e-pair__buddy" />
        <h1 id="e-pair-title" className="u-display">把这台设备接回家</h1>
        <p className="e-hint">家长连一次就好。以后孩子点开主屏幕图标，就直接回到自己的小队。</p>
        <form className="e-pair__form" onSubmit={connect}>
          <Field label="家庭连接码" hint="搭建家庭云端时设定的那一串码，所有家庭设备共用">
            <input id="family-code" name="familyCode" className="u-input e-pair__code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} autoComplete="off" placeholder="MOON-1234" value={code} onChange={(event) => setCode(event.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())} />
          </Field>
          <Field label="这台设备叫"><input id="device-name" name="deviceName" className="u-input" value={deviceName} maxLength={40} autoComplete="off" onChange={(event) => setDeviceName(event.target.value)} /></Field>
          {error ? <p className="e-error" role="alert">{error}</p> : null}
          <Tap tone="primary" size="l" block type="submit" icon="sync" disabled={code.trim().length < 6 || status === 'connecting'}>{status === 'connecting' ? '正在连接…' : '连接我的家庭'}</Tap>
        </form>
        <p className="e-foot"><Icon name="shield" size={16} />孩子的记录只在已连接的家庭设备之间同步</p>
      </section>
    </main>
  )
}

/* ─────────────────────────  Parent gate  ─────────────────────────
 * The lock sits over a dimmed child screen so it is clear this is a door, not a new place. */
export function ParentGate() {
  const { unlockParent } = useBedtimeActions()
  const navigate = useNavigate()
  const location = useLocation()
  const target = new URLSearchParams(location.search).get('next') || '/parent'
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(0)
  const [checking, setChecking] = useState(false)
  const verify = async (value) => {
    if (checking) return
    setChecking(true)
    try {
      if (await unlockParent(value)) { navigate(target, { replace: true }); return }
      setError('不对哦，再试一次。'); setShake((count) => count + 1); setPin('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法验证，请稍后再试。'); setPin('')
    } finally { setChecking(false) }
  }
  return (
    <main className="e-app e-gate">
      <section className={`e-card e-gate__card${shake ? ' is-wrong' : ''}`} key={shake} aria-labelledby="e-gate-title">
        <span className="e-gate__lock" aria-hidden="true"><Icon name="lock" size={30} /></span>
        <h1 id="e-gate-title" className="u-display">家长小锁</h1>
        <p className="e-hint">输入 4 位数字，进入家长区</p>
        <PinPad label="家长小锁" value={pin} onChange={(value) => { setPin(value); setError('') }} onFull={verify} disabled={checking} />
        {error ? <p className="e-error" role="alert">{error}</p> : null}
        <Tap tone="quiet" icon="back" onClick={() => navigate('/today')}>回到孩子这边</Tap>
      </section>
    </main>
  )
}
