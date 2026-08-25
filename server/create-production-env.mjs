import { randomBytes } from 'node:crypto'
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import webpush from 'web-push'

const target = process.argv[2]
if (!target) throw new Error('用法：node server/create-production-env.mjs /etc/bedtime-cloud.env')

if (existsSync(target)) {
  const current = readFileSync(target, 'utf8')
  const pair = current.match(/^BEDTIME_PAIR_CODE=(.+)$/m)?.[1]
  console.log(JSON.stringify({ created: false, pairCode: pair || null }))
  process.exit(0)
}

const pairCode = `MOON-${randomBytes(5).toString('hex').toUpperCase()}`
const vapid = webpush.generateVAPIDKeys()
const lines = [
  'BEDTIME_PORT=8795',
  'BEDTIME_DATA_DIR=/var/lib/bedtime',
  'BEDTIME_DB_PATH=/var/lib/bedtime/bedtime.sqlite',
  'BEDTIME_SEED_FILE=/opt/bedtime/app/migration-artifacts/晚安小队_v6_云端种子_2026-08-22.json',
  `BEDTIME_PAIR_CODE=${pairCode}`,
  `BEDTIME_VAPID_PUBLIC_KEY=${vapid.publicKey}`,
  `BEDTIME_VAPID_PRIVATE_KEY=${vapid.privateKey}`,
  'BEDTIME_VAPID_SUBJECT=https://70.153.136.221/',
  'TZ=Asia/Shanghai',
]
writeFileSync(target, `${lines.join('\n')}\n`, { mode: 0o600 })
chmodSync(target, 0o600)
console.log(JSON.stringify({ created: true, pairCode }))
