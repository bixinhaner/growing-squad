import { MOVEMENT_ACTIVITIES } from './activityCatalog.js'

export function movementState(state) {
  return { version: 1, sessions: {}, preferencesByProfile: {}, ...(state.modules?.movement || {}) }
}

export function movementSessionsFor(state, profileId) {
  return Object.values(movementState(state).sessions).filter((item) => item.profileId === profileId).sort((a, b) => Number(b.startedAt || b.selectedAt) - Number(a.startedAt || a.selectedAt))
}

export function movementRecommendations(state, profileId, count = 2) {
  const movement = movementState(state)
  const preferences = movement.preferencesByProfile[profileId] || {}
  const sessions = movementSessionsFor(state, profileId)
  const feedback = Object.fromEntries(sessions.filter((item) => item.feedback).map((item) => [item.activityId, item.feedback]))
  const recent = sessions.slice(0, 4).map((item) => item.activityId)
  const pool = MOVEMENT_ACTIVITIES.filter((item) => preferences.rainMode !== true || item.environment === 'indoor')
  return [...pool].sort((a, b) => {
    const score = (item) => (feedback[item.id] === 'again' ? 4 : feedback[item.id] === 'hard' ? -3 : 0) - (recent.includes(item.id) ? 2 : 0)
    return score(b) - score(a) || a.id.localeCompare(b.id)
  }).slice(0, count)
}

export function movementStats(state, profileId) {
  const completed = movementSessionsFor(state, profileId).filter((item) => item.completedAt)
  const autonomous = completed.filter((item) => item.initiatedBy === 'child').length
  const feedbackCounts = completed.reduce((counts, item) => ({ ...counts, [item.feedback]: (counts[item.feedback] || 0) + 1 }), {})
  const favorite = MOVEMENT_ACTIVITIES.map((activity) => ({ activity, count: completed.filter((item) => item.activityId === activity.id && item.feedback === 'again').length })).sort((a, b) => b.count - a.count)[0]
  return { completed, autonomous, ratio: completed.length ? Math.round(autonomous / completed.length * 100) : 0, feedbackCounts, favorite: favorite?.count ? favorite.activity : null }
}
