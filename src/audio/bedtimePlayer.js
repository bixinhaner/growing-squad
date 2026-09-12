import { pickBedtimeTrack } from './bgm.js'

function playbackError(error, audio) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return '这首音乐还没保存到设备，请联网后再试一次。'
  if (error?.name === 'NotAllowedError') return '浏览器暂停了声音，请点“重新播放”继续。'
  if (audio.error?.code === 2) return '音乐加载中断，请检查网络后重试，或换一首。'
  return '这首音乐暂时无法播放，请重试或换一首。'
}

// Own one native media element at a time. Every asynchronous result and event
// belongs to that element and play attempt, never to a later replacement.
export function createBedtimePlayer(onChange, { createAudio = (src) => new Audio(src) } = {}) {
  let current = null
  let lastTrack = null
  const publish = (status, track = null, error = '') => onChange({ status, track, error })

  function release() {
    const record = current
    current = null
    if (!record) return
    record.attempt += 1
    record.listeners.forEach(([name, listener]) => record.audio.removeEventListener(name, listener))
    record.audio.pause()
    record.audio.removeAttribute('src')
    record.audio.load()
  }

  function stop() {
    release()
    publish('idle')
  }

  function fail(record, error) {
    if (current !== record) return
    const message = playbackError(error, record.audio)
    release()
    publish('error', record.track, message)
  }

  async function play(record) {
    const attempt = ++record.attempt
    publish('loading', record.track)
    try {
      await record.audio.play()
      if (current !== record) {
        record.audio.pause()
        return
      }
      if (record.attempt !== attempt) return
      publish(record.audio.paused ? 'paused' : 'playing', record.track)
    } catch (error) {
      if (current !== record || record.attempt !== attempt) return
      // A native interruption can abort play without being a loading failure.
      if (error?.name === 'AbortError') publish('paused', record.track)
      else fail(record, error)
    }
  }

  function start({ retry = false } = {}) {
    const track = retry && lastTrack ? lastTrack : pickBedtimeTrack(lastTrack?.id)
    release()
    lastTrack = track
    let audio
    try { audio = createAudio(track.src) } catch (error) {
      publish('error', track, playbackError(error, {}))
      return
    }
    const record = { audio, track, attempt: 0, listeners: [] }
    current = record
    // Files already contain the quiet level, fades and a five-minute ending.
    // Native playback ends even when a mobile browser suspends JavaScript.
    audio.preload = 'auto'
    audio.loop = false
    const listen = (name, callback) => {
      const listener = () => { if (current === record) callback() }
      record.listeners.push([name, listener])
      audio.addEventListener(name, listener)
    }
    listen('playing', () => { if (!audio.paused) publish('playing', track) })
    listen('waiting', () => { if (!audio.paused) publish('loading', track) })
    listen('pause', () => {
      if (!audio.paused || audio.ended) return
      record.attempt += 1
      publish('paused', track)
    })
    listen('ended', stop)
    listen('error', () => fail(record))
    return play(record)
  }

  return {
    start,
    stop,
    resume() { return current ? play(current) : start({ retry: true }) },
    dispose: release,
  }
}
