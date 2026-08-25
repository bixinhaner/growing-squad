import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { EARLY_TIME_CONFIRM_MINUTES, dayTypeFor, getAccessibility, getActiveProfile, getEarlyMinutes, getLateMinutes, getRoutine, getSchedule, getSession, isRoutineOpen, localDateKey } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { Modal } from '../ui/Shared.jsx'
import { AssetArt } from '../ui/AssetArt.jsx'
import { CharacterPose, ThemeScene } from '../ui/ThemeArt.jsx'

const clockFormatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

function TimePanel({ timestamp, evaluationTimestamp, dateKey, schedule, rewardOpen, previewStars, remaining, allResolved }) {
  const now = new Date(timestamp)
  const minute = now.getMinutes()
  const hourRotation = ((now.getHours() % 12) * 30) + (minute * 0.5)
  const minuteRotation = minute * 6
  const currentTime = clockFormatter.format(now)
  const lateMinutes = getLateMinutes(dateKey, schedule.bedTime, evaluationTimestamp)
  const planCopy = rewardOpen
    ? `计划 ${schedule.bedTime} 完成 · 还有 ${previewStars} 分钟`
    : `计划 ${schedule.bedTime} 完成 · 已晚 ${lateMinutes} 分钟`
  const rewardCopy = rewardOpen
    ? `${allResolved ? '已锁定' : '现在完成可得'} ${previewStars} 点星光`
    : allResolved ? '今晚已完成，准备好就去休息' : `完成最后 ${remaining} 项，今晚不会扣分`

  return (
    <section className={`time-panel ${rewardOpen ? 'time-panel--reward' : 'time-panel--settle'}`} aria-label={`现在 ${currentTime}。${planCopy}。${rewardCopy}。`}>
      <div className="time-clock" aria-hidden="true" style={{ '--clock-hour': `${hourRotation}deg`, '--clock-minute': `${minuteRotation}deg` }}>
        <span className="time-clock__number time-clock__number--12">12</span>
        <span className="time-clock__number time-clock__number--3">3</span>
        <span className="time-clock__number time-clock__number--6">6</span>
        <span className="time-clock__number time-clock__number--9">9</span>
        <i className="time-clock__hand time-clock__hand--hour"></i>
        <i className="time-clock__hand time-clock__hand--minute"></i>
        <i className="time-clock__pin"></i>
      </div>
      <div className="time-panel__copy">
        <time className="time-panel__digital" dateTime={now.toISOString()}>{currentTime}</time>
        <p>{planCopy}</p>
        <strong><Icon name={rewardOpen ? 'star' : 'moon'} size={19} />{rewardCopy}</strong>
      </div>
      <div className="time-panel__sparkles" aria-hidden="true"><i></i><i></i></div>
    </section>
  )
}

