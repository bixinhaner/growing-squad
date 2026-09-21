import { describe, it, expect } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { normalizeV7 } from '../../domain/v7.js'
import { rootReducer } from '../registry.js'
import { createOperationEnvelope, isChildOperation, operationRequiresVersion } from '../../core/sync/operationSchemas.js'
import { badgeBalance, levelProgress, MAX_GROWTH, MAX_LEVEL, economySchema } from './petEconomy.js'
import { petFor, petBalance, petGrowth, petGameUnlocked, petAllowanceLeft, PET_DEFAULT_SETTINGS } from './petModel.js'
import { PET_ITEMS, PET_SPECIES } from './petCatalog.js'
const T = Date.parse('2026-09-21T12:00:00+08:00')
let seq=0
function act(state,type,payload={},at=T,profileId='child-1') { return rootReducer(state,createOperationEnvelope({type,timestamp:at,...payload},profileId,++seq,`op_v2_${seq}`)) }
function initial(stars=50,hatched=true) {
  let state=createDefaultData();state.family.timezone='Asia/Shanghai'
  state.starLedger=state.rewards.starLedger=stars?[{id:'test-encouragement',profileId:'child-1',delta:stars,reason:'合成测试鼓励',createdAt:T-8*3600000}]:[]
  state=act(state,'PET_ADOPT',{species:'unicorn',name:'彩彩',economyVersion:2},T-7*3600000)
  if(hatched)state=act(state,'PET_HATCH')
  return state
}
function invest(state,amount,key=`grow_${++seq}`,at=T) {
  state=act(state,'PET_REQUEST_GROWTH',{amount,requestId:key},at)
  return state.modules.pets.requests[key].status==='pending'?act(state,'PET_APPROVE_ITEM',{requestId:key},at):state
}
function buy(state,itemId,id=`buy_${++seq}`,at=T){return act(state,'PET_EXCHANGE_BADGES',{itemId,requestId:id,cost:0,price:0},at)}

