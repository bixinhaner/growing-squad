import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getCompletionOutcome, getSession, localDateKey } from '../../domain/model.js'
import { getWateringExperience } from '../../domain/wateringExperience.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { playSound } from '../../audio/soundscape.js'
import { BEDTIME_TRACKS } from '../../audio/bgm.js'
import { createBedtimePlayer } from '../../audio/bedtimePlayer.js'
import { Icon } from '../ui/Icon.jsx'
import { Buddy, Speak, Tap } from '../ui/kit.jsx'
import { useReducedMotion } from '../lib/hooks.js'
import '../theme.css'
import './ritual.css'

const POURS = 3
const REWARD_LINE = {
  early: (session) => `提前 ${session.earlyMinutes} 分钟完成，收下 ${session.starsAwarded || session.earlyMinutes} 点星光`,
  'on-time': () => '按时完成，花园结出一颗星光果实',
  'after-target': () => '今晚也完成了，小花照常盛开',
  completed: () => '今晚也完成了，小花照常盛开',
}

/**
 * The child waters the moon flower themselves: three pours, the flower grows a
 * stage each time and blooms on the last. Nothing happens on its own until they
 * pour, so the ending feels earned rather than watched.
 */
export function Watering() {
  const { state } = useBedtimeState()
  const session = getSession(state, localDateKey())
  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />
  return <WateringFor key={session.id} session={session} />
}

function WateringFor({ session }) {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const reducedMotion = useReducedMotion()
  const outcome = getCompletionOutcome(session)
  const experience = useMemo(() => getWateringExperience(outcome, reducedMotion), [outcome, reducedMotion])
  const [pours, setPours] = useState(0)
  const [pouring, setPouring] = useState(false)
  const timers = useRef([])
  const muted = accessibility.soundOff
  const bloomed = pours >= POURS
  const stage = Math.min(4, 1 + pours)
  const stars = session.starsAwarded || session.earlyMinutes || 0
  const bloomText = experience.phases.find((phase) => phase.key === 'bloom')?.text || '月光花盛开了'
  const closing = experience.phases.at(-1)?.text || '晚安'
  const line = !pours ? `${profile.name}，按住水壶旁边的按钮，给小花浇水吧` : bloomed ? bloomText : pours === 1 ? '小花喝到水啦，再浇一次' : '快开花了，最后一次！'

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), [])
  useEffect(() => {
    if (!bloomed) return
    const later = (fn, ms) => timers.current.push(window.setTimeout(fn, ms))
    later(() => playSound('bloom', { muted }), reducedMotion ? 0 : 500)
    later(() => playSound(outcome === 'early' ? 'starlight' : outcome === 'on-time' ? 'reward' : 'keepsake', { muted }), reducedMotion ? 400 : 1700)
    // A sleepy child may just put the tablet down; drift on to goodnight by itself.
    later(() => navigate('/goodnight', { replace: true }), 16000)
  }, [bloomed, muted, navigate, outcome, reducedMotion])

  const pour = () => {
    if (pouring || bloomed) return
    playSound('watering', { muted })
    setPouring(true)
    timers.current.push(window.setTimeout(() => { setPours((value) => value + 1); setPouring(false) }, reducedMotion ? 60 : 1100))
  }

  return (
    <main className={`r-app r-water is-${outcome}${bloomed ? ' is-bloomed' : ''}${pouring ? ' is-pouring' : ''}`} style={{ '--bg': `url("${appPath('assets/v3/night-garden-backdrop.webp')}")` }} aria-labelledby="r-water-title">
      <div className="r-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>

      <header className="r-water__copy">
        <h1 id="r-water-title" className="u-display">给小花浇水</h1>
        <p className="r-water__line" aria-live="polite"><span key={line}>{line}</span><Speak text={line} /></p>
      </header>

      <div className="r-garden" aria-hidden="true">
        <span className="r-garden__buddy"><Buddy character={profile.character} mood={bloomed ? 'cheer' : 'water'} bounce={pours} /></span>
        <div className="r-pot">
          <span className="r-rain">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--d': index }} />)}</span>
          {[1, 2, 3, 4].map((n) => <img key={n} className={n === stage ? 'is-on' : ''} src={appPath(`assets/v3/moonflower-${n}.webp`)} alt="" />)}
          <span className="r-pot__glow" />
          {bloomed && experience.starCount ? <span className="r-fruit">{Array.from({ length: outcome === 'early' ? 6 : 1 }, (_, index) => <i key={index} style={{ '--k': index }} />)}</span> : null}
        </div>
      </div>

      <footer className="r-water__act">
        {bloomed ? (
          <div className="r-reward">
            <p className="r-reward__line">
              {outcome === 'early' ? <img src={appPath('assets/v3/star-jar.webp')} alt="" /> : <Icon name={outcome === 'on-time' ? 'star' : 'moon'} size={26} />}
              <span>{REWARD_LINE[outcome]?.(session) || REWARD_LINE.completed()}</span>
              {outcome === 'early' ? <b className="u-num">+{stars}</b> : null}
            </p>
            <small>{closing}</small>
            <Tap tone="night" size="xl" icon="moon" autoFocus onClick={() => navigate('/goodnight', { replace: true })}>去睡觉</Tap>
          </div>
        ) : (
          <>
            <ol className="r-drops" aria-label={`已经浇了 ${pours} 次，一共 ${POURS} 次`}>
              {Array.from({ length: POURS }, (_, index) => <li key={index} className={index < pours ? 'is-full' : ''} />)}
            </ol>
            <button type="button" className="r-pour" onClick={pour} disabled={pouring} aria-label={`浇水（第 ${pours + 1} 次）`}>
              <Icon name="can" size={44} strokeWidth={2.2} />
              <span className="u-display">{pouring ? '哗啦啦…' : '浇水'}</span>
            </button>
            <Tap tone="ghost" size="s" onClick={() => navigate('/goodnight', { replace: true })}>今晚直接去睡觉</Tap>
          </>
        )}
      </footer>
    </main>
  )
}

