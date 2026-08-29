import { expect, test } from '@playwright/test'

async function setupFamily(page) {
  await page.goto('/bedtime/')
  await page.evaluate(async () => {
    window.localStorage.clear()
    await new Promise((resolve) => {
      const request = indexedDB.deleteDatabase('growing-squad-v1')
      request.onsuccess = request.onerror = request.onblocked = resolve
    })
  })
  await page.reload()
  await page.getByRole('button', { name: /和孩子一起开始/ }).click()
  await page.getByLabel('孩子昵称').fill('小语')
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
}

async function unlockParent(page) {
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
}

async function expectNoHorizontalOverflow(page) {
  const metrics = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }))
  expect(metrics.document).toBeLessThanOrEqual(metrics.viewport)
}

async function expectImagesLoaded(page) {
  expect(await page.locator('img').evaluateAll((images) => images.every((image) => !image.src || image.complete && image.naturalWidth > 0))).toBe(true)
}

test('parent assistant stays off by default and all suggestions remain parent-controlled', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await setupFamily(page)
  await page.goto('/bedtime/parent/assistant')
  await unlockParent(page)
  await expect(page.getByRole('heading', { name: '小队助手' })).toBeVisible()
  const master = page.getByRole('checkbox', { name: /启用小队助手/ })
  await expect(master).not.toBeChecked()
  await expect(page.getByText('外部 AI 上传：关闭')).toBeVisible()
  await expect(page.getByRole('button', { name: '整理本周建议' })).toBeDisabled()
  await master.check()
  await page.getByRole('button', { name: '整理本周建议' }).click()
  await expect(page.locator('.assistant-suggestion')).toHaveCount(1)
  await expect(page.getByText('从一个五分钟小行动开始')).toBeVisible()
  await expect(page.getByText('家长确认前，不会生效')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expectImagesLoaded(page)
  await page.screenshot({ path: 'artifacts/visual-qa/120-assistant-parent-desktop.png', fullPage: true })

  await page.getByRole('link', { name: /小队周报/ }).click()
  await expect(page.getByRole('heading', { name: '小语的小队周报' })).toBeVisible()
  await expect(page.locator('.weekly-report__moments article')).toHaveCount(4)
  await expect(page.getByText('周报来自本地结构化记录，关闭助手也能查看。')).toBeVisible()
  await expectNoHorizontalOverflow(page)
  await expectImagesLoaded(page)
  await page.screenshot({ path: 'artifacts/visual-qa/121-weekly-report-desktop.png', fullPage: true })
})

test('child one-question flow is one-screen, optional and touch friendly on phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)
  await page.goto('/bedtime/parent/assistant')
  await unlockParent(page)
  await page.getByRole('checkbox', { name: /启用小队助手/ }).check()
  await page.getByRole('checkbox', { name: /孩子的一问一答/ }).check()
  await page.goto('/bedtime/companion-question')
  await expect(page.getByText('不想回答可以跳过')).toBeVisible()
  await expect(page.locator('.companion-question section>div>button')).toHaveCount(3)
  await expect(page.getByRole('button', { name: '这次先不回答' })).toBeVisible()
  const metrics = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight }))
  expect(metrics.width).toBeLessThanOrEqual(metrics.viewportWidth)
  expect(metrics.height).toBeLessThanOrEqual(metrics.viewportHeight)
  await expectImagesLoaded(page)
  await page.screenshot({ path: 'artifacts/visual-qa/122-companion-question-mobile.png', fullPage: true })
  await page.getByRole('button', { name: '这次先不回答' }).click()
  await expect(page).not.toHaveURL(/companion-question/)
})

test('terminal simulator renders the generated device art and never offers profile switching or chat', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('/bedtime/terminal-simulator.html')
  await expect(page.getByRole('heading', { name: '口袋终端模拟器' })).toBeVisible()
  await expect(page.getByLabel('六位连接码')).toBeVisible()
  await expect(page.locator('select, textarea, [contenteditable="true"]')).toHaveCount(0)
  const background = await page.locator('.device').evaluate((element) => getComputedStyle(element).backgroundImage)
  expect(background).toContain('pocket-terminal.webp')
  await expectNoHorizontalOverflow(page)
  await page.screenshot({ path: 'artifacts/visual-qa/123-terminal-simulator-desktop.png', fullPage: true })
})
