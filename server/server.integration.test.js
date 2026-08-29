// @vitest-environment node
/* global process */
import { afterEach, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { createDefaultData } from '../src/domain/model.js'
import { createOperationEnvelope } from '../src/core/sync/operationSchemas.js'

let childProcess = null
let temporaryDirectory = null

afterEach(async () => {
  if (childProcess && childProcess.exitCode === null) childProcess.kill('SIGTERM')
  childProcess = null
  if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true })
  temporaryDirectory = null
})

async function waitForServer(processHandle) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('测试服务启动超时')), 8000)
    processHandle.stdout.on('data', (chunk) => {
      if (String(chunk).includes('listening on')) { clearTimeout(timer); resolve() }
    })
    processHandle.stderr.on('data', (chunk) => {
      const message = String(chunk)
      if (!message.includes('ExperimentalWarning')) { clearTimeout(timer); reject(new Error(message)) }
    })
    processHandle.on('exit', (code) => { if (code) { clearTimeout(timer); reject(new Error(`测试服务退出：${code}`)) } })
  })
}

async function jsonRequest(url, { token, body } = {}) {
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: response.status, body: await response.json() }
}

describe('growing squad cloud identity isolation', () => {
  it('pairs a one-time dedicated terminal and keeps its reflection on the bound child', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'growing-squad-terminal-'))
    const seed = createDefaultData()
    seed.setupComplete = true
    seed.security.pinHash = createHash('sha256').update('晚安小队:2468').digest('hex')
    seed.profiles.push({ ...seed.profiles[0], id: 'child-2', name: '小禾', createdAt: Date.now(), updatedAt: Date.now() })
    const seedPath = join(temporaryDirectory, 'seed.json')
    await writeFile(seedPath, JSON.stringify(seed))
    const port = 18897
    childProcess = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, BEDTIME_PORT: String(port), BEDTIME_DATA_DIR: temporaryDirectory, BEDTIME_SEED_FILE: seedPath, BEDTIME_PAIR_CODE: 'TERMINAL-CODE' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer(childProcess)
    const base = `http://127.0.0.1:${port}`
    const web = await jsonRequest(`${base}/api/cloud/pair`, { body: { code: 'TERMINAL-CODE', deviceName: '家长浏览器' } })
    const unlocked = await jsonRequest(`${base}/api/cloud/parent/unlock`, { token: web.body.token, body: { pin: '2468' } })
    expect(unlocked.status).toBe(200)
    const code = await jsonRequest(`${base}/api/cloud/devices/terminal-code`, { token: unlocked.body.token, body: { profileId: 'child-1' } })
    expect(code.status).toBe(201)
    expect(code.body.code).toMatch(/^\d{6}$/)
    const terminal = await jsonRequest(`${base}/api/v2/device/pair`, { body: { code: code.body.code, deviceName: '眠眠终端' } })
    expect(terminal.status).toBe(201)
    expect(terminal.body.device).toMatchObject({ kind: 'terminal', mode: 'dedicated', boundProfileId: 'child-1' })
    expect((await jsonRequest(`${base}/api/v2/device/pair`, { body: { code: code.body.code } })).status).toBe(401)
    const today = await jsonRequest(`${base}/api/v2/device/today`, { token: terminal.body.token })
    expect(today.status).toBe(200)
    expect(today.body.profile).toMatchObject({ id: 'child-1' })
    const reflection = await jsonRequest(`${base}/api/v2/device/reflection`, { token: terminal.body.token, body: { promptId: 'device-check', answer: '我想自己先试一试' } })
    expect(reflection.status).toBe(201)
    const state = await jsonRequest(`${base}/api/cloud/state`, { token: web.body.token })
    expect(Object.values(state.body.state.modules.assistant.reflections)).toEqual([expect.objectContaining({ profileId: 'child-1', answer: '我想自己先试一试', source: 'terminal-voice' })])
    expect((await jsonRequest(`${base}/api/cloud/guardian/health`, { token: web.body.token })).status).toBe(403)
    const guardian = await jsonRequest(`${base}/api/cloud/guardian/health`, { token: unlocked.body.token })
    expect(guardian.status).toBe(200)
    expect(guardian.body).toMatchObject({ status: 'healthy', steps: { cloud: { ok: true }, backup: { ok: true, bundle: 'ok' }, integrity: { ok: true, mediaSnapshot: true } }, records: { profiles: 2 }, storage: { backupCount: 1, retentionDays: 30 }, privacy: { externalAiUpload: false, publicSharing: false } })
    const checked = await jsonRequest(`${base}/api/cloud/guardian/health`, { token: unlocked.body.token, body: {} })
    expect(checked.body.lastVerifiedAt).toBe(checked.body.checkedAt)
    const archive = await fetch(`${base}/api/v2/export?profileId=child-1`, { headers: { Authorization: `Bearer ${unlocked.body.token}` } })
    expect(archive.status).toBe(200)
    expect(archive.headers.get('content-type')).toBe('application/zip')
    expect(Array.from(new Uint8Array(await archive.arrayBuffer()).slice(0, 2))).toEqual([80, 75])
    expect((await fetch(`${base}/api/v2/export`, { headers: { Authorization: `Bearer ${web.body.token}` } })).status).toBe(403)
    const erased = await fetch(`${base}/api/v2/privacy/data`, { method: 'DELETE', headers: { Authorization: `Bearer ${unlocked.body.token}` } })
    expect(erased.status).toBe(200)
    expect(await erased.json()).toMatchObject({ ok: true })
    expect((await fetch(`${base}/api/cloud/state`, { headers: { Authorization: `Bearer ${web.body.token}` } })).status).toBe(401)
    const reconnected = await jsonRequest(`${base}/api/cloud/pair`, { body: { code: 'TERMINAL-CODE', deviceName: '重新连接的浏览器' } })
    expect(reconnected.body.state.setupComplete).toBe(false)
  })

  it('keeps two dedicated devices isolated and rejects a different child target', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'growing-squad-server-'))
    const seed = createDefaultData()
    seed.setupComplete = true
    seed.profiles.push({ ...seed.profiles[0], id: 'child-2', name: '小禾', createdAt: Date.now(), updatedAt: Date.now() })
    seed.modules.bedtime.schedules.push(...seed.modules.bedtime.schedules.slice(0, 2).map((item) => ({ ...item, id: item.id.replace('child-1', 'child-2'), profileId: 'child-2' })))
    seed.modules.bedtime.routines.push(...seed.modules.bedtime.routines.slice(0, 2).map((item) => ({ ...item, id: item.id.replace('child-1', 'child-2'), profileId: 'child-2' })))
    const seedPath = join(temporaryDirectory, 'seed.json')
    await writeFile(seedPath, JSON.stringify(seed))
    const port = 18895
    childProcess = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, BEDTIME_PORT: String(port), BEDTIME_DATA_DIR: temporaryDirectory, BEDTIME_SEED_FILE: seedPath, BEDTIME_PAIR_CODE: 'TEST-CODE' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer(childProcess)
    const base = `http://127.0.0.1:${port}`
    const first = await jsonRequest(`${base}/api/cloud/pair`, { body: { code: 'TEST-CODE', deviceName: '孩子一 iPad', mode: 'dedicated', profileId: 'child-1' } })
    const second = await jsonRequest(`${base}/api/cloud/pair`, { body: { code: 'TEST-CODE', deviceName: '孩子二 iPad', mode: 'dedicated', profileId: 'child-2' } })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const childTwoOperation = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'wash', dateKey: '2026-08-29', timestamp: 1000 }, 'child-2', 1, 'op_server_child_two')
    const childOneOperation = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'brush', dateKey: '2026-08-29', timestamp: 1100 }, 'child-1', 1, 'op_server_child_one')
    expect((await jsonRequest(`${base}/api/cloud/actions`, { token: second.body.token, body: { operationId: childTwoOperation.id, action: childTwoOperation } })).status).toBe(200)
    expect((await jsonRequest(`${base}/api/cloud/actions`, { token: first.body.token, body: { operationId: childOneOperation.id, action: childOneOperation } })).status).toBe(200)

    const forbidden = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'story', dateKey: '2026-08-29', timestamp: 1200 }, 'child-2', 2, 'op_wrong_bound_child')
    expect((await jsonRequest(`${base}/api/cloud/actions`, { token: first.body.token, body: { operationId: forbidden.id, action: forbidden } })).status).toBe(403)

    const result = await jsonRequest(`${base}/api/cloud/state`, { token: first.body.token })
    const sessions = result.body.state.modules.bedtime.sessions
    expect(sessions['child-1:2026-08-29'].stepStatus).toMatchObject({ brush: 'done', wash: 'todo' })
    expect(sessions['child-2:2026-08-29'].stepStatus).toMatchObject({ brush: 'todo', wash: 'done' })
    expect(result.body.device).toMatchObject({ mode: 'dedicated', boundProfileId: 'child-1' })

    const currentVersion = result.body.entityVersions['bedtime:child-1:bedtime-session:child-1:2026-08-29']
    const batchOperation = createOperationEnvelope({ type: 'COMPLETE_TASK', stepId: 'story', dateKey: '2026-08-29', timestamp: 1300, expectedVersion: currentVersion }, 'child-1', 3, 'op_batch_child_one')
    const batch = await jsonRequest(`${base}/api/v2/operations:batch`, { token: first.body.token, body: { cursor: result.body.cursor, operations: [batchOperation] } })
    expect(batch.status).toBe(200)
    expect(batch.body.accepted).toEqual([expect.objectContaining({ id: batchOperation.id, entityVersion: currentVersion + 1 })])
    expect(batch.body.state.modules.bedtime.sessions['child-1:2026-08-29'].stepStatus.story).toBe('done')

    const staleOperation = createOperationEnvelope({ type: 'RESET_TASK', stepId: 'story', dateKey: '2026-08-29', timestamp: 1400, expectedVersion: currentVersion }, 'child-1', 4, 'op_stale_child_one')
    const stale = await jsonRequest(`${base}/api/v2/operations:batch`, { token: first.body.token, body: { cursor: 0, operations: [staleOperation] } })
    expect(stale.status).toBe(200)
    expect(stale.body.rejected).toEqual([expect.objectContaining({ id: staleOperation.id, status: 409, details: expect.objectContaining({ expectedVersion: currentVersion, currentEntityVersion: currentVersion + 1 }) })])
    expect(stale.body.state.modules.bedtime.sessions['child-1:2026-08-29'].stepStatus.story).toBe('done')

    const changes = await jsonRequest(`${base}/api/v2/changes?after=0&limit=500`, { token: first.body.token })
    expect(changes.status).toBe(200)
    expect(changes.body.requiresBootstrap).toBe(false)
    expect(changes.body.changes.map((item) => item.operation.id)).toContain(batchOperation.id)
  })

  it('stores protected inventor media and returns it only to an authenticated device', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'growing-squad-media-'))
    const seed = createDefaultData()
    seed.setupComplete = true
    const seedPath = join(temporaryDirectory, 'seed.json')
    await writeFile(seedPath, JSON.stringify(seed))
    const port = 18896
    childProcess = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, BEDTIME_PORT: String(port), BEDTIME_DATA_DIR: temporaryDirectory, BEDTIME_SEED_FILE: seedPath, BEDTIME_PAIR_CODE: 'MEDIA-CODE' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer(childProcess)
    const base = `http://127.0.0.1:${port}`
    const pair = await jsonRequest(`${base}/api/cloud/pair`, { body: { code: 'MEDIA-CODE', deviceName: '小语 iPad', mode: 'dedicated', profileId: 'child-1' } })
    const mediaUrl = `${base}/api/cloud/media/artifact_photo_001`
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
    const uploaded = await fetch(mediaUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pair.body.token}`,
        'Content-Type': 'image/png',
        'X-Profile-Id': 'child-1',
        'X-Project-Id': 'project_hair_robot',
        'X-Media-Kind': 'photo',
        'X-File-Name': encodeURIComponent('第一版.png'),
      },
      body: bytes,
    })
    expect(uploaded.status).toBe(201)
    expect(await uploaded.json()).toMatchObject({ asset: { id: 'artifact_photo_001', status: 'synced', byteSize: bytes.length } })

    const anonymous = await fetch(mediaUrl)
    expect(anonymous.status).toBe(401)
    const downloaded = await fetch(mediaUrl, { headers: { Authorization: `Bearer ${pair.body.token}` } })
    expect(downloaded.status).toBe(200)
    expect(downloaded.headers.get('content-type')).toContain('image/png')
    expect(new Uint8Array(await downloaded.arrayBuffer())).toEqual(bytes)
    expect((await fetch(mediaUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${pair.body.token}` } })).status).toBe(403)
    const health = await jsonRequest(`${base}/api/cloud/health`)
    expect(health.body).toMatchObject({ mediaAvailable: true, mediaLimitBytes: 12 * 1024 * 1024 })
  })

  it('writes newly introduced v7 module defaults during startup normalization', async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'growing-squad-normalize-'))
    const seed = createDefaultData()
    delete seed.modules.assistant
    const seedPath = join(temporaryDirectory, 'seed.json')
    await writeFile(seedPath, JSON.stringify(seed))
    const port = 18898
    childProcess = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: { ...process.env, BEDTIME_PORT: String(port), BEDTIME_DATA_DIR: temporaryDirectory, BEDTIME_SEED_FILE: seedPath, BEDTIME_PAIR_CODE: 'NORMALIZE-CODE' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer(childProcess)
    const pair = await jsonRequest(`http://127.0.0.1:${port}/api/cloud/pair`, { body: { code: 'NORMALIZE-CODE', deviceName: '验证设备' } })
    expect(pair.body.state.modules.assistant).toMatchObject({ version: 1, settingsByProfile: {}, suggestions: {}, reflections: {} })
  })
})
