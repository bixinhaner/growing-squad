import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CHARACTER_OPTIONS, getActiveProfile } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Brand, SaveIndicator, StarBalance } from '../ui/Shared.jsx'
import { CompanionArt } from '../ui/AssetArt.jsx'
import { RewardChest } from '../ui/RewardChest.jsx'
import { Icon } from '../ui/Icons.jsx'

export function ChildShell() {
  const { state } = useBedtimeState()
  const { lockParent } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const character = CHARACTER_OPTIONS.find((item) => item.id === profile.character) || CHARACTER_OPTIONS[0]
  const location = useLocation()
  const navigate = useNavigate()
  const [chestOpen, setChestOpen] = useState(false)
  const coreView = ['/today', '/world', '/me', '/tonight', '/garden'].includes(location.pathname)
  const viewName = (location.pathname.replace(/^\//, '').replaceAll('/', '-') || 'today')

  useEffect(() => {
    lockParent()
  }, [lockParent])

  return (
    <div className={`child-app gs-child-app child-view-${viewName} theme-${profile.theme}`}>
      <header className="child-header gs-child-header">
        <Brand />
        <div className="gs-child-header__actions">
          {location.pathname === '/tonight' || location.pathname === '/garden' ? <StarBalance onClick={() => setChestOpen(true)} /> : null}
          <CompanionArt id={character.id} label={`陪伴角色：${character.name}`} className="child-character" />
          <button className="gs-parent-entry" type="button" onClick={() => navigate('/parent')} aria-label="进入家长区"><Icon name="shield" /></button>
        </div>
      </header>
      <SaveIndicator />
      <main className="child-main gs-child-main"><Outlet /></main>
      {coreView ? <nav className="gs-child-nav" aria-label="儿童主导航">
        <NavLink to="/today"><Icon name="home" /><span>今天</span></NavLink>
        <NavLink to="/world"><Icon name="sparkle" /><span>小队世界</span></NavLink>
        <NavLink to="/me"><Icon name="user" /><span>成长背包</span></NavLink>
      </nav> : null}
      {chestOpen ? <RewardChest onClose={() => setChestOpen(false)} /> : null}
    </div>
  )
}
