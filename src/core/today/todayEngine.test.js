import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { deriveTodayCandidate, inspectRoutineLoad } from './todayEngine.js'

describe('today engine', () => {
  it('shows no more than two choices on the child primary card', () => {
    const state = createDefaultData()
    const candidate = deriveTodayCandidate(state, state.profiles[0].id, new Date('2026-08-31T16:20:00'))
    expect(candidate.options.length).toBeLessThanOrEqual(2)
  })

  it('does not repeat a routine after the child skips it', () => {
    const state = createDefaultData()
    const profileId = state.profiles[0].id
    state.modules.core.todayDecisions[`${profileId}:2026-08-31`] = { skippedRoutineId: `core-${profileId}-after-school` }
    const candidate = deriveTodayCandidate(state, profileId, new Date('2026-08-31T16:20:00'))
    expect(candidate.free).toBe(true)
  })

  it('warns about dense schedules without blocking them', () => {
    const warnings = inspectRoutineLoad([{ period: 'after-school', startTime: '15:00', endTime: '18:00', items: Array.from({ length: 5 }, (_, index) => ({ id: String(index), estimatedMinutes: 10, required: index < 2 })) }])
    expect(warnings).toContain('放学后超过 4 个结构化活动')
    expect(warnings).toContain('放学后没有自由玩耍时间')
  })
})
