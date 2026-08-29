export const DATA_VERSION = 7

const EMPTY_MODULES = {
  core: { version: 1, routines: [], activitySessions: {}, todayDecisions: {} },
  movement: { version: 1, sessions: {}, preferencesByProfile: {} },
  reading: { version: 1, books: [], sessions: {}, preferencesByProfile: {} },
  responsibility: { version: 1, routines: [], sessions: {} },
  inventor: { version: 1, projects: [] },
}

export function isV7State(value) {
  return Number(value?.version) === DATA_VERSION && Boolean(value?.modules?.bedtime)
}

export function migrateV6ToV7(v6, options = {}) {
  if (!v6 || Number(v6.version) !== 6 || !Array.isArray(v6.profiles) || !v6.profiles.length) {
    throw new Error('v6 数据结构不完整')
  }
  const migratedAt = options.migratedAt || Date.now()
  const createdAt = Number(v6.meta?.createdAt) || migratedAt
  return {
    version: DATA_VERSION,
    setupComplete: Boolean(v6.setupComplete),
    family: {
      id: options.familyId || 'family-main',
      name: options.familyName || '成长小队家庭',
      timezone: options.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai',
      locale: 'zh-CN',
      createdAt,
      updatedAt: migratedAt,
    },
    profiles: v6.profiles.map((profile) => ({
      ...profile,
      enabledModules: profile.enabledModules || ['bedtime'],
      createdAt: Number(profile.createdAt) || createdAt,
      updatedAt: Number(profile.updatedAt) || migratedAt,
    })),
    modules: {
      bedtime: {
        version: 1,
        schedules: structuredClone(v6.schedules || []),
        routines: structuredClone(v6.routines || []),
        sessions: structuredClone(v6.sessions || {}),
      },
      ...structuredClone(EMPTY_MODULES),
    },
    scaffold: { states: {} },
    growth: {
      moments: structuredClone(v6.rewardMoments || []),
      world: {},
      collections: [],
    },
    rewards: {
      starLedger: structuredClone(v6.starLedger || []),
      wishes: structuredClone(v6.wishes || []),
      requests: structuredClone(v6.rewardRequests || []),
    },
    accessibilityByProfile: structuredClone(v6.accessibilityByProfile || {}),
    security: structuredClone(v6.security || { pinHash: null }),
    legacy: structuredClone(v6.legacy || null),
    meta: {
      ...(v6.meta || {}),
      schemaMigratedAt: migratedAt,
      migrationHistory: [
        ...(v6.meta?.migrationHistory || []),
        { from: 6, to: 7, migratedAt },
      ],
      createdAt,
      updatedAt: migratedAt,
    },
  }
}

export function normalizeV7(value) {
  if (!isV7State(value) || !Array.isArray(value.profiles) || !value.profiles.length) throw new Error('v7 数据结构不完整')
  const now = Date.now()
  const bedtime = {
    version: 1,
    schedules: value.schedules || value.modules?.bedtime?.schedules || [],
    routines: value.routines || value.modules?.bedtime?.routines || [],
    sessions: value.sessions || value.modules?.bedtime?.sessions || {},
  }
  const rewards = {
    ...(value.rewards || {}),
    starLedger: value.starLedger || value.rewards?.starLedger || [],
    wishes: value.wishes || value.rewards?.wishes || [],
    requests: value.rewardRequests || value.rewards?.requests || [],
  }
  const growth = { ...(value.growth || {}), moments: value.rewardMoments || value.growth?.moments || [] }
  const root = { ...value }
  for (const key of ['activeProfileId', 'schedules', 'routines', 'sessions', 'starLedger', 'rewardMoments', 'wishes', 'rewardRequests']) delete root[key]
  return {
    ...root,
    family: { id: 'family-main', name: '成长小队家庭', timezone: 'Asia/Shanghai', locale: 'zh-CN', createdAt: now, updatedAt: now, ...(value.family || {}) },
    modules: {
      bedtime,
      ...structuredClone(EMPTY_MODULES),
      ...(value.modules || {}),
    },
    scaffold: { states: {}, ...(value.scaffold || {}) },
    growth: { world: {}, collections: [], ...growth },
    rewards,
    accessibilityByProfile: value.accessibilityByProfile || {},
    security: value.security || { pinHash: null },
    meta: { createdAt: now, updatedAt: now, migrationHistory: [], ...(value.meta || {}) },
  }
}

export function toLegacyView(value, selectedProfileId) {
  if (!isV7State(value)) return value
  const profileId = value.profiles.some((profile) => profile.id === selectedProfileId)
    ? selectedProfileId
    : value.profiles[0]?.id
  return {
    ...value,
    activeProfileId: profileId,
    schedules: value.schedules || value.modules.bedtime.schedules,
    routines: value.routines || value.modules.bedtime.routines,
    sessions: value.sessions || value.modules.bedtime.sessions,
    starLedger: value.starLedger || value.rewards.starLedger,
    rewardMoments: value.rewardMoments || value.growth.moments,
    wishes: value.wishes || value.rewards.wishes,
    rewardRequests: value.rewardRequests || value.rewards.requests,
  }
}

export function mergeLegacyView(root, legacy) {
  if (!isV7State(root)) return legacy
  const pureRoot = { ...root }
  for (const key of ['activeProfileId', 'schedules', 'routines', 'sessions', 'starLedger', 'rewardMoments', 'wishes', 'rewardRequests']) delete pureRoot[key]
  return {
    ...pureRoot,
    setupComplete: legacy.setupComplete,
    profiles: legacy.profiles,
    modules: {
      ...pureRoot.modules,
      bedtime: {
        ...pureRoot.modules.bedtime,
        schedules: legacy.schedules,
        routines: legacy.routines,
        sessions: legacy.sessions,
      },
    },
    growth: { ...pureRoot.growth, moments: legacy.rewardMoments },
    rewards: {
      ...pureRoot.rewards,
      starLedger: legacy.starLedger,
      wishes: legacy.wishes,
      requests: legacy.rewardRequests,
    },
    accessibilityByProfile: legacy.accessibilityByProfile,
    security: legacy.security,
    legacy: legacy.legacy,
    meta: { ...pureRoot.meta, ...legacy.meta, updatedAt: Date.now() },
  }
}
