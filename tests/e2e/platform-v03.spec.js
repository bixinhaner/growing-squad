import { expect, test } from '@playwright/test'

async function setupPlatformFamily(page) {
  await page.goto('/bedtime/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /和孩子一起开始/ }).click()
  await page.getByLabel('孩子昵称').fill('小语')
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
}

test('today keeps one primary card and three child destinations on one iPad screen', async ({ page }) => {
  await setupPlatformFamily(page)
  await page.goto('/bedtime/today')
  await expect(page.locator('.today-card')).toHaveCount(1)
  await expect(page.locator('.today-options button')).toHaveCount(await page.locator('.today-options button').count())
  expect(await page.locator('.today-options button').count()).toBeLessThanOrEqual(2)
  await expect(page.getByRole('navigation', { name: '儿童主导航' }).getByRole('link')).toHaveCount(3)
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight }))
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight)
})

test('world uses generated map artwork and remains one screen on iPad', async ({ page }) => {
  await setupPlatformFamily(page)
  await page.goto('/bedtime/world')
  const map = page.locator('.world-map__art')
  await expect(map).toBeVisible()
  await expect(map).toHaveAttribute('src', /platform\/squad-world-map\.webp/)
  await expect(page.locator('.world-area')).toHaveCount(6)
})

test('parent timeline previews the child card and support changes remain parent-confirmed', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await setupPlatformFamily(page)
  await page.goto('/bedtime/parent/timeline')
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByRole('heading', { name: '家庭时间线' })).toBeVisible()
  await expect(page.getByText('孩子此刻看到的')).toBeVisible()
  await expect(page.locator('.timeline-family-art')).toHaveAttribute('src', /platform\/family-timeline-decoration\.webp/)
  const timelineWidth = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }))
  expect(timelineWidth.document).toBeLessThanOrEqual(timelineWidth.viewport)
  await page.screenshot({ path: 'artifacts/visual-qa/70-platform-timeline-desktop.png', fullPage: true })
  await page.getByRole('link', { name: '孩子与支持' }).click()
  await expect(page.getByRole('heading', { name: '支持会跟着孩子的需要改变' })).toBeVisible()
  await expect(page.locator('.support-suggestion__art')).toHaveAttribute('src', /platform\/support-pack-bag\.webp/)
  await page.screenshot({ path: 'artifacts/visual-qa/71-platform-support-desktop.png', fullPage: true })
})
