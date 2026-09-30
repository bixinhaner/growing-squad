import { assistantState, childAssistantPrompt } from '../../modules/assistant/assistantModel.js'

/** The companion's one question: only offered until it has been answered once. */
export function openQuestion(state, profileId) {
  const prompt = childAssistantPrompt(state, profileId)
  if (!prompt) return null
  const answered = Object.values(assistantState(state).reflections).some((item) => item.profileId === profileId && item.promptId === prompt.id)
  return answered ? null : prompt
}
