const CACHE_NAME = 'growing-squad-v24'
const APP_BASE = new URL('./', self.location.href).pathname
const appPath = (path = '') => `${APP_BASE}${String(path).replace(/^\/+/, '')}`
const APP_SHELL = [APP_BASE, appPath('manifest.webmanifest'), appPath('moon-icon.svg'), appPath('terminal-simulator.html')]
const OBJECT_ASSETS = [
  'brush', 'wash', 'pajamas', 'story', 'toys', 'toilet', 'backpack', 'heart',
  'lamp', 'pillow', 'lotion', 'vitamin', 'craft', 'game', 'pancake', 'park',
  'icecream', 'pizza', 'movie', 'marshmallow', 'coin', 'bicycle', 'courage', 'outing',
  'toy-train', 'music-box', 'dinosaur', 'sleepover', 'blocks', 'zoo', 'cooking', 'surprise',
]
const MOVEMENT_ASSETS = [
  'balloon-keep-up', 'robot-dance', 'pillow-obstacle', 'sock-basket', 'animal-jumps',
  'tape-balance', 'color-reaction', 'robot-delivery', 'bike-color-hunt', 'scooter-slalom',
  'park-treasure', 'family-relay', 'hopscotch', 'jump-rope', 'beanbag-catch', 'ball-pass',
  'safe-climb', 'one-foot-statue', 'shadow-chase', 'stump-expedition',
]
const READING_ASSETS = [
  'hedgehog-lantern', 'star-path', 'leaf-boat', 'four-seasons-garden', 'talking-tree', 'cloud-whisper',
  'robot-seed', 'fox-bridge', 'dream-train', 'waiting-dinosaur', 'pocket-ocean', 'singing-tree',
]
const RESPONSIBILITY_ASSETS = [
  'place-settings', 'fold-napkins', 'pack-backpack', 'tidy-toys', 'laundry-basket', 'water-plant',
  'set-cups', 'match-socks', 'wipe-table', 'feed-pet', 'shelve-books', 'bring-tissues',
  'place-settings-carry', 'place-settings-position', 'place-settings-check',
]
const INVENTOR_ASSETS = [
  'workshop-hero', 'hair-robot-problem', 'hair-robot-sketch', 'hair-robot-building-v1',
  'hair-robot-prototype-v1', 'hair-robot-testing', 'hair-robot-clue', 'hair-robot-prototype-v2',
  'hair-robot-showcase', 'knowledge-wraparound', 'knowledge-adjustable-band', 'knowledge-water-path',
]
const PRODUCT_ASSETS = [
  ...[
    'app-icon.png',
    'mascot-moon.webp',
    'mascot-night.webp',
    'mascot-sleep.webp',
    'mascot-garden.webp',
    'garden-world-landscape-v2.webp',
    'garden-world-portrait-v2.webp',
    'moonflower-stages-v2.webp',
    'bedtime-object-atlas-v1.webp',
    'companion-atlas-v1.webp',
    'reward-chest-v1.webp',
    'companions/bear-poses-v1.webp',
    'companions/rabbit-poses-v1.webp',
    'companions/cloud-poses-v1.webp',
    'companions/space-cat-poses-v1.webp',
    'themes/moon-room-world-v1.webp',
    'themes/forest-world-v1.webp',
    'themes/space-world-v1.webp',
    'garden-outcomes/moonflower-outcomes.webp',
    'garden-outcomes/starfirefly-strip.webp',
    'app-icon-192.png',
    'app-icon-maskable.png',
    'platform/today-companion-scene.webp',
    'platform/squad-world-map.webp',
    'platform/growth-backpack-room.webp',
    'platform/family-timeline-decoration.webp',
    'platform/support-pack-bag.webp',
    'assistant/assistant-hero.webp',
    'assistant/weekly-moments-atlas.webp',
    'assistant/pocket-terminal.webp',
    'guardian/family-archive-hero.webp',
  ].map((path) => appPath(`assets/${path}`)),
  ...OBJECT_ASSETS.map((id) => appPath(`assets/objects/${id}.webp`)),
  ...MOVEMENT_ASSETS.map((id) => appPath(`assets/movement/${id}.webp`)),
  ...READING_ASSETS.map((id) => appPath(`assets/reading/${id}.webp`)),
  ...RESPONSIBILITY_ASSETS.map((id) => appPath(`assets/responsibility/${id}.webp`)),
  ...INVENTOR_ASSETS.map((id) => appPath(`assets/inventor/${id}.webp`)),
  appPath('assets/movement/energy-plaza-hero.webp'),
  appPath('assets/movement/balloon-active-hero.webp'),
  appPath('assets/reading/story-treehouse-hero.webp'),
  appPath('assets/reading/reading-companion.webp'),
  appPath('assets/responsibility/family-cottage-hero.webp'),
  appPath('assets/responsibility/family-table-active.webp'),
  appPath('assets/responsibility/family-table-complete.webp'),
]

async function precacheApp() {
  const cache = await caches.open(CACHE_NAME)
  const rootResponse = await fetch(APP_BASE, { cache: 'no-store' })
  await cache.put(APP_BASE, rootResponse.clone())
  const html = await rootResponse.text()
  const builtAssets = [...html.matchAll(/(?:src|href)="(\/bedtime\/assets\/[^"?]+)"/g)].map((match) => match[1])
  await cache.addAll([...new Set([...APP_SHELL.slice(1), ...PRODUCT_ASSETS, ...builtAssets])])
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))))
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match(APP_BASE)
        throw new Error('offline')
      }),
  )
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
