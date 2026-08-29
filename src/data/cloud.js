const DEVICE_TOKEN_KEY = 'bedtime:cloud-device-token:v1'
const PARENT_TOKEN_KEY = 'bedtime:cloud-parent-token:v1'
const OUTBOX_KEY = 'bedtime:cloud-outbox:v1'

function tokenStorage() {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function getDeviceToken() {
  return tokenStorage()?.getItem(DEVICE_TOKEN_KEY) || ''
}

export function saveDeviceToken(token) {
  if (token) tokenStorage()?.setItem(DEVICE_TOKEN_KEY, token)
  else tokenStorage()?.removeItem(DEVICE_TOKEN_KEY)
}

export function getParentToken() {
  return typeof window === 'undefined' ? '' : window.sessionStorage.getItem(PARENT_TOKEN_KEY) || ''
}

export function saveParentToken(token) {
  if (typeof window === 'undefined') return
  if (token) window.sessionStorage.setItem(PARENT_TOKEN_KEY, token)
  else window.sessionStorage.removeItem(PARENT_TOKEN_KEY)
}

export function loadOutbox() {
  try {
    const value = JSON.parse(tokenStorage()?.getItem(OUTBOX_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

export function saveOutbox(items) {
  tokenStorage()?.setItem(OUTBOX_KEY, JSON.stringify(items))
}

async function request(path, { token, method = 'GET', body, signal } = {}) {
  const response = await fetch(path, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const type = response.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw new Error('没有连接到成长小队云端')
  const payload = await response.json()
  if (!response.ok) {
    const error = new Error(payload.error || '云端暂时没有响应')
    error.status = response.status
    throw error
  }
  return payload
}

export function checkCloud(signal) {
  return request(appPath('api/cloud/health'), { signal })
}

export function pairDevice(code, deviceName) {
  return request(appPath('api/cloud/pair'), { method: 'POST', body: { code, deviceName } })
}

export function fetchCloudState(token = getDeviceToken()) {
  return request(appPath('api/cloud/state'), { token })
}

export function sendCloudAction(operationId, action, token = getParentToken() || getDeviceToken()) {
  return request(appPath('api/cloud/actions'), { token, method: 'POST', body: { operationId, action } })
}

export async function uploadCloudMedia(draft, token = getParentToken() || getDeviceToken()) {
  const response = await fetch(appPath(`api/cloud/media/${encodeURIComponent(draft.id)}`), {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'Content-Type': draft.blob.type || draft.mediaType || 'application/octet-stream',
      'X-Profile-Id': draft.profileId,
      'X-Project-Id': draft.projectId,
      'X-Media-Kind': draft.kind,
      'X-File-Name': encodeURIComponent(draft.fileName || `${draft.id}.bin`),
    },
    body: draft.blob,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || '资料暂时没有同步')
    error.status = response.status
    throw error
  }
  return payload
}

export async function fetchCloudMedia(id, token = getParentToken() || getDeviceToken()) {
  const response = await fetch(appPath(`api/cloud/media/${encodeURIComponent(id)}`), { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload.error || '暂时打不开这份资料')
    error.status = response.status
    throw error
  }
  return response.blob()
}

export function unlockCloudParent(pin) {
  return request(appPath('api/cloud/parent/unlock'), { token: getDeviceToken(), method: 'POST', body: { pin } })
}

export function importCloudState(state, operationId = crypto.randomUUID()) {
  return request(appPath('api/cloud/import'), { token: getParentToken(), method: 'POST', body: { state, operationId } })
}

export function fetchCloudDevices() {
  return request(appPath('api/cloud/devices'), { token: getParentToken() })
}

export function updateCloudDevice(deviceId, payload) {
  return request(appPath(`api/cloud/devices/${deviceId}`), { token: getParentToken(), method: 'PATCH', body: payload })
}

export function revokeCloudDevice(deviceId) {
  return request(appPath(`api/cloud/devices/${deviceId}`), { token: getParentToken(), method: 'DELETE' })
}

export function getPushKey() {
  return request(appPath('api/cloud/push/key'), { token: getParentToken() || getDeviceToken() })
}

export function savePushSubscription(subscription, profileId) {
  return request(appPath('api/cloud/push/subscribe'), {
    token: getParentToken(),
    method: 'POST',
    body: { subscription: subscription.toJSON(), profileId },
  })
}

export function clearCloudConnection() {
  saveDeviceToken('')
  saveParentToken('')
  saveOutbox([])
}

export function operationId() {
  return `op_${crypto.randomUUID()}`
}

export function urlBase64ToUint8Array(value) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const raw = atob((value + padding).replaceAll('-', '+').replaceAll('_', '/'))
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)))
}
import { appPath } from './paths.js'
