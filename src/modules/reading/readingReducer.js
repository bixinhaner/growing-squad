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
    if (!reading.books.some((book) => book.id === payload.book.id)) reading.books.push({ ...payload.book, source: 'family-owned', createdAt: operation.occurredAt })
  } else if (operation.type === 'reading.book.updated') {
    reading.books = reading.books.map((book) => book.id === payload.bookId ? { ...book, ...payload.patch, updatedAt: operation.occurredAt } : book)
  } else {
    const sessionId = payload.sessionId
    const previous = reading.sessions[sessionId] || { id: sessionId, profileId, bookId: payload.bookId, initiatedBy: payload.initiatedBy || 'child' }
    if (operation.type === 'reading.mode.selected') {
      reading.sessions[sessionId] = { ...previous, mode: payload.mode, modeSelectedAt: operation.occurredAt, status: 'selected' }
    } else if (operation.type === 'reading.session.started') {
      reading.sessions[sessionId] = { ...previous, mode: payload.mode || previous.mode, startedAt: operation.occurredAt, status: 'active' }
    } else if (operation.type === 'reading.help.requested') {
      reading.sessions[sessionId] = { ...previous, helpRequestedAt: operation.occurredAt }
    } else if (operation.type === 'reading.session.completed') {
      if (!previous.completedAt) {
        reading.sessions[sessionId] = { ...previous, completedAt: operation.occurredAt, status: 'reflection' }
        const world = next.growth.world[profileId] || { storyLeaves: [] }
        const leaves = world.storyLeaves || []
        next.growth.world[profileId] = { ...world, storyLeaves: [...leaves, { id: `story:${sessionId}`, bookId: previous.bookId, createdAt: operation.occurredAt }] }
      }
    } else if (operation.type === 'reading.difficulty.recorded') {
      reading.sessions[sessionId] = { ...previous, difficulty: payload.difficulty, difficultyRecordedAt: operation.occurredAt }
    } else if (operation.type === 'reading.reflection.added') {
      reading.sessions[sessionId] = { ...previous, reflection: { mode: payload.mode, prompt: payload.prompt, note: payload.note || '' }, reflectedAt: operation.occurredAt, status: 'done' }
    }
  }
  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