export function TonightPage() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const location = useLocation()
  const [toast, setToast] = useState('')
  const [skipStep, setSkipStep] = useState(null)
  const [skipPickerOpen, setSkipPickerOpen] = useState(false)
  const [readyOpen, setReadyOpen] = useState(false)
  const [earlyConfirmation, setEarlyConfirmation] = useState(null)
  const [rewardClock, setRewardClock] = useState(() => Date.now())
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const dateKey = localDateKey()
  const tonightDate = new Date(`${dateKey}T12:00:00`)
  const tonightDayType = dayTypeFor(tonightDate)
  const schedule = getSchedule(state, tonightDayType, dateKey)
  const routine = getRoutine(state, tonightDayType)
  const session = getSession(state, dateKey)
  const steps = routine.steps.filter((step) => step.enabled)
  const statuses = session?.stepStatus || Object.fromEntries(steps.map((step) => [step.id, 'todo']))
  const resolved = steps.filter((step) => statuses[step.id] && statuses[step.id] !== 'todo').length
  const allResolved = steps.length > 0 && resolved === steps.length
  const open = isRoutineOpen(schedule) || Boolean(session)
  const taskColumns = steps.length === 1 ? 1 : steps.length <= 6 ? 2 : steps.length <= 9 ? 3 : 4
  const taskRows = Math.max(1, Math.ceil(steps.length / taskColumns))
  const incompleteSteps = steps.filter((step) => (statuses[step.id] || 'todo') === 'todo')
  const targetAt = session?.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  const targetDate = new Date(targetAt)
  const targetTime = Number.isFinite(targetAt) ? `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}` : schedule.bedTime
  const rewardTimestamp = session?.routineCompletedAt || rewardClock
  const rewardOpen = Number.isFinite(targetAt) && rewardTimestamp < targetAt
  const previewStars = getEarlyMinutes(dateKey, targetTime, rewardTimestamp)
  const displaySchedule = { ...schedule, bedTime: targetTime }

  useEffect(() => {
    let timer
    const tick = () => {
      setRewardClock(Date.now())
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50)
    }
    timer = window.setTimeout(tick, 60000 - (Date.now() % 60000) + 50)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if ((!session?.rewarded && session?.status !== 'goodnight') || !location.pathname.endsWith('/tonight')) return undefined
    const timer = window.setTimeout(() => {
      if (window.location.pathname.endsWith('/tonight')) navigate('/goodnight', { replace: true })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [location.pathname, navigate, session?.rewarded, session?.status])

  const remaining = steps.length - resolved
  const headline = allResolved ? '今晚的小步骤都完成啦' : `今晚还有 ${remaining} 件事`
  const gardenStage = allResolved ? 3 : Math.min(3, Math.ceil(resolved / Math.max(1, steps.length) * 3))
  const gardenHint = ['今晚的小花盆在等你', '种子已经醒来啦', '小芽正在长大', '花苞准备好啦'][gardenStage]
  const completionMessage = rewardOpen
    ? `${profile.name}，完成任务时已经锁定 ${previewStars} 点星光。准备好就去休息吧。`
    : `${profile.name}，星光时间结束了，今晚不会扣分。完成本身也值得纪念。`

  const speak = (text) => {
    if (!accessibility.readTasks || !globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return
    globalThis.speechSynthesis.cancel()
    globalThis.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
  }

  const complete = (step) => {
    if (statuses[step.id] !== 'todo') return
    dispatch({ type: 'COMPLETE_TASK', stepId: step.id, celebrate: remaining === 1 })
    const message = `${step.title}完成，还剩 ${Math.max(0, remaining - 1)} 项`
    setToast(message)
    speak(message)
  }

  const restore = (step, status) => {
    dispatch({ type: 'RESET_TASK', stepId: step.id })
    const message = status === 'done' ? `${step.title}已改回待完成` : `${step.title}重新加入今晚任务`
    setToast(message)
    speak(message)
  }

  const skip = () => {
    if (!skipStep) return
    dispatch({ type: 'SKIP_TASK', stepId: skipStep.id })
    setToast(`${skipStep.title}今晚先跳过，明天可以再试试。`)
    setSkipStep(null)
  }

  const finishBed = (timestamp) => {
    dispatch({ type: 'CONFIRM_BED', timestamp })
    navigate('/watering')
  }

  const confirmBed = (event) => {
    const timestamp = Math.round(performance.timeOrigin + event.timeStamp)
    const earlyMinutes = getEarlyMinutes(dateKey, targetTime, session?.routineCompletedAt || timestamp)
    if (earlyMinutes > EARLY_TIME_CONFIRM_MINUTES) {
      setReadyOpen(false)
      setEarlyConfirmation({ timestamp, earlyMinutes, actualTime: new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) })
      return
    }
    finishBed(timestamp)
  }

  if (!open) {
    return (
      <section className="early-state">
        <ThemeScene theme={profile.theme} character={profile.character} pose="wave" label={`${profile.name}的陪伴角色向你挥手`} className="early-state__scene" />
        <div className="early-state__card">
          <span className="eyebrow">晚上再见</span>
          <h1>还没到晚安时间，<br />晚上我们再见。</h1>
          <p>今天 <strong>{schedule.prepareTime}</strong> 开始准备</p>
          <button className="button button--primary" type="button" onClick={() => navigate('/garden')}>先去看看星星花园</button>
        </div>
      </section>
    )
  }

  return (
    <section className="tonight-layout">
      <div className="tonight-summary">
        <TimePanel timestamp={rewardClock} evaluationTimestamp={rewardTimestamp} dateKey={dateKey} schedule={displaySchedule} rewardOpen={rewardOpen} previewStars={previewStars} remaining={remaining} allResolved={allResolved} />
        <article className={`tonight-story-card ${steps.length > 6 ? 'tonight-story-card--dense' : ''}`}>
          <div className="tonight-story-card__copy">
            <span className="eyebrow">{profile.companionMode === 'together' ? '今晚和家长一起' : '今晚试着自己来'}</span>
            <h1>{headline}</h1>
            <p><Icon name="check" size={18} /> {resolved} / {steps.length} 已完成</p>
          </div>
          <span className="tonight-story-card__mobile-progress">今晚 {steps.length} 项 · {resolved} / {steps.length} 已完成</span>
          <ThemeScene theme={profile.theme} character={profile.character} pose="waiting" label={`${profile.name}的陪伴角色安静地等你`} className="tonight-story-scene" />
          <div className="night-window" aria-hidden="true"><i></i><i></i><i></i></div>
          <button className={`garden-shortcut garden-shortcut--stage-${gardenStage}`} type="button" onClick={() => navigate('/garden')} aria-label={`看看星星花园，${gardenHint}`}>
            <span className="garden-shortcut__plant" aria-hidden="true"></span>
            <span><strong>看看星星花园</strong><small>{gardenHint}</small></span>
            <Icon name="chevron" size={17} />
          </button>
        </article>
      </div>
      <div className="tonight-tasks">
        <div className="task-group-bar">
          <div><span>今晚任务</span><strong>全部 {steps.length} 项，一眼看完</strong></div>
          <div className="task-group-actions">
            {incompleteSteps.length ? <button className="task-adjust-trigger" type="button" onClick={() => setSkipPickerOpen(true)}><Icon name="menu" size={17} />调整今晚任务</button> : null}
          </div>
        </div>
        <div
          className={`task-grid task-grid--count-${steps.length} ${steps.length > 6 ? 'task-grid--dense' : ''} ${steps.length > 12 ? 'task-grid--compact' : ''}`}
          style={{ '--task-columns': taskColumns, '--task-rows': taskRows }}
          aria-label={`今晚全部 ${steps.length} 项任务`}
        >
          {steps.map((step) => {
            const status = statuses[step.id] || 'todo'
            return (
              <article key={step.id} className={`task-card task-card--${status}`}>
                <button
                  type="button"
                  className="task-card__main"
                  aria-label={status === 'done' ? `${step.title}，已完成，点按改回待完成` : status === 'skipped' ? `${step.title}，今晚已跳过，点按重新加入` : undefined}
                  onClick={() => status === 'todo' ? complete(step) : restore(step, status)}
                >
                  <AssetArt id={step.icon} label={step.title} className="task-card__icon" />
                  <span><strong>{step.title}</strong><small>{status === 'done' ? '完成啦 · 再点可修改' : status === 'skipped' ? '今晚已跳过 · 点按恢复' : `大约 ${step.duration} 分钟`}</small></span>
                  <span className="task-check" aria-hidden="true">{status === 'todo' ? '' : <Icon name="check" />}</span>
                </button>
              </article>
            )
          })}
        </div>
        <button className="button button--primary button--wide tonight-action" disabled={!allResolved} type="button" onClick={() => setReadyOpen(true)}>
          <Icon name="moon" />{allResolved ? '我准备上床啦' : '先完成今晚的小任务'}
        </button>
      </div>
      <div className="sr-live" aria-live="polite">{toast}</div>
      {toast ? <div className="toast toast--star"><Icon name="check" />{toast}</div> : null}
      {skipPickerOpen ? (
        <Modal title="调整今晚任务" onClose={() => setSkipPickerOpen(false)} className="task-adjust-modal">
          <AssetArt id="pillow" label="月亮枕" className="modal-illustration" />
          <h2>哪一项今晚有困难？</h2>
          <p>选中后还会再确认一次。跳过的任务明晚会重新出现。</p>
          <div className="task-adjust-list">
            {incompleteSteps.map((step) => <button type="button" key={step.id} onClick={() => { setSkipPickerOpen(false); setSkipStep(step) }}><AssetArt id={step.icon} label={step.title} /><strong>{step.title}</strong><Icon name="chevron" /></button>)}
          </div>
          <button className="button button--secondary button--wide" type="button" onClick={() => setSkipPickerOpen(false)}>先不调整</button>
        </Modal>
      ) : null}
      {skipStep ? (
        <Modal title="跳过任务" onClose={() => setSkipStep(null)} className="decision-modal">
          <AssetArt id={skipStep.icon} label={skipStep.title} className="modal-illustration" />
          <h2>今晚要先跳过吗？</h2>
          <p>今晚先跳过，明天可以再试试。</p>
          <button className="button button--primary button--wide" type="button" onClick={skip}>今晚跳过</button>
          <button className="button button--secondary button--wide" type="button" onClick={() => setSkipStep(null)}>继续完成</button>
        </Modal>
      ) : null}
      {readyOpen ? (
        <Modal title="上床确认" onClose={() => setReadyOpen(false)} className="ready-modal">
          <CharacterPose character={profile.character} pose="waiting" label={`${profile.name}的陪伴角色抱着晚安枕头`} className="ready-modal__companion" />
          <h2>枕头和被子都准备好了吗？</h2>
          <p>{completionMessage}</p>
          <button autoFocus className="button button--primary button--wide" type="button" onClick={confirmBed}><Icon name="moon" />准备好了</button>
          <button className="button button--secondary button--wide" type="button" onClick={() => setReadyOpen(false)}>我再等一会儿</button>
        </Modal>
      ) : null}
      {earlyConfirmation ? (
        <Modal title="确认上床时间" onClose={() => setEarlyConfirmation(null)} className="time-check-modal">
          <AssetArt id="lamp" decorative className="modal-illustration" />
          <h2>现在比计划时间早很多</h2>
          <p>现在是 <strong>{earlyConfirmation.actualTime}</strong>，计划完成任务是 <strong>{targetTime}</strong>，已锁定 <strong>{earlyConfirmation.earlyMinutes} 点星光</strong>。请家长确认时间没有记错。</p>
          <button className="button button--primary button--wide" type="button" onClick={() => finishBed(earlyConfirmation.timestamp)}><Icon name="check" />确认时间，继续结算</button>
          <button className="button button--secondary button--wide" type="button" onClick={() => setEarlyConfirmation(null)}>返回检查</button>
        </Modal>
      ) : null}
    </section>
  )
}
