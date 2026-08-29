function ensureResponsibility(state) {
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.responsibility = { version: 1, routines: [], sessions: {}, scaffoldByProfile: {}, roleChangeRequests: [], ...(next.modules.responsibility || {}) }
  next.growth ||= { moments: [], world: {}, collections: [] }
  next.growth.moments ||= []
  next.growth.world ||= {}
  return next
}

export function responsibilityReducer(state, operation) {
  const next = ensureResponsibility(state)
  const responsibility = next.modules.responsibility
  const payload = operation.payload
  const profileId = operation.target.profileId

  if (operation.type === 'responsibility.routine.upserted') {
    const routine = { ...payload.routine, updatedAt: operation.occurredAt }
    const index = responsibility.routines.findIndex((item) => item.id === routine.id)
    if (index >= 0) responsibility.routines[index] = { ...responsibility.routines[index], ...routine }
    else responsibility.routines.push({ ...routine, createdAt: operation.occurredAt })
  } else if (operation.type === 'responsibility.rotation.updated') {
    responsibility.routines = responsibility.routines.map((item) => item.id === payload.routineId ? { ...item, rotationOffset: payload.rotationOffset, updatedAt: operation.occurredAt } : item)
  } else if (operation.type === 'responsibility.scaffold.updated') {
    responsibility.scaffoldByProfile[profileId] = payload.stage
  } else if (operation.type === 'responsibility.role-change.requested') {
    const previous = responsibility.roleChangeRequests.find((item) => item.profileId === profileId && item.activityId === payload.activityId && !item.resolvedAt)
    if (!previous) responsibility.roleChangeRequests.push({ id: `role-change:${profileId}:${operation.occurredAt}`, profileId, activityId: payload.activityId, routineId: payload.routineId, currentRoleId: payload.currentRoleId, requestedAt: operation.occurredAt })
  } else if (operation.type === 'responsibility.request.resolved') {
    if (payload.kind === 'change') responsibility.roleChangeRequests = responsibility.roleChangeRequests.map((item) => item.id === payload.requestId ? { ...item, resolvedAt: operation.occurredAt } : item)
    else if (payload.sessionId && responsibility.sessions[payload.sessionId]) responsibility.sessions[payload.sessionId].helpRequests = (responsibility.sessions[payload.sessionId].helpRequests || []).map((item) => item.profileId === profileId && !item.resolvedAt ? { ...item, resolvedAt: operation.occurredAt } : item)
  } else {
    const sessionId = payload.sessionId
    const previous = responsibility.sessions[sessionId] || { id: sessionId, routineId: payload.routineId, activityId: payload.activityId, dateKey: payload.dateKey, participants: payload.participants || [], completedRoleIds: [], helpRequests: [] }
    if (operation.type === 'responsibility.session.started') {
      responsibility.sessions[sessionId] = { ...previous, participants: payload.participants || previous.participants, startedAt: previous.startedAt || operation.occurredAt, status: previous.status || 'active' }
    } else if (operation.type === 'responsibility.help.requested') {
      const already = previous.helpRequests?.some((item) => item.profileId === profileId)
      responsibility.sessions[sessionId] = { ...previous, helpRequests: already ? previous.helpRequests : [...(previous.helpRequests || []), { profileId, requestedAt: operation.occurredAt }] }
    } else if (operation.type === 'responsibility.role.completed') {
      const participantId = payload.participantId || `profile:${profileId}`
      const completedRoleIds = [...new Set([...(previous.completedRoleIds || []), participantId])]
      const childParticipantIds = previous.participants.filter((item) => item.kind === 'child').map((item) => item.id)
      const groupComplete = childParticipantIds.length > 0 && childParticipantIds.every((id) => completedRoleIds.includes(id))
      responsibility.sessions[sessionId] = { ...previous, completedRoleIds, status: groupComplete ? 'complete' : 'partial', ...(groupComplete ? { completedAt: operation.occurredAt } : {}) }
      if (groupComplete && !previous.completedAt) {
        const moment = { id: `family:${sessionId}`, type: 'responsibility.shared-completed', sourceModule: 'responsibility', sessionId, activityId: previous.activityId, participants: previous.participants, createdAt: operation.occurredAt }
        next.growth.moments.push(moment)
        for (const participant of previous.participants.filter((item) => item.kind === 'child')) {
          const world = next.growth.world[participant.profileId] || {}
          next.growth.world[participant.profileId] = { ...world, familyObjects: [...(world.familyObjects || []), { id: `family-object:${sessionId}`, itemId: 'three-leaf-vase', createdAt: operation.occurredAt }] }
        }
      }
    } else if (operation.type === 'responsibility.reflection.added') {
      responsibility.sessions[sessionId] = { ...previous, reflections: { ...(previous.reflections || {}), [profileId]: { phrase: payload.phrase, createdAt: operation.occurredAt } } }
    }
  }
  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
