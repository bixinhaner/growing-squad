import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getCompletionOutcome, getSession, localDateKey } from '../domain/model.js'
import { useBedtimeState } from '../store/useBedtime.js'
import { Icon } from '../ui/Icons.jsx'
import { BEDTIME_TRACKS } from '../audio/bgm.js'
import { createBedtimePlayer } from '../audio/bedtimePlayer.js'
import { playSound } from '../audio/soundscape.js'
import { CharacterPose, ThemeWorld } from '../ui/ThemeArt.jsx'

export function GoodnightPage() {
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

  useEffect(() => {
    if (session?.status === 'goodnight') playSound('goodnight', { muted: accessibility.soundOff })
  }, [accessibility.soundOff, session?.id, session?.status])

  useEffect(() => {
    if (accessibility.soundOff) player.stop()
  }, [accessibility.soundOff, player])

  if (!session || session.status !== 'goodnight') return <Navigate to="/tonight" replace />
  const outcome = getCompletionOutcome(session)
  const statusText = music.status === 'playing' ? `正在播放：${music.track.title}`
    : music.status === 'loading' ? `正在准备：${music.track.title}`
      : music.status === 'paused' ? `已暂停：${music.track.title}`
        : `今晚会从 ${BEDTIME_TRACKS.length} 首轻音乐中随机选择`

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
            <span className="goodnight-player__track" role="status">{music.status === 'playing' ? <i /> : null}{statusText}</span>
            <div>
              {music.status === 'paused'
                ? <button className="goodnight-music" data-sound="none" type="button" onClick={() => player.resume()}><Icon name="volume" />继续播放</button>
                : <button className="goodnight-music" data-sound="none" type="button" onClick={() => active ? player.stop() : player.start({ retry: music.status === 'error' })}><Icon name="volume" />{music.status === 'loading' ? '取消播放' : music.status === 'playing' ? '停止轻音乐' : music.status === 'error' ? '重新播放' : '随机播放 5 分钟'}</button>}
              {music.status === 'paused' ? <button className="goodnight-music" data-sound="none" type="button" onClick={() => player.stop()}>停止轻音乐</button> : null}
              {active || music.status === 'error' ? <button className="goodnight-music goodnight-music--next" data-sound="none" type="button" onClick={() => player.start()}>换一首</button> : null}
            </div>
            {music.error ? <small className="goodnight-player__error" role="alert">{music.error}</small> : null}
          </div>
        ) : null}
        <small>{active ? '这段轻音乐长 5 分钟。请把设备放到一旁，安心休息。' : '请关闭这个页面，把设备放到卧室外。'}</small>
      </section>
    </main>
  )
}
