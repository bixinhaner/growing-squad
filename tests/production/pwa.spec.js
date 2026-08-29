import { expect, test } from '@playwright/test'

test('production app shell and primary illustration work offline', async ({ context, page }) => {
  await page.goto('/bedtime/')
  const audioAssets = await page.evaluate(async () => Promise.all([
    '/bedtime/audio/bgm/moon-clouds.m4a',
    '/bedtime/audio/bgm/starry-meadow.m4a',
    '/bedtime/audio/bgm/moonflower-piano.m4a',
    '/bedtime/audio/bgm/rainy-dream.m4a',
  ].map(async (url) => {
    const response = await fetch(url, { headers: { Range: 'bytes=0-1023' } })
    return { url, ok: response.ok, type: response.headers.get('content-type') }
  })))
  expect(audioAssets.every((asset) => asset.ok && asset.type?.startsWith('audio/'))).toBe(true)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await context.setOffline(true)
  await page.goto('/bedtime/tonight', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: /一起把睡前.*变得轻松一点/ })).toBeVisible()
  const imageLoaded = await page.getByRole('img', { name: '眠眠抱着月亮枕头' }).evaluate((image) => image.complete && image.naturalWidth > 0)
  expect(imageLoaded).toBe(true)
  const productAssets = await page.evaluate(async () => Promise.all([
    '/bedtime/assets/garden-world-landscape-v2.webp',
    '/bedtime/assets/garden-world-portrait-v2.webp',
    '/bedtime/assets/moonflower-stages-v2.webp',
    '/bedtime/assets/bedtime-object-atlas-v1.webp',
    '/bedtime/assets/companion-atlas-v1.webp',
    '/bedtime/assets/reward-chest-v1.webp',
    '/bedtime/assets/companions/bear-poses-v1.webp',
    '/bedtime/assets/companions/rabbit-poses-v1.webp',
    '/bedtime/assets/companions/cloud-poses-v1.webp',
    '/bedtime/assets/companions/space-cat-poses-v1.webp',
    '/bedtime/assets/themes/moon-room-world-v1.webp',
    '/bedtime/assets/themes/forest-world-v1.webp',
    '/bedtime/assets/themes/space-world-v1.webp',
    '/bedtime/assets/inventor/workshop-hero.webp',
    '/bedtime/assets/inventor/hair-robot-testing.webp',
    '/bedtime/assets/inventor/hair-robot-prototype-v2.webp',
    '/bedtime/assets/inventor/knowledge-wraparound.webp',
  ].map(async (url) => ({ url, ok: (await fetch(url)).ok }))))
  expect(productAssets.every((asset) => asset.ok)).toBe(true)
})
