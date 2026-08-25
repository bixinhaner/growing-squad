import { useMemo, useState } from 'react'
import { addDays, dayTypeFor, getActiveProfile, getSchedule, localDateKey, timeToMinutes } from '../domain/model.js'
import { getCompanionPack } from '../domain/themePacks.js'
import { getPushKey, savePushSubscription, urlBase64ToUint8Array } from '../data/cloud.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { PageTitle, Segmented, Toggle } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { ThemeScene } from '../ui/ThemeArt.jsx'

export function SchedulePage() {
  const { state, cloud } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const todayKey = localDateKey()
  const [dayType, setDayType] = useState(() => dayTypeFor(new Date(`${todayKey}T12:00:00`)))
  const schedule = getSchedule(state, dayType)
  const scheduleSource = schedule.pending || schedule
  const profile = getActiveProfile(state)
  const companion = getCompanionPack(profile.character)
  const [form, setForm] = useState({ prepareTime: scheduleSource.prepareTime, bedTime: scheduleSource.bedTime, reminderMinutes: scheduleSource.reminderMinutes, reminderEnabled: scheduleSource.reminderEnabled ?? true })
  const [effectiveTiming, setEffectiveTiming] = useState(() => schedule.pending?.effectiveFrom > todayKey ? 'next' : 'tonight')
  const [message, setMessage] = useState('')
  const notificationAvailable = 'Notification' in window
  const [notificationPermission, setNotificationPermission] = useState(() => notificationAvailable ? Notification.permission : 'unsupported')
  const [notificationMessage, setNotificationMessage] = useState('')

  const changeDayType = (value) => {
    const nextSchedule = getSchedule(state, value)
    const source = nextSchedule.pending || nextSchedule
    setDayType(value)
    setForm({ prepareTime: source.prepareTime, bedTime: source.bedTime, reminderMinutes: source.reminderMinutes, reminderEnabled: source.reminderEnabled ?? true })
    setEffectiveTiming(nextSchedule.pending?.effectiveFrom > todayKey ? 'next' : 'tonight')
    setMessage('')
  }

  const preview = useMemo(() => `还有 ${form.reminderMinutes} 分钟开始准备，${companion.name}在今晚等你。`, [companion.name, form.reminderMinutes])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const save = () => {
    if (timeToMinutes(form.prepareTime) >= timeToMinutes(form.bedTime)) {
      setMessage('开始准备需要早于计划完成时间。')
      return
    }
    const effectiveFrom = effectiveTiming === 'tonight' ? todayKey : addDays(todayKey, 1)
    dispatch({ type: 'UPDATE_SCHEDULE', payload: { dayType, ...form, effectiveFrom } })
    setMessage(effectiveTiming === 'tonight' ? `已保存，今晚按 ${form.bedTime} 结算星光。` : '已保存，新时间从下一晚生效。')
  }
  const enableNotifications = async () => {
    if (!notificationAvailable) return
    setNotificationMessage('')
    try {
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission !== 'granted') return
      if (cloud.mode !== 'connected' || !('PushManager' in window)) {
        setNotificationMessage('当前浏览器只能在网页打开时提醒。')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const { publicKey } = await getPushKey()
      if (!publicKey) throw new Error('云端推送尚未准备好')
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })
      await savePushSubscription(subscription, profile.id)
      setNotificationMessage('这台 iPad 即使锁屏，也会收到睡前提醒。')
    } catch (error) {
      setNotificationMessage(error instanceof Error ? error.message : '提醒连接失败，请稍后再试。')
    }
  }

  return (
    <section>
      <PageTitle title="作息与提醒" subtitle="把孩子会看到的提醒和生效时间放在一起确认。" icon="clock" />
      <div className="settings-two-column">
        <article className="settings-card">
          <Segmented label="日期类型" value={dayType} onChange={changeDayType} options={[{ value: 'weekday', label: '工作日' }, { value: 'weekend', label: '周末' }]} />
          <div className="time-fields">
            <label><span>开始准备</span><input type="time" value={form.prepareTime} onChange={(event) => update('prepareTime', event.target.value)} /></label>
            <label><span>计划完成任务</span><input type="time" value={form.bedTime} onChange={(event) => update('bedTime', event.target.value)} /></label>
          </div>
          <div className="setting-row"><span className="setting-row__icon"><Icon name="bell" /></span><div><strong>提前提醒</strong><small>在开始准备前提醒孩子</small></div><select value={form.reminderMinutes} disabled={!form.reminderEnabled} onChange={(event) => update('reminderMinutes', Number(event.target.value))}><option value={15}>15 分钟</option><option value={30}>30 分钟</option><option value={45}>45 分钟</option></select><Toggle label="提前提醒" checked={form.reminderEnabled} onChange={(value) => update('reminderEnabled', value)} /></div>
          <div className="notification-permission"><span><Icon name="bell" /></span><div><strong>{notificationPermission === 'granted' ? '系统提醒已允许' : notificationPermission === 'denied' ? '系统提醒被浏览器关闭' : notificationPermission === 'unsupported' ? '此浏览器不支持系统提醒' : '允许系统提醒'}</strong><small>{notificationMessage || (notificationPermission === 'granted' ? (cloud.mode === 'connected' ? '点按连接，把提醒交给家庭云端发送。' : '网页保持打开时，会按计划提醒。') : notificationPermission === 'denied' ? '请在 iPad 设置中重新允许通知。' : notificationPermission === 'unsupported' ? '仍可在打开网页时查看今晚时间。' : '请先添加到 iPad 主屏幕，再由家长主动开启。')}</small></div>{notificationPermission === 'default' || notificationPermission === 'granted' ? <button type="button" onClick={enableNotifications}>{notificationPermission === 'granted' ? '连接' : '开启'}</button> : null}</div>
          <div className="effective-choice">
            <div className="effective-choice__title"><Icon name="clock" /><span><strong>什么时候生效？</strong><small>今晚有临时安排时，可以立即改用新时间。</small></span></div>
            <Segmented
              label="作息生效时间"
              value={effectiveTiming}
              onChange={(value) => { setEffectiveTiming(value); setMessage('') }}
              options={[{ value: 'tonight', label: '今晚生效' }, { value: 'next', label: '下一晚生效' }]}
            />
            <p className={`effective-note ${effectiveTiming === 'tonight' ? 'effective-note--tonight' : ''}`}>
              {effectiveTiming === 'tonight'
                ? `今晚在 ${form.bedTime} 前完成全部任务可得星光；实际上床晚一点不会扣分。`
                : `今晚保持当前计划，${addDays(todayKey, 1)} 起使用新时间。`}
            </p>
          </div>
          {message ? <div className={message.startsWith('已保存') ? 'form-success' : 'form-error'} role="status">{message}</div> : null}
          <button className="button button--primary button--wide" type="button" onClick={save}><Icon name="check" />保存作息</button>
        </article>
        <aside className="child-preview-card">
          <span className="preview-label">{profile.name} 会看到</span>
          <div className="preview-message"><ThemeScene theme={profile.theme} character={profile.character} pose="waiting" label={`${companion.name}在今晚等你`} className="schedule-theme-preview" /><strong>{preview}</strong></div>
          <div className="preview-times"><span><small>开始准备</small>{form.prepareTime}</span><i>→</i><span><small>计划完成</small>{form.bedTime}</span></div>
          <p>温和提醒一次，不重复催促。</p>
        </aside>
      </div>
    </section>
  )
}
