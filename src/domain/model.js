import { DATA_VERSION, isV7State, mergeLegacyView, migrateV6ToV7, toLegacyView } from './v7.js'

export { DATA_VERSION }
export const ON_TIME_WINDOW_MINUTES = 15
export const EARLY_TIME_CONFIRM_MINUTES = 120

export const AGE_BANDS = ['4–6 岁', '7–9 岁', '10 岁以上']

export const CHARACTER_OPTIONS = [
  { id: 'bear', name: '眠眠熊' },
  { id: 'rabbit', name: '月兔' },
  { id: 'cloud', name: '云朵' },
  { id: 'space-cat', name: '太空猫' },
]

export const THEME_OPTIONS = [
  { id: 'moon-room', name: '月光卧室', assetId: 'lamp' },
  { id: 'forest', name: '森林小屋', assetId: 'park' },
  { id: 'space', name: '安静太空', assetId: 'pillow' },
]

export const DEFAULT_WISHES = [
  { id: 'bake', name: '一起做一件小手工', cost: 35, assetId: 'craft', enabled: true },
  { id: 'storybook', name: '选一本睡前故事', cost: 20, assetId: 'story', enabled: true },
  { id: 'picnic', name: '周末去公园玩', cost: 50, assetId: 'park', enabled: true },
]

export const DEFAULT_STEPS = [
  { id: 'brush', title: '刷牙', icon: 'brush', duration: 3, enabled: true },
  { id: 'wash', title: '洗脸', icon: 'wash', duration: 2, enabled: true },
  { id: 'pajamas', title: '换睡衣', icon: 'pajamas', duration: 3, enabled: true },
  { id: 'story', title: '读故事', icon: 'story', duration: 10, enabled: true },
  { id: 'tidy', title: '收玩具', icon: 'toys', duration: 5, enabled: false },
  { id: 'toilet', title: '上厕所', icon: 'toilet', duration: 3, enabled: false },
]

export const DEFAULT_ACCESSIBILITY = {
  reduceMotion: false,
  soundOff: false,
  readTasks: false,
  highContrast: false,
  largeText: false,
}

export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function localDateKey(date = new Date(), rolloverHour = 4) {
  const copy = new Date(date)
  if (copy.getHours() < rolloverHour) copy.setDate(copy.getDate() - 1)
  const year = copy.getFullYear()
  const month = String(copy.getMonth() + 1).padStart(2, '0')
  const day = String(copy.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return localDateKey(date, 0)
}

export function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0
  return hours * 60 + minutes
}

