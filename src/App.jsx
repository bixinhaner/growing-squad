import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { KidShell } from './v4/kid/KidShell.jsx'
import { GrowingSquadProvider } from './core/store/GrowingSquadProvider.jsx'
import { DeviceProvider } from './core/device/DeviceProvider.jsx'
import { APP_BASENAME, appPath } from './data/paths.js'
import { useBedtimeActions, useBedtimeState } from './store/useBedtime.js'
import { Icon } from './v4/ui/Icon.jsx'
import { SoundEffectsBridge } from './audio/SoundEffectsBridge.jsx'
import '@fontsource-variable/fredoka'
import './v4/theme.css'

const lazyNamed = (load, name) => lazy(() => load().then((module) => ({ default: module[name] })))
const entry = () => import('./v4/entry/Entry.jsx')
const WelcomePage = lazyNamed(entry, 'Welcome')
const SetupPage = lazyNamed(entry, 'Setup')
const CloudPairPage = lazyNamed(entry, 'Pair')
const ParentGatePage = lazyNamed(entry, 'ParentGate')
const NowPage = lazyNamed(() => import('./v4/kid/Now.jsx'), 'Now')
const TonightPage = lazyNamed(() => import('./v4/kid/TonightPath.jsx'), 'TonightPath')
const PlayPage = lazyNamed(() => import('./v4/kid/Play.jsx'), 'Play')
const BoxPage = lazyNamed(() => import('./v4/kid/Box.jsx'), 'Box')
const Pet = lazyNamed(() => import('./v4/kid/Pet.jsx'), 'Pet')
const WateringPage = lazyNamed(() => import('./v4/kid/Ritual.jsx'), 'Watering')
const GoodnightPage = lazyNamed(() => import('./v4/kid/Ritual.jsx'), 'Goodnight')
const MovementChoicePage = lazyNamed(() => import('./v4/kid/Movement.jsx'), 'MovementHome')
const MovementPlayPage = lazyNamed(() => import('./v4/kid/Movement.jsx'), 'MovementPlay')
const ReadingShelfPage = lazyNamed(() => import('./v4/kid/Reading.jsx'), 'ReadingHome')
const ReadingBookPage = lazyNamed(() => import('./v4/kid/Reading.jsx'), 'ReadingBookRedirect')
const ReadingPlayPage = lazyNamed(() => import('./v4/kid/Reading.jsx'), 'ReadingPlay')
const FamilyCottagePage = lazyNamed(() => import('./v4/kid/Family.jsx'), 'FamilyHome')
const ResponsibilityRolePage = lazyNamed(() => import('./v4/kid/Family.jsx'), 'FamilyRole')
const ResponsibilityPlayPage = lazyNamed(() => import('./v4/kid/Family.jsx'), 'FamilyPlay')
const InventorWorkshopPage = lazyNamed(() => import('./v4/kid/Inventor.jsx'), 'InventorHome')
const InventorNewPage = lazyNamed(() => import('./v4/kid/Inventor.jsx'), 'InventorNew')
const InventorProjectPage = lazyNamed(() => import('./v4/kid/Inventor.jsx'), 'InventorProject')
const InventorShowcasePage = lazyNamed(() => import('./v4/kid/Inventor.jsx'), 'InventorShowcase')
const CompanionQuestionPage = lazyNamed(() => import('./v4/kid/Ask.jsx'), 'Ask')