describe('the agreed stars → growth → 15 badges → permanent items loop',()=>{
  it('deducts exactly five existing stars and awards fifteen badges for the first level',()=>{
    const state=invest(initial(),5)
    expect(petBalance(state,'child-1')).toBe(45)
    expect(levelProgress(petFor(state))).toMatchObject({level:2,invested:5,remaining:8})
    expect(badgeBalance(petFor(state))).toBe(15)
    expect(state.starLedger).toEqual(state.rewards.starLedger)
  })
  it('requires a second complete threshold; leftover progress is not lost',()=>{
    const state=invest(initial(),15)
    expect(levelProgress(petFor(state))).toMatchObject({level:3,progress:2,remaining:10})
    expect(badgeBalance(petFor(state))).toBe(30)
    expect(petBalance(state,'child-1')).toBe(35)
  })
  it('keeps a pending approval free and grants only when the parent responds',()=>{
    let state=act(initial(),'PET_REQUEST_GROWTH',{amount:5,requestId:'approval'})
    expect(petBalance(state,'child-1')).toBe(50);expect(badgeBalance(petFor(state))).toBe(0)
    expect(levelProgress(petFor(state)).level).toBe(1)
    state=act(state,'PET_APPROVE_ITEM',{requestId:'approval'})
    expect(state.modules.pets.requests.approval).toMatchObject({kind:'growth',currency:'starlight',status:'approved',amount:5,levels:[2]})
  })
  it.each(['PET_CANCEL_ITEM','PET_DECLINE_ITEM'])('%s does not debit stars or grant badges',type=>{
    const state=act(act(initial(),'PET_REQUEST_GROWTH',{amount:5,requestId:'pending'}),type,{requestId:'pending'})
    expect(petBalance(state,'child-1')).toBe(50);expect(levelProgress(petFor(state)).invested).toBe(0)
  })
  it('one pending cultivation request is enough; repeat clicks cannot flood approvals',()=>{
    const state=act(initial(),'PET_REQUEST_GROWTH',{amount:5,requestId:'one'})
    expect(()=>act(state,'PET_REQUEST_GROWTH',{amount:5,requestId:'two'})).toThrow('等家长')
  })
  it('request and approval retries do not mint badges twice',()=>{
    const state=invest(initial(),5,'same')
    expect(act(state,'PET_REQUEST_GROWTH',{amount:5,requestId:'same'})).toBe(state)
    expect(act(state,'PET_APPROVE_ITEM',{requestId:'same'})).toBe(state)
    expect(()=>act(state,'PET_REQUEST_GROWTH',{amount:3,requestId:'same'})).toThrow('编号')
  })
  it.each([0,-1,1.5,51,Infinity,NaN])('rejects invalid star input %s before changing anything',amount=>{
    const state=initial();expect(()=>act(state,'PET_REQUEST_GROWTH',{amount,requestId:'bad'})).toThrow()
    expect(petBalance(state,'child-1')).toBe(50);expect(badgeBalance(petFor(state))).toBe(0)
  })
  it('does not accept cultivation before hatching or without enough stars',()=>{
    expect(()=>invest(initial(50,false),5)).toThrow('破壳')
    expect(()=>invest(initial(0),1)).toThrow('星光还不够')
  })
  it('the daily allowance is a spending ceiling, not a daily reward',()=>{
    let state=act(initial(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,spending:'allowance',dailyAllowance:5}})
    state=act(state,'PET_REQUEST_GROWTH',{amount:5,requestId:'auto'})
    expect(state.modules.pets.requests.auto.status).toBe('approved');expect(petAllowanceLeft(state,'child-1',T)).toBe(0)
    state=act(state,'PET_REQUEST_GROWTH',{amount:1,requestId:'over'})
    expect(state.modules.pets.requests.over.status).toBe('pending');expect(petBalance(state,'child-1')).toBe(45)
    expect(petAllowanceLeft(state,'child-1',T+86400000)).toBe(5)
    expect(petBalance(state,'child-1')).toBe(45)
  })
  it('parent approval rechecks balance and is atomic on failure',()=>{
    const state=act(initial(5),'PET_REQUEST_GROWTH',{amount:5,requestId:'shared'})
    state.rewards.starLedger.push({id:'other-expense',profileId:'child-1',delta:-4})
    expect(()=>act(state,'PET_APPROVE_ITEM',{requestId:'shared'})).toThrow('余额')
    expect(levelProgress(petFor(state)).invested).toBe(0);expect(badgeBalance(petFor(state))).toBe(0)
  })
  it('one badge buys a dress; two buy a house; neither spends stars',()=>{
    let state=invest(initial(),5)
    state=buy(state,'pink-dress','dress');state=buy(state,'strawberry-house','house')
    expect(badgeBalance(petFor(state))).toBe(12);expect(petBalance(state,'child-1')).toBe(45)
    state=act(state,'PET_PLACE',{slot:'dress',itemId:'pink-dress'})
    state=act(state,'PET_PLACE',{slot:'house',itemId:'strawberry-house'})
    expect(petFor(state).placed).toMatchObject({dress:'pink-dress',house:'strawberry-house'})
  })
  it('fixed prices ignore a forged cost and already owned items cannot be bought twice',()=>{
    const state=buy(invest(initial(),5),'pink-dress','dress')
    expect(state.modules.pets.requests.dress.cost).toBe(1)
    expect(buy(state,'pink-dress','again')).toBe(state)
    expect(()=>buy(state,'moon-house','dress')).toThrow('编号')
  })
  it('refund returns badges not stars, once, and removes placed objects without downgrading',()=>{
    let state=buy(invest(initial(),5),'moon-house','moon')
    state=act(state,'PET_PLACE',{slot:'house',itemId:'moon-house'})
    state=act(state,'PET_REFUND_ITEM',{requestId:'moon'},T+1000)
    expect(badgeBalance(petFor(state))).toBe(15);expect(petBalance(state,'child-1')).toBe(45)
    expect(petFor(state).placed.house).toBeUndefined();expect(levelProgress(petFor(state)).level).toBe(2)
    expect(act(state,'PET_REFUND_ITEM',{requestId:'moon'},T+1000)).toBe(state)
  })
  it('expired refunds and cultivation refunds are rejected',()=>{
    const state=buy(invest(initial(),5,'growth'),'pink-dress','dress')
    expect(()=>act(state,'PET_REFUND_ITEM',{requestId:'dress'},T+30001)).toThrow('30 秒')
    expect(()=>act(state,'PET_REFUND_ITEM',{requestId:'growth'},T+1)).toThrow('永久保留')
  })
  it('games and free meals build memories, never spend or mint currencies',()=>{
    let state=initial(0)
    state=act(state,'PET_CARE',{action:'feed'})
    state=act(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'round'})
    state=act(state,'PET_END_PLAY',{sessionId:'round',completed:true},T+5000)
    expect(petBalance(state,'child-1')).toBe(0);expect(badgeBalance(petFor(state))).toBe(0)
    expect(levelProgress(petFor(state)).level).toBe(1)
  })
  it('new skills open by level; practice itself never charges again',()=>{
    let state=initial();expect(petGameUnlocked(petFor(state),'skill-signature')).toBe(false)
    state=invest(state,13)
    expect(petGameUnlocked(petFor(state),'skill-signature')).toBe(true)
    expect(petGameUnlocked(petFor(state),'skill-spin')).toBe(true)
    for(let i=0;i<3;i++){state=act(state,'PET_BEGIN_PLAY',{game:'skill-signature',sessionId:`skill${i}`},T+i*10000);state=act(state,'PET_END_PLAY',{sessionId:`skill${i}`,completed:true},T+i*10000+5000)}
    expect(petFor(state).skills.signature).toBe(3);expect(petBalance(state,'child-1')).toBe(37)
  })
  it('does not keep charging at max level and awards exactly 15 per crossed level',()=>{
    let state=initial(MAX_GROWTH+10),remaining=MAX_GROWTH
    while(remaining){const amount=Math.min(50,remaining);state=invest(state,amount);remaining-=amount}
    expect(levelProgress(petFor(state))).toMatchObject({level:MAX_LEVEL,maxed:true,capacity:0})
    expect(badgeBalance(petFor(state))).toBe((MAX_LEVEL-1)*15)
    expect(petBalance(state,'child-1')).toBe(10)
    expect(()=>invest(state,1)).toThrow('满级')
  })
  it('two children do not share pets, badge wallets or growth receipts',()=>{
    let state=initial();state.profiles.push({...state.profiles[0],id:'child-2',name:'妹妹'})
    state=act(state,'PET_ADOPT',{species:'chick',name:'啾啾',economyVersion:2},T,'child-2')
    state=invest(state,5)
    expect(badgeBalance(petFor(state,'child-2'))).toBe(0);expect(levelProgress(petFor(state,'child-2')).level).toBe(1)
    expect(()=>act(state,'PET_APPROVE_ITEM',{requestId:Object.keys(state.modules.pets.requests)[0]},T,'child-2')).toThrow('属于这个孩子')
  })
  it('serialization and normalization preserve coins, growth and exact item ownership',()=>{
    const state=buy(invest(initial(),13),'pink-dress')
    const copy=normalizeV7(JSON.parse(JSON.stringify(state)))
    expect(petFor(copy).economy).toEqual(petFor(state).economy)
    expect(petFor(copy).inventory).toEqual(petFor(state).inventory)
    expect(petBalance(copy,'child-1')).toBe(37)
  })
})
describe('legacy compatibility without silently changing old purchases',()=>{
  function legacy(){let s=createDefaultData();s.starLedger=s.rewards.starLedger=[{id:'stars',profileId:'child-1',delta:100}];return act(s,'PET_ADOPT',{species:'bear',name:'老朋友'},T-7*3600000)}
  it('preserves old ownership, names, records and the grown-up appearance without retrospective badges',()=>{
    let state=act(legacy(),'PET_HATCH')
    state=act(state,'PET_REQUEST_ITEM',{itemId:'star-lamp',requestId:'old'})
    state=act(state,'PET_APPROVE_ITEM',{requestId:'old'})
    for(let i=0;i<6;i++)petFor(state).growthDays[`2026-09-${10+i}`]=['care:feed','care:brush','play:ball']
    const copy=normalizeV7(state)
    expect(petFor(copy).name).toBe('老朋友');expect(petFor(copy).inventory['star-lamp']).toBeTruthy()
    expect(petGrowth(petFor(copy)).stage).toBe('companion');expect(levelProgress(petFor(copy)).level).toBe(1)
    expect(badgeBalance(petFor(copy))).toBe(0);expect(petBalance(copy,'child-1')).toBe(95)
  })
  it('cancels old pending item requests without deductions; new item orders cannot use the old API',()=>{
    const state=normalizeV7(act(legacy(),'PET_REQUEST_ITEM',{itemId:'star-lamp',requestId:'pending'}))
    expect(state.modules.pets.requests.pending).toMatchObject({status:'cancelled',currency:'starlight',migrationReason:'badge-shop-upgrade'})
    expect(()=>act(state,'PET_REQUEST_ITEM',{itemId:'blocks',requestId:'old-client'})).toThrow('旧版不会自动扣款')
    expect(petBalance(state,'child-1')).toBe(100)
  })
  it('still refunds a just-approved historical purchase in its original star currency',()=>{
    let state=act(act(legacy(),'PET_REQUEST_ITEM',{itemId:'star-lamp',requestId:'old'}),'PET_APPROVE_ITEM',{requestId:'old'})
    state=act(normalizeV7(state),'PET_REFUND_ITEM',{requestId:'old'},T+1000)
    expect(petBalance(state,'child-1')).toBe(100);expect(badgeBalance(petFor(state))).toBe(0)
  })
  it('malformed ledger balances, duplicate level grants or missing earned rewards fail import',()=>{
    const state=invest(initial(),5),value=structuredClone(petFor(state).economy)
    value.badgeLedger.push({...value.badgeLedger[0]});expect(()=>economySchema.parse(value)).toThrow()
    value.badgeLedger=[];expect(()=>economySchema.parse(value)).toThrow()
  })
  it('all first-release eggs and shop goods are usable, not rare placeholders',()=>{
    expect(PET_SPECIES).toHaveLength(8)
    for(const name of ['独角兽','小狗','月兔','九尾狐','小鸡'])expect(PET_SPECIES.some(p=>p.name===name)).toBe(true)
    expect(PET_ITEMS.filter(i=>i.category==='house').every(i=>i.badgePrice===2)).toBe(true)
    expect(PET_ITEMS.filter(i=>i.category==='dress').every(i=>i.badgePrice===1)).toBe(true)
  })
  it('child actions are versioned but approvals, settings and refunds require parents',()=>{
    for(const type of ['PET_REQUEST_GROWTH','PET_EXCHANGE_BADGES']){const op=createOperationEnvelope({type},'child-1',1);expect(isChildOperation(op)).toBe(true);expect(operationRequiresVersion(op)).toBe(true)}
    for(const type of ['PET_APPROVE_ITEM','PET_UPDATE_SETTINGS','PET_REFUND_ITEM'])expect(isChildOperation(createOperationEnvelope({type},'child-1',1))).toBe(false)
  })
})
