import { describe, expect, it } from 'vitest'
import { createDefaultData } from './model.js'
import { normalizeV7 } from './v7.js'

describe('v7 bedtime task normalization', () => {
  it('adds required care tasks to existing routines exactly once without changing existing steps', () => {
    const current = createDefaultData()
    const withoutCareTasks = {
      ...current,
      modules: {
        ...current.modules,
        bedtime: {
          ...current.modules.bedtime,
          routines: current.modules.bedtime.routines.map((routine) => ({
            ...routine,
            steps: routine.steps.filter((step) => !['eye-drops', 'nasal-rinse', 'foot-bath'].includes(step.id)),
          })),
        },
      },
    }

    const once = normalizeV7(withoutCareTasks)
    const twice = normalizeV7(once)

    for (const routine of twice.modules.bedtime.routines) {
      expect(routine.steps.filter((step) => step.id === 'eye-drops')).toHaveLength(1)
      expect(routine.steps.filter((step) => step.id === 'nasal-rinse')).toHaveLength(1)
      expect(routine.steps.filter((step) => step.id === 'foot-bath')).toHaveLength(1)
      expect(routine.steps[0].id).toBe('brush')
    }
    expect(twice.modules.bedtime.routines).toEqual(once.modules.bedtime.routines)
  })
})
