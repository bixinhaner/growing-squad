import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import webpush from 'web-push'
import { migrateV5 } from '../src/data/storage.js'
import { dayTypeFor, getSchedule, localDateKey, timeToMinutes } from '../src/domain/model.js'
import { migrateV6ToV7, normalizeV7 } from '../src/domain/v7.js'
import { isChildOperation, operationEnvelopeSchema } from '../src/core/sync/operationSchemas.js'
import { rootReducer } from '../src/modules/registry.js'

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
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON parent_sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token_hash);
  CREATE INDEX IF NOT EXISTS idx_operations_family ON operations(family_id, created_at);
`)

function ensureColumn(table, name, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some((column) => column.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
}

db.exec('BEGIN IMMEDIATE')
try {
  ensureColumn('devices', 'mode', "TEXT NOT NULL DEFAULT 'shared'")
  ensureColumn('devices', 'bound_profile_id', 'TEXT')
  ensureColumn('devices', 'capabilities_json', "TEXT NOT NULL DEFAULT '{}'")
  ensureColumn('operations', 'module_id', 'TEXT')
  ensureColumn('operations', 'profile_id', 'TEXT')
  ensureColumn('operations', 'entity_type', 'TEXT')
  ensureColumn('operations', 'entity_id', 'TEXT')
  ensureColumn('operations', 'schema_version', 'INTEGER NOT NULL DEFAULT 1')
  ensureColumn('operations', 'client_occurred_at', 'INTEGER')
  ensureColumn('operations', 'client_sequence', 'INTEGER')
  ensureColumn('operations', 'base_revision', 'INTEGER')
  ensureColumn('operations', 'payload_hash', 'TEXT')
  ensureColumn('operations', 'server_sequence', 'INTEGER')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_operations_server_sequence ON operations(server_sequence)')
  db.prepare('INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES (?, ?)').run('v7-platform-foundation', Date.now())
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
}

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
  if (Number(value?.version) === 6) value = migrateV6ToV7(value)
  try { return normalizeV7(value) }
  catch { throw new Error('云端数据必须是成长小队 v7 格式') }
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

function migrateFamilyStateToV7() {
  const rows = db.prepare('SELECT id, state_json AS stateJson FROM families').all()
  const update = db.prepare('UPDATE families SET state_json = ?, revision = revision + 1, updated_at = ? WHERE id = ?')
  for (const row of rows) {
    const parsed = JSON.parse(row.stateJson)
    if (Number(parsed.version) === 7) continue
    update.run(JSON.stringify(assertState(parsed)), now(), row.id)
  }
}

migrateFamilyStateToV7()

if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

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
    SELECT id AS deviceId, family_id AS familyId, role, mode, bound_profile_id AS boundProfileId FROM devices
    WHERE token_hash = ? AND revoked_at IS NULL
  `).get(tokenHash)
  if (!device) return null
  db.prepare('UPDATE devices SET last_seen_at = ? WHERE id = ?').run(now(), device.deviceId)
  return device
}

function familyPayload(familyId, deviceId = null) {
  const row = db.prepare('SELECT state_json AS stateJson, revision, updated_at AS updatedAt FROM families WHERE id = ?').get(familyId)
  if (!row) return null
  const state = assertState(JSON.parse(row.stateJson))
  const device = deviceId ? db.prepare('SELECT id, name, mode, bound_profile_id AS boundProfileId FROM devices WHERE id = ?').get(deviceId) : null
  return { state: { ...state, security: { ...(state.security || {}), pinHash: null } }, revision: row.revision, updatedAt: row.updatedAt, device: device || undefined }
}

