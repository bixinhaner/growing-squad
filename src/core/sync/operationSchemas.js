import { z } from 'zod'

export const MODULE_IDS = ['core', 'bedtime', 'movement', 'reading', 'responsibility', 'inventor', 'growth', 'rewards']

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
}

export function operationId() {
  return `op_${globalThis.crypto.randomUUID()}`
}

export function createOperationEnvelope(action, profileId, clientSequence, id = operationId()) {
  const [moduleId, type, entityType] = DEFINITIONS[action.type] || ['core', `core.legacy.${String(action.type || 'unknown').toLowerCase()}`, 'family']
  const payload = Object.fromEntries(Object.entries(action).filter(([key]) => !['type', 'profileId', 'expectedVersion'].includes(key)))
  const dateKey = action.dateKey || payload.dateKey
  const entityId = action.stepId || action.requestId || action.momentId || action.payload?.id || (dateKey && profileId ? `${profileId}:${dateKey}` : null)
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
  ]).has(operation.type)
}

