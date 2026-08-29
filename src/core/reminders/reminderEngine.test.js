import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { deriveReminderCandidates, selectReminderCandidates } from './reminderEngine.js'

describe('family reminder engine', () => {
  it('keeps help above routine reminders and deduplicates already sent candidates', () => {
    const state = createDefaultData()
    state.modules.reading.sessions.help = { id: 'help', profileId: 'child-1', startedAt: 1, helpRequestedAt: 2 }
    const current = new Date('2026-08-31T20:00:00')
    state.modules.bedtime.schedules.find((item) => item.profileId === 'child-1' && item.dayType === 'weekday').prepareTime = '20:30'
    const candidates = deriveReminderCandidates(state, current)
    expect(candidates.map((item) => item.kind)).toEqual(['help', 'bedtime'])
    expect(selectReminderCandidates(candidates, new Set([candidates[0].id]))).toEqual([expect.objectContaining({ kind: 'bedtime' })])
  })

  it('suppresses ordinary nudges during quiet hours but keeps a direct help request', () => {
    const state = createDefaultData()
    state.modules.reading.sessions.help = { id: 'help', profileId: 'child-1', startedAt: 1, helpRequestedAt: 2 }
    const candidates = deriveReminderCandidates(state, new Date('2026-08-31T23:10:00'))
    expect(candidates).toEqual([expect.objectContaining({ kind: 'help' })])
  })
})
