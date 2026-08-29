import { describe, expect, it } from 'vitest'
import { READING_COVER_OPTIONS, READING_MODES } from './bookCatalog.js'
import { readingReducer } from './readingReducer.js'
import { readingStats } from './readingModel.js'

const initial = { modules: { reading: { version: 1, books: [], sessions: {} } }, growth: { world: {} }, meta: {} }
const op = (type, payload, at = 100) => ({ type, payload, occurredAt: at, target: { profileId: 'kid-1' } })

describe('reading bridge', () => {
  it('uses original covers and separates listening from independent reading', () => {
    expect(READING_COVER_OPTIONS).toHaveLength(12)
    expect(READING_MODES.map((mode) => mode.family)).toEqual(['listen', 'together', 'together', 'independent'])
    expect(JSON.stringify(READING_MODES)).not.toMatch(/score|star|rank|speed|minute|星光|排名|速度|分钟/)
  })

  it('persists a complete session and one story leaf without star rewards', () => {
    const id = 'reading-demo'
    let state = readingReducer(initial, op('reading.mode.selected', { sessionId: id, bookId: 'book-1', mode: 'read-together' }))
    state = readingReducer(state, op('reading.session.started', { sessionId: id, bookId: 'book-1', mode: 'read-together' }, 200))
    state = readingReducer(state, op('reading.help.requested', { sessionId: id }, 250))
    state = readingReducer(state, op('reading.session.completed', { sessionId: id }, 300))
    state = readingReducer(state, op('reading.session.completed', { sessionId: id }, 301))
    state = readingReducer(state, op('reading.difficulty.recorded', { sessionId: id, difficulty: 'just-right' }, 400))
    state = readingReducer(state, op('reading.reflection.added', { sessionId: id, mode: 'skip', prompt: '你最喜欢谁？' }, 500))
    expect(state.modules.reading.sessions[id]).toMatchObject({ status: 'done', mode: 'read-together', difficulty: 'just-right' })
    expect(state.growth.world['kid-1'].storyLeaves).toHaveLength(1)
    expect(state.rewards).toBeUndefined()
    expect(readingStats(state, 'kid-1').modes.together).toBe(1)
  })
})
