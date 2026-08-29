import { Component, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ChildShell } from './layouts/ChildShell.jsx'
import { ParentLayout } from './layouts/ParentLayout.jsx'
import { AccessibilityPage } from './pages/AccessibilityPage.jsx'
import { CloudPairPage } from './pages/CloudPairPage.jsx'
import { DataPage } from './pages/DataPage.jsx'
import { DevicesPage } from './pages/DevicesPage.jsx'
import { GardenPage } from './pages/GardenPage.jsx'
import { GoodnightPage } from './pages/GoodnightPage.jsx'
import { ParentGatePage } from './pages/ParentGatePage.jsx'
import { ParentOverviewPage } from './pages/ParentOverviewPage.jsx'
import { ProfilePage } from './pages/ProfilePage.jsx'
import { RewardsPage } from './pages/RewardsPage.jsx'
import { RoutinePage } from './pages/RoutinePage.jsx'
import { SchedulePage } from './pages/SchedulePage.jsx'
import { SetupPage } from './pages/SetupPage.jsx'
import { TonightPage } from './pages/TonightPage.jsx'
import { WateringPage } from './pages/WateringPage.jsx'
import { WelcomePage } from './pages/WelcomePage.jsx'
import { WishesPage } from './pages/WishesPage.jsx'
import { TodayPage } from './pages/TodayPage.jsx'
import { WorldPage } from './pages/WorldPage.jsx'
import { MePage } from './pages/MePage.jsx'
import { FamilyTimelinePage } from './pages/FamilyTimelinePage.jsx'
import { SupportPage } from './pages/SupportPage.jsx'
import { GrowingSquadProvider } from './core/store/GrowingSquadProvider.jsx'
import { DeviceProvider } from './core/device/DeviceProvider.jsx'
import { APP_BASENAME, appPath } from './data/paths.js'
import { useBedtimeState } from './store/useBedtime.js'
import { useBedtimeActions } from './store/useBedtime.js'
import { Icon } from './ui/Icons.jsx'
import { SoundEffectsBridge } from './audio/SoundEffectsBridge.jsx'
import './app.css'

function HomeRedirect() {
  const { state } = useBedtimeState()
  return <Navigate to={state.setupComplete ? '/today' : '/welcome'} replace />
}

function RequireSetup() {
  const { state } = useBedtimeState()
  return state.setupComplete ? <Outlet /> : <Navigate to="/welcome" replace />
}

function RequireParent() {
  const { parentUnlocked } = useBedtimeState()
  const location = useLocation()
  const next = `${location.pathname}${location.search}`
  return parentUnlocked ? <Outlet /> : <Navigate to={`/parent/unlock?next=${encodeURIComponent(next)}`} replace />
}

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error">
          <span><Icon name="moon" size={54} /></span><h1>页面暂时没有准备好</h1><p>你的本地数据仍然保留。请刷新页面再试一次。</p>
          <button className="button button--primary" type="button" onClick={() => window.location.reload()}>重新打开</button>
        </main>
      )
    }
    return this.props.children
  }
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route element={<RequireSetup />}>
        <Route element={<ChildShell />}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/world" element={<WorldPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/tonight" element={<TonightPage />} />
          <Route path="/garden" element={<GardenPage />} />
          <Route path="/wishes" element={<WishesPage />} />
        </Route>
        <Route path="/watering" element={<WateringPage />} />
        <Route path="/goodnight" element={<GoodnightPage />} />
        <Route path="/parent/unlock" element={<ParentGatePage />} />
        <Route element={<RequireParent />}>
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ParentOverviewPage />} />
            <Route path="timeline" element={<FamilyTimelinePage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="routine" element={<RoutinePage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="accessibility" element={<AccessibilityPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="data" element={<DataPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function CloudBoundary() {
  const { cloud } = useBedtimeState()
  const { pairCloud } = useBedtimeActions()
  if (cloud.mode === 'checking') {
    return <main className="cloud-loading" aria-live="polite"><img src={appPath('assets/app-icon.png')} alt="" /><strong>成长小队正在打开家庭花园…</strong><span className="spinner" /></main>
  }
  if (cloud.mode === 'pairing') return <CloudPairPage onPaired={pairCloud} />
  return <><SoundEffectsBridge /><BrowserRouter basename={APP_BASENAME}><AppRoutes /></BrowserRouter><UpdateNotice /></>
}

function UpdateNotice() {
  const [worker, setWorker] = useState(null)
  const reloadRequested = useRef(false)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    let active = true
    const inspect = async () => {
      const registration = await navigator.serviceWorker.ready
      if (!active) return
      if (registration.waiting && navigator.serviceWorker.controller) setWorker(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) setWorker(installing)
        })
      })
    }
    inspect()
    const reload = () => { if (reloadRequested.current) window.location.reload() }
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    return () => { active = false; navigator.serviceWorker.removeEventListener('controllerchange', reload) }
  }, [])
  if (!worker) return null
  return <aside className="update-notice" role="status"><Icon name="moon" /><span><strong>新版本准备好了</strong><small>建议今晚流程结束后更新</small></span><button type="button" onClick={() => { reloadRequested.current = true; worker.postMessage({ type: 'SKIP_WAITING' }) }}>现在更新</button><button type="button" aria-label="稍后更新" onClick={() => setWorker(null)}><Icon name="close" /></button></aside>
}

export default function App() {
  return (
    <AppErrorBoundary>
      <DeviceProvider>
        <GrowingSquadProvider>
          <CloudBoundary />
        </GrowingSquadProvider>
      </DeviceProvider>
    </AppErrorBoundary>
  )
}
