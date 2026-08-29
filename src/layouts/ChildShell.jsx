import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CHARACTER_OPTIONS, dayTypeFor, getActiveProfile, getRoutine, getSchedule, getSession, isRoutineOpen, localDateKey } from '../domain/model.js'
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
  const platformView = ['/today', '/world', '/me'].includes(location.pathname)
  const readingView = location.pathname.startsWith('/reading') || location.pathname === '/story-treehouse'
  const responsibilityView = location.pathname.startsWith('/responsibility') || location.pathname === '/family-cottage'
  const inventorView = location.pathname.startsWith('/inventor')
  const moduleNavView = readingView || responsibilityView || inventorView
  const daytime = platformView || location.pathname === '/garden' || location.pathname === '/wishes' || location.pathname.startsWith('/movement') || location.pathname === '/energy-plaza' || location.pathname.startsWith('/reading') || location.pathname === '/story-treehouse' || responsibilityView || inventorView
  const showChildTabs = location.pathname === '/garden' || location.pathname === '/wishes'
  const viewName = (location.pathname.replace(/^\//, '').replaceAll('/', '-') || 'today')
  const dateKey = localDateKey()
  const dayType = dayTypeFor()
  const schedule = getSchedule(state, dayType, dateKey)
  const routine = getRoutine(state, dayType)
  const session = getSession(state, dateKey)
  const activeSteps = routine.steps.filter((step) => step.enabled)
  const statuses = session?.stepStatus || {}
  const remaining = activeSteps.filter((step) => (statuses[step.id] || 'todo') === 'todo').length
  const returningToActiveRoutine = location.pathname === '/garden' && session?.status !== 'goodnight' && (isRoutineOpen(schedule) || Boolean(session))

  useEffect(() => {
    lockParent()
  }, [lockParent])

  return (
    <div className={`child-app child-app--single-screen child-view-${viewName} theme-${profile.theme}`}>
      <header className="child-header">
        <Brand />
        {daytime ? (
          moduleNavView ? <nav className="child-tabs reading-tabs" aria-label="成长模块导航">
            <NavLink to="/today">今天</NavLink>
            <NavLink to="/world">小队世界</NavLink>
            <NavLink to="/me">我的</NavLink>
          </nav> : showChildTabs ? <nav className="child-tabs" aria-label="儿童导航">
            <NavLink to="/today">返回今天</NavLink>
            <NavLink to="/tonight">{returningToActiveRoutine ? `返回今晚 · ${remaining}` : '今晚'}</NavLink>
            <NavLink to="/garden">星星花园</NavLink>
          </nav> : <span />
        ) : null}
        <div className="child-header__actions">
          <CompanionArt id={character.id} label={`陪伴角色：${character.name}`} className="child-character" />
          <span className="child-greeting">{daytime ? `你好，${profile.name}` : `晚安，${profile.name}`}</span>
          {moduleNavView ? null : <StarBalance onClick={() => setChestOpen(true)} />}
          <button className="parent-link" type="button" onClick={() => navigate('/parent')}>家长区</button>
        </div>
      </header>
      <SaveIndicator />
      <main className="child-main"><Outlet /></main>
      {platformView ? <nav className="child-primary-nav" aria-label="儿童主导航">
        <NavLink to="/today"><Icon name="home" /><span>今天</span></NavLink>
        <NavLink to="/world"><Icon name="sparkle" /><span>小队世界</span></NavLink>
        <NavLink to="/me"><Icon name="user" /><span>我的</span></NavLink>
      </nav> : null}
      {chestOpen ? <RewardChest onClose={() => setChestOpen(false)} /> : null}
    </div>
  )
}
