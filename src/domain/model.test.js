import { describe, expect, it } from 'vitest'
import { bedtimeReducer, createDefaultData, getCompletionOutcome, getEarlyMinutes, getLateMinutes, getRewardMoments, getSchedule, getSessionHistory, getStarBalance, getWeeklyMetrics } from './model.js'

function completeRoutine(state, dateKey, timestamp) {
  return state.routines[0].steps.filter((item) => item.enabled).reduce(
    (current, step) => bedtimeReducer(current, { type: 'COMPLETE_TASK', stepId: step.id, dateKey, timestamp }),
    state,
  )
}

describe('bedtime domain model', () => {
  it('includes the required care tasks in both default routines', () => {
    const state = createDefaultData()
    for (const routine of state.routines) {
      expect(routine.steps.find((step) => step.id === 'eye-drops')).toMatchObject({ title: '滴眼药水', icon: 'eye-drops', enabled: true })
      expect(routine.steps.find((step) => step.id === 'nasal-rinse')).toMatchObject({ title: '清洗鼻子', icon: 'nasal-rinse', enabled: true })
      expect(routine.steps.find((step) => step.id === 'foot-bath')).toMatchObject({ title: '泡脚', icon: 'foot-bath', duration: 10, enabled: true })
    }
  })

  it('awards any partial early minute and settles exactly once', () => {
    let state = createDefaultData()
    const timestamp = new Date('2026-08-21T20:42:25').getTime()
    for (const step of state.routines[0].steps.filter((item) => item.enabled)) {
      state = bedtimeReducer(state, { type: 'COMPLETE_TASK', stepId: step.id, dateKey: '2026-08-21', timestamp })
    }
    const inBedAt = timestamp + 10 * 60000
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey: '2026-08-21', timestamp: inBedAt })
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey: '2026-08-21', timestamp: inBedAt + 1000 })
    expect(getStarBalance(state)).toBe(18)
    expect(state.sessions['child-1:2026-08-21'].status).toBe('goodnight')
    expect(state.starLedger).toHaveLength(1)
    expect(state.sessions['child-1:2026-08-21'].starsAwarded).toBe(18)
    expect(getRewardMoments(state)).toHaveLength(1)
    expect(getRewardMoments(state)[0].title).toBe('提前 18 分钟完成任务')
    expect(state.sessions['child-1:2026-08-21']).toMatchObject({ routineCompletedAt: timestamp, inBedAt })
    expect(getEarlyMinutes('2026-08-21', '21:00', new Date('2026-08-21T20:59:59').getTime())).toBe(1)
  })

  it('does not award or deduct after the target and keeps a completion memory', () => {
    let state = createDefaultData()
    const timestamp = new Date('2026-08-21T21:05:00').getTime()
    state = completeRoutine(state, '2026-08-21', timestamp)
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey: '2026-08-21', timestamp })
    expect(getStarBalance(state)).toBe(0)
    expect(state.starLedger).toHaveLength(0)
    expect(getRewardMoments(state)).toHaveLength(1)
    expect(getRewardMoments(state)[0]).toMatchObject({ title: '今晚也完成了', points: 0, type: 'bedtime-complete' })
    expect(state.sessions['child-1:2026-08-21'].starsAwarded).toBe(0)
    expect(state.sessions['child-1:2026-08-21'].lateMinutes).toBe(5)
    expect(getLateMinutes('2026-08-21', '21:00', new Date('2026-08-21T21:00:01').getTime())).toBe(1)
    const metrics = getWeeklyMetrics(state, new Date('2026-08-21T22:00:00'))
    expect(metrics).toMatchObject({ lateCount: 1, averageLateMinutes: 5 })
  })

  it('treats the exact target as zero points without marking it late', () => {
    let state = createDefaultData()
    const timestamp = new Date('2026-08-21T21:00:00').getTime()
    state = completeRoutine(state, '2026-08-21', timestamp)
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey: '2026-08-21', timestamp })
    expect(getStarBalance(state)).toBe(0)
    expect(state.sessions['child-1:2026-08-21'].lateMinutes).toBe(0)
    expect(getRewardMoments(state)[0].note).toBe('按自己的节奏完成，没有扣星光')
  })

  it('does not deduct stars until a parent approves and supports undo', () => {
    let state = { ...createDefaultData(), starLedger: [{ id: 'seed', profileId: 'child-1', delta: 50, reason: '期初', createdAt: 1 }] }
    state = bedtimeReducer(state, { type: 'REQUEST_REWARD', wishId: 'bake' })
    const request = state.rewardRequests[0]
    expect(getStarBalance(state)).toBe(50)
    expect(request.status).toBe('pending')
    state = bedtimeReducer(state, { type: 'APPROVE_REWARD', requestId: request.id, timestamp: 1000 })
    expect(getStarBalance(state)).toBe(15)
    expect(state.rewardRequests[0].status).toBe('approved')
    state = bedtimeReducer(state, { type: 'UNDO_REWARD', requestId: request.id, timestamp: 2000 })
    expect(getStarBalance(state)).toBe(50)
    expect(state.rewardRequests[0].status).toBe('pending')
  })

  it('records positive or keepsake-only parent rewards and supports a 30-second correction', () => {
    let state = createDefaultData()
    state = bedtimeReducer(state, { type: 'ADD_REWARD_EVENT', timestamp: 1000, payload: { id: 'manual-one', title: '主动整理书包', points: 10, assetId: 'backpack', occurredAt: 500 } })
    state = bedtimeReducer(state, { type: 'ADD_REWARD_EVENT', timestamp: 1100, payload: { id: 'keepsake', title: '第一次自己准备睡衣', points: 0, assetId: 'pajamas', occurredAt: 600 } })
    expect(getStarBalance(state)).toBe(10)
    expect(getRewardMoments(state)).toHaveLength(2)
    state = bedtimeReducer(state, { type: 'UNDO_REWARD_EVENT', momentId: 'manual-one', timestamp: 2000 })
    expect(getStarBalance(state)).toBe(0)
    expect(getRewardMoments(state).map((moment) => moment.id)).toEqual(['keepsake'])
  })

  it('keeps a changed schedule pending until its effective date', () => {
    let state = createDefaultData()
    state = bedtimeReducer(state, { type: 'UPDATE_SCHEDULE', payload: { dayType: 'weekday', prepareTime: '19:30', bedTime: '20:00', reminderMinutes: 30, reminderEnabled: true, effectiveFrom: '2026-08-22' } })
    expect(getSchedule(state, 'weekday', '2026-08-21').bedTime).toBe('21:00')
    expect(getSchedule(state, 'weekday', '2026-08-22').bedTime).toBe('20:00')
  })

  it('updates the family wish list without changing star history', () => {
    const state = { ...createDefaultData(), starLedger: [{ id: 'seed', profileId: 'child-1', delta: 3, reason: '期初', createdAt: 1 }] }
    const wishes = state.wishes.map((wish) => wish.id === 'storybook' ? { ...wish, name: '一起读新故事' } : wish)
    const next = bedtimeReducer(state, { type: 'UPDATE_WISHES', payload: wishes })
    expect(next.wishes.find((wish) => wish.id === 'storybook')?.name).toBe('一起读新故事')
    expect(getStarBalance(next)).toBe(3)
  })

  it('resolves a skipped step without treating it as a failure', () => {
    let state = createDefaultData()
    state = bedtimeReducer(state, { type: 'SKIP_TASK', stepId: 'story', dateKey: '2026-08-21', timestamp: new Date('2026-08-21T21:00:00').getTime() })
    expect(state.sessions['child-1:2026-08-21'].stepStatus.story).toBe('skipped')
    expect(getStarBalance(state)).toBe(0)
    state = bedtimeReducer(state, { type: 'RESET_TASK', stepId: 'story', dateKey: '2026-08-21', timestamp: new Date('2026-08-21T21:01:00').getTime() })
    expect(state.sessions['child-1:2026-08-21'].stepStatus.story).toBe('todo')
    expect(state.sessions['child-1:2026-08-21'].status).toBe('in_progress')
  })

  it('clears an unconfirmed completion timestamp after correcting a task', () => {
    let state = createDefaultData()
    const dateKey = '2026-08-21'
    for (const step of state.routines[0].steps.filter((item) => item.enabled)) {
      state = bedtimeReducer(state, { type: 'COMPLETE_TASK', stepId: step.id, dateKey, timestamp: 1000 })
    }
    expect(state.sessions[`child-1:${dateKey}`].routineCompletedAt).toBe(1000)
    state = bedtimeReducer(state, { type: 'RESET_TASK', stepId: 'brush', dateKey, timestamp: 2000 })
    expect(state.sessions[`child-1:${dateKey}`].routineCompletedAt).toBeNull()
  })

  it('locks task changes after settlement and lets a parent undo the whole settlement atomically', () => {
    let state = createDefaultData()
    const dateKey = '2026-08-21'
    const completedAt = new Date('2026-08-21T20:42:00').getTime()
    state = completeRoutine(state, dateKey, completedAt)
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey, timestamp: completedAt + 5 * 60000 })
    const settledState = state

    state = bedtimeReducer(state, { type: 'RESET_TASK', stepId: 'brush', dateKey, timestamp: completedAt + 6 * 60000 })
    expect(state).toBe(settledState)
    expect(getStarBalance(state)).toBe(18)

    state = bedtimeReducer(state, { type: 'UNDO_BEDTIME_SETTLEMENT', profileId: 'child-1', dateKey })
    expect(state.sessions[`child-1:${dateKey}`]).toBeUndefined()
    expect(getStarBalance(state)).toBe(0)
    expect(state.starLedger).toHaveLength(0)
    expect(getRewardMoments(state)).toHaveLength(0)
  })

  it('refuses to settle while any task is still waiting', () => {
    let state = createDefaultData()
    const dateKey = '2026-08-21'
    state = bedtimeReducer(state, { type: 'COMPLETE_TASK', stepId: 'brush', dateKey, timestamp: 1000 })
    const before = state
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey, timestamp: 2000 })
    expect(state).toBe(before)
    expect(getStarBalance(state)).toBe(0)
  })

  it('records parent-estimated sleep separately and never changes stars', () => {
    let state = createDefaultData()
    const dateKey = '2026-08-21'
    const inBedAt = new Date('2026-08-21T21:10:00').getTime()
    state = completeRoutine(state, dateKey, inBedAt)
    state = bedtimeReducer(state, { type: 'CONFIRM_BED', dateKey, timestamp: inBedAt })
    state = bedtimeReducer(state, { type: 'RECORD_ASLEEP_TIME', dateKey, timestamp: inBedAt + 20 * 60000, source: 'parent-estimate', accuracy: 'approximate' })
    expect(state.sessions[`child-1:${dateKey}`]).toMatchObject({ asleepAt: inBedAt + 20 * 60000, asleepAtSource: 'parent-estimate' })
    expect(getStarBalance(state)).toBe(0)
  })

  it('distinguishes early, on-time and after-target garden outcomes without shrinking completed plants', () => {
    expect(getCompletionOutcome({ status: 'goodnight', starsAwarded: 8, completedOnTime: true })).toBe('early')
    expect(getCompletionOutcome({ status: 'goodnight', starsAwarded: 0, completedOnTime: true })).toBe('on-time')
    expect(getCompletionOutcome({ status: 'goodnight', starsAwarded: 0, completedOnTime: false, completionLateMinutes: 5 })).toBe('after-target')
    expect(getCompletionOutcome({ status: 'ready' })).toBe('none')
  })

  it('filters history by active child and date range while keeping all records newest first', () => {
    const state = createDefaultData()
    state.sessions = {
      'child-1:2026-08-21': { id: 'child-1:2026-08-21', profileId: 'child-1', dateKey: '2026-08-21', status: 'goodnight' },
      'child-1:2026-07-01': { id: 'child-1:2026-07-01', profileId: 'child-1', dateKey: '2026-07-01', status: 'goodnight' },
      'child-2:2026-08-20': { id: 'child-2:2026-08-20', profileId: 'child-2', dateKey: '2026-08-20', status: 'goodnight' },
    }
    expect(getSessionHistory(state, { days: 7, now: new Date('2026-08-22T12:00:00') }).map((session) => session.dateKey)).toEqual(['2026-08-21'])
    expect(getSessionHistory(state).map((session) => session.dateKey)).toEqual(['2026-08-21', '2026-07-01'])
  })

  it('keeps each child schedule, stars and records isolated', () => {
    let state = createDefaultData()
    state = { ...state, starLedger: [{ id: 'first-star', profileId: 'child-1', delta: 2, reason: '小雨记录', createdAt: 1 }] }
    state = bedtimeReducer(state, { type: 'ADD_PROFILE', payload: { id: 'child-2', name: '小禾', ageBand: '4–6 岁' } })
    expect(state.activeProfileId).toBe('child-2')
    expect(getStarBalance(state)).toBe(0)
    expect(getSchedule(state).profileId).toBe('child-2')
    expect(getSchedule(state, 'weekday', '2026-08-21', 'child-1').profileId).toBe('child-1')
    state = bedtimeReducer(state, { type: 'UPDATE_ACCESSIBILITY', payload: { largeText: true } })
    state = bedtimeReducer(state, { type: 'SWITCH_PROFILE', profileId: 'child-1' })
    expect(getStarBalance(state)).toBe(2)
    expect(state.accessibilityByProfile['child-1'].largeText).toBe(false)
    expect(state.accessibilityByProfile['child-2'].largeText).toBe(true)
    state = bedtimeReducer(state, { type: 'DELETE_PROFILE', profileId: 'child-2' })
    expect(state.profiles.map((profile) => profile.id)).toEqual(['child-1'])
    expect(state.schedules.some((schedule) => schedule.profileId === 'child-2')).toBe(false)
  })

  it('lets different children request the same shared family wish independently', () => {
    let state = { ...createDefaultData(), starLedger: [{ id: 'first-balance', profileId: 'child-1', delta: 50, reason: '期初', createdAt: 1 }] }
    state = bedtimeReducer(state, { type: 'REQUEST_REWARD', wishId: 'bake' })
    state = bedtimeReducer(state, { type: 'ADD_PROFILE', payload: { id: 'child-2', name: '小禾' } })
    state = { ...state, starLedger: [...state.starLedger, { id: 'second-balance', profileId: 'child-2', delta: 50, reason: '期初', createdAt: 2 }] }
    state = bedtimeReducer(state, { type: 'REQUEST_REWARD', wishId: 'bake' })
    expect(state.rewardRequests).toHaveLength(2)
    expect(new Set(state.rewardRequests.map((request) => request.profileId))).toEqual(new Set(['child-1', 'child-2']))
  })
})
