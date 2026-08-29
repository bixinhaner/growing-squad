import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { appPath } from '../data/paths.js'
import { getActiveProfile } from '../domain/model.js'
import { Brand, SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { CharacterPose } from '../ui/ThemeArt.jsx'

const navItems = [
  { to: '/parent/overview', label: '家庭概览', icon: 'home' },
  { to: '/parent/timeline', label: '今日与时间线', icon: 'clock' },
  { to: '/parent/support', label: '孩子与支持', icon: 'heart' },
  { to: '/parent/movement', label: '运动小队', icon: 'sparkle' },
  { to: '/parent/schedule', label: '作息与提醒', icon: 'clock' },
  { to: '/parent/routine', label: '睡前流程', icon: 'book' },
  { to: '/parent/rewards', label: '星光与奖励', icon: 'star' },
  { to: '/parent/profile', label: '孩子资料', icon: 'user' },
  { to: '/parent/accessibility', label: '无障碍', icon: 'accessibility' },
  { to: '/parent/devices', label: '家庭设备', icon: 'device' },
  { to: '/parent/data', label: '数据与隐私', icon: 'shield' },
]

export function ParentLayout() {
  const { state } = useBedtimeState()
  const { dispatch } = useBedtimeActions()
  const navigate = useNavigate()
  const profile = getActiveProfile(state)

  const returnToChild = () => {
    navigate('/tonight')
  }
  const switchProfile = (event) => {
    dispatch({ type: 'SWITCH_PROFILE', profileId: event.target.value })
  }

  return (
    <div className="parent-app">
      <aside className="parent-sidebar">
        <div><Brand compact /><span className="parent-sidebar__caption">家长区</span></div>
        <nav aria-label="家长导航">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} title={item.label}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="return-child" aria-label="返回孩子模式" title="返回孩子模式" onClick={returnToChild}><Icon name="moon" /> <span>返回孩子模式</span></button>
        <CharacterPose character={profile.character} pose="waiting" label={`${profile.name}的陪伴角色`} className="sidebar-mascot" />
      </aside>
      <section className="parent-workspace">
        <header className="parent-topbar">
          <label className="profile-chip"><img src={appPath('assets/app-icon.png')} alt="" /><span><small>当前孩子</small><select aria-label="当前孩子" value={state.activeProfileId} onChange={switchProfile}>{state.profiles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ageBand}</option>)}</select></span></label>
          <div className="parent-topbar__actions">
            <button type="button" className="topbar-return" onClick={returnToChild}><Icon name="moon" />孩子模式</button>
            <SaveIndicator />
          </div>
        </header>
        <main className="parent-content"><Outlet key={state.activeProfileId} /></main>
      </section>
    </div>
  )
}
