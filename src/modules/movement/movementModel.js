import { latestMovementFeedback } from './movementFeedback.js'
export { latestMovementFeedback } from './movementFeedback.js'
import { MOVEMENT_ACTIVITIES } from './activityCatalog.js'

export function movementState(state) {
  return { version: 1, sessions: {}, preferencesByProfile: {}, ...(state.modules?.movement || {}) }
}
export function movementSessionsFor(state, profileId) {
  return Object.values(movementState(state).sessions).filter((s) => s.profileId === profileId).sort((a, b) => Number(b.startedAt || b.selectedAt) - Number(a.startedAt || a.selectedAt))
}
export function movementRecommendations(state, profileId, count = 2) {
  const preferences = movementState(state).preferencesByProfile[profileId] || {}
  const sessions = movementSessionsFor(state, profileId)
  const feedback = latestMovementFeedback(sessions)
  const recent = sessions.slice(0, 4).map((s) => s.activityId)
  const pool = MOVEMENT_ACTIVITIES.filter((a) => preferences.rainMode !== true || a.environment === 'indoor')
  const score = (a) => (feedback[a.id] === 'again' ? 4 : feedback[a.id] === 'hard' ? -3 : 0) - (recent.includes(a.id) ? 2 : 0)
  return [...pool].sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id)).slice(0, count)
}
export function movementStats(state, profileId) {
  const completed = movementSessionsFor(state, profileId).filter((s) => s.completedAt)
  // A child-screen click is an interaction source, not evidence of spontaneous initiation.
  const observed = completed.filter((s) => s.initiationEvidence?.source === 'parent' && ['child', 'prompted'].includes(s.initiationEvidence.value))
  const autonomous = observed.filter((s) => s.initiationEvidence.value === 'child').length
  const feedbackCounts = completed.reduce((counts, s) => { if (s.feedback) counts[s.feedback] = (counts[s.feedback] || 0) + 1; return counts }, {})
  const favorite = MOVEMENT_ACTIVITIES.map((activity) => ({ activity, count: completed.filter((s) => s.activityId === activity.id && s.feedback === 'again').length })).sort((a, b) => b.count - a.count)[0]
  return { completed, autonomous, observedCount: observed.length, unknownCount: completed.length - observed.length,
    ratio: observed.length ? Math.round(autonomous / observed.length * 100) : null, feedbackCounts, favorite: favorite?.count ? favorite.activity : null }
}
