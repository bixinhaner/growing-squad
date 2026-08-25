import { describe, expect, it } from 'vitest'
import { getWateringExperience } from './wateringExperience.js'

describe('watering experience timelines', () => {
  it('gives early completion a full 18 second three-fruit celebration', () => {
    const experience = getWateringExperience('early')
    expect(experience.duration).toBe(18000)
    expect(experience.starCount).toBe(3)
    expect(experience.phases.at(-1).at).toBeLessThan(experience.duration)
  })

  it('keeps after-target completion warm but star-free for 10 seconds', () => {
    const experience = getWateringExperience('after-target')
    expect(experience.duration).toBe(10000)
    expect(experience.starCount).toBe(0)
    expect(experience.phases.some((phase) => phase.text.includes('没有扣分'))).toBe(true)
  })

  it('shortens motion when accessibility requests it without changing the outcome', () => {
    expect(getWateringExperience('early', true)).toMatchObject({ duration: 5200, starCount: 3 })
    expect(getWateringExperience('after-target', true)).toMatchObject({ duration: 3400, starCount: 0 })
  })
})
