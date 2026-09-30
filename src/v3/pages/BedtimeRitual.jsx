import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getCompletionOutcome, getSession, localDateKey } from '../../domain/model.js'
import { useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { playSound } from '../../audio/soundscape.js'
import { BEDTIME_TRACKS } from '../../audio/bgm.js'
import { createBedtimePlayer } from '../../audio/bedtimePlayer.js'
import { getWateringExperience } from '../../domain/wateringExperience.js'
import { Icon } from '../../ui/Icons.jsx'
import { Companion } from '../components/Companion.jsx'
import '../tokens.css'
import '../ritual.css'

const EYEBROW = { early: '提前完成 · 星光庆祝', 'on-time': '按时完成 · 花园纪念' }
const flowerStage = (key) => key === 'arrive' ? 2 : key === 'water' ? 3 : 4

function useReducedMotion(accessibility) {
  return accessibility.reduceMotion || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
}

export function WateringRitual() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const session = getSession(state, localDateKey())
  const [leaving, setLeaving] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const reducedMotion = useReducedMotion(accessibility)
  const outcome = getCompletionOutcome(session)
  const experience = useMemo(() => getWateringExperience(outcome, reducedMotion), [outcome, reducedMotion])
  const sessionReady = session?.status === 'goodnight'
  const sessionId = session?.id

  useEffect(() => {
    if (!sessionReady) return undefined
    const muted = accessibility.soundOff
    playSound('watering', { muted })
    const timers = experience.phases.slice(1).map((phase, index) => window.setTimeout(() => setPhaseIndex(index + 1), phase.at))
    timers.push(window.setTimeout(() => playSound('bloom', { muted }), experience.bloomAt))
    if (outcome === 'early') {
      timers.push(window.setTimeout(() => playSound('starlight', { muted }), reducedMotion ? 2100 : 7000))
      timers.push(window.setTimeout(() => playSound('reward', { muted }), reducedMotion ? 3500 : 11600))
    } else if (outcome === 'on-time') {
      timers.push(window.setTimeout(() => playSound('reward', { muted }), reducedMotion ? 2200 : 6300))
    } else {
      timers.push(window.setTimeout(() => playSound('keepsake', { muted }), reducedMotion ? 2200 : 6500))
    }
    timers.push(window.setTimeout(() => setLeaving(true), Math.max(0, experience.duration - (reducedMotion ? 420 : 900))))
    timers.push(window.setTimeout(() => navigate('/goodnight', { replace: true }), experience.duration))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [accessibility.soundOff, experience.bloomAt, experience.duration, experience.phases, navigate, outcome, reducedMotion, sessionId, sessionReady])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />

  const phase = experience.phases[Math.min(phaseIndex, experience.phases.length - 1)]
  const stage = flowerStage(phase.key)
  const stars = session.starsAwarded || session.earlyMinutes
  const classes = ['v3-ritual', `is-${outcome}`, `is-phase-${phase.key}`, stage >= 4 ? 'is-bloomed' : '', leaving ? 'is-leaving' : '', accessibility.reduceMotion ? 'v3-reduce-motion' : '', accessibility.largeText ? 'v3-large-text' : ''].filter(Boolean).join(' ')

  return (
    <main className={classes} style={{ '--ritual-duration': `${experience.duration / 1000}s`, '--ritual-fade': reducedMotion ? '420ms' : '900ms', '--bg': `url("${appPath('assets/v3/night-garden-backdrop.webp')}")` }} aria-labelledby="watering-title">
      <div className="v3-ritual__sky" aria-hidden="true" />
      <header className="v3-ritual__copy" aria-live="polite">
        <span className="v3-ritual__eyebrow v3-display">{EYEBROW[outcome] || '今晚完成 · 温柔开花'}</span>
        <h1 id="watering-title" className="v3-display">给{profile.name}的小花浇水</h1>
        <p key={phase.key} className="v3-ritual__message v3-display">{phase.text}</p>
      </header>

      {outcome === 'early' ? (
        <div className="v3-ritual__reward" aria-label={`获得 ${stars} 点星光`}>
          <img src={appPath('assets/v3/star-jar.webp')} alt="" />
          <strong className="v3-num">+{stars}</strong><span>点星光</span>
        </div>
      ) : null}

      <div className="v3-ritual__stage" aria-hidden="true">
        <div className="v3-ritual__buddy"><Companion character={profile.character} mood="water" /></div>
        <div className="v3-ritual__pot">
          <div className="v3-ritual__rain">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--d': index }} />)}</div>
          {[2, 3, 4].map((n) => <img key={n} className={n === stage ? 'is-on' : ''} src={appPath(`assets/v3/moonflower-${n}.webp`)} alt="" />)}
          <span className="v3-ritual__glow" />
          {experience.starCount ? <div className="v3-ritual__fruit">{Array.from({ length: outcome === 'early' ? 6 : 1 }, (_, index) => <i key={index} style={{ '--k': index }} />)}</div> : null}
        </div>
      </div>

      <div className="v3-ritual__progress" aria-hidden="true"><i /></div>
      <p className="v3-sr-only" aria-live="polite">{phase.text}</p>
      <button className="v3-button v3-button--wool v3-ritual__skip" type="button" onClick={() => navigate('/goodnight', { replace: true })}>浇好啦，去睡觉</button>
    </main>
  )
}

export function GoodnightRoom() {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const session = getSession(state, localDateKey())
  const [dimmed, setDimmed] = useState(false)
  const [music, setMusic] = useState({ status: 'idle', track: null, error: '' })
  const [player] = useState(() => createBedtimePlayer(setMusic))
  const active = music.status === 'playing' || music.status === 'loading' || music.status === 'paused'

  useEffect(() => {
    const timer = window.setTimeout(() => setDimmed(true), 10000)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => () => player.dispose(), [player])
  useEffect(() => { if (session?.status === 'goodnight') playSound('goodnight', { muted: accessibility.soundOff }) }, [accessibility.soundOff, session?.id, session?.status])
  useEffect(() => { if (accessibility.soundOff) player.stop() }, [accessibility.soundOff, player])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />
  const outcome = getCompletionOutcome(session)
  const statusText = music.status === 'playing' ? `正在播放：${music.track.title}`
    : music.status === 'loading' ? `正在准备：${music.track.title}`
      : music.status === 'paused' ? `已暂停：${music.track.title}`
        : `今晚会从 ${BEDTIME_TRACKS.length} 首轻音乐中随机选择`
  const classes = ['v3-night', dimmed ? 'is-dimmed' : '', accessibility.reduceMotion ? 'v3-reduce-motion' : '', accessibility.largeText ? 'v3-large-text' : ''].filter(Boolean).join(' ')

  return (
    <main className={classes} style={{ '--bg': `url("${appPath('assets/v3/night-room-backdrop.webp')}")` }}>
      <div className="v3-night__sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      <section className="v3-night__content">
        <span className="v3-night__moon" aria-hidden="true" />
        <h1 className="v3-display">晚安，{profile.name}。<span>明天见。</span></h1>
        {outcome === 'early'
          ? <p className="v3-night__reward"><Icon name="star" /> 今天提前了 {session.earlyMinutes} 分钟，收下 {session.earlyMinutes} 点星光</p>
          : outcome === 'on-time'
            ? <p className="v3-night__reward"><Icon name="star" /> 今天按时完成，花园结出一颗星光果实</p>
            : <p className="v3-night__reward is-keepsake"><Icon name="moon" /> 今晚也完成了，小花照常盛开。明天重新开始。</p>}
        <div className="v3-night__buddy"><Companion character={profile.character} mood="sleepy" label={`${profile.name}的陪伴角色已经睡着了`} /></div>
        {!accessibility.soundOff ? (
          <div className="v3-night__player">
            <span className="v3-night__track" role="status">{music.status === 'playing' ? <i aria-hidden="true" /> : null}{statusText}</span>
            <div>
              {music.status === 'paused'
                ? <button className="v3-button v3-button--wool" data-sound="none" type="button" onClick={() => player.resume()}><Icon name="volume" />继续播放</button>
                : <button className="v3-button v3-button--wool" data-sound="none" type="button" onClick={() => active ? player.stop() : player.start({ retry: music.status === 'error' })}><Icon name="volume" />{music.status === 'loading' ? '取消播放' : music.status === 'playing' ? '停止轻音乐' : music.status === 'error' ? '重新播放' : '随机播放 5 分钟'}</button>}
              {music.status === 'paused' ? <button className="v3-button v3-button--ghost" data-sound="none" type="button" onClick={() => player.stop()}>停止轻音乐</button> : null}
              {active || music.status === 'error' ? <button className="v3-button v3-button--ghost" data-sound="none" type="button" onClick={() => player.start()}>换一首</button> : null}
            </div>
            {music.error ? <small className="v3-night__error" role="alert">{music.error}</small> : null}
          </div>
        ) : null}
        <small className="v3-night__note">{active ? '这段轻音乐长 5 分钟。请把设备放到一旁，安心休息。' : '请关闭这个页面，把设备放到卧室外。'}</small>
      </section>
    </main>
  )
}
