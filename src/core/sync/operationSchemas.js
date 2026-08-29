import { z } from 'zod'

export const MODULE_IDS = ['core', 'bedtime', 'movement', 'reading', 'responsibility', 'inventor', 'assistant', 'growth', 'rewards']

export const operationEnvelopeSchema = z.object({
  id: z.string().regex(/^op_[A-Za-z0-9_-]+$/),
  schemaVersion: z.literal(1),
  moduleId: z.enum(MODULE_IDS),
  type: z.string().min(1),
  target: z.object({
    profileId: z.string().nullable(),
    entityType: z.string(),
    entityId: z.string().nullable(),
  }),
  expectedVersion: z.number().int().nullable(),
  occurredAt: z.number().int(),
  clientSequence: z.number().int().nonnegative(),
  payload: z.record(z.string(), z.any()),
})

const DEFINITIONS = {
  COMPLETE_TASK: ['bedtime', 'bedtime.step.completed', 'bedtime-session'],
  RESET_TASK: ['bedtime', 'bedtime.step.reset', 'bedtime-session'],
  SKIP_TASK: ['bedtime', 'bedtime.step.skipped', 'bedtime-session'],
  CONFIRM_BED: ['bedtime', 'bedtime.in-bed.confirmed', 'bedtime-session'],
  RECORD_ASLEEP_TIME: ['bedtime', 'bedtime.asleep.recorded', 'bedtime-session'],
  SKIP_ASLEEP_TIME: ['bedtime', 'bedtime.asleep.skipped', 'bedtime-session'],
  UNDO_BEDTIME_SETTLEMENT: ['bedtime', 'bedtime.settlement.reverted', 'bedtime-session'],
  UPDATE_SCHEDULE: ['bedtime', 'bedtime.schedule.updated', 'bedtime-schedule'],
  UPDATE_ROUTINE: ['bedtime', 'bedtime.routine.updated', 'bedtime-routine'],
  REQUEST_REWARD: ['rewards', 'rewards.wish.requested', 'wish'],
  APPROVE_REWARD: ['rewards', 'rewards.wish.approved', 'wish-request'],
  UNDO_REWARD: ['rewards', 'rewards.wish.reverted', 'wish-request'],
  ADD_REWARD_EVENT: ['growth', 'growth.moment.created', 'growth-moment'],
  UNDO_REWARD_EVENT: ['growth', 'growth.moment.reverted', 'growth-moment'],
  ADD_PROFILE: ['core', 'core.profile.created', 'profile'],
  DELETE_PROFILE: ['core', 'core.profile.deleted', 'profile'],
  UPDATE_PROFILE: ['core', 'core.profile.updated', 'profile'],
  UPDATE_WISHES: ['rewards', 'rewards.catalog.updated', 'wish-catalog'],
  UPDATE_ACCESSIBILITY: ['core', 'core.accessibility.updated', 'profile'],
  SETUP_COMPLETE: ['core', 'core.setup.completed', 'family'],
  UPDATE_CORE_ROUTINES: ['core', 'core.routines.updated', 'routine'],
  TODAY_CHOOSE_ITEM: ['core', 'core.today.item-selected', 'today-decision'],
  TODAY_COMPLETE_ITEM: ['core', 'core.today.completed', 'today-decision'],
  TODAY_CHOOSE_SUPPORT: ['core', 'core.today.support-chosen', 'today-decision'],
  TODAY_SKIP: ['core', 'core.today.skipped', 'today-decision'],
  TODAY_LATER: ['core', 'core.today.later', 'today-decision'],
  UPDATE_SCAFFOLD: ['core', 'core.scaffold.updated', 'scaffold-state'],
  SELECT_MOVEMENT_ACTIVITY: ['movement', 'movement.activity.selected', 'movement-session'],
  START_MOVEMENT_ACTIVITY: ['movement', 'movement.activity.started', 'movement-session'],
  REQUEST_MOVEMENT_HELP: ['movement', 'movement.help.requested', 'movement-session'],
  COMPLETE_MOVEMENT_ACTIVITY: ['movement', 'movement.activity.completed', 'movement-session'],
  RECORD_MOVEMENT_FEEDBACK: ['movement', 'movement.feedback.recorded', 'movement-session'],
  SKIP_MOVEMENT_ACTIVITY: ['movement', 'movement.activity.skipped', 'movement-session'],
  UPDATE_MOVEMENT_PREFERENCES: ['movement', 'movement.preferences.updated', 'movement-preferences'],
  ADD_READING_BOOK: ['reading', 'reading.book.added', 'reading-book'],
  UPDATE_READING_BOOK: ['reading', 'reading.book.updated', 'reading-book'],
  SELECT_READING_MODE: ['reading', 'reading.mode.selected', 'reading-session'],
  START_READING_SESSION: ['reading', 'reading.session.started', 'reading-session'],
  REQUEST_READING_HELP: ['reading', 'reading.help.requested', 'reading-session'],
  COMPLETE_READING_SESSION: ['reading', 'reading.session.completed', 'reading-session'],
  RECORD_READING_DIFFICULTY: ['reading', 'reading.difficulty.recorded', 'reading-session'],
  ADD_READING_REFLECTION: ['reading', 'reading.reflection.added', 'reading-session'],
  UPSERT_RESPONSIBILITY_ROUTINE: ['responsibility', 'responsibility.routine.upserted', 'responsibility-routine'],
  ROTATE_RESPONSIBILITY_ROLES: ['responsibility', 'responsibility.rotation.updated', 'responsibility-routine'],
  UPDATE_RESPONSIBILITY_SCAFFOLD: ['responsibility', 'responsibility.scaffold.updated', 'responsibility-scaffold'],
  REQUEST_RESPONSIBILITY_ROLE_CHANGE: ['responsibility', 'responsibility.role-change.requested', 'responsibility-request'],
  RESOLVE_RESPONSIBILITY_REQUEST: ['responsibility', 'responsibility.request.resolved', 'responsibility-request'],
  START_RESPONSIBILITY_SESSION: ['responsibility', 'responsibility.session.started', 'responsibility-session'],
  REQUEST_RESPONSIBILITY_HELP: ['responsibility', 'responsibility.help.requested', 'responsibility-session'],
  COMPLETE_RESPONSIBILITY_ROLE: ['responsibility', 'responsibility.role.completed', 'responsibility-session'],
  ADD_RESPONSIBILITY_REFLECTION: ['responsibility', 'responsibility.reflection.added', 'responsibility-session'],
  CREATE_INVENTOR_PROJECT: ['inventor', 'inventor.project.created', 'inventor-project'],
  UPDATE_INVENTOR_STAGE: ['inventor', 'inventor.project.stage-updated', 'inventor-project'],
  ADD_INVENTOR_ARTIFACT: ['inventor', 'inventor.artifact.added', 'inventor-artifact'],
  MARK_INVENTOR_ARTIFACT_SYNCED: ['inventor', 'inventor.artifact.synced', 'inventor-artifact'],
  RECORD_INVENTOR_TEST: ['inventor', 'inventor.test.recorded', 'inventor-project'],
  ADD_INVENTOR_KNOWLEDGE: ['inventor', 'inventor.knowledge.added', 'inventor-project'],
  CREATE_INVENTOR_ITERATION: ['inventor', 'inventor.iteration.created', 'inventor-project'],
  SELECT_INVENTOR_SHOWCASE_METHOD: ['inventor', 'inventor.showcase.method-selected', 'inventor-project'],
  ADD_INVENTOR_PARENT_NOTE: ['inventor', 'inventor.parent-note.added', 'inventor-project'],
  ARCHIVE_INVENTOR_PROJECT: ['inventor', 'inventor.project.archived', 'inventor-project'],
  UPDATE_ASSISTANT_SETTINGS: ['assistant', 'assistant.settings.updated', 'assistant-settings'],
  CREATE_ASSISTANT_SUGGESTIONS: ['assistant', 'assistant.suggestions.created', 'assistant-suggestion'],
  EDIT_ASSISTANT_SUGGESTION: ['assistant', 'assistant.suggestion.edited', 'assistant-suggestion'],
  APPROVE_ASSISTANT_SUGGESTION: ['assistant', 'assistant.suggestion.approved', 'assistant-suggestion'],
  DELETE_ASSISTANT_DERIVED: ['assistant', 'assistant.derived.deleted', 'assistant-derived'],
  RECORD_ASSISTANT_REFLECTION: ['assistant', 'assistant.reflection.recorded', 'assistant-reflection'],
}

