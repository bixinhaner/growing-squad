import { describe, expect, it } from 'vitest'
import { createDefaultData } from '../../domain/model.js'
import { normalizeV7 } from '../../domain/v7.js'
import { rootReducer } from '../registry.js'
import { createOperationEnvelope, isChildOperation } from '../../core/sync/operationSchemas.js'
import { CREATION, freshLife, favoriteFor, idleBehavior, rememberPreference, robotResult } from './petLife.js'
import { petFor, petBalance, petSettingsFor, PET_DEFAULT_SETTINGS, petPlayTimeLeft, playLimitFor } from './petModel.js'

const T = new Date('2026-09-21T10:00:00+08:00').getTime()
let sequence = 0
const apply = (state, type, payload = {}, at = T, profileId = 'child-1') => rootReducer(state, createOperationEnvelope({type, timestamp:at, ...payload}, profileId, ++sequence, `op_life_test_${sequence}`))
function family() {
  let state=createDefaultData()
  state.family.timezone='Asia/Shanghai'
  state.starLedger=state.rewards.starLedger=[{id:'fixture',profileId:'child-1',delta:100,createdAt:T-10000}]
  state.profiles.push({...state.profiles[0],id:'child-2',name:'妹妹'})
  state=apply(state,'PET_ADOPT',{species:'bear',name:'糯糯'},T-7*3600000)
  state=apply(state,'PET_ADOPT',{species:'rabbit',name:'团团'},T-7*3600000,'child-2')
  state=apply(state,'PET_HATCH')
  state=apply(state,'PET_HATCH',{},T,'child-2')
  return state
}
const grant=(state,item)=>apply(apply(state,'PET_REQUEST_ITEM',{itemId:item,requestId:item}),'PET_APPROVE_ITEM',{requestId:item})
const blockWork={kind:'blocks',title:'我的小房子',blocks:[{x:0,y:3,color:'yellow',shape:'square',turn:0}]}
const theaterWork={kind:'theater',title:'月亮晚安',scene:'moon-room',acts:['wave','sleep']}
const drawWork={kind:'drawing',title:'小山',strokes:[{color:'green',points:[[10,70],[50,20],[90,70]]}]}
const media={id:'media_life_test_0001',kind:'photo',mediaType:'image/png',fileName:'合成测试.png',byteSize:120,status:'local'}

describe('distinct, bounded personal habits',()=>{
  it('counts a preference once per day, not repeated tapping',()=>{
    const life=freshLife()
    for(let i=0;i<20;i++)rememberPreference(life,'ball','2026-09-21')
    expect(life.preferences.ball).toBe(1)
    expect(favoriteFor({life})).toBeNull()
    rememberPreference(life,'ball','2026-09-22')
    expect(favoriteFor({life})).toMatchObject({id:'ball',days:2})
  })
  it('retains lifetime preferences while bounding the deduplication history',()=>{
    const life=freshLife()
    for(let i=0;i<90;i++)rememberPreference(life,'ball',`day-${String(i).padStart(3,'0')}`)
    expect(Object.keys(life.preferenceDays)).toHaveLength(60)
    expect(life.preferences.ball).toBe(90)
  })
  it('only demonstrates a learned behavior and never treats an unlearned skill as mastered',()=>{
    const pet={skills:{},life:freshLife()}
    expect(Array.from({length:10},(_,i)=>idleBehavior(pet,i)).some(b=>b.action==='tidy')).toBe(false)
    pet.skills.tidy=3
    expect(Array.from({length:10},(_,i)=>idleBehavior(pet,i)).some(b=>b.action==='tidy')).toBe(true)
  })
  it('bath and brushing remove play dirt but being absent never creates dirt',()=>{
    let state=family(), pet=petFor(state)
    pet.life.dirt=3
    state=apply(state,'PET_CARE',{action:'bath'})
    expect(petFor(state).life.dirt).toBe(0)
    expect(petFor(normalizeV7(state)).life.dirt).toBe(0)
    expect(petFor(state).life.preferences['care:bath']).toBe(1)
    expect(petBalance(state,'child-1')).toBe(100)
  })
  it('keeps each child garden independently editable and retains its timestamp after normalization',()=>{
    const garden={flower:'star',color:'yellow',place:'right',note:'姐姐的花'}
    const state=normalizeV7(apply(family(),'PET_GARDEN',{garden}))
    expect(petFor(state).life.garden).toMatchObject({...garden,updatedAt:T})
    expect(petFor(state,'child-2').life.garden).toBeNull()
    expect(petFor(state,'child-2').memories).toHaveLength(2)
  })
})

