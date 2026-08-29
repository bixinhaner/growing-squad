import { localDateKey } from '../../domain/model.js'
import { RESPONSIBILITY_ACTIVITIES, responsibilityActivity } from './responsibilityCatalog.js'

export function responsibilityState(state) {
  return { version: 1, routines: [], sessions: {}, scaffoldByProfile: {}, roleChangeRequests: [], ...(state.modules?.responsibility || {}) }
}

export function responsibilityRoutines(state) {
  const saved = responsibilityState(state).routines.filter((item) => item.active !== false)
  if (saved.length) return saved
  return [{ id: 'routine-family-table', activityId: 'prepare-table', title: '晚饭前准备餐桌', timeLabel: '18:30', rotation: 'manual', rotationOffset: 0, active: true }]
}

export function weekNumber(date = new Date()) {
  const first = new Date(date.getFullYear(), 0, 1)
  return Math.floor((date - first) / 86400000 / 7)
}

export function responsibilityAssignments(state, routine, offset = 0) {
  const activity = responsibilityActivity(routine.activityId)
  const rotation = Number(routine.rotationOffset || 0) + Number(offset) + (routine.rotation === 'weekly' ? weekNumber() : 0)
  const children = state.profiles.map((profile, index) => {
    const roleId = activity.roleIds[(index + rotation) % activity.roleIds.length]
    return { id: `profile:${profile.id}`, kind: 'child', profileId: profile.id, name: profile.name, character: profile.character, roleId }
  })
  return [...children, { id: 'adult:family', kind: 'adult', profileId: null, name: '家长', roleTitle: activity.adultRole }]
}

export function responsibilitySessionId(routineId, dateKey = localDateKey()) {
  return `responsibility-${routineId}-${dateKey}`
}

export function responsibilitySessionsFor(state, profileId) {
  return Object.values(responsibilityState(state).sessions)
    .filter((session) => session.participants?.some((item) => item.profileId === profileId))
    .sort((a, b) => Number(b.startedAt) - Number(a.startedAt))
}

export function responsibilitySession(state, sessionId) {
  return responsibilityState(state).sessions[sessionId]
}

export function activeResponsibilitySession(state, profileId) {
  return responsibilitySessionsFor(state, profileId).find((session) => {
    const participant = session.participants?.find((item) => item.profileId === profileId)
    return ['active', 'partial'].includes(session.status) && participant && !(session.completedRoleIds || []).includes(participant.id)
  })
}

export function routineForActivity(state, activityId) {
  return responsibilityRoutines(state).find((item) => item.activityId === activityId)
    || { id: `routine-${activityId}`, activityId, title: responsibilityActivity(activityId).title, timeLabel: '', rotation: 'weekly', rotationOffset: 0, active: true }
}

export function responsibilityStats(state, profileId) {
  const sessions = responsibilitySessionsFor(state, profileId)
  const completed = sessions.filter((session) => session.completedAt)
  const help = sessions.filter((session) => session.helpRequests?.some((item) => item.profileId === profileId))
  return { sessions, completed, help, latest: completed[0] || null, scaffold: responsibilityState(state).scaffoldByProfile[profileId] || 'together' }
}

export function responsibilityActivityOptions() {
  return RESPONSIBILITY_ACTIVITIES
}
