import { strToU8, zipSync } from 'fflate'
import { deleteCloudMedia, fetchCloudMedia, getDeviceToken, getParentToken, uploadCloudMedia } from '../../data/cloud.js'
import { deleteMediaDraft, getMediaDraft, listMediaDrafts, putMediaDraft } from '../../core/persistence/idb.js'

export const INVENTOR_MEDIA_LIMIT = 12 * 1024 * 1024

export function mediaKindForFile(file) {
  if (file.type.startsWith('image/')) return 'photo'
  if (file.type.startsWith('audio/')) return 'audio'
  if (file.type.startsWith('video/')) return 'video'
  return null
}

export async function saveInventorMedia({ file, projectId, profileId, stage, versionNumber = 1 }) {
  const kind = mediaKindForFile(file)
  if (!kind) throw new Error('请选择照片、语音或短视频。')
  if (file.size > INVENTOR_MEDIA_LIMIT) throw new Error('这份资料超过 12MB。视频保留 30 秒以内会更容易同步。')
  const id = `media_${crypto.randomUUID()}`
  const draft = { id, projectId, profileId, stage, versionNumber, kind, mediaType: file.type, fileName: file.name || `${kind}-${Date.now()}`, byteSize: file.size, blob: file, status: 'local', createdAt: Date.now(), updatedAt: Date.now() }
  await putMediaDraft(draft)
  return draft
}

export async function syncPendingInventorMedia(onSynced) {
  const token = getParentToken() || getDeviceToken()
  if (!token) return { synced: 0, pending: (await listMediaDrafts()).filter((item) => item.status !== 'synced').length }
  const drafts = await listMediaDrafts()
  let synced = 0
  for (const draft of drafts.filter((item) => item.status !== 'synced')) {
    try {
      await uploadCloudMedia(draft, token)
      await putMediaDraft({ ...draft, status: 'synced', remote: true, updatedAt: Date.now() })
      onSynced?.(draft)
      synced += 1
    } catch (error) {
      if ([401, 403, 413, 415].includes(error?.status)) throw error
      break
    }
  }
  return { synced, pending: drafts.filter((item) => item.status !== 'synced').length - synced }
}

export async function inventorMediaBlob(asset) {
  const local = await getMediaDraft(asset.id)
  if (local?.blob) return local.blob
  if (!asset.remote && asset.status !== 'synced') return null
  const blob = await fetchCloudMedia(asset.id)
  await putMediaDraft({ ...asset, blob, mediaType: blob.type || asset.mediaType, status: 'synced', remote: true, updatedAt: Date.now() })
  return blob
}

export async function deleteInventorMedia(asset) {
  if (asset.remote || asset.status === 'synced') await deleteCloudMedia(asset.id)
  await deleteMediaDraft(asset.id)
}

function safeName(value) {
  return String(value || 'media').replace(/[^\p{L}\p{N}._-]+/gu, '-').slice(0, 100)
}

export async function exportInventorProject(project, artifacts) {
  const files = {
    'project.json': strToU8(JSON.stringify({ schema: 'growing-squad-inventor-v1', exportedAt: new Date().toISOString(), project, artifacts }, null, 2)),
  }
  for (const artifact of artifacts) {
    try {
      const blob = await inventorMediaBlob(artifact)
      if (blob) files[`media/${safeName(artifact.fileName || `${artifact.id}.bin`)}`] = new Uint8Array(await blob.arrayBuffer())
    } catch { /* 导出仍保留完整元数据，并继续处理其他资料 */ }
  }
  const blob = new Blob([zipSync(files, { level: 6 })], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${safeName(project.title)}-发明项目.zip`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
