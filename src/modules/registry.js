import { bedtimeReducer } from '../domain/model.js'
import { operationEnvelopeSchema, toLegacyAction } from '../core/sync/operationSchemas.js'
import { platformReducer } from './core/platformReducer.js'
import { movementReducer } from './movement/movementReducer.js'
import { readingReducer } from './reading/readingReducer.js'
import { responsibilityReducer } from './responsibility/responsibilityReducer.js'
import { inventorReducer } from './inventor/inventorReducer.js'
import { assistantReducer } from './assistant/assistantReducer.js'
import { z } from 'zod'

const passthroughModules = new Set(['bedtime', 'growth', 'rewards'])

const noCandidates = () => []
const allowByEnvelope = (_identity, operation) => Boolean(operation?.target?.profileId)
const defineModule = ({ id, reduce, deriveTodayCandidates = noCandidates }) => Object.freeze({
  id,
  version: 1,
  stateSchema: z.any(),
  operationSchema: operationEnvelopeSchema.refine((operation) => operation.moduleId === id, { message: `操作必须属于 ${id} 模块` }),
  reduce,
  deriveTodayCandidates,
  validatePermission: allowByEnvelope,
  deriveReminderCandidates: noCandidates,
  deriveGrowthEffects: noCandidates,
  migrate: (_fromVersion, moduleState) => moduleState,
})

export const moduleRegistry = new Map([
  ...[...passthroughModules].map((id) => [id, defineModule({ id, reduce: bedtimeReducer })]),
  ['core', defineModule({ id: 'core', reduce: (state, operation) => operation.type.startsWith('core.today.') || operation.type === 'core.routines.updated' || operation.type === 'core.scaffold.updated' ? platformReducer(state, operation) : bedtimeReducer(state, toLegacyAction(operation)) })],
  ['movement', defineModule({ id: 'movement', reduce: movementReducer })],
  ['reading', defineModule({ id: 'reading', reduce: readingReducer })],
  ['responsibility', defineModule({ id: 'responsibility', reduce: responsibilityReducer })],
  ['inventor', defineModule({ id: 'inventor', reduce: inventorReducer })],
  ['assistant', defineModule({ id: 'assistant', reduce: assistantReducer })],
])

export function rootReducer(state, operation) {
  if (operation?.type === 'REPLACE_DATA') return operation.payload
  const envelope = operationEnvelopeSchema.parse(operation)
  const module = moduleRegistry.get(envelope.moduleId)
  if (!module) return state
  return ['core', 'movement', 'reading', 'responsibility', 'inventor', 'assistant'].includes(module.id) ? module.reduce(state, envelope) : module.reduce(state, toLegacyAction(envelope))
}
