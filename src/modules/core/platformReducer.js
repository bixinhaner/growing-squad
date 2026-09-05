import { getTodayDecision, todayDecisionKey } from '../../core/today/todayDecisions.js'

export function platformReducer(state, operation) {
  const profileId = operation.target.profileId
  const payload = operation.payload
  const core = { version: 1, routines: [], activitySessions: {}, todayDecisions: {}, ...(state.modules?.core || {}) }
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.core = structuredClone(core)
  next.meta = { ...next.meta, updatedAt: operation.occurredAt }

  if (operation.type === 'core.routines.updated') {
    if ((payload.routines || []).some((routine) => routine.profileId && routine.profileId !== profileId)) return state
    next.modules.core.routines = [...core.routines.filter((r) => r.profileId !== profileId), ...structuredClone(payload.routines || []).map((r) => ({ ...r, profileId }))]
    return next
  }
  if (operation.type === 'core.scaffold.updated') {
    const capabilityId = payload.capabilityId
    if (!capabilityId?.startsWith(`${profileId}:`)) return state
    next.scaffold = { ...(next.scaffold || {}), states: { ...(next.scaffold?.states || {}) } }
    next.scaffold.states[capabilityId] = { ...(next.scaffold.states[capabilityId] || {}), id: capabilityId, profileId,
      capabilityKey: payload.capabilityKey, level: payload.level, lastChangedAt: operation.occurredAt, lastChangedBy: 'parent' }
    return next
  }
  if (!operation.type.startsWith('core.today.') || !profileId || !payload.dateKey) return state
  const legacy = core.todayDecisions[todayDecisionKey(profileId, payload.dateKey)]
  const routineId = payload.routineId || legacy?.routineId || legacy?.skippedRoutineId
  const key = todayDecisionKey(profileId, payload.dateKey, routineId)
  const previous = routineId ? getTodayDecision(state, profileId, payload.dateKey, routineId) : (legacy || {})
  const decision = { ...previous, profileId, dateKey: payload.dateKey, ...(routineId ? { routineId } : {}) }
  switch (operation.type) {
    case 'core.today.item-selected': {
      if (!payload.itemId || previous.completedAt || previous.skippedAt) return state
      const continuing = previous.selectedItemId === payload.itemId
      next.modules.core.todayDecisions[key] = { ...decision, selectedItemId: payload.itemId,
        itemTitle: String(payload.itemTitle || (continuing ? previous.itemTitle : '') || '').slice(0, 120),
        supportMode: payload.supportMode || previous.supportMode || 'unknown',
        selectedAt: continuing ? previous.selectedAt : operation.occurredAt, laterUntil: null }
      return next
    }
    case 'core.today.completed':
      if (!previous.selectedItemId || previous.completedAt || previous.skippedAt) return state
      next.modules.core.todayDecisions[key] = { ...decision, completedAt: operation.occurredAt, laterUntil: null }
      return next
    case 'core.today.support-chosen':
      if (previous.completedAt || previous.skippedAt) return state
      next.modules.core.todayDecisions[key] = { ...decision, supportMode: payload.supportMode, supportUpdatedAt: operation.occurredAt }
      return next
    case 'core.today.skipped':
      if (previous.completedAt || previous.skippedAt) return state
      next.modules.core.todayDecisions[key] = { ...decision, skippedRoutineId: routineId, skippedAt: operation.occurredAt, laterUntil: null }
      return next
    case 'core.today.later':
      if (previous.completedAt || previous.skippedAt) return state
      next.modules.core.todayDecisions[key] = { ...decision, laterUntil: operation.occurredAt + Math.min(120, Math.max(1, Number(payload.laterMinutes) || 20)) * 60000, laterAt: operation.occurredAt }
      return next
    default: return state
  }
}
