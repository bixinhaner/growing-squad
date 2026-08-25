import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'
import { migrateV5 } from '../src/data/storage.js'
import { bedtimeReducer, dayTypeFor, getSchedule, localDateKey, timeToMinutes } from '../src/domain/model.js'

const here = dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.BEDTIME_PORT || 8795)
const dataDir = resolve(process.env.BEDTIME_DATA_DIR || join(here, 'data'))
const dbPath = resolve(process.env.BEDTIME_DB_PATH || join(dataDir, 'bedtime.sqlite'))
const seedPath = process.env.BEDTIME_SEED_FILE ? resolve(process.env.BEDTIME_SEED_FILE) : null
const pairCode = String(process.env.BEDTIME_PAIR_CODE || '')
const vapidPublicKey = String(process.env.BEDTIME_VAPID_PUBLIC_KEY || '')
const vapidPrivateKey = String(process.env.BEDTIME_VAPID_PRIVATE_KEY || '')
const vapidSubject = String(process.env.BEDTIME_VAPID_SUBJECT || 'mailto:family@example.invalid')
const maxBodyBytes = 2 * 1024 * 1024

mkdirSync(dataDir, { recursive: true })
mkdirSync(join(dataDir, 'backups'), { recursive: true })

const db = new DatabaseSync(dbPath)
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS families (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin_hash TEXT,
    state_json TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS devices (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'child',
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    revoked_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS parent_sessions (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS operations (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    device_id TEXT,
    action_type TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    profile_id TEXT,
    endpoint TEXT NOT NULL UNIQUE,
    subscription_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON parent_sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token_hash);
  CREATE INDEX IF NOT EXISTS idx_operations_family ON operations(family_id, created_at);
`)

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex')
const makeToken = () => randomBytes(32).toString('base64url')
const now = () => Date.now()

function safeEqual(left, right) {
  const a = Buffer.from(String(left))
  const b = Buffer.from(String(right))
  return a.length === b.length && timingSafeEqual(a, b)
}

function assertState(value) {
  if (Number(value?.version) === 5) value = migrateV5(value)
  if (!value || typeof value !== 'object' || Number(value.version) !== 6 || !Array.isArray(value.profiles)) {
    throw new Error('云端数据必须是晚安小队 v6 格式')
  }
  return value
}

function initializeFamily() {
  const existing = db.prepare('SELECT id FROM families LIMIT 1').get()
  if (existing) return
  if (!seedPath) throw new Error('首次启动需要 BEDTIME_SEED_FILE')
  const state = assertState(JSON.parse(readFileSync(seedPath, 'utf8')))
  const timestamp = now()
  db.prepare('INSERT INTO families (id, name, pin_hash, state_json, revision, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)')
    .run('family-main', '晚安小队家庭', state.security?.pinHash || null, JSON.stringify(state), timestamp, timestamp)
}

initializeFamily()

if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

const childActions = new Set(['COMPLETE_TASK', 'RESET_TASK', 'SKIP_TASK', 'CONFIRM_BED', 'REQUEST_REWARD', 'SWITCH_PROFILE'])
const parentActions = new Set([
  ...childActions,
  'RECORD_ASLEEP_TIME', 'SKIP_ASLEEP_TIME', 'ADD_REWARD_EVENT', 'UNDO_REWARD_EVENT',
  'UNDO_BEDTIME_SETTLEMENT',
  'APPROVE_REWARD', 'UNDO_REWARD', 'UPDATE_SCHEDULE', 'UPDATE_ROUTINE', 'ADD_PROFILE',
  'DELETE_PROFILE', 'UPDATE_PROFILE', 'UPDATE_WISHES', 'UPDATE_ACCESSIBILITY', 'SETUP_COMPLETE',
])

const attempts = new Map()
function checkAttempt(key) {
  const timestamp = now()
  const item = attempts.get(key) || { count: 0, resetAt: timestamp + 10 * 60_000 }
  if (timestamp > item.resetAt) {
    attempts.delete(key)
    return true
  }
  return item.count < 8
}
function recordAttempt(key, success) {
  if (success) return attempts.delete(key)
  const item = attempts.get(key) || { count: 0, resetAt: now() + 10 * 60_000 }
  item.count += 1
  attempts.set(key, item)
}

function json(response, status, body, extraHeaders = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) throw Object.assign(new Error('请求内容过大'), { status: 413 })
    chunks.push(chunk)
  }
  if (!chunks.length) return {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { throw Object.assign(new Error('请求格式不正确'), { status: 400 }) }
}

function bearerToken(request) {
  const value = String(request.headers.authorization || '')
  return value.startsWith('Bearer ') ? value.slice(7) : ''
}

function authenticate(request, allowParent = true) {
  const token = bearerToken(request)
  if (!token) return null
  const tokenHash = sha256(token)
  if (allowParent) {
    const session = db.prepare(`
      SELECT parent_sessions.family_id AS familyId, parent_sessions.device_id AS deviceId, parent_sessions.expires_at AS expiresAt
      FROM parent_sessions WHERE token_hash = ? AND expires_at > ?
    `).get(tokenHash, now())
    if (session) return { ...session, role: 'parent' }
  }
  const device = db.prepare(`
    SELECT id AS deviceId, family_id AS familyId, role FROM devices
    WHERE token_hash = ? AND revoked_at IS NULL
  `).get(tokenHash)
  if (!device) return null
  db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(now(), device.deviceId)
  return device
}

function familyPayload(familyId) {
  const row = db.prepare('SELECT state_json AS stateJson, revision, updated_at AS updatedAt FROM families WHERE id = ?').get(familyId)
  if (!row) return null
  const state = JSON.parse(row.stateJson)
  return { state: { ...state, security: { ...(state.security || {}), pinHash: null } }, revision: row.revision, updatedAt: row.updatedAt }
}

function runAction(identity, operationId, action) {
  const allowed = identity.role === 'parent' ? parentActions : childActions
  if (!action || !allowed.has(action.type)) throw Object.assign(new Error('这个设备不能执行该操作'), { status: 403 })
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(String(operationId || ''))) throw Object.assign(new Error('操作编号不正确'), { status: 400 })
  db.exec('BEGIN IMMEDIATE')
  try {
    const duplicate = db.prepare('SELECT id FROM operations WHERE id = ?').get(operationId)
    if (duplicate) {
      db.exec('COMMIT')
      return familyPayload(identity.familyId)
    }
    const family = db.prepare('SELECT state_json AS stateJson, revision FROM families WHERE id = ?').get(identity.familyId)
    if (!family) throw Object.assign(new Error('家庭数据不存在'), { status: 404 })
    const previous = JSON.parse(family.stateJson)
    const next = assertState(bedtimeReducer(previous, action))
    const timestamp = now()
    db.prepare('UPDATE families SET state_json = ?, pin_hash = ?, revision = revision + 1, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(next), next.security?.pinHash || null, timestamp, identity.familyId)
    db.prepare('INSERT INTO operations (id, family_id, device_id, action_type, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(operationId, identity.familyId, identity.deviceId || null, action.type, timestamp)
    db.exec('COMMIT')
    return familyPayload(identity.familyId)
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function createParentSession(identity) {
  const token = makeToken()
  const timestamp = now()
  const expiresAt = timestamp + 4 * 60 * 60_000
  db.prepare('DELETE FROM parent_sessions WHERE expires_at <= ?').run(timestamp)
  db.prepare('INSERT INTO parent_sessions (id, family_id, device_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(randomUUID(), identity.familyId, identity.deviceId, sha256(token), timestamp, expiresAt)
  return { token, expiresAt }
}

async function handleApi(request, response) {
  const url = new URL(request.url, 'http://localhost')
  if (request.method === 'GET' && url.pathname === '/api/cloud/health') {
    return json(response, 200, { ok: true, service: 'bedtime-cloud', storage: 'sqlite', pushAvailable: Boolean(vapidPublicKey && vapidPrivateKey), time: now() })
  }

  if (request.method === 'POST' && url.pathname === '/api/cloud/pair') {
    const remote = String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || '').split(',')[0]
    if (!checkAttempt(`pair:${remote}`)) return json(response, 429, { error: '尝试次数过多，请 10 分钟后再试。' })
    const body = await readJson(request)
    const valid = pairCode && safeEqual(String(body.code || '').trim().toUpperCase(), pairCode.trim().toUpperCase())
    recordAttempt(`pair:${remote}`, valid)
    if (!valid) return json(response, 401, { error: '家庭连接码不正确。' })
    const family = db.prepare('SELECT id FROM families LIMIT 1').get()
    const token = makeToken()
    const timestamp = now()
    const deviceId = randomUUID()
    db.prepare('INSERT INTO devices (id, family_id, token_hash, role, name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(deviceId, family.id, sha256(token), 'child', String(body.deviceName || '家庭设备').slice(0, 40), timestamp, timestamp)
    return json(response, 201, { token, deviceId, ...familyPayload(family.id) })
  }

  const identity = authenticate(request)
  if (!identity) return json(response, 401, { error: '设备连接已失效，请重新连接家庭。' })

  if (request.method === 'GET' && url.pathname === '/api/cloud/state') {
    return json(response, 200, { ...familyPayload(identity.familyId), role: identity.role })
  }

  if (request.method === 'POST' && url.pathname === '/api/cloud/actions') {
    const body = await readJson(request)
    return json(response, 200, runAction(identity, body.operationId, body.action))
  }

  if (request.method === 'POST' && url.pathname === '/api/cloud/parent/unlock') {
    const deviceIdentity = authenticate(request, false)
    if (!deviceIdentity) return json(response, 401, { error: '请先连接家庭设备。' })
    const key = `pin:${deviceIdentity.deviceId}`
    if (!checkAttempt(key)) return json(response, 429, { error: 'PIN 尝试次数过多，请 10 分钟后再试。' })
    const body = await readJson(request)
    const family = db.prepare('SELECT pin_hash AS pinHash FROM families WHERE id = ?').get(deviceIdentity.familyId)
    const inputHash = sha256(`晚安小队:${String(body.pin || '')}`)
    const valid = family?.pinHash && safeEqual(inputHash, family.pinHash)
    recordAttempt(key, valid)
    if (!valid) return json(response, 401, { error: 'PIN 不正确，请再试一次。' })
    return json(response, 200, createParentSession(deviceIdentity))
  }

  if (request.method === 'POST' && url.pathname === '/api/cloud/import') {
    if (identity.role !== 'parent') return json(response, 403, { error: '需要家长验证。' })
    const body = await readJson(request)
    const state = assertState(body.state)
    const current = db.prepare('SELECT pin_hash AS pinHash FROM families WHERE id = ?').get(identity.familyId)
    const preservedPinHash = current?.pinHash || state.security?.pinHash || null
    const storedState = { ...state, security: { ...(state.security || {}), pinHash: preservedPinHash } }
    const timestamp = now()
    db.prepare('UPDATE families SET state_json = ?, pin_hash = ?, revision = revision + 1, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(storedState), preservedPinHash, timestamp, identity.familyId)
    db.prepare('INSERT OR IGNORE INTO operations (id, family_id, device_id, action_type, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(String(body.operationId || randomUUID()), identity.familyId, identity.deviceId, 'IMPORT_STATE', timestamp)
    return json(response, 200, familyPayload(identity.familyId))
  }

  if (request.method === 'GET' && url.pathname === '/api/cloud/push/key') {
    return json(response, 200, { publicKey: vapidPublicKey })
  }

  if (request.method === 'POST' && url.pathname === '/api/cloud/push/subscribe') {
    if (identity.role !== 'parent') return json(response, 403, { error: '需要家长验证。' })
    if (!vapidPublicKey) return json(response, 503, { error: '推送服务尚未配置。' })
    const body = await readJson(request)
    const subscription = body.subscription
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return json(response, 400, { error: '推送订阅格式不正确。' })
    const timestamp = now()
    db.prepare(`
      INSERT INTO push_subscriptions (id, family_id, device_id, profile_id, endpoint, subscription_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET profile_id = excluded.profile_id, subscription_json = excluded.subscription_json, updated_at = excluded.updated_at
    `).run(randomUUID(), identity.familyId, identity.deviceId, body.profileId || null, subscription.endpoint, JSON.stringify(subscription), timestamp, timestamp)
    return json(response, 200, { ok: true })
  }

  return json(response, 404, { error: '接口不存在。' })
}

const server = createServer(async (request, response) => {
  try {
    await handleApi(request, response)
  } catch (error) {
    console.error(new Date().toISOString(), request.method, request.url, error)
    json(response, error.status || 500, { error: error.status ? error.message : '云端暂时没有响应，请稍后重试。' })
  }
})

async function sendScheduledReminders() {
  if (!vapidPublicKey || !vapidPrivateKey) return
  const current = new Date()
  const dateKey = localDateKey(current, 0)
  const currentMinutes = current.getHours() * 60 + current.getMinutes()
  const families = db.prepare('SELECT id, state_json AS stateJson FROM families').all()
  for (const family of families) {
    const state = JSON.parse(family.stateJson)
    for (const profile of state.profiles || []) {
      const schedule = getSchedule(state, dayTypeFor(current), dateKey, profile.id)
      if (schedule.reminderEnabled === false) continue
      const reminderAt = (timeToMinutes(schedule.prepareTime) - Number(schedule.reminderMinutes || 30) + 1440) % 1440
      if (currentMinutes !== reminderAt) continue
      const operationId = `push:${family.id}:${profile.id}:${dateKey}:${reminderAt}`
      if (db.prepare('SELECT id FROM operations WHERE id = ?').get(operationId)) continue
      const subscriptions = db.prepare('SELECT id, subscription_json AS subscriptionJson FROM push_subscriptions WHERE family_id = ? AND (profile_id IS NULL OR profile_id = ?)').all(family.id, profile.id)
      const payload = JSON.stringify({ title: `晚安，${profile.name}`, body: `还有 ${schedule.reminderMinutes} 分钟开始准备，眠眠在今晚等你。`, url: '/bedtime/tonight', tag: `bedtime-${profile.id}-${dateKey}` })
      for (const item of subscriptions) {
        try { await webpush.sendNotification(JSON.parse(item.subscriptionJson), payload, { TTL: 3600, urgency: 'normal' }) }
        catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(item.id)
          else console.error('push failed', error.statusCode || error.message)
        }
      }
      db.prepare('INSERT OR IGNORE INTO operations (id, family_id, device_id, action_type, created_at) VALUES (?, ?, NULL, ?, ?)').run(operationId, family.id, 'PUSH_REMINDER', now())
    }
  }
}

function createDailyBackup() {
  const date = new Date().toISOString().slice(0, 10)
  const target = join(dataDir, 'backups', `bedtime-${date}.sqlite`)
  const temporary = `${target}.tmp-${process.pid}`
  try { unlinkSync(temporary) } catch { /* 上次没有残留临时文件 */ }
  const escaped = temporary.replaceAll("'", "''")
  db.exec(`VACUUM INTO '${escaped}'`)
  renameSync(temporary, target)
  const backups = readdirSync(join(dataDir, 'backups'))
    .filter((name) => /^bedtime-\d{4}-\d{2}-\d{2}\.sqlite$/.test(name))
    .sort().reverse()
  backups.slice(14).forEach((name) => unlinkSync(join(dataDir, 'backups', name)))
}

setInterval(() => sendScheduledReminders().catch((error) => console.error('reminder scheduler failed', error)), 30_000).unref()
setInterval(() => { try { createDailyBackup() } catch (error) { console.error('backup failed', error) } }, 60 * 60_000).unref()
createDailyBackup()

server.listen(port, '127.0.0.1', () => console.log(`bedtime-cloud listening on 127.0.0.1:${port}, sqlite=${dbPath}`))

function shutdown() {
  server.close(() => { db.close(); process.exit(0) })
  setTimeout(() => process.exit(1), 5000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
