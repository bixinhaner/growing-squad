import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useBedtimeActions, useBedtimeState } from '../store/useBedtime.js'
import { getActiveProfile } from '../domain/model.js'
import { CompanionArt } from '../ui/AssetArt.jsx'
import { SaveIndicator } from '../ui/Shared.jsx'
import { Icon } from '../ui/Icons.jsx'
import { sectionName } from '../ui/v2/evolutionModel.js'
import './tokens.css'
import './parent.css'

const PARENT_NAV = [
  { group: '每天', items: [
    { to: 'overview', label: '今天', icon: 'home' },
    { to: 'report', label: '成长记录', icon: 'book' },
    { to: 'support', label: '陪伴与观察', icon: 'heart' },
  ] },
  { group: '晚间', items: [
    { to: 'schedule', label: '作息与提醒', icon: 'clock' },
    { to: 'routine', label: '睡前流程', icon: 'moon' },
    { to: 'rewards', label: '愿望与奖励', icon: 'star' },
  ] },
  { group: '成长小天地', items: [
    { to: 'pet', label: '电子伙伴', icon: 'sparkle' },
    { to: 'movement', label: '运动游戏', icon: 'play' },
    { to: 'reading', label: '家庭书架', icon: 'book' },
    { to: 'responsibility', label: '家庭角色', icon: 'home' },
    { to: 'inventor', label: '发明工坊', icon: 'image' },
    { to: 'assistant', label: '成长助手', icon: 'search' },
    { to: 'timeline', label: '全天安排', icon: 'clock' },
  ] },
  { group: '家庭设置', items: [
    { to: 'profile', label: '孩子资料', icon: 'user' },
    { to: 'accessibility', label: '声音与易用性', icon: 'accessibility' },
    { to: 'devices', label: '家庭设备', icon: 'device' },
    { to: 'data', label: '数据与安全', icon: 'database' },
    { to: 'sync', label: '同步状态', icon: 'bell' },
  ] },
]
const TABS = [
  { to: 'overview', label: '今天', icon: 'home', match: ['overview'] },
  { to: 'report', label: '成长', icon: 'book', match: ['report', 'support'] },
  { to: 'schedule', label: '计划', icon: 'clock', match: ['schedule', 'routine', 'timeline'] },
  { to: 'rewards', label: '奖励', icon: 'star', match: ['rewards'] },
]
const tabFor = (pathname) => TABS.find((tab) => tab.match.some((key) => pathname.startsWith(`/parent/${key}`)))

export function ParentConsole() {
  const { state, syncConflicts } = useBedtimeState()
  const { dispatch, lockParent } = useBedtimeActions()
  const navigate = useNavigate()
  const location = useLocation()
  const profile = getActiveProfile(state)
  // The drawer belongs to the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState(null)
  const menuOpen = menuPath === location.pathname
  const setMenuOpen = (open) => setMenuPath(open ? location.pathname : null)
  const section = sectionName(location.pathname)
  const activeTab = tabFor(location.pathname)
  const inTabs = Boolean(activeTab)

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = (event) => { if (event.key === 'Escape') setMenuPath(null) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  const toChild = () => navigate('/today')
  const lock = () => { lockParent(); navigate('/today') }

  return (
    <div className={`v3-parent ${menuOpen ? 'is-menu-open' : ''}`}>
      <a className="v2-skip-link" href="#parent-content">跳到当前内容</a>
      <aside className="v3-side" aria-label="家长区导航">
        <div className="v3-side__brand">
          <span className="v3-side__moon" aria-hidden="true" />
          <span><strong className="v3-display">成长小队</strong><small>家长区</small></span>
          <button type="button" className="v3-side__close" onClick={() => setMenuOpen(false)} aria-label="关闭菜单"><Icon name="close" /></button>
        </div>
        <label className="v3-child-switch">
          <CompanionArt id={profile.character} decorative className="v3-child-switch__avatar" />
          <span>
            <small>当前孩子</small>
            <select aria-label="当前孩子" value={state.activeProfileId} onChange={(event) => dispatch({ type: 'SWITCH_PROFILE', profileId: event.target.value })}>
              {state.profiles.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.ageBand}</option>)}
            </select>
          </span>
          <Icon name="chevron" size={16} className="v3-child-switch__caret" />
        </label>
        <nav className="v3-side__nav" aria-label="家长导航">
          {PARENT_NAV.map((group) => (
            <div key={group.group} className="v3-side__group">
              <span>{group.group}</span>
              {group.items.map((item) => (
                <NavLink key={item.to} to={`/parent/${item.to}`}>
                  <Icon name={item.icon} size={19} /><span>{item.label}</span>
                  {item.to === 'sync' && syncConflicts.length ? <b>{syncConflicts.length}</b> : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="v3-side__foot">
          <button type="button" className="v3-side__child" onClick={toChild}><Icon name="moon" />回到孩子模式</button>
          <button type="button" className="v3-side__lock" onClick={lock}>锁定家长区</button>
        </div>
      </aside>
      <button type="button" className="v3-side__scrim" aria-label="关闭菜单" tabIndex={-1} onClick={() => setMenuOpen(false)} />

      <section className="v3-desk">
        <header className="v3-desk__top">
          <button type="button" className="v3-desk__menu" onClick={() => setMenuOpen(true)} aria-label="打开家长菜单" aria-expanded={menuOpen}><Icon name="menu" /></button>
          <div className="v3-desk__crumb"><small>{profile.name}的家庭</small><strong>{section}</strong></div>
          <div className="v3-desk__actions">
            {syncConflicts.length ? <NavLink className="v3-desk__alert" to="/parent/sync"><Icon name="bell" size={18} />同步待确认 {syncConflicts.length}</NavLink> : null}
            <SaveIndicator />
            <button type="button" className="v3-desk__child" onClick={toChild} aria-label="孩子模式"><Icon name="moon" size={18} /><span>孩子模式</span></button>
          </div>
        </header>
        <main id="parent-content" tabIndex={-1} className="v3-desk__main">
          <Outlet key={state.activeProfileId} />
        </main>
      </section>

      <nav className="v3-tabs" aria-label="家长常用">
        {TABS.map((tab) => <NavLink key={tab.to} to={`/parent/${tab.to}`} className={activeTab === tab ? 'active' : ''} aria-current={activeTab === tab ? 'page' : undefined}><Icon name={tab.icon} /><span>{tab.label}</span></NavLink>)}
        <button type="button" className={inTabs ? '' : 'active'} aria-current={inTabs ? undefined : 'true'} onClick={() => setMenuOpen(true)}><Icon name="menu" /><span>更多</span></button>
      </nav>
    </div>
  )
}
