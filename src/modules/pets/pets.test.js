import { describe, expect, it } from 'vitest'
import { createDefaultData, bedtimeReducer } from '../../domain/model.js'
import { normalizeV7, toLegacyView } from '../../domain/v7.js'
import { rootReducer } from '../registry.js'
import { createOperationEnvelope, entityKeyForOperation, isChildOperation, operationRequiresVersion } from '../../core/sync/operationSchemas.js'
import { PET_DEFAULT_SETTINGS, HATCH_AUTO_MS, HATCH_MIN_MS, eggProgress, isPetQuiet, petAllowanceLeft, petBalance, petFor, petGameUnlocked, petGrowth, petRoundsLeft, purchaseStatus } from './petModel.js'
import { PET_ITEMS, PET_SPECIES } from './petCatalog.js'
const T = new Date('2026-09-20T16:00:00+08:00').getTime()
let sequence = 0
function apply(state, type, payload = {}, at = T, profileId = 'child-1') { return rootReducer(state, createOperationEnvelope({type, timestamp:at, ...payload},profileId,++sequence,`op_pet_test_${sequence}`)) }
function seed(stars = 50) {
  const state = createDefaultData()
  state.family.timezone = 'Asia/Shanghai'
  state.starLedger = state.rewards.starLedger = stars ? [{id:'fixture-stars',profileId:'child-1',delta:stars,reason:'家长鼓励',createdAt:T-1000}] : []
  return state
}
function adopted(stars = 50) { return apply(seed(stars), 'PET_ADOPT', {species:'bear',name:'糯糯'}) }
function hatched(stars = 50) {
  let state = adopted(stars)
  for (const action of ['hello','blanket','hum']) state = apply(state, 'PET_CARE', {action})
  return apply(state, 'PET_HATCH', {}, T+HATCH_MIN_MS)
}
function request(state, itemId, requestId = itemId, at = T+HATCH_MIN_MS) { return apply(state,'PET_REQUEST_ITEM',{itemId,requestId},at) }
function approved(state, itemId, at = T+HATCH_MIN_MS) { return apply(request(state,itemId,itemId,at),'PET_APPROVE_ITEM',{requestId:itemId},at) }
function play(state, game, i, at = T+180000) {
  state=apply(state,'PET_BEGIN_PLAY',{game,sessionId:`play${i}`},at)
  return apply(state,'PET_END_PLAY',{sessionId:`play${i}`,completed:true,choices:['一起试试看']},at+4000)
}

describe('pet egg and independent family records', () => {
  it.each(PET_SPECIES)('$eggName reliably keeps $name and never replaces an existing pet', ({id,name}) => {
    const state=apply(seed(0),'PET_ADOPT',{species:id,name})
    expect(petFor(state)).toMatchObject({species:id,name,hatchedAt:null})
    expect(apply(state,'PET_ADOPT',{species:'cloud',name:'另一个'})).toBe(state)
    expect(petBalance(state,'child-1')).toBe(0)
  })
  it('requires distinct greetings and elapsed time; hatch and replay cannot duplicate a birth', () => {
    let state=adopted(0)
    for(let i=0;i<5;i++) state=apply(state,'PET_CARE',{action:'hello'})
    expect(eggProgress(petFor(state),T+HATCH_MIN_MS).ready).toBe(false)
    expect(() => apply(state,'PET_HATCH',{},T+HATCH_MIN_MS)).toThrow('还在准备')
    for(const action of ['blanket','hum']) state=apply(state,'PET_CARE',{action})
    expect(eggProgress(petFor(state),T).ready).toBe(false)
    state=apply(state,'PET_HATCH',{},T+HATCH_MIN_MS)
    expect(petFor(state).memories.filter(m=>m.id==='hatch')).toHaveLength(1)
    expect(apply(state,'PET_HATCH',{},T+HATCH_MIN_MS)).toBe(state)
  })
  it('is ready after six hours away, with no online timer, stars or attendance requirement', () => {
    const state=adopted(0)
    expect(eggProgress(petFor(state),T+HATCH_AUTO_MS-1).ready).toBe(false)
    const next=apply(state,'PET_HATCH',{},T+HATCH_AUTO_MS)
    expect(petFor(next).hatchedAt).toBe(T+HATCH_AUTO_MS)
    expect(petBalance(next,'child-1')).toBe(0)
  })
  it('keeps two children separate, survives normalization and removes only orphan records', () => {
    let state=hatched()
    state.profiles.push({...state.profiles[0],id:'child-2',name:'妹妹'})
    state=apply(state,'PET_ADOPT',{species:'rabbit',name:'团团'},T,'child-2')
    state=apply(state,'PET_NOTE',{note:'姐姐的小熊'},T+180000)
    const next=normalizeV7(JSON.parse(JSON.stringify(state)))
    expect(petFor(next,'child-2').memories).toHaveLength(1)
    expect(petFor(next,'child-1').name).toBe('糯糯')
    const onlySibling=normalizeV7({...next,profiles:next.profiles.filter(p=>p.id==='child-2')})
    expect(onlySibling.modules.pets.byProfile['child-1']).toBeUndefined()
    expect(onlySibling.modules.pets.byProfile['child-2'].name).toBe('团团')
  })
  it('migrates old v7 without pets additively and rejects malformed data instead of deleting memories', () => {
    const state=seed();delete state.modules.pets
    expect(normalizeV7(state).modules.pets.byProfile).toEqual({})
    const broken=hatched();broken.modules.pets.byProfile['child-1'].name=''
    expect(()=>normalizeV7(broken)).toThrow()
  })
  it('does not change tonight tasks, music settings or real growth when playing with pets', () => {
    const before=seed(0), next=apply(before,'PET_ADOPT',{species:'cloud',name:'绵绵'})
    expect(next.modules.bedtime).toEqual(before.modules.bedtime)
    expect(next.growth).toEqual(before.growth)
    expect(next.profiles).toEqual(before.profiles)
  })
})

