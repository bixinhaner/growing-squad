import { bedtimeReducer } from '../domain/model.js'
import { operationEnvelopeSchema, toLegacyAction } from '../core/sync/operationSchemas.js'

const passthroughModules = new Set(['core', 'bedtime', 'growth', 'rewards'])

export const moduleRegistry = new Map([
  ...[...passthroughModules].map((id) => [id, { id, version: 1, reduce: bedtimeReducer }]),
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
  return module.reduce(state, toLegacyAction(envelope))
}

