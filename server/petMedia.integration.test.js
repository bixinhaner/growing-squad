// @vitest-environment node
/* global process, Buffer */
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { createDefaultData } from '../src/domain/model.js'
import { createOperationEnvelope, entityKeyForOperation } from '../src/core/sync/operationSchemas.js'
import { rootReducer } from '../src/modules/registry.js'
import { PET_DEFAULT_SETTINGS } from '../src/modules/pets/petModel.js'
import { verifyMediaSignature } from './petMediaPolicy.mjs'

const base='http://127.0.0.1:18907'
const PNG=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6uxAAAAAASUVORK5CYII=','base64')
let server,dir,parent,child,sibling,sequence=0
async function req(path,{token=parent,body,method=body?'POST':'GET',headers={}}={}) {
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined})
  return {status:response.status,body:await response.json()}
}
async function op(type,payload={},profileId='child-1',token=parent){
  const {body:current}=await req('/api/cloud/state')
  const operation=createOperationEnvelope({type,...payload},profileId,++sequence)
  operation.expectedVersion=current.entityVersions[entityKeyForOperation(operation)]||0
  return req('/api/v2/operations:batch',{token,body:{cursor:0,operations:[operation]}})
}
function metadata(id){return {id,kind:'photo',mediaType:'image/png',fileName:'synthetic.png',byteSize:PNG.length,status:'local'}}
async function upload(id,{token=child,profileId='child-1',bytes=PNG,type='image/png',kind='photo'}={}){
  const response=await fetch(`${base}/api/cloud/media/${id}`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':type,'X-Profile-Id':profileId,'X-Project-Id':`pet:${profileId}`,'X-Media-Kind':kind,'X-File-Name':'synthetic.png'},body:bytes})
  return {status:response.status,body:await response.json()}
}
beforeAll(async()=>{
  dir=await mkdtemp(join(tmpdir(),'gs-pet-media-'))
  let state=createDefaultData();state.setupComplete=true;state.family.timezone='Asia/Shanghai'
  state.security.pinHash=createHash('sha256').update('晚安小队:2468').digest('hex')
  state.profiles.push({...state.profiles[0],id:'child-2',name:'妹妹'})
  for(const profileId of ['child-1','child-2'])state=rootReducer(state,createOperationEnvelope({type:'PET_ADOPT',species:'bear',name:profileId==='child-1'?'姐姐宠物':'妹妹宠物'},profileId,++sequence))
  const seed=join(dir,'seed.json');await writeFile(seed,JSON.stringify(state))
  server=spawn(process.execPath,['server/server.mjs'],{cwd:process.cwd(),env:{...process.env,BEDTIME_PORT:'18907',BEDTIME_DATA_DIR:dir,BEDTIME_SEED_FILE:seed,BEDTIME_PAIR_CODE:'MEDIA-TEST'},stdio:['ignore','pipe','pipe']})
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('server startup timeout')),8000);server.stdout.on('data',data=>{if(String(data).includes('listening on')){clearTimeout(timer);resolve()}});server.once('exit',code=>{clearTimeout(timer);reject(new Error(`exit ${code}`))})})
  child=(await req('/api/cloud/pair',{body:{code:'MEDIA-TEST',mode:'dedicated',profileId:'child-1'}})).body.token
  sibling=(await req('/api/cloud/pair',{body:{code:'MEDIA-TEST',mode:'dedicated',profileId:'child-2'}})).body.token
  const shared=(await req('/api/cloud/pair',{body:{code:'MEDIA-TEST',deviceName:'家长'}})).body.token
  parent=(await req('/api/cloud/parent/unlock',{token:shared,body:{pin:'2468'}})).body.token
})
afterAll(async()=>{if(server?.exitCode===null)await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM')});if(dir)await rm(dir,{recursive:true,force:true})})

describe('opt-in authenticated pet media in the real server',()=>{
  it('blocks media until a parent opts in and rejects uploads with no saved memory',async()=>{
    const id=`media_${randomUUID()}`
    expect((await upload(id)).status).toBe(403)
    expect((await op('PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,allowMedia:true}},'child-1',child)).body.rejected[0].status).toBe(403)
    expect((await op('PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,allowMedia:true}})).body.accepted).toHaveLength(1)
    expect((await upload(id)).status).toBe(409)
  })
  it('accepts metadata, uploads bytes and confirms synchronization only after the bytes exist',async()=>{
    const id=`media_${randomUUID()}`
    expect((await op('PET_ATTACH_MEDIA',{media:metadata(id)},'child-1',child)).body.accepted).toHaveLength(1)
    expect((await op('PET_SYNC_MEDIA',{mediaId:id},'child-1',child)).body.rejected[0].status).toBe(409)
    expect((await upload(id)).status).toBe(201)
    expect((await op('PET_SYNC_MEDIA',{mediaId:id},'child-1',child)).body.accepted).toHaveLength(1)
    const response=await fetch(`${base}/api/cloud/media/${id}`,{headers:{Authorization:`Bearer ${child}`}})
    expect(response.status).toBe(200)
    expect(Buffer.from(await response.arrayBuffer())).toEqual(PNG)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('does not allow dedicated sibling devices to read, replace or claim each other media',async()=>{
    const id=`media_${randomUUID()}`
    await op('PET_ATTACH_MEDIA',{media:metadata(id)},'child-1',child);await upload(id)
    expect((await req(`/api/cloud/media/${id}`,{token:sibling})).status).toBe(403)
    expect((await upload(id,{token:sibling})).status).toBe(403)
    await op('PET_UPDATE_SETTINGS',{settings:{...PET_DEFAULT_SETTINGS,allowMedia:true}},'child-2')
    expect((await op('PET_ATTACH_MEDIA',{media:{...metadata(id),status:'synced'}},'child-2',sibling)).body.rejected[0].status).toBe(403)
  })
  it('rejects forged file size, MIME and non-image contents; retrying equal bytes is idempotent',async()=>{
    const id=`media_${randomUUID()}`
    await op('PET_ATTACH_MEDIA',{media:metadata(id)},'child-1',child)
    expect((await upload(id,{bytes:Buffer.alloc(PNG.length,32)})).status).toBe(415)
    expect((await upload(id,{bytes:Buffer.alloc(PNG.length+1)})).status).toBe(409)
    expect((await upload(id,{type:'image/svg+xml'})).status).toBe(415)
    expect((await upload(id)).status).toBe(201)
    expect((await upload(id)).status).toBe(201)
    const changed=Buffer.from(PNG);changed[30]^=1
    expect((await upload(id,{bytes:changed})).status).toBe(409)
  })
  it('does not let child permissions delete memories or uploaded files',async()=>{
    const id=`media_${randomUUID()}`
    await op('PET_ATTACH_MEDIA',{media:metadata(id)},'child-1',child);await upload(id)
    expect((await req(`/api/cloud/media/${id}`,{token:child,method:'DELETE'})).status).toBe(403)
    expect((await op('PET_REMOVE_MEMORY',{memoryId:id},'child-1',child)).body.rejected[0].status).toBe(403)
    const deleted=await req(`/api/cloud/media/${id}`,{method:'DELETE'})
    expect(deleted.status).toBe(200)
    expect((await req('/api/cloud/state')).body.state.modules.pets.byProfile['child-1'].memories.some(m=>m.id===id)).toBe(false)
    expect((await upload(id)).status).toBe(409)
    expect((await req(`/api/cloud/media/${id}`)).status).toBe(404)
  })
  it('revoking a device also invalidates its existing parent session',async()=>{
    const paired=await req('/api/cloud/pair',{body:{code:'MEDIA-TEST',deviceName:'待撤销设备'}})
    const session=(await req('/api/cloud/parent/unlock',{token:paired.body.token,body:{pin:'2468'}})).body.token
    expect((await req('/api/cloud/devices',{token:session})).status).toBe(200)
    await req(`/api/v2/devices/${paired.body.deviceId}`,{method:'DELETE'})
    expect((await req('/api/cloud/devices',{token:session})).status).toBe(401)
  })
})

describe('basic file format signature checks',()=>{
  it.each(['image/svg+xml','text/html','application/javascript'])('rejects %s as pet media',type=>expect(()=>verifyMediaSignature(PNG,type)).toThrow())
  it('does not accept arbitrary HTML advertised as a JPEG',()=>expect(()=>verifyMediaSignature(Buffer.from('<html>hi</html>'),'image/jpeg')).toThrow())
})
