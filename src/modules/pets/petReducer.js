import { newEconomy, levelProgress, badgeBalance, appendBadge, applyGrowth } from './petEconomy.js'
import { freshLife, rememberPreference, CREATION, GARDEN, POINT, hasWork, validWorkForGame, snapshotFor } from './petLife.js'
import { z } from 'zod'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { PET_ACTIONS, PET_GAMES, PET_ITEMS, PET_ROOMS, PET_SKILLS, PET_SPECIES, getPetItem, getSpecies } from './petCatalog.js'
import { emptyPetState, eggProgress, isPetQuiet, petAllowanceLeft, petBalance, petClock, petFor, petGameUnlocked, petGrowth, petRoundsLeft, petSettingsFor, petSettingsSchema, playLimitFor, petPlayTimeLeft } from './petModel.js'

const id = z.string().regex(/^[A-Za-z0-9:_-]{1,160}$/).refine((value) => !['__proto__', 'constructor', 'prototype'].includes(value))
const name = z.string().trim().min(1).max(12)
const schemas = {
  'pets.growth-requested': z.object({ amount:z.number().int().min(1).max(50), requestId:id }),
  'pets.badge-exchanged': z.object({ itemId:id, requestId:id }),
  'pets.goal-selected': z.object({ itemId: z.string().max(80).nullable() }),
  'pets.play-drafted': z.object({ sessionId:id, work:CREATION }),
  'pets.work-saved': z.object({ work: CREATION }),
  'pets.layout-updated': z.object({ itemId: z.string().max(80), point: POINT }),
  'pets.garden-updated': z.object({ garden: GARDEN }),
  'pets.snapshot-added': z.object({}),
  'pets.media-added': z.object({ media:z.object({ id:z.string().regex(/^media_[A-Za-z0-9_-]{8,150}$/),kind:z.enum(['photo','audio','drawing']),mediaType:z.enum(['image/png','image/jpeg','image/webp','audio/mp4','audio/webm','audio/wav','audio/mpeg']),fileName:z.string().max(160),byteSize:z.number().int().min(1).max(12*1024*1024),status:z.enum(['local','synced']).default('local') }) }),
  'pets.media-synced': z.object({ mediaId:z.string().regex(/^media_[A-Za-z0-9_-]{8,150}$/) }),
  'pets.memory-removed': z.object({ memoryId:z.string().max(160) }),
  'pets.adopted': z.object({ species: z.enum(PET_SPECIES.map((s) => s.id)), name, economyVersion:z.literal(2).optional() }),
  'pets.cared': z.object({ action: z.enum(Object.keys(PET_ACTIONS)) }),
  'pets.hatched': z.object({}),
  'pets.renamed': z.object({ name }),
  'pets.item-requested': z.object({ itemId: id, requestId: id }),
  'pets.item-approved': z.object({ requestId: id }),
  'pets.item-declined': z.object({ requestId: id }),
  'pets.item-cancelled': z.object({ requestId: id }),
  'pets.item-refunded': z.object({ requestId: id }),
  'pets.settings-updated': z.object({ settings: petSettingsSchema }),
  'pets.placed': z.object({ slot: z.enum(['rug', 'lamp', 'decor', 'toy', 'dress', 'house', 'bed']), itemId: z.string().max(80), position: z.enum(['left', 'middle', 'right']).optional() }),
  'pets.room-changed': z.object({ room: z.enum(PET_ROOMS.map((r) => r.id)) }),
  'pets.play-started': z.object({ sessionId: id, game: z.string().max(80) }),
  'pets.play-ended': z.object({ sessionId: id, completed: z.boolean(), choices: z.array(z.string().max(80)).max(30).optional(), work:CREATION.optional() }),
  'pets.memory-added': z.object({ note: z.string().trim().min(1).max(400) }),
  'pets.memory-pinned': z.object({ memoryId: z.string().nullable() }),
  'pets.life-shared': z.object({ sourceId: z.string().max(200) }),
}
function fail(message, status = 422) { throw Object.assign(new Error(message), { status }) }
function addMemory(pet, memory) {
  if (pet.memories.some((m) => m.id === memory.id)) return
  // Keep the album bounded without silently deleting the child's saved memories.
  if (pet.memories.length < 1000) pet.memories.push({ note: '', ...memory })
}
function grow(pet, day, key, at) {
  const before = petGrowth(pet)
  const entries = pet.growthDays[day] || []
  if (!entries.includes(key) && entries.length < 3) pet.growthDays[day] = [...entries, key]
  const after = petGrowth(pet)
  if (after.stage !== before.stage) addMemory(pet, { id: `stage:${after.stage}`, title: `慢慢长成了${after.label}`, at, kind: 'milestone', art: 'heart' })
}
function ledger(state, entry) {
  const entries = state.starLedger || state.rewards?.starLedger || []
  if (entries.some((e) => e.id === entry.id)) return
  const next = [...entries, entry]
  state.rewards = { ...state.rewards, starLedger: next }
  // Legacy selectors use the alias when it exists. Both must change atomically.
  if (Object.hasOwn(state, 'starLedger')) state.starLedger = next
}
function grantGrowth(state, pet, request, via, at) {
  if (!pet.economy || !pet.hatchedAt) fail('请先更新并迎接小伙伴出生。')
  if (petBalance(state, pet.profileId) < request.amount) fail('星光余额已经变化，没有扣除星光。',409)
  if (via === 'allowance' && petAllowanceLeft(state,pet.profileId,at) < request.amount) fail('今天的自主额度不够，请家长回应。',409)
  // All three records are part of the same rootReducer/SQLite transaction.
  const change = applyGrowth(pet,request.amount,request.id,at)
  ledger(state,{id:`pet-growth:${request.id}`,profileId:pet.profileId,delta:-request.amount,reason:`培养${pet.name}：${request.amount}颗星光`,petRequestId:request.id,createdAt:at})
  Object.assign(request,{status:'approved',approvedAt:at,cost:request.amount,via,purchaseDay:petClock(state,at).day,levels:change.gained})
  for (const level of change.gained) addMemory(pet,{id:`level:${level}`,title:`${pet.name}升到 ${level} 级啦`,at,kind:'milestone',art:'badge',note:'获得 15 枚徽章，可以兑换小屋和裙子。'})
  pet.lastAction='growth';pet.lastActionAt=at
}
function grantBadgeItem(state, pet, request, at) {
  const item=getPetItem(request.itemId)
  if (!pet.economy || !item || !Number.isInteger(item.badgePrice)) fail('请先更新徽章小铺。')
  if (pet.inventory[item.id]) return
  if (badgeBalance(pet) < item.badgePrice) fail('徽章余额已经变化，没有兑换。',409)
  appendBadge(pet,{id:`purchase:${request.id}`,delta:-item.badgePrice,reason:'purchase',requestId:request.id,at})
  Object.assign(request,{status:'approved',approvedAt:at,cost:item.badgePrice,via:'badge',purchaseDay:petClock(state,at).day})
  pet.inventory[item.id]={purchaseId:request.id,at}
  if (pet.life?.goalItemId===item.id)pet.life.goalItemId=null
  addMemory(pet,{id:`purchase:${request.id}`,title:`添了${item.name}`,at,kind:'purchase',art:item.art})
}
function grant(state, pet, request, via, at) {
  if (request.kind === 'growth') return grantGrowth(state,pet,request,via,at)
  if (request.currency === 'badge') return grantBadgeItem(state,pet,request,at)
  if (pet.economy) fail('这份旧星光物品申请已停止使用，请到徽章小铺重新选择。',409)

  const item = getPetItem(request.itemId)
  if (!item) fail('这个物件暂时没有开放。')
  if (pet.inventory[item.id]) fail('已经拥有这个物件，不会再扣星光。', 409)
  if (petBalance(state, pet.profileId) < item.price) fail('星光余额已经变化，没有扣除星光。', 409)
  if (via === 'allowance' && petAllowanceLeft(state, pet.profileId, at) < item.price) fail('今天的自主额度不够了，可以请家长回应。', 409)
  Object.assign(request, { status: 'approved', approvedAt: at, cost: item.price, via, purchaseDay: petClock(state, at).day })
  pet.inventory[item.id] = { purchaseId: request.id, at }
  if (pet.life?.goalItemId === item.id) pet.life.goalItemId = null
  ledger(state, { id: `pet:${request.id}`, profileId: pet.profileId, delta: -item.price, reason: `伙伴小铺：${item.name}`, petRequestId: request.id, createdAt: at })
  addMemory(pet, { id: `purchase:${request.id}`, title: `添了${item.name}`, at, kind: 'purchase', art: item.art })
}


