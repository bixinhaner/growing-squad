// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const source = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8')
function worker(caches = {}) {
  const handlers = {}
  const claim = vi.fn(async () => {})
  runInNewContext(source, { URL, caches, self: { location: new URL('https://family.test/bedtime/sw.js'), clients: { claim }, addEventListener: (type, listener) => { handlers[type] = listener } } })
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
