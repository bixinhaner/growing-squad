import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { getActiveProfile } from '../../domain/model.js'
import { useBedtimeActions, useBedtimeState } from '../../store/useBedtime.js'
import { CompanionArt } from '../../ui/AssetArt.jsx'
import { Icon } from '../ui/Icon.jsx'
import { ToastProvider } from '../ui/kit.jsx'
import { inboxFor } from './parentModel.js'
import { SaveStatus } from './pkit.jsx'
import '../theme.css'
import './parent.css'

const SECTIONS = [
  { to: '/parent', end: true, label: '此刻', icon: 'bell', hint: '需要你回应的事' },
  { to: '/parent/growth', label: '成长', icon: 'leaf', hint: '记录、睡眠与陪伴' },
  { to: '/parent/plan', label: '安排', icon: 'calendar', hint: '作息、小路与愿望' },
  { to: '/parent/family', label: '家庭', icon: 'users', hint: '孩子、设备与数据' },
]

export function ParentShell() {
  return <ToastProvider><ParentFrame /></ToastProvider>
}

function ParentFrame() {
  const { state, syncConflicts } = useBedtimeState()
  const { dispatch, lockParent } = useBedtimeActions()
  const navigate = useNavigate()
  const location = useLocation()
  const main = useRef(null)
  const profile = getActiveProfile(state)
  const waiting = inboxFor(state, profile.id, syncConflicts).length

  // New page, new reading position; focus moves for screen readers without scrolling jumps.
  useEffect(() => { window.scrollTo({ top: 0 }); main.current?.focus({ preventScroll: true }) }, [location.pathname])

  return (
    <div className="p-app">
      <a className="p-skip" href="#p-main">跳到内容</a>
      <aside className="p-rail" aria-label="家长区">
        <div className="p-brand"><span className="p-brand__moon" aria-hidden="true" /><span><strong className="u-display">成长小队</strong><small>家长区</small></span></div>

        <div className="p-kids" role="radiogroup" aria-label="正在查看的孩子">
          {state.profiles.map((child) => (
            <button type="button" role="radio" key={child.id} aria-checked={child.id === profile.id} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: child.id })}>
              <CompanionArt id={child.character} decorative />
              <span>{child.name}</span>
            </button>
          ))}
        </div>

        <nav className="p-nav" aria-label="家长区栏目">
          {SECTIONS.map((section) => (
            <NavLink key={section.to} to={section.to} end={section.end} className={({ isActive }) => (isActive ? 'is-on' : undefined)}>
              <Icon name={section.icon} size={22} />
              <span><strong>{section.label}</strong><small>{section.hint}</small></span>
              {section.to === '/parent' && waiting ? <b className="u-num" aria-label={`${waiting} 件待回应`}>{waiting}</b> : null}
            </NavLink>
          ))}
        </nav>

        <div className="p-rail__foot">
          <SaveStatus />
          <button type="button" className="p-child-btn" onClick={() => navigate('/today')}><Icon name="moon" size={20} />回到孩子这边</button>
          <button type="button" className="p-lock-btn" onClick={() => { lockParent(); navigate('/today') }}><Icon name="lock" size={16} />锁上家长区</button>
        </div>
      </aside>

      <header className="p-top">
        <div className="p-kids p-kids--top" role="radiogroup" aria-label="正在查看的孩子">
          {state.profiles.map((child) => (
            <button type="button" role="radio" key={child.id} aria-checked={child.id === profile.id} onClick={() => dispatch({ type: 'SWITCH_PROFILE', profileId: child.id })}>
              <CompanionArt id={child.character} decorative /><span>{child.name}</span>
            </button>
          ))}
        </div>
        <SaveStatus />
        <button type="button" className="p-top__child" aria-label="回到孩子这边" onClick={() => navigate('/today')}><Icon name="moon" size={20} /></button>
      </header>

      <main id="p-main" ref={main} tabIndex={-1} className="p-main">
        <Outlet key={state.activeProfileId} />
      </main>

      <nav className="p-tabs" aria-label="家长区栏目">
        {SECTIONS.map((section) => (
          <NavLink key={section.to} to={section.to} end={section.end} className={({ isActive }) => (isActive ? 'is-on' : undefined)}>
            <Icon name={section.icon} size={24} /><span>{section.label}</span>
            {section.to === '/parent' && waiting ? <b className="u-num">{waiting}</b> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
