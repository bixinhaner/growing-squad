import { getCompletionOutcome } from '../../domain/model.js'

export const WEEKDAY = '日一二三四五六'

/** 0 resting pot · 1 seed · 2 sprout · 3 bud · 4 moonflower */
export function gardenStage(session, today) {
  if (!session) return today ? 1 : 0
  if (session.status === 'goodnight') return 4
  const values = Object.values(session.stepStatus || {})
  const resolved = values.length ? values.filter((status) => status !== 'todo').length / values.length : 0
  return resolved === 0 ? 1 : resolved < 0.5 ? 2 : 3
}

/** Stars actually awarded for finishing early that night (never inferred). */
export const starFruit = (session) => (session?.status === 'goodnight' && getCompletionOutcome(session) === 'early' ? Number(session.starsAwarded || 0) : 0)

export function gardenLine(session, stage, today) {
  const outcome = getCompletionOutcome(session)
  if (stage === 4) return outcome === 'early' ? `提前走完小路，花上结了 ${starFruit(session)} 点星光果！`
    : outcome === 'on-time' ? '按时走完小路，月亮花开啦。' : '走完了睡前小路，月亮花照常开了。'
  if (today) return ['', '种子在等今晚的第一件小事。', '冒出小芽了，继续加油。', '花苞鼓鼓的，快开花了。'][stage] || '种子在等今晚的第一件小事。'
  return stage === 0 ? '这盆花那天在休息。休息不是失败。' : '那天做了一部分，也是真的努力。'
}