const growth = () => import('./v4/parent/Growth.jsx')
const modules = () => import('./v4/parent/Modules.jsx')
const plan = () => import('./v4/parent/Plan.jsx')
const family = () => import('./v4/parent/Family.jsx')
const ParentShell = lazyNamed(() => import('./v4/parent/ParentShell.jsx'), 'ParentShell')
const ParentNow = lazyNamed(() => import('./v4/parent/ParentNow.jsx'), 'ParentNow')
const GrowthLayout = lazyNamed(growth, 'GrowthLayout')
const GrowthMoments = lazyNamed(growth, 'GrowthMoments')
const GrowthSleep = lazyNamed(growth, 'GrowthSleep')
const GrowthSupport = lazyNamed(growth, 'GrowthSupport')
const GrowthAssistant = lazyNamed(growth, 'GrowthAssistant')
const ModuleMovement = lazyNamed(modules, 'ModuleMovement')
const ModuleReading = lazyNamed(modules, 'ModuleReading')
const ModuleChores = lazyNamed(modules, 'ModuleChores')
const ModuleInventor = lazyNamed(modules, 'ModuleInventor')
const ModulePet = lazyNamed(modules, 'ModulePet')
const PlanLayout = lazyNamed(plan, 'PlanLayout')
const PlanSchedule = lazyNamed(plan, 'PlanSchedule')
const PlanRoutine = lazyNamed(plan, 'PlanRoutine')
const PlanDay = lazyNamed(plan, 'PlanDay')
const PlanWishes = lazyNamed(plan, 'PlanWishes')
const FamilyLayout = lazyNamed(family, 'FamilyLayout')
const FamilyKids = lazyNamed(family, 'FamilyKids')
const FamilyDisplay = lazyNamed(family, 'FamilyDisplay')
const FamilyDevices = lazyNamed(family, 'FamilyDevices')
const FamilyData = lazyNamed(family, 'FamilyData')
const FamilySync = lazyNamed(family, 'FamilySync')

// Addresses from earlier versions (bookmarks, stored activity routes) keep working.
const LEGACY_CHILD = [
  ['/world', '/play'], ['/me', '/box?tab=memories'], ['/garden', '/box?tab=garden'], ['/wishes', '/box?tab=wishes'],
  ['/energy-plaza', '/movement'], ['/story-treehouse', '/reading'], ['/family-cottage', '/family'], ['/responsibility', '/family'],
  ['/companion-question', '/ask'],
]

function LegacyFamily({ kind }) {
  const { activityId, sessionId } = useParams()
  return <Navigate to={`/family/${kind}/${activityId}/${sessionId}`} replace />
}

// Parent addresses from v1–v3 map onto the four v4 sections.
const LEGACY_PARENT = [
  ['report', 'growth'], ['support', 'growth/support'], ['movement', 'growth/movement'], ['reading', 'growth/reading'],
  ['responsibility', 'growth/chores'], ['inventor', 'growth/inventor'], ['pet', 'growth/pet'], ['assistant', 'growth/assistant'],
  ['schedule', 'plan'], ['routine', 'plan/routine'], ['timeline', 'plan/day'], ['rewards', 'plan/wishes'],
  ['profile', 'family'], ['accessibility', 'family/display'], ['devices', 'family/devices'], ['data', 'family/data'], ['sync', 'family/sync'],
]

