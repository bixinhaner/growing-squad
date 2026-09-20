import { z } from 'zod'
import { activityMomentsFor } from '../../core/activity/activitySelectors.js'
import { PET_ACTIONS, PET_GAMES, PET_ITEMS, PET_ROOMS, PET_SKILLS, PET_SPECIES, getPetItem, getSpecies } from './petCatalog.js'
import { emptyPetState, eggProgress, isPetQuiet, petAllowanceLeft, petBalance, petClock, petFor, petGameUnlocked, petGrowth, petRoundsLeft, petSettingsFor, petSettingsSchema, PLAY_MS } from './petModel.js'

const id = z.string().regex(/^[A-Za-z0-9:_-]{1,160}$/).refine((value) => !['__proto__', 'constructor', 'prototype'].includes(value))
const name = z.string().trim().min(1).max(12)
const schemas = {
  'pets.adopted': z.object({ species: z.enum(PET_SPECIES.map((s) => s.id)), name }),
  'pets.cared': z.object({ action: z.enum(Object.keys(PET_ACTIONS)) }),
  'pets.hatched': z.object({}),
  'pets.renamed': z.object({ name }),
  'pets.item-requested': z.object({ itemId: id, requestId: id }),
  'pets.item-approved': z.object({ requestId: id }),
  'pets.item-declined': z.object({ requestId: id }),
  'pets.item-cancelled': z.object({ requestId: id }),
  'pets.item-refunded': z.object({ requestId: id }),
  'pets.settings-updated': z.object({ settings: petSettingsSchema }),
  'pets.placed': z.object({ slot: z.enum(['rug', 'lamp', 'decor', 'toy', 'dress']), itemId: z.string().max(80), position: z.enum(['left', 'middle', 'right']).optional() }),
  'pets.room-changed': z.object({ room: z.enum(PET_ROOMS.map((r) => r.id)) }),
  'pets.play-started': z.object({ sessionId: id, game: z.string().max(80) }),
  'pets.play-ended': z.object({ sessionId: id, completed: z.boolean(), choices: z.array(z.string().max(80)).max(6).optional() }),
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
function grant(state, pet, request, via, at) {
  const item = getPetItem(request.itemId)
  if (!item) fail('这个物件暂时没有开放。')
  if (pet.inventory[item.id]) fail('已经拥有这个物件，不会再扣星光。', 409)
  if (petBalance(state, pet.profileId) < item.price) fail('星光余额已经变化，没有扣除星光。', 409)
  if (via === 'allowance' && petAllowanceLeft(state, pet.profileId, at) < item.price) fail('今天的自主额度不够了，可以请家长回应。', 409)
  Object.assign(request, { status: 'approved', approvedAt: at, cost: item.price, via, purchaseDay: petClock(state, at).day })
  pet.inventory[item.id] = { purchaseId: request.id, at }
  ledger(state, { id: `pet:${request.id}`, profileId: pet.profileId, delta: -item.price, reason: `伙伴小铺：${item.name}`, petRequestId: request.id, createdAt: at })
  addMemory(pet, { id: `purchase:${request.id}`, title: `添了${item.name}`, at, kind: 'purchase', art: item.art })
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
      memories: [{ id: 'adopt', title: `把${species.eggName}带回了家`, at, kind: 'milestone', art: 'egg', note: '' }], lastAction: 'hello', lastActionAt: at, pinnedMemoryId: null }
    next.meta = { ...next.meta, updatedAt: at }
    return next
  }
  const pet = pets.byProfile[profileId]
  if (!pet) fail('先选一颗星光蛋吧。')
  if (at < pet.adoptedAt) fail('这次记录比领养时间还早，请检查设备时间。', 409)
  const day = petClock(next, at).day
  switch (operation.type) {
    case 'pets.cared': {
      if (!pet.hatchedAt && !['hello', 'blanket', 'hum'].includes(payload.action)) fail('先陪这颗蛋认识新家吧。')
      if (!pet.hatchedAt) pet.eggCare[payload.action] ??= at
      else {
        grow(pet, day, `care:${payload.action}`, at)
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
    case 'pets.renamed': pet.name = payload.name; break
    case 'pets.item-requested': {
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
        if (request.status !== 'approved' || at < request.approvedAt || at - request.approvedAt > 30000) fail('这笔兑换已超过 30 秒撤销时间。', 409)
        if (pet.inventory[request.itemId]?.purchaseId !== request.id) fail('物件归属已变化。', 409)
        delete pet.inventory[request.itemId]
        for (const [slot, itemId] of Object.entries(pet.placed)) if (itemId === request.itemId) delete pet.placed[slot]
        if (getPetItem(request.itemId)?.room === pet.room) pet.room = 'moon-room'
        request.status = 'refunded'; request.refundedAt = at
        ledger(next, { id: `pet-refund:${request.id}`, profileId, delta: request.cost, reason: `撤销伙伴兑换：${getPetItem(request.itemId).name}`, petRequestId: request.id, createdAt: at })
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
      if (payload.position) pet.positions[payload.slot] = payload.position
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
      if (petRoundsLeft(next, profileId, at) <= 0) fail('今天的小回合已经玩完啦，回忆会保留。')
      if (Object.values(pet.playSessions).some((s) => !s.endedAt && at < s.startedAt + PLAY_MS)) fail('先结束正在玩的这一小轮吧。', 409)
      for (const old of Object.values(pet.playSessions)) if (!old.endedAt) { old.endedAt = old.startedAt + PLAY_MS; old.completed = false }
      pet.playSessions[payload.sessionId] = { id: payload.sessionId, game: payload.game, startedAt: at, day, endedAt: null, completed: false, choices: [] }
      break
    }
    case 'pets.play-ended': {
      const session = pet.playSessions[payload.sessionId]
      if (!session) fail('找不到这一轮游戏。', 404)
      if (session.endedAt) return state
      const elapsed = at - session.startedAt
      const completed = payload.completed && elapsed >= 3000 && elapsed <= PLAY_MS + 5000 && petGameUnlocked(pet, session.game) && !isPetQuiet(next, profileId, at)
      session.endedAt = at; session.completed = completed; session.choices = payload.choices || []
      if (completed) {
        grow(pet, day, `play:${session.game}`, at)
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
