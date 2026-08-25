import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getCompletionOutcome, getSession, localDateKey } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { playSound } from '../audio/soundscape.js'
import { getWateringExperience } from '../domain/wateringExperience.js'
import { CharacterPose, ThemeWorld } from '../ui/ThemeArt.jsx'

export function WateringPage() {
  const { state } = useBedtimeState()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const session = getSession(state, localDateKey())
  const [leaving, setLeaving] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)

  const reducedMotion = accessibility.reduceMotion
    || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const outcome = getCompletionOutcome(session)
  const experience = useMemo(() => getWateringExperience(outcome, reducedMotion), [outcome, reducedMotion])
  const sessionReady = session?.status === 'goodnight'
  const sessionId = session?.id

  useEffect(() => {
    if (!sessionReady) return undefined
    playSound('watering', { muted: accessibility.soundOff })
    const timers = experience.phases.slice(1).map((phase, index) => window.setTimeout(() => setPhaseIndex(index + 1), phase.at))
    timers.push(window.setTimeout(() => playSound('bloom', { muted: accessibility.soundOff }), experience.bloomAt))
    if (outcome === 'early') {
      timers.push(window.setTimeout(() => playSound('starlight', { muted: accessibility.soundOff }), reducedMotion ? 2100 : 7000))
      timers.push(window.setTimeout(() => playSound('reward', { muted: accessibility.soundOff }), reducedMotion ? 3500 : 11600))
    } else if (outcome === 'on-time') {
      timers.push(window.setTimeout(() => playSound('reward', { muted: accessibility.soundOff }), reducedMotion ? 2200 : 6300))
    } else {
      timers.push(window.setTimeout(() => playSound('keepsake', { muted: accessibility.soundOff }), reducedMotion ? 2200 : 6500))
    }
    const leaveTimer = window.setTimeout(() => setLeaving(true), Math.max(0, experience.duration - (reducedMotion ? 420 : 900)))
    const navigateTimer = window.setTimeout(() => navigate('/goodnight', { replace: true }), experience.duration)
    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(navigateTimer)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [accessibility.soundOff, experience.bloomAt, experience.duration, experience.phases, navigate, outcome, reducedMotion, sessionId, sessionReady])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />

  const activePhase = experience.phases[Math.min(phaseIndex, experience.phases.length - 1)]
  const durationSeconds = experience.duration / 1000

  return (
    <main
      className={`watering-ritual watering-ritual--${outcome} watering-ritual--phase-${activePhase.key} ${leaving ? 'watering-ritual--leaving' : ''}`}
      style={{ '--ritual-duration': `${durationSeconds}s`, '--ritual-fade': reducedMotion ? '420ms' : '900ms' }}
      aria-labelledby="watering-title"
    >
      <div className="watering-ritual__world" aria-hidden="true"><ThemeWorld theme={profile.theme} /></div>
      <div className="watering-ritual__shade" aria-hidden="true"></div>
      {experience.starCount ? <div className="watering-ritual__stars" aria-hidden="true">{Array.from({ length: experience.starCount }, (_, index) => <i key={index}></i>)}</div> : null}
      {outcome === 'early' ? <div className="watering-ritual__star-trail" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index}></i>)}</div> : null}

      <section className="watering-ritual__content" aria-live="polite">
        <span className="watering-ritual__eyebrow">{outcome === 'early' ? '提前完成 · 星光庆祝' : outcome === 'on-time' ? '按时完成 · 花园纪念' : '今晚完成 · 温柔开花'}</span>
        <h1 id="watering-title">给{profile.name}的小花浇水</h1>
        <p key={activePhase.key} className="watering-ritual__message">{activePhase.text}</p>
      </section>

      {outcome === 'early' ? <div className="watering-ritual__reward" aria-label={`获得 ${session.starsAwarded || session.earlyMinutes} 点星光`}><strong>+{session.starsAwarded || session.earlyMinutes}</strong><span>点星光</span></div> : null}

      <div className="watering-ritual__garden" aria-hidden="true">
        <CharacterPose character={profile.character} pose="watering" decorative className="watering-ritual__companion" />
        <div className="watering-ritual__drops">
          {Array.from({ length: 12 }, (_, index) => <img key={index} src={appPath('assets/objects/wash.webp')} alt="" />)}
        </div>
        <div className="watering-ritual__plant">
          <span className="watering-ritual__plant-stage watering-ritual__plant-stage--bud"></span>
          <span className={`watering-ritual__plant-stage watering-ritual__plant-stage--bloom watering-ritual__plant-stage--${outcome}`}></span>
        </div>
        <span className="watering-ritual__soil"></span>
      </div>

      <div className="watering-ritual__progress" aria-hidden="true"><i></i></div>

      <p className="sr-live" aria-live="polite">{activePhase.text}</p>
    </main>
  )
}
