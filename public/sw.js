const CACHE_PREFIX = 'growing-squad-'
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_REVISION__`
const APP_BASE = new URL('./', self.location.href).pathname
const appPath = (path = '') => `${APP_BASE}${String(path).replace(/^\/+/, '')}`
const APP_SHELL = [APP_BASE, appPath('manifest.webmanifest'), appPath('moon-icon.svg'), appPath('terminal-simulator.html')]

async function precacheApp() {
  const [rootResponse, manifestResponse] = await Promise.all([
    fetch(APP_BASE, { cache: 'no-store' }),
    fetch(appPath('precache-manifest.json'), { cache: 'no-store' }),
  ])
  if (!rootResponse.ok || !manifestResponse.ok) throw new Error('Offline build is incomplete')
  const manifest = await manifestResponse.clone().json()
  if (manifest.version !== 1 || `${CACHE_PREFIX}${manifest.revision}` !== CACHE_NAME || !Array.isArray(manifest.assets)) throw new Error('Offline build revision mismatch')
  const assets = manifest.assets.map((path) => {
    const visualAsset = typeof path === 'string' && path.startsWith('assets/') && /\.(js|css|png|webp|svg|ico)$/i.test(path)
    const bedtimeAudio = typeof path === 'string' && /^audio\/bedtime-5min\/[a-z-]+\.m4a$/.test(path)
    if (typeof path !== 'string' || path.includes('..') || (!visualAsset && !bedtimeAudio)) throw new Error('Invalid offline asset')
    return appPath(path)
  })
  const cache = await caches.open(CACHE_NAME)
  await cache.addAll([...new Set([...APP_SHELL.slice(1), ...assets])])
  await cache.put(APP_BASE, rootResponse)
  await cache.put(appPath('precache-manifest.json'), manifestResponse)
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp())
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    // Other applications may share the same origin. Never delete their caches.
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))
    await self.clients.claim()
  })())
})

// Only bundled public bedtime tracks enter this path, never family media.
async function bedtimeAudioResponse(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request.url, { ignoreVary: true })
  if (!cached || cached.status !== 200) return fetch(request)
  const range = request.headers.get('Range')
  if (!range) return cached
  const ifRange = request.headers.get('If-Range')
  if (ifRange && ifRange !== cached.headers.get('ETag') && ifRange !== cached.headers.get('Last-Modified')) return cached
  // Ignore malformed or multipart ranges; a full 200 response is valid.
  const match = /^bytes=(\d*)-(\d*)$/.exec(range)
  if (!match || (!match[1] && !match[2])) return cached
  const data = await cached.arrayBuffer()
  const size = data.byteLength
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1
  const headers = new Headers(cached.headers)
  headers.delete('Content-Encoding')
  headers.delete('Content-Length')
  headers.set('Accept-Ranges', 'bytes')
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
    headers.set('Content-Range', `bytes */${size}`)
    return new Response(null, { status: 416, headers })
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`)
  headers.set('Content-Length', String(end - start + 1))
  return new Response(data.slice(start, end + 1), { status: 206, headers })
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return
  if (url.pathname.startsWith(appPath('api/')) || request.headers.has('Authorization')) return
  if (url.pathname.startsWith(appPath('audio/bedtime-5min/')) && /^[-a-z]+\.m4a$/.test(url.pathname.slice(appPath('audio/bedtime-5min/').length))) {
    event.respondWith(bedtimeAudioResponse(request))
    return
  }
  // Do not cache partial responses from other audio or private media.
  if (request.headers.has('Range')) return
  event.respondWith((async () => {
    try {
      const response = await fetch(request)
      if (response.ok && response.status === 200) {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {}))
      }
      return response
    } catch (error) {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      if (cached) return cached
      // Precache requests can omit Origin while module/style requests include it.
      // Public, same-origin build assets are identical across those Vary variants;
      // preserve normal matching for all other resources and never ignore queries.
      if (url.pathname.startsWith(appPath('assets/')) && /\.(js|css|png|webp|svg|ico)$/i.test(url.pathname)) {
        const staticAsset = await cache.match(request, { ignoreVary: true })
        if (staticAsset) return staticAsset
      }
      if (request.mode === 'navigate') {
        const shell = await cache.match(APP_BASE)
        if (shell) return shell
      }
      throw error
    }
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const requestedUrl = event.notification.data?.url || appPath('tonight')
  const targetUrl = requestedUrl.startsWith(APP_BASE) ? requestedUrl : appPath(requestedUrl)
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => {
        const clientUrl = new URL(client.url)
        return clientUrl.origin === self.location.origin && clientUrl.pathname.startsWith(APP_BASE)
      })
      if (existing) {
        return existing.navigate(targetUrl).then((client) => client?.focus())
      }
      return self.clients.openWindow(targetUrl)
    }),
  )
})

self.addEventListener('push', (event) => {
  let payload = { title: '成长小队', body: '眠眠在今晚等你。', url: appPath('tonight'), tag: 'bedtime-reminder' }
  try { payload = { ...payload, ...event.data.json() } } catch { /* 使用温和的默认提醒 */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: appPath('assets/app-icon.png'),
    badge: appPath('moon-icon.svg'),
    tag: payload.tag,
    data: { url: payload.url || appPath('tonight') },
  }))
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
