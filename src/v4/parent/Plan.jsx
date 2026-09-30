import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { addDays, dayTypeFor, getActiveProfile, getRewardMoments, getRoutine, getSchedule, getStarBalance, localDateKey, timeToMinutes, uid } from '../../domain/model.js'
import { defaultRoutinesFor, deriveTodayCandidate, getCoreRoutines, inspectRoutineLoad, ROUTINE_PERIODS } from '../../core/today/todayEngine.js'
import { getCompanionPack } from '../../domain/themePacks.js'
import { getPushKey, savePushSubscription, urlBase64ToUint8Array } from '../../data/cloud.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { OBJECT_ASSET_OPTIONS } from '../../domain/assets.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Field, Sheet, Switch, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { AssetPicker, Empty, Notice, PageHead, Panel, Segment, SettingRow, Stat, SubNav } from './pkit.jsx'
import { dateLabel } from './format.js'
import { RewardSheet } from './RewardSheet.jsx'

const DAY_NAMES = { weekday: '上学日', weekend: '周末' }
const stamp = () => Date.now()
const todayType = () => dayTypeFor(new Date(`${localDateKey()}T12:00:00`))

export function PlanLayout() {
  const { state } = useBedtimeState()
  const pending = state.rewardRequests.filter((item) => item.profileId === state.activeProfileId && item.status === 'pending').length
  return (
    <div className="p-page">
      <SubNav label="安排" items={[
        { to: '/parent/plan', label: '作息' },
        { to: '/parent/plan/routine', label: '睡前小路' },
        { to: '/parent/plan/day', label: '全天节奏' },
        { to: '/parent/plan/wishes', label: '愿望星光', badge: pending },
      ]} />
      <Outlet />
    </div>
  )
}

