import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { mergeLegacyIntoV5 } from '../src/data/storage.js'

function readArgument(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : null
}

const currentPath = readArgument('--current')
const legacyPath = readArgument('--legacy')
const outputPath = readArgument('--output')
const reportPath = readArgument('--report')
if (!currentPath || !legacyPath) {
  throw new Error('用法：npm run migrate:legacy -- --current <v5.json> --legacy <v2.json> [--output <merged.json>] [--report <report.json>]')
}

const currentRaw = await readFile(resolve(currentPath), 'utf8')
const legacyRaw = await readFile(resolve(legacyPath), 'utf8')
const current = JSON.parse(currentRaw)
const legacy = JSON.parse(legacyRaw)
const sourceSha256 = createHash('sha256').update(legacyRaw).digest('hex')
const { data, report } = mergeLegacyIntoV5(current, legacy, {
  sourceFilename: basename(legacyPath),
  sourceSha256,
  importedAt: Date.now(),
})

const fullReport = {
  ...report,
  sourceFilename: basename(legacyPath),
  sourceSha256,
  currentFilename: basename(currentPath),
  expected: { sessions: 89, moments: 46, wishesFromLegacy: 7, requests: 3, balanceAdded: 554 },
  checks: {
    sessions: report.sessionsAdded === 89,
    moments: report.momentsAdded === 46,
    wishesFromLegacy: report.wishesAdded === 7,
    requests: report.requestsAdded === 3,
    balanceAdded: report.balanceAdded === 554,
    noConflicts: report.conflicts.length === 0,
  },
}

if (outputPath) {
  await mkdir(dirname(resolve(outputPath)), { recursive: true })
  await writeFile(resolve(outputPath), `${JSON.stringify({ ...data, exportedAt: Date.now() }, null, 2)}\n`)
}
if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true })
  await writeFile(resolve(reportPath), `${JSON.stringify(fullReport, null, 2)}\n`)
}

console.log(JSON.stringify(fullReport, null, 2))
if (Object.values(fullReport.checks).some((value) => !value)) process.exitCode = 2
