import { z } from 'zod'
import { DATA_VERSION, DEFAULT_ACCESSIBILITY, createDefaultData, createDefaultLegacyData, minutesToTime } from '../domain/model.js'
import { mergeLegacyView, migrateV6ToV7, normalizeV7, toLegacyView } from '../domain/v7.js'
import { normalizeAssetId } from '../domain/assets.js'

export const STORAGE_KEY = 'growing-squad:main:v7'
const V6_KEY = 'bedtime:main:v6'
const V5_KEY = 'bedtime:main:v5'
const V4_KEY = 'bedtime:main:v4'
const V3_KEY = 'bedtime:main:v3'
const LEGACY_KEY = 'bedtime:main:v2'
const BACKUP_PREFIX = 'growing-squad:backup:v7:'
const V6_BACKUP_PREFIX = 'bedtime:backup:v6:'
const V5_BACKUP_PREFIX = 'bedtime:backup:v5:'
const V4_BACKUP_PREFIX = 'bedtime:backup:v4:'
const V3_BACKUP_PREFIX = 'bedtime:backup:v3:'

const storedDataSchema = z.object({
  version: z.literal(6),
  setupComplete: z.boolean(),
  activeProfileId: z.string(),
  profiles: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  security: z.object({ pinHash: z.string().nullable() }),
  schedules: z.array(z.object({ id: z.string(), profileId: z.string(), dayType: z.enum(['weekday', 'weekend']) }).passthrough()),
  routines: z.array(z.object({ id: z.string(), profileId: z.string(), dayType: z.enum(['weekday', 'weekend']), steps: z.array(z.any()) }).passthrough()),
  sessions: z.record(z.string(), z.any()),
  starLedger: z.array(z.any()),
  rewardMoments: z.array(z.any()),
  wishes: z.array(z.any()),
  rewardRequests: z.array(z.any()),
  accessibilityByProfile: z.record(z.string(), z.object({
    reduceMotion: z.boolean(), soundOff: z.boolean(), readTasks: z.boolean(), highContrast: z.boolean(), largeText: z.boolean(),
  })),
  meta: z.object({ createdAt: z.number(), updatedAt: z.number() }).passthrough(),
}).passthrough()

function normalizeV6(value) {
  const parsed = storedDataSchema.safeParse(value)
  if (!parsed.success) throw new Error('本地数据结构不完整')
  const defaults = createDefaultLegacyData()
  const activeProfileId = parsed.data.profiles.some((profile) => profile.id === parsed.data.activeProfileId)
    ? parsed.data.activeProfileId
    : parsed.data.profiles[0]?.id
  if (!activeProfileId) throw new Error('至少需要一个孩子档案')
  const normalizedSessions = Object.fromEntries(Object.entries(parsed.data.sessions).map(([key, session]) => {
    if (session?.status === 'goodnight' && !session.routineCompletedAt && session.timeSources?.targetRoutineCompleteAt === 'schedule-backfill') {
      return [key, { ...session, targetRoutineCompleteAt: null, timeSources: { ...session.timeSources, targetRoutineCompleteAt: null } }]
    }
    return [key, session]
  }))
  const migrationReport = parsed.data.meta?.timeMigrationReport || {
    sourceVersion: value?.meta?.timeModelMigratedAt ? 5 : 6,
    sessionsReviewed: Object.keys(normalizedSessions).length,
    inBedBackfilled: Object.values(normalizedSessions).filter((session) => session?.timeSources?.inBedAt === 'v5-confirmed-at').length,
    targetBackfilled: Object.values(normalizedSessions).filter((session) => String(session?.timeSources?.targetRoutineCompleteAt || '').includes('backfill') || session?.timeSources?.targetRoutineCompleteAt === 'inferred-from-preserved-reward').length,
    completionLeftUnknown: Object.values(normalizedSessions).filter((session) => session?.inBedAt && !session?.routineCompletedAt).length,
    sleepLeftUnknown: Object.values(normalizedSessions).filter((session) => session?.inBedAt && !session?.asleepAt).length,
  }
  return {
    ...defaults,
    ...parsed.data,
    sessions: normalizedSessions,
    activeProfileId,
    routines: parsed.data.routines.map((routine) => ({
      ...routine,
      steps: routine.steps.map((step) => ({ ...step, icon: normalizeAssetId(step.icon, inferAssetFromText(step.title)) })),
    })),
    wishes: parsed.data.wishes.map((wish) => {
      const assetId = normalizeAssetId(wish.assetId || wish.emoji, inferAssetFromText(wish.name))
      return { ...wish, assetId: wish.id === 'picnic' && assetId === 'toys' ? 'park' : assetId }
    }),
    rewardMoments: parsed.data.rewardMoments.map((moment) => ({ ...moment, assetId: normalizeAssetId(moment.assetId, inferAssetFromText(moment.title)) })),
    accessibilityByProfile: Object.fromEntries(parsed.data.profiles.map((profile) => [
      profile.id,
      { ...DEFAULT_ACCESSIBILITY, ...parsed.data.accessibilityByProfile[profile.id] },
    ])),
    meta: { ...defaults.meta, ...parsed.data.meta, timeMigrationReport: migrationReport },
  }
}

