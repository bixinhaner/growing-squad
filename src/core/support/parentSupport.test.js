import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { rootReducer } from '../../modules/registry.js'
import { createOperationEnvelope, isChildOperation, entityKeyForOperation } from '../sync/operationSchemas.js'
import { unresolvedHelpFor } from '../activity/activitySelectors.js'
import { scaffoldEvidence } from '../scaffold/scaffoldEngine.js'
describe('parent observations and help response',() => {
  it('rejects child privilege for evidence and keeps observations scoped to their real session',() => {
    const state=createDefaultData(), id=state.profiles[0].id
    state.modules.reading.sessions.r={id:'r',profileId:id,mode:'read-together',startedAt:1,completedAt:10}
    const operation=createOperationEnvelope({type:'RECORD_SUPPORT_EVIDENCE',sourceModule:'reading',sessionId:'r',capabilityKey:'reading.finish',mode:'together'},id,1)
    expect(isChildOperation(operation)).toBe(false)
    const next=rootReducer(state,operation)
    expect(scaffoldEvidence(next,id,'reading.finish')).toMatchObject({confirmedCount:1,independentCount:0})
    expect(rootReducer(state,{...operation,target:{...operation.target,profileId:'sister'}})).toBe(state)
  })
  it('parent acknowledgement removes the pending help rather than claiming automatic delivery',() => {
    const state=createDefaultData(), id=state.profiles[0].id
    state.modules.reading.sessions.r={id:'r',profileId:id,startedAt:1,helpRequestedAt:2}
    expect(unresolvedHelpFor(state,id)).toHaveLength(1)
    const op=createOperationEnvelope({type:'RESOLVE_SUPPORT_REQUEST',sourceModule:'reading',sessionId:'r'},id,1)
    expect(isChildOperation(op)).toBe(false)
    expect(unresolvedHelpFor(rootReducer(state,op),id)).toHaveLength(0)
  })
  it('uses different optimistic version keys for separate routines',() => {
    const a=createOperationEnvelope({type:'TODAY_LATER',dateKey:'2026-09-06',routineId:'morning'},'kid',1)
    const b=createOperationEnvelope({type:'TODAY_LATER',dateKey:'2026-09-06',routineId:'after-school'},'kid',2)
    expect(entityKeyForOperation(a)).not.toBe(entityKeyForOperation(b))
  })
})
