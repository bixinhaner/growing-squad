/** Scope a day's decision to its routine; never reuse a morning result in the afternoon. */
export function todayDecisionKey(profileId, dateKey, routineId) {
  return routineId ? `${profileId}:${dateKey}:${routineId}` : `${profileId}:${dateKey}`
}

export function getTodayDecision(state, profileId, dateKey, routineId) {
  const decisions = state.modules?.core?.todayDecisions || {}
  const scoped = decisions[todayDecisionKey(profileId, dateKey, routineId)]
  if (scoped) return scoped
  const legacy = decisions[todayDecisionKey(profileId, dateKey)]
  return legacy && (legacy.routineId === routineId || legacy.skippedRoutineId === routineId) ? legacy : {}
}

export function todayDecisionsFor(state, profileId, dateKey) {
  const prefix = `${profileId}:${dateKey ? `${dateKey}:` : ''}`
  const entries = Object.entries(state.modules?.core?.todayDecisions || {})
    .filter(([key]) => key.startsWith(prefix) || (dateKey && key === `${profileId}:${dateKey}`))
  const unique = new Map()
  for (const [key, value] of entries.sort(([a], [b]) => a.length - b.length)) {
    const date = value.dateKey || key.slice(profileId.length + 1, profileId.length + 11)
    unique.set(`${date}:${value.routineId || value.skippedRoutineId || 'legacy'}`, { ...value, dateKey: date, id: key })
  }
  return [...unique.values()]
}
