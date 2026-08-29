import { bedtimeReducer } from '../domain/model.js'
import { operationEnvelopeSchema, toLegacyAction } from '../core/sync/operationSchemas.js'
import { platformReducer } from './core/platformReducer.js'
import { movementReducer } from './movement/movementReducer.js'
import { readingReducer } from './reading/readingReducer.js'
import { responsibilityReducer } from './responsibility/responsibilityReducer.js'
import { inventorReducer } from './inventor/inventorReducer.js'
import { assistantReducer } from './assistant/assistantReducer.js'

const passthroughModules = new Set(['bedtime', 'growth', 'rewards'])

export const moduleRegistry = new Map([
  ...[...passthroughModules].map((id) => [id, { id, version: 1, reduce: bedtimeReducer }]),
  ['core', { id: 'core', version: 1, reduce: (state, operation) => operation.type.startsWith('core.today.') || operation.type === 'core.routines.updated' || operation.type === 'core.scaffold.updated' ? platformReducer(state, operation) : bedtimeReducer(state, toLegacyAction(operation)) }],
  ['movement', { id: 'movement', version: 1, reduce: movementReducer }],
  ['reading', { id: 'reading', version: 1, reduce: readingReducer }],
  ['responsibility', { id: 'responsibility', version: 1, reduce: responsibilityReducer }],
  ['inventor', { id: 'inventor', version: 1, reduce: inventorReducer }],
  ['assistant', { id: 'assistant', version: 1, reduce: assistantReducer }],
])

export function rootReducer(state, operation) {
  if (operation?.type === 'REPLACE_DATA') return operation.payload
  const envelope = operationEnvelopeSchema.parse(operation)
  const module = moduleRegistry.get(envelope.moduleId)
  if (!module) return state
  return ['core', 'movement', 'reading', 'responsibility', 'inventor', 'assistant'].includes(module.id) ? module.reduce(state, envelope) : module.reduce(state, toLegacyAction(envelope))
}
