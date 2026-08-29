import { describe, expect, it } from 'vitest'
import { responsibilityReducer } from './responsibilityReducer.js'
import { responsibilityAssignments, responsibilityStats } from './responsibilityModel.js'

const base = {
  profiles: [{ id: 'kid-1', name: '小语', character: 'bear' }, { id: 'kid-2', name: '小雨', character: 'rabbit' }],
  modules: { responsibility: { version: 1, routines: [], sessions: {}, scaffoldByProfile: {} } },
  growth: { moments: [], world: {}, collections: [] }, meta: {},
}
const op = (type, payload, profileId = 'kid-1', occurredAt = 100) => ({ type, payload, occurredAt, target: { profileId } })

describe('family responsibility', () => {
  it('rotates different child roles without ranking them', () => {
    const routine = { id: 'table', activityId: 'prepare-table', rotation: 'weekly', rotationOffset: 0 }
    const current = responsibilityAssignments(base, routine, 0).filter((item) => item.kind === 'child')
    const next = responsibilityAssignments(base, routine, 1).filter((item) => item.kind === 'child')
    expect(new Set(current.map((item) => item.roleId)).size).toBe(2)
    expect(next[0].roleId).not.toBe(current[0].roleId)
    expect(JSON.stringify(current)).not.toMatch(/score|rank|star|count|积分|排名|星光/)
  })

  it('creates one shared moment only after every child role is complete', () => {
    const sessionId = 'responsibility-table-2026-08-29'
    const participants = responsibilityAssignments(base, { id: 'table', activityId: 'prepare-table', rotation: 'weekly' })
    let state = responsibilityReducer(base, op('responsibility.session.started', { sessionId, activityId: 'prepare-table', routineId: 'table', participants }))
    state = responsibilityReducer(state, op('responsibility.role.completed', { sessionId, participantId: 'profile:kid-1' }, 'kid-1', 200))
    expect(state.modules.responsibility.sessions[sessionId].status).toBe('partial')
    expect(state.growth.moments).toHaveLength(0)
    state = responsibilityReducer(state, op('responsibility.role.completed', { sessionId, participantId: 'profile:kid-2' }, 'kid-2', 300))
    state = responsibilityReducer(state, op('responsibility.role.completed', { sessionId, participantId: 'profile:kid-2' }, 'kid-2', 301))
    expect(state.modules.responsibility.sessions[sessionId].status).toBe('complete')
    expect(state.growth.moments).toHaveLength(1)
    expect(state.growth.world['kid-1'].familyObjects).toHaveLength(1)
    expect(state.rewards).toBeUndefined()
    expect(responsibilityStats(state, 'kid-1').completed).toHaveLength(1)
  })

  it('keeps child help and role-change requests idempotent for the parent', () => {
    const sessionId = 'responsibility-table-2026-08-29'
    let state = responsibilityReducer(base, op('responsibility.session.started', { sessionId, activityId: 'prepare-table', routineId: 'table', participants: [] }))
    state = responsibilityReducer(state, op('responsibility.help.requested', { sessionId }))
    state = responsibilityReducer(state, op('responsibility.help.requested', { sessionId }))
    state = responsibilityReducer(state, op('responsibility.role-change.requested', { activityId: 'prepare-table', routineId: 'table', currentRoleId: 'place-settings' }))
    state = responsibilityReducer(state, op('responsibility.role-change.requested', { activityId: 'prepare-table', routineId: 'table', currentRoleId: 'place-settings' }))
    expect(state.modules.responsibility.sessions[sessionId].helpRequests).toHaveLength(1)
    expect(state.modules.responsibility.roleChangeRequests).toHaveLength(1)
    state = responsibilityReducer(state, op('responsibility.request.resolved', { kind: 'help', sessionId }))
    state = responsibilityReducer(state, op('responsibility.request.resolved', { kind: 'change', requestId: state.modules.responsibility.roleChangeRequests[0].id }))
    expect(state.modules.responsibility.sessions[sessionId].helpRequests[0].resolvedAt).toBe(100)
    expect(state.modules.responsibility.roleChangeRequests[0].resolvedAt).toBe(100)
  })
})
