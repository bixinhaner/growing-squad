// @vitest-environment node
/* global process */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'
import { createDefaultData } from '../src/domain/model.js'
import { createOperationEnvelope, entityKeyForOperation } from '../src/core/sync/operationSchemas.js'
import { petBalance } from '../src/modules/pets/petModel.js'
const base='http://127.0.0.1:18901'
let server, directory, child, sibling, parent, sequence=0
async function request(path,{token,body}={}) {
  const response=await fetch(`${base}${path}`,{method:body?'POST':'GET',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined})
  return {status:response.status,body:await response.json()}
}
async function operation(type,payload={},profileId='child-1',token=child,expectedVersion) {
  const current=await request('/api/cloud/state',{token:parent})
  const op=createOperationEnvelope({type,...payload},profileId,++sequence,`op_pet_server_${sequence}`)
  op.expectedVersion=expectedVersion ?? current.body.entityVersions[entityKeyForOperation(op)] ?? 0
  const result=await request('/api/v2/operations:batch',{token,body:{cursor:0,operations:[op]}})
  return {...result,op}
}
beforeAll(async()=>{
  directory=await mkdtemp(join(tmpdir(),'gs-pets-integration-'))
  const seed=createDefaultData();seed.setupComplete=true
  seed.family.timezone='Asia/Shanghai'
  seed.security.pinHash=createHash('sha256').update('晚安小队:2468').digest('hex')
  seed.profiles.push({...seed.profiles[0],id:'child-2',name:'妹妹'})
  seed.starLedger=seed.rewards.starLedger=[{id:'test-grant',profileId:'child-1',delta:12,reason:'测试家庭鼓励',createdAt:Date.now()}]
  const path=join(directory,'seed.json');await writeFile(path,JSON.stringify(seed))
  server=spawn(process.execPath,['server/server.mjs'],{cwd:process.cwd(),env:{...process.env,BEDTIME_PORT:'18901',BEDTIME_DATA_DIR:directory,BEDTIME_SEED_FILE:path,BEDTIME_PAIR_CODE:'PETS-TEST'},stdio:['ignore','pipe','pipe']})
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Pet test server timeout')),8000);server.stdout.on('data',chunk=>{if(String(chunk).includes('listening on')){clearTimeout(timeout);resolve()}});server.on('exit',code=>{clearTimeout(timeout);reject(new Error(`Server exited ${code}`))})})
  child=(await request('/api/cloud/pair',{body:{code:'PETS-TEST',deviceName:'姐姐设备',mode:'dedicated',profileId:'child-1'}})).body.token
  sibling=(await request('/api/cloud/pair',{body:{code:'PETS-TEST',deviceName:'妹妹设备',mode:'dedicated',profileId:'child-2'}})).body.token
  const shared=(await request('/api/cloud/pair',{body:{code:'PETS-TEST',deviceName:'家长设备'}})).body.token
  parent=(await request('/api/cloud/parent/unlock',{token:shared,body:{pin:'2468'}})).body.token
})
afterAll(async()=>{if(server&&server.exitCode===null){await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM')})}if(directory)await rm(directory,{recursive:true,force:true})})

describe('pet cloud transactions and parent authorization',()=>{
  it('persists two real device pets, rejects cross-child writes and denies child approvals/settings',async()=>{
    expect((await operation('PET_ADOPT',{species:'bear',name:'糯糯'})).body.accepted).toHaveLength(1)
    expect((await operation('PET_ADOPT',{species:'rabbit',name:'妹妹专属'},'child-2',sibling)).body.accepted).toHaveLength(1)
    const wrong=await operation('PET_RENAME',{name:'不能改妹妹'},'child-2',child)
    expect(wrong.body.rejected[0].status).toBe(403)
    for(const type of ['PET_APPROVE_ITEM','PET_UPDATE_SETTINGS','PET_REFUND_ITEM']) expect((await operation(type,{requestId:'none'})).body.rejected[0].status).toBe(403)
  })
  it('authoritative fixed price, duplicate requests, debit once and refund exactly once',async()=>{
    const submitted=await operation('PET_REQUEST_ITEM',{itemId:'star-lamp',requestId:'cloud-lamp',price:0})
    expect(submitted.body.state.modules.pets.requests['cloud-lamp'].cost).toBe(5)
    expect(petBalance(submitted.body.state,'child-1')).toBe(12)
    const approved=await operation('PET_APPROVE_ITEM',{requestId:'cloud-lamp'},'child-1',parent)
    expect(approved.body.rejected).toEqual([])
    expect(petBalance(approved.body.state,'child-1')).toBe(7)
    const duplicate=await request('/api/v2/operations:batch',{token:parent,body:{cursor:0,operations:[approved.op]}})
    expect(petBalance(duplicate.body.state,'child-1')).toBe(7)
    expect(duplicate.body.state.rewards.starLedger.filter(e=>e.id==='pet:cloud-lamp')).toHaveLength(1)
    expect((await operation('PET_REQUEST_ITEM',{itemId:'robot',requestId:'too-expensive'})).body.rejected[0].status).toBe(409)
    const refund=await operation('PET_REFUND_ITEM',{requestId:'cloud-lamp'},'child-1',parent)
    expect(petBalance(refund.body.state,'child-1')).toBe(12)
    const again=await operation('PET_REFUND_ITEM',{requestId:'cloud-lamp'},'child-1',parent)
    expect(petBalance(again.body.state,'child-1')).toBe(12)
  })
  it('rejects stale updates and independent pending requests cannot overspend the shared balance',async()=>{
    const before=await request('/api/cloud/state',{token:parent})
    const key='pets:child-1:pet:child-1',version=before.body.entityVersions[key]
    const first=await operation('PET_REQUEST_ITEM',{itemId:'blocks',requestId:'cloud-blocks'},'child-1',child,version)
    expect(first.body.accepted).toHaveLength(1)
    const stale=await operation('PET_REQUEST_ITEM',{itemId:'picnic',requestId:'stale-picnic'},'child-1',child,version)
    expect(stale.body.rejected[0]).toMatchObject({status:409})
    await operation('PET_REQUEST_ITEM',{itemId:'picnic',requestId:'cloud-picnic'})
    const approved=await operation('PET_APPROVE_ITEM',{requestId:'cloud-blocks'},'child-1',parent)
    expect(petBalance(approved.body.state,'child-1')).toBe(4)
    const depleted=await operation('PET_APPROVE_ITEM',{requestId:'cloud-picnic'},'child-1',parent)
    expect(depleted.body.rejected[0].status).toBe(409)
    expect(petBalance(depleted.body.state,'child-1')).toBe(4)
    expect(depleted.body.state.modules.pets.byProfile['child-1'].inventory.picnic).toBeUndefined()
  })
  it('uses server spending day and includes only the requested child in a protected export',async()=>{
    const moment=Date.now()
    const result=await operation('PET_REQUEST_ITEM',{itemId:'daisy-rug',requestId:'server-clock',timestamp:moment-86400000})
    expect(result.body.state.modules.pets.requests['server-clock'].requestedAt).toBeGreaterThanOrEqual(moment)
    await operation('PET_NOTE',{note:'妹妹单独的故事'},'child-2',sibling)
    const response=await fetch(`${base}/api/v2/export?profileId=child-1`,{headers:{Authorization:`Bearer ${parent}`}})
    expect(response.status).toBe(200)
    const archive=unzipSync(new Uint8Array(await response.arrayBuffer()))
    const jsonFiles=Object.entries(archive).filter(([name])=>name.endsWith('.json')).map(([,bytes])=>strFromU8(bytes))
    const family=jsonFiles.find(text=>text.includes('byProfile'))
    expect(family).toBeTruthy()
    expect(family).toContain('糯糯')
    expect(family).not.toContain('妹妹专属')
    expect(family).not.toContain('妹妹单独的故事')
  })
})
