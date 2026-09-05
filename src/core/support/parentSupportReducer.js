import { belongsToProfile } from '../activity/activitySelectors.js'

/** Parent-only operations; the server's isChildOperation allowlist does not include these types. */
export function parentSupportReducer(state, operation) {
  const profileId = operation.target.profileId
  const payload = operation.payload
  if (!profileId || !state.profiles.some((p) => p.id === profileId)) return state
  const next = structuredClone(state)
  const moduleId = payload.sourceModule
  if (!['core', 'bedtime', 'reading', 'movement', 'responsibility'].includes(moduleId)) return state
  if (operation.type === 'core.support.resolved') {
    if (moduleId === 'core') {
      const decision = next.modules.core?.todayDecisions?.[payload.decisionId]
      if (!decision || !payload.decisionId.startsWith(`${profileId}:`)) return state
      decision.supportResolvedAt = operation.occurredAt
    } else {
      const session = next.modules[moduleId]?.sessions?.[payload.sessionId]
      if (!session || !belongsToProfile(session, profileId)) return state
      if (moduleId === 'responsibility') session.helpRequests = (session.helpRequests || []).map((r) => r.profileId === profileId && !r.resolvedAt ? { ...r, resolvedAt: operation.occurredAt } : r)
      else session.helpResolvedAt = operation.occurredAt
    }
  } else if (operation.type === 'core.support.evidence-recorded') {
    const session = next.modules[moduleId]?.sessions?.[payload.sessionId]
    if (!session || !belongsToProfile(session, profileId)) return state
    const allowed = { bedtime: ['bedtime.wash', 'bedtime.pack-bag'], reading: ['reading.start', 'reading.finish'], movement: ['movement.start'], responsibility: ['responsibility.water'] }
    if (!allowed[moduleId]?.includes(payload.capabilityKey)) return state
    if (!['unknown', 'independent', 'together', 'helped'].includes(payload.mode)) return state
    const key = `${profileId}:${payload.capabilityKey}`
    session.supportEvidence = { ...(session.supportEvidence || {}), [key]: { source: 'parent', mode: payload.mode, recordedAt: operation.occurredAt } }
    if (moduleId === 'movement') session.initiationEvidence = { source: 'parent', value: ['child', 'prompted'].includes(payload.initiation) ? payload.initiation : 'unknown', recordedAt: operation.occurredAt }
  } else return state
  next.meta = { ...next.meta, updatedAt: operation.occurredAt }
  return next
}
