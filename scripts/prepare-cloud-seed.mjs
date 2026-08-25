import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { migrateV5 } from '../src/data/storage.js'

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : fallback
}

const input = argument('--input')
const output = argument('--output')
const bedTime = argument('--bed-time')
if (!input || !output) throw new Error('用法：node scripts/prepare-cloud-seed.mjs --input <v5.json> --output <v6.json> [--bed-time 21:54]')

const sourceText = await readFile(resolve(input), 'utf8')
const source = JSON.parse(sourceText)
const migrated = Number(source.version) === 5 ? migrateV5(source) : source
if (Number(migrated.version) !== 6) throw new Error('只支持晚安小队 v5/v6 数据')

const state = {
  ...migrated,
  schedules: bedTime ? migrated.schedules.map((schedule) => ({ ...schedule, bedTime })) : migrated.schedules,
  meta: {
    ...migrated.meta,
    updatedAt: Date.now(),
    cloudMigration: {
      migratedAt: Date.now(),
      sourceVersion: source.version,
      sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
      targetBedTimeApplied: bedTime,
    },
  },
}

const balance = state.starLedger.reduce((sum, entry) => sum + Number(entry.delta || 0), 0)
const sessions = Object.keys(state.sessions).length
const enabledSteps = state.routines.map((routine) => routine.steps.filter((step) => step.enabled).length)
if (balance !== 554 || sessions !== 89 || enabledSteps.some((count) => count !== 9)) {
  throw new Error(`迁移校验失败：星光 ${balance}，历史 ${sessions} 晚，任务 ${enabledSteps.join('/')}`)
}

await mkdir(dirname(resolve(output)), { recursive: true })
await writeFile(resolve(output), `${JSON.stringify(state, null, 2)}\n`)
console.log(JSON.stringify({ output: resolve(output), version: state.version, balance, sessions, enabledSteps, bedTime }, null, 2))
