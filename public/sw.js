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
    if (typeof path !== 'string' || !path.startsWith('assets/') || path.includes('..') || !/\.(js|css|png|webp|svg|ico)$/i.test(path)) throw new Error('Invalid offline asset')
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

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(APP_BASE)) return
  // Family API responses and partial audio/media responses are not app-shell assets.
  if (url.pathname.startsWith(appPath('api/')) || request.headers.has('Authorization') || request.headers.has('Range')) return
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