/* ─────────────  作息: two cards, one sheet to change  ───────────── */
export function PlanSchedule() {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const companion = getCompanionPack(profile.character)
  const [editing, setEditing] = useState(null)
  const current = todayType()
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 作息`} title="几点开始，几点完成" lead="在计划时间前走完小路，提前的分钟会变成星光。晚一点不扣分。" />
      <div className="p-days">
        {['weekday', 'weekend'].map((dayType) => {
          const schedule = getSchedule(state, dayType)
          const pending = schedule.pending
          return (
            <article key={dayType} className={`p-day${dayType === current ? ' is-today' : ''}`}>
              <header><span className="p-eyebrow">{DAY_NAMES[dayType]}{dayType === current ? ' · 今天' : ''}</span><Tap tone="soft" size="s" icon="edit" onClick={() => setEditing(dayType)}>调整</Tap></header>
              <div className="p-day__times">
                <span><small>开始准备</small><strong className="u-num">{schedule.prepareTime}</strong></span>
                <i aria-hidden="true" />
                <span><small>计划完成</small><strong className="u-num">{schedule.bedTime}</strong></span>
              </div>
              <p className="p-fine"><Icon name="bell" size={14} /> {schedule.reminderEnabled === false ? '不提前提醒' : `提前 ${schedule.reminderMinutes} 分钟温和提醒一次`}</p>
              {pending && pending.effectiveFrom > localDateKey() ? <Notice icon="calendar">{dateLabel(new Date(`${pending.effectiveFrom}T12:00:00`).getTime())} 起改为 {pending.prepareTime} – {pending.bedTime}</Notice> : null}
            </article>
          )
        })}
      </div>
      <div className="p-cols">
        <Notifications />
        <Panel title={`${profile.name}会看到`} tone="warm">
          <div className="p-kidview">
            <Buddy character={profile.character} mood="hello" />
            <p>“还有 {getSchedule(state, current).reminderMinutes} 分钟开始准备，{companion.name}在今晚等你。”</p>
          </div>
          <small className="p-fine">只提醒一次，不反复催促。</small>
        </Panel>
      </div>
      {editing ? <ScheduleSheet key={editing} dayType={editing} onClose={() => setEditing(null)} /> : null}
    </>
  )
}

function ScheduleSheet({ dayType, onClose }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const todayKey = localDateKey()
  const schedule = getSchedule(state, dayType)
  const source = schedule.pending || schedule
  const [form, setForm] = useState({ prepareTime: source.prepareTime, bedTime: source.bedTime, reminderMinutes: source.reminderMinutes, reminderEnabled: source.reminderEnabled ?? true })
  const [when, setWhen] = useState(() => (schedule.pending?.effectiveFrom > todayKey ? 'next' : 'tonight'))
  const [error, setError] = useState('')
  const patch = (value) => { setForm((currentForm) => ({ ...currentForm, ...value })); setError('') }
  const affectsTonight = dayType === todayType()
  const save = (event) => {
    event.preventDefault()
    if (timeToMinutes(form.prepareTime) >= timeToMinutes(form.bedTime)) { setError('开始准备要早于计划完成。'); return }
    const effectiveFrom = when === 'tonight' ? todayKey : addDays(todayKey, 1)
    dispatch({ type: 'UPDATE_SCHEDULE', payload: { dayType, ...form, effectiveFrom } })
    toast(when === 'tonight' && affectsTonight ? `今晚起按 ${form.bedTime} 结算` : '保存好了，从下一晚开始')
    onClose()
  }
  return (
    <Sheet title={`${DAY_NAMES[dayType]}的作息`} onClose={onClose}>
      <form className="p-form" onSubmit={save}>
        <div className="p-grid-2">
          <Field label="开始准备"><input className="u-input u-num" type="time" value={form.prepareTime} onChange={(event) => patch({ prepareTime: event.target.value })} /></Field>
          <Field label="计划完成"><input className="u-input u-num" type="time" value={form.bedTime} onChange={(event) => patch({ bedTime: event.target.value })} /></Field>
        </div>
        <SettingRow icon="bell" title="提前提醒" copy="开始准备前，温和提醒孩子一次">
          <Switch label="提前提醒" checked={form.reminderEnabled} onChange={(reminderEnabled) => patch({ reminderEnabled })} />
        </SettingRow>
        {form.reminderEnabled ? <Segment label="提前多久" value={Number(form.reminderMinutes)} onChange={(reminderMinutes) => patch({ reminderMinutes })} options={[[15, '15 分钟'], [30, '30 分钟'], [45, '45 分钟']]} /> : null}
        {affectsTonight ? (
          <div className="u-field"><span>什么时候生效</span>
            <Segment label="生效时间" value={when} onChange={setWhen} options={[['tonight', '今晚就用'], ['next', '从明晚开始']]} />
            <small>{when === 'tonight' ? `今晚在 ${form.bedTime} 前走完小路就有星光。` : '今晚保持原来的时间。'}</small>
          </div>
        ) : null}
        {error ? <p className="p-error" role="alert">{error}</p> : null}
        <Tap tone="primary" size="l" block type="submit" icon="check">保存</Tap>
      </form>
    </Sheet>
  )
}

function Notifications() {
  const { state, cloud } = useBedtimeState()
  const profile = getActiveProfile(state)
  const available = typeof window !== 'undefined' && 'Notification' in window
  const [permission, setPermission] = useState(() => (available ? Notification.permission : 'unsupported'))
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const enable = async () => {
    setBusy(true); setMessage('')
    try {
      const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') return
      if (cloud.mode !== 'connected' || !('PushManager' in window)) { setMessage('这个浏览器只能在页面打开时提醒。'); return }
      const registration = await navigator.serviceWorker.ready
      const { publicKey } = await getPushKey()
      if (!publicKey) throw new Error('云端推送还没准备好')
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      await savePushSubscription(subscription, profile.id)
      setMessage('锁屏时，这台设备也会收到提醒。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '没连上，请稍后再试。')
    } finally { setBusy(false) }
  }
  const title = { granted: '系统提醒已允许', denied: '系统提醒被关闭了', unsupported: '这个浏览器不支持系统提醒', default: '系统提醒' }[permission]
  const copy = message || { granted: cloud.mode === 'connected' ? '连接后，由家庭云端准时发送。' : '页面开着时会按时提醒。', denied: '需要在系统设置里重新允许通知。', unsupported: '打开页面时仍能看到今晚的时间。', default: '先把应用添加到主屏幕，再开启。' }[permission]
  return (
    <Panel title="提醒送到哪里">
      <SettingRow icon="bell" title={title} copy={copy}>
        {permission === 'default' || permission === 'granted' ? <Tap tone="soft" size="s" disabled={busy} onClick={enable}>{permission === 'granted' ? '连接' : '开启'}</Tap> : null}
      </SettingRow>
    </Panel>
  )
}

/* ─────────────  睡前小路: list + one editing sheet  ───────────── */
const MAX_STEPS = 16
export function PlanRoutine() {
  const [dayType, setDayType] = useState(todayType)
  return <RoutineEditor key={dayType} dayType={dayType} onDayType={setDayType} />
}

function RoutineEditor({ dayType, onDayType }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const original = getRoutine(state, dayType).steps
  const [steps, setSteps] = useState(() => structuredClone(original))
  const [editId, setEditId] = useState(null)
  const [dragId, setDragId] = useState(null)
  const dirty = JSON.stringify(steps) !== JSON.stringify(original)
  const enabled = steps.filter((step) => step.enabled)
  const minutes = enabled.reduce((sum, step) => sum + Number(step.duration || 0), 0)
  const patchStep = (id, value) => setSteps((items) => items.map((item) => (item.id === id ? { ...item, ...value } : item)))
  const toggle = (step, value) => {
    if (value && enabled.length >= MAX_STEPS) { toast('孩子那边最多同时显示 16 步，先关掉一步。'); return }
    patchStep(step.id, { enabled: value })
  }
  const move = (index, delta) => setSteps((items) => {
    const target = index + delta
    if (target < 0 || target >= items.length) return items
    const next = [...items]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    return next
  })
  const dropOn = (targetId) => {
    if (!dragId || dragId === targetId) return
    setSteps((items) => {
      const next = [...items]
      const [source] = next.splice(next.findIndex((item) => item.id === dragId), 1)
      next.splice(next.findIndex((item) => item.id === targetId), 0, source)
      return next
    })
    setDragId(null)
  }
  const add = () => {
    if (enabled.length >= MAX_STEPS) { toast('已经有 16 步了，先关掉一步。'); return }
    const step = { id: uid('step'), title: '新的一步', icon: 'heart', duration: 3, enabled: true }
    setSteps((items) => [...items, step])
    setEditId(step.id)
  }
  const remove = (id) => { if (steps.length > 1) { setSteps((items) => items.filter((item) => item.id !== id)); setEditId(null) } }
  const save = () => { dispatch({ type: 'UPDATE_ROUTINE', payload: { dayType, steps } }); toast('睡前小路保存好了') }
  const switchDay = (value) => {
    if (dirty && !window.confirm('还没保存，切换后改动会丢失。继续吗？')) return
    onDayType(value)
  }
  const editing = steps.find((step) => step.id === editId)
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 睡前小路`} title="一步一步，走到被窝" lead="孩子每次只看到正在做的一步。拖动或用箭头调整顺序。">
        <Segment label="哪一天" value={dayType} onChange={switchDay} options={[['weekday', '上学日'], ['weekend', '周末']]} />
      </PageHead>
      <div className="p-cols is-wide-left">
        <Panel title={`${enabled.length} 步 · 约 ${minutes} 分钟`} aside={<Tap tone="soft" size="s" icon="plus" disabled={enabled.length >= MAX_STEPS} onClick={add}>加一步</Tap>}>
          <ol className="p-steps">
            {steps.map((step, index) => (
              <li key={step.id} className={`${step.enabled ? '' : 'is-off'}${dragId === step.id ? ' is-drag' : ''}`} draggable onDragStart={(event) => { setDragId(step.id); event.dataTransfer.effectAllowed = 'move' }} onDragEnd={() => setDragId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropOn(step.id)}>
                <span className="p-steps__grip" aria-hidden="true"><Icon name="grip" size={18} /></span>
                <button type="button" className="p-steps__main" onClick={() => setEditId(step.id)} aria-label={`编辑${step.title}`}>
                  <AssetArt id={step.icon} decorative />
                  <span><strong>{step.title}</strong><small>约 {step.duration} 分钟</small></span>
                </button>
                <span className="p-steps__move">
                  <button type="button" aria-label={`${step.title}上移`} disabled={index === 0} onClick={() => move(index, -1)}><Icon name="up" size={16} /></button>
                  <button type="button" aria-label={`${step.title}下移`} disabled={index === steps.length - 1} onClick={() => move(index, 1)}><Icon name="down" size={16} /></button>
                </span>
                <Switch label={`启用${step.title}`} checked={step.enabled} onChange={(value) => toggle(step, value)} />
              </li>
            ))}
          </ol>
        </Panel>
        <Panel title="孩子那边的样子" tone="warm">
          <div className="p-path">
            {enabled.map((step, index) => <span key={step.id} style={{ '--i': index }}><AssetArt id={step.icon} decorative /><small>{step.title}</small></span>)}
            <span className="p-path__end"><Icon name="moon" size={22} /><small>晚安</small></span>
          </div>
          <small className="p-fine">{enabled.length > 9 ? '步骤较多，孩子那边会用紧凑排列。' : '建议每步 3–10 分钟，帮孩子建立时间感。'}</small>
        </Panel>
      </div>
      {dirty ? (
        <div className="p-savebar" role="status">
          <span>改动还没保存</span>
          <Tap tone="quiet" size="s" onClick={() => setSteps(structuredClone(original))}>还原</Tap>
          <Tap tone="primary" size="s" icon="check" onClick={save}>保存小路</Tap>
        </div>
      ) : null}
      {editing ? (
        <Sheet title="这一步" onClose={() => setEditId(null)}>
          <div className="p-form">
            <Field label="名称" hint="最多 8 个字，孩子能一眼读懂"><input className="u-input" autoFocus maxLength={8} value={editing.title} onChange={(event) => patchStep(editing.id, { title: event.target.value })} /></Field>
            <div className="u-field"><span>大约几分钟</span><Segment label="时长" value={Number(editing.duration)} onChange={(duration) => patchStep(editing.id, { duration })} options={[[2, '2'], [3, '3'], [5, '5'], [10, '10'], [15, '15']]} /></div>
            <div className="u-field"><span>图片</span><AssetPicker label="步骤图片" value={editing.icon} onChange={(icon) => patchStep(editing.id, { icon })} /></div>
            <Tap tone="primary" block onClick={() => setEditId(null)}>好了</Tap>
            {steps.length > 1 ? <button type="button" className="p-link is-danger" onClick={() => remove(editing.id)}>删掉这一步</button> : null}
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

/* ─────────────  全天节奏  ───────────── */
const PERIODS = { morning: '早晨', 'after-school': '放学后', evening: '晚间' }
export function PlanDay() {
  const { state } = useBedtimeState()
  return <DayEditor key={state.activeProfileId} />
}
function DayEditor() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const original = getCoreRoutines(state, profile.id)
  const [routines, setRoutines] = useState(() => structuredClone(original))
  const dirty = JSON.stringify(routines) !== JSON.stringify(original)
  const warnings = inspectRoutineLoad(routines)
  const previewState = { ...state, modules: { ...state.modules, core: { ...(state.modules.core || {}), routines: [...(state.modules.core?.routines || []).filter((item) => item.profileId !== profile.id), ...routines] } } }
  const preview = deriveTodayCandidate(previewState, profile.id)
  const update = (id, value) => setRoutines((items) => items.map((item) => (item.id === id ? { ...item, ...value } : item)))
  const updateItem = (routine, itemId, value) => update(routine.id, { items: routine.items.map((item) => (item.id === itemId ? { ...item, ...value } : item)) })
  const addItem = (routine) => update(routine.id, { items: [...routine.items, { id: `item-${crypto.randomUUID()}`, title: '新的活动', assetId: 'heart', estimatedMinutes: 10, required: false }] })
  const removeItem = (routine, itemId) => update(routine.id, { items: routine.items.filter((item) => item.id !== itemId) })
  const addFree = () => {
    const target = routines.find((item) => item.period === 'after-school')
    if (target && !target.items.some((item) => item.kind === 'free')) update(target.id, { items: [{ id: 'free-play', title: '自由玩耍', kind: 'free', assetId: 'park', estimatedMinutes: 30, required: false }, ...target.items] })
  }
  const save = () => { dispatch({ type: 'UPDATE_CORE_ROUTINES', profileId: profile.id, routines }); toast('全天节奏保存好了') }
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 全天节奏`} title="大人看全天，孩子只看下一件" lead="这里安排早晨、放学后和晚间。孩子打开时只会看到此刻该做的一件事。">
        <Tap tone="quiet" size="s" onClick={() => setRoutines(defaultRoutinesFor(profile.id))}>换回温和模板</Tap>
      </PageHead>
      {warnings.length ? (
        <div className="p-advice"><Icon name="sparkle" size={20} /><span><strong>安排有点满</strong><small>{warnings.join('；')}。先留出自由玩耍的时间吧。</small></span><Tap tone="soft" size="s" onClick={addFree}>留出自由时间</Tap></div>
      ) : null}
      <div className="p-cols is-wide-left">
        <div className="p-lanes">
          {ROUTINE_PERIODS.map((period) => {
            const routine = routines.find((item) => item.period === period)
            if (!routine) return null
            return (
              <section key={period} className={`p-lane p-lane--${period}`}>
                <header>
                  <h3>{PERIODS[period]}</h3>
                  <label>从 <input className="u-input u-num" type="time" value={routine.startTime} onChange={(event) => update(routine.id, { startTime: event.target.value })} aria-label={`${PERIODS[period]}开始时间`} /></label>
                </header>
                <ul>
                  {routine.items.map((item) => (
                    <li key={item.id} className={item.kind === 'free' ? 'is-free' : ''}>
                      <AssetArt id={item.assetId} decorative />
                      <input className="p-lane__name" aria-label={`${PERIODS[period]}活动名称`} value={item.title} maxLength={16} onChange={(event) => updateItem(routine, item.id, { title: event.target.value })} />
                      <small>{item.kind === 'free' ? '自由时间' : `约 ${item.estimatedMinutes} 分钟`}</small>
                      <button type="button" className="p-lane__x" aria-label={`移除${item.title}`} onClick={() => removeItem(routine, item.id)}><Icon name="close" size={14} /></button>
                    </li>
                  ))}
                  <li className="p-lane__add"><button type="button" onClick={() => addItem(routine)}><Icon name="plus" size={16} /> 加一件</button></li>
                </ul>
              </section>
            )
          })}
        </div>
        <Panel title="孩子此刻看到" tone="warm">
          <div className="p-now-preview">
            <small>{preview.context}</small>
            <strong>{preview.title}</strong>
            {preview.options[0] ? <><AssetArt id={preview.options[0].assetId} decorative /><span>{preview.options[0].title}</span></> : <AssetArt id="park" decorative />}
          </div>
          <Tap tone="soft" size="s" block onClick={() => navigate('/today')}>去孩子那边看看</Tap>
        </Panel>
      </div>
      {dirty ? (
        <div className="p-savebar" role="status">
          <span>改动还没保存</span>
          <Tap tone="quiet" size="s" onClick={() => setRoutines(structuredClone(original))}>还原</Tap>
          <Tap tone="primary" size="s" icon="check" onClick={save}>保存节奏</Tap>
        </div>
      ) : null}
    </>
  )
}

/* ─────────────  愿望星光  ───────────── */
export function PlanWishes() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const profile = getActiveProfile(state)
  const [rewarding, setRewarding] = useState(false)
  const [editing, setEditing] = useState(false)
  const balance = getStarBalance(state)
  const moments = getRewardMoments(state)
  const pending = state.rewardRequests.filter((request) => request.profileId === state.activeProfileId && request.status === 'pending')
  const wishOf = (request) => state.wishes.find((item) => item.id === request.wishId)
  const approve = (request) => {
    dispatch({ type: 'APPROVE_REWARD', requestId: request.id, timestamp: stamp() })
    toast(`「${wishOf(request)?.name}」兑换好了`, { duration: 30000, action: { label: '撤销', onClick: () => dispatch({ type: 'UNDO_REWARD', requestId: request.id }) } })
  }
  const visible = state.wishes.filter((item) => item.enabled)
  return (
    <>
      <PageHead eyebrow={`${profile.name} · 愿望星光`} title="星光换成真实的陪伴" lead="兑换只减少可用星光，奖励纪念一直留在孩子的宝盒里。">
        <Tap tone="soft" icon="edit" onClick={() => setEditing(true)}>编辑愿望单</Tap>
        <Tap tone="primary" icon="gift" onClick={() => setRewarding(true)}>记一份奖励</Tap>
      </PageHead>
      <div className="p-stats">
        <Stat label="可用星光" value={balance} unit="点" tone="honey" />
        <Stat label="宝盒里的纪念" value={moments.length} unit="份" />
        <Stat label="愿望单" value={visible.length} unit="个" note="孩子那边能选的" />
      </div>
      <Panel title="等你确认" aside={pending.length ? <span className="p-pill is-honey">{pending.length}</span> : null}>
        {pending.length ? pending.map((request) => {
          const wish = wishOf(request)
          const after = balance - (wish?.cost || 0)
          return (
            <div className="p-line is-card" key={request.id}>
              <AssetArt id={wish?.assetId || wish?.emoji} decorative />
              <span><strong>{wish?.name}</strong><small>需要 {wish?.cost} 点 · 确认后剩 {Math.max(0, after)} 点{after < 0 ? '（星光还不够）' : ''}</small></span>
              <Tap tone="primary" size="s" icon="check" disabled={after < 0} onClick={() => approve(request)}>兑换</Tap>
            </div>
          )
        }) : <Empty icon="check" title="没有等待的愿望">孩子选好愿望后，会出现在这里和「此刻」页。</Empty>}
      </Panel>
      <Panel title="孩子能选的愿望">
        <div className="p-wishes">
          {visible.map((wish) => <div key={wish.id} className={balance >= wish.cost ? 'is-ready' : ''}><AssetArt id={wish.assetId || wish.emoji} decorative /><strong>{wish.name}</strong><small className="u-num">{wish.cost} 点</small></div>)}
        </div>
      </Panel>
      <Panel title="宝盒里的纪念">
        {moments.length ? moments.slice(0, 12).map((moment) => (
          <div className="p-line" key={moment.id}>
            <AssetArt id={moment.assetId} decorative />
            <span><strong>{moment.title}</strong><small>{dateLabel(moment.occurredAt)}{moment.note ? ` · ${moment.note}` : ''}</small></span>
            <em className="p-pill">{moment.points > 0 ? `+${moment.points}` : '纪念卡'}</em>
          </div>
        )) : <Empty icon="gift" title="还没有纪念">记一份奖励，就会留下第一张纪念卡。</Empty>}
      </Panel>
      {rewarding ? <RewardSheet childName={profile.name} onClose={() => setRewarding(false)} /> : null}
      {editing ? <WishEditor onClose={() => setEditing(false)} /> : null}
    </>
  )
}

function WishEditor({ onClose }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const toast = useToast()
  const [wishes, setWishes] = useState(() => structuredClone(state.wishes))
  const [message, setMessage] = useState('')
  const patch = (id, value) => { setWishes((items) => items.map((item) => (item.id === id ? { ...item, ...value } : item))); setMessage('') }
  const enabledCount = wishes.filter((item) => item.enabled).length
  const add = () => {
    if (wishes.length >= 12) { setMessage('愿望单最多 12 个。'); return }
    setWishes((items) => [...items, { id: uid('wish'), name: '', cost: 35, assetId: 'craft', enabled: true }])
  }
  const remove = (wish) => {
    if (wish.enabled && enabledCount <= 3) { setMessage('至少保留 3 个能选的愿望。'); return }
    if (state.rewardRequests.some((request) => request.wishId === wish.id)) { patch(wish.id, { enabled: false }); setMessage('这个愿望兑换过，先对孩子隐藏，记录保留。'); return }
    setWishes((items) => items.filter((item) => item.id !== wish.id))
  }
  const save = (event) => {
    event.preventDefault()
    const normalized = wishes.map((item) => ({ ...item, name: item.name.trim(), cost: Math.max(1, Math.min(999, Number(item.cost) || 1)), assetId: item.assetId || 'heart' }))
    if (normalized.some((item) => !item.name)) { setMessage('每个愿望都要有名字。'); return }
    if (normalized.filter((item) => item.enabled).length < 3) { setMessage('至少保留 3 个能选的愿望。'); return }
    dispatch({ type: 'UPDATE_WISHES', payload: normalized })
    toast('愿望单保存好了')
    onClose()
  }
  return (
    <Sheet title="家庭愿望单" onClose={onClose} className="p-sheet-wide">
      <form className="p-form" onSubmit={save}>
        <p className="p-fine">保留 3–12 个真实能兑现的家庭活动。</p>
        <div className="p-wish-rows">
          {wishes.map((wish, index) => (
            <div className={`p-wish-row${wish.enabled ? '' : ' is-off'}`} key={wish.id}>
              <label className="p-wish-row__art"><AssetArt id={wish.assetId || wish.emoji} decorative />
                <select aria-label={`愿望 ${index + 1} 图片`} value={wish.assetId || 'heart'} onChange={(event) => patch(wish.id, { assetId: event.target.value })}>
                  {OBJECT_ASSET_OPTIONS.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
                </select>
              </label>
              <input className="u-input" aria-label={`愿望 ${index + 1} 名称`} placeholder="愿望名称" maxLength={16} value={wish.name} onChange={(event) => patch(wish.id, { name: event.target.value })} />
              <label className="p-wish-row__cost"><input className="u-input u-num" aria-label={`愿望 ${index + 1} 星光`} type="number" min="1" max="999" value={wish.cost} onChange={(event) => patch(wish.id, { cost: event.target.value })} /><small>点</small></label>
              <Switch label={`显示愿望 ${wish.name}`} checked={wish.enabled} onChange={(value) => patch(wish.id, { enabled: value })} />
              <button type="button" className="p-lane__x" aria-label={`移除${wish.name || '这个愿望'}`} onClick={() => remove(wish)}><Icon name="trash" size={16} /></button>
            </div>
          ))}
        </div>
        {message ? <p className="p-error" role="status">{message}</p> : null}
        <Tap tone="soft" block icon="plus" disabled={wishes.length >= 12} onClick={add}>加一个愿望</Tap>
        <Tap tone="primary" size="l" block type="submit" icon="check">保存愿望单</Tap>
      </form>
    </Sheet>
  )
}
