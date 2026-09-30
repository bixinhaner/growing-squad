import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getActiveProfile, getStarBalance } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { appPath } from '../../data/paths.js'
import { CompanionArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { HoldButton, ToastProvider } from '../ui/kit.jsx'
import { useDaypart } from '../lib/hooks.js'
import { stopSpeaking } from '../lib/speech.js'
import '../theme.css'
import './kid.css'
import './places.css'
import './flows.css'

const BACKDROPS = {
  morning: 'assets/v4/daypart-morning.webp',
  afternoon: 'assets/v4/daypart-afternoon.webp',
  evening: 'assets/v4/daypart-evening.webp',
  night: 'assets/v4/daypart-night.webp',
}

// Where the round back button leads, and what it is called.
const PLACES = {
  tonight: ['睡前小路', '/today'],
  play: ['去玩', '/today'],
  box: ['我的宝盒', '/today'],
  pet: ['小伙伴', '/today'],
  ask: ['小问题', '/today'],
  movement: ['动一动', '/play'],
  reading: ['读故事', '/play'],
  family: ['帮家里', '/play'],
  inventor: ['小发明', '/play'],
}

function backFor(pathname) {
  const parts = pathname.split('/').filter(Boolean)
  const place = PLACES[parts[0]]
  if (!place) return null
  // Deep inside a flow, step back to that place's front door first.
  const to = parts.length > 1 ? `/${parts[0]}` : place[1]
  return { label: place[0], to }
}

export function StarJar({ onClick }) {
  const { state } = useBedtimeState()
  const balance = getStarBalance(state)
  return (
    <button type="button" id="k-jar" className="k-jar" onClick={onClick} aria-label={`星光罐：${balance} 点星光，打开愿望`}>
      <img src={appPath('assets/v3/star-jar.webp')} alt="" />
      <strong className="u-num">{balance}</strong>
    </button>
  )
}

export function KidShell() {
  return <ToastProvider><KidFrame /></ToastProvider>
}

function KidFrame() {
  const { state } = useBedtimeState()
  const { lockParent } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const location = useLocation()
  const navigate = useNavigate()
  const daypart = useDaypart()
  const back = backFor(location.pathname)
  const home = !back

  useEffect(() => { lockParent() }, [lockParent])
  useEffect(() => () => stopSpeaking(), [location.pathname])
  useEffect(() => { window.scrollTo(0, 0) }, [location.pathname])

  return (
    <div className={`k-app theme-${profile.theme}`} data-daypart={daypart} data-home={home || undefined}>
      <div className="k-sky" aria-hidden="true">
        <img src={appPath(BACKDROPS[daypart])} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} />
      </div>
      <a className="k-skip" href="#k-main">跳到主要内容</a>
      <header className="k-top">
        {home ? (
          <span className="k-me">
            <CompanionArt id={profile.character} decorative className="k-me__face" />
            <span className="u-display">{profile.name}</span>
          </span>
        ) : (
          <button type="button" className="k-back" onClick={() => navigate(back.to)} aria-label={`返回${back.to === '/today' ? '此刻' : PLACES[back.to.slice(1)]?.[0] || ''}`}>
            <span className="k-back__ring"><Icon name="back" size={26} strokeWidth={2.6} /></span>
            <span className="u-display">{back.label}</span>
          </button>
        )}
        <div className="k-top__right">
          <StarJar onClick={() => navigate('/box?tab=wishes')} />
          <HoldButton className="k-lock" label="家长入口（按住打开）" hint="请家长按住小锁" onDone={() => navigate('/parent')}>
            <Icon name="lock" size={22} />
          </HoldButton>
        </div>
      </header>
      <main id="k-main" className="k-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