describe('starlight economy is shared, fixed and transactional', () => {
  it('requests do not deduct stars until parent approval; duplicate approvals do not charge twice', () => {
    let state=request(adopted(),'star-lamp')
    expect(petBalance(state,'child-1')).toBe(50)
    expect(state.modules.pets.requests['star-lamp'].status).toBe('pending')
    state=apply(state,'PET_APPROVE_ITEM',{requestId:'star-lamp'})
    expect(petBalance(state,'child-1')).toBe(45)
    expect(petFor(state).inventory['star-lamp']).toBeTruthy()
    expect(apply(state,'PET_APPROVE_ITEM',{requestId:'star-lamp'})).toBe(state)
    expect(request(state,'star-lamp','newRequest')).toBe(state)
  })
  it('ignores supplied price and rechecks current shared balance before granting', () => {
    let state=apply(adopted(),'PET_REQUEST_ITEM',{itemId:'space-room',requestId:'room',price:0,cost:0})
    expect(state.modules.pets.requests.room.cost).toBe(25)
    state.rewards.starLedger.push({id:'other-spending',profileId:'child-1',delta:-30})
    expect(()=>apply(state,'PET_APPROVE_ITEM',{requestId:'room'})).toThrow('余额已经变化')
    expect(petFor(state).inventory['space-room']).toBeUndefined()
  })
  it('keeps the legacy star alias consistent and bedtime reducer retains pet purchases', () => {
    let state=toLegacyView(adopted(),'child-1')
    state=approved(state,'daisy-rug')
    expect(state.starLedger).toEqual(state.rewards.starLedger)
    state=bedtimeReducer(state,{type:'UPDATE_PROFILE',payload:{name:'姐姐'}})
    expect(petBalance(state,'child-1')).toBe(47)
    expect(petFor(state).inventory['daisy-rug']).toBeTruthy()
  })
  it('allows free care with no balance but rejects unavailable items, forged slots and unknown rooms', () => {
    let state=hatched(0)
    state=apply(state,'PET_CARE',{action:'feed'},T+180000)
    expect(petBalance(state,'child-1')).toBe(0)
    expect(()=>request(state,'not-a-real-item')).toThrow('暂时没有开放')
    expect(()=>request(state,'blocks')).toThrow('星光还不够')
    expect(()=>apply(state,'PET_PLACE',{slot:'toy',itemId:'blocks'},T+180000)).toThrow('已经拥有')
    expect(()=>apply(state,'PET_ROOM',{room:'space'},T+180000)).toThrow('先在星光')
  })
  it('honors a daily allowance using owned stars; crossing its cap creates a parent request', () => {
    let state=apply(adopted(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,spending:'allowance',dailyAllowance:8}})
    state=request(state,'daisy-rug','r1')
    state=request(state,'star-lamp','r2')
    expect(petBalance(state,'child-1')).toBe(42)
    expect(petAllowanceLeft(state,'child-1',T)).toBe(0)
    state=request(state,'blocks','r3')
    expect(state.modules.pets.requests.r3.status).toBe('pending')
    expect(petBalance(state,'child-1')).toBe(42)
    expect(petAllowanceLeft(state,'child-1',T+86400000)).toBe(8)
  })
  it('refunds within 30 seconds exactly once, clears decor and restores allowance', () => {
    let state=apply(adopted(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,spending:'allowance'}})
    state=request(state,'star-lamp','lamp',T+180000)
    state=apply(state,'PET_PLACE',{slot:'lamp',itemId:'star-lamp',position:'left'},T+181000)
    state=apply(state,'PET_REFUND_ITEM',{requestId:'lamp'},T+185000)
    expect(petBalance(state,'child-1')).toBe(50)
    expect(petFor(state).placed.lamp).toBeUndefined()
    expect(petAllowanceLeft(state,'child-1',T)).toBe(10)
    expect(apply(state,'PET_REFUND_ITEM',{requestId:'lamp'},T+185000)).toBe(state)
  })
  it('rejects expired refunds and cancels/declines without charging', () => {
    let state=approved(adopted(),'star-lamp',T+180000)
    expect(()=>apply(state,'PET_REFUND_ITEM',{requestId:'star-lamp'},T+210001)).toThrow('30 秒')
    state=request(state,'blocks','blocks',T+220000)
    state=apply(state,'PET_CANCEL_ITEM',{requestId:'blocks'},T+221000)
    state=request(state,'picnic','picnic',T+220000)
    state=apply(state,'PET_DECLINE_ITEM',{requestId:'picnic'},T+221000)
    expect(petBalance(state,'child-1')).toBe(45)
  })
  it('requires parent identities for approvals, refunds and settings and versions every pet operation', () => {
    for(const type of ['PET_APPROVE_ITEM','PET_REFUND_ITEM','PET_UPDATE_SETTINGS','PET_DECLINE_ITEM']) {
      const op=createOperationEnvelope({type},'child-1',1)
      expect(isChildOperation(op)).toBe(false)
      expect(operationRequiresVersion(op)).toBe(true)
      expect(entityKeyForOperation(op)).toBe('pets:child-1:pet:child-1')
    }
    expect(isChildOperation(createOperationEnvelope({type:'PET_REQUEST_ITEM'},'child-1',1))).toBe(true)
  })
  it('refuses another child request, invalid ownership and prototype keys', () => {
    let state=request(adopted(),'star-lamp','ownedRequest')
    state.profiles.push({...state.profiles[0],id:'child-2'})
    state=apply(state,'PET_ADOPT',{species:'rabbit',name:'团团'},T,'child-2')
    expect(()=>apply(state,'PET_APPROVE_ITEM',{requestId:'ownedRequest'},T,'child-2')).toThrow('属于这个孩子')
    expect(()=>request(state,'blocks','__proto__')).toThrow('不完整')
    const op=createOperationEnvelope({type:'PET_HATCH'},'child-1',1);op.target.entityId='child-2'
    expect(()=>rootReducer(state,op)).toThrow('归属不正确')
  })
  it('catalogue prices and status remain explicit without random outcomes or duplicate costs', () => {
    expect(new Set(PET_ITEMS.map(i=>i.id)).size).toBe(PET_ITEMS.length)
    for(const item of PET_ITEMS) expect(item.price).toBeGreaterThan(0)
    const state=request(adopted(),'blocks')
    expect(purchaseStatus(state,'child-1','blocks',T).label).toBe('等家长回应')
  })
})

