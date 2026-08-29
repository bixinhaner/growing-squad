import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { getScaffoldStates, getScaffoldSuggestion } from './scaffoldEngine.js'

describe('scaffold engine', () => {
  it('keeps support levels per capability instead of per child age', () => {
    const state = createDefaultData()
    const profileId = state.profiles[0].id
    state.scaffold.states[`${profileId}:bedtime.wash`] = { level: 4 }
    const values = getScaffoldStates(state, profileId)
    expect(values.find((item) => item.key === 'bedtime.wash').level).toBe(4)
    expect(values.find((item) => item.key === 'reading.start').level).toBe(1)
  })

  it('only proposes a change and never mutates the current level', () => {
    const state = createDefaultData()
    for (let index = 0; index < 4; index += 1) state.modules.bedtime.sessions[`child-1:2026-08-${20 + index}`] = { id: `child-1:2026-08-${20 + index}`, profileId: 'child-1', routineCompletedAt: 1000 + index, stepStatus: { backpack: 'done' } }
    const values = getScaffoldStates(state, state.profiles[0].id)
    const current = values.find((item) => item.key === 'bedtime.pack-bag').level
    const suggestion = getScaffoldSuggestion(values)
    expect(suggestion.nextLevel).toBe(current + 1)
    expect(values.find((item) => item.key === 'bedtime.pack-bag').level).toBe(current)
    expect(suggestion.evidence).toMatchObject({ count: 4, independentCount: 4 })
  })

  it('does not suggest less support when recent evidence includes frequent help', () => {
    const state = createDefaultData()
    for (let index = 0; index < 4; index += 1) state.modules.bedtime.sessions[`child-1:2026-08-${20 + index}`] = { id: `child-1:2026-08-${20 + index}`, profileId: 'child-1', routineCompletedAt: 1000 + index, helpRequestedAt: index < 2 ? 900 + index : null, stepStatus: { backpack: 'done' } }
    expect(getScaffoldSuggestion(getScaffoldStates(state, 'child-1'))).toBeNull()
  })
})
