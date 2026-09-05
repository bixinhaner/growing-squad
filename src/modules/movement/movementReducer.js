function ensureMovement(state) {
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.movement = { version: 1, sessions: {}, preferencesByProfile: {}, ...(next.modules.movement || {}) }
  next.growth ||= { moments: [], world: {}, collections: [] }
  next.growth.world ||= {}
  return next
}

export function movementReducer(state, operation) {
  const next = ensureMovement(state)
  const movement = next.modules.movement
  const profileId = operation.target.profileId
  const payload = operation.payload
  const sessionId = payload.sessionId
  const previous = movement.sessions[sessionId] || { id: sessionId, profileId, activityId: payload.activityId, initiatedBy: payload.initiatedBy || 'unknown' }

  if (previous.profileId !== profileId) return state

  if (operation.type === 'movement.activity.selected') {
    movement.sessions[sessionId] = { ...previous, selectedAt: previous.selectedAt || operation.occurredAt, status: 'selected', supportMode: payload.supportMode || previous.supportMode || 'unknown' }
  } else if (operation.type === 'movement.activity.started') {
    movement.sessions[sessionId] = { ...previous, startedAt: operation.occurredAt, status: 'active', supportMode: payload.supportMode || previous.supportMode || 'self' }
  } else if (operation.type === 'movement.help.requested') {
    movement.sessions[sessionId] = { ...previous, helpRequestedAt: operation.occurredAt, helpResolvedAt: null, supportMode: 'help' }
  } else if (operation.type === 'movement.activity.completed') {
    if (!previous.completedAt) {
      movement.sessions[sessionId] = { ...previous, completedAt: operation.occurredAt, status: 'feedback' }
      const world = next.growth.world[profileId] || { energyFlowers: [] }
      next.growth.world[profileId] = { ...world, energyFlowers: [...(world.energyFlowers || []), { id: `energy:${sessionId}`, activityId: previous.activityId, createdAt: operation.occurredAt }] }
    }
  } else if (operation.type === 'movement.feedback.recorded') {
    movement.sessions[sessionId] = { ...previous, feedback: payload.feedback, showAgain: payload.showAgain !== false, reflectedAt: operation.occurredAt, status: 'done' }
  } else if (operation.type === 'movement.activity.skipped') {
    movement.sessions[sessionId] = { ...previous, skippedAt: operation.occurredAt, status: 'skipped' }
  } else if (operation.type === 'movement.preferences.updated') {
    movement.preferencesByProfile[profileId] = { ...(movement.preferencesByProfile[profileId] || {}), ...payload.preferences, updatedAt: operation.occurredAt }
  }
  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