export function minutesToTime(value) {
  const normalized = ((value % 1440) + 1440) % 1440
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

export function dayTypeFor(date = new Date()) {
  const day = date.getDay()
  return day === 0 || day === 6 ? 'weekend' : 'weekday'
}

function createProfile(profileId = 'child-1', overrides = {}) {
  return {
    id: profileId,
    name: '小雨',
    ageBand: '7–9 岁',
    character: 'bear',
    theme: 'moon-room',
    companionMode: 'together',
    ...overrides,
  }
}

function createSchedules(profileId) {
  return [
    { id: `schedule-${profileId}-weekday`, profileId, dayType: 'weekday', prepareTime: '20:30', bedTime: '21:00', reminderMinutes: 30, reminderEnabled: true, pending: null },
    { id: `schedule-${profileId}-weekend`, profileId, dayType: 'weekend', prepareTime: '21:00', bedTime: '21:30', reminderMinutes: 30, reminderEnabled: true, pending: null },
  ]
}

function createRoutines(profileId) {
  return [
    { id: `routine-${profileId}-weekday`, profileId, dayType: 'weekday', steps: structuredClone(DEFAULT_STEPS) },
    { id: `routine-${profileId}-weekend`, profileId, dayType: 'weekend', steps: structuredClone(DEFAULT_STEPS) },
  ]
}

export function isRoutineOpen(schedule, date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes()
  const prepare = timeToMinutes(schedule?.prepareTime || '20:30')
  return now >= prepare || now < 4 * 60
}

export function createDefaultLegacyData() {
  const now = Date.now()
  const profile = createProfile()
  return {
    version: 6,
    setupComplete: false,
    activeProfileId: 'child-1',
    profiles: [profile],
    security: { pinHash: null },
    schedules: createSchedules(profile.id),
    routines: createRoutines(profile.id),
    sessions: {},
    starLedger: [],
    rewardMoments: [],
    wishes: structuredClone(DEFAULT_WISHES),
    rewardRequests: [],
    accessibilityByProfile: { [profile.id]: { ...DEFAULT_ACCESSIBILITY } },
    legacy: null,
    meta: { createdAt: now, updatedAt: now },
  }
}

export function createDefaultData() {
  const root = migrateV6ToV7(createDefaultLegacyData())
  return toLegacyView(root, root.profiles[0].id)
}

export function getActiveProfile(data) {
  const view = toLegacyView(data, data.activeProfileId)
  return view.profiles.find((profile) => profile.id === view.activeProfileId) || view.profiles[0]
}

export function getAccessibility(data, profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  return view.accessibilityByProfile?.[profileId || view.activeProfileId] || view.accessibility || DEFAULT_ACCESSIBILITY
}

export function getSchedule(data, dayType = dayTypeFor(), dateKey = localDateKey(), profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  const targetProfileId = profileId || view.activeProfileId
  const schedule = view.schedules.find((item) => item.profileId === targetProfileId && item.dayType === dayType)
  if (!schedule) return createDefaultLegacyData().schedules[0]
  if (schedule.pending && dateKey >= schedule.pending.effectiveFrom) {
    return { ...schedule, ...schedule.pending, pending: null }
  }
  return schedule
}

export function getRoutine(data, dayType = dayTypeFor(), profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  const targetProfileId = profileId || view.activeProfileId
  return view.routines.find((item) => item.profileId === targetProfileId && item.dayType === dayType) || createDefaultLegacyData().routines[0]
}

export function getSession(data, dateKey = localDateKey(), profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  return view.sessions[`${profileId || view.activeProfileId}:${dateKey}`] || null
}

export function getStarBalance(data, profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  const targetProfileId = profileId || view.activeProfileId
  return view.starLedger.reduce((sum, entry) => {
    const belongsToChild = entry.profileId === targetProfileId || (!entry.profileId && view.profiles.length === 1)
    return belongsToChild ? sum + Number(entry.delta || 0) : sum
  }, 0)
}

export function getRewardMoments(data, profileId = data.activeProfileId) {
  const view = toLegacyView(data, profileId)
  const targetProfileId = profileId || view.activeProfileId
  return (view.rewardMoments || [])
    .filter((moment) => moment.profileId === targetProfileId && !moment.revertedAt)
    .sort((a, b) => Number(b.occurredAt || b.createdAt || 0) - Number(a.occurredAt || a.createdAt || 0))
}

export function getCompletionOutcome(session) {
  if (!session || session.status !== 'goodnight') return 'none'
  if (Number(session.starsAwarded ?? session.earlyMinutes ?? 0) > 0) return 'early'
  if (session.completedOnTime === true) return 'on-time'
  if (Number(session.completionLateMinutes ?? session.lateMinutes ?? 0) > 0) return 'after-target'
  return 'completed'
}

export function getEarlyMinutes(dateKey, bedTime, timestamp) {
  const plannedAt = new Date(`${dateKey}T${bedTime}:00`).getTime()
  if (!Number.isFinite(plannedAt) || !Number.isFinite(timestamp) || timestamp >= plannedAt) return 0
  return Math.max(1, Math.ceil((plannedAt - timestamp) / 60000))
}

export function getLateMinutes(dateKey, bedTime, timestamp) {
  const plannedAt = new Date(`${dateKey}T${bedTime}:00`).getTime()
  if (!Number.isFinite(plannedAt) || !Number.isFinite(timestamp) || timestamp <= plannedAt) return 0
  return Math.max(1, Math.ceil((timestamp - plannedAt) / 60000))
}

function createSession(data, dateKey, timestamp) {
  const date = new Date(`${dateKey}T12:00:00`)
  const routine = getRoutine(data, dayTypeFor(date))
  const schedule = getSchedule(data, dayTypeFor(date), dateKey)
  const stepStatus = Object.fromEntries(routine.steps.filter((step) => step.enabled).map((step) => [step.id, 'todo']))
  const targetRoutineCompleteAt = new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
  return {
    id: `${data.activeProfileId}:${dateKey}`,
    profileId: data.activeProfileId,
    dateKey,
    status: 'in_progress',
    routineStartedAt: timestamp,
    targetRoutineCompleteAt,
    routineCompletedAt: null,
    inBedAt: null,
    asleepAt: null,
    asleepAtSource: null,
    asleepAtAccuracy: null,
    timeSources: {
      routineStartedAt: 'first-task-interaction',
      targetRoutineCompleteAt: 'schedule-snapshot',
      routineCompletedAt: null,
      inBedAt: null,
      asleepAt: null,
    },
    startedAt: timestamp,
    confirmedAt: null,
    rewarded: false,
    stepStatus,
  }
}

export function isWithinBedtimeWindow(dateKey, bedTime, timestamp) {
  const planned = new Date(`${dateKey}T${bedTime}:00`).getTime()
  return Math.abs(timestamp - planned) <= ON_TIME_WINDOW_MINUTES * 60000
}

function updateTaskState(state, action, taskStatus) {
  const timestamp = action.timestamp || Date.now()
  const dateKey = action.dateKey || localDateKey(new Date(timestamp))
  const sessionKey = `${state.activeProfileId}:${dateKey}`
  const session = state.sessions[sessionKey] || createSession(state, dateKey, timestamp)
  if (session.rewarded || session.status === 'goodnight') return state
  const stepStatus = { ...session.stepStatus, [action.stepId]: taskStatus }
  const allResolved = Object.values(stepStatus).every((status) => status !== 'todo')
  const routineCompletedAt = allResolved ? (session.routineCompletedAt || timestamp) : null
  return {
    ...state,
    sessions: {
      ...state.sessions,
      [sessionKey]: {
        ...session,
        routineStartedAt: session.routineStartedAt || session.startedAt || timestamp,
        startedAt: session.startedAt || timestamp,
        routineCompletedAt,
        timeSources: {
          ...(session.timeSources || {}),
          routineStartedAt: session.timeSources?.routineStartedAt || 'first-task-interaction',
          routineCompletedAt: allResolved ? 'last-task-interaction' : null,
        },
        stepStatus,
        status: allResolved ? 'ready' : 'in_progress',
      },
    },
  }
}

function legacyBedtimeReducer(state, action) {
  switch (action.type) {
    case 'SETUP_COMPLETE': {
      const profile = {
        ...state.profiles[0],
        name: action.payload.childName.trim() || '小雨',
        ageBand: action.payload.ageBand,
        companionMode: action.payload.companionMode,
      }
      const schedules = state.schedules.map((schedule) => ({
        ...schedule,
        prepareTime: schedule.dayType === 'weekday' ? action.payload.prepareTime : action.payload.weekendPrepareTime,
        bedTime: schedule.dayType === 'weekday' ? action.payload.bedTime : action.payload.weekendBedTime,
        reminderMinutes: action.payload.reminderMinutes,
      }))
      const routines = action.payload.initialSteps
        ? state.routines.map((routine) => ({ ...routine, steps: structuredClone(action.payload.initialSteps) }))
        : state.routines
      return {
        ...state,
        setupComplete: true,
        profiles: [profile],
        schedules,
        routines,
        security: { pinHash: action.payload.pinHash },
      }
    }
    case 'COMPLETE_TASK':
      return updateTaskState(state, action, 'done')
    case 'SKIP_TASK':
      return updateTaskState(state, action, 'skipped')
    case 'RESET_TASK':
      return updateTaskState(state, action, 'todo')
    case 'CONFIRM_BED': {
      const timestamp = action.timestamp || Date.now()
      const dateKey = action.dateKey || localDateKey(new Date(timestamp))
      const sessionKey = `${state.activeProfileId}:${dateKey}`
      const session = state.sessions[sessionKey] || createSession(state, dateKey, timestamp)
      if (session.rewarded) return state
      const allResolved = Object.values(session.stepStatus || {}).length > 0
        && Object.values(session.stepStatus).every((status) => status !== 'todo')
      if (!allResolved) return state
      const schedule = getSchedule(state, dayTypeFor(new Date(`${dateKey}T12:00:00`)), dateKey)
      const routineCompletedAt = session.routineCompletedAt || timestamp
      const targetRoutineCompleteAt = session.targetRoutineCompleteAt || new Date(`${dateKey}T${schedule.bedTime}:00`).getTime()
      const targetTime = new Date(targetRoutineCompleteAt)
      const targetBedTime = `${String(targetTime.getHours()).padStart(2, '0')}:${String(targetTime.getMinutes()).padStart(2, '0')}`
      const onTime = routineCompletedAt <= targetRoutineCompleteAt
      const earlyMinutes = getEarlyMinutes(dateKey, targetBedTime, routineCompletedAt)
      const lateMinutes = getLateMinutes(dateKey, targetBedTime, routineCompletedAt)
      const award = earlyMinutes > 0
        ? { id: uid('star'), profileId: state.activeProfileId, delta: earlyMinutes, reason: `提前 ${earlyMinutes} 分钟完成睡前任务`, sessionKey, createdAt: timestamp }
        : null
      const rewardMoment = {
        id: uid('moment'),
        profileId: state.activeProfileId,
        type: earlyMinutes > 0 ? 'bedtime' : 'bedtime-complete',
        title: earlyMinutes > 0 ? `提前 ${earlyMinutes} 分钟完成任务` : '今晚也完成了',
        note: earlyMinutes > 0
          ? '今晚获得的星光'
          : lateMinutes > 0 ? `比计划晚 ${lateMinutes} 分钟，没有扣星光` : '按自己的节奏完成，没有扣星光',
        points: earlyMinutes,
        assetId: earlyMinutes > 0 ? 'lamp' : 'pillow',
        occurredAt: timestamp,
        createdAt: timestamp,
        sessionKey,
        ledgerEntryId: award?.id || null,
      }
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionKey]: {
            ...session,
            status: 'goodnight',
            targetRoutineCompleteAt,
            routineCompletedAt,
            inBedAt: timestamp,
            confirmedAt: timestamp,
            rewarded: true,
            starsAwarded: earlyMinutes,
            earlyMinutes,
            lateMinutes,
            completionEarlyMinutes: earlyMinutes,
            completionLateMinutes: lateMinutes,
            onTime,
            completedOnTime: onTime,
            timeSources: {
              ...(session.timeSources || {}),
              targetRoutineCompleteAt: session.timeSources?.targetRoutineCompleteAt || 'schedule-snapshot',
              routineCompletedAt: session.timeSources?.routineCompletedAt || 'confirmation-fallback',
              inBedAt: 'child-confirmation',
            },
          },
        },
        starLedger: award ? [...state.starLedger, award] : state.starLedger,
        rewardMoments: [rewardMoment, ...(state.rewardMoments || [])],
      }
    }
    case 'UNDO_BEDTIME_SETTLEMENT': {
      const profileId = action.profileId || state.activeProfileId
      const sessionKey = `${profileId}:${action.dateKey}`
      const session = state.sessions[sessionKey]
      if (!session?.rewarded && session?.status !== 'goodnight') return state
      const sessions = { ...state.sessions }
      delete sessions[sessionKey]
      return {
        ...state,
        sessions,
        starLedger: state.starLedger.filter((entry) => entry.sessionKey !== sessionKey),
        rewardMoments: (state.rewardMoments || []).filter((moment) => moment.sessionKey !== sessionKey),
      }
    }
    case 'RECORD_ASLEEP_TIME': {
      const sessionKey = `${state.activeProfileId}:${action.dateKey}`
      const session = state.sessions[sessionKey]
      const asleepAt = Number(action.timestamp)
      if (!session?.inBedAt || !Number.isFinite(asleepAt) || asleepAt < session.inBedAt) return state
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionKey]: {
            ...session,
            asleepAt,
            asleepAtSource: action.source || 'parent-estimate',
            asleepAtAccuracy: action.accuracy || 'approximate',
            sleepEntrySkippedAt: null,
            timeSources: { ...(session.timeSources || {}), asleepAt: action.source || 'parent-estimate' },
          },
        },
      }
    }
    case 'SKIP_ASLEEP_TIME': {
      const sessionKey = `${state.activeProfileId}:${action.dateKey}`
      const session = state.sessions[sessionKey]
      if (!session?.inBedAt) return state
      return {
        ...state,
        sessions: {
          ...state.sessions,
          [sessionKey]: { ...session, sleepEntrySkippedAt: action.timestamp || Date.now() },
        },
      }
    }
    case 'ADD_REWARD_EVENT': {
      const title = String(action.payload?.title || '').trim()
      const points = Math.max(0, Math.floor(Number(action.payload?.points) || 0))
      if (!title) return state
      const timestamp = action.timestamp || Date.now()
      const occurredAt = Number(action.payload?.occurredAt) || timestamp
      const momentId = action.payload?.id || uid('moment')
      const ledgerEntry = points > 0
        ? { id: uid('star'), profileId: state.activeProfileId, delta: points, reason: title, rewardMomentId: momentId, createdAt: timestamp }
        : null
      const moment = {
        id: momentId,
        profileId: state.activeProfileId,
        type: 'manual',
        title,
        note: String(action.payload?.note || '').trim(),
        points,
        assetId: action.payload?.assetId || 'heart',
        occurredAt,
        createdAt: timestamp,
        undoUntil: timestamp + 30000,
        ledgerEntryId: ledgerEntry?.id || null,
      }
      return {
        ...state,
        rewardMoments: [moment, ...(state.rewardMoments || [])],
        starLedger: ledgerEntry ? [...state.starLedger, ledgerEntry] : state.starLedger,
      }
    }
    case 'UNDO_REWARD_EVENT': {
      const timestamp = action.timestamp || Date.now()
      const moment = (state.rewardMoments || []).find((item) => item.id === action.momentId)
      if (!moment || moment.type !== 'manual' || moment.revertedAt || timestamp > moment.undoUntil) return state
      const reversal = moment.points > 0
        ? { id: uid('star'), profileId: moment.profileId, delta: -moment.points, reason: `撤销误记：${moment.title}`, rewardMomentId: moment.id, createdAt: timestamp }
        : null
      return {
        ...state,
        rewardMoments: state.rewardMoments.map((item) => item.id === moment.id ? { ...item, revertedAt: timestamp, undoUntil: null } : item),
        starLedger: reversal ? [...state.starLedger, reversal] : state.starLedger,
      }
    }
    case 'UPDATE_SCHEDULE': {
      return {
        ...state,
        schedules: state.schedules.map((schedule) =>
          schedule.profileId === state.activeProfileId && schedule.dayType === action.payload.dayType
            ? { ...schedule, pending: { ...action.payload, effectiveFrom: action.payload.effectiveFrom } }
            : schedule,
        ),
      }
    }
    case 'UPDATE_ROUTINE': {
      return {
        ...state,
        routines: state.routines.map((routine) =>
          routine.profileId === state.activeProfileId && routine.dayType === action.payload.dayType
            ? { ...routine, steps: action.payload.steps }
            : routine,
        ),
      }
    }
    case 'REQUEST_REWARD': {
      const wish = state.wishes.find((item) => item.id === action.wishId)
      if (!wish || getStarBalance(state) < wish.cost) return state
      const existing = state.rewardRequests.find((item) => item.profileId === state.activeProfileId && item.wishId === wish.id && item.status === 'pending')
      if (existing) return state
      return {
        ...state,
        rewardRequests: [
          { id: uid('request'), wishId: wish.id, profileId: state.activeProfileId, status: 'pending', requestedAt: Date.now(), updatedAt: Date.now() },
          ...state.rewardRequests,
        ],
      }
    }
    case 'APPROVE_REWARD': {
      const request = state.rewardRequests.find((item) => item.id === action.requestId)
      const wish = state.wishes.find((item) => item.id === request?.wishId)
      if (!request || !wish || request.status !== 'pending' || getStarBalance(state, request.profileId) < wish.cost) return state
      const timestamp = action.timestamp || Date.now()
      return {
        ...state,
        rewardRequests: state.rewardRequests.map((item) =>
          item.id === request.id ? { ...item, status: 'approved', updatedAt: timestamp, undoUntil: timestamp + 30000 } : item,
        ),
        starLedger: [
          ...state.starLedger,
          { id: uid('star'), profileId: request.profileId, delta: -wish.cost, reason: `兑换：${wish.name}`, requestId: request.id, createdAt: timestamp },
        ],
      }
    }
    case 'UNDO_REWARD': {
      const request = state.rewardRequests.find((item) => item.id === action.requestId)
      const wish = state.wishes.find((item) => item.id === request?.wishId)
      const timestamp = action.timestamp || Date.now()
      if (!request || !wish || request.status !== 'approved' || timestamp > request.undoUntil) return state
      return {
        ...state,
        rewardRequests: state.rewardRequests.map((item) =>
          item.id === request.id ? { ...item, status: 'pending', updatedAt: timestamp, undoUntil: null } : item,
        ),
        starLedger: [
          ...state.starLedger,
          { id: uid('star'), profileId: request.profileId, delta: wish.cost, reason: `撤销兑换：${wish.name}`, requestId: request.id, createdAt: timestamp },
        ],
      }
    }
    case 'ADD_PROFILE': {
      if (!action.payload?.id || state.profiles.some((profile) => profile.id === action.payload.id)) return state
      const profile = createProfile(action.payload.id, action.payload)
      return {
        ...state,
        activeProfileId: profile.id,
        profiles: [...state.profiles, profile],
        schedules: [...state.schedules, ...createSchedules(profile.id)],
        routines: [...state.routines, ...createRoutines(profile.id)],
        accessibilityByProfile: { ...state.accessibilityByProfile, [profile.id]: { ...DEFAULT_ACCESSIBILITY } },
      }
    }
    case 'SWITCH_PROFILE':
      return state.profiles.some((profile) => profile.id === action.profileId) ? { ...state, activeProfileId: action.profileId } : state
    case 'DELETE_PROFILE': {
      if (state.profiles.length <= 1 || !state.profiles.some((profile) => profile.id === action.profileId)) return state
      const profiles = state.profiles.filter((profile) => profile.id !== action.profileId)
      const accessibilityByProfile = { ...state.accessibilityByProfile }
      delete accessibilityByProfile[action.profileId]
      return {
        ...state,
        activeProfileId: state.activeProfileId === action.profileId ? profiles[0].id : state.activeProfileId,
        profiles,
        schedules: state.schedules.filter((schedule) => schedule.profileId !== action.profileId),
        routines: state.routines.filter((routine) => routine.profileId !== action.profileId),
        sessions: Object.fromEntries(Object.entries(state.sessions).filter(([, session]) => session.profileId !== action.profileId)),
        starLedger: state.starLedger.filter((entry) => entry.profileId !== action.profileId),
        rewardMoments: (state.rewardMoments || []).filter((moment) => moment.profileId !== action.profileId),
        rewardRequests: state.rewardRequests.filter((request) => request.profileId !== action.profileId),
        accessibilityByProfile,
      }
    }
    case 'UPDATE_PROFILE':
      return { ...state, profiles: state.profiles.map((profile) => profile.id === state.activeProfileId ? { ...profile, ...action.payload } : profile) }
    case 'UPDATE_WISHES':
      return { ...state, wishes: action.payload }
    case 'UPDATE_ACCESSIBILITY':
      return {
        ...state,
        accessibilityByProfile: {
          ...state.accessibilityByProfile,
          [state.activeProfileId]: { ...getAccessibility(state), ...action.payload },
        },
      }
    case 'REPLACE_DATA':
      return action.payload
    default:
      return state
  }
}

