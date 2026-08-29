import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultData } from '../domain/model.js'
import { STORAGE_KEY, hashPin, loadAppData, mergeLegacyIntoV5, migrateV5, saveAppData } from './storage.js'

describe('local data repository', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves and restores v7 multi-child reward data', () => {
    const data = createDefaultData()
    data.profiles[0].name = '安安'
    saveAppData(data)
    const result = loadAppData()
    expect(result.data.profiles[0].name).toBe('安安')
    expect(result.issue).toBeNull()
  })

  it('migrates v4 icons and positive history into permanent reward moments without scaling balance', () => {
    const v4 = createDefaultData()
    v4.version = 4
    delete v4.rewardMoments
    v4.routines[0].steps[0].icon = '🪥'
    v4.wishes[0] = { id: 'bake', name: '一起做一件小手工', cost: 8, emoji: '🎨', enabled: true }
    v4.starLedger = [{ id: 'old-star', profileId: 'child-1', delta: 18, reason: '历史奖励', createdAt: 1 }]
    window.localStorage.setItem('bedtime:main:v4', JSON.stringify(v4))
    const result = loadAppData()
    expect(result.migrated).toBe(true)
    expect(result.data.version).toBe(7)
    expect(getComputedBalance(result.data.starLedger)).toBe(18)
    expect(result.data.rewardMoments).toHaveLength(1)
    expect(result.data.routines[0].steps[0].icon).toBe('brush')
    expect(result.data.wishes[0].cost).toBe(35)
    expect(result.data.wishes[0].assetId).toBe('craft')
  })

  it('repairs known legacy basket and teddy asset meanings', () => {
    const data = createDefaultData()
    data.wishes[2] = { id: 'picnic', name: '公园野餐', cost: 50, emoji: '🧺', assetId: 'toys', enabled: true }
    data.routines[0].steps[0] = { id: 'tidy', title: '收拾玩具', icon: '🧸', duration: 3, enabled: true }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    const result = loadAppData()
    expect(result.data.wishes[2].assetId).toBe('park')
    expect(result.data.routines[0].steps[0].icon).toBe('toys')
  })

  it('recovers a stale active child pointer without losing the family', () => {
    const data = createDefaultData()
    data.activeProfileId = 'missing-child'
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    const result = loadAppData()
    expect(result.data.activeProfileId).toBe('child-1')
    expect(result.data.profiles).toHaveLength(1)
    expect(result.issue).toBeNull()
  })

  it('migrates v3 stars and accessibility to the original child', () => {
    const v3 = createDefaultData()
    v3.version = 3
    v3.starLedger = [{ id: 'old-star', delta: 2, reason: '旧记录', createdAt: 1 }]
    v3.accessibility = { reduceMotion: true, soundOff: false, readTasks: false, highContrast: false, largeText: false }
    delete v3.accessibilityByProfile
    window.localStorage.setItem('bedtime:main:v3', JSON.stringify(v3))
    const result = loadAppData()
    expect(result.migrated).toBe(true)
    expect(result.data.version).toBe(7)
    expect(result.data.starLedger[0].profileId).toBe('child-1')
    expect(result.data.accessibilityByProfile['child-1'].reduceMotion).toBe(true)
  })

  it('migrates v2 without overwriting the legacy key', () => {
    const legacy = { version: '2.0', profile: { childName: '老用户' }, settings: { plannedTime: '20:50', tasks: ['刷牙', '听故事'] }, records: {}, rewards: { manualTotal: 10, spent: 2 } }
    window.localStorage.setItem('bedtime:main:v2', JSON.stringify(legacy))
    const result = loadAppData()
    expect(result.migrated).toBe(true)
    expect(result.data.profiles[0].name).toBe('老用户')
    expect(result.data.legacy.availableRewardMinutes).toBe(8)
    expect(window.localStorage.getItem('bedtime:main:v2')).toBe(JSON.stringify(legacy))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('merges v2 history into the selected child without replacing family settings and stays idempotent', () => {
    const current = createDefaultData()
    current.setupComplete = true
    current.profiles[0].name = '小雨'
    current.security.pinHash = 'keep-this-hash'
    const legacy = {
      version: '2.0',
      exportedAt: 10,
      settings: { plannedTime: '21:35', tasks: [{ id: 'old-brush', title: '早上刷牙', icon: '🪥' }] },
      records: { '2026-03-01': { actual: '21:05', delta: -30, tasks: { 'old-brush': true } } },
      rewards: { manualTotal: 5, spent: 7, manualRewards: [{ id: 1, amount: 5, reason: '独自骑自行车', timestamp: 11 }] },
      lifeRewards: [{ id: 'pizza', name: '披萨自助', price: 7, category: '美食' }],
      redeems: [{ id: 'redeem-1', itemId: 'pizza', redeemedAt: 12, usedAt: 13 }],
    }
    const first = mergeLegacyIntoV5(current, legacy, { sourceSha256: 'abc', importedAt: 20 })
    expect(first.data.profiles[0].name).toBe('小雨')
    expect(first.data.security.pinHash).toBe('keep-this-hash')
    expect(first.data.schedules[0].bedTime).toBe('21:35')
    expect(first.data.routines[0].steps[0].id).toBe('old-brush')
    expect(first.data.rewardMoments.find((item) => item.type === 'manual').assetId).toBe('bicycle')
    expect(first.data.wishes.find((item) => item.name === '披萨自助').assetId).toBe('pizza')
    expect(first.report.balanceAfter).toBe(28)
    expect(first.report.sessionsAdded).toBe(1)
    expect(first.report.wishesAdded).toBe(1)

    const second = mergeLegacyIntoV5(first.data, legacy, { sourceSha256: 'abc', importedAt: 30 })
    expect(second.report.alreadyApplied).toBe(true)
    expect(second.data.starLedger).toHaveLength(first.data.starLedger.length)
    expect(second.data.rewardMoments).toHaveLength(first.data.rewardMoments.length)
  })

  it('hashes the same pin deterministically without storing the pin itself', async () => {
    const first = await hashPin('2468')
    const second = await hashPin('2468')
    expect(first).toBe(second)
    expect(first).not.toContain('2468')
  })

  it('backfills v5 bed confirmation without inventing completion or sleep times', () => {
    const v5 = createDefaultData()
    v5.version = 5
    const inBedAt = new Date('2026-03-01T20:50:00').getTime()
    v5.sessions = { 'child-1:2026-03-01': { id: 'child-1:2026-03-01', profileId: 'child-1', dateKey: '2026-03-01', status: 'goodnight', startedAt: inBedAt - 30 * 60000, confirmedAt: inBedAt, rewarded: true, starsAwarded: 10, earlyMinutes: 10, stepStatus: {} } }
    const migrated = migrateV5(v5)
    expect(migrated.version).toBe(6)
    expect(migrated.sessions['child-1:2026-03-01']).toMatchObject({ inBedAt, routineStartedAt: null, routineCompletedAt: null, asleepAt: null })
    expect(migrated.sessions['child-1:2026-03-01'].targetRoutineCompleteAt).toBe(inBedAt + 10 * 60000)
  })
})

function getComputedBalance(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.delta || 0), 0)
}
