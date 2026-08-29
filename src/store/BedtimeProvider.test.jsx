import { describe, expect, it, vi } from 'vitest'
import { drainCloudActions } from './drainCloudActions.js'

describe('drainCloudActions', () => {
  it('uses the successful action response and does not need a second state refresh', async () => {
    let items = [{ id: 'op-one', action: { type: 'COMPLETE_TASK' }, requiresParent: false }]
    const payload = { revision: 6, state: { version: 6 } }
    const sendAction = vi.fn().mockResolvedValue(payload)

    const result = await drainCloudActions({
      readItems: () => items,
      writeItems: (next) => { items = next },
      getToken: () => 'device-token',
      sendAction,
    })

    expect(result).toEqual({ status: 'saved', payload, cursor: 0, conflicts: [] })
    expect(items).toEqual([])
    expect(sendAction).toHaveBeenCalledTimes(1)
  })

  it('keeps an action queued while an earlier action is being sent', async () => {
    const first = { id: 'op-one', action: { type: 'COMPLETE_TASK' }, requiresParent: false }
    const second = { id: 'op-two', action: { type: 'COMPLETE_TASK' }, requiresParent: false }
    let items = [first]
    const sendAction = vi.fn(async (item) => {
      if (item.id === first.id) items = [...items, second]
      return { revision: item.id === first.id ? 6 : 7, state: { version: 6 } }
    })

    const result = await drainCloudActions({
      readItems: () => items,
      writeItems: (next) => { items = next },
      getToken: () => 'device-token',
      sendAction,
    })

    expect(result.payload.revision).toBe(7)
    expect(items).toEqual([])
    expect(sendAction).toHaveBeenCalledTimes(2)
  })

  it('leaves parent changes queued until a parent token is available', async () => {
    const pending = { id: 'op-parent', action: { type: 'UPDATE_SCHEDULE' }, requiresParent: true }
    let items = [pending]
    const sendAction = vi.fn()

    const result = await drainCloudActions({
      readItems: () => items,
      writeItems: (next) => { items = next },
      getToken: () => '',
      sendAction,
    })

    expect(result.status).toBe('needs-parent')
    expect(items).toEqual([pending])
    expect(sendAction).not.toHaveBeenCalled()
  })
})
