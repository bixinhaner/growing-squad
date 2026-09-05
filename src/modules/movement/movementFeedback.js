export function latestMovementFeedback(sessions) {
  const feedback = {}
  const newest = [...sessions].filter((s) => s.feedback).sort((a, b) => Number(b.reflectedAt || b.feedbackAt || b.completedAt || b.startedAt || b.selectedAt) - Number(a.reflectedAt || a.feedbackAt || a.completedAt || a.startedAt || a.selectedAt))
  for (const session of newest) if (!Object.hasOwn(feedback, session.activityId)) feedback[session.activityId] = session.feedback
  return feedback
}
