import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CHARACTER_OPTIONS, dayTypeFor, getActiveProfile, getRoutine, getSchedule, getSession, isRoutineOpen, localDateKey } from '../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { Brand, SaveIndicator, StarBalance } from '../ui/Shared.jsx'
import { CompanionArt } from '../ui/AssetArt.jsx'
import { RewardChest } from '../ui/RewardChest.jsx'

export function ChildShell() {
  const { state } = useBedtimeState()
  const { lockParent } = useBedtimeActions()
  const profile = getActiveProfile(state)
  const character = CHARACTER_OPTIONS.find((item) => item.id === profile.character) || CHARACTER_OPTIONS[0]
  const location = useLocation()
  const navigate = useNavigate()
  const [chestOpen, setChestOpen] = useState(false)
  const daytime = location.pathname === '/garden' || location.pathname === '/wishes'
  const viewName = location.pathname === '/garden' ? 'garden' : location.pathname === '/wishes' ? 'wishes' : 'tonight'
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
          <nav className="child-tabs" aria-label="儿童导航">
            <NavLink to="/tonight">{returningToActiveRoutine ? `返回今晚 · ${remaining}` : '今晚'}</NavLink>
            <NavLink to="/garden">星星花园</NavLink>
            <NavLink to="/wishes">愿望单</NavLink>
          </nav>
        ) : null}
        <div className="child-header__actions">
          <CompanionArt id={character.id} label={`陪伴角色：${character.name}`} className="child-character" />
          <span className="child-greeting">晚安，{profile.name}</span>
          <StarBalance onClick={() => setChestOpen(true)} />
          <button className="parent-link" type="button" onClick={() => navigate('/parent')}>家长区</button>
        </div>
      </header>
      <SaveIndicator />
      <main className="child-main"><Outlet /></main>
      {chestOpen ? <RewardChest onClose={() => setChestOpen(false)} /> : null}
    </div>
  )
}
