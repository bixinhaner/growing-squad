// @vitest-environment node
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function worker() {
  const listeners = {}, fetch = vi.fn()
  const cache = { match: vi.fn(async () => new Response(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]), { headers: { 'Content-Type': 'audio/mp4', 'Content-Length': '8' } })) }
  const context = { self: { location: { href: 'https://example.com/bedtime/sw.js', origin: 'https://example.com' }, addEventListener: (name, fn) => { listeners[name] = fn } }, URL, Headers, Response, caches: { open: async () => cache }, fetch }
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), context)
  function request(headers = {}, path = 'audio/bedtime-5min/moon-clouds.m4a') {
    let response
    listeners.fetch({ request: new Request(`https://example.com/bedtime/${path}`, { headers }), respondWith: (value) => { response = value } })
    return response
  }
  return { request, fetch }
}
describe('bundled audio range responses', () => {
  it.each([['bytes=0-1', 206, 'bytes 0-1/8', [0, 1]], ['bytes=5-', 206, 'bytes 5-7/8', [5, 6, 7]], ['bytes=-2', 206, 'bytes 6-7/8', [6, 7]], ['bytes=6-99', 206, 'bytes 6-7/8', [6, 7]], ['bytes=8-', 416, 'bytes */8', []], ['bytes=-0', 416, 'bytes */8', []], ['bytes=3-1', 416, 'bytes */8', []]])('serves %s offline', async (range, status, contentRange, bytes) => {
    const w = worker(), response = await w.request({ Range: range })
    expect(response.status).toBe(status)
    expect(response.headers.get('Content-Range')).toBe(contentRange)
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual(bytes)
    expect(w.fetch).not.toHaveBeenCalled()
  })
  it('ignores malformed ranges and never handles authorized or other media requests', async () => {
    const w = worker()
    expect((await w.request({ Range: 'bytes=0-1,3-4' })).status).toBe(200)
    expect(w.request({ Authorization: 'test', Range: 'bytes=0-1' })).toBeUndefined()
    expect(w.request({ Range: 'bytes=0-1' }, 'api/cloud/media/photo')).toBeUndefined()
    expect(w.request({ Range: 'bytes=0-1' }, 'audio/bgm/moon-clouds.m4a')).toBeUndefined()
  })
})
