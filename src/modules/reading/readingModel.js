import { readingMode } from './bookCatalog.js'

export function readingState(state) {
  return { version: 1, books: [], sessions: {}, ...(state.modules?.reading || {}) }
}

export function activeReadingBooks(state) {
  return readingState(state).books.filter((book) => !book.archivedAt)
}

export function readingBook(state, bookId) {
  return activeReadingBooks(state).find((book) => book.id === bookId)
}

export function readingSessionsFor(state, profileId) {
  return Object.values(readingState(state).sessions)
    .filter((session) => session.profileId === profileId)
    .sort((a, b) => Number(b.startedAt || b.modeSelectedAt) - Number(a.startedAt || a.modeSelectedAt))
}

export function readingStats(state, profileId) {
  const completed = readingSessionsFor(state, profileId).filter((session) => session.completedAt)
  const modes = completed.reduce((counts, session) => {
    const family = readingMode(session.mode).family
    return { ...counts, [family]: (counts[family] || 0) + 1 }
  }, { listen: 0, together: 0, independent: 0 })
  const difficulties = completed.reduce((counts, session) => ({ ...counts, [session.difficulty]: (counts[session.difficulty] || 0) + 1 }), {})
  const helpCount = completed.filter((session) => session.helpRequestedAt).length
  const recentHard = completed.slice(0, 3).filter((session) => session.difficulty === 'hard').length
  return { completed, modes, difficulties, helpCount, recentHard }
}
