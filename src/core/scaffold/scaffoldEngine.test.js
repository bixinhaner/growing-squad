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
    const values = getScaffoldStates(state, state.profiles[0].id)
    const current = values.find((item) => item.key === 'bedtime.pack-bag').level
    const suggestion = getScaffoldSuggestion(values)
    expect(suggestion.nextLevel).toBe(current + 1)
    expect(values.find((item) => item.key === 'bedtime.pack-bag').level).toBe(current)
  })
})
