function ensureAssistant(state) {
  const next = structuredClone(state)
  next.modules ||= {}
  next.modules.assistant = {
    version: 1,
    settingsByProfile: {},
    suggestions: {},
    reflections: {},
    ...(next.modules.assistant || {}),
  }
  return next
}

export function assistantReducer(state, operation) {
  const next = ensureAssistant(state)
  const assistant = next.modules.assistant
  const profileId = operation.target.profileId
  const payload = operation.payload

  if (operation.type === 'assistant.settings.updated') {
    assistant.settingsByProfile[profileId] = {
      ...assistant.settingsByProfile[profileId],
      ...payload.settings,
      scopes: { ...assistant.settingsByProfile[profileId]?.scopes, ...payload.settings?.scopes },
      updatedAt: operation.occurredAt,
    }
  } else if (operation.type === 'assistant.suggestions.created') {
    for (const suggestion of payload.suggestions || []) {
      assistant.suggestions[suggestion.id] ||= { ...suggestion, profileId, status: 'suggested', createdAt: operation.occurredAt, updatedAt: operation.occurredAt }
    }
  } else if (operation.type === 'assistant.suggestion.edited' && assistant.suggestions[payload.suggestionId]?.profileId === profileId) {
    assistant.suggestions[payload.suggestionId] = { ...assistant.suggestions[payload.suggestionId], title: payload.title, body: payload.body, editedByParent: true, updatedAt: operation.occurredAt }
  } else if (operation.type === 'assistant.suggestion.approved' && assistant.suggestions[payload.suggestionId]?.profileId === profileId) {
    assistant.suggestions[payload.suggestionId] = { ...assistant.suggestions[payload.suggestionId], status: 'approved', approvedAt: operation.occurredAt, updatedAt: operation.occurredAt }
  } else if (operation.type === 'assistant.derived.deleted') {
    if (payload.suggestionId && assistant.suggestions[payload.suggestionId]?.profileId === profileId) delete assistant.suggestions[payload.suggestionId]
    if (!payload.suggestionId) {
      assistant.suggestions = Object.fromEntries(Object.entries(assistant.suggestions).filter(([, item]) => item.profileId !== profileId))
      assistant.reflections = Object.fromEntries(Object.entries(assistant.reflections).filter(([, item]) => item.profileId !== profileId))
    }
  } else if (operation.type === 'assistant.reflection.recorded') {
    const id = payload.reflectionId
    if (id && !assistant.reflections[id]) assistant.reflections[id] = { id, profileId, promptId: payload.promptId, answerId: payload.answerId, answer: String(payload.answer || '').slice(0, 160), source: payload.source || 'child-one-question', createdAt: operation.occurredAt }
  }

  next.meta = { ...(next.meta || {}), updatedAt: operation.occurredAt }
  return next
}
