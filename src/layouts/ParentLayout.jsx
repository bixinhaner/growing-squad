import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { getActiveProfile } from '../domain/model.js'
import { Brand, SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose } from '../ui/ThemeArt.jsx'
import { useGentleMotion } from '../ui/v2/useGentleMotion.js'
import { sectionName } from '../ui/v2/evolutionModel.js'

const navItems = [
  { to: '/parent/overview', label: '今天', icon: 'home' },
  { to: '/parent/report', label: '成长', icon: 'book' },
  { to: '/parent/schedule', label: '计划', icon: 'clock' },
  { to: '/parent/rewards', label: '奖励', icon: 'star' },
  { to: '/parent/profile', label: '设置', icon: 'menu' },
]

export function ParentLayout() {
  const { state, syncConflicts } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)
  const location = useLocation()
  const mainRef = useGentleMotion(`${location.pathname}:${state.activeProfileId}`)

  const returnToChild = () => {
    navigate('/tonight')
  }
  const switchProfile = (event) => {
    dispatch({ type: 'SWITCH_PROFILE', profileId: event.target.value })
  }

  return (
    <div className="parent-app gs-parent-app">
      <a className="v2-skip-link" href="#parent-content">跳到当前内容</a><aside className="parent-sidebar gs-parent-sidebar">
        <div className="gs-parent-brand"><Brand compact /><span>家长区</span></div>
        <nav aria-label="家长导航">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        {syncConflicts.length ? <NavLink className="gs-sync-alert" to="/parent/sync"><Icon name="bell" />同步待确认 <b>{syncConflicts.length}</b></NavLink> : null}
        <button type="button" className="gs-return-child" onClick={returnToChild}><Icon name="moon" /> 返回孩子模式</button>
        <CharacterPose character={profile.character} pose="waiting" label={`${profile.name}的陪伴角色`} className="gs-sidebar-mascot" />
      </aside>
      <section className="parent-workspace gs-parent-workspace">
        <header className="parent-topbar gs-parent-topbar">
          <label className="profile-chip"><img src={appPath('assets/app-icon.png')} alt="" /><span><small>当前孩子</small><select aria-label="当前孩子" value={state.activeProfileId} onChange={switchProfile}>{state.profiles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ageBand}</option>)}</select></span></label>
          <span className="v2-parent-location">家庭 / {sectionName(location.pathname)}</span><div className="gs-parent-topbar__actions">
            <button type="button" className="topbar-return" onClick={returnToChild}><Icon name="moon" />孩子模式</button>
            <SaveIndicator />
          </div>
        </header>
        <main id="parent-content" tabIndex={-1} ref={mainRef} className="parent-content gs-parent-content"><Outlet key={state.activeProfileId} /></main>
      </section>
    </div>
  )
}
