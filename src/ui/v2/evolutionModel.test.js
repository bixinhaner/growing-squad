import { describe, expect, it } from 'vitest'
import { filterMemories, nextBedtimeStep, familyPulse, sectionName } from './evolutionModel.js'

describe('V2 presentation never invents or changes family history', () => {
  const memories = [
    { id: 'r', sourceModule: 'reading', title: '读了星星', note: '孩子说月亮像小船' },
    { id: 'b', sourceModule: 'bedtime', title: '完成了晚间准备' },
  ]
  it('filters actual memories without changing them', () => {
    expect(filterMemories(memories, 'reading')).toEqual([memories[0]])
    expect(filterMemories(memories)).toHaveLength(2)
    expect(memories).toHaveLength(2)
  })
  it('searches real words and leaves an empty result empty', () => {
    expect(filterMemories(memories, 'all', ' 小船 ')).toEqual([memories[0]])
    expect(filterMemories(memories, 'bedtime', '小船')).toEqual([])
  })
  it('focus skips finished, skipped and disabled tasks but does not complete them', () => {
    const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c', enabled: false }, { id: 'd' }]
    const statuses = { a: 'done', b: 'skipped' }
    expect(nextBedtimeStep(steps, statuses)).toEqual(steps[3])
    expect(statuses).toEqual({ a: 'done', b: 'skipped' })
  })
  it('does not restart a completed list', () => expect(nextBedtimeStep([{ id: 'a' }], { a: 'done' })).toBeNull())
  it('keeps each child’s own pending wishes separate', () => {
    const state = { profiles: [{ id: 'a', name: '姐姐' }, { id: 'b', name: '妹妹' }], rewards: { requests: [{ profileId: 'b', status: 'pending' }] } }
    const result = familyPulse(state, 1000)
    expect(result.map((r) => r.wishes)).toEqual([0, 1])
    expect(result.every((r) => r.latest === null)).toBe(true)
  })
  it('never presents future-dated records as household history', () => {
    const state = { profiles: [{ id: 'a' }], modules: { inventor: { projects: [{ id: 'idea', profileId: 'a', updatedAt: 2000 }] } } }
    expect(familyPulse(state, 1000)[0].latest).toBeNull()
  })
  it('labels deep parent routes without assuming a current child', () => {
    expect(sectionName('/parent/reading')).toBe('家庭书架')
    expect(sectionName('/parent/data')).toBe('数据与安全')
  })
})
