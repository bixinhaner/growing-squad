import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PetMediaRecorder } from './PetMedia.jsx'
import { savePetMedia, syncPetMedia, loadPetMedia, discardPetMediaDraft } from './petMediaStore.js'

const mocks=vi.hoisted(()=>({store:new Map(),upload:vi.fn(),remote:vi.fn(),token:null,disabled:false}))
vi.mock('../../core/persistence/idb.js',()=>({
  getMediaDraft:async id=>mocks.store.get(id),
  putMediaDraft:async draft=>{if(!mocks.disabled)mocks.store.set(draft.id,draft)},
  deleteMediaDraft:async id=>mocks.store.delete(id),
  listMediaDrafts:async()=>[...mocks.store.values()],
}))
vi.mock('../../data/cloud.js',()=>({getParentToken:()=>mocks.token,getDeviceToken:()=>mocks.token,uploadCloudMedia:(...args)=>mocks.upload(...args),fetchCloudMedia:(...args)=>mocks.remote(...args),deleteCloudMedia:vi.fn()}))
const pet={id:'pet:child-1',profileId:'child-1',memories:[]}
beforeEach(()=>{mocks.store.clear();mocks.upload.mockReset();mocks.remote.mockReset();mocks.token=null;mocks.disabled=false})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})

describe('local media data integrity',()=>{
  it('retains actual bytes before returning metadata',async()=>{
    const file=new File(['synthetic'],'test.png',{type:'image/png'})
    const draft=await savePetMedia(file,pet)
    expect(mocks.store.get(draft.id).blob).toBe(file)
    expect(draft).toMatchObject({profileId:'child-1',projectId:'pet:child-1',moduleId:'pets',status:'local'})
  })
  it('reports storage unavailability instead of pretending to have saved a file',async()=>{
    mocks.disabled=true
    await expect(savePetMedia(new File(['x'],'test.png',{type:'image/png'}),pet)).rejects.toThrow('不能安全保存')
  })
  it.each(['image/svg+xml','text/html','video/mp4'])('rejects unapproved %s',async type=>{
    await expect(savePetMedia(new File(['x'],'file',{type}),pet)).rejects.toThrow('请选择')
    expect(mocks.store.size).toBe(0)
  })
  it('rejects empty and oversized files without storing them',async()=>{
    await expect(savePetMedia(new File([],'empty.png',{type:'image/png'}),pet)).rejects.toThrow('12MB')
    await expect(savePetMedia({type:'image/png',size:13*1024*1024},pet)).rejects.toThrow('12MB')
  })
  it('syncs only current pet media that actually has a saved memory',async()=>{
    const a=await savePetMedia(new File(['a'],'a.png',{type:'image/png'}),pet)
    await savePetMedia(new File(['orphan'],'orphan.png',{type:'image/png'}),pet)
    const sibling={id:'pet:child-2',profileId:'child-2'}
    await savePetMedia(new File(['sibling'],'s.png',{type:'image/png'}),sibling)
    mocks.token='synthetic-token'
    const callback=vi.fn()
    const result=await syncPetMedia({...pet,memories:[{media:{id:a.id,status:'local'}}]},callback)
    expect(result.synced).toBe(1)
    expect(mocks.upload).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith(a.id)
  })
  it('retains bytes when a remote upload fails and never marks it synced',async()=>{
    const draft=await savePetMedia(new File(['a'],'a.png',{type:'image/png'}),pet)
    mocks.token='synthetic-token';mocks.upload.mockRejectedValue(new Error('offline'))
    const callback=vi.fn()
    await expect(syncPetMedia({...pet,memories:[{media:{id:draft.id,status:'local'}}]},callback)).rejects.toThrow('offline')
    expect(mocks.store.get(draft.id).status).toBe('local')
    expect(callback).not.toHaveBeenCalled()
  })
  it('refuses another child cached file even before making a network request',async()=>{
    const draft=await savePetMedia(new File(['a'],'a.png',{type:'image/png'}),pet)
    await expect(loadPetMedia(draft,{id:'pet:child-2',profileId:'child-2'})).rejects.toThrow('不属于')
    expect(mocks.remote).not.toHaveBeenCalled()
  })
  it('discards only a new local orphan, not an uploaded memory',async()=>{
    const draft=await savePetMedia(new File(['a'],'a.png',{type:'image/png'}),pet)
    mocks.store.set(draft.id,{...draft,remote:true})
    await discardPetMediaDraft(draft.id)
    expect(mocks.store.has(draft.id)).toBe(true)
  })
})

describe('explicit microphone consent and cleanup',()=>{
  it('does not request a microphone on render',()=>{
    const request=vi.fn()
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:request}})
    render(<PetMediaRecorder onSave={vi.fn()}/>)
    expect(request).not.toHaveBeenCalled()
  })
  it('stops a stream whose permission arrives after cancellation',async()=>{
    let resolve
    const request=vi.fn(()=>new Promise(done=>{resolve=done})),stop=vi.fn()
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:request}})
    vi.stubGlobal('MediaRecorder',class {static isTypeSupported(){return true}})
    render(<PetMediaRecorder onSave={vi.fn()}/>)
    fireEvent.click(screen.getByRole('button',{name:'录一小段语音'}))
    expect(request).toHaveBeenCalledWith({audio:true})
    fireEvent.click(screen.getByRole('button',{name:'取消等待'}))
    await act(async()=>resolve({getTracks:()=>[{stop}]}))
    expect(stop).toHaveBeenCalled()
    expect(screen.queryByRole('button',{name:'停止录音'})).not.toBeInTheDocument()
  })
  it('stops a late stream when the recording panel was unmounted',async()=>{
    let resolve
    const stop=vi.fn()
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(done=>{resolve=done})}})
    vi.stubGlobal('MediaRecorder',class {static isTypeSupported(){return true}})
    const view=render(<PetMediaRecorder onSave={vi.fn()}/>)
    fireEvent.click(screen.getByRole('button',{name:'录一小段语音'}))
    view.unmount()
    await act(async()=>resolve({getTracks:()=>[{stop}]}))
    expect(stop).toHaveBeenCalled()
  })
  it('explains refused permission without saving or asking repeatedly',async()=>{
    const save=vi.fn(),request=vi.fn().mockRejectedValue(Object.assign(new Error('denied'),{name:'NotAllowedError'}))
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:request}})
    vi.stubGlobal('MediaRecorder',class {static isTypeSupported(){return true}})
    render(<PetMediaRecorder onSave={save}/>)
    fireEvent.click(screen.getByRole('button',{name:'录一小段语音'}))
    expect(await screen.findByText('没有获得麦克风许可，仍然可以写字或画画。')).toBeVisible()
    expect(request).toHaveBeenCalledTimes(1)
    expect(save).not.toHaveBeenCalled()
  })
})
