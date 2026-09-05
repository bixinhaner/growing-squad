import { describe, expect, it } from 'vitest'
import { MOVEMENT_ACTIVITIES } from './activityCatalog.js'
import { movementReducer } from './movementReducer.js'
import { movementStats, latestMovementFeedback } from './movementModel.js'
const initial = { modules: { movement: { version: 1, sessions: {}, preferencesByProfile: {} } }, growth: { moments: [], world: {}, collections: [] }, meta: {} }
const op = (type, payload, at = 100) => ({ type, payload, occurredAt: at, target: { profileId: 'kid-1' } })
describe('movement catalog', () => {
  it('covers the 20-activity MVP without fitness pressure metadata', () => {
    expect(MOVEMENT_ACTIVITIES).toHaveLength(20)
    expect(MOVEMENT_ACTIVITIES.filter((a) => a.environment === 'indoor').length).toBeGreaterThanOrEqual(8)
    expect(MOVEMENT_ACTIVITIES.filter((a) => a.participants.includes('parent')).length).toBeGreaterThanOrEqual(6)
    expect(MOVEMENT_ACTIVITIES.filter((a) => a.participants.includes('sibling')).length).toBeGreaterThanOrEqual(5)
    expect(JSON.stringify(MOVEMENT_ACTIVITIES)).not.toMatch(/calorie|weight|rank|distance|卡路里|体重|排名/)
  })
})
describe('movement reducer', () => {
  it('persists start, help, completion and feeling without treating a button as initiative', () => {
    const sessionId='movement-kid-1-demo'
    let state=movementReducer(initial,op('movement.activity.selected',{sessionId,activityId:'balloon-keep-up',initiatedBy:'child'}))
    state=movementReducer(state,op('movement.activity.started',{sessionId,activityId:'balloon-keep-up'},200))
    state=movementReducer(state,op('movement.help.requested',{sessionId},250))
    state=movementReducer(state,op('movement.activity.completed',{sessionId},300))
    state=movementReducer(state,op('movement.feedback.recorded',{sessionId,feedback:'again',showAgain:true},400))
    expect(state.modules.movement.sessions[sessionId]).toMatchObject({status:'done',supportMode:'help',feedback:'again'})
    expect(state.growth.world['kid-1'].energyFlowers).toHaveLength(1)
    expect(state.rewards).toBeUndefined()
    expect(movementStats(state,'kid-1')).toMatchObject({autonomous:0,observedCount:0,unknownCount:1,ratio:null})
  })
  it('does not duplicate an energy flower when completion is retried', () => {
    const sessionId='movement-kid-1-retry'
    let state=movementReducer(initial,op('movement.activity.selected',{sessionId,activityId:'robot-dance'}))
    state=movementReducer(state,op('movement.activity.completed',{sessionId},300))
    state=movementReducer(state,op('movement.activity.completed',{sessionId},301))
    expect(state.growth.world['kid-1'].energyFlowers).toHaveLength(1)
  })
  it('uses the latest feedback, including a later reflection on an older session', () => {
    expect(latestMovementFeedback([{activityId:'a',feedback:'again',reflectedAt:100},{activityId:'a',feedback:'hard',reflectedAt:200}])).toEqual({a:'hard'})
    expect(latestMovementFeedback([{activityId:'a',feedback:'again',startedAt:50,reflectedAt:300},{activityId:'a',feedback:'hard',startedAt:200,reflectedAt:250}])).toEqual({a:'again'})
  })
})
