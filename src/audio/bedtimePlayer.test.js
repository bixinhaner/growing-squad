import { describe, expect, it, vi } from 'vitest'
import { createBedtimePlayer } from './bedtimePlayer.js'

class TestAudio extends EventTarget {
  paused = true
  ended = false
  error = null
  attempts = []
  pause = vi.fn(() => { this.paused = true; this.dispatchEvent(new Event('pause')) })
  removeAttribute = vi.fn()
  load = vi.fn()
  play = vi.fn(() => new Promise((resolve, reject) => this.attempts.push({ resolve, reject })))
  playing() { this.paused = false; this.dispatchEvent(new Event('playing')); this.attempts.at(-1).resolve() }
}
function fixture() {
  const elements = [], changed = vi.fn()
  const player = createBedtimePlayer(changed, { createAudio: () => { const audio = new TestAudio(); elements.push(audio); return audio } })
  return { player, elements, changed, snapshot: () => changed.mock.calls.at(-1)[0] }
}

describe('bedtime music lifecycle', () => {
  it('keeps the new track controllable when an old play rejects late', async () => {
    const f = fixture(), first = f.player.start(), second = f.player.start()
    f.elements[0].attempts[0].reject(new DOMException('cancelled', 'AbortError'))
    await first
    expect(f.snapshot().status).toBe('loading')
    f.elements[1].playing(); await second
    expect(f.snapshot()).toMatchObject({ status: 'playing', error: '' })
    f.player.stop()
    expect(f.elements.every((audio) => audio.paused)).toBe(true)
    expect(f.snapshot().status).toBe('idle')
  })
  it('does not resurrect a cancelled or unmounted player on late success', async () => {
    for (const action of ['stop', 'dispose']) {
      const f = fixture(), pending = f.player.start(), audio = f.elements[0]
      f.player[action]()
      const count = f.changed.mock.calls.length
      audio.playing(); await pending
      expect(audio.paused).toBe(true)
      expect(f.changed).toHaveBeenCalledTimes(count)
    }
  })
  it('follows interruption, resume, buffering and the native five-minute ending', async () => {
    const f = fixture(), pending = f.player.start(), audio = f.elements[0]
    expect(audio.loop).toBe(false)
    audio.playing(); await pending
    audio.pause(); expect(f.snapshot().status).toBe('paused')
    const resumed = f.player.resume(); audio.playing(); await resumed
    expect(f.elements).toHaveLength(1)
    expect(f.snapshot().status).toBe('playing')
    audio.dispatchEvent(new Event('waiting')); expect(f.snapshot().status).toBe('loading')
    audio.playing(); expect(f.snapshot().status).toBe('playing')
    audio.ended = true; audio.dispatchEvent(new Event('ended'))
    expect(f.snapshot().status).toBe('idle')
    expect(audio.paused).toBe(true)
  })
  it('reports playback errors after play succeeded and allows retry', async () => {
    const f = fixture(), pending = f.player.start(), audio = f.elements[0]
    audio.playing(); await pending
    const firstTrack = f.snapshot().track
    audio.error = { code: 2 }; audio.dispatchEvent(new Event('error'))
    expect(f.snapshot()).toMatchObject({ status: 'error', track: firstTrack })
    expect(f.snapshot().error).toContain('网络')
    expect(audio.paused).toBe(true)
    const retry = f.player.start({ retry: true }); f.elements[1].playing(); await retry
    expect(f.snapshot()).toMatchObject({ status: 'playing', track: firstTrack, error: '' })
  })
  it('ignores late errors and events from a replaced track', async () => {
    const f = fixture(), first = f.player.start(), audio = f.elements[0]
    audio.playing(); await first
    const second = f.player.start(); f.elements[1].playing(); await second
    const expected = f.snapshot()
    audio.dispatchEvent(new Event('error')); audio.dispatchEvent(new Event('ended')); audio.pause()
    expect(f.snapshot()).toEqual(expected)
  })
  it('does not treat an interrupted pending play as a loading failure', async () => {
    const f = fixture(), pending = f.player.start(), audio = f.elements[0]
    audio.pause(); audio.attempts[0].reject(new DOMException('interrupted', 'AbortError')); await pending
    expect(f.snapshot()).toMatchObject({ status: 'paused', error: '' })
  })
})