export function Goodnight() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const session = getSession(state, localDateKey())
  const [dimmed, setDimmed] = useState(false)
  const [music, setMusic] = useState({ status: 'idle', track: null, error: '' })
  const [player] = useState(() => createBedtimePlayer(setMusic))
  const playing = music.status === 'playing'
  const active = playing || music.status === 'loading' || music.status === 'paused'

  useEffect(() => {
    const timer = window.setTimeout(() => setDimmed(true), 10000)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => () => player.dispose(), [player])
  useEffect(() => { if (session?.status === 'goodnight') playSound('goodnight', { muted: accessibility.soundOff }) }, [accessibility.soundOff, session?.id, session?.status])
  useEffect(() => { if (accessibility.soundOff) player.stop() }, [accessibility.soundOff, player])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />
  const outcome = getCompletionOutcome(session)
  const trackText = music.status === 'playing' ? `正在播放：${music.track.title}`
    : music.status === 'loading' ? `正在准备：${music.track.title}`
      : music.status === 'paused' ? `已暂停：${music.track.title}`
        : `从 ${BEDTIME_TRACKS.length} 首轻音乐里随机选一首，播放 5 分钟`

  return (
    <main className={`r-app r-night${dimmed ? ' is-dimmed' : ''}`} style={{ '--bg': `url("${appPath('assets/v3/night-room-backdrop.webp')}")` }} onPointerDown={() => setDimmed(false)} aria-labelledby="r-night-title">
      <div className="r-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
      <section className="r-night__card">
        <span className="r-moon" aria-hidden="true" />
        <h1 id="r-night-title" className="u-display">晚安，{profile.name}<span>明天见</span></h1>
        <p className="r-night__reward"><Icon name={outcome === 'early' || outcome === 'on-time' ? 'star' : 'moon'} size={20} />{REWARD_LINE[outcome]?.(session) || REWARD_LINE.completed()}</p>
        <span className="r-night__buddy"><Buddy character={profile.character} mood="sleepy" label={`${profile.name}的小伙伴已经睡着了`} /></span>

        {!accessibility.soundOff ? (
          <div className={`r-music is-${music.status}`}>
            <span className="r-music__eq" aria-hidden="true"><i /><i /><i /></span>
            <span className="r-music__text" role="status">{trackText}</span>
            <div className="r-music__buttons">
              {music.status === 'paused'
                ? <Tap tone="primary" icon="play" data-sound="none" onClick={() => player.resume()}>继续播放</Tap>
                : <Tap tone={active ? 'soft' : 'primary'} icon={active ? 'pause' : 'play'} data-sound="none" onClick={() => (active ? player.stop() : player.start({ retry: music.status === 'error' }))}>
                  {music.status === 'loading' ? '取消' : playing ? '停止轻音乐' : music.status === 'error' ? '重新播放' : '播放睡前轻音乐'}
                </Tap>}
              {music.status === 'paused' ? <Tap tone="ghost" data-sound="none" onClick={() => player.stop()}>停止</Tap> : null}
              {active || music.status === 'error' ? <Tap tone="ghost" icon="swap" data-sound="none" onClick={() => player.start()}>换一首</Tap> : null}
            </div>
            {music.error ? <small className="r-music__error" role="alert">{music.error}</small> : null}
          </div>
        ) : null}

        <p className="r-night__note">{active ? '音乐会自己停下。把平板放到一旁，闭上眼睛吧。' : '把平板交给家长，放到卧室外面吧。'}</p>
      </section>
      <button type="button" className="r-night__back" onClick={() => navigate('/today')}>回到首页</button>
    </main>
  )
}
