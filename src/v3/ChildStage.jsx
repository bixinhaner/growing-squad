import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getAccessibility, getActiveProfile, getStarBalance } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { CompanionArt } from '../ui/AssetArt.jsx'
import { RewardChest } from '../ui/RewardChest.jsx'
import { SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { stopSpeaking } from './speech.js'
import './tokens.css'
import './child.css'
import './scenes.css'
import './places.css'
import './pet-skin.css'

const CORE_VIEWS = ['/today', '/world', '/me', '/tonight', '/garden']
const PLACE_NAMES = {
  pet: '小伙伴的家', wishes: '愿望码头', movement: '能量广场', 'energy-plaza': '能量广场', reading: '故事树屋', 'story-treehouse': '故事树屋',
  responsibility: '家庭小屋', 'family-cottage': '家庭小屋', inventor: '发明工坊', 'companion-question': '小问题',
}
const DOCK = [
  { to: '/today', label: '今天', art: 'assets/objects/lamp.webp' },
  { to: '/world', label: '小队世界', art: 'assets/objects/park.webp' },
  { to: '/me', label: '成长背包', art: 'assets/objects/backpack.webp' },
]

export function StarJar({ onClick, pulseKey }) {
  const { state } = useBedtimeState()
  const balance = getStarBalance(state)
  return (
    <button type="button" className="v3-jar" onClick={onClick} aria-label={`打开星光罐，现在有 ${balance} 点星光`} data-pulse={pulseKey}>
      <img src={appPath('assets/v3/star-jar.webp')} alt="" onError={(event) => { event.currentTarget.src = appPath('assets/pets-v2/star.webp') }} />
      <strong className="v3-num">{balance}</strong>
    </button>
  )
}

export function ChildStage() {
  const { state } = useBedtimeState()
  const { lockParent } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const accessibility = getAccessibility(state)
  const location = useLocation()
  const navigate = useNavigate()
  const [chestOpen, setChestOpen] = useState(false)
  const core = CORE_VIEWS.includes(location.pathname)
  const section = location.pathname.split('/')[1] || 'today'
  const place = PLACE_NAMES[section]

  useEffect(() => { lockParent() }, [lockParent])
  useEffect(() => () => stopSpeaking(), [location.pathname])

  const classes = [
    'v3-child',
    `v3-view-${section}`,
    `theme-${profile.theme}`,
    core ? 'is-core' : 'is-place',
    accessibility.reduceMotion ? 'v3-reduce-motion' : '',
    accessibility.largeText ? 'v3-large-text' : '',
    accessibility.highContrast ? 'v3-high-contrast' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      <a className="v2-skip-link" href="#child-content">跳到当前内容</a>
      <header className="v3-hud">
        {core
          ? <span className="v3-hud__me"><CompanionArt id={profile.character} decorative className="v3-hud__avatar" /><span className="v3-display">{profile.name}</span></span>
          : <button type="button" className="v3-hud__back" onClick={() => navigate('/world')} aria-label="返回小队世界"><Icon name="chevronBack" size={26} /><span className="v3-display">{place || '小队世界'}</span></button>}
        <div className="v3-hud__right">
          <SaveIndicator />
          <StarJar onClick={() => setChestOpen(true)} />
          <button className="v3-hud__parent" type="button" onClick={() => navigate('/parent')} aria-label="进入家长区" title="家长区">
            <Icon name="shield" size={20} />
          </button>
        </div>
      </header>
      <main id="child-content" tabIndex={-1} className="v3-child__main">
        <Outlet />
      </main>
      {core ? (
        <nav className="v3-dock" aria-label="儿童主导航">
          {DOCK.map((item) => {
            const active = item.to === '/today' ? ['/today', '/tonight'].includes(location.pathname) : item.to === '/world' ? ['/world', '/garden'].includes(location.pathname) : location.pathname === item.to
            return (
              <Link key={item.to} to={item.to} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                <img src={appPath(item.art)} alt="" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      ) : null}
      {chestOpen ? <RewardChest onClose={() => setChestOpen(false)} /> : null}
    </div>
  )
}