describe('creative works and recoverable play',()=>{
  it('validates unique block locations, bounded points and known shapes',()=>{
    expect(CREATION.safeParse(blockWork).success).toBe(true)
    expect(CREATION.safeParse({...blockWork,blocks:[...blockWork.blocks,...blockWork.blocks]}).success).toBe(false)
    expect(CREATION.safeParse({...blockWork,blocks:[{...blockWork.blocks[0],shape:'unexpected'}]}).success).toBe(false)
    expect(CREATION.safeParse({...drawWork,strokes:[{color:'green',points:[[Infinity,20]]}]}).success).toBe(false)
  })
  it.each([theaterWork,drawWork])('stores a $kind work without claiming a real learning activity',work=>{
    const base=family(),state=apply(base,'PET_SAVE_WORK',{work})
    const pet=petFor(state), saved=pet.life.creations[0]
    expect(saved.work).toEqual(work)
    expect(pet.memories.at(-1)).toMatchObject({kind:'creation',workId:saved.id})
    expect(pet.memories.at(-1).work).toBeUndefined()
    expect(state.growth).toEqual(base.growth)
    expect(petBalance(state,'child-1')).toBe(100)
  })
  it('does not let a saved blueprint bypass a paid toy',()=>{
    expect(()=>apply(family(),'PET_SAVE_WORK',{work:blockWork})).toThrow('解锁')
    expect(petFor(apply(grant(family(),'blocks'),'PET_SAVE_WORK',{work:blockWork})).life.creations).toHaveLength(1)
  })
  it('persists draft work through serialization and saves it on early exit',()=>{
    let state=grant(family(),'blocks')
    state=apply(state,'PET_BEGIN_PLAY',{game:'blocks',sessionId:'draft1'})
    state=apply(state,'PET_SAVE_PLAY_DRAFT',{sessionId:'draft1',work:blockWork},T+1000)
    state=normalizeV7(JSON.parse(JSON.stringify(state)))
    expect(petFor(state).playSessions.draft1.work).toEqual(blockWork)
    state=apply(state,'PET_END_PLAY',{sessionId:'draft1',completed:false},T+2000)
    expect(petFor(state).life.creations[0].work).toEqual(blockWork)
    expect(petFor(state).playSessions.draft1.work).toBeUndefined()
    expect(petFor(state).playSessions.draft1.completed).toBe(false)
  })
  it('recovers an expired draft before allowing another round',()=>{
    let state=apply(family(),'PET_BEGIN_PLAY',{game:'theater',sessionId:'old'})
    state=apply(state,'PET_SAVE_PLAY_DRAFT',{sessionId:'old',work:theaterWork},T+1000)
    state=apply(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'new'},T+200000)
    expect(petFor(state).life.creations.some(c=>c.work.title===theaterWork.title)).toBe(true)
    expect(petFor(state).playSessions.old.endedAt).toBe(T+180000)
  })
  it('prevents work from being attached to the wrong kind of game',()=>{
    let state=apply(family(),'PET_BEGIN_PLAY',{game:'ball',sessionId:'ball'})
    expect(()=>apply(state,'PET_SAVE_PLAY_DRAFT',{sessionId:'ball',work:theaterWork})).toThrow('不对应')
    expect(()=>apply(state,'PET_END_PLAY',{sessionId:'ball',completed:true,work:theaterWork},T+4000)).toThrow('不对应')
  })
  it('makes repeated finish a no-op instead of duplicating work or growth',()=>{
    let state=apply(family(),'PET_BEGIN_PLAY',{game:'drawing',sessionId:'drawing'})
    state=apply(state,'PET_END_PLAY',{sessionId:'drawing',completed:true,work:drawWork},T+4000)
    expect(apply(state,'PET_END_PLAY',{sessionId:'drawing',completed:true,work:drawWork},T+5000)).toBe(state)
  })
  it('rejects end-before-start rather than granting extra budget',()=>{
    const state=apply(family(),'PET_BEGIN_PLAY',{game:'ball',sessionId:'clock'},T+10000)
    expect(()=>apply(state,'PET_END_PLAY',{sessionId:'clock',completed:false},T+1000)).toThrow('早于开始')
  })
  it('preserves full storage rather than silently deleting earlier works',()=>{
    const state=family(),pet=petFor(state)
    pet.life.creations=Array.from({length:100},(_,i)=>({id:`w${i}`,at:T,work:theaterWork}))
    expect(()=>apply(state,'PET_SAVE_WORK',{work:theaterWork})).toThrow('作品柜已经满')
    expect(pet.life.creations).toHaveLength(100)
  })
  it('removes a selected creation from both cabinet and album without touching birth history',()=>{
    let state=apply(family(),'PET_SAVE_WORK',{work:drawWork}),key=petFor(state).life.creations[0].id
    state=apply(state,'PET_PIN',{memoryId:key})
    state=apply(state,'PET_REMOVE_MEMORY',{memoryId:key})
    expect(petFor(state).life.creations).toHaveLength(0)
    expect(petFor(state).pinnedMemoryId).toBeNull()
    expect(()=>apply(state,'PET_REMOVE_MEMORY',{memoryId:'hatch'})).toThrow('出生和成长')
    expect(isChildOperation(createOperationEnvelope({type:'PET_REMOVE_MEMORY'},'child-1',1))).toBe(false)
  })
})