function normalizeCurrentV7(value) {
  const root = normalizeV7(value)
  const view = toLegacyView(root, value.activeProfileId || root.profiles[0]?.id)
  return mergeLegacyView(root, {
    ...view,
    routines: view.routines.map((routine) => ({
      ...routine,
      steps: routine.steps.map((step) => ({ ...step, icon: normalizeAssetId(step.icon, inferAssetFromText(step.title)) })),
    })),
    wishes: view.wishes.map((wish) => {
      const assetId = normalizeAssetId(wish.assetId || wish.emoji, inferAssetFromText(wish.name))
      return { ...wish, assetId: wish.id === 'picnic' && assetId === 'toys' ? 'park' : assetId }
    }),
    rewardMoments: view.rewardMoments.map((moment) => ({ ...moment, assetId: normalizeAssetId(moment.assetId, inferAssetFromText(moment.title)) })),
  })
}

function scheduleForSession(value, session) {
  const date = new Date(`${session.dateKey}T12:00:00`)
  return value.schedules?.find((item) => item.profileId === session.profileId && item.dayType === (date.getDay() === 0 || date.getDay() === 6 ? 'weekend' : 'weekday'))
}

export function migrateV5(value) {
  if (!value || value.version !== 5 || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('v5 数据结构不完整')
  const sessions = Object.fromEntries(Object.entries(value.sessions || {}).map(([key, session]) => {
    const schedule = scheduleForSession(value, session)
    const activeSession = session.status === 'in_progress' || session.status === 'ready'
    const inferredTarget = session.confirmedAt && Number(session.earlyMinutes) > 0
      ? Number(session.confirmedAt) + Number(session.earlyMinutes) * 60000
      : activeSession && schedule?.bedTime ? new Date(`${session.dateKey}T${schedule.bedTime}:00`).getTime() : null
    return [key, {
      ...session,
      targetRoutineCompleteAt: Number.isFinite(session.targetRoutineCompleteAt) ? session.targetRoutineCompleteAt : inferredTarget,
      routineStartedAt: activeSession ? (session.routineStartedAt || session.startedAt || null) : null,
      routineCompletedAt: session.routineCompletedAt || null,
      inBedAt: session.inBedAt || session.confirmedAt || null,
      asleepAt: session.asleepAt || null,
      asleepAtSource: session.asleepAtSource || null,
      asleepAtAccuracy: session.asleepAtAccuracy || null,
      completionEarlyMinutes: Number(session.completionEarlyMinutes ?? session.earlyMinutes ?? 0),
      completionLateMinutes: Number(session.completionLateMinutes ?? session.lateMinutes ?? 0),
      completedOnTime: session.completedOnTime ?? null,
      timeSources: {
        routineStartedAt: activeSession && session.startedAt ? 'v5-session-start' : null,
        targetRoutineCompleteAt: session.confirmedAt && Number(session.earlyMinutes) > 0 ? 'inferred-from-preserved-reward' : inferredTarget ? 'active-schedule-snapshot' : null,
        routineCompletedAt: null,
        inBedAt: session.confirmedAt ? 'v5-confirmed-at' : null,
        asleepAt: null,
      },
    }]
  }))
  const migratedAt = Date.now()
  const sessionValues = Object.values(sessions)
  return normalizeV6({
    ...value,
    version: 6,
    sessions,
    meta: {
      ...value.meta,
      timeModelMigratedAt: migratedAt,
      timeMigrationReport: {
        sourceVersion: 5,
        migratedAt,
        sessionsReviewed: sessionValues.length,
        inBedBackfilled: sessionValues.filter((session) => session.inBedAt).length,
        targetBackfilled: sessionValues.filter((session) => session.targetRoutineCompleteAt).length,
        completionLeftUnknown: sessionValues.filter((session) => session.inBedAt && !session.routineCompletedAt).length,
        sleepLeftUnknown: sessionValues.filter((session) => session.inBedAt && !session.asleepAt).length,
        rewardLedgerEntriesPreserved: value.starLedger?.length || 0,
      },
    },
  })
}

function inferAssetFromText(text = '') {
  if (/滴眼|眼药/.test(text)) return 'eye-drops'
  if (/洗鼻|清洗鼻|鼻腔/.test(text)) return 'nasal-rinse'
  if (/刷牙|牙/.test(text)) return 'brush'
  if (/洗|水|喝/.test(text)) return 'wash'
  if (/衣/.test(text)) return 'pajamas'
  if (/冰淇淋/.test(text)) return 'icecream'
  if (/披萨/.test(text)) return 'pizza'
  if (/电影/.test(text)) return 'movie'
  if (/棉花糖/.test(text)) return 'marshmallow'
  if (/纪念币|硬币|熊猫/.test(text)) return 'coin'
  if (/骑行|自行车/.test(text)) return 'bicycle'
  if (/怪兽|勇敢|困难|做得很快/.test(text)) return 'courage'
  if (/外出|野餐/.test(text)) return 'outing'
  if (/小玩具/.test(text)) return 'toy-train'
  if (/书|故事|绘本|学习|电影|音乐/.test(text)) return 'story'
  if (/玩具|收拾/.test(text)) return 'toys'
  if (/厕所/.test(text)) return 'toilet'
  if (/书包/.test(text)) return 'backpack'
  if (/抱|爱|心|鼓励/.test(text)) return 'heart'
  if (/灯|星|提前|睡|晚安/.test(text)) return 'lamp'
  if (/枕|月/.test(text)) return 'pillow'
  if (/油|护肤/.test(text)) return 'lotion'
  if (/钙|药|营养/.test(text)) return 'vitamin'
  if (/画|手工/.test(text)) return 'craft'
  if (/游戏|桌游/.test(text)) return 'game'
  if (/吃|餐|饼|糖|冰淇淋|披萨/.test(text)) return 'pancake'
  if (/公园|外出|骑行|树/.test(text)) return 'park'
  return 'heart'
}

function deriveRewardMoments(value, activeProfileId) {
  const assetIds = ['lamp', 'heart', 'story', 'craft', 'park']
  return (value.starLedger || []).flatMap((entry, index) => {
    const points = Number(entry.delta || 0)
    if (points <= 0 || String(entry.reason || '').startsWith('撤销兑换')) return []
    return [{
      id: `moment-migrated-${entry.id || index}`,
      profileId: entry.profileId || entry.sessionKey?.split(':')[0] || activeProfileId,
      type: entry.sessionKey ? 'bedtime' : 'legacy',
      title: entry.reason || '历史奖励',
      note: '从原有星光记录保留',
      points,
      assetId: entry.sessionKey ? 'lamp' : assetIds[index % assetIds.length],
      occurredAt: entry.createdAt || Date.now(),
      createdAt: entry.createdAt || Date.now(),
      sessionKey: entry.sessionKey || null,
      ledgerEntryId: entry.id || null,
    }]
  })
}

function migrateV4(value) {
  if (!value || value.version !== 4 || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('旧版数据结构不完整')
  const activeProfileId = value.profiles.some((profile) => profile.id === value.activeProfileId) ? value.activeProfileId : value.profiles[0].id
  const wishes = (value.wishes || []).map((wish) => {
    const defaultCosts = { bake: [8, 35], storybook: [5, 20], picnic: [12, 50] }
    const [oldCost, newCost] = defaultCosts[wish.id] || []
    return { ...wish, cost: Number(wish.cost) === oldCost ? newCost : Number(wish.cost), assetId: normalizeAssetId(wish.assetId || wish.emoji, inferAssetFromText(wish.name)) }
  })
  return migrateV5({
    ...value,
    version: 5,
    activeProfileId,
    wishes,
    rewardMoments: Array.isArray(value.rewardMoments) ? value.rewardMoments : deriveRewardMoments(value, activeProfileId),
  })
}

function migrateV3(value) {
  if (!value || value.version !== 3 || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('旧版数据结构不完整')
  const activeProfileId = value.activeProfileId || value.profiles[0].id
  const accessibility = { ...DEFAULT_ACCESSIBILITY, ...(value.accessibility || {}) }
  const migrated = {
    ...value,
    version: 4,
    activeProfileId,
    starLedger: Array.isArray(value.starLedger) ? value.starLedger.map((entry) => ({
      ...entry,
      profileId: entry.profileId || entry.sessionKey?.split(':')[0] || activeProfileId,
    })) : [],
    rewardRequests: Array.isArray(value.rewardRequests) ? value.rewardRequests.map((request) => ({ ...request, profileId: request.profileId || activeProfileId })) : [],
    sessions: Object.fromEntries(Object.entries(value.sessions || {}).map(([key, session]) => [key, {
      ...session,
      profileId: session?.profileId || key.split(':')[0] || activeProfileId,
    }])),
    accessibilityByProfile: Object.fromEntries(value.profiles.map((profile) => [profile.id, { ...accessibility }])),
  }
  delete migrated.accessibility
  return migrateV4(migrated)
}

export function migrateLegacyData(value) {
  const next = createDefaultLegacyData()
  const settings = value?.settings || {}
  const plannedTime = settings.plannedTime || '21:00'
  const prepareTime = minutesToTime(Number(plannedTime.slice(0, 2)) * 60 + Number(plannedTime.slice(3, 5)) - 30)
  next.profiles[0].name = value?.profile?.childName || '小朋友'
  next.schedules = next.schedules.map((schedule) => ({ ...schedule, bedTime: plannedTime, prepareTime }))
  const legacyTasks = Array.isArray(settings.tasks) ? settings.tasks : []
  if (legacyTasks.length) {
    const steps = legacyTasks.map((task, index) => ({
      id: typeof task === 'object' && task.id ? String(task.id) : `legacy-step-${index + 1}`,
      title: typeof task === 'object' ? task.title || `步骤 ${index + 1}` : String(task),
      icon: normalizeAssetId(typeof task === 'object' ? task.icon : '', inferAssetFromText(typeof task === 'object' ? task.title : task)),
      duration: index === legacyTasks.length - 1 ? 10 : 3,
      enabled: true,
    }))
    next.routines = next.routines.map((routine) => ({ ...routine, steps: structuredClone(steps) }))
  }
  const profileId = next.profiles[0].id
  const taskSteps = next.routines[0].steps.filter((step) => step.enabled)
  const sessions = {}
  const starLedger = []
  const rewardMoments = []
  const rolloverHour = Number(settings.dayRolloverHour || 4)
  const records = value?.records || {}
  Object.entries(records).forEach(([dateKey, record]) => {
    const taskValues = record?.tasks || {}
    const hasTasks = Object.keys(taskValues).length > 0
    const allRecordedTasksDone = hasTasks && Object.values(taskValues).every(Boolean)
    const stepStatus = Object.fromEntries(taskSteps.map((step) => {
      const recorded = taskValues[step.id] ?? taskValues[step.title]
      if (recorded) return [step.id, 'done']
      if (allRecordedTasksDone) return [step.id, 'skipped']
      return [step.id, 'todo']
    }))
    let confirmedAt = null
    if (record?.actual) {
      const actualMinutes = Number(record.actual.slice(0, 2)) * 60 + Number(record.actual.slice(3, 5))
      const actualDate = new Date(`${dateKey}T${record.actual}:00`)
      if (actualMinutes < rolloverHour * 60) actualDate.setDate(actualDate.getDate() + 1)
      confirmedAt = actualDate.getTime()
    }
    const earlyMinutes = confirmedAt ? Math.max(0, -Number(record.delta || 0)) : 0
    const targetRoutineCompleteAt = new Date(`${dateKey}T${plannedTime}:00`).getTime()
    const sessionKey = `${profileId}:${dateKey}`
    sessions[sessionKey] = {
      id: sessionKey,
      profileId,
      dateKey,
      status: confirmedAt ? 'goodnight' : allRecordedTasksDone ? 'ready' : 'in_progress',
      routineStartedAt: Number(record?.createdAt) || null,
      targetRoutineCompleteAt,
      routineCompletedAt: null,
      inBedAt: confirmedAt,
      asleepAt: null,
      asleepAtSource: null,
      asleepAtAccuracy: null,
      timeSources: {
        routineStartedAt: record?.createdAt ? 'legacy-created-at' : null,
        targetRoutineCompleteAt: 'legacy-plan',
        routineCompletedAt: null,
        inBedAt: confirmedAt ? 'legacy-actual-bedtime' : null,
        asleepAt: null,
      },
      startedAt: Number(record?.createdAt) || null,
      confirmedAt,
      rewarded: Boolean(confirmedAt),
      starsAwarded: earlyMinutes,
      earlyMinutes,
      completionEarlyMinutes: 0,
      completionLateMinutes: 0,
      completedOnTime: null,
      stepStatus,
    }
    if (earlyMinutes > 0) {
      const ledgerId = `legacy-bedtime-${dateKey}`
      starLedger.push({ id: ledgerId, profileId, delta: earlyMinutes, reason: `提前 ${earlyMinutes} 分钟上床`, sessionKey, createdAt: confirmedAt })
      rewardMoments.push({ id: `moment-${ledgerId}`, profileId, type: 'bedtime', title: `提前 ${earlyMinutes} 分钟上床`, note: '历史晚安奖励', points: earlyMinutes, assetId: 'lamp', occurredAt: confirmedAt, createdAt: confirmedAt, sessionKey, ledgerEntryId: ledgerId })
    }
  })
  const manualRewards = Array.isArray(value?.rewards?.manualRewards) ? value.rewards.manualRewards : []
  manualRewards.forEach((reward, index) => {
    const points = Math.max(0, Number(reward.amount || 0))
    const occurredAt = Number(reward.timestamp) || new Date(`${reward.date || '2000-01-01'}T12:00:00`).getTime()
    const momentId = `legacy-manual-${reward.id || index}`
    const ledgerId = `star-${momentId}`
    starLedger.push({ id: ledgerId, profileId, delta: points, reason: reward.reason || '历史手动奖励', rewardMomentId: momentId, createdAt: occurredAt })
    rewardMoments.push({ id: momentId, profileId, type: 'manual', title: reward.reason || '历史手动奖励', note: '从原版本完整保留', points, assetId: inferAssetFromText(reward.reason), occurredAt, createdAt: occurredAt, ledgerEntryId: ledgerId })
  })
  const manualDetailTotal = manualRewards.reduce((sum, reward) => sum + Math.max(0, Number(reward.amount || 0)), 0)
  const manualSummaryTotal = Math.max(0, Number(value?.rewards?.manualTotal || 0))
  if (manualSummaryTotal > manualDetailTotal) {
    const points = manualSummaryTotal - manualDetailTotal
    starLedger.push({ id: 'legacy-manual-summary', profileId, delta: points, reason: '原版本手动奖励合计', createdAt: value?.exportedAt || Date.now() })
    rewardMoments.push({ id: 'moment-legacy-manual-summary', profileId, type: 'legacy', title: '原版本手动奖励', note: '原版本没有逐条明细，按合计完整保留', points, assetId: 'heart', occurredAt: value?.exportedAt || Date.now(), createdAt: value?.exportedAt || Date.now(), ledgerEntryId: 'legacy-manual-summary' })
  }
  const legacyWishes = Array.isArray(value?.lifeRewards) ? value.lifeRewards.map((item) => ({ id: String(item.id), name: item.name, cost: Number(item.price || 1), assetId: inferAssetFromText(`${item.name} ${item.category}`), enabled: true })) : []
  const rewardRequests = Array.isArray(value?.redeems) ? value.redeems.map((redeem) => ({ id: String(redeem.id), wishId: String(redeem.itemId), profileId, status: 'approved', requestedAt: Number(redeem.redeemedAt), updatedAt: Number(redeem.usedAt || redeem.redeemedAt), undoUntil: null })) : []
  rewardRequests.forEach((request) => {
    const wish = legacyWishes.find((item) => item.id === request.wishId)
    if (wish) starLedger.push({ id: `legacy-redeem-${request.id}`, profileId, delta: -wish.cost, reason: `兑换：${wish.name}`, requestId: request.id, createdAt: request.requestedAt })
  })
  const importedSpent = Number(value?.rewards?.spent || 0)
  const redeemedSpent = rewardRequests.reduce((sum, request) => sum + Number(legacyWishes.find((item) => item.id === request.wishId)?.cost || 0), 0)
  if (importedSpent > redeemedSpent) starLedger.push({ id: 'legacy-spent-adjustment', profileId, delta: -(importedSpent - redeemedSpent), reason: '原版本历史余额调整', createdAt: value?.exportedAt || Date.now() })
  next.sessions = sessions
  next.starLedger = starLedger
  next.rewardMoments = rewardMoments
  if (legacyWishes.length) next.wishes = legacyWishes
  next.rewardRequests = rewardRequests
  next.setupComplete = true
  next.legacy = {
    importedAt: Date.now(),
    sourceVersion: value?.version || '2.0',
    records,
    availableRewardMinutes: starLedger.reduce((sum, entry) => sum + Number(entry.delta || 0), 0),
  }
  return next
}

function migrationScopedId(targetProfileId, id) {
  return `legacy-v2:${targetProfileId}:${id}`
}

function targetHasActivity(data, profileId) {
  return Object.values(data.sessions || {}).some((session) => session?.profileId === profileId)
    || (data.starLedger || []).some((entry) => entry?.profileId === profileId)
    || (data.rewardMoments || []).some((moment) => moment?.profileId === profileId)
    || (data.rewardRequests || []).some((request) => request?.profileId === profileId)
}

export function mergeLegacyIntoV5(currentValue, legacyValue, options = {}) {
  const currentWasV7 = currentValue?.version === DATA_VERSION
  const currentInput = currentWasV7 ? { ...toLegacyView(currentValue, options.targetProfileId), version: 6 } : currentValue
  const current = currentInput?.version === 5 ? migrateV5(structuredClone(currentInput)) : normalizeV6(structuredClone(currentInput))
  const targetProfileId = options.targetProfileId || current.activeProfileId
  if (!current.profiles.some((profile) => profile.id === targetProfileId)) throw new Error('找不到迁移目标孩子')
  if (!legacyValue || (legacyValue.version !== '2.0' && !legacyValue.settings)) throw new Error('旧版数据结构不完整')

  const importedAt = Number(options.importedAt) || Date.now()
  const sourceSha256 = options.sourceSha256 || null
  const migrationId = sourceSha256 ? `legacy-v2:${sourceSha256}` : `legacy-v2:${legacyValue.exportedAt || 'unknown'}`
  const previousMigrations = Array.isArray(current.legacy?.migrations) ? current.legacy.migrations : []
  const balanceBefore = current.starLedger.reduce((sum, entry) => entry.profileId === targetProfileId ? sum + Number(entry.delta || 0) : sum, 0)
  if (previousMigrations.some((migration) => migration.id === migrationId)) {
    return { data: current, report: { migrationId, targetProfileId, alreadyApplied: true, balanceBefore, balanceAfter: balanceBefore, balanceAdded: 0, conflicts: [] } }
  }

  const source = migrateLegacyData(legacyValue)
  const applySourceSetup = options.applySourceSetup !== false && !targetHasActivity(current, targetProfileId)
  let schedules = current.schedules
  let routines = current.routines
  if (applySourceSetup) {
    schedules = current.schedules.map((schedule) => {
      if (schedule.profileId !== targetProfileId) return schedule
      const sourceSchedule = source.schedules.find((item) => item.dayType === schedule.dayType)
      return sourceSchedule ? { ...schedule, prepareTime: sourceSchedule.prepareTime, bedTime: sourceSchedule.bedTime, pending: null } : schedule
    })
    routines = current.routines.map((routine) => {
      if (routine.profileId !== targetProfileId) return routine
      const sourceRoutine = source.routines.find((item) => item.dayType === routine.dayType)
      return sourceRoutine ? { ...routine, steps: structuredClone(sourceRoutine.steps) } : routine
    })
  }

  const conflicts = []
  const sessions = { ...current.sessions }
  let sessionsAdded = 0
  Object.values(source.sessions).forEach((session) => {
    const sessionKey = `${targetProfileId}:${session.dateKey}`
    if (sessions[sessionKey]) {
      conflicts.push({ type: 'session', dateKey: session.dateKey, resolution: 'kept-current' })
      return
    }
    sessions[sessionKey] = { ...session, id: sessionKey, profileId: targetProfileId }
    sessionsAdded += 1
  })

  const wishIdMap = new Map(source.wishes.map((wish) => [wish.id, `legacy-v2:${wish.id}`]))
  const wishes = [...current.wishes]
  let wishesAdded = 0
  source.wishes.forEach((wish) => {
    const id = wishIdMap.get(wish.id)
    if (wishes.some((item) => item.id === id)) return
    wishes.push({ ...wish, id })
    wishesAdded += 1
  })

  const requestIdMap = new Map(source.rewardRequests.map((request) => [request.id, migrationScopedId(targetProfileId, request.id)]))
  const ledgerIdMap = new Map(source.starLedger.map((entry) => [entry.id, migrationScopedId(targetProfileId, entry.id)]))
  const momentIdMap = new Map(source.rewardMoments.map((moment) => [moment.id, migrationScopedId(targetProfileId, moment.id)]))

  const starLedger = [...current.starLedger]
  let ledgerAdded = 0
  source.starLedger.forEach((entry) => {
    const id = ledgerIdMap.get(entry.id)
    if (starLedger.some((item) => item.id === id)) return
    starLedger.push({
      ...entry,
      id,
      profileId: targetProfileId,
      sessionKey: entry.sessionKey ? `${targetProfileId}:${entry.sessionKey.split(':').at(-1)}` : undefined,
      requestId: entry.requestId ? requestIdMap.get(entry.requestId) : undefined,
      rewardMomentId: entry.rewardMomentId ? momentIdMap.get(entry.rewardMomentId) : undefined,
    })
    ledgerAdded += 1
  })

  const rewardMoments = [...current.rewardMoments]
  let momentsAdded = 0
  source.rewardMoments.forEach((moment) => {
    const id = momentIdMap.get(moment.id)
    if (rewardMoments.some((item) => item.id === id)) return
    rewardMoments.push({
      ...moment,
      id,
      profileId: targetProfileId,
      assetId: inferAssetFromText(moment.title),
      sessionKey: moment.sessionKey ? `${targetProfileId}:${moment.sessionKey.split(':').at(-1)}` : null,
      ledgerEntryId: moment.ledgerEntryId ? ledgerIdMap.get(moment.ledgerEntryId) : null,
    })
    momentsAdded += 1
  })

  const rewardRequests = [...current.rewardRequests]
  let requestsAdded = 0
  source.rewardRequests.forEach((request) => {
    const id = requestIdMap.get(request.id)
    if (rewardRequests.some((item) => item.id === id)) return
    rewardRequests.push({ ...request, id, profileId: targetProfileId, wishId: wishIdMap.get(request.wishId) })
    requestsAdded += 1
  })

  const balanceAdded = source.starLedger.reduce((sum, entry) => sum + Number(entry.delta || 0), 0)
  const report = {
    migrationId,
    targetProfileId,
    targetProfileName: current.profiles.find((profile) => profile.id === targetProfileId)?.name,
    alreadyApplied: false,
    appliedSourceSetup: applySourceSetup,
    sessionsAdded,
    ledgerAdded,
    momentsAdded,
    wishesAdded,
    requestsAdded,
    balanceBefore,
    balanceAdded,
    balanceAfter: balanceBefore + balanceAdded,
    conflicts,
  }
  const migration = {
    id: migrationId,
    sourceVersion: legacyValue.version || '2.0',
    sourceFilename: options.sourceFilename || null,
    sourceSha256,
    importedAt,
    targetProfileId,
    sourceCounts: {
      records: Object.keys(legacyValue.records || {}).length,
      manualRewards: legacyValue.rewards?.manualRewards?.length || 0,
      wishes: legacyValue.lifeRewards?.length || 0,
      redeems: legacyValue.redeems?.length || 0,
    },
    result: report,
  }
  const merged = normalizeV6({
      ...current,
      schedules,
      routines,
      sessions,
      starLedger,
      rewardMoments,
      wishes,
      rewardRequests,
      legacy: { ...(current.legacy && typeof current.legacy === 'object' ? current.legacy : {}), migrations: [...previousMigrations, migration] },
      meta: { ...current.meta, updatedAt: importedAt },
    })
  return {
    data: currentWasV7 ? toLegacyView(mergeLegacyView(currentValue, merged), targetProfileId) : merged,
    report,
  }
}

export function loadAppData() {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    if (current) {
      const data = normalizeCurrentV7(JSON.parse(current))
      return { data: toLegacyView(data, data.profiles[0]?.id), migrated: false, issue: null }
    }
    const v6 = window.localStorage.getItem(V6_KEY)
    if (v6) {
      const legacy = normalizeV6(JSON.parse(v6))
      return { data: toLegacyView(migrateV6ToV7(legacy), legacy.activeProfileId), selectedProfileId: legacy.activeProfileId, migrated: true, issue: null }
    }
    const v5 = window.localStorage.getItem(V5_KEY)
    if (v5) { const legacy = migrateV5(JSON.parse(v5)); return { data: toLegacyView(migrateV6ToV7(legacy), legacy.activeProfileId), selectedProfileId: legacy.activeProfileId, migrated: true, issue: null } }
    const v4 = window.localStorage.getItem(V4_KEY)
    if (v4) { const legacy = migrateV4(JSON.parse(v4)); return { data: toLegacyView(migrateV6ToV7(legacy), legacy.activeProfileId), selectedProfileId: legacy.activeProfileId, migrated: true, issue: null } }
    const v3 = window.localStorage.getItem(V3_KEY)
    if (v3) { const legacy = migrateV3(JSON.parse(v3)); return { data: toLegacyView(migrateV6ToV7(legacy), legacy.activeProfileId), selectedProfileId: legacy.activeProfileId, migrated: true, issue: null } }
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy) { const migrated = migrateLegacyData(JSON.parse(legacy)); return { data: toLegacyView(migrateV6ToV7(migrated), migrated.activeProfileId), selectedProfileId: migrated.activeProfileId, migrated: true, issue: null } }
    return { data: createDefaultData(), migrated: false, issue: null }
  } catch (error) {
    return { data: createDefaultData(), migrated: false, issue: error instanceof Error ? error.message : '本地数据读取失败' }
  }
}

export function saveAppData(data) {
  const value = normalizeV7({ ...data, meta: { ...data.meta, updatedAt: Date.now() } })
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  return value
}

export function createBackup(data) {
  const date = new Date().toISOString().slice(0, 10)
  const key = `${BACKUP_PREFIX}${date}:${Date.now()}`
  window.localStorage.setItem(key, JSON.stringify(data))
  const keys = listBackupKeys()
  keys.slice(7).forEach((oldKey) => window.localStorage.removeItem(oldKey))
  return key
}

function listBackupKeys() {
  const keys = []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(BACKUP_PREFIX) || key?.startsWith(V6_BACKUP_PREFIX) || key?.startsWith(V5_BACKUP_PREFIX) || key?.startsWith(V4_BACKUP_PREFIX) || key?.startsWith(V3_BACKUP_PREFIX)) keys.push(key)
  }
  return keys.sort().reverse()
}