function storeWork(pet, work, key, at) {
  if (!hasWork(work)) return
  const old = pet.life.creations.find((c)=>c.id===key)
  if (!old && pet.life.creations.length >= 100) fail('作品柜已经满了，请先让家长导出备份。')
  if (!old && pet.memories.length >= 1000) fail('相册已经装满，请先导出并整理。')
  if (old) { old.work=work; old.at=at }
  else pet.life.creations.push({id:key,at,work})
  const memory = {id:key,title:work.title,at,kind:'creation',art:work.kind==='blocks'?'blocks':work.kind==='robot'?'robot':'book',workId:key,note:'自己创作的作品，随时可以回看。'}
  const saved = pet.memories.find(m => m.id === key)
  if (saved) Object.assign(saved, memory)
  else addMemory(pet,memory)
}

/** Shared deterministic reducer; cloud applies it inside its existing SQLite transaction. */
export function petReducer(state, operation) {
  const profileId = operation.target.profileId
  if (operation.moduleId !== 'pets' || operation.target.entityType !== 'pet' || operation.target.entityId !== profileId) fail('伙伴操作的归属不正确。', 400)
  if (!state.profiles.some((p) => p.id === profileId)) fail('没有找到这个孩子。', 404)
  const schema = schemas[operation.type]
  const parsed = schema?.safeParse(operation.payload)
  if (!parsed?.success) fail('伙伴操作不完整，请重新试一次。', 400)
  const payload = parsed.data
  const at = operation.occurredAt
  if (!Number.isFinite(at) || at < 0) fail('这次记录的时间不正确。', 400)
  const module = state.modules?.pets || emptyPetState()
  const next = structuredClone(state)
  next.modules.pets = structuredClone(module)
  const pets = next.modules.pets
  if (operation.type === 'pets.settings-updated') {
    pets.settingsByProfile[profileId] = payload.settings
    next.meta = { ...next.meta, updatedAt: at }
    return next
  }
  if (operation.type === 'pets.adopted') {
    if (petFor(state, profileId)) return state
    const species = getSpecies(payload.species)
    pets.byProfile[profileId] = { id: `pet:${profileId}`, profileId, species: species.id, name: payload.name, adoptedAt: at, hatchedAt: null,
      eggCare: {}, room: 'moon-room', inventory: {}, placed: {}, positions: {}, skills: {}, growthDays: {}, playSessions: {},
      memories: [{ id: 'adopt', title: `把${species.eggName}带回了家`, at, kind: 'milestone', art: 'egg', note: '' }], lastAction: 'hello', lastActionAt: at, pinnedMemoryId: null, life:freshLife(), ...(payload.economyVersion===2?{economy:newEconomy()}:{}) }
    next.meta = { ...next.meta, updatedAt: at }
    return next
  }
  const pet = pets.byProfile[profileId]
  if (!pet) fail('先选一颗星光蛋吧。')
  if (at < pet.adoptedAt) fail('这次记录比领养时间还早，请检查设备时间。', 409)
  pet.life ??= freshLife()
  const day = petClock(next, at).day
  switch (operation.type) {
    case 'pets.cared': {
      if (!pet.hatchedAt && !['hello', 'blanket', 'hum'].includes(payload.action)) fail('先陪这颗蛋认识新家吧。')
      if (!pet.hatchedAt) pet.eggCare[payload.action] ??= at
      else {
        grow(pet, day, `care:${payload.action}`, at)
        rememberPreference(pet.life, `care:${payload.action}`, day)
        if (['bath','brush'].includes(payload.action)) pet.life.dirt = 0
        if (['feed', 'brush', 'sleep'].includes(payload.action)) addMemory(pet, { id: `first:${payload.action}`, title: `第一次${PET_ACTIONS[payload.action].name}`, at, kind: 'milestone', art: PET_ACTIONS[payload.action].art })
      }
      pet.lastAction = payload.action; pet.lastActionAt = at
      break
    }
    case 'pets.hatched': {
      if (pet.hatchedAt) return state
      if (!eggProgress(pet, at).ready) fail('它还在准备破壳，先去做别的事也没关系。')
      pet.hatchedAt = at; pet.lastAction = 'hatch'; pet.lastActionAt = at
      addMemory(pet, { id: 'hatch', title: `${pet.name}破壳啦`, at, kind: 'milestone', art: 'egg', note: '这是我们的第一次见面。破壳动画可以随时重看。' })
      break
    }
    case 'pets.goal-selected': {
      if (payload.itemId && (!getPetItem(payload.itemId) || pet.inventory[payload.itemId])) fail('请选择尚未拥有的小物件。')
      pet.life.goalItemId = payload.itemId
      break
    }
    case 'pets.renamed': pet.name = payload.name; break
    case 'pets.growth-requested': {
      if (!pet.economy || !pet.hatchedAt) fail('先迎接小伙伴破壳，再用星光培养。')
      const existing=pets.requests[payload.requestId]
      if (existing) {
        if (existing.profileId!==profileId || existing.kind!=='growth' || existing.amount!==payload.amount) fail('这个申请编号已经被使用。',409)
        return state
      }
      if (Object.values(pets.requests).some(r=>r.profileId===profileId&&r.kind==='growth'&&r.status==='pending')) fail('已经有一份培养申请等家长回应。',409)
      if(payload.amount>levelProgress(pet).capacity) fail('超过满级需要的星光，请减少数量。',409)
      if(petBalance(next,profileId)<payload.amount) fail('星光还不够，基础照顾和普通玩耍一直免费。',409)
      const request={id:payload.requestId,profileId,itemId:'pet-growth',kind:'growth',currency:'starlight',amount:payload.amount,cost:payload.amount,status:'pending',requestedAt:at}
      pets.requests[request.id]=request
      if(petSettingsFor(next,profileId).spending==='allowance' && petAllowanceLeft(next,profileId,at)>=payload.amount) grantGrowth(next,pet,request,'allowance',at)
      break
    }
    case 'pets.badge-exchanged': {
      if(!pet.economy) fail('请先更新徽章小铺。')
      const item=getPetItem(payload.itemId)
      if(!item) fail('这个物件暂时没有开放。')
      const existing=pets.requests[payload.requestId]
      if(existing) {
        if(existing.profileId!==profileId||existing.itemId!==item.id||existing.currency!=='badge')fail('这个申请编号已经被使用。',409)
        return state
      }
      if(pet.inventory[item.id])return state
      const request={id:payload.requestId,profileId,itemId:item.id,kind:'item',currency:'badge',cost:item.badgePrice,status:'pending',requestedAt:at}
      pets.requests[request.id]=request
      grantBadgeItem(next,pet,request,at)
      break
    }
    case 'pets.item-requested': {
      if(pet.economy) fail('物品已改为徽章兑换；旧版不会自动扣款，请更新后重新选择。',409)

      const item = getPetItem(payload.itemId)
      if (!item) fail('这个物件暂时没有开放。')
      if (pets.requests[payload.requestId]) {
        const old = pets.requests[payload.requestId]
        if (old.profileId !== profileId || old.itemId !== item.id) fail('这个申请编号已经被使用。', 409)
        return state
      }
      if (pet.inventory[item.id]) return state
      if (Object.values(pets.requests).some((r) => r.profileId === profileId && r.itemId === item.id && r.status === 'pending')) return state
      if (petBalance(next, profileId) < item.price) fail('星光还不够，基础照顾和普通玩耍一直可以用。', 409)
      const request = { id: payload.requestId, profileId, itemId: item.id, requestedAt: at, cost: item.price, status: 'pending' }
      pets.requests[request.id] = request
      if (petSettingsFor(next, profileId).spending === 'allowance' && petAllowanceLeft(next, profileId, at) >= item.price) grant(next, pet, request, 'allowance', at)
      break
    }
    case 'pets.item-approved':
    case 'pets.item-declined':
    case 'pets.item-cancelled':
    case 'pets.item-refunded': {
      const request = pets.requests[payload.requestId]
      if (!request || request.profileId !== profileId) fail('没有找到属于这个孩子的申请。', 404)
      if (operation.type === 'pets.item-refunded') {
        if (request.status === 'refunded') return state
        if (request.kind === 'growth') fail('已经投入的培养会永久保留，不能换回星光；未批准的申请可取消。',409)
        if (request.status !== 'approved' || at < request.approvedAt || at - request.approvedAt > 30000) fail('这笔兑换已超过 30 秒撤销时间。', 409)
        if (pet.inventory[request.itemId]?.purchaseId !== request.id) fail('物件归属已变化。', 409)
        delete pet.inventory[request.itemId]
        delete pet.life.layout[request.itemId]
        for (const [slot, itemId] of Object.entries(pet.placed)) if (itemId === request.itemId) delete pet.placed[slot]
        if (getPetItem(request.itemId)?.room === pet.room) pet.room = 'moon-room'
        request.status = 'refunded'; request.refundedAt = at
        if(request.currency==='badge') appendBadge(pet,{id:`refund:${request.id}`,delta:request.cost,at,reason:'refund',requestId:request.id})
        else ledger(next, { id: `pet-refund:${request.id}`, profileId, delta: request.cost, reason: `撤销伙伴兑换：${getPetItem(request.itemId).name}`, petRequestId: request.id, createdAt: at })
        const memory = pet.memories.find((m) => m.id === `purchase:${request.id}`)
        if (memory) memory.title = `撤销了${getPetItem(request.itemId).name}的兑换`
      } else {
        if (request.status !== 'pending') return state
        if (operation.type === 'pets.item-approved') grant(next, pet, request, 'parent', at)
        else request.status = operation.type === 'pets.item-declined' ? 'declined' : 'cancelled'
      }
      break
    }
    case 'pets.placed': {
      const item = getPetItem(payload.itemId)
      if (payload.itemId && (!item || item.slot !== payload.slot || !pet.inventory[item.id])) fail('只能摆放自己已经拥有的物件。')
      if (payload.itemId) pet.placed[payload.slot] = payload.itemId
      else delete pet.placed[payload.slot]
      if (payload.position) {
        pet.positions[payload.slot] = payload.position
        if (payload.itemId) delete pet.life.layout[payload.itemId]
      }
      break
    }
    case 'pets.room-changed': {
      const room = PET_ROOMS.find((r) => r.id === payload.room)
      if (room.itemId && !pet.inventory[room.itemId]) fail('先在星光小铺解锁这间小屋。')
      pet.room = room.id
      break
    }
    case 'pets.play-started': {
      if (!pet.hatchedAt) fail('等小伙伴破壳后再一起玩吧。')
      if (!petGameUnlocked(pet, payload.game)) fail('这个玩法还没有解锁。')
      if (pet.playSessions[payload.sessionId]) return state
      if (isPetQuiet(next, profileId, at)) fail('现在是安静时间，玩具已经收好。')
      if (petPlayTimeLeft(next, profileId, at) <= 0) fail('今天约好的玩耍时间到了，作品已经收好。')
      if (petRoundsLeft(next, profileId, at) <= 0) fail('今天的小回合已经玩完啦，回忆会保留。')
      if (Object.values(pet.playSessions).some((s) => !s.endedAt && at < s.startedAt + playLimitFor(s.game))) fail('先结束正在玩的这一小轮吧。', 409)
      for (const old of Object.values(pet.playSessions)) if (!old.endedAt) {
        if (old.work) { storeWork(pet, old.work, `work:${old.id}`, at); old.workSaved = true; delete old.work }
        old.endedAt = old.startedAt + playLimitFor(old.game); old.completed = false
      }
      pet.playSessions[payload.sessionId] = { id: payload.sessionId, game: payload.game, startedAt: at, day, endedAt: null, completed: false, choices: [] }
      break
    }
    case 'pets.play-drafted': {
      const session=pet.playSessions[payload.sessionId]
      if(!session) fail('找不到这一轮游戏。')
      if(session.endedAt) return state
      if(!validWorkForGame(payload.work,session.game)) fail('作品与这轮玩法不对应。')
      if (!petGameUnlocked(pet, session.game)) fail('对应的玩具已收回小铺，先解锁再继续。')
      session.work=payload.work
      break
    }
    case 'pets.play-ended': {
      const session = pet.playSessions[payload.sessionId]
      if (!session) fail('找不到这一轮游戏。', 404)
      if (session.endedAt) return state
      const elapsed = at - session.startedAt
      if (elapsed < 0) fail('这次结束时间早于开始，请检查设备时间。',409)
      const completed = payload.completed && elapsed >= 3000 && elapsed <= playLimitFor(session.game) + 5000 && petGameUnlocked(pet, session.game) && !isPetQuiet(next, profileId, at)
      session.endedAt = at; session.completed = completed; session.choices = payload.choices || []
      const work=payload.work || session.work
      if (work) {
        if (!validWorkForGame(work, session.game)) fail('作品与这轮玩法不对应。')
        storeWork(pet, work, `work:${session.id}`, at)
        session.workSaved = true; delete session.work
      }
      if (completed) {
        grow(pet, day, `play:${session.game}`, at)
        rememberPreference(pet.life,session.game,day)
        if (['ball','family','story-picnic'].includes(session.game)) pet.life.dirt = Math.min(3, pet.life.dirt + 1)
        const skill = PET_SKILLS.find((s) => `skill-${s.id}` === session.game)
        if (skill) {
          pet.skills[skill.id] = Math.min(3, (pet.skills[skill.id] || 0) + 1)
          if (pet.skills[skill.id] === 3) addMemory(pet, { id: `skill:${skill.id}`, title: `学会了${skill.name}`, at, kind: 'milestone', art: skill.art })
        } else {
          const game = PET_GAMES.find((g) => g.id === session.game)
          addMemory(pet, { id: `first:${session.game}`, title: `一起玩了${game.name}`, at, kind: session.game.startsWith('story-') ? 'story' : 'play', art: game.art, note: session.choices.join(' → ') })
        }
        pet.lastAction = 'play'; pet.lastActionAt = at
      }
      break
    }
    case 'pets.work-saved': {
      if (!pet.hatchedAt) fail('先迎接小伙伴出生吧。')
      if (payload.work.kind === 'blocks' && !pet.inventory.blocks || payload.work.kind === 'robot' && !pet.inventory.robot) fail('先解锁对应的玩具。')
      storeWork(pet,payload.work,`work:${operation.id}`,at)
      break
    }
    case 'pets.layout-updated': {
      if (!['food','bed','toy'].includes(payload.itemId) && !Object.entries(pet.placed).some(([slot,id])=>slot!=='dress' && id===payload.itemId)) fail('只能移动小屋里已有的物件。')
      pet.life.layout[payload.itemId] = payload.point
      break
    }
    case 'pets.garden-updated': {
      if (!pet.hatchedAt) fail('先迎接小伙伴出生吧。')
      pet.life.garden = {...payload.garden, updatedAt:at}
      addMemory(pet,{id:'family-garden',title:'我为家庭花园添了一朵花',at,kind:'creation',art:'plant',note:payload.garden.note})
      break
    }
    case 'pets.snapshot-added': {
      if(pet.memories.length>=1000) fail('相册已满，请先备份。')
      addMemory(pet,{id:operation.id,title:`${pet.name}的小屋纪念画`,at,kind:'snapshot',art:'frame',snapshot:snapshotFor(pet,petGrowth(pet).stage),note:'保存了此刻的房间、装扮和成长模样，不是现实照片。'})
      break
    }
    case 'pets.media-added': {
      if(!petSettingsFor(next,profileId).allowMedia) fail('需要家长先开启照片与语音记录。',403)
      if(pet.memories.length>=1000) fail('相册已满，请先备份。')
      if ((payload.media.kind==='audio') !== payload.media.mediaType.startsWith('audio/')) fail('资料种类不一致。')
      if (Object.values(pets.byProfile).some((p)=>p.profileId!==profileId && p.memories.some((m)=>m.media?.id===payload.media.id))) fail('这份资料不属于当前孩子。',403)
      addMemory(pet,{id:payload.media.id,title:payload.media.kind==='audio'?'我说给伙伴听的话':'我想留下的画面',at,kind:'media',art:payload.media.kind==='audio'?'music':'frame',media:payload.media,note:'家庭资料；不做语音识别或外部 AI 分析。'})
      break
    }
    case 'pets.media-synced': {
      const memory=pet.memories.find((m)=>m.media?.id===payload.mediaId)
      if(memory) memory.media.status='synced'
      break
    }
    case 'pets.memory-removed': {
      const target = pet.memories.find(m => m.id === payload.memoryId)
      if (!target) return state
      if (!['creation','snapshot','media','note'].includes(target.kind)) fail('出生和成长记录保留在相册中。')
      pet.memories=pet.memories.filter((m)=>m.id!==payload.memoryId)
      pet.life.creations=pet.life.creations.filter((c)=>c.id!==payload.memoryId)
      if(pet.pinnedMemoryId===payload.memoryId) pet.pinnedMemoryId=null
      break
    }
    case 'pets.memory-added': {
      if (pet.memories.length >= 1000) fail('相册已经装满，请先让家长导出备份。')
      addMemory(pet, { id: operation.id, title: `和${pet.name}的小片段`, at, kind: 'note', art: 'frame', note: payload.note })
      break
    }
    case 'pets.memory-pinned': {
      if (payload.memoryId && !pet.memories.some((m) => m.id === payload.memoryId)) fail('只能展示自己的回忆。')
      pet.pinnedMemoryId = payload.memoryId
      break
    }
    case 'pets.life-shared': {
      const source = activityMomentsFor(state, profileId).find((m) => m.id === payload.sourceId)
      if (!source || source.at > at) fail('没有找到这份真实记录。')
      addMemory(pet, { id: `life:${source.id}`, title: '把生活里的小事讲给伙伴听', at, kind: 'life', art: 'book', note: source.title, sourceId: source.id })
      // Story-sharing does NOT mint stars or manufacture a new real-life completion.
      break
    }
    default: return state
  }
  next.meta = { ...next.meta, updatedAt: at }
  return next
}

export const petOperationTypes = Object.keys(schemas)
export const petCatalogIds = PET_ITEMS.map((item) => item.id)
