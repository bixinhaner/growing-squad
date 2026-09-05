import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { getScaffoldStates, getScaffoldSuggestion, scaffoldEvidence } from './scaffoldEngine.js'
function observations(state, { confirmed = true, helped = 0 } = {}) {
  const profileId = state.profiles[0].id
  for (let index = 0; index < 4; index += 1) state.modules.bedtime.sessions[`${profileId}:2026-08-${20 + index}`] = {
    id: `${profileId}:2026-08-${20 + index}`, profileId, routineCompletedAt: 1000 + index,
    helpRequestedAt: index < helped ? 900 + index : null, stepStatus: { backpack: 'done' },
    ...(confirmed ? { supportEvidence: { 'bedtime.pack-bag': { source: 'parent', mode: 'independent' } } } : {}),
  }
  return getScaffoldStates(state, profileId)
}
describe('scaffold engine', () => {
  it('keeps support levels per capability instead of per child age', () => {
    const state = createDefaultData()
    const profileId = state.profiles[0].id
    state.scaffold.states[`${profileId}:bedtime.wash`] = { level: 4 }
    const values = getScaffoldStates(state, profileId)
    expect(values.find((item) => item.key === 'bedtime.wash').level).toBe(4)
    expect(values.find((item) => item.key === 'reading.start').level).toBe(1)
  })
  it('only proposes a reversible change from explicit observations', () => {
    const values = observations(createDefaultData())
    const current = values.find((item) => item.key === 'bedtime.pack-bag').level
    const suggestion = getScaffoldSuggestion(values)
    expect(suggestion.nextLevel).toBe(current + 1)
    expect(values.find((item) => item.key === 'bedtime.pack-bag').level).toBe(current)
    expect(suggestion.evidence).toMatchObject({ count: 4, confirmedCount: 4, independentCount: 4 })
  })
  it('does not infer independence from missing help clicks', () => {
    const values = observations(createDefaultData(), { confirmed: false })
    expect(getScaffoldSuggestion(values)).toBeNull()
    expect(values.find((item) => item.key === 'bedtime.pack-bag').evidence.unknownCount).toBe(4)
  })
  it('does not suggest less support when recent evidence includes frequent help', () => {
    expect(getScaffoldSuggestion(observations(createDefaultData(), { helped: 2 }))).toBeNull()
  })
})


it('counts a parent-observed concrete help even when the child did not press help', () => {
  const state = createDefaultData(), id = state.profiles[0].id
  state.modules.reading.sessions.r = { id: 'r', profileId: id, startedAt: 1, completedAt: 2,
    supportEvidence: { [`${id}:reading.finish`]: { source: 'parent', mode: 'helped' } } }
  expect(scaffoldEvidence(state, id, 'reading.finish')).toMatchObject({ count: 1, confirmedCount: 1, helpCount: 1, independentCount: 0 })
})
