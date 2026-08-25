import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getCompletionOutcome, getSession, localDateKey } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { pickBedtimeTrack } from '../audio/bgm.js'
import { playSound } from '../audio/soundscape.js'
import { CharacterPose, ThemeWorld } from '../ui/ThemeArt.jsx'

const MUSIC_DURATION_MS = 5 * 60 * 1000
const MUSIC_FADE_MS = 8000
const MUSIC_VOLUME = 0.32

export function GoodnightPage() {
  const { state } = useBedtimeState()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const session = getSession(state, localDateKey())
  const [dimmed, setDimmed] = useState(false)
  const [musicPlaying, setMusicPlaying] = useState(false)
  const [activeTrack, setActiveTrack] = useState(null)
  const [musicError, setMusicError] = useState('')
  const audioRef = useRef(null)
  const timersRef = useRef([])

  const clearMusicTimers = () => {
    timersRef.current.forEach((timer) => {
      window.clearTimeout(timer)
      window.clearInterval(timer)
    })
    timersRef.current = []
  }

  const stopMusic = ({ feedback = true } = {}) => {
    clearMusicTimers()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    setMusicPlaying(false)
    if (feedback) playSound('dismiss', { muted: accessibility.soundOff })
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setDimmed(true), 10000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => () => {
    clearMusicTimers()
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  useEffect(() => {
    if (session?.status === 'goodnight') playSound('goodnight', { muted: accessibility.soundOff })
  }, [accessibility.soundOff, session?.id, session?.status])

  useEffect(() => {
    if (!accessibility.soundOff || !audioRef.current) return
    clearMusicTimers()
    audioRef.current.pause()
    audioRef.current = null
    queueMicrotask(() => setMusicPlaying(false))
  }, [accessibility.soundOff])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />
  const outcome = getCompletionOutcome(session)

  const startMusic = async () => {
    const previousId = activeTrack?.id
    stopMusic({ feedback: false })
    setMusicError('')
    const track = pickBedtimeTrack(previousId)
    const audio = new Audio(track.src)
    audio.preload = 'auto'
    audio.loop = true
    audio.volume = 0.02
    audioRef.current = audio
    try {
      await audio.play()
      setActiveTrack(track)
      setMusicPlaying(true)
      playSound('musicStart', { muted: accessibility.soundOff })
      const fadeInStartedAt = Date.now()
      const fadeInTimer = window.setInterval(() => {
        if (audioRef.current !== audio) return
        const progress = Math.min(1, (Date.now() - fadeInStartedAt) / 2200)
        audio.volume = 0.02 + (MUSIC_VOLUME - 0.02) * progress
        if (progress >= 1) window.clearInterval(fadeInTimer)
      }, 100)
      const fadeOutTimer = window.setTimeout(() => {
        const fadeOutStartedAt = Date.now()
        const fadeTimer = window.setInterval(() => {
          if (audioRef.current !== audio) return
          const progress = Math.min(1, (Date.now() - fadeOutStartedAt) / MUSIC_FADE_MS)
          audio.volume = Math.max(0, MUSIC_VOLUME * (1 - progress))
          if (progress >= 1) stopMusic({ feedback: false })
        }, 120)
        timersRef.current.push(fadeTimer)
      }, MUSIC_DURATION_MS - MUSIC_FADE_MS)
      timersRef.current.push(fadeInTimer, fadeOutTimer)
    } catch {
      audioRef.current = null
      setMusicPlaying(false)
      setMusicError('音乐暂时没有响起，请检查 iPad 音量后再试一次。')
    }
  }

  return (
    <main className={`goodnight-page theme-${profile.theme} ${dimmed ? 'goodnight-page--dimmed' : ''}`}>
      <ThemeWorld theme={profile.theme} className="goodnight-world" />
      <div className="goodnight-stars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <section className="goodnight-content">
        <span className="goodnight-moon"><Icon name="moon" /></span>
        <h1>晚安，{profile.name}。明天见。</h1>
        {outcome === 'early'
          ? <p className="goodnight-reward"><Icon name="star" /> 今天提前了 {session.earlyMinutes} 分钟，收下 {session.earlyMinutes} 点星光</p>
          : outcome === 'on-time'
            ? <p className="goodnight-reward"><Icon name="star" /> 今天按时完成，花园结出一颗星光果实</p>
            : <p className="goodnight-reward goodnight-reward--keepsake"><Icon name="moon" /> 今晚也完成了，小花照常盛开。明天重新开始。</p>}
        <CharacterPose character={profile.character} pose="sleep" label={`${profile.name}的陪伴角色已经睡着了`} className="goodnight-companion" />
        {!accessibility.soundOff ? (
          <div className="goodnight-player">
            {activeTrack && musicPlaying ? <span className="goodnight-player__track"><i></i>正在播放：{activeTrack.title}</span> : <span className="goodnight-player__track">今晚会从 4 首轻音乐中随机选择</span>}
            <div>
              <button className="goodnight-music" data-sound="none" type="button" onClick={musicPlaying ? () => stopMusic() : startMusic}><Icon name="volume" />{musicPlaying ? '停止轻音乐' : '随机播放 5 分钟'}</button>
              {musicPlaying ? <button className="goodnight-music goodnight-music--next" data-sound="none" type="button" onClick={startMusic}>换一首</button> : null}
            </div>
            {musicError ? <small className="goodnight-player__error" role="alert">{musicError}</small> : null}
          </div>
        ) : null}
        <small>请关闭这个页面，把设备放到卧室外。</small>
      </section>
    </main>
  )
}
