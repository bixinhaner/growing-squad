import { expect, test } from '@playwright/test'

async function setupFamily(page) {
  await page.goto('/bedtime/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: /和孩子一起开始/ }).click()
  await page.getByLabel('孩子昵称').fill('小雨')
  await page.getByLabel('家长区 PIN').fill('2468')
  await page.getByRole('button', { name: /保存并看看今晚/ }).click()
}

async function openGuardian(page) {
  await page.goto('/bedtime/parent/data')
  for (const digit of ['2', '4', '6', '8']) await page.getByRole('button', { name: digit, exact: true }).click()
  await expect(page.getByRole('heading', { name: '家庭守护中心' })).toBeVisible()
}

async function assertVisualIntegrity(page) {
  const metrics = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }))
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth)
  await expect(page.locator('.guardian-hero img')).toHaveJSProperty('complete', true)
  expect(await page.locator('.guardian-hero img').evaluate((image) => image.naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('.guardian-step')).toHaveCount(4)
  await expect(page.getByText('记录已保存在本机，建议创建备份')).toBeVisible()
}

test('guardian center gives verifiable protection and progressive disclosure on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 })
  await setupFamily(page)
  await openGuardian(page)
  await assertVisualIntegrity(page)
  await expect(page.locator('.guardian-danger .danger-zone')).toBeHidden()
  await page.getByRole('button', { name: /立即做一次安全检查/ }).click()
  await expect(page.getByRole('status')).toContainText('本地备份已完成')
  await expect(page.getByText('全部成长记录已安全保存')).toBeVisible()
  await page.getByText('备份、导入与 iPad 安装').click()
  await expect(page.getByRole('button', { name: '导出数据' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/130-family-guardian-desktop.png', fullPage: true })
})

test('guardian center keeps the active destination reachable and readable on iPad', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 })
  await setupFamily(page)
  await openGuardian(page)
  await assertVisualIntegrity(page)
  await expect(page.getByRole('link', { name: '家庭守护' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/131-family-guardian-ipad.png', fullPage: true })
})

test('guardian center has no horizontal overflow on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupFamily(page)
  await openGuardian(page)
  await assertVisualIntegrity(page)
  await expect(page.getByRole('link', { name: '家庭守护' })).toBeVisible()
  await page.screenshot({ path: 'artifacts/visual-qa/132-family-guardian-mobile.png' })
})
