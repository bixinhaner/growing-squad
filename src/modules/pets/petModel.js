import { SPECIES_IDS } from './petSpecies.js'
import { economySchema, newEconomy, levelProgress, badgeBalance, evolveStage } from './petEconomy.js'
import { LIFE, SNAPSHOT, CREATION, SAFE_KEY } from './petLife.js'
import { z } from 'zod'
import { getPetItem, PET_GAMES, PET_SKILLS } from './petCatalog.js'

export const HATCH_MIN_MS = 2 * 60000
export const HATCH_AUTO_MS = 6 * 60 * 60000
export const PLAY_MS = 60000
export const playLimitFor = (game) => ['blocks','robot','theater','drawing'].includes(game) ? 180000 : PLAY_MS
export const PET_DEFAULT_SETTINGS = Object.freeze({ spending: 'ask', dailyAllowance: 10, roundsPerDay: 10, quietStart: '21:00', quietEnd: '07:00', keepSmall: false, simpleMode: false, allowMedia: false, playMinutesPerDay: 0 })
const finiteTime = z.number().finite().nonnegative()
const identifier = z.string().min(1).max(160)
export const petSettingsSchema = z.object({ spending: z.enum(['ask', 'allowance']), dailyAllowance: z.number().int().min(0).max(200), roundsPerDay: z.number().int().min(1).max(30), quietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), quietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), keepSmall: z.boolean(), simpleMode:z.boolean().default(false), allowMedia:z.boolean().default(false), playMinutesPerDay:z.number().int().min(0).max(120).default(0) })
const memorySchema = z.object({ id: identifier, title: z.string().max(200), at: finiteTime, kind: z.enum(['milestone', 'play', 'story', 'life', 'note', 'purchase', 'creation', 'snapshot', 'media']), art: z.string().max(60), note: z.string().max(400).default(''), sourceId: z.string().max(200).optional(), workId:z.string().max(200).optional(), snapshot:SNAPSHOT.optional(), work:CREATION.optional(), media:z.object({id:z.string().regex(/^media_[A-Za-z0-9_-]{8,150}$/),kind:z.enum(['photo','audio','video','drawing']),mediaType:z.enum(['image/png','image/jpeg','image/webp','audio/mp4','audio/webm','audio/wav','audio/mpeg']),fileName:z.string().max(160),byteSize:z.number().int().min(1).max(12*1024*1024),status:z.enum(['local','synced']).default('local')}).optional() }).passthrough()
const petSchema = z.object({ id: identifier, profileId: identifier, economy: economySchema.optional(), species: z.enum(SPECIES_IDS), name: z.string().min(1).max(12), adoptedAt: finiteTime, hatchedAt: finiteTime.nullable(), eggCare: z.record(SAFE_KEY, finiteTime), room: z.enum(['moon-room', 'forest', 'space']), inventory: z.record(SAFE_KEY, z.object({ purchaseId: identifier, at: finiteTime })), placed: z.record(SAFE_KEY, z.string()), positions: z.record(SAFE_KEY, z.enum(['left', 'middle', 'right'])), skills: z.record(SAFE_KEY, z.number().int().min(0).max(3)), growthDays: z.record(SAFE_KEY, z.array(z.string()).max(3)), memories: z.array(memorySchema).max(1000), playSessions: z.record(SAFE_KEY, z.object({ id: identifier, game: z.string().max(80), startedAt: finiteTime, day: z.string(), endedAt: finiteTime.nullable(), completed: z.boolean(), workSaved:z.boolean().optional(), work: CREATION.optional(), choices: z.array(z.string().max(80)).max(30).default([]) })), lastAction: z.string(), lastActionAt: finiteTime, pinnedMemoryId: z.string().nullable().default(null), life: LIFE.default(() => LIFE.parse({})) }).passthrough()
const requestSchema = z.object({ id: identifier, profileId: identifier, itemId: z.string(), kind: z.enum(['item','growth']).optional(), currency: z.enum(['starlight','badge']).optional(), amount: z.number().int().min(1).max(50).optional(), levels: z.array(z.number().int().min(2).max(20)).max(19).optional(), status: z.enum(['pending', 'approved', 'declined', 'cancelled', 'refunded']), requestedAt: finiteTime, approvedAt: finiteTime.optional(), refundedAt: finiteTime.optional(), cost: z.number().int().min(0).max(200), via: z.enum(['parent', 'allowance', 'badge']).optional(), purchaseDay: z.string().optional() }).passthrough()
export const petStateSchema = z.object({ version: z.literal(1), byProfile: z.record(SAFE_KEY, petSchema), settingsByProfile: z.record(SAFE_KEY, petSettingsSchema), requests: z.record(SAFE_KEY, requestSchema) })
export function emptyPetState() { return { version: 1, byProfile: {}, settingsByProfile: {}, requests: {} } }
export function normalizePetState(value, profiles) {
  // Zod deliberately strips __proto__ from records. Reject it explicitly so an
  // imported malformed backup does not appear to have been fully preserved.
  const pending = [value], visited = new WeakSet()
  while (pending.length) {
    const item = pending.pop()
    if (!item || typeof item !== 'object' || visited.has(item)) continue
    visited.add(item)
    for (const key of Object.keys(item)) {
      if (['__proto__','constructor','prototype'].includes(key)) throw new Error('伙伴备份中包含不安全的字段。')
      if (item[key] && typeof item[key] === 'object') pending.push(item[key])
    }
  }
  const parsed = petStateSchema.parse(value || emptyPetState())
  for (const pet of Object.values(parsed.byProfile)) {
    if (!pet.economy) {
      const stage = petGrowth(pet).stage
      pet.economy = newEconomy(stage === 'egg' ? 'baby' : stage, true)
    }
    for (const request of Object.values(parsed.requests)) {
      if (request.profileId !== pet.profileId) continue
      request.kind ||= 'item'
      request.currency ||= 'starlight'
      if (request.kind === 'item' && request.currency === 'starlight' && request.status === 'pending') {
        request.status = 'cancelled'; request.migrationReason = 'badge-shop-upgrade'
      }
    }
    const growthReceipts=Object.values(parsed.requests).filter(r=>r.profileId===pet.profileId&&r.kind==='growth'&&r.status==='approved')
    if(growthReceipts.reduce((sum,r)=>sum+Number(r.amount),0)!==pet.economy.invested) throw new Error('培养投入与星光记录不一致，请使用完整备份。')
    for(const entry of pet.economy.badgeLedger) {
      const request=parsed.requests[entry.requestId]
      if(!request || request.profileId!==pet.profileId) throw new Error('徽章记录缺少对应的家庭凭据。')
      if(entry.reason==='level' && (request.kind!=='growth'||request.status!=='approved'||!request.levels?.includes(entry.level))) throw new Error('升级徽章与培养记录不一致。')
      if(entry.reason!=='level' && (request.currency!=='badge'||entry.reason==='refund'&&request.status!=='refunded'||entry.reason==='purchase'&&!['approved','refunded'].includes(request.status)||Math.abs(entry.delta)!==request.cost)) throw new Error('徽章兑换与退款记录不一致。')
    }
    for (const itemId of Object.keys(pet.inventory)) if (!getPetItem(itemId)) throw new Error('伙伴备份中包含未识别的物件，请先更新应用。')
    for (const [slot, itemId] of Object.entries(pet.placed)) if (!pet.inventory[itemId] || getPetItem(itemId)?.slot !== slot) throw new Error('伙伴备份中的家具归属不完整。')
    for (const key of Object.keys(pet.life.layout)) if (!['food','bed','toy'].includes(key) && !pet.inventory[key]) delete pet.life.layout[key]
    if (pet.life.goalItemId && !getPetItem(pet.life.goalItemId)) pet.life.goalItemId = null
    if (pet.pinnedMemoryId && !pet.memories.some((m) => m.id === pet.pinnedMemoryId)) throw new Error('伙伴备份中的墙上回忆不存在。')
  }
  const ids = new Set(profiles.map((p) => p.id))
  return { ...parsed, byProfile: Object.fromEntries(Object.entries(parsed.byProfile).filter(([id, pet]) => ids.has(id) && pet.profileId === id)), settingsByProfile: Object.fromEntries(Object.entries(parsed.settingsByProfile).filter(([id]) => ids.has(id))), requests: Object.fromEntries(Object.entries(parsed.requests).filter(([, r]) => ids.has(r.profileId))) }
}
export const petFor = (state, profileId = state.activeProfileId || state.profiles?.[0]?.id) => state.modules?.pets?.byProfile?.[profileId] || null
export const petSettingsFor = (state, profileId) => ({ ...PET_DEFAULT_SETTINGS, ...state.modules?.pets?.settingsByProfile?.[profileId] })
export function petClock(state, timestamp) {
  let parts
  const at = new Date(timestamp)
  try { parts = new Intl.DateTimeFormat('en-CA', { timeZone: state.family?.timezone || 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at) }
  catch { parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at) }
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return { day: `${p.year}-${p.month}-${p.day}`, minute: Number(p.hour) * 60 + Number(p.minute) }
}
export function isPetQuiet(state, profileId, timestamp) {
  const { quietStart, quietEnd } = petSettingsFor(state, profileId)
  const minutes = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const start = minutes(quietStart), end = minutes(quietEnd), now = petClock(state, timestamp).minute
  return start === end ? false : start > end ? now >= start || now < end : now >= start && now < end
}
export function eggProgress(pet, now) {
  const steps = ['hello', 'blanket', 'hum'].filter((key) => pet?.eggCare?.[key] !== undefined).length
  const age = Math.max(0, now - (pet?.adoptedAt ?? now))
  const ready = !pet?.hatchedAt && ((steps === 3 && age >= HATCH_MIN_MS) || age >= HATCH_AUTO_MS)
  return { steps, ready, crack: ready ? 2 : steps >= 2 ? 1 : 0, minutes: Math.max(0, Math.ceil((HATCH_MIN_MS - age) / 60000)) }
}
export function petGrowth(pet) {
  const experiences = Object.values(pet?.growthDays || {}).reduce((sum, entries) => sum + entries.length, 0)
  const days = Object.keys(pet?.growthDays || {}).length
  if (pet?.economy) {
    const stage = !pet.hatchedAt ? 'egg' : evolveStage(pet)
    return { experiences, days, ...levelProgress(pet), stage, label: ({egg:'星光蛋',baby:'小小幼崽',young:'小伙伴',companion:'大伙伴'})[stage] }
  }
  return { experiences, days, stage: !pet?.hatchedAt ? 'egg' : experiences >= 18 && days >= 6 ? 'companion' : experiences >= 6 && days >= 2 ? 'young' : 'baby', label: !pet?.hatchedAt ? '星光蛋' : experiences >= 18 && days >= 6 ? '大伙伴' : experiences >= 6 && days >= 2 ? '小伙伴' : '小小幼崽' }
}
export function petBalance(state, profileId) {
  return (state.starLedger || state.rewards?.starLedger || []).reduce((sum, e) => e.profileId === profileId || (!e.profileId && state.profiles.length === 1) ? sum + Number(e.delta || 0) : sum, 0)
}
export function petAllowanceLeft(state, profileId, now) {
  const day = petClock(state, now).day
  const spent = Object.values(state.modules?.pets?.requests || {}).filter((r) => r.profileId === profileId && r.status === 'approved' && r.via === 'allowance' && r.currency !== 'badge' && r.purchaseDay === day).reduce((sum, r) => sum + r.cost, 0)
  return Math.max(0, petSettingsFor(state, profileId).dailyAllowance - spent)
}
export function petRoundsLeft(state, profileId, now) {
  const day = petClock(state, now).day
  return Math.max(0, petSettingsFor(state, profileId).roundsPerDay - Object.values(petFor(state, profileId)?.playSessions || {}).filter((s) => s.day === day).length)
}
export function petGameUnlocked(pet, gameId) {
  const game = PET_GAMES.find((g) => g.id === gameId)
  if (game) return !game.itemId || Boolean(pet?.inventory?.[game.itemId])
  const skill = PET_SKILLS.find((s) => `skill-${s.id}` === gameId)
  return Boolean(skill && (!skill.minLevel || levelProgress(pet).level >= skill.minLevel) && (!skill.itemId || pet?.inventory?.[skill.itemId] || pet?.economy && levelProgress(pet).level >= (skill.id === 'spin' ? 2 : 4)))
}
export function purchaseStatus(state, profileId, itemId, now) {
  const pet = petFor(state, profileId), item = getPetItem(itemId)
  if (!pet || !item) return { allowed: false, label: '先领养一颗蛋' }
  if (pet.inventory[itemId]) return { allowed: false, label: '已经拥有' }
  if (pet.economy) return badgeBalance(pet) < item.badgePrice
    ? { allowed:false, label:`还差 ${item.badgePrice-badgeBalance(pet)} 枚徽章` }
    : { allowed:true, auto:true, label:`${item.badgePrice} 枚徽章兑换`, currency:'badge' }

  const pending = Object.values(state.modules?.pets?.requests || {}).find((r) => r.profileId === profileId && r.itemId === itemId && r.status === 'pending')
  if (pending) return { allowed: false, label: '等家长回应', request: pending }
  if (petBalance(state, profileId) < item.price) return { allowed: false, label: `还差 ${Math.ceil(item.price - petBalance(state, profileId))} 星光` }
  const auto = petSettingsFor(state, profileId).spending === 'allowance' && petAllowanceLeft(state, profileId, now) >= item.price
  return { allowed: true, auto, label: auto ? `${item.price} 星光兑换` : '请家长同意' }
}

