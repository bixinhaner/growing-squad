import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ChildStage } from './v3/ChildStage.jsx'
import { ParentConsole } from './v3/ParentConsole.jsx'
import { GrowingSquadProvider } from './core/store/GrowingSquadProvider.jsx'
import { DeviceProvider } from './core/device/DeviceProvider.jsx'
import { APP_BASENAME, appPath } from './data/paths.js'
import { useBedtimeState } from './store/useBedtime.js'
import { useBedtimeActions } from './store/useBedtime.js'
import { Icon } from './ui/Icons.jsx'
import { SoundEffectsBridge } from './audio/SoundEffectsBridge.jsx'
import './app.css'
import './redesign.css'
import '@fontsource-variable/fredoka'
import './v3/tokens.css'

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })))
const WelcomePage = lazyNamed(() => import('./v3/pages/EntryPages.jsx'), 'WelcomeStage')
const SetupPage = lazyNamed(() => import('./v3/pages/EntryPages.jsx'), 'SetupStage')
const CloudPairPage = lazyNamed(() => import('./v3/pages/EntryPages.jsx'), 'PairStage')
const TodayPage = lazyNamed(() => import('./v3/pages/NowScene.jsx'), 'NowScene')
const WorldPage = lazyNamed(() => import('./v3/pages/WorldMap.jsx'), 'WorldMap')
const MePage = lazyNamed(() => import('./v3/pages/BackpackRoom.jsx'), 'BackpackRoom')
const PetHomePage = lazyNamed(() => import('./pages/PetHomePage.jsx'), 'PetHomePage')
const PetParentPage = lazyNamed(() => import('./pages/PetParentPage.jsx'), 'PetParentPage')
const TonightPage = lazyNamed(() => import('./v3/pages/TonightScene.jsx'), 'TonightScene')
const GardenPage = lazyNamed(() => import('./v3/pages/GardenScene.jsx'), 'GardenScene')
const WishesPage = lazyNamed(() => import('./v3/pages/WishSky.jsx'), 'WishSky')
const WateringPage = lazyNamed(() => import('./v3/pages/BedtimeRitual.jsx'), 'WateringRitual')
const GoodnightPage = lazyNamed(() => import('./v3/pages/BedtimeRitual.jsx'), 'GoodnightRoom')
const ParentGatePage = lazyNamed(() => import('./v3/pages/ParentGate.jsx'), 'ParentGate')
const ParentOverviewPage = lazyNamed(() => import('./v3/pages/ParentToday.jsx'), 'ParentToday')
const FamilyTimelinePage = lazyNamed(() => import('./pages/FamilyTimelinePage.jsx'), 'FamilyTimelinePage')
const SupportPage = lazyNamed(() => import('./pages/SupportPage.jsx'), 'SupportPage')
const SchedulePage = lazyNamed(() => import('./pages/SchedulePage.jsx'), 'SchedulePage')
const RoutinePage = lazyNamed(() => import('./pages/RedesignPages.jsx'), 'RedesignRoutineEditorPage')
const RewardsPage = lazyNamed(() => import('./pages/RewardsPage.jsx'), 'RewardsPage')
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage.jsx'), 'ProfilePage')
const MovementChoicePage = lazyNamed(() => import('./v3/pages/EnergyPlaza.jsx'), 'MovementChoice')
const MovementReadyPage = lazyNamed(() => import('./v3/pages/EnergyPlaza.jsx'), 'MovementReady')
const MovementPlayPage = lazyNamed(() => import('./v3/pages/EnergyPlaza.jsx'), 'MovementPlay')
const EnergyPlazaPage = lazyNamed(() => import('./v3/pages/EnergyPlaza.jsx'), 'EnergyPlaza')
const MovementParentPage = lazyNamed(() => import('./pages/MovementParentPage.jsx'), 'MovementParentPage')
const ReadingShelfPage = lazyNamed(() => import('./v3/pages/StoryTreehouse.jsx'), 'StoryShelf')
const ReadingBookPage = lazyNamed(() => import('./v3/pages/StoryTreehouse.jsx'), 'StoryBook')
const ReadingPlayPage = lazyNamed(() => import('./v3/pages/StoryTreehouse.jsx'), 'StoryPlay')
const ReadingParentPage = lazyNamed(() => import('./pages/ReadingParentPage.jsx'), 'ReadingParentPage')
const FamilyCottagePage = lazyNamed(() => import('./v3/pages/FamilyCottage.jsx'), 'FamilyCottage')
const ResponsibilityRolePage = lazyNamed(() => import('./v3/pages/FamilyCottage.jsx'), 'FamilyRole')
const ResponsibilityPlayPage = lazyNamed(() => import('./v3/pages/FamilyCottage.jsx'), 'FamilyPlay')
const ResponsibilityParentPage = lazyNamed(() => import('./pages/ResponsibilityParentPage.jsx'), 'ResponsibilityParentPage')
const AccessibilityPage = lazyNamed(() => import('./pages/AccessibilityPage.jsx'), 'AccessibilityPage')
const DevicesPage = lazyNamed(() => import('./pages/DevicesPage.jsx'), 'DevicesPage')
const DataPage = lazyNamed(() => import('./pages/DataPage.jsx'), 'DataPage')
const InventorWorkshopPage = lazyNamed(() => import('./v3/pages/InventorWorkshop.jsx'), 'InventorWorkshop')
const InventorNewPage = lazyNamed(() => import('./v3/pages/InventorWorkshop.jsx'), 'InventorNew')
const InventorProjectPage = lazyNamed(() => import('./v3/pages/InventorWorkshop.jsx'), 'InventorProject')
const InventorShowcasePage = lazyNamed(() => import('./v3/pages/InventorWorkshop.jsx'), 'InventorShowcase')
const InventorParentPage = lazyNamed(() => import('./pages/InventorParentPage.jsx'), 'InventorParentPage')
const AssistantPage = lazyNamed(() => import('./pages/AssistantPage.jsx'), 'AssistantPage')
const WeeklyReportPage = lazyNamed(() => import('./pages/RedesignPages.jsx'), 'RedesignParentGrowthPage')
const CompanionQuestionPage = lazyNamed(() => import('./v3/pages/CompanionQuestion.jsx'), 'CompanionQuestion')
const SyncStationPage = lazyNamed(() => import('./pages/SyncStationPage.jsx'), 'SyncStationPage')

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
        <Route element={<ChildStage />}>
          <Route path="/today" element={<TodayPage />} />
          <Route path="/world" element={<WorldPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/pet" element={<PetHomePage />} />
          <Route path="/tonight" element={<TonightPage />} />
          <Route path="/garden" element={<GardenPage />} />
          <Route path="/wishes" element={<WishesPage />} />
          <Route path="/movement" element={<MovementChoicePage />} />
          <Route path="/movement/ready/:activityId/:sessionId" element={<MovementReadyPage />} />
          <Route path="/movement/play/:sessionId" element={<MovementPlayPage />} />
          <Route path="/energy-plaza" element={<EnergyPlazaPage />} />
          <Route path="/reading" element={<ReadingShelfPage />} />
          <Route path="/story-treehouse" element={<ReadingShelfPage />} />
          <Route path="/reading/book/:bookId" element={<ReadingBookPage />} />
          <Route path="/reading/play/:sessionId" element={<ReadingPlayPage />} />
          <Route path="/responsibility" element={<FamilyCottagePage />} />
          <Route path="/family-cottage" element={<FamilyCottagePage />} />
          <Route path="/responsibility/role/:activityId/:sessionId" element={<ResponsibilityRolePage />} />
          <Route path="/responsibility/play/:activityId/:sessionId" element={<ResponsibilityPlayPage />} />
          <Route path="/inventor" element={<InventorWorkshopPage />} />
          <Route path="/inventor/new" element={<InventorNewPage />} />
          <Route path="/inventor/project/:projectId" element={<InventorProjectPage />} />
          <Route path="/inventor/showcase/:projectId" element={<InventorShowcasePage />} />
          <Route path="/companion-question" element={<CompanionQuestionPage />} />
        </Route>
        <Route path="/watering" element={<WateringPage />} />
        <Route path="/goodnight" element={<GoodnightPage />} />
        <Route path="/parent/unlock" element={<ParentGatePage />} />
        <Route element={<RequireParent />}>
          <Route path="/parent" element={<ParentConsole />}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<ParentOverviewPage />} />
            <Route path="timeline" element={<FamilyTimelinePage />} />
            <Route path="support" element={<SupportPage />} />
            <Route path="movement" element={<MovementParentPage />} />
            <Route path="reading" element={<ReadingParentPage />} />
            <Route path="responsibility" element={<ResponsibilityParentPage />} />
            <Route path="inventor" element={<InventorParentPage />} />
            <Route path="report" element={<WeeklyReportPage />} />
            <Route path="assistant" element={<AssistantPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="routine" element={<RoutinePage />} />
            <Route path="rewards" element={<RewardsPage />} />
            <Route path="pet" element={<PetParentPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="accessibility" element={<AccessibilityPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="data" element={<DataPage />} />
            <Route path="sync" element={<SyncStationPage />} />
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
  if (cloud.mode === 'pairing') return <Suspense fallback={<main className="cloud-loading" aria-live="polite"><span className="spinner" /></main>}><CloudPairPage onPaired={pairCloud} /></Suspense>
  return <><SoundEffectsBridge /><BrowserRouter basename={APP_BASENAME}><Suspense fallback={<main className="cloud-loading" aria-live="polite"><img src={appPath('assets/app-icon.png')} alt="" /><strong>正在打开这片小天地…</strong><span className="spinner" /></main>}><AppRoutes /></Suspense></BrowserRouter><UpdateNotice /></>
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
