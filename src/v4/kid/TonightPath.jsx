import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dayTypeFor, getAccessibility, getActiveProfile, getRoutine, getSchedule, getSession, localDateKey } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { AssetArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Speak, Tap } from '../ui/kit.jsx'
import { useToast } from '../ui/toast.js'
import { clockLabel, useNow, useReducedMotion, useSpeaker } from '../lib/hooks.js'

/** A little star arcs from the button to the stone it lights up. */
function flyStar(from, targetId) {
  const target = document.getElementById(targetId)
  if (!from || !target) return
  const a = from.getBoundingClientRect()
  const b = target.getBoundingClientRect()
  const star = document.createElement('span')
  star.className = 'k-flying-star'
  star.setAttribute('aria-hidden', 'true')
  star.style.left = `${a.left + a.width / 2}px`
  star.style.top = `${a.top + a.height / 2}px`
  document.body.appendChild(star)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const flight = star.animate([
    { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.4}px), calc(-50% + ${dy * 0.4 - 80}px)) scale(1.4)`, opacity: 1, offset: 0.4 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: 1 },
  ], { duration: 700, easing: 'cubic-bezier(.5,0,.3,1)' })
  flight.onfinish = () => star.remove()
}

export function TonightPath({ home = false }) {
  const { state } = useBedtimeState()
  return <PathFor key={state.activeProfileId} home={home} />
}

function PathFor({ home }) {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const toast = useToast()
  const say = useSpeaker()
  const now = useNow()
  const reducedMotion = useReducedMotion()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const date = new Date(now)
  const dateKey = localDateKey(date)
  const schedule = getSchedule(state, dayTypeFor(date), dateKey)
  const steps = getRoutine(state, dayTypeFor(date)).steps.filter((step) => step.enabled)
  const session = getSession(state, dateKey)
  const statusOf = (step) => session?.stepStatus?.[step.id] || 'todo'
  const todo = steps.filter((step) => statusOf(step) === 'todo')
  const done = steps.filter((step) => statusOf(step) === 'done').length
  const settled = session?.status === 'goodnight'
  const finished = steps.length > 0 && todo.length === 0
  const [pickedId, setPickedId] = useState(null)
  const [cheer, setCheer] = useState(0)
  const advance = useRef(0)
  const pathRef = useRef(null)
  const picked = steps.find((step) => step.id === pickedId) || todo[0] || steps[0]
  const targetAt = session?.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  const minutesLeft = Math.ceil((targetAt - now) / 60000)

  useEffect(() => () => window.clearTimeout(advance.current), [])
  // Keep the chosen stone in view on narrow screens.
  useEffect(() => {
    const stone = pathRef.current?.querySelector('[aria-current="step"]')
    stone?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [picked?.id, reducedMotion])

  const complete = (step, event) => {
    dispatch({ type: 'COMPLETE_TASK', stepId: step.id })
    if (!reducedMotion) flyStar(event.currentTarget, `k-stone-${step.id}`)
    setCheer((value) => value + 1)
    const following = steps.find((item) => item.id !== step.id && statusOf(item) === 'todo')
    toast(`${step.title}，做好啦！`, { key: 'step', action: { label: '撤销', onClick: () => { dispatch({ type: 'RESET_TASK', stepId: step.id }); setPickedId(step.id) } } })
    if (accessibility.readTasks) say(following ? `真棒！下一件，${following.title}` : '全部做好啦！')
    window.clearTimeout(advance.current)
    advance.current = window.setTimeout(() => setPickedId(following?.id || null), reducedMotion ? 0 : 450)
  }
  const skip = (step) => {
    dispatch({ type: 'SKIP_TASK', stepId: step.id })
    const following = steps.find((item) => item.id !== step.id && statusOf(item) === 'todo')
    setPickedId(following?.id || null)
    toast(`${step.title}，今晚先不做。`, { key: 'step', action: { label: '撤销', onClick: () => { dispatch({ type: 'RESET_TASK', stepId: step.id }); setPickedId(step.id) } } })
  }
  const water = () => {
    dispatch({ type: 'CONFIRM_BED', timestamp: Date.now() })
    navigate('/watering')
  }

  const timeLine = settled ? '今晚完成啦'
    : minutesLeft > 0 ? <>计划 <b className="u-num">{clockLabel(targetAt)}</b> 前走完 · 还有 <b className="u-num">{minutesLeft}</b> 分钟</>
      : '过了计划时间也没关系，慢慢走完'
  const bubble = settled ? '今晚完成啦，晚安！' : finished ? '小路走完啦！我们去给小花浇水吧。' : picked ? `现在做：${picked.title}` : '今晚没有安排，安心休息吧。'

  return (
    <section className="k-path" aria-labelledby="k-path-title" data-home={home || undefined}>
      <header className="k-path__head">
        <div>
          <h1 id="k-path-title" className="u-display">今晚的小路</h1>
          <p className="k-path__time"><Icon name="moon" size={18} />{timeLine}</p>
        </div>
        <p className="k-path__count" role="status" aria-live="polite">
          <b className="u-num">{done}</b><span>/</span><span className="u-num">{steps.length}</span>
          <span className="u-sr">件已经做好</span>
        </p>
      </header>

      <ol className="k-stones" ref={pathRef} aria-label="今晚要做的事">
        {steps.map((step, index) => {
          const status = statusOf(step)
          const current = !finished && !settled && picked?.id === step.id
          return (
            <li key={step.id} style={{ '--i': index }}>
              <button
                type="button"
                id={`k-stone-${step.id}`}
                className={`k-stone is-${status}`}
                aria-current={current ? 'step' : undefined}
                aria-label={`${step.title}：${status === 'done' ? '做好了' : status === 'skipped' ? '今晚不做' : '还没做'}`}
                onClick={() => { window.clearTimeout(advance.current); setPickedId(step.id) }}
                disabled={settled}
              >
                <AssetArt id={step.icon} decorative />
                {status === 'done' ? <span className="k-stone__seal"><Icon name="check" size={16} strokeWidth={3} /></span> : null}
              </button>
            </li>
          )
        })}
      </ol>

      <div className="k-path__stage">
        <div className="k-path__buddy">
          <p className="k-bubble"><span>{bubble}</span><Speak text={bubble} /></p>
          <Buddy character={profile.character} mood={settled ? 'sleepy' : finished ? 'cheer' : cheer ? 'cheer' : 'hello'} bounce={cheer} />
        </div>

        {settled ? (
          <article className="k-step k-step--end">
            <span className="k-step__art is-small"><AssetArt id="pillow" decorative /></span>
            <h2 className="u-display">今晚完成啦</h2>
            <p>月亮花已经开好了。放下屏幕，安心休息。</p>
            <div className="k-step__actions">
              <Tap tone="night" size="l" icon="moon" onClick={() => navigate('/goodnight')}>去说晚安</Tap>
              <Tap tone="soft" size="l" onClick={() => navigate('/box?tab=garden')}>看看月亮花</Tap>
            </div>
          </article>
        ) : finished ? (
          <article className="k-step k-step--end">
            <span className="k-step__art is-small"><AssetArt id="pillow" decorative /></span>
            <h2 className="u-display">小路走完啦！</h2>
            <p>{done ? `今晚做好了 ${done} 件事。` : ''}最后一步，去给你的小花浇水。</p>
            <Tap tone="primary" size="xl" icon="leaf" onClick={water}>去给小花浇水</Tap>
          </article>
        ) : picked ? (
          <StepCard
            key={picked.id}
            step={picked}
            status={statusOf(picked)}
            nextTodo={todo.find((item) => item.id !== picked.id)}
            onDone={(event) => complete(picked, event)}
            onSkip={() => skip(picked)}
            onReset={() => dispatch({ type: 'RESET_TASK', stepId: picked.id })}
            onNext={(id) => setPickedId(id)}
          />
        ) : (
          <article className="k-step k-step--end">
            <h2 className="u-display">今晚没有安排</h2>
            <p>安心休息吧。家长可以在家长区添加睡前小事。</p>
          </article>
        )}
      </div>
    </section>
  )
}

function StepCard({ step, status, nextTodo, onDone, onSkip, onReset, onNext }) {
  return (
    <article className={`k-step is-${status}`} aria-labelledby="k-step-title">
      <span className="k-step__art"><AssetArt id={step.icon} decorative /></span>
      <div className="k-step__name">
        <h2 id="k-step-title" className="u-display">{step.title}</h2>
        <Speak text={step.title} />
      </div>
      {status === 'todo' ? (
        <>
          <Tap tone="primary" size="xl" icon="check" className="k-step__done" onClick={onDone}>做好了</Tap>
          <Tap tone="quiet" size="s" onClick={onSkip}>今晚不做这件</Tap>
        </>
      ) : status === 'done' ? (
        <>
          <p className="k-step__stamp"><Icon name="check" size={20} strokeWidth={3} />已经做好了</p>
          <div className="k-step__actions">
            {nextTodo ? <Tap tone="primary" size="l" icon="chevron" onClick={() => onNext(nextTodo.id)}>下一件：{nextTodo.title}</Tap> : null}
            <Tap tone="soft" size="l" icon="undo" onClick={onReset}>其实还没做好</Tap>
          </div>
        </>
      ) : (
        <>
          <p className="k-step__stamp is-rest">今晚先不做这件</p>
          <div className="k-step__actions">
            <Tap tone="primary" size="l" onClick={onReset}>我还是要做</Tap>
            {nextTodo ? <Tap tone="soft" size="l" onClick={() => onNext(nextTodo.id)}>看下一件</Tap> : null}
          </div>
        </>
      )}
    </article>
  )
}
