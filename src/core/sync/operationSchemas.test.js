import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { toLegacyView } from '../../domain/v7.js'
import { rootReducer } from '../../modules/registry.js'
import { createOperationEnvelope, operationEnvelopeSchema } from './operationSchemas.js'

describe('v7 operation envelopes', () => {
  it('requires an explicit target child for child domain actions', () => {
    const operation = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'brush', dateKey: '2026-08-29', timestamp: 1000 }, 'child-1', 8, 'op_explicit_child')
    expect(operationEnvelopeSchema.parse(operation)).toMatchObject({
      moduleId: 'bedtime',
      type: 'bedtime.step.completed',
      target: { profileId: 'child-1', entityType: 'bedtime-session' },
      clientSequence: 8,
    })
  })

  it('keeps interleaved offline actions attached to their original children', () => {
    let state = createDefaultData()
    state = rootReducer(state, createOperationEnvelope({ type: 'ADD_PROFILE', payload: { id: 'child-2', name: '小禾' } }, 'child-1', 1, 'op_add_second_child'))
    const childOneOffline = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'brush', dateKey: '2026-08-29', timestamp: 1000 }, 'child-1', 2, 'op_child_one_brush')
    const childTwoOffline = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'wash', dateKey: '2026-08-29', timestamp: 1100 }, 'child-2', 1, 'op_child_two_wash')

    state = rootReducer(state, childTwoOffline)
    state = rootReducer(state, childOneOffline)

    const childOne = toLegacyView(state, 'child-1')
    const childTwo = toLegacyView(state, 'child-2')
    expect(childOne.sessions['child-1:2026-08-29'].stepStatus).toMatchObject({ brush: 'done', wash: 'todo' })
    expect(childTwo.sessions['child-2:2026-08-29'].stepStatus).toMatchObject({ brush: 'todo', wash: 'done' })
  })

  it('does not use a shared active profile when replaying an older queued action', () => {
    let state = createDefaultData()
    state = rootReducer(state, createOperationEnvelope({ type: 'ADD_PROFILE', payload: { id: 'child-2', name: '小禾' } }, 'child-1', 1, 'op_add_profile_again'))
    const queuedForFirstChild = createOperationEnvelope({ type: 'SKIP_TASK', stepId: 'story', dateKey: '2026-08-29', timestamp: 1200 }, 'child-1', 2, 'op_first_child_story')
    state = rootReducer(state, queuedForFirstChild)
    expect(toLegacyView(state, 'child-1').sessions['child-1:2026-08-29'].stepStatus.story).toBe('skipped')
    expect(toLegacyView(state, 'child-2').sessions['child-2:2026-08-29']).toBeUndefined()
  })
})