describe('time, shop goals, layout and memories',()=>{
  it('adds compatible defaults without changing an older family preference',()=>{
    const state=family()
    state.modules.pets.settingsByProfile['child-1']={...PET_DEFAULT_SETTINGS}
    delete state.modules.pets.settingsByProfile['child-1'].playMinutesPerDay
    expect(petSettingsFor(normalizeV7(state),'child-1').playMinutesPerDay).toBe(0)
  })
  it('counts actual round duration and caps overdue sessions at their own length',()=>{
    let state=apply(family(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,playMinutesPerDay:2}})
    state=apply(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'budget'})
    expect(petPlayTimeLeft(state,'child-1',T+30000)).toBe(90000)
    expect(petPlayTimeLeft(state,'child-1',T+90000)).toBe(60000)
    state=apply(state,'PET_END_PLAY',{sessionId:'budget',completed:false},T+30000)
    expect(petPlayTimeLeft(state,'child-1',T+90000)).toBe(90000)
    expect(playLimitFor('drawing')).toBe(180000)
  })
  it('stops new rounds at the budget but keeps basic care free',()=>{
    let state=apply(family(),'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,playMinutesPerDay:1}})
    state=apply(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'one'})
    state=apply(state,'PET_END_PLAY',{sessionId:'one',completed:false},T+60000)
    expect(()=>apply(state,'PET_BEGIN_PLAY',{game:'ball',sessionId:'two'},T+61000)).toThrow('玩耍时间到了')
    expect(petFor(apply(state,'PET_CARE',{action:'water'},T+61000)).lastAction).toBe('water')
    expect(petPlayTimeLeft(state,'child-1',T+86400000)).toBe(60000)
  })
  it('setting and cancelling a goal never spends stars or opens a purchase request',()=>{
    let state=apply(family(),'PET_SELECT_GOAL',{itemId:'robot'})
    expect(petFor(state).life.goalItemId).toBe('robot')
    expect(Object.keys(state.modules.pets.requests)).toHaveLength(0)
    expect(petBalance(state,'child-1')).toBe(100)
    state=apply(state,'PET_SELECT_GOAL',{itemId:null})
    expect(petFor(state).life.goalItemId).toBeNull()
  })
  it('clears a fulfilled goal after granting its real item',()=>{
    const state=grant(apply(family(),'PET_SELECT_GOAL',{itemId:'star-lamp'}),'star-lamp')
    expect(petFor(state).life.goalItemId).toBeNull()
    expect(petBalance(state,'child-1')).toBe(95)
  })
  it('moves only present items, validates coordinates and resets custom placement on a preset choice',()=>{
    let state=grant(family(),'star-lamp')
    expect(()=>apply(state,'PET_MOVE_OBJECT',{itemId:'star-lamp',point:{x:50,y:50}})).toThrow('已有的物件')
    state=apply(state,'PET_PLACE',{itemId:'star-lamp',slot:'lamp'})
    state=apply(state,'PET_MOVE_OBJECT',{itemId:'star-lamp',point:{x:25,y:60}})
    expect(petFor(state).life.layout['star-lamp']).toEqual({x:25,y:60})
    expect(()=>apply(state,'PET_MOVE_OBJECT',{itemId:'star-lamp',point:{x:200,y:60}})).toThrow()
    state=apply(state,'PET_PLACE',{itemId:'star-lamp',slot:'lamp',position:'right'})
    expect(petFor(state).life.layout['star-lamp']).toBeUndefined()
  })
  it('captures a snapshot that is not changed by later name or room changes',()=>{
    let state=apply(family(),'PET_SNAPSHOT'),snapshot=structuredClone(petFor(state).memories.at(-1).snapshot)
    state=apply(state,'PET_RENAME',{name:'新的名字'})
    expect(petFor(state).memories.at(-1).snapshot).toEqual(snapshot)
    expect(snapshot.name).toBe('糯糯')
  })
  it('requires opt-in for media and prevents another child reusing its metadata',()=>{
    let state=family()
    expect(()=>apply(state,'PET_ATTACH_MEDIA',{media})).toThrow('家长先开启')
    state=apply(state,'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,allowMedia:true}})
    state=apply(state,'PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,allowMedia:true}},T,'child-2')
    state=apply(state,'PET_ATTACH_MEDIA',{media})
    expect(()=>apply(state,'PET_ATTACH_MEDIA',{media},T,'child-2')).toThrow('不属于当前孩子')
    expect(()=>apply(state,'PET_ATTACH_MEDIA',{media:{...media,id:'media_mismatch_0002',kind:'audio'}})).toThrow('种类不一致')
    expect(petFor(state).memories.at(-1).media.status).toBe('local')
  })
  it('rejects prototype keys and malformed imported item ownership',()=>{
    const state=family()
    state.modules.pets.byProfile['child-1'].life.preferences=JSON.parse('{"__proto__":1}')
    expect(()=>normalizeV7(state)).toThrow()
  })
})

describe('robot trials have real different outcomes',()=>{
  it.each([
    ['small','low','fast',false,false],['small','high','slow',false,true],['large','low','fast',true,false],['large','high','fast',true,true],['large','low','slow',true,true],
  ])('%s wheels, %s walls, %s speed change crossing and spill', (wheels,wall,speed,crossing,steady)=>{
    expect(robotResult({wheels,wall,speed,extra:'none'})).toMatchObject({crossing,steady,delivered:crossing&&steady})
  })
  it('shows a distinct result for the child-selected invention',()=>{
    const base={wheels:'large',wall:'high',speed:'slow'}
    expect(robotResult({...base,extra:'hook'}).message).toContain('小钩子')
    expect(robotResult({...base,extra:'solar'}).message).toContain('太阳能板')
  })
})