describe('care, play and memories have bounded, honest progression', () => {
  it('limits growth to three distinct experiences per day, without absence decay or forced streaks', () => {
    let state=hatched(0)
    for(let day=0;day<6;day++) for(const action of ['feed','feed','water','brush','sleep']) state=apply(state,'PET_CARE',{action},T+180000+day*2*86400000)
    expect(petGrowth(petFor(state))).toMatchObject({stage:'companion',days:6,experiences:18})
    expect(petFor(normalizeV7(state),'child-1').memories.filter(m=>m.id==='stage:companion')).toHaveLength(1)
    expect(petBalance(state,'child-1')).toBe(0)
    const snapshot=JSON.stringify(petFor(state));petGrowth(petFor(state));expect(JSON.stringify(petFor(state))).toBe(snapshot)
  })
  it('learns a skill through three completed rounds, not merely a star purchase', () => {
    let state=approved(hatched(),'ribbon',T+180000)
    expect(petFor(state).skills.spin).toBeUndefined()
    for(let i=0;i<3;i++) state=play(state,'skill-spin',i,T+200000+i*10000)
    expect(petFor(state).skills.spin).toBe(3)
    expect(petFor(state).memories.filter(m=>m.id==='skill:spin')).toHaveLength(1)
    expect(petBalance(state,'child-1')).toBe(40)
  })
  it('guards eggs, unknown games, locked games and overlapping sessions', () => {
    expect(()=>apply(adopted(),'PET_BEGIN_PLAY',{sessionId:'p',game:'ball'})).toThrow('破壳')
    const state=hatched()
    expect(petGameUnlocked(petFor(state),'blocks')).toBe(false)
    expect(()=>apply(state,'PET_BEGIN_PLAY',{sessionId:'p',game:'invented'},T+180000)).toThrow('没有解锁')
    const playing=apply(state,'PET_BEGIN_PLAY',{sessionId:'p',game:'ball'},T+180000)
    expect(()=>apply(playing,'PET_BEGIN_PLAY',{sessionId:'q',game:'ball'},T+181000)).toThrow('正在玩的')
  })
  it('counts started rounds, not unlimited retries, and incomplete or expired play never awards growth', () => {
    let state=apply(hatched(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,roundsPerDay:1}},T+180000)
    state=apply(state,'PET_BEGIN_PLAY',{sessionId:'p',game:'ball'},T+180000)
    state=apply(state,'PET_END_PLAY',{sessionId:'p',completed:true},T+180001)
    expect(petRoundsLeft(state,'child-1',T)).toBe(0)
    expect(petFor(state).playSessions.p.completed).toBe(false)
    expect(petGrowth(petFor(state)).experiences).toBe(0)
    expect(()=>apply(state,'PET_BEGIN_PLAY',{sessionId:'q',game:'ball'},T+180002)).toThrow('已经玩完')
    const tomorrow=T+86400000
    state=apply(state,'PET_BEGIN_PLAY',{sessionId:'q',game:'ball'},tomorrow)
    state=apply(state,'PET_END_PLAY',{sessionId:'q',completed:true},tomorrow+66000)
    expect(petFor(state).playSessions.q.completed).toBe(false)
  })
  it('respects overnight quiet hours in the family timezone without blocking free care', () => {
    let state=hatched(0)
    const night=new Date('2026-09-20T21:05:00+08:00').getTime()
    expect(isPetQuiet(state,'child-1',night)).toBe(true)
    expect(isPetQuiet(state,'child-1',night+10*3600000)).toBe(false)
    expect(()=>apply(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'night'},night)).toThrow('安静时间')
    state=apply(state,'PET_CARE',{action:'feed'},night)
    expect(petFor(state).lastAction).toBe('feed')
  })
  it('saves user notes and game choices without increasing real-world activity or stars', () => {
    let state=hatched(),before=structuredClone(state.growth)
    state=play(state,'story-welcome',1)
    expect(petFor(state).memories.find(m=>m.id==='first:story-welcome')).toMatchObject({kind:'story',note:'一起试试看'})
    state=apply(state,'PET_NOTE',{note:'糯糯和我都喜欢黄色。'},T+185000)
    const memory=petFor(state).memories.at(-1)
    state=apply(state,'PET_PIN',{memoryId:memory.id},T+186000)
    expect(petFor(state).pinnedMemoryId).toBe(memory.id)
    expect(state.growth).toEqual(before)
    expect(petBalance(state,'child-1')).toBe(50)
    expect(()=>apply(state,'PET_SHARE_LIFE',{sourceId:'not-real'},T+190000)).toThrow('真实记录')
  })
})