export function bedtimeReducer(state, action) {
  const profileId = action?.profileId || action?.target?.profileId || state?.activeProfileId || state?.profiles?.[0]?.id
  const legacy = toLegacyView(state, profileId)
  const next = legacyBedtimeReducer(legacy, { ...action, profileId })
  if (next === legacy) return state
  if (!isV7State(state)) return next
  return toLegacyView(mergeLegacyView(state, next), next.activeProfileId || profileId)
}

export function getLastSevenDays(data, now = new Date()) {
  const view = toLegacyView(data, data.activeProfileId)
  const today = localDateKey(now)
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = addDays(today, index - 6)
    const date = new Date(`${dateKey}T12:00:00`)
    const session = getSession(view, dateKey)
    const schedule = getSchedule(view, dayTypeFor(date), dateKey)
    return { dateKey, date, session, schedule }
  })
}

export function getSessionHistory(data, { days = null, now = new Date() } = {}) {
  const view = toLegacyView(data, data.activeProfileId)
  const threshold = Number.isFinite(days) ? addDays(localDateKey(now), -(Math.max(1, days) - 1)) : null
  return Object.values(view.sessions || {})
    .filter((session) => session?.profileId === view.activeProfileId && (!threshold || session.dateKey >= threshold))
    .sort((left, right) => String(right.dateKey || right.id).localeCompare(String(left.dateKey || left.id)))
}