function LegacyOverview() {
  const [params] = useSearchParams()
  return <Navigate to={params.get('view') === 'bedtime' ? '/parent/growth/sleep' : '/parent'} replace />
}

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
        <main className="u-fatal">
          <span><Icon name="moon" size={48} /></span><h1 className="u-display">页面暂时没有准备好</h1><p>记录都还在。刷新一下再试试。</p>
          <button className="u-tap u-tap--primary u-tap--l" type="button" onClick={() => window.location.reload()}>重新打开</button>
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
        <Route element={<KidShell />}>
          <Route path="/today" element={<NowPage />} />
          <Route path="/tonight" element={<TonightPage />} />
          <Route path="/play" element={<PlayPage />} />
          <Route path="/box" element={<BoxPage />} />
          <Route path="/pet" element={<Pet />} />
          <Route path="/movement" element={<MovementChoicePage />} />
          <Route path="/movement/ready/:activityId/:sessionId" element={<MovementPlayPage />} />
          <Route path="/movement/play/:sessionId" element={<MovementPlayPage />} />
          <Route path="/reading" element={<ReadingShelfPage />} />
          <Route path="/reading/book/:bookId" element={<ReadingBookPage />} />
          <Route path="/reading/play/:sessionId" element={<ReadingPlayPage />} />
          <Route path="/family" element={<FamilyCottagePage />} />
          <Route path="/family/role/:activityId/:sessionId" element={<ResponsibilityRolePage />} />
          <Route path="/family/play/:activityId/:sessionId" element={<ResponsibilityPlayPage />} />
          <Route path="/inventor" element={<InventorWorkshopPage />} />
          <Route path="/inventor/new" element={<InventorNewPage />} />
          <Route path="/inventor/project/:projectId" element={<InventorProjectPage />} />
          <Route path="/inventor/showcase/:projectId" element={<InventorShowcasePage />} />
          <Route path="/ask" element={<CompanionQuestionPage />} />
        </Route>
        {LEGACY_CHILD.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={to} replace />} />)}
        <Route path="/responsibility/role/:activityId/:sessionId" element={<LegacyFamily kind="role" />} />
        <Route path="/responsibility/play/:activityId/:sessionId" element={<LegacyFamily kind="play" />} />
        <Route path="/watering" element={<WateringPage />} />
        <Route path="/goodnight" element={<GoodnightPage />} />
        <Route path="/parent/unlock" element={<ParentGatePage />} />
        <Route element={<RequireParent />}>
          <Route path="/parent" element={<ParentShell />}>
            <Route index element={<ParentNow />} />
            <Route path="growth" element={<GrowthLayout />}>
              <Route index element={<GrowthMoments />} />
              <Route path="sleep" element={<GrowthSleep />} />
              <Route path="support" element={<GrowthSupport />} />
              <Route path="movement" element={<ModuleMovement />} />
              <Route path="reading" element={<ModuleReading />} />
              <Route path="chores" element={<ModuleChores />} />
              <Route path="inventor" element={<ModuleInventor />} />
              <Route path="pet" element={<ModulePet />} />
              <Route path="assistant" element={<GrowthAssistant />} />
            </Route>
            <Route path="plan" element={<PlanLayout />}>
              <Route index element={<PlanSchedule />} />
              <Route path="routine" element={<PlanRoutine />} />
              <Route path="day" element={<PlanDay />} />
              <Route path="wishes" element={<PlanWishes />} />
            </Route>
            <Route path="family" element={<FamilyLayout />}>
              <Route index element={<FamilyKids />} />
              <Route path="display" element={<FamilyDisplay />} />
              <Route path="devices" element={<FamilyDevices />} />
              <Route path="data" element={<FamilyData />} />
              <Route path="sync" element={<FamilySync />} />
            </Route>
            <Route path="overview" element={<LegacyOverview />} />
            {LEGACY_PARENT.map(([from, to]) => <Route key={from} path={from} element={<Navigate to={`/parent/${to}`} replace />} />)}
            <Route path="*" element={<Navigate to="/parent" replace />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

function Loading({ text }) {
  return <main className="u-loading" aria-live="polite"><img src={appPath('assets/app-icon.png')} alt="" /><span className="u-loading__dots" aria-hidden="true"><i /><i /><i /></span>{text ? <strong>{text}</strong> : <span className="u-sr">正在打开</span>}</main>
}

function CloudBoundary() {
  const { cloud } = useBedtimeState()
  const { pairCloud } = useBedtimeActions()
  if (cloud.mode === 'checking') {
    return <Loading text="正在连上家里的云端…" />
  }
  if (cloud.mode === 'pairing') return <Suspense fallback={<Loading />}><CloudPairPage onPaired={pairCloud} /></Suspense>
  return <><SoundEffectsBridge /><BrowserRouter basename={APP_BASENAME}><Suspense fallback={<Loading />}><AppRoutes /></Suspense></BrowserRouter><UpdateNotice /></>
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
  return <aside className="u-update" role="status"><Icon name="sparkle" size={20} /><span><strong>新版本准备好了</strong><small>睡前流程结束后再更新也可以</small></span><button type="button" className="u-tap u-tap--primary u-tap--s" onClick={() => { reloadRequested.current = true; worker.postMessage({ type: 'SKIP_WAITING' }) }}>现在更新</button><button type="button" className="u-tap u-tap--quiet u-tap--s u-tap--round" aria-label="稍后更新" onClick={() => setWorker(null)}><Icon name="close" size={16} /></button></aside>
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
