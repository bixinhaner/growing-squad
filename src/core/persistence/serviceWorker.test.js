// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const source = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
function worker(caches = {}, fetch = vi.fn()) {
  const handlers = {}
  const claim = vi.fn(async () => {})
  runInNewContext(source, { URL, caches, fetch, self: { location: new URL('https://family.test/bedtime/sw.js'), clients: { claim }, addEventListener: (type, listener) => { handlers[type] = listener } } })
  return { handlers, claim }
}
describe('service-worker boundaries', () => {
  it('does not intercept API, authenticated, partial-media or other-application traffic', () => {
    const { handlers } = worker()
    for (const [url, headers] of [['https://family.test/bedtime/api/cloud/state', {}], ['https://family.test/another-app/', {}], ['https://family.test/bedtime/assets/file', { Authorization: 'Bearer example' }], ['https://family.test/bedtime/audio/track.m4a', { Range: 'bytes=0-100' }]]) {
      const respondWith = vi.fn()
      handlers.fetch({ request: new Request(url, { headers }), respondWith })
      expect(respondWith).not.toHaveBeenCalled()
    }
  })
  it('cleans only its own outdated caches and waits for client ownership', async () => {
    const caches = { keys: vi.fn(async () => ['bailey-other-app', 'growing-squad-v26', 'growing-squad-__BUILD_REVISION__']), delete: vi.fn(async () => true) }
    const { handlers, claim } = worker(caches)
    let pending
    handlers.activate({ waitUntil: (promise) => { pending = promise } })
    await pending
    expect(caches.delete).toHaveBeenCalledTimes(1)
    expect(caches.delete).toHaveBeenCalledWith('growing-squad-v26')
    expect(claim).toHaveBeenCalledTimes(1)
  })
})


describe('offline static variants', () => {
  it('serves a precached public module when Vary Origin differs from the page request', async () => {
    const response = new Response('export const ready = true', { headers: { Vary: 'Origin', 'Content-Type': 'text/javascript' } })
    const match = vi.fn(async (_request, options) => options?.ignoreVary ? response : undefined)
    const caches = { open: vi.fn(async () => ({ match })) }
    const fetch = vi.fn(async () => { throw new Error('offline') })
    const { handlers } = worker(caches, fetch)
    const request = new Request('https://family.test/bedtime/assets/UnvisitedRoute-hash.js', { headers: { Origin: 'https://family.test' } })
    let pending
    handlers.fetch({ request, respondWith: (promise) => { pending = promise }, waitUntil: vi.fn() })
    expect(await (await pending).text()).toBe('export const ready = true')
    expect(match).toHaveBeenNthCalledWith(1, request)
    expect(match).toHaveBeenNthCalledWith(2, request, { ignoreVary: true })
  })

  it('does not ignore response variants for non-build resources', async () => {
    const match = vi.fn(async () => undefined)
    const caches = { open: vi.fn(async () => ({ match })) }
    const fetch = vi.fn(async () => { throw new Error('offline') })
    const { handlers } = worker(caches, fetch)
    const request = new Request('https://family.test/bedtime/private-document.json')
    let pending
    handlers.fetch({ request, respondWith: (promise) => { pending = promise }, waitUntil: vi.fn() })
    await expect(pending).rejects.toThrow('offline')
    expect(match).toHaveBeenCalledExactlyOnceWith(request)
  })
})
