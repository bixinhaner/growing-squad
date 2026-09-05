import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { rootReducer } from '../registry.js'
import { createOperationEnvelope } from '../../core/sync/operationSchemas.js'
import { assistantReducer } from './assistantReducer.js'
import { assistantSettings, buildAssistantSuggestions, buildWeeklyReport, childAssistantPrompt } from './assistantModel.js'

const op = (type, payload, occurredAt = 100) => ({ type, payload, occurredAt, target: { profileId: 'child-1' } })

describe('parent-controlled assistant', () => {
  it('is disabled by default and never uploads external context by default', () => {
    const state = createDefaultData()
    expect(assistantSettings(state)).toMatchObject({ enabled: false, childOneQuestion: false, externalUpload: false })
    expect(childAssistantPrompt(state)).toBeNull()
  })

  it('generates bounded suggestions, then requires parent editing and approval', () => {
    let state = createDefaultData()
    state.modules.inventor.projects = [{ id: 'project-1', profileId: 'child-1', title: '洗头机器人', status: 'learning', updatedAt: Date.now(), versions: [{ number: 1 }] }]
    for (let index = 0; index < 4; index += 1) state.modules.bedtime.sessions[`child-1:2026-08-${20 + index}`] = { id: `child-1:2026-08-${20 + index}`, profileId: 'child-1', routineCompletedAt: 1000 + index, stepStatus: { backpack: 'done' }, supportEvidence: { 'bedtime.pack-bag': { source: 'parent', mode: 'independent' } } }
    const suggestions = buildAssistantSuggestions(state, 'child-1')
    expect(suggestions.length).toBeGreaterThanOrEqual(2)
    expect(suggestions.length).toBeLessThanOrEqual(3)
    state = assistantReducer(state, op('assistant.suggestions.created', { suggestions }))
    expect(Object.values(state.modules.assistant.suggestions).every((item) => item.status === 'suggested' && !item.approvedAt)).toBe(true)
    const item = suggestions[0]
    state = assistantReducer(state, op('assistant.suggestion.edited', { suggestionId: item.id, title: '下周先少帮一步', body: '只试一周，随时可以调回来。' }, 200))
    state = assistantReducer(state, op('assistant.suggestion.approved', { suggestionId: item.id }, 300))
    expect(state.modules.assistant.suggestions[item.id]).toMatchObject({ title: '下周先少帮一步', status: 'approved', approvedAt: 300 })
  })

  it('respects disabled activity-summary scope instead of deriving a project-specific suggestion', () => {
    let state = createDefaultData()
    state.modules.inventor.projects = [{ id: 'project-private', profileId: 'child-1', title: '私密项目', status: 'learning', updatedAt: Date.now() }]
    state = assistantReducer(state, op('assistant.settings.updated', { settings: { enabled: true, childOneQuestion: true, scopes: { activitySummary: false } } }))
    expect(buildAssistantSuggestions(state, 'child-1')).toHaveLength(1)
    expect(JSON.stringify(buildAssistantSuggestions(state, 'child-1'))).not.toContain('私密项目')
    expect(childAssistantPrompt(state, 'child-1').question).not.toContain('私密项目')
  })

  it('keeps child reflections optional and private while weekly reports use actual activities', () => {
    let state = createDefaultData()
    state = rootReducer(state, createOperationEnvelope({ type: 'UPDATE_ASSISTANT_SETTINGS', settings: { enabled: true, childOneQuestion: true } }, 'child-1', 1))
    expect(childAssistantPrompt(state, 'child-1').choices).toHaveLength(3)
    state = assistantReducer(state, op('assistant.reflection.recorded', { reflectionId: 'reflection-1', promptId: 'week:1', answerId: 'tried', answer: '我愿意试一试' }, 200))
    expect(state.modules.assistant.reflections['reflection-1'].answerId).toBe('tried')
    expect(buildWeeklyReport(state, 'child-1').total).toBe(0)
  })
})

describe('assistant ownership boundaries', () => {
  it('does not approve another child’s suggestion or delete it with the current child’s records', () => {
    let state = createDefaultData()
    const suggestions = [{ id: 'mine', title: '一起读', body: '先选择' }]
    state = assistantReducer(state, op('assistant.suggestions.created', { suggestions }))
    const other = { ...op('assistant.suggestions.created', { suggestions: [{ id: 'sister', title: '玩一会儿' }] }), target: { profileId: 'sister' } }
    state = assistantReducer(state, other)
    state = assistantReducer(state, op('assistant.suggestion.approved', { suggestionId: 'sister' }))
    expect(state.modules.assistant.suggestions.sister.status).toBe('suggested')
    state = assistantReducer(state, op('assistant.derived.deleted', {}))
    expect(state.modules.assistant.suggestions.mine).toBeUndefined()
    expect(state.modules.assistant.suggestions.sister.status).toBe('suggested')
  })
})