export function getWeeklyMetrics(data, now = new Date()) {
  const days = getLastSevenDays(data, now)
  const completed = days.filter(({ session }) => session?.status === 'goodnight').length
  const onTime = days.filter(({ session }) => session?.routineCompletedAt && session?.targetRoutineCompleteAt && session.routineCompletedAt <= session.targetRoutineCompleteAt).length
  const durations = days
    .filter(({ session }) => session?.routineStartedAt && session?.routineCompletedAt)
    .map(({ session }) => Math.max(1, Math.round((session.routineCompletedAt - session.routineStartedAt) / 60000)))
  const averageMinutes = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0
  const lateMinutes = days.flatMap(({ session }) => session?.completionLateMinutes ? [session.completionLateMinutes] : []).filter(Boolean)
  const lateCount = lateMinutes.length
  const averageLateMinutes = lateCount ? Math.round(lateMinutes.reduce((sum, value) => sum + value, 0) / lateCount) : 0
  const toBedDurations = days.flatMap(({ session }) => session?.routineCompletedAt && session?.inBedAt ? [Math.max(0, Math.round((session.inBedAt - session.routineCompletedAt) / 60000))] : [])
  const sleepLatencies = days.flatMap(({ session }) => session?.inBedAt && session?.asleepAt ? [Math.max(0, Math.round((session.asleepAt - session.inBedAt) / 60000))] : [])
  const averageToBedMinutes = toBedDurations.length ? Math.round(toBedDurations.reduce((sum, value) => sum + value, 0) / toBedDurations.length) : 0
  const averageSleepLatency = sleepLatencies.length ? Math.round(sleepLatencies.reduce((sum, value) => sum + value, 0) / sleepLatencies.length) : 0
  return { completed, onTime, averageMinutes, lateCount, averageLateMinutes, averageToBedMinutes, averageSleepLatency, sleepRecorded: sleepLatencies.length, days }
}
