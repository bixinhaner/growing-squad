/** Boundary checks for opt-in pet media; does not access private files or third-party services. */
export function rejectMedia(message, status = 422) {
  throw Object.assign(new Error(message), { status })
}
export function verifyPetMediaOwner({ state, identity, profileId, projectId, mediaId, mediaType, kind, byteSize, requireMemory = false }) {
  const pet = state.modules?.pets?.byProfile?.[profileId]
  if (!pet || pet.id !== projectId) rejectMedia('找不到属于当前孩子的伙伴。', 403)
  if (identity.role !== 'parent' && identity.mode === 'dedicated' && identity.boundProfileId !== profileId) rejectMedia('这台设备不能保存其他孩子的资料。', 403)
  if (!state.modules.pets.settingsByProfile?.[profileId]?.allowMedia) rejectMedia('需要家长先开启伙伴照片与语音。', 403)
  if (!/^media_[A-Za-z0-9_-]{8,150}$/.test(mediaId)) rejectMedia('资料编号不正确。', 400)
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'audio/mp4', 'audio/webm', 'audio/mpeg', 'audio/wav']
  if (!allowed.includes(mediaType) || !['photo', 'drawing', 'audio'].includes(kind) || (kind === 'audio') !== mediaType.startsWith('audio/')) rejectMedia('伙伴相册只支持匹配的照片和语音。', 415)
  const memory = pet.memories.find(m => m.media?.id === mediaId)
  if (requireMemory && !memory) rejectMedia('相册记录尚未同步，稍后会再试。', 409)
  if (memory && (memory.media.kind !== kind || memory.media.mediaType !== mediaType || byteSize !== undefined && memory.media.byteSize !== byteSize)) rejectMedia('资料内容与相册记录不一致。', 409)
  if (Object.values(state.modules.pets.byProfile).some(p => p.profileId !== profileId && p.memories.some(m => m.media?.id === mediaId))) rejectMedia('不能引用其他孩子的资料。', 403)
}
export function verifyMediaSignature(bytes, type) {
  const ascii = (start, end) => bytes.subarray(start, end).toString('ascii')
  const hex = (...prefix) => prefix.every((n, i) => bytes[i] === n)
  const valid = type === 'image/png' ? hex(137,80,78,71,13,10,26,10)
    : type === 'image/jpeg' ? hex(255,216,255)
    : type === 'image/webp' ? ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP'
    : type === 'audio/wav' ? ascii(0,4) === 'RIFF' && ascii(8,12) === 'WAVE'
    : type === 'audio/webm' ? hex(26,69,223,163)
    : type === 'audio/mp4' ? ascii(4,8) === 'ftyp'
    : type === 'audio/mpeg' ? ascii(0,3) === 'ID3' || bytes[0] === 255 && (bytes[1] & 224) === 224
    : false
  if (!valid) rejectMedia('文件内容与声明的照片或语音格式不一致。', 415)
}
