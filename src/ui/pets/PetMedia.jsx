import { useEffect, useRef, useState } from 'react'
import { loadPetMedia } from './petMediaStore.js'

export function PetMediaPreview({ media, pet }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const { id, status, mediaType } = media
  const { id: petId, profileId } = pet
  useEffect(() => {
    let alive = true, object = ''
    loadPetMedia({ id, status, mediaType }, { id: petId, profileId }).then(blob => {
      if (!alive) return
      object = URL.createObjectURL(blob)
      setUrl(object)
      setError('')
    }).catch(e => { if (alive) setError(e.message) })
    return () => { alive = false; if (object) URL.revokeObjectURL(object) }
  }, [id, status, mediaType, petId, profileId])
  return url ? media.kind === 'audio'
    ? <audio src={url} controls preload="metadata" aria-label="播放我留下的语音" />
    : <img src={url} alt={media.fileName || '家庭相册照片'} className="pet-real-photo" />
    : <p className="pet-small-note">{error || '正在打开这份回忆…'}</p>
}

export function PetMediaRecorder({ onSave }) {
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const recorder = useRef(null), stream = useRef(null), timer = useRef(null)
  const alive = useRef(true), request = useRef(0), saving = useRef(false)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      request.current += 1
      clearTimeout(timer.current)
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach(track => track.stop())
    }
  }, [])
  useEffect(() => {
    if (!blob) return
    const object = URL.createObjectURL(blob)
    setUrl(object)
    return () => URL.revokeObjectURL(object)
  }, [blob])
  const stop = () => {
    clearTimeout(timer.current)
    if (recorder.current?.state === 'recording') recorder.current.stop()
    stream.current?.getTracks().forEach(track => track.stop())
    if (alive.current) { setRecording(false); setBusy(false) }
  }
  useEffect(() => {
    const hide = () => { if (document.hidden) { request.current += 1; stop() } }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [])
  async function start() {
    if (saving.current) return
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessage('这台设备不能直接录音，可以选择已有语音文件。')
      return
    }
    setBusy(true)
    setMessage('请允许这一次使用麦克风；最长 30 秒。')
    const turn = ++request.current
    try {
      const tracks = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!alive.current || turn !== request.current) { tracks.getTracks().forEach(track => track.stop()); return }
      stream.current = tracks
      const type = ['audio/mp4', 'audio/webm'].find(t => MediaRecorder.isTypeSupported(t))
      if (!type) { tracks.getTracks().forEach(track => track.stop()); throw new Error('当前录音格式不支持，请改选语音文件。') }
      const current = new MediaRecorder(tracks, { mimeType: type })
      const chunks = []
      recorder.current = current
      let failed = false
      current.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      current.onstop = () => {
        tracks.getTracks().forEach(track => track.stop())
        if (!alive.current || failed) return
        setRecording(false); setBusy(false)
        const result = new Blob(chunks, { type })
        if (!result.size) { setMessage('没有录到声音，可以再试一次。'); return }
        setBlob(result)
        setMessage('先听一遍，点“收好这段语音”才保存。')
      }
      current.onerror = () => { failed = true; stop(); if (alive.current) setMessage('录音没有成功，可以重新试一次。') }
      current.start()
      setRecording(true); setBusy(false); setBlob(null)
      timer.current = setTimeout(stop, 30000)
      setMessage('正在录音，最长 30 秒。你可以随时停止。')
    } catch (error) {
      stream.current?.getTracks().forEach(track => track.stop())
      if (alive.current) {
        setBusy(false)
        setMessage(error.name === 'NotAllowedError' ? '没有获得麦克风许可，仍然可以写字或画画。' : error.message)
      }
    }
  }
  async function save(file) {
    if (saving.current) return
    saving.current = true; setBusy(true)
    try {
      await onSave(file)
      if (alive.current) { setBlob(null); setMessage('这份回忆已经收好，请留意本机保存和同步提示。') }
    } catch (error) { if (alive.current) setMessage(error.message) }
    finally { saving.current = false; if (alive.current) setBusy(false) }
  }
  return <section className="pet-recording">
    <h3>留下自己的声音或照片</h3>
    <p className="pet-small-note">只有主动点击才使用麦克风；语音不识别、不评分，不发送到外部 AI。</p>
    <div className="pet-studio-tools">
      <button type="button" className="pet-button pet-button--soft" disabled={busy} onClick={recording ? stop : start}>{recording ? '停止录音' : '录一小段语音'}</button>
      {busy && !saving.current && <button type="button" className="pet-text-button" onClick={() => { request.current += 1; setBusy(false); setMessage('已取消等待') }}>取消等待</button>}
      <label className="pet-button pet-button--soft">选择照片或语音
        <input type="file" disabled={busy || recording} accept="image/jpeg,image/png,image/webp,audio/mp4,audio/webm,audio/mpeg,audio/wav" aria-label="添加伙伴照片或语音" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void save(file) }} />
      </label>
    </div>
    {blob && url && <div className="pet-recording-preview">
      <audio src={url} controls aria-label="试听尚未保存的语音" />
      <button type="button" className="pet-button" disabled={busy} onClick={() => save(new File([blob], `伙伴语音.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type }))}>收好这段语音</button>
      <button type="button" className="pet-text-button" disabled={busy} onClick={() => setBlob(null)}>不保存这次录音</button>
    </div>}
    <p role="status">{message}</p>
  </section>
}
