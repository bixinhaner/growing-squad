function ensureReading(state) {
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.reading = { version: 1, books: [], sessions: {}, ...(next.modules.reading || {}) }
  next.growth ||= { moments: [], world: {}, collections: [] }
  next.growth.world ||= {}
  return next
}
export function readingReducer(state, operation) {
  const next = ensureReading(state)
  const reading = next.modules.reading
  const payload = operation.payload
  const profileId = operation.target.profileId
  if (operation.type === 'reading.book.added') {
    if (!reading.books.some((b) => b.id === payload.book.id)) reading.books.push({ ...payload.book, source: 'family-owned', createdAt: operation.occurredAt })
  } else if (operation.type === 'reading.book.updated') {
    reading.books = reading.books.map((b) => b.id === payload.bookId ? { ...b, ...payload.patch, updatedAt: operation.occurredAt } : b)
  } else {
    const sessionId = payload.sessionId
    const previous = reading.sessions[sessionId] || { id: sessionId, profileId, bookId: payload.bookId, initiatedBy: payload.initiatedBy || 'unknown' }
    if (previous.profileId !== profileId) return state
    if (operation.type === 'reading.mode.selected') reading.sessions[sessionId] = { ...previous, mode: payload.mode, modeSelectedAt: operation.occurredAt, status: 'selected' }
    else if (operation.type === 'reading.session.started') reading.sessions[sessionId] = { ...previous, mode: payload.mode || previous.mode, startedAt: previous.startedAt || operation.occurredAt, status: 'active' }
    else if (operation.type === 'reading.help.requested') reading.sessions[sessionId] = { ...previous, helpRequestedAt: operation.occurredAt, helpResolvedAt: null }
    else if (operation.type === 'reading.session.completed') {
      if (!previous.completedAt) {
        reading.sessions[sessionId] = { ...previous, completedAt: operation.occurredAt, status: 'reflection' }
        const world = next.growth.world[profileId] || {}
        next.growth.world[profileId] = { ...world, storyLeaves: [...(world.storyLeaves || []), { id: `story:${sessionId}`, bookId: previous.bookId, createdAt: operation.occurredAt }] }
      }
    } else if (operation.type === 'reading.difficulty.recorded') reading.sessions[sessionId] = { ...previous, difficulty: payload.difficulty, difficultyRecordedAt: operation.occurredAt }
    else if (operation.type === 'reading.reflection.added') reading.sessions[sessionId] = { ...previous,
      reflection: { mode: payload.mode, prompt: payload.prompt, note: String(payload.note || '').slice(0, 500), noteSource: ['child', 'parent', 'unknown'].includes(payload.noteSource) ? payload.noteSource : 'unknown' }, reflectedAt: operation.occurredAt, status: 'done' }
  }
  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
