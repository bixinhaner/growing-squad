import { z } from 'zod'

/** The table is versioned: changing it must never recalculate already earned levels. */
export const LEVEL_COSTS = Object.freeze([5, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 60, 60, 60, 60])
export const MAX_LEVEL = LEVEL_COSTS.length + 1
export const MAX_GROWTH = LEVEL_COSTS.reduce((a, b) => a + b, 0)
export const BADGES_PER_LEVEL = 15
export const badgeEntrySchema = z.object({
  id: z.string().min(1).max(200), delta: z.number().int().min(-200).max(15),
  at: z.number().finite().nonnegative(), reason: z.enum(['level', 'purchase', 'refund']),
  level: z.number().int().min(2).max(MAX_LEVEL).optional(), requestId: z.string().max(160).optional(),
})
export const economySchema = z.object({
  version: z.literal(2), rules: z.literal('starlight-2026-01'), invested: z.number().int().min(0).max(MAX_GROWTH),
  legacyStage: z.enum(['baby', 'young', 'companion']).default('baby'),
  badgeLedger: z.array(badgeEntrySchema).max(20000), migrated: z.boolean().default(false),
}).superRefine((value, context) => {
  const ids = new Set(), levels = new Set()
  let balance = 0
  for (const entry of value.badgeLedger) {
    if (ids.has(entry.id)) context.addIssue({ code: 'custom', message: '徽章流水编号重复。' })
    ids.add(entry.id)
    if (entry.reason === 'level') {
      if (!entry.level || levels.has(entry.level) || entry.delta !== BADGES_PER_LEVEL || entry.level > levelProgress(value).level) context.addIssue({ code: 'custom', message: '升级徽章记录不一致。' })
      levels.add(entry.level)
    } else if (!entry.requestId || (entry.reason === 'purchase' ? entry.delta >= 0 : entry.delta <= 0)) context.addIssue({ code: 'custom', message: '徽章兑换记录不一致。' })
    balance += entry.delta
    if (balance < 0) context.addIssue({ code: 'custom', message: '徽章余额不能为负数。' })
  }
  if (levels.size !== levelProgress(value).level - 1) context.addIssue({ code: 'custom', message: '升级和徽章记录不完整。' })
})
export function newEconomy(legacyStage = 'baby', migrated = false) {
  return { version: 2, rules: 'starlight-2026-01', invested: 0, legacyStage, badgeLedger: [], migrated }
}
export function levelProgress(petOrEconomy) {
  const economy = petOrEconomy?.economy || petOrEconomy
  const invested = Number(economy?.invested || 0)
  let level = 1, used = 0
  for (const cost of LEVEL_COSTS) {
    if (invested < used + cost) break
    used += cost; level++
  }
  const cost = LEVEL_COSTS[level - 1] || 0
  return { level, invested, progress: invested - used, cost, remaining: cost ? cost - (invested - used) : 0, maxed: level === MAX_LEVEL, capacity: MAX_GROWTH - invested }
}
export function badgeBalance(pet) { return (pet?.economy?.badgeLedger || []).reduce((n, entry) => n + entry.delta, 0) }
export function appendBadge(pet, entry) {
  if (pet.economy.badgeLedger.some(old => old.id === entry.id)) return false
  if (pet.economy.badgeLedger.length >= 20000) throw Object.assign(new Error('徽章记录已满，请让家长导出并联系维护者。'), { status: 409 })
  if (badgeBalance(pet) + entry.delta < 0) throw Object.assign(new Error('徽章余额已经变化，没有兑换。'), { status: 409 })
  pet.economy.badgeLedger.push(entry)
  return true
}
export function applyGrowth(pet, amount, requestId, at) {
  const before = levelProgress(pet)
  if (!Number.isInteger(amount) || amount < 1 || amount > 50 || amount > before.capacity) throw Object.assign(new Error('培养数量不正确，或已经达到满级。'), { status: 409 })
  pet.economy.invested += amount
  const after = levelProgress(pet)
  const gained = []
  for (let level = before.level + 1; level <= after.level; level++) {
    if (appendBadge(pet, { id: `level:${level}`, delta: BADGES_PER_LEVEL, at, reason: 'level', level, requestId })) gained.push(level)
  }
  return { before: before.level, level: after.level, gained, badges: gained.length * BADGES_PER_LEVEL }
}
export function evolveStage(pet) {
  const level = levelProgress(pet).level
  const stage = level >= 6 ? 'companion' : level >= 3 ? 'young' : 'baby'
  const order = ['baby', 'young', 'companion']
  return order[Math.max(order.indexOf(stage), order.indexOf(pet?.economy?.legacyStage || 'baby'))]
}
export const SIGNATURES = Object.freeze({
  unicorn: { name: '彩虹跃跃', copy: '踮脚、跳起，再送你一道彩虹。', effect: 'rainbow' },
  puppy: { name: '快乐叼球', copy: '找到小球，轻轻叼回来。', effect: 'paw' },
  rabbit: { name: '花瓣蹦蹦', copy: '耳朵抖一抖，跳进花瓣里。', effect: 'flower' },
  fox: { name: '月光尾舞', copy: '尾巴轻轻展开，绕出月光。', effect: 'moon' },
  chick: { name: '啾啾翅膀舞', copy: '拍拍小翅膀，跳一小段舞。', effect: 'feather' },
  bear: { name: '星星抱抱', copy: '张开小手，抱住一颗小星星。', effect: 'star' },
  cloud: { name: '云朵变变', copy: '伸一伸，再软软地缩回来。', effect: 'cloud' },
  'space-cat': { name: '星球小跳', copy: '踩着星星，轻轻跳起来。', effect: 'planet' },
})
export const signatureFor = pet => SIGNATURES[pet?.species] || SIGNATURES.bear
