export function platformReducer(state, operation) {
  const profileId = operation.target.profileId
  const core = { version: 1, routines: [], activitySessions: {}, todayDecisions: {}, ...(state.modules?.core || {}) }
  const next = structuredClone(state)
  next.modules.core = structuredClone(core)
  next.meta = { ...next.meta, updatedAt: operation.occurredAt }

  if (operation.type === 'core.routines.updated') {
    next.modules.core.routines = [
      ...core.routines.filter((routine) => routine.profileId !== profileId),
      ...structuredClone(operation.payload.routines || []),
    ]
    return next
  }

  const dateKey = operation.payload.dateKey
  const decisionKey = `${profileId}:${dateKey}`
  const previous = core.todayDecisions[decisionKey] || {}
  if (operation.type === 'core.today.item-selected') {
    next.modules.core.todayDecisions[decisionKey] = {
      routineId: operation.payload.routineId,
      selectedItemId: operation.payload.itemId,
      supportMode: operation.payload.supportMode || previous.supportMode || 'self',
      selectedAt: operation.occurredAt,
    }
    return next
  }
  if (operation.type === 'core.today.completed') {
    next.modules.core.todayDecisions[decisionKey] = { ...previous, completedAt: operation.occurredAt }
    return next
  }
  if (operation.type === 'core.today.support-chosen') {
    next.modules.core.todayDecisions[decisionKey] = { ...previous, supportMode: operation.payload.supportMode, supportUpdatedAt: operation.occurredAt }
    return next
  }
  if (operation.type === 'core.today.skipped') {
    next.modules.core.todayDecisions[decisionKey] = { ...previous, skippedRoutineId: operation.payload.routineId, skippedAt: operation.occurredAt }
    return next
  }
  if (operation.type === 'core.today.later') {
    next.modules.core.todayDecisions[decisionKey] = { ...previous, laterUntil: operation.occurredAt + Number(operation.payload.laterMinutes || 20) * 60000, laterAt: operation.occurredAt }
    return next
  }
  if (operation.type === 'core.scaffold.updated') {
    const capabilityId = operation.payload.capabilityId
    next.scaffold = { ...(next.scaffold || {}), states: { ...(next.scaffold?.states || {}) } }
    next.scaffold.states[capabilityId] = {
      ...(next.scaffold.states[capabilityId] || {}), id: capabilityId, profileId,
      capabilityKey: operation.payload.capabilityKey, level: operation.payload.level,
      lastChangedAt: operation.occurredAt, lastChangedBy: 'parent',
    }
    return next
  }
  return state
}
