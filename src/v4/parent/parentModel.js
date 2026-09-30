import { dayTypeFor, getCompletionOutcome, getRoutine, getSchedule, getSession, localDateKey } from '../../domain/model.js'
import { unresolvedHelpFor } from '../../core/activity/activitySelectors.js'
import { responsibilityActivity, responsibilityRole } from '../../modules/responsibility/responsibilityCatalog.js'
import { responsibilityState } from '../../modules/responsibility/responsibilityModel.js'

/** Everything that is waiting on a grown-up for this child, newest first. */
export function inboxFor(state, profileId, syncConflicts = []) {
  const items = []
  for (const help of unresolvedHelpFor(state, profileId)) items.push({ kind: 'help', id: help.id, at: help.at, help })
  for (const request of state.rewardRequests || []) {
    if (request.profileId === profileId && request.status === 'pending') items.push({ kind: 'wish', id: request.id, at: request.requestedAt || request.createdAt || 0, request, wish: state.wishes.find((item) => item.id === request.wishId) })
  }
  for (const request of Object.values(state.modules?.pets?.requests || {})) {
    if (request.profileId === profileId && request.status === 'pending') items.push({ kind: 'pet', id: request.id, at: request.requestedAt || 0, request })
  }
  for (const request of responsibilityState(state).roleChangeRequests || []) {
    if (request.profileId === profileId && !request.resolvedAt) {
      items.push({ kind: 'role', id: request.id, at: request.requestedAt || 0, request, activity: responsibilityActivity(request.activityId), role: responsibilityRole(request.currentRoleId) })
    }
  }
  const missing = Object.values(state.sessions || {})
    .filter((session) => session.profileId === profileId && session.inBedAt && !session.asleepAt && !session.sleepEntrySkippedAt)
    .sort((a, b) => Number(b.inBedAt) - Number(a.inBedAt))[0]
  if (missing) items.push({ kind: 'sleep', id: `sleep:${missing.dateKey}`, at: missing.inBedAt, session: missing })
  if (syncConflicts.length) items.push({ kind: 'sync', id: 'sync', at: Date.now(), count: syncConflicts.length })
  return items.sort((a, b) => Number(b.at) - Number(a.at))
}

export function tonightFor(state, now = Date.now()) {
  const date = new Date(now)
  const dateKey = localDateKey(date)
  const schedule = getSchedule(state, dayTypeFor(date), dateKey)
  const steps = getRoutine(state, dayTypeFor(date)).steps.filter((step) => step.enabled)
  const session = getSession(state, dateKey)
  const statuses = session?.stepStatus || {}
  const done = steps.filter((step) => statuses[step.id] === 'done').length
  const outcome = getCompletionOutcome(session)
  let status = 'waiting'
  if (session?.status === 'goodnight') status = 'settled'
  else if (session?.routineStartedAt || done) status = 'going'
  const label = status === 'settled'
    ? (outcome === 'early' ? `已完成 · 提前 ${session.earlyMinutes} 分钟` : outcome === 'on-time' ? '已按时完成' : '已完成')
    : status === 'going' ? `进行中 · ${done}/${steps.length}` : '还没开始'
  return { dateKey, schedule, steps, statuses, session, done, status, label }
}
