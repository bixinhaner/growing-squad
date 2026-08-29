import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { createOperationEnvelope } from '../../core/sync/operationSchemas.js'
import { rootReducer } from '../registry.js'
import { assistantSettings, assistantSuggestions, buildAssistantSuggestions, buildWeeklyReport, childAssistantPrompt } from './assistantModel.js'

function initial() {
  return createDefaultData()
}

function reduce(state, action, sequence = 1) {
  return rootReducer(state, createOperationEnvelope(action, action.profileId || state.profiles[0].id, sequence, `op_test_${sequence}`))
}

describe('controlled assistant', () => {
  it('is off by default and keeps child questions unavailable', () => {
    const state = initial()
    expect(assistantSettings(state).enabled).toBe(false)
    expect(childAssistantPrompt(state)).toBeNull()
    expect(buildWeeklyReport(state).headline).toContain('成长片段')
  })

  it('stores per-child settings and local suggestions without changing core rules', () => {
    let state = initial()
    const profileId = state.profiles[0].id
    state = reduce(state, { type: 'UPDATE_ASSISTANT_SETTINGS', profileId, settings: { enabled: true, childOneQuestion: true, scopes: { childQuotes: true } } })
    const suggestions = buildAssistantSuggestions(state, profileId)
    state = reduce(state, { type: 'CREATE_ASSISTANT_SUGGESTIONS', profileId, suggestions }, 2)
    expect(assistantSettings(state, profileId)).toMatchObject({ enabled: true, childOneQuestion: true, externalUpload: false })
    expect(assistantSuggestions(state, profileId)).toHaveLength(2)
    expect(childAssistantPrompt(state, profileId)?.choices).toHaveLength(3)
    expect(state.modules.core.routines).toEqual([])
  })

  it('requires explicit approval and can delete all derived content', () => {
    let state = initial()
    const profileId = state.profiles[0].id
    const suggestion = buildAssistantSuggestions(state, profileId)[0]
    state = reduce(state, { type: 'CREATE_ASSISTANT_SUGGESTIONS', profileId, suggestions: [suggestion] })
    state = reduce(state, { type: 'APPROVE_ASSISTANT_SUGGESTION', profileId, suggestionId: suggestion.id }, 2)
    expect(assistantSuggestions(state, profileId)[0].status).toBe('approved')
    state = reduce(state, { type: 'RECORD_ASSISTANT_REFLECTION', profileId, reflectionId: 'reflection-1', promptId: 'weekly', answerId: 'tried', answer: '我试了一个新办法' }, 3)
    state = reduce(state, { type: 'DELETE_ASSISTANT_DERIVED', profileId }, 4)
    expect(assistantSuggestions(state, profileId)).toHaveLength(0)
    expect(Object.values(state.modules.assistant.reflections)).toHaveLength(0)
  })

  it('does not inspect activity history when the activity scope is disabled', () => {
    let state = initial()
    const profileId = state.profiles[0].id
    state = reduce(state, { type: 'UPDATE_ASSISTANT_SETTINGS', profileId, settings: { enabled: true, scopes: { activitySummary: false } } })
    const suggestions = buildAssistantSuggestions(state, profileId)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ evidence: '通用建议 · 未读取活动记录' })
  })
})
