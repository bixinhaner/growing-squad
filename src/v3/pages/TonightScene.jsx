import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dayTypeFor, getAccessibility, getActiveProfile, getRoutine, getSchedule, getSession, localDateKey } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Modal } from '../../ui/Shared.jsx'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'
import { SkyArc } from '../components/SkyArc.jsx'
import { speak } from '../speech.js'
import { useNow, useReducedMotion } from '../hooks.js'

const clock = (at) => new Date(at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

function flyLight(fromElement, targetId) {
  const target = document.getElementById(targetId)
  if (!fromElement || !target) return
  const from = fromElement.getBoundingClientRect()
  const to = target.getBoundingClientRect()
  const spark = document.createElement('span')
  spark.className = 'v3-flying-light'
  spark.setAttribute('aria-hidden', 'true')
  spark.style.left = `${from.left + from.width / 2}px`
  spark.style.top = `${from.top + from.height / 2}px`
  document.body.appendChild(spark)
  const dx = to.left + to.width / 2 - (from.left + from.width / 2)
  const dy = to.top + to.height / 2 - (from.top + from.height / 2)
  const animation = spark.animate([
    { transform: 'translate(-50%, -50%) scale(.4)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.2 - 90}px)) scale(1.3)`, opacity: 1, offset: 0.35 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 1 },
  ], { duration: 820, easing: 'cubic-bezier(.5,0,.3,1)' })
  animation.onfinish = () => { spark.remove(); target.classList.remove('is-arriving'); void target.offsetWidth; target.classList.add('is-arriving') }
}

export function TonightScene() {
  const { state } = useBedtimeState()
  return <TonightContent key={state.activeProfileId} />
}

function TonightContent() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const now = useNow()
  const reducedMotion = useReducedMotion()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const [manageOpen, setManageOpen] = useState(false)
  const [cheerKey, setCheerKey] = useState(0)
  const cheerTimer = useRef(0)
  const date = new Date(now)
  const dateKey = localDateKey(date)
  const schedule = getSchedule(state, dayTypeFor(date), dateKey)
  const routine = getRoutine(state, dayTypeFor(date))
  const session = getSession(state, dateKey)
  const steps = routine.steps.filter((step) => step.enabled)
  const statuses = session?.stepStatus || {}
  const statusOf = (step) => statuses[step.id] || 'todo'
  const done = steps.filter((step) => statusOf(step) === 'done').length
  const skipped = steps.filter((step) => statusOf(step) === 'skipped').length
  const remaining = steps.length - done - skipped
  const next = steps.find((step) => statusOf(step) === 'todo')
  const targetAt = session?.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  let startAt = new Date(`${dateKey}T${schedule.prepareTime}:00`).getTime()
  if (!(startAt < targetAt)) startAt = targetAt - 60 * 60000
  const progress = (now - startAt) / (targetAt - startAt)
  const minutesLeft = Math.max(0, Math.ceil((targetAt - now) / 60000))
  const allDone = steps.length > 0 && remaining === 0
  const settled = session?.status === 'goodnight'
  const mood = settled ? 'sleepy' : allDone ? 'cheer' : cheerKey && !reducedMotion ? 'cheer' : now >= targetAt ? 'calm' : 'hello'
  const bubble = settled ? '今晚完成啦。晚安，明天见！' : allDone ? '全部完成啦！我们去给小花浇水吧。' : next ? (now >= targetAt ? `慢慢完成也没关系。下一件：${next.title}` : `下一件：${next.title}`) : '今晚没有安排，安心休息吧。'
  const timeStory = now < startAt ? '月亮还在小灯旁边，准备时间还没到。'
    : now < targetAt ? `月亮正走向小枕头，离计划完成还有 ${minutesLeft} 分钟。`
      : '月亮已经到小枕头了，慢慢完成也没关系。'

  useEffect(() => () => window.clearTimeout(cheerTimer.current), [])

  const toggle = (step, event) => {
    if (settled) return
    const status = statusOf(step)
    const completing = status !== 'done'
    dispatch({ type: completing ? 'COMPLETE_TASK' : 'RESET_TASK', stepId: step.id })
    if (!completing) return
    if (!reducedMotion) flyLight(event.currentTarget, `v3-sky-star-${step.id}`)
    setCheerKey((key) => key + 1)
    window.clearTimeout(cheerTimer.current)
    cheerTimer.current = window.setTimeout(() => setCheerKey(0), 1600)
    if (accessibility.readTasks) {
      const following = steps.find((item) => item.id !== step.id && statusOf(item) === 'todo')
      speak(following ? `真棒！下一件，${following.title}` : '全部完成啦！', { muted: accessibility.soundOff })
    }
  }
  const finish = () => {
    if (settled) { navigate('/garden'); return }
    if (remaining) return
    dispatch({ type: 'CONFIRM_BED', timestamp: Date.now() })
    navigate('/watering')
  }

  return (
    <section className="v3-tonight" data-density={steps.length > 12 ? 'dense' : 'normal'} aria-labelledby="tonight-heading">
      <div className="v3-scene-backdrop" aria-hidden="true">
        <img src={appPath('assets/v3/night-room-backdrop.webp')} alt="" onError={(event) => { event.currentTarget.src = appPath('assets/themes/moon-room-world-v1.webp') }} />
      </div>
      <div className="v3-tonight__sky">
        <SkyArc
          progress={progress}
          startLabel={schedule.prepareTime}
          endLabel={clock(targetAt)}
          description={timeStory}
          sleepy={now >= targetAt}
          stars={steps.map((step) => ({ id: step.id, lit: statusOf(step) === 'done', rest: statusOf(step) === 'skipped' }))}
        />
      </div>

      <aside className="v3-tonight__buddy">
        <button type="button" className="v3-bubble" onClick={() => speak(bubble, { muted: accessibility.soundOff })} aria-label={`听一听：${bubble}`}>
          <span>{bubble}</span>
          <Icon name="volume" size={20} />
        </button>
        <Companion character={profile.character} mood={mood} bounceKey={cheerKey} label={`${profile.name}的伙伴陪着你`} />
      </aside>

      <article className="v3-board" data-count={steps.length} data-density={steps.length > 12 ? 'dense' : steps.length > 8 ? 'compact' : 'roomy'}>
        <header className="v3-board__head">
          <h1 id="tonight-heading" className="v3-display">今晚的 <span className="v3-num">{steps.length}</span> 件小事</h1>
          <p className="v3-board__progress" role="status" aria-live="polite" aria-atomic="true">
            <span className="v3-dots" aria-hidden="true">{steps.map((step) => <i key={step.id} className={statusOf(step)} />)}</span>
            <span className="v3-sr-only">已完成 <strong>{done} / {steps.length}</strong>{skipped ? `，${skipped} 项已跳过` : ''}</span>
          </p>
          <button type="button" className="v3-board__adjust" onClick={() => setManageOpen(true)}><Icon name="menu" size={18} />调整今晚任务</button>
        </header>
        <div className="v3-board__grid" role="group" aria-label="今晚任务清单">
          {steps.map((step, index) => {
            const status = statusOf(step)
            const hint = status === 'done' ? '，已完成，再点可撤销' : status === 'skipped' ? '，今晚已跳过，点按标记完成' : ''
            return (
              <button
                type="button"
                key={step.id}
                className={`v3-patch is-${status}${next?.id === step.id ? ' is-next' : ''}`}
                style={{ '--i': index, '--tilt': `${(((index * 37) % 5) - 2) * 0.6}deg` }}
                onClick={(event) => toggle(step, event)}
                aria-pressed={status === 'done'}
                aria-label={`${step.title}${hint}`}
              >
                <span className="v3-patch__art"><AssetArt id={step.icon} decorative /></span>
                <strong>{step.title}</strong>
                {status === 'skipped' ? <small>今晚休息</small> : null}
                <span className="v3-patch__seal" aria-hidden="true">{status === 'done' ? <Icon name="check" size={22} /> : null}</span>
              </button>
            )
          })}
          {!steps.length ? <p className="v3-board__empty">今晚没有安排任务，安心休息吧。</p> : null}
        </div>
        <footer className="v3-board__foot">
          <button className={`v3-button v3-finish ${allDone ? 'is-ready' : ''}`} type="button" disabled={!allDone} onClick={finish}>
            {settled ? <><Icon name="moon" /><span>今晚完成啦，去看看月光花园</span></>
              : allDone ? <><Icon name="star" /><span>完成今晚任务，去月光花园</span></>
              : <><Icon name="moon" /><span>再完成 <b className="v3-num">{remaining}</b> 项，就去月光花园</span></>}
          </button>
        </footer>
      </article>

      {manageOpen ? (
        <Modal title="调整今晚任务" onClose={() => setManageOpen(false)} className="gs-manage-tonight v3-modal">
          <h2 className="v3-display">今晚临时调整</h2>
          <p>跳过只影响今晚，不会改变以后的计划。</p>
          <div className="v3-manage-list">
            {steps.map((step) => (
              <button key={step.id} type="button" className={statusOf(step) === 'skipped' ? 'is-skipped' : ''} onClick={() => dispatch({ type: statusOf(step) === 'skipped' ? 'RESET_TASK' : 'SKIP_TASK', stepId: step.id })}>
                <AssetArt id={step.icon} decorative />
                <span><strong>{step.title}</strong><small>{statusOf(step) === 'skipped' ? '已跳过，点按恢复' : '今晚先跳过'}</small></span>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </section>
  )
}
