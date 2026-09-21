import { z } from 'zod'
import { levelProgress } from './petEconomy.js'
import { SPECIES_IDS } from './petSpecies.js'

// Reject special object keys in imported records as well as live operations.
export const SAFE_KEY = z.string().min(1).max(200).refine(key => !['__proto__', 'constructor', 'prototype'].includes(key))

export const POINT = z.object({ x: z.number().finite().min(8).max(92), y: z.number().finite().min(16).max(88) })
export const BLOCK = z.object({ x: z.number().int().min(0).max(5), y: z.number().int().min(0).max(3), color: z.enum(['yellow','green','blue','pink']), shape: z.enum(['square','roof','circle']), turn: z.number().int().min(0).max(3) })
export const ROBOT = z.object({ wheels: z.enum(['small','large']), wall: z.enum(['low','high']), speed: z.enum(['slow','fast']), extra: z.enum(['none','hook','solar']) })
export const ACTS = ['wave','hop','spin','bow','cuddle','sleep']
export const CREATION = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('blocks'), title: z.string().trim().min(1).max(40), blocks: z.array(BLOCK).max(24).refine(blocks => new Set(blocks.map(b => `${b.x}:${b.y}`)).size === blocks.length, '每个格子只放一块积木') }),
  z.object({ kind: z.literal('theater'), title: z.string().trim().min(1).max(40), scene: z.enum(['forest','moon-room','space']), acts: z.array(z.enum(ACTS)).max(6) }),
  z.object({ kind: z.literal('robot'), title: z.string().trim().min(1).max(40), robot: ROBOT, trials: z.number().int().min(0).max(100) }),
  z.object({ kind: z.literal('drawing'), title: z.string().trim().min(1).max(40), strokes: z.array(z.object({ color: z.enum(['brown','green','blue','pink','yellow']), points: z.array(z.tuple([z.number().finite().min(0).max(100), z.number().finite().min(0).max(100)])).min(1).max(180) })).max(80).refine(strokes => strokes.reduce((n,s) => n+s.points.length,0) <= 1600, '这幅画已画满，请先保存作品') }),
])
export const GARDEN = z.object({ flower: z.enum(['daisy','tulip','star']), color: z.enum(['yellow','pink','blue']), place: z.enum(['left','middle','right']), note: z.string().trim().max(60), updatedAt: z.number().finite().nonnegative().optional() })
export const LIFE = z.object({
  preferences: z.record(SAFE_KEY, z.number().int().min(0).max(999)).default({}),
  preferenceDays: z.record(SAFE_KEY, z.array(z.string()).max(20)).default({}),
  dirt: z.number().int().min(0).max(3).default(0),
  creations: z.array(z.object({ id: z.string().max(160), at: z.number().nonnegative(), work: CREATION })).max(100).default([]),
  layout: z.record(SAFE_KEY, POINT).default({}),
  garden: GARDEN.nullable().default(null),
  goalItemId: z.string().max(80).nullable().default(null),
})
export const freshLife = () => LIFE.parse({})
export function rememberPreference(life, key, day) {
  const seen = life.preferenceDays[day] || []
  if (seen.includes(key) || seen.length >= 20) return
  life.preferenceDays[day] = [...seen, key]
  life.preferences[key] = Math.min(999, (life.preferences[key] || 0) + 1)
  // Counters preserve preferences; the deduplication window need not grow forever.
  const days = Object.keys(life.preferenceDays).sort()
  if (days.length > 60) delete life.preferenceDays[days[0]]
}
const NAMES = { ball:'滚球', hide:'找找看', blocks:'搭积木', theater:'小剧场', robot:'小发明', 'story-welcome':'听故事', 'story-picnic':'去野餐', 'story-robot':'机器人故事', family:'家庭花园', 'care:brush':'梳梳毛', 'care:bath':'泡泡澡', 'care:feed':'小点心', 'care:water':'喝水', 'care:sleep':'小毯子' }
export function favoriteFor(pet) {
  const favorite = Object.entries(pet?.life?.preferences || {}).filter(([key,count]) => NAMES[key] && count >= 2).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return favorite ? { id: favorite[0], name: NAMES[favorite[0]], days: favorite[1] } : null
}
export function idleBehavior(pet, cycle = 0) {
  const fav = favoriteFor(pet)
  const available = [
    { action:'look', message:'它抬起头，看看窗外的小风景。', spot:'middle' },
    { action:'stretch', message:'伸个懒腰，舒服地坐一会儿。', spot:'left' },
  ]
  if (pet?.skills?.tidy >= 3) available.push({ action:'tidy',message:'你教会它的本领：它自己把球收回篮子啦。',spot:'right' })
  if (pet?.skills?.wave >= 3) available.push({ action:'wave',message:'它记得你教的招呼，向你挥挥手。',spot:'middle' })
  if (fav?.id === 'ball') available.push({action:'offer',message:'它把最近爱玩的球推到你身边。',spot:'middle'})
  return available[cycle % available.length]
}
export function robotResult(robot) {
  const steady = robot.wall === 'high' || robot.speed === 'slow'
  const crossing = robot.wheels === 'large'
  return { steady, crossing, delivered: steady && crossing, message: !crossing ? '小轮子卡在了小台阶。试试大轮子。' : !steady ? '车太快、挡板太低，球滚出去了。慢一点或加高挡板再试试。' : robot.extra === 'hook' ? '球送到了！小钩子还带来了一个篮子。' : robot.extra === 'solar' ? '球送到了！屋顶的小太阳能板也装好啦。' : '球稳稳送到了。这个办法成功了！' }
}
export function validWorkForGame(work, game) {
  return work.kind === game || work.kind === 'robot' && game === 'story-robot'
}
export function hasWork(work) { return work.kind === 'blocks' ? work.blocks.length > 0 : work.kind === 'theater' ? work.acts.length > 0 : work.kind === 'robot' ? work.trials > 0 : work.strokes.length > 0 }
export function snapshotFor(pet, stage) {
  return { level: levelProgress(pet).level, species:pet.species, name:pet.name, room:pet.room, stage, placed:{...pet.placed}, layout:{...(pet.life?.layout || {})} }
}
export const SNAPSHOT = z.object({ level: z.number().int().min(1).max(20).default(1), species:z.enum(SPECIES_IDS),name:z.string().max(12),room:z.enum(['moon-room','forest','space']),stage:z.enum(['baby','young','companion','egg']),placed:z.record(SAFE_KEY,z.string().max(80)),layout:z.record(SAFE_KEY,POINT) })