function runAction(identity, operationId, submittedOperation) {
  const parsed = operationEnvelopeSchema.safeParse(submittedOperation)
  if (!parsed.success) throw Object.assign(new Error('请先更新成长小队，再继续操作。'), { status: 426 })
  const operation = parsed.data
  if (operation.id !== operationId) throw Object.assign(new Error('操作编号不一致'), { status: 400 })
  if (identity.role !== 'parent' && !isChildOperation(operation)) throw Object.assign(new Error('这个设备不能执行该操作'), { status: 403 })
  const profileId = operation.target.profileId
  if (!profileId) throw Object.assign(new Error('操作必须明确属于哪个孩子'), { status: 400 })
  if (identity.role !== 'parent' && identity.mode === 'dedicated' && identity.boundProfileId !== profileId) {
    throw Object.assign(new Error('这台设备只属于已绑定的孩子'), { status: 403 })
  }
  if (!/^[A-Za-z0-9:_-]{8,160}$/.test(String(operationId || ''))) throw Object.assign(new Error('操作编号不正确'), { status: 400 })
  db.exec('BEGIN IMMEDIATE')
  try {
    const duplicate = db.prepare('SELECT id FROM operations WHERE id = ?').get(operationId)
    if (duplicate) {
      db.exec('COMMIT')
      return familyPayload(identity.familyId, identity.deviceId)
    }
    const family = db.prepare('SELECT state_json AS stateJson, revision FROM families WHERE id = ?').get(identity.familyId)
    if (!family) throw Object.assign(new Error('家庭数据不存在'), { status: 404 })
    const previous = assertState(JSON.parse(family.stateJson))
    if (!previous.profiles.some((profile) => profile.id === profileId)) throw Object.assign(new Error('找不到目标孩子'), { status: 404 })
    const next = assertState(rootReducer(previous, operation))
    const timestamp = now()
    const serverSequence = Number(db.prepare('SELECT COALESCE(MAX(server_sequence), 0) + 1 AS value FROM operations').get().value)
    db.prepare('UPDATE families SET state_json = ?, pin_hash = ?, revision = revision + 1, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(next), next.security?.pinHash || null, timestamp, identity.familyId)
    db.prepare(`INSERT INTO operations (
      id, family_id, device_id, action_type, created_at, module_id, profile_id, entity_type,
      entity_id, schema_version, client_occurred_at, client_sequence, base_revision, payload_hash, server_sequence
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      operationId, identity.familyId, identity.deviceId || null, operation.type, timestamp,
      operation.moduleId, profileId, operation.target.entityType, operation.target.entityId,
      operation.schemaVersion, operation.occurredAt, operation.clientSequence, family.revision,
      sha256(JSON.stringify(operation.payload)), serverSequence,
    )
    db.exec('COMMIT')
    return familyPayload(identity.familyId, identity.deviceId)
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
  if (request.method === 'GET' && ['/api/cloud/health', '/api/v2/health'].includes(url.pathname)) {
    return json(response, 200, { ok: true, service: 'growing-squad', apiVersion: 2, dataVersion: 7, storage: 'sqlite', pushAvailable: Boolean(vapidPublicKey && vapidPrivateKey), mediaAvailable: false, time: now() })
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
    const mode = body.mode === 'dedicated' ? 'dedicated' : 'shared'
    const boundProfileId = mode === 'dedicated' ? String(body.profileId || '') : null
    const familyState = assertState(JSON.parse(db.prepare('SELECT state_json AS stateJson FROM families WHERE id = ?').get(family.id).stateJson))
    if (mode === 'dedicated' && !familyState.profiles.some((profile) => profile.id === boundProfileId)) return json(response, 400, { error: '找不到要绑定的孩子。' })
    db.prepare('INSERT INTO devices (id, family_id, token_hash, role, name, created_at, last_seen_at, mode, bound_profile_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(deviceId, family.id, sha256(token), 'child', String(body.deviceName || '家庭设备').slice(0, 40), timestamp, timestamp, mode, boundProfileId)
    return json(response, 201, { token, deviceId, ...familyPayload(family.id, deviceId) })
  }

  const identity = authenticate(request)
  if (!identity) return json(response, 401, { error: '设备连接已失效，请重新连接家庭。' })

  if (request.method === 'GET' && url.pathname === '/api/cloud/state') {
    return json(response, 200, { ...familyPayload(identity.familyId, identity.deviceId), role: identity.role })
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

  if (request.method === 'GET' && ['/api/cloud/devices', '/api/v2/devices'].includes(url.pathname)) {
    if (identity.role !== 'parent') return json(response, 403, { error: '需要家长验证。' })
    const devices = db.prepare(`SELECT id, name, mode, bound_profile_id AS boundProfileId,
      created_at AS createdAt, last_seen_at AS lastSeenAt, revoked_at AS revokedAt
      FROM devices WHERE family_id = ? ORDER BY revoked_at IS NOT NULL, last_seen_at DESC`).all(identity.familyId)
    return json(response, 200, { devices })
  }

  const deviceMatch = url.pathname.match(/^\/api\/(?:cloud|v2)\/devices\/([^/]+)$/)
  if (deviceMatch && request.method === 'PATCH') {
    if (identity.role !== 'parent') return json(response, 403, { error: '需要家长验证。' })
    const body = await readJson(request)
    const mode = body.mode === 'dedicated' ? 'dedicated' : 'shared'
    const boundProfileId = mode === 'dedicated' ? String(body.profileId || '') : null
    const state = assertState(JSON.parse(db.prepare('SELECT state_json AS stateJson FROM families WHERE id = ?').get(identity.familyId).stateJson))
    if (mode === 'dedicated' && !state.profiles.some((profile) => profile.id === boundProfileId)) return json(response, 400, { error: '找不到要绑定的孩子。' })
    const result = db.prepare('UPDATE devices SET mode = ?, bound_profile_id = ? WHERE id = ? AND family_id = ? AND revoked_at IS NULL')
      .run(mode, boundProfileId, deviceMatch[1], identity.familyId)
    if (!result.changes) return json(response, 404, { error: '找不到这台设备。' })
    return json(response, 200, { ok: true })
  }

  if (deviceMatch && request.method === 'DELETE') {
    if (identity.role !== 'parent') return json(response, 403, { error: '需要家长验证。' })
    const result = db.prepare('UPDATE devices SET revoked_at = ? WHERE id = ? AND family_id = ? AND revoked_at IS NULL')
      .run(now(), deviceMatch[1], identity.familyId)
    if (!result.changes) return json(response, 404, { error: '找不到这台设备。' })
    return json(response, 200, { ok: true })
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
