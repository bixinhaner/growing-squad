import { zipSync,strToU8 } from 'fflate'
import { getMediaDraft,putMediaDraft,deleteMediaDraft,listMediaDrafts } from '../../core/persistence/idb.js'
import { getDeviceToken,getParentToken,uploadCloudMedia,deleteCloudMedia,fetchCloudMedia } from '../../data/cloud.js'

export async function savePetMedia(file,pet){
  const type=file.type.split(';')[0].toLowerCase()
  if(!['image/png','image/jpeg','image/webp','audio/webm','audio/mp4','audio/mpeg','audio/wav'].includes(type))throw new Error('请选择 JPG、PNG、WebP 照片或支持的语音文件。')
  if(file.size<=0||file.size>12*1024*1024)throw new Error('每份资料需要小于 12MB。')
  const draft={id:`media_${crypto.randomUUID()}`,moduleId:'pets',projectId:pet.id,profileId:pet.profileId,kind:type.startsWith('image/')?'photo':'audio',mediaType:type,fileName:(file.name||'伙伴语音').slice(0,160),byteSize:file.size,blob:file,status:'local',createdAt:Date.now(),updatedAt:Date.now()}
  await putMediaDraft(draft);return draft
}
export async function syncPetMedia(pet,onSynced){
  const token=getParentToken()||getDeviceToken();if(!token)return
  const pending=(await listMediaDrafts()).filter(d=>d.moduleId==='pets'&&d.profileId===pet.profileId&&d.projectId===pet.id&&pet.memories.some(m=>m.media?.id===d.id&&m.media.status!=='synced'))
  for(const draft of pending){if(!draft.remote){await uploadCloudMedia(draft,token);await putMediaDraft({...draft,status:'synced',remote:true,updatedAt:Date.now()})}await onSynced(draft.id)}
}
export async function removePetMedia(media){
  const draft=await getMediaDraft(media.id)
  if(media.status==='synced'||draft?.remote){try{await deleteCloudMedia(media.id)}catch(error){if(error.status!==404)throw error}}
  await deleteMediaDraft(media.id)
}

/** A parent-initiated, per-pet export; never silently omits missing media. */
export async function exportPetKeepsakes(pet){
  const files={'pet.json':strToU8(JSON.stringify(pet,null,2))},manifest=[]
  let total=0
  for(const memory of pet.memories.filter(m=>m.media)){
    const media=memory.media,draft=await getMediaDraft(media.id)
    const blob=draft?.blob || (getParentToken()||getDeviceToken()?await fetchCloudMedia(media.id):null)
    if(!blob)throw new Error('有资料尚在另一台设备，请联网同步后再导出，避免漏掉回忆。')
    total+=blob.size;if(total>128*1024*1024)throw new Error('媒体较多，请到数据与安全导出家庭云端档案。')
    const ext=media.mediaType.split('/')[1].replace('jpeg','jpg'),path=`media/${media.id}.${ext}`,bytes=new Uint8Array(await blob.arrayBuffer())
    files[path]=bytes
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(b=>b.toString(16).padStart(2,'0')).join('')
    manifest.push({id:media.id,file:path,byteSize:bytes.length,sha256:digest})
  }
  files['manifest.json']=strToU8(JSON.stringify({format:'pet-keepsakes-v1',profileId:pet.profileId,petId:pet.id,media:manifest},null,2))
  files['README.txt']=strToU8('伙伴作品与媒体导出。pet.json 包含当前孩子的伙伴、作品、纪念画与记录；media/ 为照片及语音。此包便于珍藏，不替代应用的完整家庭恢复备份。')
  const url=URL.createObjectURL(new Blob([zipSync(files,{level:0})],{type:'application/zip'})),a=document.createElement('a')
  a.href=url;a.download=`伙伴-${pet.name.replace(/[\\/:*?"<>|]/g,'_')}.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