export function operationId() {
  return `op_${globalThis.crypto.randomUUID()}`
}

export function createOperationEnvelope(action, profileId, clientSequence, id = operationId()) {
  const [moduleId, type, entityType] = DEFINITIONS[action.type] || ['core', `core.legacy.${String(action.type || 'unknown').toLowerCase()}`, 'family']
  const payload = Object.fromEntries(Object.entries(action).filter(([key]) => !['type', 'profileId', 'expectedVersion'].includes(key)))
  const dateKey = action.dateKey || payload.dateKey
  const entityId = action.suggestionId || action.reflectionId || action.artifactId || action.projectId || action.stepId || action.sessionId || action.requestId || action.momentId || action.payload?.id || (dateKey && profileId ? `${profileId}:${dateKey}` : null)
  return operationEnvelopeSchema.parse({
    id,
    schemaVersion: 1,
    moduleId,
    type,
    target: { profileId: profileId || null, entityType, entityId: entityId ? String(entityId) : null },
    expectedVersion: Number.isInteger(action.expectedVersion) ? action.expectedVersion : null,
    occurredAt: Number(action.timestamp) || Date.now(),
    clientSequence,
    payload,
  })
}

export function toLegacyAction(operation) {
  const legacyType = Object.entries(DEFINITIONS).find(([, definition]) => definition[1] === operation.type)?.[0]
  if (!legacyType) throw new Error(`不支持的操作：${operation.type}`)
  return { type: legacyType, profileId: operation.target.profileId, ...operation.payload }
}

export function isChildOperation(operation) {
  return new Set([
    'bedtime.step.completed', 'bedtime.step.reset', 'bedtime.step.skipped',
    'bedtime.in-bed.confirmed', 'rewards.wish.requested',
    'core.today.item-selected', 'core.today.completed', 'core.today.support-chosen',
    'core.today.skipped', 'core.today.later',
    'movement.activity.selected', 'movement.activity.started', 'movement.help.requested',
    'movement.activity.completed', 'movement.feedback.recorded', 'movement.activity.skipped',
    'reading.mode.selected', 'reading.session.started', 'reading.help.requested',
    'reading.session.completed', 'reading.difficulty.recorded', 'reading.reflection.added',
    'responsibility.session.started', 'responsibility.help.requested',
    'responsibility.role.completed', 'responsibility.reflection.added', 'responsibility.role-change.requested',
    'inventor.project.created', 'inventor.project.stage-updated', 'inventor.artifact.added', 'inventor.artifact.synced',
    'inventor.test.recorded', 'inventor.iteration.created', 'inventor.showcase.method-selected', 'inventor.project.archived',
    'assistant.reflection.recorded',
  ]).has(operation.type)
}
