import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { platformReducer } from '../../modules/core/platformReducer.js'
import { responsibilityReducer } from '../../modules/responsibility/responsibilityReducer.js'
import { readingReducer } from '../../modules/reading/readingReducer.js'
import { activityMomentsFor, growthSummary } from '../activity/activitySelectors.js'
import { deriveTodayCandidate } from './todayEngine.js'
import { inventorTemplate } from '../../modules/inventor/inventorTemplates.js'
const at=(time) => new Date(`2026-09-06T${time}:00`)
const operate=(state,profileId,type,routineId,time,extra={}) => platformReducer(state,{type:`core.today.${type}`,target:{profileId},occurredAt:at(time).getTime(),payload:{dateKey:'2026-09-06',routineId,...extra}})
describe('review: trustworthy daily activity loop', () => {
  it('morning completion does not consume afternoon choices', () => {
    let state=createDefaultData(); const id=state.profiles[0].id
    const morning=deriveTodayCandidate(state,id,at('07:20'))
    state=operate(state,id,'item-selected',morning.routineId,'07:20',{itemId:morning.options[0].id})
    state=operate(state,id,'completed',morning.routineId,'07:30')
    expect(deriveTodayCandidate(state,id,at('07:31')).completed).toBe(true)
    expect(deriveTodayCandidate(state,id,at('16:20')).options).toHaveLength(2)
  })
  it('exposes complete after selection, retains it across serialization and does not duplicate', () => {
    let state=createDefaultData(); const id=state.profiles[0].id; const ready=deriveTodayCandidate(state,id,at('16:20'))
    state=operate(state,id,'item-selected',ready.routineId,'16:20',{itemId:ready.options[0].id,itemTitle:ready.options[0].title})
    expect(deriveTodayCandidate(JSON.parse(JSON.stringify(state)),id,at('16:21')).options[0].action).toBe('complete')
    state=operate(state,id,'completed',ready.routineId,'16:30'); const done=state
    state=operate(state,id,'completed',ready.routineId,'16:31')
    expect(state).toBe(done); expect(activityMomentsFor(state,id)).toHaveLength(1)
  })
  it('honors a pause and resumes without changing the original start time', () => {
    let state=createDefaultData(); const id=state.profiles[0].id; const ready=deriveTodayCandidate(state,id,at('16:20'))
    state=operate(state,id,'item-selected',ready.routineId,'16:20',{itemId:ready.options[0].id})
    state=operate(state,id,'later',ready.routineId,'16:21',{laterMinutes:20})
    expect(deriveTodayCandidate(state,id,at('16:30')).paused).toBe(true)
    expect(deriveTodayCandidate(state,id,at('16:42')).options[0].action).toBe('complete')
  })
  it('does not offer morning work outside its configured window', () => {
    const state=createDefaultData(); expect(deriveTodayCandidate(state,state.profiles[0].id,at('12:00')).free).toBe(true)
  })
  it('does not copy decisions between children or invent empty memories', () => {
    let state=createDefaultData(); const id=state.profiles[0].id
    expect(activityMomentsFor(state,id)).toEqual([])
    state=operate(state,id,'item-selected',`core-${id}-morning`,'07:20',{itemId:'morning-ready'})
    state=operate(state,id,'completed',`core-${id}-morning`,'07:30')
    expect(activityMomentsFor(state,'other-child')).toEqual([])
  })
  it('records personal roles immediately, the shared completion once, and both children in reports', () => {
    let state=createDefaultData(); const id=state.profiles[0].id
    const participants=[{id:`profile:${id}`,profileId:id,kind:'child'},{id:'profile:sister',profileId:'sister',kind:'child'}]
    const op=(type,profileId,time,payload={}) => ({type,target:{profileId},occurredAt:time,payload:{sessionId:'shared',participants,...payload}})
    state=responsibilityReducer(state,op('responsibility.session.started',id,100))
    state=responsibilityReducer(state,op('responsibility.role.completed',id,200))
    expect(activityMomentsFor(state,id)[0].groupComplete).toBe(false)
    expect(activityMomentsFor(state,'sister')).toEqual([])
    state=responsibilityReducer(state,op('responsibility.role.completed','sister',300))
    state=responsibilityReducer(state,op('responsibility.role.completed','sister',301))
    expect(state.growth.moments.filter((m) => m.type==='responsibility.shared-completed')).toHaveLength(1)
    expect(growthSummary(state,id,400).counts.responsibility).toBe(1)
    expect(growthSummary(state,'sister',400).counts.responsibility).toBe(1)
  })
  it('preserves reading words and attribution without manufacturing a quote', () => {
    let state=createDefaultData(); const id=state.profiles[0].id
    const op=(type,payload) => ({type,target:{profileId:id},occurredAt:100,payload:{sessionId:'r',bookId:'b',...payload}})
    state=readingReducer(state,op('reading.session.started',{mode:'read-together'}))
    state=readingReducer(state,op('reading.session.completed',{}))
    state=readingReducer(state,op('reading.reflection.added',{mode:'tell',note:'我会先帮助小兔子',noteSource:'child'}))
    expect(activityMomentsFor(state,id)[0]).toMatchObject({note:'我会先帮助小兔子',noteSource:'child'})
  })
  it('keeps focus-helper and rain-cover content separate from hair-robot', () => {
    expect(JSON.stringify(inventorTemplate('focus-helper'))).not.toMatch(/漏水|头围|两边还会漏/)
    expect(inventorTemplate('rain-cover').findings.some((f) => f.id==='seam-wet')).toBe(true)
    expect(inventorTemplate('unknown')).toBe(inventorTemplate('my-idea'))
  })
})