export function listBackups() {
  return listBackupKeys().map((key) => ({ key, timestamp: Number(key.split(':').at(-1)) || 0 }))
}

export function restoreBackup(key) {
  const raw = window.localStorage.getItem(key)
  if (!raw) throw new Error('找不到这份备份')
  const value = JSON.parse(raw)
  if (value?.version === DATA_VERSION) return normalizeV7(value)
  if (value?.version === 6) return migrateV6ToV7(normalizeV6(value))
  if (value?.version === 5) return migrateV6ToV7(migrateV5(value))
  if (value?.version === 4) return migrateV6ToV7(migrateV4(value))
  if (value?.version === 3) return migrateV6ToV7(migrateV3(value))
  throw new Error('这份备份版本不受支持')
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify({ ...data, exportedAt: Date.now() }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `成长小队_${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function importData(file) {
  const text = await file.text()
  const value = JSON.parse(text)
  if (value?.version === DATA_VERSION) return normalizeV7(value)
  if (value?.version === 6) return migrateV6ToV7(normalizeV6(value))
  if (value?.version === 5) return migrateV6ToV7(migrateV5(value))
  if (value?.version === 4) return migrateV6ToV7(migrateV4(value))
  if (value?.version === 3) return migrateV6ToV7(migrateV3(value))
  if (value?.version === '2.0' || value?.settings) throw new Error('旧版数据不能直接覆盖，请使用一次性迁移工具')
  throw new Error('这不是成长小队支持的备份文件')
}

export function deleteAllData() {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(V6_KEY)
  window.localStorage.removeItem(V5_KEY)
  window.localStorage.removeItem(V4_KEY)
  window.localStorage.removeItem(V3_KEY)
  window.localStorage.removeItem(LEGACY_KEY)
  listBackupKeys().forEach((key) => window.localStorage.removeItem(key))
}

export function legacyDataView(data, profileId) {
  return toLegacyView(data, profileId)
}

export async function hashPin(pin) {
  const iterations = 210_000
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits'])
  const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, keyMaterial, 256)
  const encode = (bytes) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  return `pbkdf2-sha256$${iterations}$${encode(salt)}$${encode(new Uint8Array(bits))}`
}

export async function verifyPin(pin, verifier) {
  if (String(verifier || '').startsWith('pbkdf2-sha256$')) {
    const [, iterationText, saltText, expectedText] = String(verifier).split('$')
    const decode = (value) => {
      const normalized = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
      return Uint8Array.from(atob(normalized), (character) => character.charCodeAt(0))
    }
    const keyMaterial = await globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits'])
    const bits = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(saltText), iterations: Number(iterationText) }, keyMaterial, 256)
    const actual = new Uint8Array(bits)
    const expected = decode(expectedText)
    if (actual.length !== expected.length) return false
    let difference = 0
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index]
    return difference === 0
  }
  const bytes = new TextEncoder().encode(`晚安小队:${pin}`)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  const legacy = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return legacy === verifier
}
