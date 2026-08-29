import { bedtimeReducer } from '../domain/model.js'
import { operationEnvelopeSchema, toLegacyAction } from '../core/sync/operationSchemas.js'
import { platformReducer } from './core/platformReducer.js'

const passthroughModules = new Set(['bedtime', 'growth', 'rewards'])

export const moduleRegistry = new Map([
  ...[...passthroughModules].map((id) => [id, { id, version: 1, reduce: bedtimeReducer }]),
  ['core', { id: 'core', version: 1, reduce: (state, operation) => operation.type.startsWith('core.today.') || operation.type === 'core.routines.updated' || operation.type === 'core.scaffold.updated' ? platformReducer(state, operation) : bedtimeReducer(state, toLegacyAction(operation)) }],
  ['movement', { id: 'movement', version: 1, reduce: (state) => state }],
  ['reading', { id: 'reading', version: 1, reduce: (state) => state }],
  ['responsibility', { id: 'responsibility', version: 1, reduce: (state) => state }],
  ['inventor', { id: 'inventor', version: 1, reduce: (state) => state }],
])

export function rootReducer(state, operation) {
  if (operation?.type === 'REPLACE_DATA') return operation.payload
  const envelope = operationEnvelopeSchema.parse(operation)
  const module = moduleRegistry.get(envelope.moduleId)
  if (!module) return state
  return module.id === 'core' ? module.reduce(state, envelope) : module.reduce(state, toLegacyAction(envelope))
}
