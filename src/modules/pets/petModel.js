import { LIFE, SNAPSHOT, CREATION } from './petLife.js'
import { z } from 'zod'
import { getPetItem, PET_GAMES, PET_SKILLS } from './petCatalog.js'

export const HATCH_MIN_MS = 2 * 60000
export const HATCH_AUTO_MS = 6 * 60 * 60000
export const PLAY_MS = 60000
export const playLimitFor = (game) => ['blocks','robot','theater'].includes(game) ? 180000 : PLAY_MS
export const PET_DEFAULT_SETTINGS = Object.freeze({ spending: 'ask', dailyAllowance: 10, roundsPerDay: 10, quietStart: '21:00', quietEnd: '07:00', keepSmall: false, simpleMode: false, allowMedia: false })
const finiteTime = z.number().finite().nonnegative()
const identifier = z.string().min(1).max(160)
export const petSettingsSchema = z.object({ spending: z.enum(['ask', 'allowance']), dailyAllowance: z.number().int().min(0).max(200), roundsPerDay: z.number().int().min(1).max(30), quietStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), quietEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), keepSmall: z.boolean(), simpleMode:z.boolean().default(false), allowMedia:z.boolean().default(false) })
const memorySchema = z.object({ id: identifier, title: z.string().max(200), at: finiteTime, kind: z.enum(['milestone', 'play', 'story', 'life', 'note', 'purchase', 'creation', 'snapshot', 'media']), art: z.string().max(60), note: z.string().max(400).default(''), sourceId: z.string().max(200).optional(), snapshot:SNAPSHOT.optional(), work:CREATION.optional(), media:z.object({id:z.string().regex(/^media_[A-Za-z0-9_-]{8,150}$/),kind:z.enum(['photo','audio','video','drawing']),mediaType:z.enum(['image/png','image/jpeg','image/webp','audio/mp4','audio/webm','audio/wav','audio/mpeg']),fileName:z.string().max(160),byteSize:z.number().int().min(1).max(12*1024*1024),status:z.enum(['local','synced']).default('local')}).optional() }).passthrough()
const petSchema = z.object({ id: identifier, profileId: identifier, species: z.enum(['bear', 'rabbit', 'cloud', 'space-cat']), name: z.string().min(1).max(12), adoptedAt: finiteTime, hatchedAt: finiteTime.nullable(), eggCare: z.record(z.string(), finiteTime), room: z.enum(['moon-room', 'forest', 'space']), inventory: z.record(z.string(), z.object({ purchaseId: identifier, at: finiteTime })), placed: z.record(z.string(), z.string()), positions: z.record(z.string(), z.enum(['left', 'middle', 'right'])), skills: z.record(z.string(), z.number().int().min(0).max(3)), growthDays: z.record(z.string(), z.array(z.string()).max(3)), memories: z.array(memorySchema).max(1000), playSessions: z.record(z.string(), z.object({ id: identifier, game: z.string().max(80), startedAt: finiteTime, day: z.string(), endedAt: finiteTime.nullable(), completed: z.boolean(), work: CREATION.optional(), choices: z.array(z.string().max(80)).max(30).default([]) })), lastAction: z.string(), lastActionAt: finiteTime, pinnedMemoryId: z.string().nullable().default(null), life: LIFE.default(() => LIFE.parse({})) }).passthrough()
const requestSchema = z.object({ id: identifier, profileId: identifier, itemId: z.string(), status: z.enum(['pending', 'approved', 'declined', 'cancelled', 'refunded']), requestedAt: finiteTime, approvedAt: finiteTime.optional(), refundedAt: finiteTime.optional(), cost: z.number().int().min(0).max(200), via: z.enum(['parent', 'allowance']).optional(), purchaseDay: z.string().optional() }).passthrough()
export const petStateSchema = z.object({ version: z.literal(1), byProfile: z.record(z.string(), petSchema), settingsByProfile: z.record(z.string(), petSettingsSchema), requests: z.record(z.string(), requestSchema) })
export function emptyPetState() { return { version: 1, byProfile: {}, settingsByProfile: {}, requests: {} } }
export function normalizePetState(value, profiles) {
  const parsed = petStateSchema.parse(value || emptyPetState())
  for (const pet of Object.values(parsed.byProfile)) {
    for (const itemId of Object.keys(pet.inventory)) if (!getPetItem(itemId)) throw new Error('伙伴备份中包含未识别的物件，请先更新应用。')
    for (const [slot, itemId] of Object.entries(pet.placed)) if (!pet.inventory[itemId] || getPetItem(itemId)?.slot !== slot) throw new Error('伙伴备份中的家具归属不完整。')
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
  return { experiences, days, stage: !pet?.hatchedAt ? 'egg' : experiences >= 18 && days >= 6 ? 'companion' : experiences >= 6 && days >= 2 ? 'young' : 'baby', label: !pet?.hatchedAt ? '星光蛋' : experiences >= 18 && days >= 6 ? '大伙伴' : experiences >= 6 && days >= 2 ? '小伙伴' : '小小幼崽' }
}
export function petBalance(state, profileId) {
  return (state.starLedger || state.rewards?.starLedger || []).reduce((sum, e) => e.profileId === profileId || (!e.profileId && state.profiles.length === 1) ? sum + Number(e.delta || 0) : sum, 0)
}
export function petAllowanceLeft(state, profileId, now) {
  const day = petClock(state, now).day
  const spent = Object.values(state.modules?.pets?.requests || {}).filter((r) => r.profileId === profileId && r.status === 'approved' && r.via === 'allowance' && r.purchaseDay === day).reduce((sum, r) => sum + r.cost, 0)
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
  return Boolean(skill && (!skill.itemId || pet?.inventory?.[skill.itemId]))
}
export function purchaseStatus(state, profileId, itemId, now) {
  const pet = petFor(state, profileId), item = getPetItem(itemId)
  if (!pet || !item) return { allowed: false, label: '先领养一颗蛋' }
  if (pet.inventory[itemId]) return { allowed: false, label: '已经拥有' }
  const pending = Object.values(state.modules?.pets?.requests || {}).find((r) => r.profileId === profileId && r.itemId === itemId && r.status === 'pending')
  if (pending) return { allowed: false, label: '等家长回应', request: pending }
  if (petBalance(state, profileId) < item.price) return { allowed: false, label: `还差 ${Math.ceil(item.price - petBalance(state, profileId))} 星光` }
  const auto = petSettingsFor(state, profileId).spending === 'allowance' && petAllowanceLeft(state, profileId, now) >= item.price
  return { allowed: true, auto, label: auto ? `${item.price} 星光兑换` : '请家长同意' }
}
