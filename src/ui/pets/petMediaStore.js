import { zipSync, strToU8 } from 'fflate'
import { getMediaDraft, putMediaDraft, deleteMediaDraft, listMediaDrafts } from '../../core/persistence/idb.js'
import { getDeviceToken, getParentToken, uploadCloudMedia, deleteCloudMedia, fetchCloudMedia } from '../../data/cloud.js'

export const PET_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav']
export const PET_MEDIA_MAX = 12 * 1024 * 1024

export async function savePetMedia(file, pet) {
  const type = String(file.type || '').split(';')[0].toLowerCase()
  if (!PET_MEDIA_TYPES.includes(type)) throw new Error('请选择 JPG、PNG、WebP 照片或支持的语音文件。')
  if (!pet?.id || !pet.profileId) throw new Error('请先选择自己的小伙伴。')
  if (file.size <= 0 || file.size > PET_MEDIA_MAX) throw new Error('每份资料需要小于 12MB。')
  const draft = {
    id: `media_${crypto.randomUUID()}`, moduleId: 'pets', projectId: pet.id, profileId: pet.profileId,
    kind: type.startsWith('image/') ? 'photo' : 'audio', mediaType: type,
    fileName: (file.name || '伙伴语音').slice(0, 160), byteSize: file.size, blob: file,
    status: 'local', createdAt: Date.now(), updatedAt: Date.now(),
  }
  await putMediaDraft(draft)
  const stored = await getMediaDraft(draft.id)
  if (!stored?.blob) throw new Error('这台设备暂时不能安全保存媒体，请检查浏览器存储权限。')
  return draft
}

export async function discardPetMediaDraft(id) {
  const draft = await getMediaDraft(id)
  if (draft?.moduleId === 'pets' && !draft.remote) await deleteMediaDraft(id)
}

/** Metadata is saved before uploading. Failed uploads keep their original bytes locally. */
export async function syncPetMedia(pet, onSynced) {
  const token = getParentToken() || getDeviceToken()
  if (!token) return { synced: 0 }
  const pending = (await listMediaDrafts()).filter(draft =>
    draft.moduleId === 'pets' && draft.profileId === pet.profileId && draft.projectId === pet.id &&
    pet.memories.some(memory => memory.media?.id === draft.id && memory.media.status !== 'synced'))
  let synced = 0
  for (const draft of pending) {
    if (!draft.remote) {
      await uploadCloudMedia(draft, token)
      await putMediaDraft({ ...draft, status: 'synced', remote: true, updatedAt: Date.now() })
    }
    const result = await onSynced(draft.id)
    if (result === false || result?.ok === false) throw new Error('资料已传送，但相册状态尚未确认，请稍后重试。')
    synced += 1
  }
  return { synced }
}

export async function loadPetMedia(media, pet) {
  const local = await getMediaDraft(media.id)
  if (local && (local.moduleId !== 'pets' || local.profileId !== pet.profileId || local.projectId !== pet.id)) {
    throw new Error('这份资料不属于当前小伙伴。')
  }
  if (local?.blob) return local.blob
  if (!(getParentToken() || getDeviceToken())) throw new Error('这份资料还在原来的设备上，等待联网同步。')
  const blob = await fetchCloudMedia(media.id)
  await putMediaDraft({ ...media, moduleId: 'pets', projectId: pet.id, profileId: pet.profileId, blob, status: 'synced', remote: true, updatedAt: Date.now() })
  return blob
}

export async function removePetMedia(media) {
  const draft = await getMediaDraft(media.id)
  if (media.status === 'synced' || draft?.remote) {
    try { await deleteCloudMedia(media.id) }
    catch (error) { if (error.status !== 404) throw error }
  }
  await deleteMediaDraft(media.id)
}

/** A parent-initiated per-pet export. Missing bytes cause a visible error, never a misleading partial archive. */
export async function exportPetKeepsakes(pet) {
  const files = { 'pet.json': strToU8(JSON.stringify(pet, null, 2)) }
  const manifest = []
  let total = 0
  for (const memory of pet.memories.filter(m => m.media)) {
    const media = memory.media
    const blob = await loadPetMedia(media, pet)
    total += blob.size
    if (total > 128 * 1024 * 1024) throw new Error('媒体较多，请到数据与安全导出家庭云端档案。')
    const ext = media.mediaType.split('/')[1].replace('jpeg', 'jpg')
    const path = `media/${media.id}.${ext}`
    const bytes = new Uint8Array(await blob.arrayBuffer())
    files[path] = bytes
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
    manifest.push({ id: media.id, file: path, byteSize: bytes.length, sha256: digest })
  }
  files['manifest.json'] = strToU8(JSON.stringify({ format: 'pet-keepsakes-v1', profileId: pet.profileId, petId: pet.id, media: manifest }, null, 2))
  files['README.txt'] = strToU8('伙伴作品与媒体导出。pet.json 包含当前孩子的伙伴、作品、纪念画与记录；media/ 为照片及语音。此包便于珍藏，不替代应用的完整家庭恢复备份。')
  const url = URL.createObjectURL(new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `伙伴-${pet.name.replace(/[\\/:*?"<>|]/g, '_')}.zip`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