/** Optional play-time budget. Quiet care and read-only memories stay available. */
export function petPlayTimeLeft(state, profileId, now) {
  const budget = petSettingsFor(state, profileId).playMinutesPerDay
  if (!budget) return Infinity
  const day = petClock(state, now).day
  const used = Object.values(petFor(state, profileId)?.playSessions || {})
    .filter(session => session.day === day)
    .reduce((total, session) => total + Math.max(0, Math.min(playLimitFor(session.game), (session.endedAt ?? now) - session.startedAt)), 0)
  return Math.max(0, budget * 60000 - used)
}

export function growthRequestStatus(state, profileId, amount, now) {
  const pet = petFor(state, profileId), progress = levelProgress(pet)
  if (!pet?.hatchedAt) return {allowed:false,label:'先迎接小伙伴破壳'}
  if (progress.maxed) return {allowed:false,label:'已经达到 20 级，成长永久保留'}
  if (!Number.isInteger(amount) || amount < 1 || amount > 50 || amount > progress.capacity) return {allowed:false,label:'请调整这次培养的数量'}
  if (petBalance(state,profileId) < amount) return {allowed:false,label:'星光还不够，照顾和玩耍仍然免费'}
  const pending = Object.values(state.modules.pets.requests).find(r=>r.profileId===profileId&&r.kind==='growth'&&r.status==='pending')
  if (pending) return {allowed:false,label:'有一份培养申请等家长回应',request:pending}
  const auto=petSettingsFor(state,profileId).spending==='allowance' && petAllowanceLeft(state,profileId,now)>=amount
  return {allowed:true,auto,label:auto?`确认投入 ${amount} 颗星光`:'请家长同意这次培养'}
}
